// دیتای نمایشی (mock) برای صفحه‌ی پیش‌نمایشِ داشبورد (app/dashboard) — این
// صفحه یک کلونِ پیکسل‌محورِ یک طرحِ داده‌شده‌ست، نه یک فیچرِ واقعیِ متصل به
// دیتابیس؛ مدل‌هایی مثل «اعضای تیم» و «حال روزانه» توی اسکیمای این پروژه
// اصلاً وجود ندارن (این یک اپ شخصیه، نه تیمی)، پس عمداً این‌جا mock موندن.

export type DashCategory =
  | "mind" | "fitness" | "growth" | "learning" | "projects" | "entertainment" | "planning";

export const CATEGORY_LABELS: Record<DashCategory, string> = {
  mind: "سلامت ذهن",
  fitness: "سلامت جسم",
  growth: "رشد فردی",
  learning: "یادگیری",
  projects: "کار و پروژه",
  entertainment: "سرگرمی",
  planning: "برنامه‌ریزی",
};

// رنگ هر دسته دقیقاً طبق طیفِ خواسته‌شده — سبز/آبی/بنفش/زرد/آبی/صورتی/سیان
export const CATEGORY_COLORS: Record<DashCategory, { text: string; bg: string; border: string }> = {
  mind: { text: "#2EE66B", bg: "rgba(46,230,107,.12)", border: "rgba(46,230,107,.25)" },
  fitness: { text: "#3B82F6", bg: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.25)" },
  growth: { text: "#A855F7", bg: "rgba(168,85,247,.12)", border: "rgba(168,85,247,.25)" },
  learning: { text: "#F5C518", bg: "rgba(245,197,24,.12)", border: "rgba(245,197,24,.25)" },
  projects: { text: "#3B82F6", bg: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.25)" },
  entertainment: { text: "#EC4899", bg: "rgba(236,72,153,.12)", border: "rgba(236,72,153,.25)" },
  planning: { text: "#22D3EE", bg: "rgba(34,211,238,.12)", border: "rgba(34,211,238,.25)" },
};

export type DashTask = {
  id: string;
  time: string;
  title: string;
  category: DashCategory;
  done: boolean;
};

export const DASH_TASKS: DashTask[] = [
  { id: "t1", time: "07:30", title: "مدیتیشن صبحگاهی", category: "mind", done: true },
  { id: "t2", time: "08:30", title: "ورزش و تمرین", category: "fitness", done: true },
  { id: "t3", time: "10:00", title: "مطالعه کتاب", category: "growth", done: true },
  { id: "t4", time: "12:30", title: "یادگیری زبان انگلیسی", category: "learning", done: false },
  { id: "t5", time: "16:00", title: "پروژه شخصی", category: "projects", done: false },
  { id: "t6", time: "18:30", title: "خوندن", category: "entertainment", done: false },
  { id: "t7", time: "20:00", title: "برنامه‌ریزی فردا", category: "planning", done: false },
  { id: "t8", time: "22:30", title: "بدون موبایل قبل خواب", category: "mind", done: false },
];

export type DashTeamMember = {
  id: string;
  name: string;
  initial: string;
  color: string;
  pct: number;
  completed: number;
  total: number;
};

// آواتار به‌جای عکسِ خارجی (وابسته به شبکه)، دایره‌ی رنگی با حرفِ اول اسمه —
// مستقل از هر سرویسِ بیرونی و همیشه قابل‌اعتماد رندر می‌شه.
export const DASH_TEAM: DashTeamMember[] = [
  { id: "m1", name: "علی رضایی", initial: "ع", color: "#3B82F6", pct: 80, completed: 12, total: 15 },
  { id: "m2", name: "مریم احمدی", initial: "م", color: "#EC4899", pct: 60, completed: 9, total: 15 },
  { id: "m3", name: "سارا محمدی", initial: "س", color: "#A855F7", pct: 50, completed: 7, total: 14 },
  { id: "m4", name: "امیر حسینی", initial: "ا", color: "#F59E0B", pct: 70, completed: 11, total: 14 },
];

export type DashReminder = {
  id: string;
  icon: "calendar" | "bell";
  title: string;
  subtitle: string;
};

export const DASH_REMINDERS: DashReminder[] = [
  { id: "r1", icon: "calendar", title: "جلسه تیمی", subtitle: "فردا ساعت ۱۰:۰۰" },
  { id: "r2", icon: "bell", title: "ارسال گزارش", subtitle: "پس‌فردا ساعت ۱۴:۰۰" },
];

export type DashWeeklyStat = { dayShort: string; pct: number };

export const DASH_WEEKLY_STATS: DashWeeklyStat[] = [
  { dayShort: "ش", pct: 45 },
  { dayShort: "ی", pct: 62 },
  { dayShort: "د", pct: 38 },
  { dayShort: "س", pct: 30 },
  { dayShort: "چ", pct: 100 },
  { dayShort: "پ", pct: 20 },
  { dayShort: "ج", pct: 12 },
];

export type DashMood = "awful" | "bad" | "okay" | "good" | "great";

export const DASH_MOOD_OPTIONS: { key: DashMood; label: string }[] = [
  { key: "awful", label: "خیلی بد" },
  { key: "bad", label: "بد" },
  { key: "okay", label: "معمولی" },
  { key: "good", label: "خوب" },
  { key: "great", label: "عالی" },
];

export type DashDay = { key: string; weekday: string; dateLabel: string };

// ۷ روزِ نمایشیِ هفته با تاریخ شمسی ثابت (پیش‌نمایش بصری، نه تاریخ زنده)
export const DASH_WEEK_DAYS: DashDay[] = [
  { key: "sat", weekday: "شنبه", dateLabel: "۱۰ مرداد" },
  { key: "sun", weekday: "یکشنبه", dateLabel: "۱۱ مرداد" },
  { key: "mon", weekday: "دوشنبه", dateLabel: "۱۲ مرداد" },
  { key: "tue", weekday: "سه‌شنبه", dateLabel: "۱۳ مرداد" },
  { key: "wed", weekday: "چهارشنبه", dateLabel: "۱۴ مرداد" },
  { key: "thu", weekday: "پنجشنبه", dateLabel: "۱۵ مرداد" },
  { key: "fri", weekday: "جمعه", dateLabel: "۱۶ مرداد" },
];
