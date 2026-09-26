// ساختِ لیستِ نوتیف‌ها از دیتای محلی (Dexie) — پورتِ منطقِ
// components/NotificationEngine.tsx وب (آفست‌های یادآوری، اهمیت) بدونِ
// وابستگی به Notification API مرورگر؛ این‌جا فقط لیستی از «چه‌چیزی، کِی»
// می‌سازیم، خودِ زمان‌بندی روی native (scheduler.ts) انجام می‌شه.
import { getCustomOccurrences, getDaily, getRemovedOccurrences, getWakeSleepTimes } from "@/db/repo";
import { isoLocal } from "@/lib/jalali";
import { tasksForDate, timeStartMinutes } from "@/lib/schedule";
import { DEFAULT_SLEEP, DEFAULT_WAKE, timeToMinutes } from "@/lib/wakeSleepLogic";

/** پنجره‌ی زمان‌بندیِ occurrence های روتین — محدودِ ۷ روزِ آینده، تا سقفِ
 *  ۵۰۰ نوتیفِ همزمانِ اندروید هیچ‌وقت رد نشه (بازآوری در شروع/resume/تغییرِ
 *  دیتا خودش کافیه، نیازی به بیشتر از این نیست). */
export const SCHEDULE_WINDOW_DAYS = 7;
export const MIN_BEFORE_START = 30;

// ids بین ۱..۹۹۹ رزرو شده برای یادآورهای تکرارشونده‌ی روزانه (wake/sleep/کالری)
// — occurrence های روتین از ۱۰۰۰ به بعد شماره می‌گیرن تا تصادفی برخورد نکنن.
export const RESERVED_ID_WAKE = 1;
export const RESERVED_ID_SLEEP = 2;
export const RESERVED_ID_CALORIE = 3;
const OCCURRENCE_ID_BASE = 1000;

export type PlannedNotification = {
  id: number;
  title: string;
  body: string;
  /** مسیرِ داخلِ اپ که با تپ روی نوتیف باز می‌شه (HashRouter) */
  route: string;
  /** لحظه‌ی دقیق (occurrence های روتین) یا null برای repeating روزانه */
  at: Date | null;
  /** برای repeating روزانه: ساعت/دقیقه */
  daily?: { hour: number; minute: number };
};

/** occurrence های روتین برای N روزِ آینده — هر کدوم یک یادآورِ «۳۰ دقیقه مونده»
 *  و یک یادآورِ «الان» (اگه notify کاربر خاموش نکرده باشه). فقط زمان‌های
 *  هنوز-نگذشته اضافه می‌شن. */
async function buildRoutineOccurrenceNotifications(now: Date): Promise<PlannedNotification[]> {
  const [removedArr, customArr] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
  const opts = { removedOccurrences: new Set(removedArr), customOccurrences: customArr };
  const todayIso = isoLocal(now);
  const todayDaily = await getDaily(todayIso);

  const result: PlannedNotification[] = [];
  let seq = 0;

  for (let dayOffset = 0; dayOffset < SCHEDULE_WINDOW_DAYS; dayOffset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);
    const isToday = dayOffset === 0;

    for (const t of tasksForDate(d, opts)) {
      if (isToday && todayDaily.tasks[t.id]) continue; // امروز قبلا انجام‌شده علامت خورده
      const occ = customArr.find((c) => c.id === t.id);
      if (occ?.notify === false) continue;

      const startMinutes = timeStartMinutes(t.time);
      if (startMinutes === null) continue;

      const startAt = new Date(d);
      startAt.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      const soonAt = new Date(startAt.getTime() - MIN_BEFORE_START * 60_000);

      if (soonAt.getTime() > now.getTime()) {
        result.push({
          id: OCCURRENCE_ID_BASE + seq++,
          title: "یادآوری برنامه",
          body: `تا ۳۰ دقیقه دیگه وقت «${t.name}» می‌رسه.`,
          route: "/routine",
          at: soonAt,
        });
      }
      if (startAt.getTime() > now.getTime()) {
        result.push({
          id: OCCURRENCE_ID_BASE + seq++,
          title: "یادآوری برنامه",
          body: `وقت «${t.name}» رسیده.`,
          route: "/routine",
          at: startAt,
        });
      }
    }
  }
  return result;
}

/** یادآورِ بیدارشدن/خوابیدن — روزانه، تکرارشونده (بدونِ محدودیتِ ۷ روز، چون
 *  فقط ۲ آیتم ثابته و هزینه‌ای برای سقفِ pending نداره). */
async function buildWakeSleepNotifications(): Promise<PlannedNotification[]> {
  const times = (await getWakeSleepTimes()) ?? { wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP };
  const wakeMin = timeToMinutes(times.wake);
  const sleepMin = timeToMinutes(times.sleep);
  return [
    {
      id: RESERVED_ID_WAKE,
      title: "یادآوریِ بیداری",
      body: "وقتِ بیدارشدنه — بیداریِ امروز رو ثبت کن.",
      route: "/",
      at: null,
      daily: { hour: Math.floor(wakeMin / 60), minute: wakeMin % 60 },
    },
    {
      id: RESERVED_ID_SLEEP,
      title: "یادآوریِ خواب",
      body: "نزدیکِ وقتِ خوابه — برای فردا آماده شو.",
      route: "/",
      at: null,
      daily: { hour: Math.floor(sleepMin / 60), minute: sleepMin % 60 },
    },
  ];
}

const CALORIE_REMINDER_HOUR = 20; // ۲۰:۰۰ — اگه تا این ساعت وعده‌ای ثبت نشده باشه یادآوری کن

function buildCalorieReminder(): PlannedNotification {
  return {
    id: RESERVED_ID_CALORIE,
    title: "یادآوریِ کالری",
    body: "وعده‌های غذاییِ امروز رو ثبت کردی؟",
    route: "/exercise",
    at: null,
    daily: { hour: CALORIE_REMINDER_HOUR, minute: 0 },
  };
}

export async function buildAllNotifications(opts: { calorieReminderEnabled: boolean }): Promise<PlannedNotification[]> {
  const now = new Date();
  const [occurrences, wakeSleep] = await Promise.all([buildRoutineOccurrenceNotifications(now), buildWakeSleepNotifications()]);
  const list = [...occurrences, ...wakeSleep];
  if (opts.calorieReminderEnabled) list.push(buildCalorieReminder());
  return list;
}
