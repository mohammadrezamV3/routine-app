// جلسه‌های معاملاتی فارکس — منبع واحد حقیقت، هم برای «ساعت فارکس» و هم
// برای برچسب جلسه‌ی هر معامله در ژورنال.
//
// چرا با Intl و تایم‌زون IANA و نه عدد ثابت UTC: ساعت باز لندن در تابستان
// ۰۷:۰۰ UTC است و در زمستان ۰۸:۰۰ — چون خود لندن ساعت تابستانی دارد، و
// نیویورک/سیدنی هم هرکدام تاریخ تغییر ساعت متفاوتی دارند (سیدنی نیم‌کره‌ی
// جنوبی است و برعکس بقیه جابه‌جا می‌شود). هر عدد UTC هاردکدشده سالی چند
// هفته غلط می‌شود. با تبدیل به ساعت محلی خود آن شهر، DST خودکار درست است.

export type SessionKey = "SYDNEY" | "TOKYO" | "LONDON" | "NEWYORK";

type SessionDef = {
  key: SessionKey;
  label: string;
  tz: string;
  /** ساعت باز/بسته به دقیقه، در وقت محلی همان شهر */
  openMin: number;
  closeMin: number;
  flag: string;
};

export const FOREX_SESSIONS: SessionDef[] = [
  { key: "SYDNEY",  label: "سیدنی",   tz: "Australia/Sydney",  openMin: 7 * 60, closeMin: 16 * 60,      flag: "🇦🇺" },
  { key: "TOKYO",   label: "توکیو",   tz: "Asia/Tokyo",        openMin: 9 * 60, closeMin: 18 * 60,      flag: "🇯🇵" },
  { key: "LONDON",  label: "لندن",    tz: "Europe/London",     openMin: 8 * 60, closeMin: 16 * 60 + 30, flag: "🇬🇧" },
  { key: "NEWYORK", label: "نیویورک", tz: "America/New_York",  openMin: 8 * 60, closeMin: 17 * 60,      flag: "🇺🇸" },
];

export const SESSION_LABELS: Record<SessionKey, string> = {
  SYDNEY: "سیدنی",
  TOKYO: "توکیو",
  LONDON: "لندن",
  NEWYORK: "نیویورک",
};

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** ساعت دیوار یک لحظه در یک تایم‌زون: [روز هفته ۰=یکشنبه، دقیقه از نیم‌شب] */
export function wallClockIn(date: Date, tz: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // بدون این، بعضی محیط‌ها نیم‌شب را «۲۴» می‌دهند
  }).formatToParts(date);

  let weekday = 0;
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "weekday") weekday = WEEKDAY_INDEX[p.value] ?? 0;
    else if (p.type === "hour") hour = Number(p.value) % 24;
    else if (p.type === "minute") minute = Number(p.value);
  }
  return { weekday, minutes: hour * 60 + minute };
}

/**
 * خود بازار فارکس (نه یک جلسه‌ی خاص) در این لحظه باز است؟
 * بازار یکشنبه ۱۷:۰۰ به وقت نیویورک باز و جمعه ۱۷:۰۰ به وقت نیویورک بسته
 * می‌شود — همین یک تعریف، چون خود نیویورک DST دارد، تمام سال درست می‌ماند.
 */
export function isForexOpen(date: Date = new Date()): boolean {
  const { weekday, minutes } = wallClockIn(date, "America/New_York");
  if (weekday === 6) return false;                 // شنبه
  if (weekday === 0) return minutes >= 17 * 60;    // یکشنبه، بعد از ۱۷:۰۰
  if (weekday === 5) return minutes < 17 * 60;     // جمعه، قبل از ۱۷:۰۰
  return true;
}

/** این جلسه در این لحظه باز است؟ (آخر هفته‌ی بازار هم لحاظ می‌شود) */
export function isSessionOpen(key: SessionKey, date: Date = new Date()): boolean {
  const def = FOREX_SESSIONS.find((s) => s.key === key);
  if (!def || !isForexOpen(date)) return false;
  const { weekday, minutes } = wallClockIn(date, def.tz);
  if (weekday === 0 || weekday === 6) return false; // آخر هفته‌ی خود آن شهر
  return minutes >= def.openMin && minutes < def.closeMin;
}

/**
 * همه‌ی جلسه‌هایی که در لحظه‌ی داده‌شده بازند.
 * خروجی عمدا آرایه است نه تک‌مقدار: بازه‌ها واقعا همپوشان‌اند (بعدازظهر
 * لندن با صبح نیویورک) و آمار «عملکردم در لندن» باید معامله‌ی همپوشان را
 * هم بشمارد، نه اینکه یکی از دو جلسه را دلبخواهی بیندازد دور.
 */
export function sessionsAt(date: Date): SessionKey[] {
  return FOREX_SESSIONS.filter((s) => isSessionOpen(s.key, date)).map((s) => s.key);
}

/** جفت‌های همپوشان پرنقدینگی که ارزش نمایش دارند */
export const SESSION_OVERLAPS: { a: SessionKey; b: SessionKey; label: string }[] = [
  { a: "LONDON", b: "NEWYORK", label: "لندن × نیویورک" },
  { a: "SYDNEY", b: "TOKYO", label: "سیدنی × توکیو" },
];

/** ساعت فعلی یک شهر به شکل HH:MM (ارقام لاتین — نمایش‌دهنده خودش فارسی می‌کند) */
export function cityTime(date: Date, tz: string): string {
  const { minutes } = wallClockIn(date, tz);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
