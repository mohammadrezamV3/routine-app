// کاتالوگ تم‌های مناسبتی (هالووین، یلدا، کریسمس، نوروز، …) برای دو سال آینده.
// هر تم: پالت (در app/event-themes.css زیر html[data-event-theme="<id>"])،
// یک جلوه‌ی تزئینی فقط-CSS، متن تبریک کوتاه و بازه‌های تاریخ هر بار وقوع.
// [قرارداد — داده و CSS با ایجنت A؛ منطق زمان در lib/eventThemeState.ts]

import { tr, isEn } from "@/lib/i18n";

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

export const EVENT_THEMES: EventTheme[] = [
  {
    id: "mehregan",
    name: "جشن مهرگان",
    greeting: "مهرگان فرخنده؛ پاییزتون پر از رنگ و مهربونی",
    icon: "Leaf",
    decoration: "leaves",
    swatch: ["#F29A2E", "#E8B84A", "#1A130B"],
    occurrences: [
      { start: "2027-09-29", end: "2027-10-03" },
      { start: "2028-09-28", end: "2028-10-02" },
    ],
  },
  {
    id: "halloween",
    name: "هالووین",
    greeting: "هالووین مبارک؛ یه شب پر از شیرینی و هیجان",
    icon: "Ghost",
    decoration: "bats",
    swatch: ["#FF7A1A", "#A66BFF", "#140E1C"],
    occurrences: [
      { start: "2026-10-25", end: "2026-11-01" },
      { start: "2027-10-25", end: "2027-11-01" },
    ],
  },
  {
    id: "yalda",
    name: "شب یلدا",
    greeting: "شب یلداتون پر از گرمی، انار و فال حافظ",
    icon: "Flame",
    decoration: "candles",
    swatch: ["#E0364F", "#FFB347", "#1A0C10"],
    occurrences: [
      { start: "2026-12-18", end: "2026-12-22" },
      { start: "2027-12-18", end: "2027-12-22" },
    ],
  },
  {
    id: "christmas",
    name: "کریسمس و سال نو میلادی",
    greeting: "کریسمس و سال نو میلادی مبارک",
    icon: "TreePine",
    decoration: "snow",
    swatch: ["#2FBF71", "#E8505B", "#0C1612"],
    occurrences: [
      { start: "2026-12-23", end: "2027-01-02" },
      { start: "2027-12-23", end: "2028-01-02" },
    ],
  },
  {
    id: "valentine",
    name: "ولنتاین",
    greeting: "ولنتاین پر از مهربونی و دوست داشتن",
    icon: "Heart",
    decoration: "hearts",
    swatch: ["#FF5C97", "#E8344E", "#1A0D13"],
    occurrences: [
      { start: "2027-02-10", end: "2027-02-15" },
      { start: "2028-02-10", end: "2028-02-15" },
    ],
  },
  {
    id: "sepandarmazgan",
    name: "سپندارمذگان",
    greeting: "سپندارمذگان، روز عشق و مهر به زمین و زنان، مبارک",
    icon: "Flower2",
    decoration: "blossoms",
    swatch: ["#F59BBB", "#E8C170", "#1A1014"],
    occurrences: [
      { start: "2027-02-16", end: "2027-02-19" },
      { start: "2028-02-16", end: "2028-02-19" },
    ],
  },
  {
    id: "eid-fitr",
    name: "عید فطر",
    greeting: "عید سعید فطر مبارک",
    icon: "MoonStar",
    decoration: "lanterns",
    swatch: ["#E6B93D", "#2EC4B6", "#0D1514"],
    occurrences: [
      { start: "2027-03-09", end: "2027-03-12", note: "تاریخ تقریبی؛ بسته به رویت هلال" },
      { start: "2028-02-26", end: "2028-02-29", note: "تاریخ تقریبی؛ بسته به رویت هلال" },
    ],
  },
  {
    id: "chaharshanbe-suri",
    name: "چهارشنبه‌سوری",
    greeting: "چهارشنبه‌سوری شاد؛ زردی من از تو، سرخی تو از من",
    icon: "Flame",
    decoration: "sparks",
    swatch: ["#FF6A1F", "#F03A2E", "#180D0A"],
    occurrences: [
      { start: "2027-03-14", end: "2027-03-17" },
      { start: "2028-03-12", end: "2028-03-15" },
    ],
  },
  {
    id: "nowruz",
    name: "نوروز",
    greeting: "نوروزتون پیروز؛ سال نو پر از شادی و سلامتی",
    icon: "Sprout",
    decoration: "blossoms",
    swatch: ["#5FD07A", "#F2C94C", "#0C1610"],
    occurrences: [
      { start: "2027-03-18", end: "2027-04-01" },
      { start: "2028-03-16", end: "2028-03-31" },
    ],
  },
  {
    id: "sizdah",
    name: "سیزده‌بدر",
    greeting: "سیزده‌بدر خوش بگذره؛ طبیعت و دوستان یادتون نره",
    icon: "TreePine",
    decoration: "leaves",
    swatch: ["#7ED957", "#4DB8FF", "#0D1612"],
    occurrences: [
      { start: "2027-04-02", end: "2027-04-02" },
      { start: "2028-04-01", end: "2028-04-01" },
    ],
  },
];

export function eventThemeById(id: string | null | undefined): EventTheme | null {
  if (!id) return null;
  return EVENT_THEMES.find((t) => t.id === id) ?? null;
}

// متن انگلیسی مناسبت‌ها (کلید = id). داده‌ی فارسی بالا دست‌نخورده می‌مونه و متن
// قابل‌نمایش با eventThemeName / eventThemeGreeting / eventOccurrenceNote به زبان جاری میاد.
const EVENT_TEXT_EN: Record<string, { name: string; greeting: string }> = {
  mehregan: { name: "Mehregan festival", greeting: "Happy Mehregan; may your autumn be full of color and kindness" },
  halloween: { name: "Halloween", greeting: "Happy Halloween; a night full of treats and thrills" },
  yalda: { name: "Yalda night", greeting: "Happy Yalda; a night of warmth, pomegranates and poetry" },
  christmas: { name: "Christmas and New Year", greeting: "Merry Christmas and Happy New Year" },
  valentine: { name: "Valentine's Day", greeting: "Happy Valentine's Day; a day full of love and kindness" },
  sepandarmazgan: { name: "Sepandarmazgan", greeting: "Happy Sepandarmazgan, the Persian day of love and of honoring the earth and women" },
  "eid-fitr": { name: "Eid al-Fitr", greeting: "Eid Mubarak" },
  "chaharshanbe-suri": { name: "Chaharshanbe Suri", greeting: "Happy Chaharshanbe Suri; take my yellow, give me your red" },
  nowruz: { name: "Nowruz", greeting: "Happy Nowruz; a new year full of joy and health" },
  sizdah: { name: "Sizdah Bedar", greeting: "Enjoy Sizdah Bedar; do not forget nature and friends" },
};

export function eventThemeName(t: EventTheme): string {
  return isEn() ? (EVENT_TEXT_EN[t.id]?.name ?? t.name) : t.name;
}

export function eventThemeGreeting(t: EventTheme): string {
  return isEn() ? (EVENT_TEXT_EN[t.id]?.greeting ?? t.greeting) : t.greeting;
}

export function eventOccurrenceNote(note: string | undefined): string | undefined {
  if (!note) return note;
  return tr(note, "Approximate date; depends on moon sighting");
}
