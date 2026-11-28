import { NextRequest, NextResponse } from "next/server";
import { searchFoods } from "@/lib/foodCatalogServer";
import { clampQuery } from "@/lib/validate";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// این روت عمدا بدون لاگین کار می‌کنه (فهرست غذاها داده‌ی عمومی و ثابتیه،
// نه داده‌ی کاربر) — ولی `q` باید بریده بشه، وگرنه یه رشته‌ی چندصدکیلوبایتی
// روی هر آیتم فهرست یه indexOf اجرا می‌کرد. ورودی فارسی و لاتین هر دو سمت
// سرور جستجو می‌شن و هر نتیجه `nameEn` داره (کاتالوگ هیچ‌وقت به کلاینت نمیاد).
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  return NextResponse.json({ results: searchFoods(clampQuery(req.nextUrl.searchParams.get("q"), 60)) });
}
