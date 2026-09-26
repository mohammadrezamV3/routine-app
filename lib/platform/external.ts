// درز پلتفرم برای «رفتن به یک آدرس بیرونی» (مثلا درگاه پرداخت).
// وب: همون ناوبری کامل صفحه (window.location.href). اپ موبایل این ماژول رو
// در بیلد خودش با نسخه‌ای جایگزین می‌کنه که handoff پرداخت/مرورگر سیستم رو
// باز می‌کنه — پس صفحه‌ها فقط همین تابع رو صدا بزنن، نه window.location مستقیم.
export function openExternalUrl(url: string): void {
  window.location.href = url;
}
