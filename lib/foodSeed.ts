export type FoodSeedItem = { name: string; caloriesPer100g: number };

// دیتابیس کوچک و داخلی غذاها (به ازای هر ۱۰۰ گرم) — برای غذاهای رایج کافیه؛
// برای بقیه، کاربر از پنل کالری می‌تونه کالری هر ۱۰۰ گرم رو دستی وارد کنه
// (CaloriePanel.tsx). اگه در آینده خواستیم دقیق‌تر بشیم، این لیست باید با یک
// منبع رسمی‌تر (مثل USDA) جایگزین/تکمیل بشه.
export const FOOD_SEED: FoodSeedItem[] = [
  { name: "برنج پخته", caloriesPer100g: 130 },
  { name: "نان لواش", caloriesPer100g: 280 },
  { name: "سینه مرغ گریل", caloriesPer100g: 165 },
  { name: "گوشت قرمز کبابی", caloriesPer100g: 250 },
  { name: "تخم‌مرغ آب‌پز", caloriesPer100g: 155 },
  { name: "ماست کم‌چرب", caloriesPer100g: 60 },
  { name: "پنیر لاکتیک", caloriesPer100g: 260 },
  { name: "خیار", caloriesPer100g: 15 },
  { name: "گوجه‌فرنگی", caloriesPer100g: 18 },
  { name: "موز", caloriesPer100g: 89 },
  { name: "سیب", caloriesPer100g: 52 },
  { name: "بادام", caloriesPer100g: 579 },
  { name: "گردو", caloriesPer100g: 654 },
  { name: "عدس پخته", caloriesPer100g: 116 },
  { name: "نخود پخته", caloriesPer100g: 164 },
  { name: "سیب‌زمینی پخته", caloriesPer100g: 87 },
  { name: "ماهی سالمون گریل", caloriesPer100g: 208 },
  { name: "نان سنگک", caloriesPer100g: 260 },
  { name: "روغن زیتون", caloriesPer100g: 884 },
  { name: "شکلات تلخ", caloriesPer100g: 546 },
  { name: "جو دوسر خام", caloriesPer100g: 389 },
  { name: "شیر کم‌چرب", caloriesPer100g: 42 },
  { name: "کره بادام‌زمینی", caloriesPer100g: 588 },
  { name: "برنج قهوه‌ای پخته", caloriesPer100g: 111 },
  { name: "سبزیجات بخارپز", caloriesPer100g: 35 },
];

export function searchFoodSeed(query: string): FoodSeedItem[] {
  const q = query.trim();
  if (!q) return FOOD_SEED.slice(0, 8);
  return FOOD_SEED.filter((f) => f.name.indexOf(q) !== -1).slice(0, 8);
}
