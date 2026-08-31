import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidCronRequest } from "@/lib/cronAuth";
import { isPushConfigured, sendPushToUser } from "@/lib/webPush";
import { currencyMeta } from "@/lib/economicCalendar";
import {
  NEWS_ALERT_KEY, NEWS_ALERT_LOG_KEY, normalizeNewsAlertPrefs,
} from "@/lib/tradeNewsAlerts";

// POST /api/cron/economic-alerts — هشدارِ پیش از اخبارِ مهم.
// مثلِ بقیه‌ی کران‌ها پشتِ CRON_SECRET است و یک crontabِ بیرونی صدایش
// می‌زند (پیشنهاد: هر ۵ دقیقه — نگاه کن به deploy/cron.example).
//
// منطق: رویدادهایی که در بازه‌ی [الان، الان + بیشترین minutesBeforeِ ممکن]
// رخ می‌دهند یک‌بار خوانده می‌شوند، بعد برای هر کاربرِ سابسکرایب‌شده فیلترِ
// خودش (سطحِ تأثیر، ارز، فاصله‌ی زمانی) اعمال می‌شود.
//
// جلوگیری از ارسالِ تکراری: چون این روت هر چند دقیقه اجرا می‌شود ولی هر
// رویداد فقط یک‌بار باید هشدار بدهد، شناسه‌ی رویدادهای هشدارداده‌شده روی
// همان UserSetting (کلیدِ سرور-مدیریتِ tradeNewsAlertLog) نگه داشته می‌شود.

const MAX_LOOKAHEAD_MINUTES = 60; // بزرگ‌ترین گزینه‌ی minutesBefore
/** ردهای قدیمی‌تر از این مدت پاک می‌شوند تا لاگ بی‌نهایت بزرگ نشود */
const LOG_RETENTION_MS = 3 * 86_400_000;

export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // اگر VAPID ست نشده باشد، هر ارسال استثنا می‌دهد. بهتر است همان اول
  // صریح گزارش شود تا اینکه به‌ازای هر کاربر یک استثنای تکراری بخوریم.
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: "کلیدهای VAPID ست نشده — نوتیفیکیشن ارسال نمی‌شود" });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + MAX_LOOKAHEAD_MINUTES * 60_000);

  const events = await prisma.economicEvent.findMany({
    where: { occursAt: { gte: now, lte: horizon } },
    orderBy: { occursAt: "asc" },
    take: 200,
    select: { id: true, title: true, currency: true, impact: true, occursAt: true },
  });
  if (!events.length) return NextResponse.json({ ok: true, events: 0, pushed: 0 });

  // فقط کاربرهایی که هم دستگاهِ سابسکرایب‌شده دارند هم دسترسیِ ماژولِ ترید —
  // بقیه اصلاً بررسی نمی‌شوند.
  const subscribed = await prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } });
  const userIds = subscribed.map((s) => s.userId);
  if (!userIds.length) return NextResponse.json({ ok: true, events: events.length, pushed: 0 });

  const withAccess = await prisma.moduleAccess.findMany({
    where: { userId: { in: userIds }, module: ModuleKey.TRADE, active: true },
    select: { userId: true, expiresAt: true },
  });
  const eligible = withAccess
    .filter((a) => !a.expiresAt || a.expiresAt.getTime() > now.getTime())
    .map((a) => a.userId);
  if (!eligible.length) return NextResponse.json({ ok: true, events: events.length, pushed: 0 });

  let pushed = 0;
  let failed = 0;
  let checked = 0;

  for (const userId of eligible) {
    checked++;
    const rows = await prisma.userSetting.findMany({
      where: { userId, key: { in: [NEWS_ALERT_KEY, NEWS_ALERT_LOG_KEY] } },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));

    const prefs = normalizeNewsAlertPrefs(byKey.get(NEWS_ALERT_KEY));
    if (!prefs.enabled) continue;

    const rawLog = byKey.get(NEWS_ALERT_LOG_KEY);
    const log: Record<string, string> =
      rawLog && typeof rawLog === "object" && !Array.isArray(rawLog) ? { ...(rawLog as Record<string, string>) } : {};

    let changed = false;
    for (const e of events) {
      if (log[e.id]) continue;
      if (!prefs.impacts.includes(e.impact)) continue;
      if (prefs.currencies.length && !prefs.currencies.includes(e.currency)) continue;

      const minutesAway = Math.round((e.occursAt.getTime() - now.getTime()) / 60_000);
      if (minutesAway > prefs.minutesBefore) continue;

      const flag = currencyMeta(e.currency)?.flag || "";
      try {
        await sendPushToUser(userId, {
          title: `${flag} ${e.currency} — ${e.title}`,
          body: minutesAway <= 0 ? "همین حالا منتشر می‌شود" : `تا ${minutesAway} دقیقه دیگر منتشر می‌شود`,
          url: "/trade/calendar",
        });
      } catch {
        // شکستِ ارسال برای یک کاربر نباید بقیه‌ی کاربرها را از اجرا بیندازد،
        // و عمداً در لاگ ثبت *نمی‌شود* — وگرنه رویداد «فرستاده‌شده» حساب
        // می‌شد و کاربر هیچ‌وقت هشدارش را نمی‌گرفت. اجرای بعدیِ کران (تا
        // وقتی هنوز داخلِ بازه‌ی زمانی باشد) دوباره تلاش می‌کند.
        failed++;
        continue;
      }
      log[e.id] = now.toISOString();
      changed = true;
      pushed++;
    }

    if (!changed) continue;

    // هرس کردنِ ردهای قدیمی در همان نوشتنی که لازم بود
    for (const [id, at] of Object.entries(log)) {
      if (now.getTime() - new Date(at).getTime() > LOG_RETENTION_MS) delete log[id];
    }
    await prisma.userSetting.upsert({
      where: { userId_key: { userId, key: NEWS_ALERT_LOG_KEY } },
      create: { userId, key: NEWS_ALERT_LOG_KEY, value: log },
      update: { value: log },
    });
  }

  return NextResponse.json({ ok: true, events: events.length, checked, pushed, failed });
}
