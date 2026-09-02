import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidCronRequest } from "@/lib/cronAuth";
import { sendPushToUser } from "@/lib/webPush";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";
import { logError } from "@/lib/errorLog";

// POST /api/cron/weekly-report — نه چیزی که خود کاربر/کلاینت صداش بزنه،
// یه crontab بیرونی (هر شنبه ساعت ۹، طبق راهنمای دیپلوی — نگاه کن به
// deploy/cron.example) این‌جا رو می‌زنه. دقیقا هم‌الگوی
// app/api/push/send-reminders/route.ts: پشت CRON_SECRET قفله.
//
// weekOffset=-1 یعنی هفته‌ای که همین الان تموم شده (اگه امروز شنبه‌ست،
// هفته‌ی جاری تازه از امروز شروع شده — هفته‌ی قبل، شنبه‌تا‌جمعه‌ی گذشته،
// همونیه که باید نهایی و تحویل داده بشه).
//
// همه‌ی کاربرها با یه فراخوان AI (اگه داده‌ی کافی داشته باشن) generate
// می‌شن — برای جلوگیری از هجوم هم‌زمان به گیت‌وی AI، با concurrency
// محدود (نه Promise.all بی‌سقف) پردازش می‌شن.
const CONCURRENCY = 3;

async function processInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
      const report = await getOrGenerateWeeklyReport(user.id, user.timezone || "Asia/Tehran", user.isSuperAdmin, -1, true);
      succeeded++;
      try {
        await sendPushToUser(user.id, {
          title: "گزارش هفتگی‌ات آماده‌ست",
          body: report.overallScore != null ? `امتیاز هفته‌ی گذشته‌ات: ${report.overallScore} از ۱۰۰` : "گزارش هفته‌ی گذشته‌ات آماده‌ست.",
          url: "/report/weekly?offset=-1",
        });
      } catch {
        // Web Push اختیاریه (مثلا VAPID تنظیم نشده) — نباید کل generate رو fail حساب کنه
      }
    } catch (err: any) {
      failed++;
      logError("cron-weekly-report", `تولید گزارش هفتگی کاربر شکست خورد: ${err?.message || err}`, { context: { userId: user.id } });
    }
  });

  return NextResponse.json({ ok: true, total: users.length, succeeded, failed });
}
