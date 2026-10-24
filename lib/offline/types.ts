// قرارداد مشترک حالت آفلاین — بین هسته‌ی کلاینت (lib/offline/*)، سرویس‌ورکر
// (public/sw.js)، سرور (idempotency) و UI (نشانگر آفلاین). بدون هماهنگی همه‌ی
// بخش‌ها عوضش نکن. هیچ import سروری یا ری‌اکتی این‌جا نیست.

/** هدر شناسه‌ی یکتای هر درخواست نوشتنی؛ سرور ساخت تکراری با همین شناسه رو دوباره انجام نمی‌ده */
export const REQUEST_ID_HEADER = "x-arion-request-id";

/** هدر پاسخ‌هایی که از دستگاه اومدن نه سرور: "cache" = آخرین نسخه‌ی ذخیره‌شده، "queued" = نوشتن در صف */
export const OFFLINE_HEADER = "x-arion-offline";
export type OfflineSource = "cache" | "queued";

/** یک نوشتن در صف (IndexedDB، به تفکیک کاربر) که با برگشتن اینترنت به ترتیب فرستاده می‌شه */
export type OutboxItem = {
  id: string;
  userId: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  body: string | null;
  /** همون مقدار هدر REQUEST_ID_HEADER */
  requestId: string;
  createdAt: number;
  attempts: number;
  /** برچسب انسانی برای پیام خطا (با tr ساخته می‌شه) */
  label?: string;
};

export type OfflineSyncError = { label: string; message: string; at: number };

export type OfflineStatus = {
  /** وضعیت واقعی شبکه (نه فقط navigator.onLine: آخرین تلاش ناموفق هم حساب می‌شه) */
  online: boolean;
  /** تعداد نوشتن‌های منتظر ارسال */
  pending: number;
  /** در حال فرستادن صف */
  syncing: boolean;
  /** آخرین نوشتنی که سرور رد کرد (مثلا 400/403) و از صف حذف شد */
  lastError: OfflineSyncError | null;
};

/** پیام‌های کلاینت به سرویس‌ورکر */
export type SwMessage =
  /** کاربر فعلی (یا null برای مهمان)؛ صفحه‌های کش‌شده فقط برای همین کاربر سرو می‌شن */
  | { type: "arion-user"; userId: string | null }
  /** پاک کردن همه‌ی کش‌های خصوصی کاربر (خروج یا عوض‌شدن هویت) */
  | { type: "arion-wipe" }
  /** گرم کردن پوسته‌ی صفحه‌های اصلی برای اولین باز شدن آفلاین */
  | { type: "arion-warm-shell"; urls: string[] };
