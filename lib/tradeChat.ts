// چتِ گروهیِ هر نماد — منطقِ مشترکِ سرور و کلاینت.
//
// تصمیمِ مهم: اتاق‌ها فقط از روی نمادهای شناخته‌شده‌ی `TRADE_PAIRS` ساخته
// می‌شوند، نه از هر رشته‌ای که کلاینت بفرستد. اگر هر متنی اتاق می‌ساخت،
// فضای اتاق‌ها بی‌نهایت می‌شد و یک نفر می‌توانست با هزار «نماد» جعلی هم
// جدول را پر کند و هم لیستِ اتاق‌ها را بی‌معنا کند.

import { TRADE_PAIRS } from "./tradePairs";

export const MAX_CHAT_BODY = 500;
export const CHAT_PAGE_SIZE = 60;

/** سقفِ ارسال: بیش از این در بازه‌ی زیر، یعنی اسپم */
export const CHAT_RATE_LIMIT = 10;
export const CHAT_RATE_WINDOW_MS = 60_000;

/**
 * نمادِ اتاق را نرمال می‌کند و اگر نمادِ شناخته‌شده نبود null می‌دهد.
 * برگرداندنِ null یعنی «اتاقی با این نام وجود ندارد» — نه اینکه اتاقِ
 * تازه‌ای ساخته شود.
 */
export function normalizeRoomSymbol(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return null;
  return TRADE_PAIRS.some((p) => p.code === code) ? code : null;
}

export const CHAT_REPORT_REASONS = [
  { value: "SPAM", label: "تبلیغ یا اسپم" },
  { value: "ABUSE", label: "توهین یا بی‌ادبی" },
  { value: "SCAM", label: "کلاهبرداری یا سیگنال‌فروشی" },
  { value: "OFFTOPIC", label: "بی‌ربط به این نماد" },
  { value: "OTHER", label: "دلیل دیگر" },
] as const;

export type ChatReportReason = (typeof CHAT_REPORT_REASONS)[number]["value"];

export function isChatReportReason(v: unknown): v is ChatReportReason {
  return typeof v === "string" && CHAT_REPORT_REASONS.some((r) => r.value === v);
}

export const CHAT_REPORT_REASON_LABELS: Record<string, string> = Object.fromEntries(
  CHAT_REPORT_REASONS.map((r) => [r.value, r.label])
);

export const CHAT_REPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: "بررسی‌نشده",
  ACTIONED: "پیام حذف شد",
  DISMISSED: "رد شد",
};

export type ChatMessageDto = {
  id: string;
  symbol: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  /** پیامِ خودِ کاربرِ درخواست‌دهنده — برای چیدمانِ راست/چپ و دکمه‌ی حذف */
  mine: boolean;
  /** آیا همین کاربر قبلاً گزارشش کرده — تا دکمه دوباره فعال نباشد */
  reported: boolean;
};
