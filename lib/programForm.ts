// منطق خالص فرم «افزودن برنامه» (components/AddProgramForm.tsx +
// components/ProgramTimeRows.tsx). [قرارداد — پیاده‌سازی و تست با ایجنت C]

export type ProgramKind = "weekly" | "once" | "period";

/** یک ردیف ساعت: چند روز هفته با یک بازه‌ی ساعت مشترک (start/end به شکل HH:mm) */
export type TimeRow = { id: string; jsDays: number[]; start: string; end: string };

export type DayPresetKey = "all" | "work" | "weekend";
/** میان‌برهای روز: هر روز / روزهای کاری (شنبه تا چهارشنبه) / آخر هفته (پنجشنبه و جمعه) */
export const DAY_PRESETS: { key: DayPresetKey; label: string; jsDays: number[] }[] = [];

export type ProgramTemplate = {
  name: string;
  tag: string;
  /** مدت پیشنهادی به دقیقه */
  minutes: number;
  /** اسم آیکون lucide-react (مثلا "Dumbbell") */
  icon: string;
};
/** پیشنهادهای سریع اسم برنامه */
export const PROGRAM_TEMPLATES: ProgramTemplate[] = [];

export function newTimeRow(jsDays: number[] = []): TimeRow {
  return { id: "row-" + Math.random().toString(36).slice(2, 9), jsDays, start: "", end: "" };
}

/** مدت ردیف به دقیقه؛ null اگه یکی از ساعت‌ها نامعتبر باشه یا پایان <= شروع */
export function rowDurationMin(_row: Pick<TimeRow, "start" | "end">): number | null {
  return null;
}

/** «1 ساعت و 30 دقیقه» */
export function durationText(_min: number): string {
  return "";
}

/** HH:mm + دقیقه → HH:mm (دور 24 ساعت می‌چرخه) */
export function addMinutesToTime(_hhmm: string, _min: number): string {
  return "";
}

/** کدوم میان‌بر دقیقا با این روزها برابره (برای روشن‌نشون‌دادنش)؛ وگرنه null */
export function matchDayPreset(_jsDays: number[]): DayPresetKey | null {
  return null;
}

/**
 * خلاصه‌ی یک‌خطی برنامه برای پایین فرم، مثلا:
 * هفتگی: «هر شنبه و دوشنبه، 18:00 تا 19:30» (چند ردیف با « · »)؛
 * یک روز: «فقط 12 مهر، 18:00 تا 19:30»؛ دوره: «… · از 1 مهر تا 30 مهر».
 * ردیف‌های ناقص نادیده گرفته می‌شن؛ اگه چیزی کامل نیست رشته‌ی خالی.
 */
export function describeSchedule(
  _kind: ProgramKind,
  _rows: TimeRow[],
  _opts: { onceIso?: string | null; periodFromIso?: string | null; periodToIso?: string | null } = {}
): string {
  return "";
}
