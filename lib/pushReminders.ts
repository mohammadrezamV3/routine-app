import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPushConfigured, sendPushToUser, PushPayload } from "@/lib/webPush";
import { DEFAULT_NOTIF_PREFS, NotifPrefs } from "@/lib/notifPrefs";
import { FA_WEEKDAY } from "@/lib/jalali";
import { currencyMeta } from "@/lib/economicCalendar";
import { NEWS_ALERT_KEY, newsEventWatchKey, normalizeNewsAlertPrefs } from "@/lib/tradeNewsAlerts";
import {
  PlannedReminder, isDue, planExerciseReminder, planMedicationReminders, planRoutineReminders,
  OccurrenceLike,
} from "@/lib/reminderPlan";
import type { Medication } from "@/lib/medicationSchedule";

// ارسال یادآوری‌ها با Web Push از سمت سرور — هم زمان‌بند داخلی
// (lib/pushScheduler.ts، هر ۳۰ ثانیه) صداش می‌زنه، هم روت‌های کران قدیمی
// (/api/push/send-reminders، /api/cron/economic-alerts) برای سازگاری.
//
// ضدتکرار: قبل از هر ارسال یک ردیف در PushReminderLog با کلید یکتای
// (userId, key) «ادعا» می‌شه. این INSERT اتمیکه، پس حتی اگه چند worker یا
// زمان‌بند + کران بیرونی هم‌زمان اجرا بشن، فقط یکی می‌فرسته؛ و بعد از
// ری‌استارت هم تکرار نمی‌شه. اگه ارسال به هیچ دستگاهی نرسید (خطای موقت
// شبکه)، ادعا پس گرفته می‌شه تا تیک بعدی — تا وقتی هنوز قبل از شروعه —
// دوباره امتحان کنه.

const SETTING_KEYS_NEEDED = ["notifPrefs", "removedOccurrences", "customOccurrences", "medications", "dashboardPrefs"];
const USER_CHUNK = 500;

type SendStats = { pushed: number; failed: number; skipped: number };

function isUniqueViolation(err: any): boolean {
  return err?.code === "P2002";
}

