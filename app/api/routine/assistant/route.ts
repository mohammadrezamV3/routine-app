import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { planRoutineChange } from "@/lib/aiClient";
import { logError } from "@/lib/errorLog";
import { SETTING_KEYS, ROUTINE_ASSISTANT_USES_KEY } from "@/lib/userSettingKeys";
import { isoLocal, toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import {
  applyOps, describeSchedule, sortOccurrences,
  FREE_ASSISTANT_USES, DAY_NAME_FA,
} from "@/lib/routineAssistant";
import type { CustomOccurrence } from "@/lib/storage";

// دستیارِ «مدیرِ برنامه» — تنها نقطه‌ای که مدلِ زبانی اجازه دارد برنامه‌های
// کاربر را عوض کند.
//
// چیدمانِ عمدیِ مسئولیت‌ها:
//   • مدل  → فقط *پیشنهاد* می‌دهد (چه چیزی اضافه/جابه‌جا/حذف شود)
//   • این روت → اعتبارسنجی، اعمال، ذخیره
// یعنی هیچ ادعایی از مدل (ساعت آزاد است، برنامه وجود دارد، روز درست است)
// بدونِ بررسیِ دوباره اثر نمی‌کند. `lib/routineAssistant.ts` همان
// اعتبارسنجی‌هایی را می‌کند که فرم‌های دستی می‌کنند، پس نتیجه‌ی دو مسیر یکی است.

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LEN = 500;

/** متنِ ثابتِ ردِ پیامِ خارج از موضوع — عمدا از خودِ کد، نه از مدل. */
const OFF_TOPIC_REPLY =
  "من فقط مدیرِ برنامه‌ی هفتگی‌ات هستم: می‌توانم برنامه اضافه کنم، ساعتش را عوض کنم، " +
  "به روزِ دیگری ببرمش یا حذفش کنم. برای هر چیزِ دیگری کاری از من برنمی‌آید. " +
  "مثلا بنویس: «شنبه‌ها ساعت ۸ کلاس زبان اضافه کن» یا «باشگاه رو ببر پنجشنبه».";

/**
 * آیا این کاربر اشتراکِ فعال دارد؟
 *
 * ثبت‌نامِ عادی هیچ ردیفِ Subscription نمی‌سازد (فقط ModuleAccess پایه)، پس
 * «نداشتنِ ردیفِ فعال» دقیقا یعنی کاربرِ رایگان. شرطِ currentPeriodEnd هم
 * لازم است چون ردیفِ منقضی ممکن است هنوز status قدیمی داشته باشد — همان
 * باگی که در /api/account هم بود.
 */
async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIAL"] }, currentPeriodEnd: { gt: new Date() } },
    select: { id: true },
  });
  return !!sub;
}

async function readUses(userId: string): Promise<number> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: ROUTINE_ASSISTANT_USES_KEY } },
    select: { value: true },
  });
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function writeUses(userId: string, value: number): Promise<void> {
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: ROUTINE_ASSISTANT_USES_KEY } },
    create: { userId, key: ROUTINE_ASSISTANT_USES_KEY, value },
    update: { value },
  });
}

async function readOccurrences(userId: string, key: string): Promise<any> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key } },
    select: { value: true },
  });
  return row?.value ?? null;
}

