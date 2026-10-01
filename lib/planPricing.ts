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
  // مبلغ خام هر مدت به کوچک‌ترین واحد ارز (ریال)
  amounts?: Record<Duration, number>;
};

export const PLAN_PRICING_IRAN: PlanPricing[] = [
  // «روتین من» — 99 هزار تومان ماهانه (بعد از ۱۴ روز آزمایشی)، همون فرمول تخفیف بقیه
  { key: "basic", nameFa: "پلن روتین من", amounts: { "1": 990000, "3": 2600000, "6": 5200000, "12": 10400000 } },
  { key: "exercise", nameFa: "پلن بدنسازی", amounts: { "1": 1500000, "3": 3940000, "6": 7880000, "12": 15750000 } },
  // ۱۷۵ هزار تومان ماهانه؛ ۳/۶/۱۲ ماهه با همون فرمول بقیه‌ی پلن‌ها:
  // ماه × قیمت ماهانه × ۰.۸۷۵ (تخفیف ۱۲.۵٪)، گردشده به نزدیک‌ترین هزار تومان.
  { key: "trade", nameFa: "پلن ترید", amounts: { "1": 1750000, "3": 4590000, "6": 9190000, "12": 18380000 } },
  { key: "max", nameFa: "پلن مکس", amounts: { "1": 2500000, "3": 6560000, "6": 13130000, "12": 26250000 } },
];

export function findPlanPricing(key: string): PlanPricing | undefined {
  return PLAN_PRICING_IRAN.find((p) => p.key === key);
}
