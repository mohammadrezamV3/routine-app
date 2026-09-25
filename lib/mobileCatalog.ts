import { createHash } from "crypto";
import { FOOD_SEED } from "@/lib/foodSeed";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";

// دیتای مرجعِ فقط‌خواندنیِ اپ موبایل (GET /api/mobile/catalog). همون منابعی
// که وب استفاده می‌کنه: فهرستِ غذای lib/foodSeed.ts (جدولِ FoodItem توی کد
// استفاده نمی‌شه) و کاتالوگِ حرکاتِ lib/exerciseCatalog.ts. هر دو فایلِ ثابتِ
// کدن، پس هشِ بخشِ ثابت یک‌بار به‌ازای هر پروسه حساب می‌شه.

let staticPart: { foods: unknown; exercises: unknown; hash: string } | null = null;

export function catalogStaticPart() {
  if (!staticPart) {
    const foods = FOOD_SEED.map((f) => ({ name: f.name, caloriesPer100g: f.caloriesPer100g }));
    const exercises = EXERCISE_CATALOG.map((e) => ({
      name: e.name,
      muscleGroup: e.muscleGroup,
      muscleKeys: e.muscleKeys,
      pattern: e.pattern,
      howTo: e.howTo,
      benefits: e.benefits,
    }));
    staticPart = { foods, exercises, hash: sha(JSON.stringify({ foods, exercises })) };
  }
  return staticPart;
}

export function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** نسخه = هشِ بخشِ ثابت + فهرستِ عکس‌ها (با updatedAt) — هر تغییری ETag رو عوض می‌کنه */
export function catalogVersion(staticHash: string, media: { key: string; updatedAt: string }[] | null): string {
  return sha(staticHash + "|" + JSON.stringify(media)).slice(0, 32);
}

/** If-None-Match می‌تونه چند مقدار یا W/ داشته باشه */
export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === "*") return true;
  return ifNoneMatch.split(",").some((v) => v.trim().replace(/^W\//, "") === etag);
}
