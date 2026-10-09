"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getCustomOccurrences, getRemovedOccurrences, getDaily } from "@/lib/storage";
import { FA_WEEKDAY } from "@/lib/jalali";
import { getNotificationPermission, fireReminder } from "@/lib/notifications";
import { getMedications } from "@/lib/medications";
import { getDashboardPrefs } from "@/lib/dashboardPrefs";
import { getNotifPrefs } from "@/lib/notifPrefs";
import { hasServerPush, subscribeToPush } from "@/lib/pushClient";
import { isDue, planExerciseReminder, planMedicationReminders, planRoutineReminders } from "@/lib/reminderPlan";
import { tr } from "@/lib/i18n";

// بی‌صداست (چیزی رندر نمی‌کنه). دو کار:
//
// ۱) همگام نگه‌داشتن سابسکریپشن Web Push این دستگاه با سرور — هر بار که
//    کاربر واردشده اپ رو باز می‌کنه یا اجازه‌ی نوتیف عوض می‌شه. یادآوری
//    اصلی از سرور می‌آد (lib/pushScheduler.ts) و وقتی مرورگر بسته‌ست هم می‌رسه.
//
// ۲) پشتیبان تب‌باز — فقط وقتی این دستگاه پوش سرور نداره (مهمان، VAPID
//    نیست، یا ثبت سابسکریپشن ناموفق بوده). دقیقا همون قانون سرور
//    (lib/reminderPlan.ts): فقط *قبل* از شروع برنامه/نوبت، هیچ‌وقت بعدش.
//    اگه پوش سرور فعاله، این‌جا هیچ یادآوری‌ای نشون داده نمی‌شه تا تکراری نشه.

const CHECK_INTERVAL_MS = 30_000; // بازه‌ی «همین الان» یک دقیقه‌ست، پس تیک باید زیر یک دقیقه باشه
const EXERCISE_CHECK_EVERY_MS = 5 * 60_000; // دو درخواست API دارد؛ لازم نیست هر تیک

function deviceTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tehran";
  } catch {
    return "Asia/Tehran";
  }
}

export function NotificationEngine() {
  const { status, data } = useSession();
  const userId = (data?.user as { id?: string } | undefined)?.id;

  // ── ۱) همگام‌سازی سابسکریپشن ──
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    let cancelled = false;
    const sync = () => {
      if (!cancelled && getNotificationPermission() === "granted") void subscribeToPush();
    };
    sync();
    // اجازه از جای دیگه‌ای (کارت یادآوری، تنظیمات، خود مرورگر) داده شد → همون لحظه سابسکرایب
    let perm: PermissionStatus | null = null;
    navigator.permissions?.query({ name: "notifications" as PermissionName }).then((p) => {
      if (cancelled) return;
      perm = p;
      p.onchange = sync;
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (perm) perm.onchange = null;
    };
  }, [status, userId]);

  // ── ۲) پشتیبان تب‌باز ──
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    let lastExerciseCheck = 0;
    const authed = status === "authenticated";

    async function checkRoutine(tz: string, now: Date) {
      const [removedArr, customArr] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
      if (cancelled) return;
      const due = planRoutineReminders({ tz, now, customOccurrences: customArr, removedOccurrences: new Set(removedArr) })
        .filter((r) => isDue(r, now.getTime()));
      for (const r of due) {
        const daily = await getDaily(r.dateIso);
        if (cancelled) return;
        if (r.itemId && daily.tasks[r.itemId]) continue; // قبلا انجام‌شده علامت خورده
        fireReminder(r.key, r.title, r.body, { deadline: r.deadline, url: r.url });
      }
    }

    async function checkExercise(tz: string, now: Date) {
      if (!authed) return;
      const r = planExerciseReminder({ tz, now });
      if (!isDue(r, now.getTime())) return;
      if (now.getTime() - lastExerciseCheck < EXERCISE_CHECK_EVERY_MS) return;
      lastExerciseCheck = now.getTime();
      try {
        const planRes = await fetch("/api/exercise/plan");
        if (!planRes.ok) return;
        const { plan } = await planRes.json();
        if (cancelled || !plan) return;

        const dayName = FA_WEEKDAY[new Date(`${r.dateIso}T00:00:00Z`).getUTCDay()];
        const todayPlan = plan.planData.find((d: { day: string; focus: string }) => d.day === dayName);
        if (!todayPlan) return; // امروز روز استراحته

        const logRes = await fetch(`/api/exercise/log?planId=${plan.id}&date=${r.dateIso}`);
        const logData = logRes.ok ? await logRes.json() : {};
        if (cancelled || logData.completed) return;

        fireReminder(r.key, r.title, tr(`برنامه‌ی ورزشی امروز (${todayPlan.focus}) هنوز ثبت نشده.`, `Today's workout plan (${todayPlan.focus}) has not been logged yet.`), { deadline: r.deadline, url: r.url });
      } catch {}
    }

    async function checkMedications(tz: string, now: Date) {
      // خاموش‌کردن کارت دارو از تنظیمات، اعلان‌هاش رو هم قطع می‌کنه
      const prefs = await getDashboardPrefs();
      if (cancelled || !prefs.showMedications) return;
      const meds = await getMedications();
      if (cancelled || !meds.length) return;
      for (const r of planMedicationReminders({ tz, now, meds })) {
        if (isDue(r, now.getTime())) fireReminder(r.key, r.title, r.body, { deadline: r.deadline, url: r.url });
      }
    }

    async function tick() {
      if (getNotificationPermission() !== "granted") return;
      // پوش سرور فعاله → همه‌چیز از سرور می‌آد (حتی با تب باز)؛ این‌جا هیچ
      if (await hasServerPush(authed ? userId : undefined)) return;
      if (cancelled) return;
      const tz = deviceTz();
      const now = new Date();
      const prefs = await getNotifPrefs().catch(() => null);
      if (cancelled) return;
      if (prefs?.taskReminders !== false) void checkRoutine(tz, now).catch(() => {});
      if (prefs?.exerciseReminders !== false) void checkExercise(tz, now);
      void checkMedications(tz, now).catch(() => {});
    }

    void tick();
    // تیک در پس‌زمینه هم ادامه داره (مرورگر تایمر تب مخفی رو به حداکثر
    // یک‌بار در دقیقه کند می‌کنه) — قبلا وقتی تب مخفی بود اصلا چک نمی‌شد و
    // یادآوری تا برگشتن کاربر به تب عقب می‌افتاد. برای مهمان این‌ها همه
    // localStorage است؛ برای کاربر واردشده از کش storage.
    const id = setInterval(() => void tick(), CHECK_INTERVAL_MS);
    const onVis = () => { if (!document.hidden) void tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status, userId]);

  return null;
}
