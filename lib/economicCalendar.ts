// تقویم اقتصادی — لایه‌ی مشترک داده و منبع.
//
// تصمیم معماری مهم: اپ همیشه از جدول خودمان می‌خواند، هیچ‌وقت مستقیم از
// یک سرویس بیرونی. دلیل‌ها:
//   • CSP production فقط `connect-src 'self'` (به‌علاوه‌ی گیت‌وی AI) را
//     می‌دهد، پس تماس مرورگر با هاست خارجی اصلا ممکن نیست.
//   • این ماژول نباید به در دسترس بودن یک سرویس خارجی گره بخورد. با
//     ورود دستی ادمین از همین حالا کامل کار می‌کند.
//
// اولویتِ انتخابِ منبع (هر دو `fetchExternalEvents` و `externalProviderName`
// باید هم‌نظر بمانند):
//   ۱) `ECONOMIC_CALENDAR_URL` — عوضِ کاملِ منبع با یک فیدِ دلخواه (override دستی)
//   ۲) `ECONOMIC_CALENDAR_API_KEY` — JBlanked Calendar API (بازه تا یک ماهِ جلوتر)
//   ۳) بدونِ کلید (پیش‌فرض): TradingView — بدونِ کلید، actual دارد
//   ۴) اگر TradingView در دسترس نبود (فقط در پاسِ کامل، نه پاسِ تند):
//      فارکس‌فکتوریِ رایگان — actual ندارد، ولی همیشه در دسترس است
// یعنی تقویم *هیچ‌وقت* بدونِ کارِ ادمین مرده نمی‌ماند. جدا از کرانِ روزانه،
// خودِ روتِ خواندن هم هر بار داده‌ی کهنه را با `ensureFreshCalendar` تازه
// می‌کند — پس sync دیگر به هیچ زمان‌بندِ بیرونی (crontab/cluster.js) وابسته
// نیست، آن‌ها فقط تازگی را زودتر تضمین می‌کنند.
//
// طبقِ درخواستِ صریح، عنوانِ رویدادها دیگر به فارسی ترجمه نمی‌شود — دقیقاً
// همان متنِ انگلیسیِ منبع (مثلِ خودِ JBlanked) ذخیره/نمایش داده می‌شود.

export type EconomicImpact = "LOW" | "MEDIUM" | "HIGH";

export const IMPACT_LABELS: Record<EconomicImpact, string> = {
  HIGH: "تأثیر بالا",
  MEDIUM: "تأثیر متوسط",
  LOW: "تأثیر کم",
};

export const IMPACT_COLORS: Record<EconomicImpact, string> = {
  HIGH: "#E05252",
  MEDIUM: "#E0A452",
  LOW: "#8A9099",
};

export const IMPACT_ORDER: EconomicImpact[] = ["HIGH", "MEDIUM", "LOW"];

/** ارزهایی که تریدر فارکس واقعا دنبال می‌کند — با پرچم کشور متناظر */
export const CALENDAR_CURRENCIES: { code: string; country: string; flag: string; label: string }[] = [
  { code: "USD", country: "US", flag: "🇺🇸", label: "دلار آمریکا" },
  { code: "EUR", country: "EU", flag: "🇪🇺", label: "یورو" },
  { code: "GBP", country: "GB", flag: "🇬🇧", label: "پوند" },
  { code: "JPY", country: "JP", flag: "🇯🇵", label: "ین ژاپن" },
  { code: "CHF", country: "CH", flag: "🇨🇭", label: "فرانک سوئیس" },
  { code: "CAD", country: "CA", flag: "🇨🇦", label: "دلار کانادا" },
  { code: "AUD", country: "AU", flag: "🇦🇺", label: "دلار استرالیا" },
  { code: "NZD", country: "NZ", flag: "🇳🇿", label: "دلار نیوزیلند" },
  { code: "CNY", country: "CN", flag: "🇨🇳", label: "یوان چین" },
];

export function currencyMeta(code: string) {
  return CALENDAR_CURRENCIES.find((c) => c.code === code.toUpperCase());
}

/**
 * منبع پیش‌فرض: JBlanked Calendar API — `/news/api/mql5/calendar/range/`
 * با `from`/`to` (فرمت YYYY-MM-DD) در query؛ کلید در هدرِ
 * `Authorization: Api-Key ...` می‌رود (طبقِ مستندِ خودِ JBlanked)، نه در
 * URL — برایِ همین این تابع فقط URL را می‌سازد و کلید جای دیگری
 * (`fetchExternalEvents`) به‌عنوانِ هدر اضافه می‌شود.
 *
 * یک درخواستِ تکی با بازه‌ی تاریخِ دلخواه — پس «تا یک ماهِ آینده» واقعاً
 * امکان‌پذیر است.
 */
const JBLANKED_BASE_URL = "https://www.jblanked.com/news/api/mql5/calendar/range/";

