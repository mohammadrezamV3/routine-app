import { NextRequest, NextResponse } from "next/server";
import { zibalVerify } from "@/lib/zibal";

// زیبال کاربر رو با GET به همین آدرس ریدایرکت می‌کنه
export async function GET(req: NextRequest) {
  const trackId = req.nextUrl.searchParams.get("trackId");
  const success = req.nextUrl.searchParams.get("success");
  const base = process.env.NEXT_PUBLIC_BASE_URL;

  if (success !== "1" || !trackId) {
    return NextResponse.redirect(`${base}/payment/failed`);
  }

  const result = await zibalVerify(Number(trackId));

  if (!result.ok) {
    return NextResponse.redirect(`${base}/payment/failed?msg=${encodeURIComponent(result.message)}`);
  }

  // اینجا وضعیت سفارش رو تو دیتابیس (prisma) آپدیت کن، مثلا با refNumber

  return NextResponse.redirect(`${base}/payment/success?ref=${result.refNumber}`);
}
