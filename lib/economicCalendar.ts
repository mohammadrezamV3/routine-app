// تقویم اقتصادی — لایه‌ی مشترکِ داده و منبع.
//
// تصمیمِ معماریِ مهم: اپ همیشه از جدولِ خودمان می‌خواند، هیچ‌وقت مستقیم از
// یک سرویسِ بیرونی. دلیل‌ها:
//   • CSPِ production فقط `connect-src 'self'` (به‌علاوه‌ی گیت‌ویِ AI) را
//     می‌دهد، پس تماسِ مرورگر با هاستِ خارجی اصلاً ممکن نیست.
//   • این ماژول نباید به در دسترس بودنِ یک سرویسِ خارجی گره بخورد. با
//     ورودِ دستیِ ادمین از همین حالا کامل کار می‌کند.
//   • هیچ فیدِ رایگانی برای استفاده‌ی تجاری مجوزِ روشن ندارد و هاردکد‌کردنِ
//     یک منبع، هم حقوقی و هم عملیاتی شکننده است.
//
// وقتی یک فیدِ واقعی خریداری/تنظیم شد، فقط `ECONOMIC_CALENDAR_URL` (و در
// صورت نیاز `ECONOMIC_CALENDAR_API_KEY`) ست می‌شود و کرانِ روزانه همان را
// نرمال‌سازی و در همین جدول ذخیره می‌کند. هیچ‌جای دیگرِ اپ عوض نمی‌شود.

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

/** ارزهایی که تریدرِ فارکس واقعاً دنبال می‌کند — با پرچمِ کشورِ متناظر */
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

// ── منبعِ بیرونی (اختیاری) ───────────────────────────────────────────────

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

export function externalProviderConfigured(): boolean {
  return !!process.env.ECONOMIC_CALENDAR_URL;
}

export function externalProviderName(): string {
  return process.env.ECONOMIC_CALENDAR_SOURCE || "EXTERNAL";
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
 * پاسخِ خامِ منبع را به شکلِ داخلی تبدیل می‌کند.
 *
 * عمداً «تحمل‌کننده» نوشته شده و چند نامِ رایجِ فیلد را می‌پذیرد، چون
 * تقویم‌های مختلف اسم‌های متفاوتی دارند و نمی‌خواهیم برای عوض‌کردنِ منبع
 * مجبور به تغییرِ کد باشیم. هر ردیفی که تاریخ یا عنوانِ معتبر نداشته باشد
 * بی‌صدا کنار گذاشته می‌شود — یک ردیفِ بدشکل نباید کلِ sync را بشکند.
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

    const currency = (pickString(row, ["currency", "Currency", "code"]) || "").toUpperCase();
    if (!currency) continue;

    out.push({
      externalId: pickString(row, ["id", "eventId", "calendarId"]) || `${currency}-${title}-${occursAt.toISOString()}`,
      title: title.slice(0, 160),
      country: (pickString(row, ["country", "Country"]) || currencyMeta(currency)?.country || currency.slice(0, 2)).toUpperCase().slice(0, 2),
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

/** فراخوانیِ منبعِ بیرونی — فقط از سمتِ سرور (کران) صدا زده می‌شود */
export async function fetchExternalEvents(): Promise<NormalizedEvent[]> {
  const url = process.env.ECONOMIC_CALENDAR_URL;
  if (!url) return [];
  const key = process.env.ECONOMIC_CALENDAR_API_KEY;
  const res = await fetch(url, {
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`منبع تقویم اقتصادی پاسخ ${res.status} داد`);
  return normalizeExternalEvents(await res.json());
}
