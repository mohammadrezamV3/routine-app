import { tr } from "./i18n";
// فهرست ابزارهای رایگان عمومی (هاب /tools، سایت‌مپ، ناوبری و llms از اینجا می‌خونن)
export type PublicTool = {
  path: string;
  label: string;
  description: string;
  labelEn: string;
  descriptionEn: string;
};

export const PUBLIC_TOOLS: PublicTool[] = [
  {
    path: "/tools/sleep-calculator",
    label: "محاسبه ساعت خواب",
    description: "بر اساس چرخه‌های 90 دقیقه‌ای خواب، بهترین ساعت خوابیدن یا بیدار شدن را پیدا کنید.",
    labelEn: "Sleep time calculator",
    descriptionEn: "Find the best time to go to sleep or wake up based on 90-minute sleep cycles.",
  },
  {
    path: "/tools/calorie-calculator",
    label: "محاسبه کالری روزانه",
    description: "BMR، TDEE و کالری هدف برای کاهش وزن، حفظ یا افزایش وزن را با فرمول میفلین سنت جئور حساب کنید.",
    labelEn: "Daily calorie calculator",
    descriptionEn: "Work out BMR, TDEE and your target calories for losing, maintaining or gaining weight using the Mifflin-St Jeor formula.",
  },
  {
    path: "/tools/bmi-calculator",
    label: "محاسبه BMI",
    description: "شاخص توده بدنی و بازه وزن سالم متناسب با قد خود را ببینید.",
    labelEn: "BMI calculator",
    descriptionEn: "See your body mass index and the healthy weight range for your height.",
  },
  {
    path: "/tools/lot-size-calculator",
    label: "محاسبه حجم لات فارکس",
    description: "حجم لات مناسب را بر اساس موجودی، درصد ریسک و حد ضرر به پیپ حساب کنید.",
    labelEn: "Forex lot size calculator",
    descriptionEn: "Work out the right lot size from your balance, risk percentage and stop loss in pips.",
  },
];

// آیکون هر ابزار در هاب (نام آیکون lucide)
export const TOOL_ICONS: Record<string, string> = {
  "/tools/sleep-calculator": "Moon",
  "/tools/calorie-calculator": "Flame",
  "/tools/bmi-calculator": "Scale",
  "/tools/lot-size-calculator": "Calculator",
};

export function toolLabel(t: PublicTool): string {
  return tr(t.label, t.labelEn);
}

export function toolDescription(t: PublicTool): string {
  return tr(t.description, t.descriptionEn);
}