/**
 * فیدِ پشتیبان — **بدونِ هیچ کلید و هیچ کارِ ادمینی**.
 *
 * چرا لازم شد: JBlanked کلید می‌خواهد، و وقتی کلید ست نبود این ماژول
 * *بی‌صدا* هیچ‌کاری نمی‌کرد (کرانِ خودش ۲۰۰ برمی‌گرداند). نتیجه‌اش دقیقاً
 * گزارشِ «actual هیچ‌وقت نمی‌آید» بود: جدول فقط رویدادهای دستیِ ادمین را
 * داشت، و آن‌ها هم چون *قبل* از انتشار ساخته می‌شوند actualشان تا ابد
 * خالی می‌ماند. حالا نبودِ کلید یعنی «برو سراغِ فیدِ رایگان»، نه «کاری نکن».
 *
 * سه فایلِ هفتگی، نه یکی: فایلِ thisweek به‌محضِ رد شدنِ هفته، actualِ
 * رویدادهای همان هفته را هم با خودش می‌برد؛ بدونِ lastweek تاریخچه هیچ‌وقت
 * کامل نمی‌شود و بدونِ nextweek روزهای پیشِ‌رو خالی‌اند.
 *
 * ⚠️ این سه بازه‌ی ثابت تنها چیزی‌ست که فیدِ رایگان می‌دهد — «تا یک ماهِ
 * آینده»ی حالتِ JBlanked این‌جا واقعاً وجود ندارد و ساختنش یعنی جعلِ داده.
 */
const FREE_FEED_THIS_WEEK = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const FREE_FEED_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_lastweek.json",
  FREE_FEED_THIS_WEEK,
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
];
/**
 * منبعِ پیش‌فرضِ بدونِ کلید: تقویمِ اقتصادیِ TradingView.
 *
 * چرا جای فارکس‌فکتوری را گرفت: فیدِ رایگانِ faireconomy اصلاً فیلدِ
 * `actual` ندارد (فقط title/country/date/impact/forecast/previous)؛ پس هر
 * چقدر هم sync درست کار می‌کرد، actual *هیچ‌وقت* نمی‌رسید — همان باگِ
 * گزارش‌شده. فیدِ nextweek/lastweekِ آن هم همیشه در دسترس نیست، پس روزهای
 * پیشِ‌رو خالی می‌ماندند. TradingView با یک درخواست بازه‌ی دلخواه (۷ روز قبل
 * تا ۳۰ روز بعد) را با actual، شناسه‌ی پایدار، تاریخِ ISOِ UTC و توضیح می‌دهد.
 * فارکس‌فکتوری فقط پشتیبان است (وقتی TradingView در دسترس نبود).
 */
const TRADINGVIEW_URL = "https://economic-calendar.tradingview.com/events";
const TRADINGVIEW_HEADERS = {
  Origin: "https://www.tradingview.com",
  Referer: "https://www.tradingview.com/",
  Accept: "application/json",
};

function buildTradingViewUrl(fast: boolean | undefined): string {
  const now = Date.now();
  const back = fast ? JB_FAST_WINDOW_DAYS : JB_LOOKBACK_DAYS;
  const ahead = fast ? JB_FAST_WINDOW_DAYS : JB_LOOKAHEAD_DAYS;
  const qs = new URLSearchParams({
    from: new Date(now - back * 86_400_000).toISOString(),
    to: new Date(now + ahead * 86_400_000).toISOString(),
    countries: CALENDAR_CURRENCIES.map((c) => c.country).join(","),
  });
  return `${TRADINGVIEW_URL}?${qs}`;
}

/** عددِ TradingView (مثلاً 175 با scale=K) → «175K»؛ واحدِ درصد هم می‌چسبد. */
function tvValue(row: Record<string, unknown>, key: "actual" | "forecast" | "previous"): string | null {
  const v = row[key];
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" && typeof v !== "string") return null;
  const scale = typeof row.scale === "string" ? row.scale.trim() : "";
  const unit = typeof row.unit === "string" ? row.unit.trim() : "";
  const suffix = `${["K", "M", "B", "T"].includes(scale) ? scale : ""}${unit === "%" ? "%" : ""}`;
  return `${v}${suffix}`;
}

/** importance: ‎-1 کم، 0 متوسط، 1 بالا. */
function tvImpact(v: unknown): EconomicImpact {
  const n = Number(v);
  if (n >= 1) return "HIGH";
  if (n === 0) return "MEDIUM";
  return "LOW";
}

export function normalizeTradingViewEvents(raw: unknown): NormalizedEvent[] {
  const rows: unknown[] = Array.isArray((raw as any)?.result) ? (raw as any).result : Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: NormalizedEvent[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = pickString(row, ["title", "indicator"]);
    const dateRaw = pickString(row, ["date"]);
    const id = pickString(row, ["id"]);
    if (!title || !dateRaw || !id) continue;
    const occursAt = new Date(dateRaw);
    if (isNaN(occursAt.getTime())) continue;
    const rawCountry = (pickString(row, ["country"]) || "").toUpperCase();
    const currency = (
      pickString(row, ["currency"]) ||
      CALENDAR_CURRENCIES.find((c) => c.country === rawCountry)?.code ||
      ""
    ).toUpperCase();
    if (!currency) continue;
    const period = pickString(row, ["period"]);
    out.push({
      externalId: id,
      title: (period ? `${title} (${period})` : title).slice(0, 160),
      country: (rawCountry || currencyMeta(currency)?.country || currency).slice(0, 2),
      currency: currency.slice(0, 8),
      impact: tvImpact(row.importance),
      occursAt,
      actual: tvValue(row, "actual"),
      forecast: tvValue(row, "forecast"),
      previous: tvValue(row, "previous"),
      description: pickString(row, ["comment"])?.slice(0, 2000) ?? null,
    });
  }
  return out;
}

