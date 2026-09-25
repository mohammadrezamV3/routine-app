import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidCronRequest } from "@/lib/cronAuth";
import { sendPushToUser } from "@/lib/webPush";
import { logError } from "@/lib/errorLog";
import { computeWeeklyAnalysis } from "@/lib/weeklyAnalysis/compute";
import { getWeekRange } from "@/lib/weeklyAnalysis/week";
import { generateAiCoach, isAiAvailable } from "@/lib/weeklyAnalysis/ai";

// POST /api/cron/weekly-report — نه چیزی که خود کاربر/کلاینت صداش بزنه،
// یه crontab بیرونی (هر شنبه ساعت ۹، طبق راهنمای دیپلوی — نگاه کن به
// deploy/cron.example) این‌جا رو می‌زنه. آدرسِ روت عمدا همون آدرسِ قدیمیِ
// «گزارش هفتگی» نگه داشته شده تا crontab سرورهای موجود نیازی به تغییر
// نداشته باشه؛ محتوا الان مالِ «آنالیز هفتگی»ه.
//
// weekOffset=-1 یعنی هفته‌ای که همین الان تموم شده (اگه امروز شنبه‌ست،
// هفته‌ی جاری تازه از امروز شروع شده — هفته‌ی قبل، شنبه‌تا‌جمعه‌ی گذشته،
// همونیه که باید نهایی و تحویل داده بشه).
//
// همه‌ی کاربرها با یه فراخوان AI (اگه گیت‌وی تنظیم باشه) generate می‌شن —
// برای جلوگیری از هجوم هم‌زمان به گیت‌وی AI، با concurrency محدود (نه
// Promise.all بی‌سقف) پردازش می‌شن.
const CONCURRENCY = 3;
const WEEK_OFFSET = -1;

async function processInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAiAvailable()) {
    // AI تنظیم نشده — چیزی برای cache‌کردن نیست؛ موفقیت‌آمیز ولی خالی برمی‌گردیم
    return NextResponse.json({ ok: true, skipped: "ai_not_configured", total: 0, succeeded: 0, failed: 0 });
  }

  const [moduleUsers, superAdmins] = await Promise.all([
    prisma.moduleAccess.findMany({
      where: { module: ModuleKey.AI_INSIGHT, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { userId: true },
    }),
    prisma.user.findMany({ where: { isSuperAdmin: true }, select: { id: true } }),
  ]);
  const userIds = Array.from(new Set([...moduleUsers.map((m) => m.userId), ...superAdmins.map((u) => u.id)]));

  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, timezone: true, isSuperAdmin: true } });

  let succeeded = 0;
  let failed = 0;

  await processInBatches(users, CONCURRENCY, async (user) => {
    try {
      const timezone = user.timezone || "Asia/Tehran";
      const analysis = await computeWeeklyAnalysis(user.id, { timezone, offset: WEEK_OFFSET, isSuperAdmin: user.isSuperAdmin });
      const ai = await generateAiCoach(analysis, user.id);
      if (!ai) {
        // مربی AI برنگشت (نامنتظره چون isAiAvailable() بالا true بود) — این کاربر شکست‌خورده حساب می‌شه
        throw new Error("مربیِ AI چیزی برنگردوند");
      }

      const { weekStart } = getWeekRange(timezone, WEEK_OFFSET);
      await prisma.weeklyAnalysisAi.upsert({
        where: { userId_weekStart: { userId: user.id, weekStart } },
        create: { userId: user.id, weekStart, data: ai as any, model: ai.model },
        update: { data: ai as any, model: ai.model },
      });

      succeeded++;
      try {
        await sendPushToUser(user.id, {
          title: "آنالیز هفتگی‌ات آماده‌ست",
          body: analysis.overall.score != null ? `امتیاز هفته‌ی گذشته‌ات: ${analysis.overall.score} از ۱۰۰` : "آنالیز هفته‌ی گذشته‌ات آماده‌ست.",
          url: "/analysis/weekly?offset=-1",
        });
      } catch {
        // Web Push اختیاریه (مثلا VAPID تنظیم نشده) — نباید کل generate رو fail حساب کنه
      }
    } catch (err: any) {
      failed++;
      logError("cron-weekly-report", `تولید آنالیز هفتگی کاربر شکست خورد: ${err?.message || err}`, { context: { userId: user.id } });
    }
  });

  return NextResponse.json({ ok: true, total: users.length, succeeded, failed });
}
