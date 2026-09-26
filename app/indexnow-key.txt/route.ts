import { indexNowKey } from "@/lib/indexNow";

// IndexNow قبل از قبول‌کردنِ submit، این فایل رو می‌خونه تا مطمئن بشه
// دامنه واقعا مالِ همین کلیده. محتوای فایل باید *دقیقا* همون کلید باشه،
// بدون هیچ کاراکتر اضافه.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = indexNowKey();
  if (!key) return new Response("", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
