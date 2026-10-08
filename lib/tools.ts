// فهرست ابزارهای رایگان عمومی (هاب /tools، سایت‌مپ، ناوبری و llms از اینجا می‌خونن)
export type PublicTool = {
  path: string;
  label: string;
  description: string;
};

export const PUBLIC_TOOLS: PublicTool[] = [
  {
    path: "/tools/sleep-calculator",
    label: "محاسبه ساعت خواب",
    description: "بر اساس چرخه‌های 90 دقیقه‌ای خواب، بهترین ساعت خوابیدن یا بیدار شدن را پیدا کنید.",
  },
  {
    path: "/tools/calorie-calculator",
    label: "محاسبه کالری روزانه",
    description: "BMR، TDEE و کالری هدف برای کاهش وزن، حفظ یا افزایش وزن را با فرمول میفلین سنت جئور حساب کنید.",
  },
  {
    path: "/tools/bmi-calculator",
    label: "محاسبه BMI",
    description: "شاخص توده بدنی و بازه وزن سالم متناسب با قد خود را ببینید.",
  },
  {
    path: "/tools/lot-size-calculator",
    label: "محاسبه حجم لات فارکس",
    description: "حجم لات مناسب را بر اساس موجودی، درصد ریسک و حد ضرر به پیپ حساب کنید.",
  },
];

// آیکون هر ابزار در هاب (نام آیکون lucide)
export const TOOL_ICONS: Record<string, string> = {
  "/tools/sleep-calculator": "Moon",
  "/tools/calorie-calculator": "Flame",
  "/tools/bmi-calculator": "Scale",
  "/tools/lot-size-calculator": "Calculator",
};
