// منطق خالص فرم «افزودن برنامه» (components/AddProgramForm.tsx +
// components/ProgramTimeRows.tsx). [قرارداد — پیاده‌سازی و تست با ایجنت C]

import { toEnDigits } from "./schedule";
import { toJalali, J_MONTHS } from "./jalali";
import { WEEK_ORDER } from "./schedule";

export type ProgramKind = "weekly" | "once" | "period";

/** یک ردیف ساعت: چند روز هفته با یک بازه‌ی ساعت مشترک (start/end به شکل HH:mm) */
export type TimeRow = { id: string; jsDays: number[]; start: string; end: string };

export type DayPresetKey = "all" | "work" | "weekend";
/** میان‌برهای روز: هر روز / روزهای کاری (شنبه تا چهارشنبه) / آخر هفته (پنجشنبه و جمعه) */
export const DAY_PRESETS: { key: DayPresetKey; label: string; jsDays: number[] }[] = [
  { key: "all", label: "هر روز", jsDays: [6, 0, 1, 2, 3, 4, 5] },
  { key: "work", label: "روزهای کاری", jsDays: [6, 0, 1, 2, 3] },
  { key: "weekend", label: "آخر هفته", jsDays: [4, 5] },
];

export function newTimeRow(jsDays: number[] = []): TimeRow {
  return { id: "row-" + Math.random().toString(36).slice(2, 9), jsDays, start: "", end: "" };
}

/** تبدیل رشته زمان "H:mm" یا "HH:mm" به دقیقه‌ی روز (0..1439)؛ null اگه نامعتبر */
function parseTimeToMinutes(time: string): number | null {
  const en = toEnDigits(time);
  const m = /^(\d{1,2}):(\d{2})$/.exec(en);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h >= 24 || min < 0 || min >= 60) return null;
  return h * 60 + min;
}

/** مدت ردیف به دقیقه؛ null اگه یکی از ساعت‌ها نامعتبر باشه یا پایان <= شروع */
export function rowDurationMin(row: Pick<TimeRow, "start" | "end">): number | null {
  const startMin = parseTimeToMinutes(row.start);
  const endMin = parseTimeToMinutes(row.end);
  if (startMin === null || endMin === null) return null;
  const dur = endMin - startMin;
  if (dur <= 0) return null;
  return dur;
}

/** «1 ساعت و 30 دقیقه» */
export function durationText(min: number): string {
  if (min < 60) {
    return `${min} دقیقه`;
  }
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) {
    return `${h} ساعت`;
  }
  return `${h} ساعت و ${m} دقیقه`;
}

