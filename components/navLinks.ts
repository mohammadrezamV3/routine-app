// منبع واحد لینک‌های ناوبری سایت — هم کشوی همبرگری (NavDrawerContent) هم
// منوی افقی دسکتاپ انگلیسی (DesktopNav) از همین‌جا می‌خونن، تا فیلتر فلگ‌ها،
// قفل ماژول و ترتیب همیشه یکی بمونه. بدون JSX و بدون وابستگی سنگین.
import { featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { tr } from "@/lib/i18n";
import type { SectionKey } from "@/lib/sections";

// module: اگه ست بشه، یعنی این آیتم پولیه — اگه کاربر دسترسی فعال به این
// ماژول رو نداشته باشه، کنار لیبلش یه آیکون قفل نشون داده می‌شه (فقط
// نشانه‌ست، enforcement واقعی همچنان سمت سرور/ModuleGate انجام می‌شه).
// feature: روشن/خاموش از پنل ادمین (lib/featureFlags.ts) — خاموش یعنی از منو مخفی.
// sections: فقط روی این زیردامنه‌ها (lib/sections.ts) دیده می‌شه؛ ندادن = همه‌ی بخش‌ها.
// دامنه‌ی اصلی (section = null) همیشه همه‌چیز رو می‌بینه.
export type NavLink = { href: string; label: string; icon: string; module?: string; feature?: FeatureKey; sections?: SectionKey[] };
export type NavGroup = { label: string; icon: string; children: NavLink[]; module?: string; feature?: FeatureKey; sections?: SectionKey[] };
export type NavItem = NavLink | NavGroup;

export function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

// «صفحه اصلی» قدیمی (/) دیگه توی منو نیست — کاربر لاگین‌کرده مستقیم به
// داشبورد می‌ره. «بدنسازی» و «منتورها» با کلیک زیرمجموعه‌هاشون باز می‌شن؛
// ترید زیرمنو نداره و با یک کلیک مستقیم می‌ره به هاب خودش.
export const getLinks = (): NavItem[] => [
  // داشبورد — نمای کلی همه‌ی بخش‌ها و صفحه‌ی اصلی بعد از ورود؛ پشت فلگ `dashboard` (پیش‌فرض روشن برای همه)
  { href: "/dashboard", label: tr("داشبورد", "Dashboard"), icon: "dashboard", feature: "dashboard" },
  // «روتین من»: برنامه‌ی روزانه و خواب دو صفحه و سیستم کاملا جدا، فقط در منو کنار هم
  {
    label: tr("روتین من", "My Routine"), icon: "weekly", sections: ["routine", "workout"],
    children: [
      { href: "/weekly", label: tr("برنامه روزانه", "Daily plan"), icon: "weekly", feature: "routine", sections: ["routine"] },
      { href: "/sleep", label: tr("خواب", "Sleep"), icon: "sleep", module: "SLEEP", feature: "sleep", sections: ["routine", "workout"] },
    ],
  },
  { href: "/roadmaps", label: tr("رودمپ‌ها", "Roadmaps"), icon: "roadmaps", feature: "roadmaps", sections: ["routine"] },
  // منتورها درست زیر رودمپ‌ها. گروه فقط صفحه‌های سمت شاگرد را دارد؛
  // «پنل منتور» در پاپ‌آپ پروفایل است. آیکون زیرمجموعه‌ها در داده هست ولی
  // زیرمجموعه‌های منو آیکون رندر نمی‌کنند (globals.css → .nav-link-sub-item).
  {
    label: tr("مربی‌ها", "Mentors"), icon: "mentors", feature: "mentors",
    children: [
      { href: "/mentors", label: tr("مربی‌ها", "Mentors"), icon: "mentorsDiscover" },
      { href: "/mentorship", label: tr("مربی‌های من", "My mentors"), icon: "mentorsMine" },
    ],
  },
  {
    label: tr("بدنسازی", "Workout"), icon: "exercise", sections: ["workout"],
    children: [
      { href: "/exercise?tab=exercise", label: tr("برنامه تمرینی", "Workout plan"), icon: "exercise", module: "EXERCISE", feature: "exercise", sections: ["workout"] },
      { href: "/exercise?tab=calorie", label: tr("کالری‌شمار", "Calorie tracker"), icon: "food", module: "CALORIE", feature: "calorie", sections: ["workout"] },
    ],
  },
  { href: "/trade", label: tr("ترید", "Trading"), icon: "trade", module: "TRADE", feature: "trade", sections: ["trade"] },
  { href: "/analysis/weekly", label: tr("آنالیز هفتگی", "Weekly review"), icon: "weeklyReport", module: "AI_INSIGHT", feature: "weeklyAnalysis" },
  { href: "/blog", label: tr("مقاله‌ها", "Articles"), icon: "blog", feature: "blog" },
  { href: "/about", label: tr("درباره ما", "About us"), icon: "about", feature: "about" },
];

type Features = Parameters<typeof featureVisible>[0];

// بخش‌هایی که از پنل ادمین (/admin/features) برای این کاربر خاموشن از منو
// حذف می‌شن؛ گروهی که همه‌ی زیرمجموعه‌هاش خاموشن هم کامل حذف می‌شه.
// section (زیردامنه‌ی جاری، useSection()) آیتم‌های مال بخش‌های دیگه رو هم حذف می‌کنه؛
// null (دامنه‌ی اصلی) فیلتری نداره. گروهی که توی یک بخش دقیقا یک زیرمجموعه‌ی دیدنی
// داره (مثلا «روتین من» با فقط خواب روی ورزش) به یک لینک ساده‌ی بالاسطحی تبدیل می‌شه.
export function getVisibleLinks(features: Features, section: SectionKey | null = null): NavItem[] {
  const inSection = (x: { sections?: SectionKey[] }) => !section || !x.sections || x.sections.includes(section);
  const out: NavItem[] = [];
  for (const item of getLinks()) {
    if (item.feature && !featureVisible(features, item.feature)) continue;
    if (!inSection(item)) continue;
    if (isGroup(item)) {
      const kids = item.children.filter((c) => inSection(c) && (!c.feature || featureVisible(features, c.feature)));
      if (kids.length === 0) continue;
      if (section && kids.length === 1) out.push(kids[0]);
      else out.push({ ...item, children: kids });
      continue;
    }
    out.push(item);
  }
  // بخش ترید: هاب قدیمی /trade توی داشبورد ادغام شده (/trade ریدایرکت به /dashboardه)،
  // پس با داشبورد دیدنی دو آیتم برای یک صفحه نشون نمی‌دیم. داشبورد خاموش → «ترید» می‌مونه.
  if (section === "trade" && featureVisible(features, "dashboard")) {
    return out.filter((i) => isGroup(i) || i.href !== "/trade");
  }
  return out;
}

export function visibleChildren(group: NavGroup, features: Features): NavLink[] {
  return group.children.filter((c) => !c.feature || featureVisible(features, c.feature));
}

export function isLockedModule(activeModules: Set<string> | null, m?: string): boolean {
  return !!m && activeModules !== null && !activeModules.has(m);
}
