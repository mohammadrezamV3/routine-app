import { SITE_URL } from "./seo";

/**
 * IndexNow — پروتکل رایگان ایندکس فوری (Bing/Yandex؛ Bing نتایجش را به
 * Copilot/ChatGPT search هم می‌دهد). با یک POST به api.indexnow.org،
 * لیست URLها را «همین الان عوض شده» اعلام می‌کنیم به‌جای منتظرِ کراولِ
 * دوره‌ایِ خودشان ماندن.
 *
 * کلید باید هم در env (`INDEXNOW_KEY`) باشد هم در مسیر
 * `/indexnow-key.txt` قابل‌دسترسی — سرویس قبل از قبول‌کردن submit، خودش
 * این فایل را می‌خواند تا مطمئن شود دامنه واقعا مالِ همین کلید است.
 */

export function indexNowKey(): string | null {
  return process.env.INDEXNOW_KEY || null;
}

export function indexNowKeyLocation(): string {
  return `${SITE_URL}/indexnow-key.txt`;
}

export type IndexNowResult = { ok: boolean; status: number; submitted: number; error?: string };

export async function submitUrlsToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = indexNowKey();
  if (!key) return { ok: false, status: 0, submitted: 0, error: "INDEXNOW_KEY تنظیم نشده است" };
  if (!urls.length) return { ok: false, status: 0, submitted: 0, error: "هیچ آدرسی برای ارسال وجود ندارد" };

  const host = new URL(SITE_URL).host;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: indexNowKeyLocation(),
      urlList: urls,
    }),
  });

  // ۲۰۰/۲۰۲ یعنی پذیرفته شد؛ IndexNow خودش گزارش «ایندکس شد یا نه» پس
  // نمی‌دهد، فقط تاییدِ دریافت درخواست را می‌دهد.
  return { ok: res.ok, status: res.status, submitted: res.ok ? urls.length : 0 };
}
