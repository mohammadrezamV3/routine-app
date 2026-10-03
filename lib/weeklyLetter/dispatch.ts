// ارسال «هفته‌نامه» — هر شنبه برای هفته‌ی تموم‌شده‌ی هر کاربر یک شماره می‌سازه
// و تحویل می‌ده (اعلان درون‌برنامه‌ای + پوش). از سه جا صدا زده می‌شه:
//   ۱) زمان‌بند داخلی (lib/pushScheduler.ts، هر ۱۰ دقیقه) — مسیر اصلی؛
//   ۲) /api/cron/weekly-report — برای crontab بیرونی قدیمی؛
//   ۳) تنبل، موقع باز شدن آرشیو (ensureLetterForUser) — اگه زمان‌بند خاموش بود.
//
// ضدتکرار: اول یک ردیف PENDING با کلید یکتای (userId, weekStart) ادعا می‌شه؛
// worker دوم P2002 می‌گیره و رد می‌شه. PENDING قدیمی‌تر از ۱۵ دقیقه (worker
// وسط کار مرده) دوباره ادعا می‌شه. هیچ‌چیز از این‌جا throw نمی‌کنه.

import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlagsServer";
import { featureKeyAllowed } from "@/lib/featureFlags";
import { notifyUser } from "@/lib/inAppNotify";
import { logError } from "@/lib/errorLog";
import { getWeeklyAnalysis } from "@/lib/weeklyAnalysis/service";
import { generateAiCoach, isAiAvailable } from "@/lib/weeklyAnalysis/ai";
import { getWeekRange, isoToUtcDate, localMinuteOfDay, safeTimezone, todayIso } from "@/lib/weeklyAnalysis/week";
import { buildLetterData, gatherLetterExtras } from "./build";
import { summaryOf } from "./summary";

const CONCURRENCY = 3;
const DEFAULT_MAX_USERS = 40;
const PAGE_SIZE = 100;
const STALE_PENDING_MS = 15 * 60_000;
const DUE_MINUTE = 8 * 60; // شنبه ساعت ۸ صبح به وقت کاربر

export type RunOptions = {
  /** فقط همین کاربر (مسیر تنبل) */
  userId?: string;
  /** false = برای ساخت مربی AI گیت‌وی صدا زده نشه (مسیر تنبل: کاربر منتظر نمی‌مونه) */
  ai?: boolean;
  /** سقف کاربرهایی که توی یک اجرا واقعا پردازش می‌شن */
  maxUsers?: number;
};

export type RunResult = {
  considered: number;
  created: number;
  skipped: number;
  failed: number;
  notified: number;
  /** فلگ آنالیز هفتگی برای همه خاموشه (فقط Owner مجازه) */
  flagOff: boolean;
};

type Candidate = {
  id: string;
  timezone: string | null;
  isSuperAdmin: boolean;
  adminPermissions: string[];
};

/**
 * آیا شماره‌ی هفته‌ی گذشته برای این منطقه‌ی زمانی «رسیده»؟ از شنبه ساعت ۸ صبح
 * محلی هفته‌ی جاری تا آخر همون هفته (جبران روزهای بعدی هم مجازه).
 * خالص و تست‌پذیر.
 */
export function letterDue(timezone: string, now: Date): { due: boolean; weekStartIso: string } {
  const tz = safeTimezone(timezone);
  const cur = getWeekRange(tz, 0, now);
  const today = todayIso(tz, now);
  const last = getWeekRange(tz, -1, now);
  let due = true;
  if (today === cur.weekStartIso) due = localMinuteOfDay(tz, now) >= DUE_MINUTE; // امروز شنبه‌ست
  return { due, weekStartIso: last.weekStartIso };
}

// هفته‌هایی که هیچ داده‌ای نداشتن رو یادمون می‌مونه تا هر ۱۰ دقیقه دوباره محاسبه نشن
const SKIP_MAX = 5000;
function skipCache(): Map<string, true> {
  const g = globalThis as unknown as { __arionLetterSkip?: Map<string, true> };
  if (!g.__arionLetterSkip) g.__arionLetterSkip = new Map();
  if (g.__arionLetterSkip.size > SKIP_MAX) g.__arionLetterSkip.clear();
  return g.__arionLetterSkip;
}