function todayLabelFa(): string {
  const now = new Date();
  const j = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${DAY_NAME_FA[now.getDay()]} ${faNum(j[2])} ${J_MONTHS[j[1] - 1]} ${faNum(j[0])}`;
}

export async function POST(req: NextRequest) {
  // ROUTINE ماژولِ پایه است و همه دارندش؛ این نگهبان این‌جا برای دسترسی
  // نیست، برای همان سه کارِ دیگری است که می‌کند: ۴۰۱ برای مهمان، بلاکِ
  // کاربرِ مسدودشده، و بیرون‌دادنِ userId/isSuperAdmin.
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  const { userId, isSuperAdmin } = guard;

  // سقفِ نرخ مستقل از سهمیه است: سهمیه محدودیتِ محصولی است، این جلوی
  // هزینه‌ی گیت‌وی را می‌گیرد — از جمله برای مشترکی که سهمیه‌اش نامحدود است
  // و برای پیام‌های خارج از موضوع که سهمیه مصرف نمی‌کنند.
  if (!(await checkRateLimit(`routine-assistant:${userId}`, 15, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "پیام‌ها را خیلی سریع پشتِ هم فرستادی. چند دقیقه صبر کن و دوباره امتحان کن." },
      { status: 429 }
    );
  }

  const parsed = await readJsonBody<{ message?: unknown }>(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const message = typeof parsed.body?.message === "string" ? parsed.body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "چیزی ننوشتی. بگو با برنامه‌ات چه کار کنم." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return NextResponse.json(
      { error: `پیامت خیلی بلند است (حداکثر ${MAX_MESSAGE_LEN} کاراکتر). کوتاه‌تر و مشخص‌تر بنویس.` },
      { status: 400 }
    );
  }

  // ---------- سهمیه ----------
  const unlimited = isSuperAdmin || (await hasActiveSubscription(userId));
  let usesBefore = 0;
  if (!unlimited) {
    usesBefore = await readUses(userId);
    if (usesBefore >= FREE_ASSISTANT_USES) {
      return NextResponse.json(
        {
          error:
            `سه استفاده‌ی رایگانِ مدیرِ برنامه تمام شده. با فعال‌کردنِ اشتراک، ` +
            `بدونِ محدودیت می‌توانی برنامه‌هایت را با گفت‌وگو بچینی.`,
          quotaExhausted: true,
          quota: { unlimited: false, used: usesBefore, limit: FREE_ASSISTANT_USES, remaining: 0 },
        },
        { status: 403 }
      );
    }
    // *قبل* از فراخوانی مصرف می‌شود، نه بعدش: دو درخواستِ هم‌زمان نباید هر
    // دو یک سهمیه را ببینند. اگر پیام خارج از موضوع بود یا گیت‌وی خطا داد،
    // پایین‌تر پس داده می‌شود.
    await writeUses(userId, usesBefore + 1);
  }

  async function refundQuota() {
    if (!unlimited) await writeUses(userId, usesBefore).catch(() => {});
  }

  // ---------- وضعیتِ فعلیِ برنامه‌ها ----------
  const rawOcc = await readOccurrences(userId, SETTING_KEYS.customOccurrences);
  const occurrences: CustomOccurrence[] = Array.isArray(rawOcc) ? (rawOcc as CustomOccurrence[]) : [];
  const rawRemoved = await readOccurrences(userId, SETTING_KEYS.removedOccurrences);
  const removed: string[] = Array.isArray(rawRemoved) ? (rawRemoved as string[]).filter((x) => typeof x === "string") : [];

  const ordered = sortOccurrences(occurrences);

  // ---------- فراخوانی مدل ----------
  let plan;
  try {
    plan = await planRoutineChange(message, describeSchedule(ordered), todayLabelFa(), userId);
  } catch (err: any) {
    await refundQuota();
    logError("ai-gateway", `دستیارِ روتین شکست خورد: ${err?.message || err}`, {
      context: { feature: "ROUTINE_ASSISTANT" },
    });
    return NextResponse.json(
      { error: "الان نتوانستم به دستیار وصل شوم. یک دقیقه‌ی دیگر دوباره بفرست — این پیام سهمیه‌ات را مصرف نکرد." },
      { status: 503 }
    );
  }

  const quotaAfter = (used: number) => ({
    unlimited,
    used,
    limit: unlimited ? null : FREE_ASSISTANT_USES,
    remaining: unlimited ? null : Math.max(0, FREE_ASSISTANT_USES - used),
  });

  // ---------- خارج از موضوع ----------
  if (plan.offTopic) {
    await refundQuota();
    return NextResponse.json({
      reply: OFF_TOPIC_REPLY,
      offTopic: true,
      applied: [],
      problems: [],
      changed: false,
      quota: quotaAfter(usesBefore),
    });
  }

  // ---------- فقط سوال، بدونِ تغییر ----------
  if (!plan.ops.length) {
    return NextResponse.json({
      reply: plan.reply || "چیزی برای تغییر پیدا نکردم. دقیق‌تر بگو با کدام برنامه چه کار کنم.",
      applied: [],
      problems: [],
      changed: false,
      quota: quotaAfter(unlimited ? 0 : usesBefore + 1),
    });
  }

  // ---------- اعمال ----------
  const outcome = applyOps(ordered, removed, plan.ops, isoLocal(new Date()));

  if (outcome.changed) {
    const next = sortOccurrences(outcome.occurrences);
    await prisma.userSetting.upsert({
      where: { userId_key: { userId, key: SETTING_KEYS.customOccurrences } },
      create: { userId, key: SETTING_KEYS.customOccurrences, value: next as any },
      update: { value: next as any },
    });
    // فهرستِ حذف‌شده‌ها فقط وقتی نوشته می‌شود که واقعا فرق کرده باشد —
    // یک upsert اضافه برای هر پیام بی‌دلیل است.
    if (outcome.removed.length !== removed.length) {
      await prisma.userSetting.upsert({
        where: { userId_key: { userId, key: SETTING_KEYS.removedOccurrences } },
        create: { userId, key: SETTING_KEYS.removedOccurrences, value: outcome.removed as any },
        update: { value: outcome.removed as any },
      });
    }
  }

  // متنِ نهایی از نتیجه‌ی *واقعی* ساخته می‌شود، نه از حرفِ مدل. اگر مدل
  // گفته باشد «انجام شد» ولی تداخل مانع شده باشد، کاربر نباید آن را ببیند.
  const lines: string[] = [];
  if (outcome.applied.length) lines.push(...outcome.applied);
  if (outcome.problems.length) lines.push(...outcome.problems);
  if (!lines.length) lines.push(plan.reply || "تغییری لازم نبود.");

  return NextResponse.json({
    reply: lines.join("\n"),
    applied: outcome.applied,
    problems: outcome.problems,
    changed: outcome.changed,
    occurrences: outcome.changed ? sortOccurrences(outcome.occurrences) : null,
    quota: quotaAfter(unlimited ? 0 : usesBefore + 1),
  });
}

// GET — فقط وضعیتِ سهمیه، برای این‌که UI بتواند قبل از تایپ‌کردن بگوید
// چند بار مانده (و دکمه را برای کاربرِ تمام‌شده غیرفعال کند).
export async function GET() {
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  const { userId, isSuperAdmin } = guard;

  const unlimited = isSuperAdmin || (await hasActiveSubscription(userId));
  const used = unlimited ? 0 : await readUses(userId);
  return NextResponse.json({
    unlimited,
    used,
    limit: unlimited ? null : FREE_ASSISTANT_USES,
    remaining: unlimited ? null : Math.max(0, FREE_ASSISTANT_USES - used),
  });
}
