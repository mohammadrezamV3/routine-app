import { NextResponse } from "next/server";

// عمداً به دیتابیس دست نمی‌زنه: این روت باید *فقط* بگه «پروسه‌ی Node زنده‌ست
// و event loop بلاک نشده». اگه به Postgres وصل می‌شد، یه دیتابیسِ کند باعث
// می‌شد healthcheckِ داکر هم fail بشه و کانتینرِ سالم بی‌دلیل ری‌استارت بخوره.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    // مصرفِ حافظه‌ی همین پروسه (مگابایت) — برای وقتی که باید بفهمیم کندی از
    // نشتیِ حافظه/نزدیک‌شدن به سقفِ کانتینره یا نه.
    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
}