type Outcome = "created" | "skipped" | "exists" | "busy" | "failed" | "not_due";

async function deliver(u: Candidate, data: Awaited<ReturnType<typeof buildLetterData>>, res: RunResult) {
  const url = `/analysis/weekly/letters/${data.weekStart}`;
  try {
    await notifyUser(u.id, { type: "weekly.letter", title: `هفته‌نامه‌ی شماره ${data.issueNo} رسید`, body: data.headline, url });
    res.notified++;
  } catch {
    // اعلان نباید ساخت شماره رو خراب کنه
  }
}

async function processUser(u: Candidate, now: Date, opts: RunOptions, res: RunResult): Promise<Outcome> {
  const tz = safeTimezone(u.timezone);
  const { due, weekStartIso } = letterDue(tz, now);
  if (!due) return "not_due";
  const cacheKey = `${u.id}|${weekStartIso}`;
  if (skipCache().has(cacheKey)) return "skipped";

  const weekStart = isoToUtcDate(weekStartIso);
  let letterId: string;
  let issueNo: number;

  const existing = await prisma.weeklyLetter.findUnique({
    where: { userId_weekStart: { userId: u.id, weekStart } },
    select: { id: true, status: true, updatedAt: true, issueNo: true },
  });
  if (existing) {
    if (existing.status === "READY") return "exists";
    if (now.getTime() - existing.updatedAt.getTime() < STALE_PENDING_MS) return "busy";
    // PENDING کهنه — فقط یک worker برنده‌ی ادعای دوباره می‌شه
    const claimed = await prisma.weeklyLetter.updateMany({
      where: { id: existing.id, status: "PENDING", updatedAt: existing.updatedAt },
      data: { status: "PENDING" },
    });
    if (claimed.count !== 1) return "busy";
    letterId = existing.id;
    issueNo = existing.issueNo;
  } else {
    issueNo = (await prisma.weeklyLetter.count({ where: { userId: u.id, weekStart: { lt: weekStart } } })) + 1;
    try {
      const row = await prisma.weeklyLetter.create({
        data: { userId: u.id, weekStart, issueNo, status: "PENDING", data: {} },
        select: { id: true },
      });
      letterId = row.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "busy";
      throw err;
    }
  }

  try {
    const analysis = await getWeeklyAnalysis(u.id, { timezone: tz, offset: -1, isSuperAdmin: u.isSuperAdmin, now, withUnreadLetter: false });
    if (analysis.weekStart !== weekStartIso) throw new Error(`هفته‌ی محاسبه‌شده (${analysis.weekStart}) با هفته‌ی مورد انتظار (${weekStartIso}) نمی‌خونه`);

    // هفته‌ی بدون هیچ داده‌ای = شماره‌ای ساخته نمی‌شه
    if (analysis.overall.score == null || analysis.overall.activeDays === 0) {
      await prisma.weeklyLetter.deleteMany({ where: { id: letterId, status: "PENDING" } });
      skipCache().set(cacheKey, true);
      return "skipped";
    }

    // مربی AI: بهترین‌تلاش، هیچ‌وقت جلوی شماره رو نمی‌گیره
    if (opts.ai !== false && !analysis.ai && isAiAvailable()) {
      try {
        const ai = await generateAiCoach(analysis, u.id);
        if (ai) {
          await prisma.weeklyAnalysisAi.upsert({
            where: { userId_weekStart: { userId: u.id, weekStart } },
            create: { userId: u.id, weekStart, data: ai as any, model: ai.model },
            update: { data: ai as any, model: ai.model },
          });
          analysis.ai = ai;
        }
      } catch {
        // generateAiCoach خودش خطا رو لاگ کرده
      }
    }

    const extras = await gatherLetterExtras(u.id, analysis, { timezone: tz, issueNo, now });
    const data = buildLetterData(analysis, extras);
    await prisma.weeklyLetter.update({
      where: { id: letterId },
      data: { status: "READY", issueNo, data: data as unknown as Prisma.InputJsonValue, summary: summaryOf(data) as unknown as Prisma.InputJsonValue },
    });
    res.created++;
    await deliver(u, data, res);
    return "created";
  } catch (err: any) {
    // PENDING می‌مونه و بعد از ۱۵ دقیقه دوباره امتحان می‌شه
    logError("weekly-letter", `ساخت هفته‌نامه شکست خورد: ${err?.message || err}`, { context: { userId: u.id, weekStart: weekStartIso } });
    return "failed";
  }
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

export async function runWeeklyLetters(now: Date = new Date(), opts: RunOptions = {}): Promise<RunResult> {
  const res: RunResult = { considered: 0, created: 0, skipped: 0, failed: 0, notified: 0, flagOff: false };
  try {
    const flags = await getFeatureFlags();
    res.flagOff = flags.weeklyAnalysis === "off";
    const cap = opts.maxUsers ?? DEFAULT_MAX_USERS;

    // کاربر دارای ماژول AI Insight فعال و منقضی‌نشده، یا سوپریوزر — و ردیف READY/تازه‌ی
    // هفته‌ی گذشته نداشته باشه (لبه‌ی ۸ روز پیش برای هر منطقه‌ی زمانی امنه)
    const utcMidnight = isoToUtcDate(now.toISOString().slice(0, 10));
    const lowerBound = new Date(utcMidnight.getTime() - 8 * 86_400_000);
    const staleCut = new Date(now.getTime() - STALE_PENDING_MS);
    const where: Prisma.UserWhereInput = {
      isBlocked: false,
      ...(opts.userId ? { id: opts.userId } : {}),
      OR: [
        { isSuperAdmin: true },
        { moduleAccess: { some: { module: ModuleKey.AI_INSIGHT, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } },
      ],
      weeklyLetters: { none: { weekStart: { gte: lowerBound }, OR: [{ status: "READY" }, { updatedAt: { gt: staleCut } }] } },
    };

    const todo: Candidate[] = [];
    let cursor: string | undefined;
    while (todo.length < cap) {
      const page = await prisma.user.findMany({
        where,
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true, timezone: true, isSuperAdmin: true, adminPermissions: true },
      });
      if (!page.length) break;
      cursor = page[page.length - 1].id;
      for (const u of page) {
        if (todo.length >= cap) break;
        const who = { isSuperAdmin: u.isSuperAdmin, isAdmin: u.isSuperAdmin || u.adminPermissions.length > 0 };
        if (!featureKeyAllowed(flags, "weeklyAnalysis", who)) continue;
        const { due, weekStartIso } = letterDue(u.timezone || "Asia/Tehran", now);
        if (!due || skipCache().has(`${u.id}|${weekStartIso}`)) continue;
        todo.push(u);
      }
      if (page.length < PAGE_SIZE) break;
    }

    res.considered = todo.length;
    await inBatches(todo, CONCURRENCY, async (u) => {
      try {
        const out = await processUser(u, now, opts, res);
        if (out === "skipped") res.skipped++;
        if (out === "failed") res.failed++;
      } catch (err: any) {
        res.failed++;
        logError("weekly-letter", `پردازش کاربر شکست خورد: ${err?.message || err}`, { context: { userId: u.id } });
      }
    });
  } catch (err: any) {
    logError("weekly-letter", `اجرای هفته‌نامه شکست خورد: ${err?.message || err}`);
  }
  return res;
}

/** مسیر تنبل: اگه شماره‌ی هفته‌ی گذشته‌ی این کاربر سر وقت ساخته نشده، همین‌جا بساز (بدون مربی AI). */
export async function ensureLetterForUser(userId: string, now: Date = new Date()): Promise<RunResult> {
  return runWeeklyLetters(now, { userId, ai: false, maxUsers: 1 });
}
