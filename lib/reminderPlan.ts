// برنامه‌ریزیِ یادآوری‌ها — منطقِ خالص و مشترک بینِ زمان‌بندِ سرور
// (lib/pushReminders.ts → Web Push، حتی وقتی مرورگر بسته‌ست) و نسخه‌ی
// پشتیبانِ تب‌باز (components/NotificationEngine.tsx). هیچ وابستگی‌ای به
// prisma/next-auth/react نداره تا هر دو طرف دقیقا با یک قانون حساب کنن.
//
// قانونِ ثابت (درخواستِ صریحِ کاربر): هیچ یادآوری‌ای بعد از لحظه‌ی شروعِ
// برنامه/نوبت فرستاده یا نشون داده نمی‌شه. هر یادآوری یک `deadline` (همون
// لحظه‌ی شروع، به epoch ms) داره: ارسال فقط در بازه‌ی [from, until) و
// until <= deadline؛ TTLِ پوش هم تا deadline تنظیم می‌شه و سرویس‌ورکر پوشِ
// کهنه‌تر از deadline رو نشون نمی‌ده. اگه به هر دلیلی تا شروع نرسید، دیگه
// اصلا نمی‌رسه.
//
// زمان‌ها همه به وقتِ محلیِ *کاربر* (timezone) حساب می‌شن، نه TZِ پروسه‌ی
// سرور — قبلا سرور با getHours() (یعنی UTC روی داکر) حساب می‌کرد و یادآوری
// ۳:۳۰ ساعت جابه‌جا (یا اصلا) می‌رسید.

import { tasksForDate, timeStartMinutes, toEnDigits } from "./schedule";
import { addDaysIso, localIso, localMinuteOfDay, safeTimezone } from "./weeklyAnalysis/week";
import { Medication, doseMinutesOfDay, isMedicationActiveOn, minutesToDoseTime } from "./medicationSchedule";

/** یادآوریِ «به‌زودی» چند دقیقه قبل از شروعِ برنامه باز می‌شه */
export const ROUTINE_SOON_MIN = 30;
/** یادآوریِ «همین الان شروع می‌شه» — آخرین دقیقه‌ی قبل از شروع */
export const ROUTINE_START_LEAD_MS = 60_000;
/** یادآوریِ دارو این‌قدر قبل از ساعتِ نوبت */
export const MED_LEAD_MIN = 5;
/** اگه تا این ساعت (محلی) تمرینِ امروز ثبت نشده بود، یک‌بار یادآوری */
export const EXERCISE_REMINDER_HOUR = 17;

export type ReminderKind = "routine" | "med" | "exercise";

export type PlannedReminder = {
  /** کلیدِ یکتا و پایدار — هم کلیدِ ضدتکرارِ سرور، هم tagِ نوتیف، هم کلیدِ localStorageِ کلاینت */
  key: string;
  kind: ReminderKind;
  /** تاریخِ محلیِ برنامه (YYYY-MM-DD) */
  dateIso: string;
  itemId?: string;
  from: number;
  until: number;
  deadline: number;
  title: string;
  body: string;
  url: string;
};

export type OccurrenceLike = { id: string; name: string; jsDay: number; time: string; startDate?: string; endDate?: string; notify?: boolean };

export function isDue(r: PlannedReminder, nowMs: number): boolean {
  return nowMs >= r.from && nowMs < r.until && nowMs < r.deadline;
}

const offsetFmtCache = new Map<string, Intl.DateTimeFormat>();
function offsetFormatter(tz: string): Intl.DateTimeFormat {
  let f = offsetFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    offsetFmtCache.set(tz, f);
  }
  return f;
}

/** اختلافِ ساعتِ محلیِ tz با UTC در لحظه‌ی utcMs (ms) */
function tzOffsetMs(tz: string, utcMs: number): number {
  const parts = offsetFormatter(tz).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** «تاریخِ iso، دقیقه‌ی minutes از نیمه‌شب، به وقتِ tz» → epoch ms (با DSTِ درست) */
export function zonedToUtcMs(iso: string, minutes: number, tz: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d) + minutes * 60_000;
  const off1 = tzOffsetMs(tz, wall);
  let t = wall - off1;
  const off2 = tzOffsetMs(tz, t);
  if (off2 !== off1) t = wall - off2;
  return t;
}

/** امروز و فردا به وقتِ محلی — فردا لازمه چون یادآوریِ برنامه‌ی ۰۰:۱۰ از ۲۳:۴۰ِ امشب باز می‌شه */
export function localDays(tz: string, now: Date): { tz: string; today: string; tomorrow: string; minuteOfDay: number } {
  const zone = safeTimezone(tz);
  const today = localIso(zone, now);
  return { tz: zone, today, tomorrow: addDaysIso(today, 1), minuteOfDay: localMinuteOfDay(zone, now) };
}

