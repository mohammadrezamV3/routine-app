import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { mediaKey } from "@/lib/exerciseMedia";

// خواندنِ عکسِ حرکات برای خودِ کاربر (کاتالوگِ «مشاهده حرکات»).
//
// دو شکل دارد و عمداً هم:
//   • بدونِ پارامتر → فقط *فهرستِ کلیدها*، چند کیلوبایت. کلاینت با همین
//     می‌فهمد کدام حرکت عکس دارد، بدونِ دانلودِ هیچ عکسی.
//   • با ?name= → همان یک عکس. یعنی عکس فقط وقتی دانلود می‌شود که کاربر
//     واقعاً کارتِ آن حرکت را باز کند.
// فرستادنِ همه‌ی عکس‌ها در یک پاسخ ده‌ها مگابایت می‌شد.

export async function GET(req: NextRequest) {
  const guard = await requireModule("EXERCISE");
  if (!guard.ok) return guard.response;

  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    const rows = await prisma.exerciseMedia.findMany({ select: { nameKey: true } });
    return NextResponse.json({ keys: rows.map((r) => r.nameKey) });
  }

  const row = await prisma.exerciseMedia.findUnique({
    where: { nameKey: mediaKey(name) },
    select: { dataUrl: true },
  });
  return NextResponse.json({ dataUrl: row?.dataUrl ?? null });
}
