// جستجو و نام انگلیسی غذاها، فقط سمت سرور. کاتالوگ (~25 هزار آیتم) تنبل و یک بار
// پارس می‌شه و هیچ‌وقت نباید وارد باندل کلاینت بشه (قانون «دیتای بزرگ در کلاینت نه»).
import { FOOD_SEED, searchFoodSeed, type FoodSeedItem } from "./foodSeed";
import { foodNameEnOf, searchFoodNamesEn } from "./foodNamesEn";

export type FoodSearchResult = FoodSeedItem & { nameEn?: string };

let byName: Map<string, FoodSeedItem> | null = null;

/** نتیجه‌ی جستجو با nameEn؛ ورودی لاتین روی نام انگلیسی، وگرنه فارسی (نام و مترادف). */
export function searchFoods(query: string, limit = 10): FoodSearchResult[] {
  let items: FoodSeedItem[];
  if (/[a-z]/i.test(query)) {
    byName ||= new Map(FOOD_SEED.map((f) => [f.name, f]));
    items = searchFoodNamesEn(query, limit).map((n) => byName!.get(n)).filter((f): f is FoodSeedItem => !!f);
  } else {
    items = searchFoodSeed(query, limit);
  }
  return items.map((f) => {
    const nameEn = foodNameEnOf(f.name);
    return nameEn ? { ...f, nameEn } : f;
  });
}

/** به هر ردیف دارای customName، nameEn (جستجوی O(1) با نام فارسی ذخیره‌شده) اضافه می‌کنه. */
export function withFoodNameEn<T extends { customName: string | null }>(rows: T[]): (T & { nameEn?: string })[] {
  return rows.map((r) => {
    const nameEn = (r.customName ? foodNameEnOf(r.customName) : undefined);
    return nameEn ? { ...r, nameEn } : r;
  });
}
