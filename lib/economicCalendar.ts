// تقویم اقتصادی — لایه‌ی مشترک داده و منبع.
//
// تصمیم معماری مهم: اپ همیشه از جدول خودمان می‌خواند، هیچ‌وقت مستقیم از
// یک سرویس بیرونی. دلیل‌ها:
//   • CSP production فقط `connect-src 'self'` (به‌علاوه‌ی گیت‌وی AI) را
//     می‌دهد، پس تماس مرورگر با هاست خارجی اصلا ممکن نیست.
//   • این ماژول نباید به در دسترس بودن یک سرویس خارجی گره بخورد. با
//     ورود دستی ادمین از همین حالا کامل کار می‌کند.
//
// منبع پیش‌فرض حالا Trading Economics است (نه دیگر فارکس‌فکتوری — طبقِ
// درخواستِ صریح عوض شد، چون فیدِ رایگانِ فارکس‌فکتوری actual رو قابلِ
// اعتماد نمی‌داد). کران روزانه آن را می‌گیرد و در همین جدول upsert
// می‌کند؛ ورود دستی ادمین هم سر جایش می‌ماند. Trading Economics بدونِ
// کلید کار نمی‌کند — `ECONOMIC_CALENDAR_API_KEY` باید ست شود، وگرنه (طبقِ
// همون قرارداد) sync خودکار غیرفعال می‌ماند و فقط ورود دستی ادمین کار
// می‌کند. با ست‌کردن `ECONOMIC_CALENDAR_URL` می‌شود منبع را کامل با یک
// فیدِ دیگر عوض کرد، بدون اینکه هیچ‌جای دیگر اپ تغییر کند.
//
// طبقِ درخواستِ صریح، عنوانِ رویدادها دیگر به فارسی ترجمه نمی‌شود — دقیقاً
// همان متنِ انگلیسیِ منبع (مثلِ خودِ Trading Economics) ذخیره/نمایش داده
// می‌شود.

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
 * منبع پیش‌فرض: Trading Economics — `/calendar/country/all/{از}/{تا}`
 * با کلید در query (`c=`)، نه هدر Bearer (طبقِ مستندِ خودِ Trading
 * Economics که کلید را همین‌طوری می‌خواهد).
 *
 * برخلافِ فارکس‌فکتوریِ رایگان (که فقط سه بازه‌ی ثابتِ هفتگی داشت و
 * روزهایِ فراتر از آن سه هفته همیشه خالی می‌ماندند)، اینجا یک بازه‌ی
 * تاریخِ دلخواه می‌گیریم — پس «تا یک ماهِ آینده» واقعاً امکان‌پذیر است، نه
 * محدود به سه هفته.
 */
const TRADINGECONOMICS_BASE_URL = "https://api.tradingeconomics.com/calendar/country/all";
const TE_LOOKBACK_DAYS = 7;
const TE_LOOKAHEAD_DAYS = 30;
// در حالتِ «تند» (نزدیکِ لحظه‌ی انتشارِ یک خبر) فقط بازه‌ی خیلی نزدیکِ
// امروز لازم است، نه کلِ بازه‌ی یک‌ماهه.
const TE_FAST_WINDOW_DAYS = 1;

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * URL منبعِ پیش‌فرض را با بازه‌ی تاریخ و کلیدِ API می‌سازد. بدونِ
 * `ECONOMIC_CALENDAR_API_KEY` خطا می‌دهد — Trading Economics بدونِ کلید
 * اصلاً پاسخ نمی‌دهد، پس بهتر است همین‌جا با پیامِ فارسیِ روشن متوقف شود
 * تا با یک خطایِ شبکه‌ایِ مبهم اشتباه گرفته نشود. صدا زدنِ این تابع همیشه
 * پشتِ `externalProviderConfigured()` است (کران/همگام‌سازیِ دستی) پس در
 * عمل فقط وقتی خودِ ادمین «همگام‌سازی الان» را با کلیدِ خالی بزند دیده
 * می‌شود.
 */
function buildDefaultCalendarUrl(fast: boolean | undefined): string {
  const key = process.env.ECONOMIC_CALENDAR_API_KEY;
  if (!key) {
    throw new Error(
      "ECONOMIC_CALENDAR_API_KEY تنظیم نشده — Trading Economics بدونِ کلید کار نمی‌کند. رویدادها را دستی از پنلِ ادمین اضافه کن یا کلید را در env ست کن."
    );
  }
  const now = Date.now();
  const lookbackDays = fast ? TE_FAST_WINDOW_DAYS : TE_LOOKBACK_DAYS;
  const lookaheadDays = fast ? TE_FAST_WINDOW_DAYS : TE_LOOKAHEAD_DAYS;
  const d1 = isoDateOnly(new Date(now - lookbackDays * 86_400_000));
  const d2 = isoDateOnly(new Date(now + lookaheadDays * 86_400_000));
  return `${TRADINGECONOMICS_BASE_URL}/${d1}/${d2}?c=${encodeURIComponent(key)}&f=json`;
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
  // فیدِ رایگانِ پیش‌فرض (فارکس‌فکتوری) این فیلد رو نمی‌ده، پس همیشه
  // null می‌مونه — ولی اگه یه‌روز ECONOMIC_CALENDAR_URL به یه فیدِ تجاریِ
  // دارایِ توضیح عوض بشه، همین‌جا بدونِ تغییرِ کدِ دیگه‌ای پر می‌شه.
  description: string | null;
};