const FOREXFACTORY_SOURCE = "FOREXFACTORY";
const JB_LOOKBACK_DAYS = 7;
const JB_LOOKAHEAD_DAYS = 30;
// در حالتِ «تند» (نزدیکِ لحظه‌ی انتشارِ یک خبر) فقط بازه‌ی خیلی نزدیکِ
// امروز لازم است، نه کلِ بازه‌ی یک‌ماهه.
const JB_FAST_WINDOW_DAYS = 1;

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDefaultCalendarUrl(fast: boolean | undefined): string {
  const now = Date.now();
  const lookbackDays = fast ? JB_FAST_WINDOW_DAYS : JB_LOOKBACK_DAYS;
  const lookaheadDays = fast ? JB_FAST_WINDOW_DAYS : JB_LOOKAHEAD_DAYS;
  const from = isoDateOnly(new Date(now - lookbackDays * 86_400_000));
  const to = isoDateOnly(new Date(now + lookaheadDays * 86_400_000));
  return `${JBLANKED_BASE_URL}?from=${from}&to=${to}`;
}

// JBlanked تاریخ را به‌شکلِ «YYYY.MM.DD HH:mm:ss» می‌دهد (نه ISO)، پس
// new Date() معمولی قابلِ‌اتکا نیست (پارس‌کردنِ این فرمت جزوِ استانداردِ
// ECMAScript نیست، فقط یک fallbackِ غیررسمیِ V8 است که با TZ سرور فرق
// می‌کند). این‌جا صریحاً UTC فرض می‌شود.
//
// ⚠️ این فرض تأیید‌نشده است (مستندِ jblanked.com از پشتِ پراکسیِ این محیط
// در دسترس نبود) — بعدِ اولین sync واقعی، ساعتِ یک رویدادِ شناخته‌شده
// (مثلاً NFP) را با MT5/سایتِ خودِ JBlanked مقایسه کن؛ اگر آفست داشت،
// همین‌جا (`JBLANKED_DATE_RE`) باید یک offset ثابت اضافه شود.
const JBLANKED_DATE_RE = /^(\d{4})\.(\d{2})\.(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

function parseCalendarDate(raw: string): Date {
  const m = raw.match(JBLANKED_DATE_RE);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  }
  return new Date(raw);
}

export type EconomicEventDto = {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: EconomicImpact;
  occursAt: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  description: string | null;
  source: string;
};

/**
 * جهتِ actual نسبت به forecast — برای رنگِ سبز/قرمزِ عددِ واقعی، دقیقاً
 * مثلِ خودِ فارکس‌فکتوری. هر دو رشته‌اند و واحد دارند («3.2%»، «215K»،
 * «-1.4M»)؛ اینجا فقط عددِ ابتداییِ رشته (با علامت/اعشار/کاما) استخراج
 * می‌شود، نه کلِ واحد — تبدیلِ واحدها (K/M/B) لازم نیست چون actual و
 * forecastِ یک رویداد همیشه با هم‌واحد منتشر می‌شوند.
 *
 * جهتِ «خوب/بد» بسته به شاخص فرق می‌کند (مثلاً نرخِ بیکاریِ پایین‌تر خوب
 * است، ولی تولیدِ ناخالص بالاتر خوب است) و این داده اینجا موجود نیست، پس
 * فقط «بالاتر/پایین‌تر از پیش‌بینی» را برمی‌گردانیم، نه قضاوتِ خوب/بد —
 * رنگ صرفاً نشان‌دهنده‌ی همین مقایسه‌ی خام است.
 */
export type ActualCompare = "up" | "down" | "flat" | null;