/** ادعا + ارسال + (در صورت شکست کامل) پس‌گرفتن ادعا */
async function claimAndSend(userId: string, key: string, deadline: number, payload: Omit<PushPayload, "tag" | "deadline">, stats: SendStats) {
  if (Date.now() >= deadline) { stats.skipped++; return; }
  let claimId: string;
  try {
    const row = await prisma.pushReminderLog.create({ data: { userId, key, deadline: new Date(deadline) }, select: { id: true } });
    claimId = row.id;
  } catch (err) {
    if (isUniqueViolation(err)) { stats.skipped++; return; }
    throw err;
  }
  try {
    const res = await sendPushToUser(userId, { ...payload, tag: key, deadline });
    if (res.sent > 0) stats.pushed++;
    else if (res.failed > 0) {
      stats.failed++;
      await prisma.pushReminderLog.delete({ where: { id: claimId } }).catch(() => {});
    }
  } catch {
    stats.failed++;
    await prisma.pushReminderLog.delete({ where: { id: claimId } }).catch(() => {});
  }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** یادآوری‌های برنامه/دارو/تمرین برای همه‌ی کاربرهای دارای دستگاه سابسکرایب‌شده */
export async function runDueReminders(now: Date = new Date()): Promise<{ ok: true; checked: number } & SendStats | { ok: true; skipped: string }> {
  if (!isPushConfigured()) return { ok: true, skipped: "کلیدهای VAPID ست نشده — نوتیفیکیشن ارسال نمی‌شود" };
  const nowMs = now.getTime();
  const stats: SendStats = { pushed: 0, failed: 0, skipped: 0 };

  const subscribed = await prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } });
  const allIds = subscribed.map((s) => s.userId);
  let checked = 0;

  for (let i = 0; i < allIds.length; i += USER_CHUNK) {
    const ids = allIds.slice(i, i + USER_CHUNK);
    // همه‌ی تنظیمات این دسته از کاربرها با دو کوئری، نه چند کوئری به‌ازای هر کاربر
    const [users, settingRows] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, timezone: true } }),
      prisma.userSetting.findMany({ where: { userId: { in: ids }, key: { in: SETTING_KEYS_NEEDED } }, select: { userId: true, key: true, value: true } }),
    ]);
    const settingsByUser = new Map<string, Map<string, unknown>>();
    for (const r of settingRows) {
      let m = settingsByUser.get(r.userId);
      if (!m) settingsByUser.set(r.userId, (m = new Map()));
      m.set(r.key, r.value);
    }

    // فقط یادآوری‌هایی که *همین الان* در بازه‌شون هستن
    const due: { userId: string; r: PlannedReminder }[] = [];
    for (const u of users) {
      checked++;
      const s = settingsByUser.get(u.id) || new Map<string, unknown>();
      const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, ...((s.get("notifPrefs") as Partial<NotifPrefs>) || {}) };
      const tz = u.timezone || "Asia/Tehran";
      if (prefs.taskReminders) {
        const planned = planRoutineReminders({
          tz, now,
          customOccurrences: asArray<OccurrenceLike>(s.get("customOccurrences")),
          removedOccurrences: new Set(asArray<string>(s.get("removedOccurrences"))),
        });
        for (const r of planned) if (isDue(r, nowMs)) due.push({ userId: u.id, r });
      }
      // مثل نسخه‌ی کلاینت: خاموش‌کردن کارت دارو از تنظیمات داشبورد، اعلان‌هاش رو هم قطع می‌کنه
      const dash = s.get("dashboardPrefs") as { showMedications?: boolean } | undefined;
      if (dash?.showMedications !== false) {
        const meds = asArray<Medication>(s.get("medications"));
        if (meds.length) {
          for (const r of planMedicationReminders({ tz, now, meds })) if (isDue(r, nowMs)) due.push({ userId: u.id, r });
        }
      }
      if (prefs.exerciseReminders) {
        const r = planExerciseReminder({ tz, now });
        if (isDue(r, nowMs)) due.push({ userId: u.id, r });
      }
    }
    if (!due.length) continue;

    // قبلا فرستاده‌شده‌ها (یک کوئری) — تا برای تمرین/انجام‌شدن الکی کوئری نزنیم
    const already = await prisma.pushReminderLog.findMany({
      where: { userId: { in: Array.from(new Set(due.map((d) => d.userId))) }, key: { in: Array.from(new Set(due.map((d) => d.r.key))) } },
      select: { userId: true, key: true },
    });
    const sentSet = new Set(already.map((a) => `${a.userId}|${a.key}`));

    for (const { userId, r } of due) {
      if (sentSet.has(`${userId}|${r.key}`)) continue;
      try {
        if (r.kind === "routine" && r.itemId) {
          const entry = await prisma.dailyEntry.findUnique({
            where: { userId_date: { userId, date: new Date(r.dateIso) } },
            select: { completedItems: true },
          });
          const done = (entry?.completedItems as Record<string, boolean> | null) || {};
          if (done[r.itemId]) continue; // قبلا تیک خورده
        }
        let body = r.body;
        if (r.kind === "exercise") {
          const plan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" }, select: { id: true, planData: true } });
          if (!plan) continue;
          const dayName = FA_WEEKDAY[new Date(`${r.dateIso}T00:00:00Z`).getUTCDay()];
          const todayPlan = asArray<{ day: string; focus: string }>(plan.planData).find((d) => d?.day === dayName);
          if (!todayPlan) continue; // امروز روز استراحته
          const log = await prisma.exerciseLog.findFirst({ where: { planId: plan.id, userId, date: new Date(r.dateIso) }, select: { completed: true } });
          if (log?.completed) continue;
          body = `برنامه‌ی ورزشی امروز (${todayPlan.focus}) هنوز ثبت نشده.`;
        }
        await claimAndSend(userId, r.key, r.deadline, { title: r.title, body, url: r.url }, stats);
      } catch (err: any) {
        // شکست یک کاربر نباید بقیه رو از این تیک بندازه
        stats.failed++;
        console.error(`[push] reminder ${r.key} failed: ${err?.message || err}`);
      }
    }
  }

  return { ok: true, checked, ...stats };
}