/** Date ای که getDay/isoLocalِ پروسه‌ی فعلی برای همون iso درست جواب بدن (ورودیِ tasksForDate) */
function processLocalDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function minutesLeftText(deadline: number, nowMs: number): string {
  const n = Math.max(1, Math.ceil((deadline - nowMs) / 60_000));
  return toEnDigits(String(n));
}

/**
 * یادآوری‌های برنامه‌ی روتینِ امروز و فردا. برای هر برنامه‌ی ساعت‌دار دو
 * یادآوری: «به‌زودی» ([شروع−۳۰، شروع−۱دقیقه)) و «همین الان» ([شروع−۱دقیقه، شروع)).
 * برنامه‌ای که یادآوریش خاموشه (notify=false) یا حذف شده حذف می‌شه؛ انجام‌شدن
 * رو صدازننده چک می‌کنه (سرور از دیتابیس، کلاینت از storage).
 */
export function planRoutineReminders(opts: {
  tz: string;
  now: Date;
  customOccurrences: OccurrenceLike[];
  removedOccurrences: Set<string>;
}): PlannedReminder[] {
  const { tz, today, tomorrow } = localDays(opts.tz, opts.now);
  const nowMs = opts.now.getTime();
  const byId = new Map(opts.customOccurrences.map((c) => [c.id, c]));
  const out: PlannedReminder[] = [];
  for (const iso of [today, tomorrow]) {
    const tasks = tasksForDate(processLocalDate(iso), {
      removedOccurrences: opts.removedOccurrences,
      customOccurrences: opts.customOccurrences,
    });
    for (const t of tasks) {
      if (byId.get(t.id)?.notify === false) continue;
      const startMin = timeStartMinutes(t.time);
      if (startMin === null) continue;
      const start = zonedToUtcMs(iso, startMin, tz);
      if (start <= nowMs) continue;
      const soonFrom = start - ROUTINE_SOON_MIN * 60_000;
      const startFrom = start - ROUTINE_START_LEAD_MS;
      out.push({
        key: `soon:${t.id}:${iso}`, kind: "routine", dateIso: iso, itemId: t.id,
        from: soonFrom, until: startFrom, deadline: start,
        title: "یادآوری برنامه",
        body: `تا ${minutesLeftText(start, nowMs)} دقیقه دیگه وقت «${t.name}» می‌رسه.`,
        url: "/weekly",
      });
      out.push({
        key: `start:${t.id}:${iso}`, kind: "routine", dateIso: iso, itemId: t.id,
        from: startFrom, until: start, deadline: start,
        title: "یادآوری برنامه",
        body: `«${t.name}» همین الان شروع می‌شه.`,
        url: "/weekly",
      });
    }
  }
  return out;
}

/** نوبت‌های داروی امروز و فردا — هرکدوم MED_LEAD_MIN دقیقه قبل از ساعتش، و نه بعدش */
export function planMedicationReminders(opts: { tz: string; now: Date; meds: Medication[] }): PlannedReminder[] {
  const { tz, today, tomorrow } = localDays(opts.tz, opts.now);
  const nowMs = opts.now.getTime();
  const out: PlannedReminder[] = [];
  for (const med of opts.meds) {
    if (!med || typeof med !== "object" || med.notify === false) continue;
    if (typeof med.id !== "string" || typeof med.name !== "string" || typeof med.startDate !== "string") continue;
    for (const iso of [today, tomorrow]) {
      if (!isMedicationActiveOn(med, iso)) continue;
      for (const doseMin of doseMinutesOfDay(med)) {
        const dose = zonedToUtcMs(iso, doseMin, tz);
        if (dose <= nowMs) continue;
        out.push({
          key: `med:${med.id}:${iso}:${doseMin}`, kind: "med", dateIso: iso, itemId: med.id,
          from: dose - MED_LEAD_MIN * 60_000, until: dose, deadline: dose,
          title: "یادآوری دارو",
          body: `نوبتِ «${med.name}» ساعت ${toEnDigits(minutesToDoseTime(doseMin))} — ${minutesLeftText(dose, nowMs)} دقیقه‌ی دیگه.${med.note ? " " + med.note : ""}`,
          url: "/",
        });
      }
    }
  }
  return out;
}

/** بازه‌ی یادآوریِ تمرینِ امروز: از ساعتِ EXERCISE_REMINDER_HOUR تا پایانِ روزِ محلی */
export function planExerciseReminder(opts: { tz: string; now: Date }): PlannedReminder {
  const { tz, today, tomorrow } = localDays(opts.tz, opts.now);
  const end = zonedToUtcMs(tomorrow, 0, tz);
  return {
    key: `exercise:${today}`, kind: "exercise", dateIso: today,
    from: zonedToUtcMs(today, EXERCISE_REMINDER_HOUR * 60, tz), until: end, deadline: end,
    title: "یادآوری تمرین",
    body: "برنامه‌ی ورزشی امروز هنوز ثبت نشده.",
    url: "/exercise",
  };
}