function leadingNumber(v: string): number | null {
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function compareActualToForecast(actual: string | null, forecast: string | null): ActualCompare {
  if (!actual || !forecast) return null;
  const a = leadingNumber(actual);
  const f = leadingNumber(forecast);
  if (a === null || f === null) return null;
  if (a > f) return "up";
  if (a < f) return "down";
  return "flat";
}

// ── منبع بیرونی (اختیاری) ───────────────────────────────────────────────

export type NormalizedEvent = {
  externalId: string;
  title: string;
  country: string;
  currency: string;
  impact: EconomicImpact;
  occursAt: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  // منبعِ پیش‌فرض (JBlanked) این فیلد رو نمی‌ده، پس همیشه null می‌مونه —
  // ولی اگه یه‌روز ECONOMIC_CALENDAR_URL به یه فیدِ دیگه‌ی دارایِ توضیح
  // عوض بشه، همین‌جا بدونِ تغییرِ کدِ دیگه‌ای پر می‌شه.
  description: string | null;
};

/**
 * همیشه true — و این عمدی‌ست.
 *
 * قبلاً وقتی کلیدی ست نبود این false می‌شد و کرانِ تقویم بی‌سر‌و‌صدا
 * (با وضعیتِ ۲۰۰ و فیلدِ `skipped`) هیچ‌کاری نمی‌کرد؛ هیچ لاگِ خطایی،
 * هیچ نشانه‌ای در UI. تقویم عملاً مرده بود و کسی نمی‌فهمید. حالا همیشه
 * یک منبع هست (کلیدی یا رایگان)، پس دیگر حالتِ «تنظیم‌نشده» وجود ندارد.
 * تابع برای سازگاریِ فراخوان‌ها نگه داشته شده.
 */
export function externalProviderConfigured(): boolean {
  return true;
}

/**
 * نامِ منبع — دقیقاً با همان اولویتی که fetchExternalEvents منبع را
 * انتخاب می‌کند. این دو *باید* هم‌نظر بمانند: `source` نیمی از کلیدِ یکتای
 * upsert است، پس اگر این تابع منبعی را بگوید که واقعاً fetch نشده، هر sync
 * ردیف‌های تازه می‌سازد به‌جای به‌روزکردنِ ردیف‌های موجود.
 */
export function externalProviderName(): string {
  if (process.env.ECONOMIC_CALENDAR_SOURCE) return process.env.ECONOMIC_CALENDAR_SOURCE;
  if (process.env.ECONOMIC_CALENDAR_URL) return "EXTERNAL";
  return process.env.ECONOMIC_CALENDAR_API_KEY ? "JBLANKED" : "TRADINGVIEW";
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function normalizeImpact(raw: string | null): EconomicImpact {
  const v = (raw || "").toLowerCase();
  if (v.includes("high") || v === "3" || v.includes("زیاد")) return "HIGH";
  if (v.includes("med") || v === "2" || v.includes("متوسط")) return "MEDIUM";
  return "LOW";
}

// JBlanked سطحِ تأثیر را در فیلدِ `Impact` («High»/«Medium»/«Low») می‌دهد؛
// «Importance» هم نگه داشته شده برایِ سازگاری با فیدهایِ عددیِ دیگر
// (مثلِ Trading Economics که این ماژول قبلاً به آن وصل بود).
const IMPACT_FIELD_KEYS = ["impact", "importance", "Impact", "Importance"];

/**
 * پاسخ خام منبع را به شکل داخلی تبدیل می‌کند.
 *
 * عمدا «تحمل‌کننده» نوشته شده و چند نام رایج فیلد را می‌پذیرد، چون
 * تقویم‌های مختلف اسم‌های متفاوتی دارند و نمی‌خواهیم برای عوض‌کردن منبع
 * مجبور به تغییر کد باشیم. هر ردیفی که تاریخ یا عنوان معتبر نداشته باشد
 * بی‌صدا کنار گذاشته می‌شود — یک ردیف بدشکل نباید کل sync را بشکند.
 */
export function normalizeExternalEvents(raw: unknown): NormalizedEvent[] {
  const rows: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any)?.events)
      ? (raw as any).events
      : Array.isArray((raw as any)?.data)
        ? (raw as any).data
        : [];

  const out: NormalizedEvent[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    const title = pickString(row, ["title", "event", "name", "Event", "Name"]);
    const dateRaw = pickString(row, ["date", "occursAt", "datetime", "Date", "time"]);
    if (!title || !dateRaw) continue;

    const occursAt = parseCalendarDate(dateRaw);
    if (isNaN(occursAt.getTime())) continue;

    // فارکس‌فکتوری کد ارز را توی فیلد `country` می‌گذارد (نه کد کشور)، پس
    // وقتی فیلد currency نبود و country یک کد ارز شناخته‌شده بود، همان را
    // به‌عنوان ارز می‌پذیریم.
    const rawCountry = (pickString(row, ["country", "Country"]) || "").toUpperCase();
    const currency = (
      pickString(row, ["currency", "Currency", "code"]) ||
      (currencyMeta(rawCountry) ? rawCountry : "")
    ).toUpperCase();
    if (!currency) continue;

    out.push({
      // `Event_ID` همان شناسه‌ی پایدارِ فیدِ MQL5ِ JBlanked است و قبلاً در این
      // فهرست نبود — بدونش externalId به کلیدِ ترکیبیِ پایین می‌افتاد که
      // *زمانِ رویداد* را در خود دارد. اگر منبع برای ردیفِ منتشرشده حتی یک
      // ثانیه زمانِ متفاوت بدهد، آن کلید عوض می‌شود و upsert به‌جای به‌روزکردنِ
      // همان ردیف، یک ردیفِ دوم می‌سازد: کاربر یک خطِ تکراری می‌بیند و خطِ
      // اصلی همچنان «—» می‌ماند.
      externalId: pickString(row, ["id", "eventId", "calendarId", "ID", "Id", "Event_ID"]) || `${currency}-${title}-${occursAt.toISOString()}`,
      title: title.slice(0, 160),
      country: (currencyMeta(currency)?.country || rawCountry || currency).toUpperCase().slice(0, 2),
      currency: currency.slice(0, 8),
      impact: normalizeImpact(pickString(row, IMPACT_FIELD_KEYS)),
      occursAt,
      actual: pickString(row, ["actual", "Actual"]),
      forecast: pickString(row, ["forecast", "estimate", "Forecast"]),
      previous: pickString(row, ["previous", "Previous"]),
      description: pickString(row, ["description", "desc", "details", "Description", "Detail"]),
    });
  }
  return out;
}

