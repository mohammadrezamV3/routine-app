"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAccount, activeModulesOf } from "@/lib/accountCache";

// مدل داده‌ی منوی ناوبری — جدا از DOM، تا هم کشوی وب (NavMenuPanel) و هم
// تب‌بار اپ موبایل از یک منبع بخونن و فیلتر ماژول/سوپریوزر یکی بمونه.
//
// «صفحه اصلی» قدیمی (/) دیگه توی منو نیست — کاربر لاگین‌کرده مستقیم به
// برنامه هفتگی می‌ره، پس همون این‌جا لیبل «روتین» رو می‌گیره؛ خود صفحه‌ی
// هیرو (/) دست‌نخورده می‌مونه، فقط دیگه لینک جدایی توی منو نداره.
//
// «بدنسازی» و «ترید» دیگه لینک مستقیم نیستن — با کلیک زیرمجموعه‌هاشون باز
// می‌شن (برنامه‌ی تمرینی/برنامه‌ی غذایی، چک‌لیست/ژورنال) تا کاربر مستقیم از
// منو به تب موردنظر بره، نه اینکه اول صفحه باز شه و بعد از توی خودش تب بزنه.
// module: اگه ست بشه، یعنی این آیتم پولیه — اگه کاربر دسترسی فعال به این
// ماژول رو نداشته باشه، کنار لیبلش یه آیکون قفل نشون داده می‌شه (فقط
// نشانه‌ست، enforcement واقعی همچنان سمت سرور/ModuleGate انجام می‌شه).
// superAdminOnly: کلا برای همه به‌جز سوپریوزر غیرفعاله (نه یه ماژول
// خریدنی مثل بقیه) — از منو هم مخفی می‌شه، نه فقط قفل‌نشون‌داده.
export type NavLink = { href: string; label: string; icon: string; module?: string; superAdminOnly?: boolean };
export type NavGroup = { label: string; icon: string; children: NavLink[]; module?: string };
export type NavItem = NavLink | NavGroup;

export function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

export const LINKS: NavItem[] = [
  { href: "/weekly", label: "روتین", icon: "weekly" },
  { href: "/roadmaps", label: "رودمپ‌ها", icon: "roadmaps", superAdminOnly: true },
  {
    label: "بدنسازی", icon: "exercise",
    children: [
      { href: "/exercise?tab=exercise", label: "برنامه تمرینی", icon: "exercise", module: "EXERCISE" },
      { href: "/exercise?tab=calorie", label: "کالری‌شمار", icon: "food", module: "CALORIE" },
    ],
  },
  // ترید زیرمنو ندارد — با یک کلیک مستقیم می‌رود به هاب خودش، و انتخاب
  // بخش (ژورنال/چک‌لیست/تقویم/…) داخل همان صفحه انجام می‌شود.
  { href: "/trade", label: "ترید", icon: "trade", module: "TRADE" },
  { href: "/analysis/weekly", label: "آنالیز هفتگی", icon: "weeklyReport", module: "AI_INSIGHT", superAdminOnly: true },
  { href: "/about", label: "درباره ما", icon: "about" },
];

// فیلتر خالص (بدون هوک) — برای تست و برای مصرف‌کننده‌هایی که session رو از
// جای دیگه دارن.
export function visibleNavItems(isSuperAdmin: boolean): NavItem[] {
  return LINKS.filter((item) => !("superAdminOnly" in item && item.superAdminOnly) || isSuperAdmin);
}

export function useNavModel() {
  const { data: session, status } = useSession();
  // برای نشون قفل آیتم‌های پولی منو — null یعنی «هنوز معلوم نیست»
  // (چیزی رندر نمی‌کنیم تا از فلش اشتباه جلوگیری بشه).
  const [activeModules, setActiveModules] = useState<Set<string> | null>(null);

  // برای نشون قفل آیتم‌های پولی منو — همون /api/account که ModuleGate هم
  // استفاده می‌کنه (سوپریوزر توش خودش همه‌ی ماژول‌ها رو active برمی‌گردونه).
  useEffect(() => {
    if (status === "unauthenticated") { setActiveModules(new Set()); return; }
    if (status !== "authenticated") return;
    let cancelled = false;
    getAccount()
      .then((data) => {
        if (cancelled) return;
        setActiveModules(activeModulesOf(data));
      })
      .catch(() => { if (!cancelled) setActiveModules(new Set()); });
    return () => { cancelled = true; };
  }, [status]);

  const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
  const isLocked = (m?: string) => !!m && activeModules !== null && !activeModules.has(m);

  return {
    session,
    status,
    isSuperAdmin,
    activeModules,
    isLocked,
    items: visibleNavItems(isSuperAdmin),
  };
}
