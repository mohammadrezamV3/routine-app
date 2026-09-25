// قراردادِ API «حساب» بینِ بک‌اندِ وب و اپ اندروید — خرید پلن، تیکت
// پشتیبانی و اطلاعیه‌ها: /api/mobile/billing/*، /api/mobile/support/*،
// /api/mobile/notices/*
//
// این فایل عمدا هیچ import‌ای نداره تا عینا بشه کپی‌اش رو توی
// `mobile/src/lib/account-contract.ts` گذاشت. نسخه‌ی مرجع همین‌جاست؛ تستِ
// __tests__/mobileAccountContract.test.ts اگه دو نسخه از هم فاصله بگیرن می‌شکنه.
//
// قواعدِ کلی:
//   • احرازِ هویت فقط با `Authorization: Bearer <accessToken>` — به‌جز
//     GET /api/mobile/billing/handoff که مرورگرِ سیستم بازش می‌کنه و فقط با
//     توکنِ یک‌بارمصرفِ داخلِ آدرس کار می‌کنه.
//   • خطاها: `{ error: string }` — برای 4xx پیامِ فارسیِ قابلِ نمایش، مگر
//     کدهای ثابتِ پایین (ACCOUNT_ERROR_*).
//   • همه‌ی زمان‌ها ISO-8601 به UTC؛ همه‌ی مبالغ به ریال (نمایش: ÷۱۰ تومان).

export const MOBILE_ACCOUNT_CONTRACT_VERSION = 1;

export const ACCOUNT_ERROR_NOT_FOUND = "not_found";
export const ACCOUNT_ERROR_CHECKOUT_UNAVAILABLE = "checkout_unavailable";

// ─── خرید پلن ────────────────────────────────────────────────────────────
//
// جریان (جزئیات: mobile/README-billing.md):
//   1. GET  /api/mobile/billing/plans              → فهرستِ پلن‌ها + اشتراکِ فعلی
//   2. POST /api/mobile/billing/discount           → فقط پیش‌نمایشِ درصدِ کدِ تخفیف/رفرال
//   3. POST /api/mobile/billing/checkout           → ردیفِ PENDING + checkoutUrl
//      (یک‌بارمصرف، حداکثر ۱۰ دقیقه) که اپ با مرورگرِ سیستم باز می‌کنه
//   4. پرداخت و برگشتِ درگاه کاملا روی وب (/api/subscription/verify) — اپ
//      هیچ‌وقت موفقیتِ پرداخت رو اعلام نمی‌کنه
//   5. بعد از برگشت به اپ (resume یا arion://payment-result):
//      GET /api/mobile/billing/status/:checkoutId و بعد GET /api/mobile/me

export type MobileBillingDuration = "1" | "3" | "6" | "12";
export const MOBILE_BILLING_DURATIONS: MobileBillingDuration[] = ["1", "3", "6", "12"];

/** اسمِ ارائه‌دهنده‌ی پرداخت — فعلا فقط «web» (درگاهِ زیبال روی سایت) */
export type MobileBillingProviderKey = "web" | "bazaar" | "play";

export type MobileBillingPrice = {
  duration: MobileBillingDuration;
  /** مبلغِ لیست (ریال)، قبل از تخفیف/اعتبارِ ارتقا */
  amount: number;
  /** اگه ارتقا به مکس اعمال بشه: مبلغِ بعد از کسرِ اعتبار — وگرنه null */
  upgradeAmount: number | null;
  /** ارتقا: پایانِ واقعیِ دوره اگه زودتر از مدتِ خریداری‌شده تموم بشه */
  upgradeCapEnd: string | null;
};

export type MobileBillingPlan = {
  key: string;
  name: string;
  modules: string[];
  free: boolean;
  /** خالی برای پلنِ رایگان */
  prices: MobileBillingPrice[];
  /** اشتراکِ فعالِ کاربر روی همین پلنه */
  current: boolean;
};

export type MobileBillingPlansResponse = {
  plans: MobileBillingPlan[];
  subscription: { planKey: string; planName: string; status: "ACTIVE" | "TRIAL"; expiresAt: string } | null;
  provider: MobileBillingProviderKey;
  /** false یعنی درگاه روی سرور تنظیم نشده — دکمه‌ی خرید غیرفعال */
  checkoutAvailable: boolean;
};

export type MobileDiscountPreviewRequest = { planKey: string; code: string };
export type MobileDiscountPreviewResponse = { percentOff: number };

export type MobileCheckoutRequest = {
  planKey: string;
  duration: MobileBillingDuration;
  /** اختیاری — قبل از ساختِ ردیف دوباره سمتِ سرور اعتبارسنجی می‌شه */
  discountCode?: string;
};

