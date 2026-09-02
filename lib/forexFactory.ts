// منبعِ فارکس‌فکتوری برای تقویم اقتصادی.
//
// قاعده‌ی معماریِ پروژه دست‌نخورده می‌ماند: مرورگر هیچ‌وقت مستقیم به
// فارکس‌فکتوری وصل نمی‌شود (CSP اجازه نمی‌دهد و نباید به سرویسِ بیرونی گره
// بخوریم). فقط کرانِ سمتِ سرور این فید را می‌خواند و در جدولِ خودمان
// (`EconomicEvent`) upsert می‌کند؛ UI مثل قبل از جدولِ خودمان می‌خواند.
//
// شکلِ فیدِ فارکس‌فکتوری (فیدِ هفتگیِ JSON):
//   { title, country, date, impact, forecast, previous, actual?, url? }
// دو نکته که با نرمال‌سازیِ عمومی جور درنمی‌آید و این فایل را لازم کرد:
//   • `country` در این فید در واقع **کدِ ارز** است ("USD"، "EUR")، نه کدِ
//     کشور. نرمال‌سازیِ عمومی آن را کشور می‌گرفت و ارز خالی می‌ماند.
//   • `impact` مقدارِ "Holiday" هم دارد که سطحِ تأثیر نیست.

import { EconomicImpact, NormalizedEvent, currencyMeta } from "./economicCalendar";
import { translateEventTitle } from "./economicEventFa";

/** فیدهای رسمیِ هفتگیِ فارکس‌فکتوری */
export const FF_FEEDS = {
  thisWeek: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  nextWeek: "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
} as const;

export const FF_SOURCE = "FOREXFACTORY";

function ffImpact(raw: unknown): EconomicImpact {
  const v = String(raw ?? "").toLowerCase();
  if (v.startsWith("high")) return "HIGH";
  if (v.startsWith("med")) return "MEDIUM";
  // "Holiday" و "Low" هر دو کم‌اثرند — تعطیلی حرکتِ بازار نمی‌سازد،
  // فقط نبودِ نقدینگی را توضیح می‌دهد.
  return "LOW";
}

function ffText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  // فارکس‌فکتوری برای مقدارِ خالی رشته‌ی تهی می‌فرستد، نه null
  return t ? t.slice(0, 24) : null;
}

/**
 * یک ردیفِ خامِ فارکس‌فکتوری را به شکلِ داخلی تبدیل می‌کند.
 * ردیفِ بدشکل `null` می‌دهد و بی‌صدا کنار گذاشته می‌شود — یک ردیفِ خراب
 * نباید کلِ همگام‌سازیِ هفته را بشکند.
 */
export function normalizeForexFactoryRow(item: unknown): NormalizedEvent | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  const rawTitle = typeof row.title === "string" ? row.title.trim() : "";
  if (!rawTitle) return null;

  const dateRaw = typeof row.date === "string" ? row.date : "";
  const occursAt = new Date(dateRaw);
  if (!dateRaw || isNaN(occursAt.getTime())) return null;

  // در این فید، `country` کدِ ارز است
  const currency = String(row.country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return null;

  return {
    // شناسه‌ی پایدار: خودِ فید id نمی‌دهد، پس از (ارز + عنوان + زمان)
    // می‌سازیم. همین ترکیب در اجرای بعدیِ کران هم یکسان است، پس upsert
    // ردیفِ تکراری نمی‌سازد و مقدارِ `actual` که بعداً منتشر می‌شود روی
    // همان ردیف می‌نشیند.
    externalId: `${currency}|${rawTitle}|${occursAt.toISOString()}`,
    // عنوان فارسی می‌شود؛ اگر اصطلاح شناخته نشود همان انگلیسی می‌ماند.
    title: translateEventTitle(rawTitle).slice(0, 160),
    country: currencyMeta(currency)?.country || currency.slice(0, 2),
    currency,
    impact: ffImpact(row.impact),
    occursAt,
    actual: ffText(row.actual),
    forecast: ffText(row.forecast),
    previous: ffText(row.previous),
  };
}

export function normalizeForexFactory(raw: unknown): NormalizedEvent[] {
  const rows = Array.isArray(raw) ? raw : [];
  const out: NormalizedEvent[] = [];
  const seen = new Set<string>();
  for (const item of rows) {
    const ev = normalizeForexFactoryRow(item);
    // یک رویداد گاهی در فیدِ «این هفته» و «هفته‌ی بعد» تکرار می‌شود؛
    // چون در یک اجرا هر دو را می‌خوانیم، این‌جا هم کنار گذاشته می‌شود تا
    // upsertهای بی‌فایده نزنیم.
    if (ev && !seen.has(ev.externalId)) {
      seen.add(ev.externalId);
      out.push(ev);
    }
  }
  return out;
}

/**
 * هر دو فیدِ هفتگی را می‌خواند. هفته‌ی بعد اختیاری است: اگر در دسترس
 * نبود، همگام‌سازی با همان هفته‌ی جاری موفق حساب می‌شود — نداشتنِ تقویمِ
 * هفته‌ی بعد خیلی بهتر از شکستِ کلِ کران است.
 */
export async function fetchForexFactoryEvents(): Promise<NormalizedEvent[]> {
  const thisWeek = await fetchFeed(FF_FEEDS.thisWeek);
  let nextWeek: NormalizedEvent[] = [];
  try {
    nextWeek = await fetchFeed(FF_FEEDS.nextWeek);
  } catch {
    nextWeek = [];
  }

  const seen = new Set(thisWeek.map((e) => e.externalId));
  return [...thisWeek, ...nextWeek.filter((e) => !seen.has(e.externalId))];
}

async function fetchFeed(url: string): Promise<NormalizedEvent[]> {
  const res = await fetch(url, {
    // بدونِ User-Agent، فید گاهی ۴۰۳ می‌دهد
    headers: { "User-Agent": "ArionApp/1.0 (+https://arionapp.ir)", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`فارکس‌فکتوری پاسخ ${res.status} داد`);
  return normalizeForexFactory(await res.json());
}
