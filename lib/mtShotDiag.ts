// عیب‌یابی اسکرین ورود/خروج اکسپرت — منطق خالص (بدون دیتابیس) تا هم روت‌ها و
// هم پنل اتصال (کلاینت) ازش استفاده کنن.
//
// چرا لازمه: اسکرین در سه جای جدا می‌تونه گم بشه (ترمینال: باز شدن چارت موقت یا
// ChartScreenShot؛ شبکه: WebRequest؛ سرور: رد بدنه) و قبلا هیچ‌کدوم جایی ثبت
// نمی‌شد. اکسپرت 1.42 به بعد آخرین خطای خودش رو همراه sync می‌فرسته، سرور ردهای خودش رو
// ثبت می‌کنه، و نسخه‌ی اکسپرت ذخیره می‌شه تا پنل بگه «اکسپرتت قدیمیه».

import { tr } from "./i18n";

/** آخرین نسخه‌ی اکسپرت قابل دانلود (public/ea) — با #property version هر دو فایل یکی بمونه */
export const EA_LATEST_VERSION = "1.43";

/** نسخه‌ای که اکسپرت گزارش می‌ده → «1.42» یا null */
export function normalizeEaVersion(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return /^\d{1,2}\.\d{1,3}$/.test(s) ? s : null;
}

function versionParts(v: string): [number, number] {
  const [a, b] = v.split(".");
  return [Number(a) || 0, Number(b) || 0];
}

/** نسخه‌ی گزارش‌شده قدیمی‌تر از آخرین نسخه‌ست (یا اصلا گزارش نشده، یعنی قبل از 1.30) */
export function isEaOutdated(v: string | null | undefined, latest = EA_LATEST_VERSION): boolean {
  const n = normalizeEaVersion(v);
  if (!n) return true;
  const [a, b] = versionParts(n);
  const [la, lb] = versionParts(latest);
  return a < la || (a === la && b < lb);
}

/** متن خطا فقط ASCII چاپی و کوتاه — از ترمینال کاربر میاد و فقط به خودش نشون داده می‌شه */
export function cleanShotError(v: unknown): string | null {
  const s = String(v ?? "").replace(/[^\x20-\x7E]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return s || null;
}

export type EaShotReport = { enabled: boolean | null; error: string | null };

/** بخش `shots` بدنه‌ی sync اکسپرت 1.42 → فیلدهای قابل ذخیره */
export function normalizeEaShotReport(raw: unknown): EaShotReport {
  if (!raw || typeof raw !== "object") return { enabled: null, error: null };
  const r = raw as Record<string, unknown>;
  return {
    enabled: typeof r.on === "boolean" ? r.on : null,
    error: cleanShotError(r.err),
  };
}

/** خطا هنوز تازه‌ست؟ (بعد از آخرین اسکرینی که رسید ثبت شده) */
export function shotErrorIsCurrent(errorAt: string | Date | null | undefined, lastShotAt: string | Date | null | undefined): boolean {
  if (!errorAt) return false;
  if (!lastShotAt) return true;
  return new Date(errorAt).getTime() > new Date(lastShotAt).getTime();
}

/** توضیح کوتاه برای کد خطا (کد خام کنارش با فونت mono نشون داده می‌شه) */
export function shotErrorLabel(code: string): string {
  if (code.startsWith("server:")) return tr("سایت اسکرین را رد کرد", "The site rejected the screenshot");
  if (code.startsWith("chart_open")) return tr("متاتریدر نتوانست چارت موقت اسکرین را باز کند", "MetaTrader could not open the temporary screenshot chart");
  if (code.startsWith("screenshot") || code.startsWith("file_missing")) {
    return tr(
      "متاتریدر نتوانست از چارت اسکرین بگیرد. پنجره‌ی متاتریدر نباید مینیمایز باشد (روی VPS هم پنجره را باز بگذارید)",
      "MetaTrader could not take a screenshot of the chart. The MetaTrader window must not be minimized (on a VPS, keep the window open too)"
    );
  }
  if (code.startsWith("upload")) return tr("فرستادن اسکرین به سایت ناموفق بود", "Sending the screenshot to the site failed");
  return tr("خطای اسکرین", "Screenshot error");
}
