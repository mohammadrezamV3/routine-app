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

// ساختار منو (درخواست صریح: انتخاب از زیرمنو لازم نباشه، همه‌چیز از اول دیده بشه):
// همه‌ی آیتم‌ها لینک بالاسطحی‌ان، به‌جز دو گروه: «مربی‌ها» (دیسکاوری + مربی‌های من) و
// «بیشتر» (مقاله‌ها + درباره ما). خواب آیتم مستقل خودشه (نه زیر «روتین من») و
// «برنامه تمرینی» و «کالری‌شمار» هم دو لینک جدا هستن (گروه «بدنسازی» نداریم).
// «صفحه اصلی» قدیمی (/) دیگه توی منو نیست — کاربر لاگین‌کرده مستقیم به داشبورد می‌ره.
export const getLinks = (): NavItem[] => [
  // داشبورد — نمای کلی همه‌ی بخش‌ها و صفحه‌ی اصلی بعد از ورود؛ پشت فلگ `dashboard` (پیش‌فرض روشن برای همه)
  { href: "/dashboard", label: tr("داشبورد", "Dashboard"), icon: "dashboard", feature: "dashboard", sections: ["routine", "trade", "workout"] },
  { href: "/weekly", label: tr("برنامه روزانه", "Daily plan"), icon: "weekly", feature: "routine", sections: ["routine"] },
  { href: "/sleep", label: tr("خواب", "Sleep"), icon: "sleep", module: "SLEEP", feature: "sleep", sections: ["routine", "workout"] },
  { href: "/roadmaps", label: tr("رودمپ‌ها", "Roadmaps"), icon: "roadmaps", feature: "roadmaps", sections: ["routine"] },
  { href: "/exercise", label: tr("برنامه تمرینی", "Workout plan"), icon: "exercise", module: "EXERCISE", feature: "exercise", sections: ["workout"] },
  { href: "/calorie", label: tr("کالری‌شمار", "Calorie tracker"), icon: "food", module: "CALORIE", feature: "calorie", sections: ["workout"] },
  { href: "/trade", label: tr("ترید", "Trading"), icon: "trade", module: "TRADE", feature: "trade", sections: ["trade"] },
  // منوی بخش ترید (درخواست صریح): داشبورد، چارت، ژورنال، چک‌لیست، یادداشت‌ها، گروه «ابزار».
  // هر کدوم feature خودش رو دارن (lib/featureFlags.ts) تا خاموش‌کردن از پنل ادمین همون آیتم رو مخفی کنه.
  { href: "/trade/chart", label: tr("چارت", "Chart"), icon: "chart", module: "TRADE", feature: "tradeChart", sections: ["trade"] },
  { href: "/trade/journal", label: tr("ژورنال", "Journal"), icon: "journal", module: "TRADE", feature: "tradeJournal", sections: ["trade"] },
  { href: "/trade/checklists", label: tr("چک‌لیست", "Checklist"), icon: "checklist", module: "TRADE", feature: "tradeChecklists", sections: ["trade"] },
  { href: "/trade/notes", label: tr("یادداشت‌ها", "Notes"), icon: "notes", module: "TRADE", feature: "tradeNotes", sections: ["trade"] },
  {
    label: tr("ابزار", "Tools"), icon: "tools", sections: ["trade"],
    children: [
      { href: "/trade/risk", label: tr("ریسک و سود", "Risk & reward"), icon: "risk", module: "TRADE", feature: "tradeRisk", sections: ["trade"] },
      { href: "/trade/money", label: tr("مدیریت سرمایه", "Money management"), icon: "money", module: "TRADE", feature: "tradeMoneyMgmt", sections: ["trade"] },
      { href: "/trade/metatrader", label: tr("اتصال متاتریدر", "MetaTrader connection"), icon: "metatrader", module: "TRADE", feature: "metatrader", sections: ["trade"] },
    ],
  },
  { href: "/analysis/weekly", label: tr("آنالیز هفتگی", "Weekly review"), icon: "weeklyReport", module: "AI_INSIGHT", feature: "weeklyAnalysis" },
  // گروه مربی‌ها: فقط صفحه‌های سمت شاگرد؛ «پنل منتور» در پاپ‌آپ پروفایل است.
  // آیکون زیرمجموعه‌ها در داده هست ولی زیرمجموعه‌های منو آیکون رندر نمی‌کنند (globals.css → .nav-link-sub-item).
  {
    label: tr("مربی‌ها", "Mentors"), icon: "mentors", feature: "mentors",
    children: [
      { href: "/mentors", label: tr("مربی‌ها", "Mentors"), icon: "mentorsDiscover" },
      { href: "/mentorship", label: tr("مربی‌های من", "My mentors"), icon: "mentorsMine" },
    ],
  },
  {
    label: tr("بیشتر", "More"), icon: "more",
    children: [
      // ابزارهای ترید که در منوی اصلی جا نشدن — فقط در بخش ترید (زیر «بیشتر»)
      { href: "/trade/calendar", label: tr("تقویم اقتصادی", "Economic calendar"), icon: "weekly", module: "TRADE", feature: "economicCalendar", sections: ["trade"] },
      { href: "/trade/clock", label: tr("ساعت فارکس", "Forex clock"), icon: "clock", module: "TRADE", feature: "forexClock", sections: ["trade"] },
      { href: "/blog", label: tr("مقاله‌ها", "Articles"), icon: "blog", feature: "blog" },
      { href: "/about", label: tr("درباره ما", "About us"), icon: "about", feature: "about" },
    ],
  },
];

