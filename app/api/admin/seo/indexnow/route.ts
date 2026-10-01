import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { submitUrlsToIndexNow } from "@/lib/indexNow";
import { writeAuditLog } from "@/lib/adminAnalytics";
import sitemap from "@/app/sitemap";

// همه‌ی URLهای sitemap.ts (منبع واحد صفحات عمومی — همون‌جایی که کراولرهای
// معمولی هم می‌خونن) رو به IndexNow می‌فرسته تا Bing/Yandex زودتر از
// کراول دوره‌ای بفهمن این صفحه‌ها هستن/تغییر کردن.
export async function POST() {
  const guard = await requireAdmin("settings");
  if (!guard.ok) return guard.response;

  const urls = sitemap().map((entry) => entry.url);
  // خطای شبکه (DNS/timeout) از fetch داخل submitUrlsToIndexNow throw
  // می‌شه — بدون این catch پاسخ ۵۰۰ بی‌پیام به پنل می‌رسید.
  const result = await submitUrlsToIndexNow(urls).catch(() => ({ ok: false, status: 0, submitted: 0, error: "اتصال به IndexNow برقرار نشد" }));
  if (!result.ok) {
    const error = result.error || `ارسال به IndexNow ناموفق بود (کد ${result.status})`;
    return NextResponse.json({ error, status: result.status }, { status: 502 });
  }

  await writeAuditLog(guard.userId, "seo.indexnow_submit", "Sitemap", undefined, { submitted: result.submitted });
  return NextResponse.json({ ok: true, submitted: result.submitted });
}