/** HH:mm + دقیقه → HH:mm (دور 24 ساعت می‌چرخه) */
export function addMinutesToTime(hhmm: string, min: number): string {
  const startMin = parseTimeToMinutes(hhmm);
  if (startMin === null) return "";
  let totalMin = startMin + min;
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** کدوم میان‌بر دقیقا با این روزها برابره (برای روشن‌نشون‌دادنش)؛ وگرنه null */
export function matchDayPreset(jsDays: number[]): DayPresetKey | null {
  const sorted = [...jsDays].sort((a, b) => a - b);
  for (const preset of DAY_PRESETS) {
    const presetSorted = [...preset.jsDays].sort((a, b) => a - b);
    if (
      sorted.length === presetSorted.length &&
      sorted.every((v, i) => v === presetSorted[i])
    ) {
      return preset.key;
    }
  }
  return null;
}

/**
 * خلاصه‌ی یک‌خطی برنامه برای پایین فرم، مثلا:
 * هفتگی: «هر شنبه و دوشنبه، 18:00 تا 19:30» (چند ردیف با « · »)؛
 * یک روز: «فقط 12 مهر، 18:00 تا 19:30»؛ دوره: «… · از 1 مهر تا 30 مهر».
 * ردیف‌های ناقص نادیده گرفته می‌شن؛ اگه چیزی کامل نیست رشته‌ی خالی.
 */
export function describeSchedule(
  kind: ProgramKind,
  rows: TimeRow[],
  opts: { onceIso?: string | null; periodFromIso?: string | null; periodToIso?: string | null } = {}
): string {
  // فقط ردیف‌های کاملی که start/end معتبر دارن و برای اقسام غیر "once" روزها معین باشن
  const validRows = rows.filter((row) => {
    const startMin = parseTimeToMinutes(row.start);
    const endMin = parseTimeToMinutes(row.end);
    if (startMin === null || endMin === null) return false;
    if (endMin <= startMin) return false;
    if (kind !== "once" && row.jsDays.length === 0) return false;
    return true;
  });

  if (validRows.length === 0) return "";

  if (kind === "once") {
    // فقط اولین ردیف معتبر + تاریخ
    if (!opts.onceIso) return "";
    const firstRow = validRows[0];
    const start = normalizeTimeToHHmm(firstRow.start);
    const end = normalizeTimeToHHmm(firstRow.end);
    if (!start || !end) return "";

    // تبدیل ISO به جلالی
    const isoDate = opts.onceIso; // فرمت "YYYY-MM-DD"
    const [year, month, day] = isoDate.split("-").map((x) => parseInt(x, 10));
    const [jy, jm, jd] = toJalali(year, month, day);

    return `فقط ${jd} ${J_MONTHS[jm - 1]}، ${start} تا ${end}`;
  }

  if (kind === "period") {
    // ردیف‌های هفتگی + تاریخ‌های دوره
    const descriptions = validRows.map((row) => {
      const daysText = formatDaysText(row.jsDays);
      const start = normalizeTimeToHHmm(row.start);
      const end = normalizeTimeToHHmm(row.end);
      return `${daysText}، ${start} تا ${end}`;
    });

    let result = descriptions.join(" · ");

    if (opts.periodFromIso && opts.periodToIso) {
      const [fyear, fmonth, fday] = opts.periodFromIso.split("-").map((x) => parseInt(x, 10));
      const [tyear, tmonth, tday] = opts.periodToIso.split("-").map((x) => parseInt(x, 10));
      const [fjy, fjm, fjd] = toJalali(fyear, fmonth, fday);
      const [tjy, tjm, tjd] = toJalali(tyear, tmonth, tday);
      result += ` · از ${fjd} ${J_MONTHS[fjm - 1]} تا ${tjd} ${J_MONTHS[tjm - 1]}`;
    }

    return result;
  }

  // kind === "weekly"
  const descriptions = validRows.map((row) => {
    const daysText = formatDaysText(row.jsDays);
    const start = normalizeTimeToHHmm(row.start);
    const end = normalizeTimeToHHmm(row.end);
    return `${daysText}، ${start} تا ${end}`;
  });

  return descriptions.join(" · ");
}

/** تبدیل ساعت به "HH:mm" لاتین؛ null اگه نامعتبر */
function normalizeTimeToHHmm(time: string): string | null {
  const min = parseTimeToMinutes(time);
  if (min === null) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** توصیف روزهای هفته (ترتیب شنبه اول، بدون اعراب) */
function formatDaysText(jsDays: number[]): string {
  const preset = matchDayPreset(jsDays);
  if (preset === "all") return "هر روز";
  if (preset === "work") return "روزهای کاری";
  if (preset === "weekend") return "آخر هفته";

  // روزهای دلخواه: ترتیب شنبه اول
  const daysByOrder = WEEK_ORDER.filter((w) => jsDays.includes(w.jsDay));
  const dayNames = daysByOrder.map((w) => w.name);

  if (dayNames.length === 1) {
    return `هر ${dayNames[0]}`;
  }

  // جوین با " و " برای آخری و " ، " برای بقیه
  const first = dayNames.slice(0, -1).join("، ");
  return `هر ${first} و ${dayNames[dayNames.length - 1]}`;
}
