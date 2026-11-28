import { NextRequest, NextResponse } from "next/server";
import { searchFoods } from "@/lib/foodCatalogServer";
import { normalizeQuery } from "@/lib/guard/queryNormalize";
import { LruTtlCache } from "@/lib/guard/lruCache";
import type { FoodSearchResult } from "@/lib/foodCatalogServer";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { withGuard } from "@/lib/requestGuard";

// این روت عمدا بدون لاگین کار می‌کنه (فهرست غذاها داده‌ی عمومی و ثابتیه،
// نه داده‌ی کاربر) — ولی `q` باید بریده بشه، وگرنه یه رشته‌ی چندصدکیلوبایتی
// روی هر آیتم فهرست یه indexOf اجرا می‌کرد. ورودی فارسی و لاتین هر دو سمت
// سرور جستجو می‌شن و هر نتیجه `nameEn` داره (کاتالوگ هیچ‌وقت به کلاینت نمیاد).
// کش کوتاه‌مدت پاسخ جستجوهای یکسان (داده‌ی ثابت و عمومی؛ سقف اندازه + 60 ثانیه).
// کلید همون رشته‌ی نرمال‌شده‌ست، پس تایپ‌های تکراری/هم‌زمان کاربرها هزینه‌ی اسکن کاتالوگ رو نمی‌دن.
const cache = new LruTtlCache<FoodSearchResult[]>(500, 60_000);

async function handleGET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  // خالی مجازه (فهرست پیش‌فرض ارزان)، یک حرف هم؛ رشته‌ی بیمارگونه نتیجه‌ی خالیه نه خطا
  const n = normalizeQuery(req.nextUrl.searchParams.get("q"), { min: 0, max: 60 });
  if (!n.ok) return NextResponse.json({ results: [] });
  let results = cache.get(n.q);
  if (!results) { results = searchFoods(n.q); cache.set(n.q, results); }
  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=30" } });
}

export const GET = withGuard({ policy: "search", scope: "food" }, handleGET);