// بدونِ سقفِ زمانی، یک فیدِ کندپاسخ یا فیلترشده (این دامنه از داخلِ ایران
// گاهی با تأخیرِ خیلی زیاد/قطعیِ اتصال مواجه می‌شود) کل sync رو تا مدتِ
// نامعلومی معلق نگه می‌داشت — از بیرون دقیقاً شبیهِ «دیتا نمیاد» بود، چون
// نه خطا می‌داد نه جواب. ۱۲ ثانیه برایِ یک فیدِ JSONِ سبک کافی‌ست.
async function fetchOneFeed(
  url: string,
  headers: Record<string, string> | undefined,
  normalize: (raw: unknown) => NormalizedEvent[] = normalizeExternalEvents
): Promise<NormalizedEvent[]> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError"
      ? "زمان اتصال تمام شد (احتمالاً این دامنه از سرور در دسترس نیست)"
      : err instanceof Error ? err.message : String(err);
    throw new Error(`اتصال به منبع تقویم اقتصادی (${url}) ناموفق بود: ${reason}`);
  }
  if (!res.ok) throw new Error(`منبع تقویم اقتصادی (${url}) پاسخ ${res.status} داد`);
  // فیدی که به‌جای JSON یک صفحه‌ی HTML (محدودیتِ نرخ/بلاک) برمی‌گرداند
  // باید خطای روشن بدهد، نه SyntaxErrorِ مبهم.
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(`منبع تقویم اقتصادی (${url}) پاسخِ JSON نداد (احتمالاً محدودیتِ نرخ یا بلاک)`);
  }
  return normalize(body);
}

/**
 * فراخوانی منبع بیرونی — فقط از سمت سرور (کران) صدا زده می‌شود.
 *
 * وقتی `ECONOMIC_CALENDAR_URL` ست نشده (پیش‌فرض)، یک درخواستِ تکی به
 * JBlanked با بازه‌ی تاریخِ کامل (لغایتِ یک ماهِ آینده) می‌رود. کلید
 * به‌صورتِ هدرِ `Authorization: Api-Key ...` می‌رود (طبقِ مستندِ خودِ
 * JBlanked)، نه query param. بدونِ کلید همین‌جا با پیامِ فارسیِ روشن متوقف
 * می‌شود تا با یک خطایِ شبکه‌ایِ مبهم اشتباه گرفته نشود — صدا زدنِ این تابع
 * همیشه پشتِ `externalProviderConfigured()` است (کران) پس در عمل فقط
 * وقتی خودِ ادمین «همگام‌سازی الان» را با کلیدِ خالی بزند دیده می‌شود.
 *
 * برایِ `ECONOMIC_CALENDAR_URL` دستی (یک فیدِ دیگر)، کلید همچنان به‌صورتِ
 * هدرِ Bearer فرستاده می‌شود — قراردادِ قبلیِ این ماژول برایِ فیدهایِ دیگر.
 */
export type FetchedCalendar = { source: string; events: NormalizedEvent[] };

export async function fetchExternalEvents(opts?: { fast?: boolean }): Promise<FetchedCalendar> {
  const customUrl = process.env.ECONOMIC_CALENDAR_URL;
  const key = process.env.ECONOMIC_CALENDAR_API_KEY;
  const source = externalProviderName();
  if (customUrl) {
    return { source, events: await fetchOneFeed(customUrl, key ? { Authorization: `Bearer ${key}` } : undefined) };
  }
  if (key) {
    return { source, events: await fetchOneFeed(buildDefaultCalendarUrl(opts?.fast), { Authorization: `Api-Key ${key}` }) };
  }
  // بدونِ کلید: TradingView (با actual). اگر در دسترس نبود، فارکس‌فکتوری به‌عنوانِ
  // پشتیبان — actual ندارد ولی دستِ‌کم روزها و forecast/previous خالی نمی‌مانند.
  try {
    return { source, events: await fetchOneFeed(buildTradingViewUrl(opts?.fast), TRADINGVIEW_HEADERS, normalizeTradingViewEvents) };
  } catch (err) {
    // حالتِ تند هر چند ثانیه صدا زده می‌شود؛ فیدِ فارکس‌فکتوری محدودیتِ نرخِ
    // سخت دارد و با این تکرار بلاک می‌شود — پس پشتیبان فقط در پاسِ کامل.
    if (opts?.fast) throw err;
    const events = await fetchFreeFeeds(FREE_FEED_URLS);
    return { source: FOREXFACTORY_SOURCE, events };
  }
}