type Features = Parameters<typeof featureVisible>[0];

// بخش‌هایی که از پنل ادمین (/admin/features) برای این کاربر خاموشن از منو
// حذف می‌شن؛ گروهی که همه‌ی زیرمجموعه‌هاش خاموشن هم کامل حذف می‌شه.
// section (زیردامنه‌ی جاری، useSection()) آیتم‌های مال بخش‌های دیگه رو هم حذف می‌کنه؛
// null (دامنه‌ی اصلی) فیلتری نداره. گروهی که دقیقا یک زیرمجموعه‌ی دیدنی
// داره (مثلا «بیشتر» وقتی مقاله‌ها خاموشه) به یک لینک ساده‌ی بالاسطحی تبدیل می‌شه.
// ترتیب نمایش هر بخش در هدر (درخواست صریح: اولویت‌بندی هر صفحه). کلید = href لینک یا
// icon گروه. آیتمی که اینجا نیست آخر می‌ره؛ دامنه‌ی اصلی بدون بخش (null) ترتیب اصلی
// getLinks رو نگه می‌داره. گروهی که به یک لینک تبدیل می‌شه (مثلا مربی‌ها) همون جای گروه می‌مونه.
export const SECTION_ORDER: Record<SectionKey, string[]> = {
  // ترتیب بخش روتین (درخواست صریح مالک): داشبورد، برنامه روزانه، خواب، رودمپ، مربی‌ها، آنالیز، بیشتر.
  routine: ["/dashboard", "/weekly", "/sleep", "/roadmaps", "mentors", "/analysis/weekly", "more"],
  workout: ["/dashboard", "/exercise", "/calorie", "/sleep", "/analysis/weekly", "mentors", "more"],
  // ترتیب بخش ترید (درخواست صریح): داشبورد، چارت، ژورنال، چک‌لیست، یادداشت‌ها، ابزار.
  // «/trade» (هاب قدیمی) فقط وقتی فلگ داشبورد خاموشه دیده می‌شه و همون جای اول می‌مونه.
  // آنالیز، مربی‌ها و بیشتر بعد از این شش آیتم میان.
  trade: ["/dashboard", "/trade", "/trade/chart", "/trade/journal", "/trade/checklists", "/trade/notes", "tools", "/analysis/weekly", "mentors", "more"],
};

export function getVisibleLinks(features: Features, section: SectionKey | null = null): NavItem[] {
  const inSection = (x: { sections?: SectionKey[] }) => !section || !x.sections || x.sections.includes(section);
  const keyed: { id: string; item: NavItem }[] = [];
  for (const item of getLinks()) {
    if (item.feature && !featureVisible(features, item.feature)) continue;
    if (!inSection(item)) continue;
    if (isGroup(item)) {
      const kids = item.children.filter((c) => inSection(c) && (!c.feature || featureVisible(features, c.feature)));
      if (kids.length === 0) continue;
      if (section && kids.length === 1) keyed.push({ id: item.icon, item: kids[0] });
      else keyed.push({ id: item.icon, item: { ...item, children: kids } });
      continue;
    }
    keyed.push({ id: item.href, item });
  }
  if (section) {
    const order = SECTION_ORDER[section];
    const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
    // sort پایداره: آیتم‌های خارج از جدول ترتیب نسبی خودشون رو نگه می‌دارن
    keyed.sort((a, b) => rank(a.id) - rank(b.id));
  }
  const out = keyed.map((k) => k.item);
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
