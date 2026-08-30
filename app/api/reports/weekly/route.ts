import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";

// GET /api/reports/weekly?offset=0  → offset=0 هفته‌ی جاری، -1 هفته‌ی قبل، ...
// هفته‌ی آینده (offset>0) مجاز نیست.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.AI_INSIGHT);
  if (!guard.ok) return guard.response;

  const rawOffset = Number(req.nextUrl.searchParams.get("offset") || "0");
  const offset = Number.isInteger(rawOffset) ? rawOffset : 0;
  if (offset > 0) return NextResponse.json({ error: "هفته‌ی آینده قابل‌انتخاب نیست" }, { status: 400 });

  // try/catch لازم است چون `getOrGenerateWeeklyReport` به گیت‌وی بیرونیِ AI
  // وصل می‌شود. بدونِ آن، هر خطایی (گیت‌وی در دسترس نیست، کلید تنظیم نشده،
  // تایم‌اوت) باعث می‌شد نکست یک صفحه‌ی **HTML** با کدِ ۵۰۰ برگرداند نه JSON؛
  // کلاینت هم روی `r.json()` خطا می‌خورد و می‌افتاد توی catchِ خودش و پیامِ
  // گمراه‌کننده‌ی «مشکلی در اتصال به سرور» را نشان می‌داد — انگار اینترنتِ
  // کاربر قطع است، در حالی که مشکل سمتِ سرور بود.
  try {
    const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { timezone: true } });
    const timezone = user?.timezone || "Asia/Tehran";

    const report = await getOrGenerateWeeklyReport(guard.userId, timezone, guard.isSuperAdmin, offset);
    return NextResponse.json({ report });
  } catch (e: any) {
    if (e?.message?.includes("ARVAN_AI")) {
      return NextResponse.json({ error: "سرویسِ هوش مصنوعی روی این سرور تنظیم نشده" }, { status: 503 });
    }
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      return NextResponse.json({ error: "ساختِ گزارش بیش از حد طول کشید — چند دقیقه دیگر دوباره امتحان کن" }, { status: 504 });
    }
    return NextResponse.json({ error: "ساختِ گزارش هفتگی ناموفق بود — اگر تکرار شد به پشتیبانی اطلاع بده" }, { status: 502 });
  }
}