/**
 * چند فیدِ هفتگی را می‌گیرد و یکی می‌کند.
 *
 * دو تصمیم که هردو از یک جنسِ «هیچ‌وقت داده‌ی موجود را با خالی خراب نکن»‌اند:
 *   • خطای یک فایل کلِ sync را نمی‌شکند — فقط وقتی پرتاب می‌کنیم که *همه*
 *     شکست خورده باشند. یک فایلِ در دسترس بهتر از هیچ است.
 *   • در هم‌پوشانیِ فایل‌ها (یک رویداد هم در thisweek هم در lastweek)،
 *     نسخه‌ای که actual دارد برنده است — وگرنه یک فایلِ عقب‌مانده می‌توانست
 *     عددِ منتشرشده را با null بازنویسی کند.
 */
async function fetchFreeFeeds(urls: string[]): Promise<NormalizedEvent[]> {
  const results = await Promise.allSettled(urls.map((u) => fetchOneFeed(u, undefined)));
  const ok = results.filter((r): r is PromiseFulfilledResult<NormalizedEvent[]> => r.status === "fulfilled");
  if (!ok.length) {
    const reasons = results
      .map((r) => (r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : ""))
      .filter(Boolean);
    throw new Error(`هیچ‌کدام از فیدهای تقویم اقتصادی در دسترس نبودند: ${reasons.join(" | ")}`);
  }

  const merged = new Map<string, NormalizedEvent>();
  for (const r of ok) {
    for (const e of r.value) {
      const prev = merged.get(e.externalId);
      if (!prev || (!prev.actual && e.actual)) merged.set(e.externalId, e);
    }
  }
  return [...merged.values()];
}

/**
 * منطقِ واقعیِ همگام‌سازی — هم از کرانِ روزانه (`/api/cron/economic-calendar`)
 * صدا زده می‌شه، هم از دکمه‌ی «همگام‌سازی الان» پنلِ ادمین
 * (`/api/admin/economic-events/sync`)، تا یک منطق دوبار نوشته نشه.
 *
 * upsert روی (source, externalId) — اجرای دوباره هیچ‌وقت رویداد تکراری
 * نمی‌سازه و مقادیر actual که بعدا منتشر می‌شن روی همون ردیف به‌روز می‌شن.
 * رویدادهای دستی (source=MANUAL) دست‌نخورده می‌مونن چون کلید یکتا شاملِ
 * source هم هست.
 */
type CalendarDb = {
  economicEvent: {
    upsert: (args: any) => Promise<{ createdAt: Date; updatedAt: Date }>;
    deleteMany?: (args: any) => Promise<{ count: number }>;
  };
};

