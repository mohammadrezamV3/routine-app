// جدول قیمت خام پلن‌ها — منبع واحد برای چک‌اوت/پرداخت سمت سرور (بدون
// وابستگی به کامپوننت کلاینتی PlanShowcase که همین اعداد رو برای نمایش
// هم داره؛ عمدا دو فایل جدا چون PlanShowcase شامل JSX (آیکون‌ها)ست و
// نباید توی روت سرور import بشه. اگه قیمتی اینجا عوض شد، حتما همون عدد
// توی components/PlanShowcase.tsx (فیلد amounts) هم باید هم‌زمان عوض بشه.

export type Duration = "1" | "3" | "6" | "12";
export const DURATIONS: Duration[] = ["1", "3", "6", "12"];

export type PlanPricing = {
  key: string;
  nameFa: string;
  free?: boolean;
  // مبلغ خام هر مدت به کوچک‌ترین واحد ارز (ریال برای ایران، سنت برای بین‌المللی)
  amounts?: Record<Duration, number>;
};

export const PLAN_PRICING_IRAN: PlanPricing[] = [
  { key: "basic", nameFa: "پلن پایه", free: true },
  { key: "exercise", nameFa: "پلن بدنسازی", amounts: { "1": 1500000, "3": 3940000, "6": 7880000, "12": 15750000 } },
  { key: "trade", nameFa: "پلن ترید", amounts: { "1": 1500000, "3": 3940000, "6": 7880000, "12": 15750000 } },
  { key: "max", nameFa: "پلن مکس", amounts: { "1": 2500000, "3": 6560000, "6": 13130000, "12": 26250000 } },
];

export const PLAN_PRICING_INTL: PlanPricing[] = [
  { key: "basic", nameFa: "Basic", free: true },
  { key: "exercise", nameFa: "Plan Gym", amounts: { "1": 799, "3": 2097, "6": 4195, "12": 8390 } },
  { key: "trade", nameFa: "Plan Trader", amounts: { "1": 1299, "3": 3410, "6": 6820, "12": 13640 } },
  { key: "max", nameFa: "Plan Max", amounts: { "1": 1799, "3": 4722, "6": 9445, "12": 18890 } },
];

export function findPlanPricing(key: string, isIntl: boolean): PlanPricing | undefined {
  return (isIntl ? PLAN_PRICING_INTL : PLAN_PRICING_IRAN).find((p) => p.key === key);
}
