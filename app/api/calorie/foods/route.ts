import { NextRequest, NextResponse } from "next/server";
import { searchFoodSeed } from "@/lib/foodSeed";
import { clampQuery } from "@/lib/validate";

// این روت عمداً بدونِ لاگین کار می‌کنه (فهرستِ غذاها داده‌ی عمومی و ثابتیه،
// نه داده‌ی کاربر) — ولی `q` باید بریده بشه، وگرنه یه رشته‌ی چندصدکیلوبایتی
// روی هر آیتمِ فهرست یه indexOf اجرا می‌کرد.
export async function GET(req: NextRequest) {
  return NextResponse.json({ results: searchFoodSeed(clampQuery(req.nextUrl.searchParams.get("q"), 60)) });
}