export async function syncEconomicCalendar(
  prisma: CalendarDb,
  opts?: { fast?: boolean }
): Promise<{ source: string; fetched: number; created: number; updated: number; removed: number; fast: boolean }> {
  const { source, events: fetched } = await fetchExternalEvents(opts);
  // در حالتِ تند فقط رویدادهای همین حدودِ زمانی نوشته می‌شوند. کلِ فید
  // همچنان در پاس‌های آرومِ معمولی نوشته می‌شود، پس چیزی از قلم نمی‌افتد.
  const events = opts?.fast
    ? fetched.filter((e) => Math.abs(e.occursAt.getTime() - Date.now()) <= 86_400_000)
    : fetched;
  let created = 0;
  let updated = 0;
  for (const e of events) {
    const { externalId, description, ...data } = e;
    // منبعی که description نمی‌دهد (null) نباید توضیحِ دستیِ ادمین روی همان
    // ردیف را پاک کند؛ create همیشه هرچه هست را می‌گذارد.
    const updateData = description == null ? data : { ...data, description };
    const result = await prisma.economicEvent.upsert({
      where: { source_externalId: { source, externalId } },
      create: { ...data, description, source, externalId },
      update: updateData,
      select: { createdAt: true, updatedAt: true },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
  }

  // پاک‌سازی — فقط در پاسِ کامل و فقط وقتی فید واقعاً داده داده (فیدِ خالی
  // یعنی احتمالاً خرابیِ منبع، نه «هیچ رویدادی نیست»؛ با آن چیزی پاک نمی‌شود).
  //   • ردیف‌های *منابعِ خودکارِ دیگر* در همین بازه: بعد از عوضِ منبع
  //     (مثلاً فارکس‌فکتوری → TradingView) هر رویداد دوبار دیده می‌شد، و
  //     نسخه‌ی قدیمی actual نداشت.
  //   • ردیف‌های همین منبع در همین بازه که دیگر در فید نیستند: رویدادِ
  //     لغوشده یا جابه‌جاشده (کلیدِ ترکیبیِ فارکس‌فکتوری زمان را دارد) وگرنه
  //     به‌صورتِ ردیفِ شبح با «—» برای همیشه می‌ماند.
  // رویدادهای دستیِ ادمین (MANUAL) هیچ‌وقت دست نمی‌خورند.
  let removed = 0;
  if (!opts?.fast && events.length && prisma.economicEvent.deleteMany) {
    const times = events.map((e) => e.occursAt.getTime());
    const window = { gte: new Date(Math.min(...times)), lte: new Date(Math.max(...times)) };
    const other = await prisma.economicEvent.deleteMany({
      where: { source: { notIn: [source, "MANUAL"] }, occursAt: window },
    });
    const stale = await prisma.economicEvent.deleteMany({
      where: { source, occursAt: window, externalId: { notIn: events.map((e) => e.externalId) } },
    });
    removed = other.count + stale.count;
  }
  return { source, fetched: events.length, created, updated, removed, fast: !!opts?.fast };
}

// ── تازه‌نگه‌داشتن هنگامِ خواندن ─────────────────────────────────────────
//
// sync قبلاً *فقط* از دو جا اجرا می‌شد: لوپِ cluster.js (فقط داخلِ Docker و
// فقط اگر CRON_SECRET ست باشد — وگرنه هر ۲ دقیقه ۴۰۱ می‌گرفت) و crontabِ
// بیرونی. با `next start`/`next dev` یا بدونِ CRON_SECRET هیچ sync‌ای اجرا
// نمی‌شد: جدول در همان روزی که آخرین بار دستی پر شده بود یخ می‌زد — دقیقاً
// «روزهای جدید نمیاد». حالا خودِ روتِ خواندن، اگر داده کهنه باشد، sync
// می‌زند؛ پس تقویم به هیچ زمان‌بندِ بیرونی وابسته نیست.

let inflight: Promise<unknown> | null = null;
/** آخرین تلاش (موفق یا ناموفق) در همین پروسه — تا منبعِ خراب را هر درخواست نکوبیم. */
let lastAttemptAt = 0;
const MIN_ATTEMPT_GAP_MS = 60 * 1000;
/** بیشترین زمانی که درخواستِ کاربر منتظرِ sync می‌ماند؛ بعدش با داده‌ی موجود جواب می‌دهد. */
const READ_WAIT_MS = 8 * 1000;

type FreshnessDb = CalendarDb & {
  economicEvent: CalendarDb["economicEvent"] & {
    findFirst: (args: any) => Promise<any>;
  };
};

export async function ensureFreshCalendar(prisma: FreshnessDb): Promise<void> {
  const now = Date.now();
  const pendingRelease = await hasPendingRelease(prisma);
  const maxAge = pendingRelease ? FAST_POLL_INTERVAL_MS : SLOW_SYNC_INTERVAL_MS;
  if (inflight) {
    await Promise.race([inflight, sleep(READ_WAIT_MS)]);
    return;
  }
  if (now - lastAttemptAt < (pendingRelease ? FAST_POLL_INTERVAL_MS : MIN_ATTEMPT_GAP_MS)) return;

  // آخرین sync از روی updatedAtِ ردیف‌های خودکار (upsert همیشه updatedAt را
  // جلو می‌برد) — مشترک بینِ همه‌ی workerها، نه فقط همین پروسه.
  const latest = await prisma.economicEvent.findFirst({
    where: { source: { not: "MANUAL" } },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  const age = latest ? now - new Date(latest.updatedAt).getTime() : Infinity;
  if (age < maxAge) return;

  lastAttemptAt = now;
  inflight = syncEconomicCalendar(prisma, { fast: pendingRelease && age !== Infinity })
    .catch((err) => {
      console.error(`[economic-calendar] sync هنگامِ خواندن شکست خورد: ${err instanceof Error ? err.message : err}`);
    })
    .finally(() => { inflight = null; });
  await Promise.race([inflight, sleep(READ_WAIT_MS)]);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── زمان‌بندیِ خودتنظیمِ sync بعدی ────────────────────────────────────────
//
// طبقِ درخواستِ صریح: «سرِ ساعتِ ایونت باید اپدیت شه، ۱۰ ثانیه بعدش —
// در غیرِ این حالت نیازی نیست تند‌تند اپدیت شه». راهِ حلِ ساده و مقاومِ
// «یک setTimeout دقیق برایِ هر رویداد» نبود، چون با ری‌استارتِ سرور
// (دیپلویِ تازه) همه‌ی تایمرهایِ زمان‌بندی‌شده از بین می‌رن. به‌جاش این
// یک لوپِ خودتنظیمه: بعدِ هر sync، خودش می‌گه «دفعه‌ی بعد کِی چک کنی» —
// اگه رویدادی نزدیکه (تا ۱۰دقیقه‌ی دیگه) که هنوز actual نداره، چک بعدی
// خیلی زودتر (حداکثر هر ۱۵ثانیه) انجام می‌شه تا لحظه‌ی واقعیِ انتشارِ
// خبر (نه فقط زمانِ برنامه‌ریزی‌شده‌ش، که واقعیت گاهی چند ثانیه دیرتره)
// از دست نره؛ وگرنه به همون بازه‌ی آرومِ معمولی برمی‌گرده. این خودش
// بعدِ ری‌استارت هم خودکار درست کار می‌کنه چون هر فراخوانی از نو
// تصمیم می‌گیره، نه اینکه به یک تایمرِ قدیمی تکیه کنه.
export const SLOW_SYNC_INTERVAL_MS = 10 * 60 * 1000;
/**
 * طبقِ درخواستِ صریح: «نهایتاً تا ده ثانیه بعد از انتشار، داده روی سایت
 * آماده باشد». بودجه‌ی ۱۰ثانیه بینِ دو حلقه تقسیم می‌شود:
 *   • سرور (همین‌جا): اولین چک ۳ثانیه بعدِ زمانِ رویداد، بعدش هر ۵ثانیه.
 *   • کلاینت (EconomicCalendarPanel): هر ۵ثانیه تازه‌سازیِ بی‌صدا، فقط
 *     وقتی رویدادِ منتشرنشده‌ای روی همان صفحه هست.
 * پس بدترین حالتِ «انتشار → دیده‌شدن» حدودِ ۱۰ثانیه می‌ماند، نه ۱۵ثانیه‌ی
 * قبلی که خودش به‌تنهایی از بودجه رد می‌شد.
 */
const FAST_POLL_INTERVAL_MS = 5 * 1000;
const SETTLE_GRACE_MS = 3 * 1000;
const PENDING_LOOKAHEAD_MS = 10 * 60 * 1000;

/**
 * چقدر بعد از زمانِ رویداد، هر ۵ثانیه دنبالِ actual بگردیم.
 *
 * طبقِ درخواستِ صریح: «تا حدود ۳ دقیقه بعد، هر ۵ ثانیه، تا وقتی آپدیت
 * شود». پیش از این ۱۰ دقیقه بود — که برای رویدادهایی که اصلاً actual
 * ندارند (سخنرانی، تعطیلی) یعنی ۱۲۰ بار پشتِ‌سرِ هم گرفتنِ فید بدونِ
 * هیچ نتیجه‌ای.
 *
 * حلقه به‌محضِ رسیدنِ actual خودش می‌ایستد، نه سرِ وقت: کوئریِ pending
 * شرطِ `actual: null` دارد، پس ردیفِ پرشده دیگر اصلاً pending نیست.
 *
 * **همین یک ثابت هم سمتِ سرور و هم سمتِ کلاینت استفاده می‌شود**
 * (EconomicCalendarPanel آن را import می‌کند). قبلاً دو عددِ جدا بودند —
 * ۱۰دقیقه سمتِ سرور و ۱۵دقیقه سمتِ کلاینت — یعنی کلاینت ۵ دقیقه بیشتر
 * از چیزی که سرور اصلاً به‌روز می‌کرد، بی‌فایده poll می‌زد.
 */
export const RELEASE_WATCH_WINDOW_MS = 3 * 60 * 1000;
const PENDING_LOOKBACK_MS = RELEASE_WATCH_WINDOW_MS;

/**
 * آیا همین حالا منتظرِ انتشارِ یک رویدادیم؟ (رویدادِ بی‌actual که زمانش
 * همین حوالی‌ست.) روتِ کران با این تصمیم می‌گیرد پاسِ بعدی «تند» باشد یا
 * «کامل» — همان شرطی که computeNextSyncDelayMs هم بر اساسش زمان‌بندی
 * می‌کند، پس این دو هیچ‌وقت با هم اختلاف نظر پیدا نمی‌کنند.
 */
export async function hasPendingRelease(prisma: {
  economicEvent: { findFirst: (args: any) => Promise<{ occursAt: Date } | null> };
}): Promise<boolean> {
  const now = Date.now();
  const pending = await prisma.economicEvent.findFirst({
    where: {
      actual: null,
      occursAt: { gte: new Date(now - PENDING_LOOKBACK_MS), lte: new Date(now + PENDING_LOOKAHEAD_MS) },
    },
    select: { occursAt: true },
  });
  return !!pending;
}

export async function computeNextSyncDelayMs(prisma: {
  economicEvent: {
    findFirst: (args: any) => Promise<{ occursAt: Date } | null>;
  };
}): Promise<number> {
  const now = Date.now();
  // نزدیک‌ترین رویدادی که هنوز actual نداره و یا تازه رسیده یا تا ۱۰دقیقه‌ی
  // دیگه می‌رسه — یعنی «منتظرِ انتشارِ خبر»یم.
  const pending = await prisma.economicEvent.findFirst({
    where: {
      actual: null,
      occursAt: {
        gte: new Date(now - PENDING_LOOKBACK_MS),
        lte: new Date(now + PENDING_LOOKAHEAD_MS),
      },
    },
    orderBy: { occursAt: "asc" },
    select: { occursAt: true },
  });
  if (!pending) return SLOW_SYNC_INTERVAL_MS;

  const dueAt = pending.occursAt.getTime() + SETTLE_GRACE_MS;
  const msUntilDue = dueAt - now;
  if (msUntilDue <= 0) {
    // زمانِ رویداد + مهلتِ کوتاه گذشته ولی actual هنوز نیومده (یا این
    // رویداد اصلا actual نداره، مثلِ سخنرانی) — تا سقفِ
    // RELEASE_WATCH_WINDOW_MS (۳دقیقه‌ی بعدِ زمانش) هر ۵ثانیه دوباره چک
    // می‌کنیم؛ بعدش خودش از بازه‌ی pending بیرون می‌افته و به حالتِ آروم
    // برمی‌گرده.
    return FAST_POLL_INTERVAL_MS;
  }
  // هنوز نرسیده — دقیقا تا لحظه‌ی سررسید+مهلت صبر کن، مگر اینکه از
  // بازه‌ی آرومِ معمولی هم دیرتر باشه (رویدادِ خیلی دورتر).
  return Math.min(msUntilDue, SLOW_SYNC_INTERVAL_MS);
}
