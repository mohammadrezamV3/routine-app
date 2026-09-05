// چتِ گروهیِ هر نماد — منطقِ مشترکِ سرور و کلاینت.
//
// تصمیمِ مهم: اتاق‌ها فقط از روی نمادهای شناخته‌شده‌ی `TRADE_PAIRS` ساخته
// می‌شوند، نه از هر رشته‌ای که کلاینت بفرستد. اگر هر متنی اتاق می‌ساخت،
// فضای اتاق‌ها بی‌نهایت می‌شد و یک نفر می‌توانست با هزار «نماد» جعلی هم
// جدول را پر کند و هم لیستِ اتاق‌ها را بی‌معنا کند.

import { TRADE_PAIRS } from "./tradePairs";

export const MAX_CHAT_BODY = 500;
// طبقِ درخواستِ صریح: فقط ۲۰۰ پیامِ آخرِ هر اتاق نشان داده می‌شود و همان
// تعداد هم نگه‌داری می‌شود — بعد از هر پیامِ تازه، قدیمی‌ترها فراتر از ۲۰۰تا
// از دیتابیس هم حذف می‌شوند (نه فقط از نمایش). نگاه کن به POST در
// app/api/trade/chat/route.ts.
export const CHAT_PAGE_SIZE = 200;
export const CHAT_RETENTION_LIMIT = 200;

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

/**
 * سه سطحِ تعدیلِ چت — ادمین از پنلِ کاربر (`/admin/users/[id]`) هرکدام را
 * که خودش صلاح بداند به کاربر می‌دهد؛ هیچ escalationِ خودکاری بینِ این سه
 * سطح نیست. اخطار فقط اطلاع‌رسانی است، دو تای دیگر جلوی *فرستادنِ* پیامِ
 * جدید را می‌گیرند (نه خواندنِ اتاق).
 */
export const CHAT_MODERATION_ACTIONS = [
  { value: "WARNING", label: "اخطار" },
  { value: "BAN_72H", label: "بن ۷۲ ساعته از چت" },
  { value: "DISABLE_CHAT", label: "غیرفعال‌سازیِ دائمیِ چت" },
  { value: "ENABLE_CHAT", label: "رفعِ محدودیت (بن/غیرفعال‌سازی)" },
] as const;

export type ChatModerationAction = (typeof CHAT_MODERATION_ACTIONS)[number]["value"];

export function isChatModerationAction(v: unknown): v is ChatModerationAction {
  return typeof v === "string" && CHAT_MODERATION_ACTIONS.some((a) => a.value === v);
}

/** وضعیتِ تعدیلِ چتِ خودِ کاربرِ درخواست‌دهنده — در پاسخِ GET برمی‌گردد. */
export type ChatViewerModeration = {
  canSend: boolean;
  bannedUntil: string | null; // اگر بن ۷۲ساعته هنوز فعال باشد
  disabled: boolean;
  warning: { note: string | null; at: string } | null; // اخطارِ دیده‌نشده
};

/**
 * قوانینِ اتاقِ گفت‌وگو. کاربر پیش از اولین پیام باید بپذیردشان.
 *
 * چرا این‌جا و نه یک صفحه‌ی جدا: قانونی که کاربر برای خواندنش باید صفحه
 * عوض کند، خوانده نمی‌شود. همین‌جا داخلِ خودِ باکسِ گفت‌وگو نشان داده
 * می‌شود، درست پیش از جایی که قرار است پیام بنویسد.
 */
export const CHAT_RULES: string[] = [
  "این‌جا فقط درباره‌ی همین نماد حرف بزن — بحثِ بی‌ربط، اتاق را برای بقیه بی‌فایده می‌کند.",
  "سیگنال‌فروشی، تبلیغ کانال و لینکِ دعوت ممنوع است.",
  "توهین، تمسخر و برخوردِ تند ممنوع است؛ اشتباهِ تحلیلی حقِ همه است.",
  "هیچ اطلاعاتِ شخصی (شماره، آدرس، شماره‌ی حساب) از خودت یا دیگران نگذار.",
  "تحلیلِ دیگران توصیه‌ی مالی نیست — مسئولیتِ هر معامله با خودت است.",
  "پیامِ متخلف را گزارش کن؛ گزارش‌ها را ادمین بررسی می‌کند.",
];
