// جلسه‌های معاملاتیِ فارکس — منبعِ واحدِ حقیقت، هم برای «ساعت فارکس» و هم
// برای برچسبِ جلسه‌ی هر معامله در ژورنال.
//
// چرا با Intl و تایم‌زونِ IANA و نه عددِ ثابتِ UTC: ساعتِ بازِ لندن در تابستان
// ۰۷:۰۰ UTC است و در زمستان ۰۸:۰۰ — چون خودِ لندن ساعتِ تابستانی دارد، و
// نیویورک/سیدنی هم هرکدام تاریخِ تغییرِ ساعتِ متفاوتی دارند (سیدنی نیم‌کره‌ی
// جنوبی است و برعکسِ بقیه جابه‌جا می‌شود). هر عددِ UTCِ هاردکدشده سالی چند
// هفته غلط می‌شود. با تبدیل به ساعتِ محلیِ خودِ آن شهر، DST خودکار درست است.

export type SessionKey = "SYDNEY" | "TOKYO" | "LONDON" | "NEWYORK";

type SessionDef = {
  key: SessionKey;
  label: string;
  tz: string;
  /** ساعتِ باز/بسته به دقیقه، در وقتِ محلیِ همان شهر */
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

/** ساعتِ دیوارِ یک لحظه در یک تایم‌زون: [روزِ هفته ۰=یکشنبه، دقیقه از نیم‌شب] */
export function wallClockIn(date: Date, tz: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // بدونِ این، بعضی محیط‌ها نیم‌شب را «۲۴» می‌دهند
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
 * خودِ بازارِ فارکس (نه یک جلسه‌ی خاص) در این لحظه باز است؟
 * بازار یکشنبه ۱۷:۰۰ به وقتِ نیویورک باز و جمعه ۱۷:۰۰ به وقتِ نیویورک بسته
 * می‌شود — همین یک تعریف، چون خودِ نیویورک DST دارد، تمامِ سال درست می‌ماند.
 */
export function isForexOpen(date: Date = new Date()): boolean {
  const { weekday, minutes } = wallClockIn(date, "America/New_York");
  if (weekday === 6) return false;                 // شنبه
  if (weekday === 0) return minutes >= 17 * 60;    // یکشنبه، بعد از ۱۷:۰۰
  if (weekday === 5) return minutes < 17 * 60;     // جمعه، قبل از ۱۷:۰۰
  return true;
}

/** این جلسه در این لحظه باز است؟ (آخرِ هفته‌ی بازار هم لحاظ می‌شود) */
export function isSessionOpen(key: SessionKey, date: Date = new Date()): boolean {
  const def = FOREX_SESSIONS.find((s) => s.key === key);
  if (!def || !isForexOpen(date)) return false;
  const { weekday, minutes } = wallClockIn(date, def.tz);
  if (weekday === 0 || weekday === 6) return false; // آخرِ هفته‌ی خودِ آن شهر
  return minutes >= def.openMin && minutes < def.closeMin;
}

/**
 * همه‌ی جلسه‌هایی که در لحظه‌ی داده‌شده بازند.
 * خروجی عمداً آرایه است نه تک‌مقدار: بازه‌ها واقعاً همپوشان‌اند (بعدازظهرِ
 * لندن با صبحِ نیویورک) و آمارِ «عملکردم در لندن» باید معامله‌ی همپوشان را
 * هم بشمارد، نه اینکه یکی از دو جلسه را دلبخواهی بیندازد دور.
 */
export function sessionsAt(date: Date): SessionKey[] {
  return FOREX_SESSIONS.filter((s) => isSessionOpen(s.key, date)).map((s) => s.key);
}

/** جفت‌های همپوشانِ پرنقدینگی که ارزشِ نمایش دارند */
export const SESSION_OVERLAPS: { a: SessionKey; b: SessionKey; label: string }[] = [
  { a: "LONDON", b: "NEWYORK", label: "لندن × نیویورک" },
  { a: "SYDNEY", b: "TOKYO", label: "سیدنی × توکیو" },
];

/** ساعتِ فعلیِ یک شهر به شکل HH:MM (ارقامِ لاتین — نمایش‌دهنده خودش فارسی می‌کند) */
export function cityTime(date: Date, tz: string): string {
  const { minutes } = wallClockIn(date, tz);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── دایره‌ی ۲۴ساعته ──────────────────────────────────────────────────────
//
// برای رسمِ کمانِ هر جلسه روی ساعتِ ۲۴ساعته باید ساعتِ باز/بستِ **محلیِ آن
// شهر** را به یک لحظه‌ی واقعی تبدیل کنیم و بعد به وقتِ محلیِ خودِ کاربر
// ببریم. دو تبدیل جدا لازم است چون هر دو سر DST دارند: ممکن است لندن
// ساعتش را جابه‌جا کرده باشد ولی تهران نه.

/**
 * لحظه‌ای که ساعتِ محلیِ `tz` برابرِ `targetLocalMinutes` است، نزدیک‌ترین
 * رخداد به `ref`.
 *
 * یک پاسِ اصلاح دارد چون در روزهای تغییرِ ساعت، افستِ لحظه‌ی مرجع با افستِ
 * لحظه‌ی هدف یکی نیست و تخمینِ اول تا یک ساعت خطا می‌کند.
 */
export function localMinutesToInstant(ref: Date, tz: string, targetLocalMinutes: number): Date {
  const wrap = (d: number) => (d > 720 ? d - 1440 : d < -720 ? d + 1440 : d);
  const first = wrap(targetLocalMinutes - wallClockIn(ref, tz).minutes);
  let candidate = new Date(ref.getTime() + first * 60_000);
  const correction = wrap(targetLocalMinutes - wallClockIn(candidate, tz).minutes);
  if (correction !== 0) candidate = new Date(candidate.getTime() + correction * 60_000);
  return candidate;
}

/** دقیقه از نیم‌شب، به وقتِ محلیِ خودِ کاربر */
export function viewerMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export type SessionArc = {
  key: SessionKey;
  label: string;
  flag: string;
  /** شروع و طولِ کمان، بر حسبِ دقیقه در شبانه‌روزِ محلیِ کاربر */
  startMin: number;
  durationMin: number;
  open: boolean;
  /** لحظه‌های واقعیِ باز و بست — برای شمارشِ معکوس */
  openAt: Date;
  closeAt: Date;
  /** ساعتِ باز/بست به وقتِ محلیِ کاربر، برای نمایشِ متنی */
  openLabel: string;
  closeLabel: string;
};

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** کمانِ هر چهار جلسه برای شبانه‌روزِ جاری، به وقتِ محلیِ کاربر */
export function sessionArcs(now: Date = new Date()): SessionArc[] {
  return FOREX_SESSIONS.map((s) => {
    const open = localMinutesToInstant(now, s.tz, s.openMin);
    const close = localMinutesToInstant(open, s.tz, s.closeMin);
    // اگر بستن قبل از بازشدن افتاد یعنی به روزِ بعد می‌رود
    const durationMin = Math.round(
      (close.getTime() - open.getTime()) / 60_000 + (close <= open ? 1440 : 0)
    );
    const closeAt = new Date(open.getTime() + durationMin * 60_000);
    return {
      key: s.key,
      label: s.label,
      flag: s.flag,
      startMin: viewerMinutes(open),
      durationMin,
      open: isSessionOpen(s.key, now),
      openAt: open,
      closeAt,
      openLabel: hhmm(open),
      closeLabel: hhmm(closeAt),
    };
  });
}

/**
 * بازشدنِ بعدیِ یک جلسه — تعطیلیِ آخرِ هفته را رد می‌کند.
 * تا ۸ روز جلو می‌رود؛ اگر چیزی پیدا نشد null می‌دهد (نباید پیش بیاید).
 */
export function nextSessionOpen(
  key: SessionKey,
  now: Date = new Date()
): Date | null {
  const def = FOREX_SESSIONS.find((s) => s.key === key);
  if (!def) return null;
  for (let day = 0; day <= 8; day++) {
    const ref = new Date(now.getTime() + day * 86_400_000);
    const candidate = localMinutesToInstant(ref, def.tz, def.openMin);
    if (candidate.getTime() <= now.getTime()) continue;
    // فقط اگر بازار و خودِ آن شهر آن لحظه واقعاً کاری‌اند
    const { weekday } = wallClockIn(candidate, def.tz);
    if (weekday === 0 || weekday === 6) continue;
    if (!isForexOpen(candidate)) continue;
    return candidate;
  }
  return null;
}

/** نزدیک‌ترین جلسه‌ای که بعداً باز می‌شود */
export function upcomingSession(now: Date = new Date()): { key: SessionKey; at: Date } | null {
  let best: { key: SessionKey; at: Date } | null = null;
  for (const s of FOREX_SESSIONS) {
    if (isSessionOpen(s.key, now)) continue;
    const at = nextSessionOpen(s.key, now);
    if (at && (!best || at < best.at)) best = { key: s.key, at };
  }
  return best;
}

/**
 * کمانِ یک جلسه از روی تعریفِ خامش — برای صفحه‌ی ساعت که یک جلسه‌ی
 * نمایشیِ اضافه (فرانکفورت) هم دارد و در `FOREX_SESSIONS` نیست.
 */
export function arcForDef(
  def: { tz: string; openMin: number; closeMin: number },
  now: Date = new Date()
): { startMin: number; durationMin: number; openAt: Date; closeAt: Date; openLabel: string; closeLabel: string; open: boolean } {
  const openAt = localMinutesToInstant(now, def.tz, def.openMin);
  const rawClose = localMinutesToInstant(openAt, def.tz, def.closeMin);
  const durationMin = Math.round(
    (rawClose.getTime() - openAt.getTime()) / 60_000 + (rawClose <= openAt ? 1440 : 0)
  );
  const closeAt = new Date(openAt.getTime() + durationMin * 60_000);

  // باز بودن با همان قاعده‌ی جلسه‌های ژورنال: هم بازارِ فارکس باز باشد، هم
  // خودِ آن شهر روزِ کاری باشد، هم داخلِ بازه‌ی ساعتش باشیم.
  const { weekday, minutes } = wallClockIn(now, def.tz);
  const inHours = minutes >= def.openMin && minutes < def.closeMin;
  const open = isForexOpen(now) && weekday !== 0 && weekday !== 6 && inHours;

  return { startMin: viewerMinutes(openAt), durationMin, openAt, closeAt, open,
           openLabel: hhmm(openAt), closeLabel: hhmm(closeAt) };
}

/** بازشدنِ بعدیِ یک تعریفِ جلسه — تعطیلیِ آخرِ هفته را رد می‌کند */
export function nextOpenForDef(
  def: { tz: string; openMin: number },
  now: Date = new Date()
): Date | null {
  for (let day = 0; day <= 8; day++) {
    const ref = new Date(now.getTime() + day * 86_400_000);
    const candidate = localMinutesToInstant(ref, def.tz, def.openMin);
    if (candidate.getTime() <= now.getTime()) continue;
    const { weekday } = wallClockIn(candidate, def.tz);
    if (weekday === 0 || weekday === 6) continue;
    if (!isForexOpen(candidate)) continue;
    return candidate;
  }
  return null;
}
