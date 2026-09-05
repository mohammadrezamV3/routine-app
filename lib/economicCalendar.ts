// تقویم اقتصادی — لایه‌ی مشترک داده و منبع.
//
// تصمیم معماری مهم: اپ همیشه از جدول خودمان می‌خواند، هیچ‌وقت مستقیم از
// یک سرویس بیرونی. دلیل‌ها:
//   • CSP production فقط `connect-src 'self'` (به‌علاوه‌ی گیت‌وی AI) را
//     می‌دهد، پس تماس مرورگر با هاست خارجی اصلا ممکن نیست.
//   • این ماژول نباید به در دسترس بودن یک سرویس خارجی گره بخورد. با
//     ورود دستی ادمین از همین حالا کامل کار می‌کند.
//
// منبع پیش‌فرض حالا فید هفتگی عمومی فارکس‌فکتوری است (پایین‌تر،
// DEFAULT_CALENDAR_URL). کران روزانه آن را می‌گیرد و در همین جدول upsert
// می‌کند؛ ورود دستی ادمین هم سر جایش می‌ماند. با ست‌کردن
// `ECONOMIC_CALENDAR_URL` (و در صورت نیاز `ECONOMIC_CALENDAR_API_KEY`)
// می‌شود منبع را با یک فید تجاری عوض کرد، بدون اینکه هیچ‌جای دیگر اپ
// تغییر کند.
//
// طبقِ درخواستِ صریح، عنوانِ رویدادها دیگر به فارسی ترجمه نمی‌شود — دقیقاً
// همان متنِ انگلیسیِ منبع (مثلِ خودِ فارکس‌فکتوری) ذخیره/نمایش داده می‌شود.

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
 * منبع پیش‌فرض: فیدهای هفتگیِ عمومیِ فارکس‌فکتوری.
 *
 * چرا سه فایل، نه یکی: نسخه‌ی قبلی فقط `ff_calendar_thisweek.json` را
 * می‌گرفت — یعنی به‌محضِ رد شدنِ یک هفته، رویدادهای آن (actual/تاریخچه)
 * دیگر هیچ‌وقت دوباره fetch نمی‌شدند (چون از «this week» بیرون افتاده
 * بودند) و رویدادهای بیش از یک هفته‌ی جلوتر هم اصلاً وجود نداشتند — دقیقاً
 * گزارشِ کاربر: «داده‌های قدیمی نشون نمیده، روزهای بعدی رو هم نشون نمیده».
 * فارکس‌فکتوریِ رایگان («nfs.faireconomy.media») فقط همین سه بازه‌ی ثابت
 * را دارد (lastweek/thisweek/nextweek) — هیچ فیدِ رایگانِ «یک‌ماهه»ای وجود
 * ندارد، پس «تا ماهِ آینده» را با صداقت به «حداکثرِ همین سه هفته» محدود
 * می‌کنیم؛ فبریکیت‌کردنِ داده‌ای که منبع نمی‌دهد خلافِ اصلِ این ماژول است.
 *
 * ست‌کردن `ECONOMIC_CALENDAR_URL` همچنان همه‌ی این‌ها را کنار می‌زند (برای
 * وقتی فیدِ تجاریِ واقعی خریداری شد) و فقط همان یک URL را می‌گیرد.
 *
 * توجه: در فید فارکس‌فکتوری فیلد `country` در واقع *کد ارز* است
 * («USD»/«EUR»)، نه کد کشور — نرمال‌ساز پایین همین را در نظر می‌گیرد.
 */
export const DEFAULT_CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
export const DEFAULT_CALENDAR_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_lastweek.json",
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
];

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
  source: string;
};

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
};

// حالا همیشه یک منبع هست (فارکس‌فکتوری به‌عنوان پیش‌فرض)، پس این دیگر
// «آیا env ست شده» نیست — همیشه true است. نگه داشته شد چون پنل ادمین و
// روت تشخیصی ازش استفاده می‌کنند.
export function externalProviderConfigured(): boolean {
  return true;
}

export function externalProviderName(): string {
  if (process.env.ECONOMIC_CALENDAR_SOURCE) return process.env.ECONOMIC_CALENDAR_SOURCE;
  return process.env.ECONOMIC_CALENDAR_URL ? "EXTERNAL" : "FOREXFACTORY";
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
      impact: normalizeImpact(pickString(row, ["impact", "importance", "Impact"])),
      occursAt,
      actual: pickString(row, ["actual", "Actual"]),
      forecast: pickString(row, ["forecast", "estimate", "Forecast"]),
      previous: pickString(row, ["previous", "Previous"]),
    });
  }
  return out;
}

async function fetchOneFeed(url: string, key: string | undefined): Promise<NormalizedEvent[]> {
  const res = await fetch(url, {
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`منبع تقویم اقتصادی (${url}) پاسخ ${res.status} داد`);
  return normalizeExternalEvents(await res.json());
}

/**
 * فراخوانی منبع بیرونی — فقط از سمت سرور (کران) صدا زده می‌شود.
 *
 * وقتی `ECONOMIC_CALENDAR_URL` ست نشده (پیش‌فرض)، هر سه فیدِ فارکس‌فکتوری
 * (هفته‌ی قبل/همین‌هفته/هفته‌ی بعد) گرفته و با هم merge می‌شوند تا هم
 * تاریخچه‌ی هفته‌ی گذشته هم رویدادهای هفته‌ی پیشِ‌رو در دیتابیس بمانند —
 * نه فقط «همین هفته». شکستِ یکی از سه فید کل sync را نمی‌شکند (مثلاً اگر
 * فقط nextweek موقتاً در دسترس نبود، دو فیدِ دیگر همچنان ذخیره می‌شوند).
 */
export async function fetchExternalEvents(): Promise<NormalizedEvent[]> {
  const key = process.env.ECONOMIC_CALENDAR_API_KEY;
  const customUrl = process.env.ECONOMIC_CALENDAR_URL;
  const urls = customUrl ? [customUrl] : DEFAULT_CALENDAR_URLS;

  const results = await Promise.allSettled(urls.map((u) => fetchOneFeed(u, key)));
  const events: NormalizedEvent[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") events.push(...r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  if (!events.length && errors.length) throw new Error(errors.join(" | "));
  return events;
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
}): Promise<{ source: string; fetched: number; created: number; updated: number }> {
  const source = externalProviderName();
  const events = await fetchExternalEvents();
  let created = 0;
  let updated = 0;
  for (const e of events) {
    const { externalId, ...data } = e;
    const result = await prisma.economicEvent.upsert({
      where: { source_externalId: { source, externalId } },
      create: { ...data, source, externalId },
      update: data,
      select: { createdAt: true, updatedAt: true },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
  }
  return { source, fetched: events.length, created, updated };
}