export type MobileCheckoutResponse = {
  checkoutId: string;
  /** آدرسِ یک‌بارمصرفِ وب — فقط با مرورگرِ سیستم باز شه، ذخیره/لاگ نشه */
  checkoutUrl: string;
  /** بعد از این زمان آدرس دیگه کار نمی‌کنه (≤ ۱۰ دقیقه) */
  expiresAt: string;
  /** پیش‌نمایشِ مبلغ (ریال) — مبلغِ نهایی را صفحه‌ی پرداختِ وب از نو حساب می‌کنه */
  quotedAmount: number;
  discountPercent: number;
  /** کدِ تخفیفِ معتبر (نرمال‌شده) که کاربر باید توی صفحه‌ی پرداخت هم وارد کنه */
  discountCode: string | null;
};

/**
 * PENDING: آدرس ساخته شده، هنوز باز نشده
 * OPENED:  مرورگر آدرس رو مصرف کرده، منتظرِ نتیجه‌ی درگاه
 * PAID:    یک پرداختِ verify‌شده‌ی همین کاربر/پلن پیدا شد (منبع: جدولِ Payment)
 * EXPIRED: آدرس هیچ‌وقت باز نشد، یا بازه‌ی انتظار گذشت و پرداختی نیومد
 */
export type MobileCheckoutStatus = "PENDING" | "OPENED" | "PAID" | "EXPIRED";

export type MobileCheckoutStatusResponse = {
  checkoutId: string;
  status: MobileCheckoutStatus;
  planKey: string;
  duration: MobileBillingDuration;
  /** فقط وقتی PAID */
  paidAt: string | null;
  subscriptionExpiresAt: string | null;
  /** true یعنی هنوز ارزشِ دوباره‌پرسیدن داره (PENDING/OPENED) */
  final: boolean;
};

// ─── پشتیبانی ────────────────────────────────────────────────────────────
//
//   GET  /api/mobile/support/tickets               → MobileTicketsResponse
//   POST /api/mobile/support/tickets               → MobileTicketCreateResponse
//   GET  /api/mobile/support/tickets/:id           → MobileTicketDetailResponse
//   POST /api/mobile/support/tickets/:id/messages  → MobileTicketReplyResponse
//
// سقف‌ها و rate limit همون وبه (کلیدِ مشترک — مجموعِ وب+اپ). پیوست نداره
// (وب هم نداره).

export const SUPPORT_SUBJECT_MAX = 120;
export const SUPPORT_MESSAGE_MAX = 4000;

export type MobileTicketStatus = "OPEN" | "ANSWERED" | "CLOSED";

export type MobileTicketMessage = { id: string; body: string; fromAdmin: boolean; createdAt: string };

export type MobileTicketSummary = {
  id: string;
  subject: string;
  status: MobileTicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage: { body: string; fromAdmin: boolean; createdAt: string } | null;
};

export type MobileTicketsResponse = { tickets: MobileTicketSummary[] };
export type MobileTicketCreateRequest = { subject: string; message: string };
export type MobileTicketCreateResponse = { ticket: MobileTicketSummary };
export type MobileTicketDetailResponse = {
  ticket: Omit<MobileTicketSummary, "lastMessage"> & { messages: MobileTicketMessage[] };
};
export type MobileTicketReplyRequest = { message: string };
export type MobileTicketReplyResponse = { message: MobileTicketMessage; status: MobileTicketStatus };

// ─── اطلاعیه‌ها ──────────────────────────────────────────────────────────
//
//   GET  /api/mobile/notices        → MobileNoticesResponse
//   POST /api/mobile/notices/read   → { ids } یا { all: true } → MobileNoticesResponse
//
// اطلاعیه‌ها سمتِ سرور از دیتابیس ساخته می‌شن (خوش‌آمد، جوابِ تیکت،
// نزدیک‌شدنِ انقضای اشتراک/ماژول، خریدِ موفق). «خونده‌شده» توی همون
// UserSettingِ dismissedStaticNotifs ِ وب ذخیره می‌شه — خوندنِ خوش‌آمد روی
// گوشی روی وب هم می‌بندتش.

export type MobileNoticeKind = "welcome" | "ticket_answered" | "expiring" | "payment";

export type MobileNotice = {
  /** پایدار — تغییرِ محتوا (مثلا جوابِ تازه‌ی تیکت) یعنی id تازه */
  id: string;
  kind: MobileNoticeKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** مسیرِ داخلِ اپ برای باز کردن (مثلا /account/support/<id>) */
  href: string | null;
};

export type MobileNoticesResponse = { notices: MobileNotice[]; unreadCount: number };
export type MobileNoticesReadRequest = { ids?: string[]; all?: boolean };