const MAX_LOOKAHEAD_MINUTES = 60; // بزرگ‌ترین گزینه‌ی minutesBefore

/**
 * هشدار پیش از اخبار مهم اقتصادی — همون منطق قبلی /api/cron/economic-alerts،
 * با ضدتکرار اتمیک PushReminderLog و همون قانون «بعد از انتشار دیگه نه».
 */
export async function runEconomicAlerts(now: Date = new Date()): Promise<Record<string, unknown>> {
  if (!isPushConfigured()) return { ok: true, skipped: "کلیدهای VAPID ست نشده — نوتیفیکیشن ارسال نمی‌شود" };
  const horizon = new Date(now.getTime() + MAX_LOOKAHEAD_MINUTES * 60_000);

  const events = await prisma.economicEvent.findMany({
    where: { occursAt: { gt: now, lte: horizon } },
    orderBy: { occursAt: "asc" },
    take: 200,
    select: { id: true, title: true, currency: true, impact: true, occursAt: true },
  });
  if (!events.length) return { ok: true, events: 0, pushed: 0 };

  const subscribed = await prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } });
  const userIds = subscribed.map((s) => s.userId);
  if (!userIds.length) return { ok: true, events: events.length, pushed: 0 };

  const withAccess = await prisma.moduleAccess.findMany({
    where: { userId: { in: userIds }, module: ModuleKey.TRADE, active: true },
    select: { userId: true, expiresAt: true },
  });
  const eligible = Array.from(new Set(withAccess.filter((a) => !a.expiresAt || a.expiresAt.getTime() > now.getTime()).map((a) => a.userId)));
  if (!eligible.length) return { ok: true, events: events.length, pushed: 0 };

  const prefRows = await prisma.userSetting.findMany({ where: { userId: { in: eligible }, key: NEWS_ALERT_KEY }, select: { userId: true, value: true } });
  const prefsByUser = new Map(prefRows.map((r) => [r.userId, normalizeNewsAlertPrefs(r.value)]));
  const stats: SendStats = { pushed: 0, failed: 0, skipped: 0 };
  let checked = 0;

  for (const userId of eligible) {
    const prefs = prefsByUser.get(userId);
    if (!prefs) continue;
    if (!prefs.enabled && !prefs.watchedEventKeys.length) continue;
    checked++;
    for (const e of events) {
      // ستون Alert جدول: رویداد ستاره‌خورده مستقل از قاعده‌ی کلی هشدار می‌گیره
      const watched = prefs.watchedEventKeys.includes(newsEventWatchKey(e.currency, e.title));
      if (!watched) {
        if (!prefs.enabled) continue;
        if (!prefs.impacts.includes(e.impact)) continue;
        if (prefs.currencies.length && !prefs.currencies.includes(e.currency)) continue;
      }
      const deadline = e.occursAt.getTime();
      const minutesAway = Math.ceil((deadline - now.getTime()) / 60_000);
      if (minutesAway > prefs.minutesBefore) continue;
      const flag = currencyMeta(e.currency)?.flag || "";
      try {
        await claimAndSend(userId, `econ:${e.id}`, deadline, {
          title: `${flag} ${e.currency} — ${e.title}`,
          body: `تا ${minutesAway} دقیقه دیگر منتشر می‌شود`,
          url: "/trade/calendar",
        }, stats);
      } catch (err: any) {
        stats.failed++;
        console.error(`[push] econ alert ${e.id} failed: ${err?.message || err}`);
      }
    }
  }
  return { ok: true, events: events.length, checked, ...stats };
}

/** ردهای ضدتکرار خیلی قدیمی (deadline بیش از دو روز گذشته) — دیگه هیچ‌وقت لازم نمی‌شن */
export async function pruneReminderLog(now: Date = new Date()): Promise<number> {
  const res = await prisma.pushReminderLog.deleteMany({ where: { deadline: { lt: new Date(now.getTime() - 2 * 86_400_000) } } });
  return res.count;
}
