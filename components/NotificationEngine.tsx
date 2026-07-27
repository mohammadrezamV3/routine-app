"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getCustomOccurrences, getRemovedOccurrences, getDaily } from "@/lib/storage";
import { tasksForDate, timeStartMinutes } from "@/lib/schedule";
import { FA_WEEKDAY, isoLocal } from "@/lib/jalali";
import { getNotificationPermission, fireReminder } from "@/lib/notifications";

const CHECK_INTERVAL_MS = 120_000; // یک یادآوری چند دقیقه دیرتر مشکلی نداره؛ این فاصله ترافیک پس‌زمینه رو نصف می‌کنه
const EXERCISE_REMINDER_HOUR = 17; // اگه تا این ساعت تمرین امروز ثبت نشده بود، یک‌بار یادآوری کن

// بی‌صداست (چیزی رندر نمی‌کنه) — فقط هر یک دقیقه چک می‌کنه که آیا زمان یکی
// از آیتم‌های برنامه‌ی امروز رسیده یا تمرین امروز هنوز ثبت نشده، و اگه اجازه
// نوتیف گرفته شده باشه، یک یادآوری آروم می‌فرسته (حداکثر یک‌بار در روز به‌ازای هرکدوم).
export function NotificationEngine() {
  const { status } = useSession();

  useEffect(() => {
    let cancelled = false;

    async function checkRoutine() {
      if (getNotificationPermission() !== "granted") return;
      const [removedArr, customArr, daily] = await Promise.all([
        getRemovedOccurrences(),
        getCustomOccurrences(),
        getDaily(isoLocal(new Date())),
      ]);
      if (cancelled) return;

      const tasks = tasksForDate(new Date(), { removedOccurrences: new Set(removedArr), customOccurrences: customArr });
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      for (const t of tasks) {
        const startMinutes = timeStartMinutes(t.time);
        if (startMinutes === null) continue;
        if (daily.tasks[t.id]) continue; // قبلاً انجام‌شده علامت خورده

        // نیم ساعت مونده به شروع — یک‌بار در روز، جدا از یادآوریِ لحظه‌ی شروع
        if (nowMinutes >= startMinutes - 30 && nowMinutes < startMinutes) {
          fireReminder(`routine-soon:${t.id}`, "یادآوری برنامه", `تا ۳۰ دقیقه دیگه وقت «${t.name}» می‌رسه.`);
          continue;
        }
        if (nowMinutes >= startMinutes) {
          fireReminder(`routine:${t.id}`, "یادآوری برنامه", `وقت «${t.name}» رسیده.`);
        }
      }
    }

    async function checkExercise() {
      if (status !== "authenticated") return;
      if (getNotificationPermission() !== "granted") return;
      if (new Date().getHours() < EXERCISE_REMINDER_HOUR) return;
      try {
        const planRes = await fetch("/api/exercise/plan");
        if (!planRes.ok) return;
        const { plan } = await planRes.json();
        if (cancelled || !plan) return;

        const todayName = FA_WEEKDAY[new Date().getDay()];
        const todayPlan = plan.planData.find((d: { day: string; focus: string }) => d.day === todayName);
        if (!todayPlan) return; // امروز روز استراحته

        const logRes = await fetch(`/api/exercise/log?planId=${plan.id}&date=${isoLocal(new Date())}`);
        const logData = logRes.ok ? await logRes.json() : {};
        if (cancelled || logData.completed) return;

        fireReminder("exercise-today", "یادآوری تمرین", `برنامه‌ی ورزشی امروز (${todayPlan.focus}) هنوز ثبت نشده.`);
      } catch {}
    }

    function tick() {
      checkRoutine();
      checkExercise();
    }

    tick();
    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [status]);

  return null;
}