// Trading Economics بدونِ کلید کار نمی‌کند (برخلافِ فارکس‌فکتوریِ رایگانِ
// قبلی) — پس این دیگر همیشه true نیست: فقط وقتی یا یک URL دستی ست شده یا
// کلیدِ Trading Economics موجود است. نبودِ هیچ‌کدام یعنی sync خودکار
// خاموش می‌ماند و تقویم فقط با ورود دستیِ ادمین پر می‌شود.
export function externalProviderConfigured(): boolean {
  return !!(process.env.ECONOMIC_CALENDAR_URL || process.env.ECONOMIC_CALENDAR_API_KEY);
}

export function externalProviderName(): string {
  if (process.env.ECONOMIC_CALENDAR_SOURCE) return process.env.ECONOMIC_CALENDAR_SOURCE;
  return process.env.ECONOMIC_CALENDAR_URL ? "EXTERNAL" : "TRADINGECONOMICS";
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

// Trading Economics سطحِ تأثیر را در فیلدِ `Importance` (عددِ ۱ تا ۳)
// می‌دهد — نامِ فیلد با فارکس‌فکتوریِ قبلی («impact») فرق دارد.
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

    const title = pickString(row, ["title", "event", "name", "Event"]);
    const dateRaw = pickString(row, ["date", "occursAt", "datetime", "Date", "time"]);
    if (!title || !dateRaw) continue;

    const occursAt = new Date(dateRaw);
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
      externalId: pickString(row, ["id", "eventId", "calendarId"]) || `${currency}-${title}-${occursAt.toISOString()}`,
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
async function fetchOneFeed(url: string, bearerKey: string | undefined): Promise<NormalizedEvent[]> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: bearerKey ? { Authorization: `Bearer ${bearerKey}` } : undefined,
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
  return normalizeExternalEvents(await res.json());
}

/**
 * فراخوانی منبع بیرونی — فقط از سمت سرور (کران) صدا زده می‌شود.
 *
 * وقتی `ECONOMIC_CALENDAR_URL` ست نشده (پیش‌فرض)، یک درخواستِ تکی به
 * Trading Economics با بازه‌ی تاریخِ کامل (لغایتِ یک ماهِ آینده) می‌رود —
 * برخلافِ فارکس‌فکتوریِ قبلی که مجبور بودیم سه فیدِ هفتگیِ جدا را merge
 * کنیم، Trading Economics یک بازه‌ی دلخواه را در یک درخواست می‌دهد. کلید
 * اینجا به‌صورتِ query param (`c=`) در خودِ URL نشسته (نه هدرِ Bearer —
 * Trading Economics کلید را این‌طوری می‌خواهد)؛ هدرِ Bearer فقط برایِ
 * `ECONOMIC_CALENDAR_URL` دستی (یک فیدِ تجاریِ دیگر) نگه داشته شده.
 */
export async function fetchExternalEvents(opts?: { fast?: boolean }): Promise<NormalizedEvent[]> {
  const customUrl = process.env.ECONOMIC_CALENDAR_URL;
  if (customUrl) {
    return fetchOneFeed(customUrl, process.env.ECONOMIC_CALENDAR_API_KEY);
  }
  return fetchOneFeed(buildDefaultCalendarUrl(opts?.fast), undefined);
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
export async function syncEconomicCalendar(prisma: {
  economicEvent: { upsert: (args: any) => Promise<{ createdAt: Date; updatedAt: Date }> };
}, opts?: { fast?: boolean }): Promise<{ source: string; fetched: number; created: number; updated: number; fast: boolean }> {
  const source = externalProviderName();
  const fetched = await fetchExternalEvents(opts);
  // در حالتِ تند فقط رویدادهای همین حدودِ زمانی نوشته می‌شوند. یک sync
  // کامل چند صد upsertِ پشت‌سرهم است؛ تکرارِ آن هر ۵ثانیه فقط برایِ یک
  // رویداد، بی‌دلیل دیتابیس را مشغول می‌کرد. کلِ فید همچنان در پاس‌های
  // آرومِ معمولی (هر ۱۰دقیقه) نوشته می‌شود، پس چیزی از قلم نمی‌افتد.
  const events = opts?.fast
    ? fetched.filter((e) => Math.abs(e.occursAt.getTime() - Date.now()) <= 86_400_000)
    : fetched;
  let created = 0;
  let updated = 0;
  for (const e of events) {
    const { externalId, description, ...data } = e;
    // Trading Economics هم description نمی‌ده (همیشه null) — اگه بدونِ‌قید
    // توی update بذاریمش، هر sync توضیحی رو که ادمین دستی رویِ همین رویدادِ
    // sync‌شده نوشته پاک می‌کنه. فقط وقتی خودِ منبع واقعاً یه description
    // داده (فیدِ تجاریِ دیگه‌ای) رویِ ردیف می‌شینه؛ create همیشه هرچی هست
    // (حتی null) رو می‌ذاره، چون رکورد تازه‌ست و چیزی برایِ پاک‌کردن نیست.
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
  return { source, fetched: events.length, created, updated, fast: !!opts?.fast };
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
const PENDING_LOOKBACK_MS = 10 * 60 * 1000;

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
    // رویداد اصلا actual نداره، مثلِ سخنرانی) — تا سقفِ بازه‌ی بالا
    // (۱۰دقیقه‌ی بعدِ زمانش) هر ۱۵ثانیه دوباره چک می‌کنیم؛ بعدش خودش از
    // بازه‌ی pending بیرون می‌افته و به حالتِ آروم برمی‌گرده.
    return FAST_POLL_INTERVAL_MS;
  }
  // هنوز نرسیده — دقیقا تا لحظه‌ی سررسید+مهلت صبر کن، مگر اینکه از
  // بازه‌ی آرومِ معمولی هم دیرتر باشه (رویدادِ خیلی دورتر).
  return Math.min(msUntilDue, SLOW_SYNC_INTERVAL_MS);
}
