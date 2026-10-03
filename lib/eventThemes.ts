// کاتالوگ تم‌های مناسبتی (هالووین، یلدا، کریسمس، نوروز، …) برای دو سال آینده.
// هر تم: پالت (در app/event-themes.css زیر html[data-event-theme="<id>"])،
// یک جلوه‌ی تزئینی فقط-CSS، متن تبریک کوتاه و بازه‌های تاریخ هر بار وقوع.
// [قرارداد — داده و CSS با ایجنت A؛ منطق زمان در lib/eventThemeState.ts]

export type EventDecoration =
  | "snow" | "bats" | "leaves" | "lanterns" | "hearts"
  | "fireworks" | "blossoms" | "stars" | "sparks" | "candles";

export type EventOccurrence = {
  /** روز شروع نمایش (YYYY-MM-DD، به وقت تهران، شامل) */
  start: string;
  /** روز پایان نمایش (YYYY-MM-DD، شامل) */
  end: string;
  /** توضیح اختیاری، مثلا «تاریخ تقریبی؛ بسته به رویت هلال» */
  note?: string;
};

export type EventTheme = {
  /** شناسه‌ی پایدار، همون مقدار data-event-theme (فقط حروف کوچک لاتین و خط تیره) */
  id: string;
  /** اسم فارسی مناسبت */
  name: string;
  /** یک خط تبریک کوتاه برای کاربرها */
  greeting: string;
  /** اسم آیکون lucide-react برای پنل ادمین و تبریک */
  icon: string;
  decoration: EventDecoration;
  /** سه رنگ نمونه برای پیش‌نمایش در پنل ادمین: اکسنت، رنگ دوم، ته‌رنگ پس‌زمینه */
  swatch: [string, string, string];
  /** همه‌ی دفعات وقوع از 2026-10-03 تا 2028-10-03، مرتب */
  occurrences: EventOccurrence[];
};

export const EVENT_THEMES: EventTheme[] = [];

export function eventThemeById(id: string | null | undefined): EventTheme | null {
  if (!id) return null;
  return EVENT_THEMES.find((t) => t.id === id) ?? null;
}
