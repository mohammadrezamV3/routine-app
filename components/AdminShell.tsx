"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Users, CreditCard, Coins, Boxes, Sparkles, LineChart,
  ServerCog, Settings, LogOut, ChevronDown, Menu, X, Tag, CalendarClock,
} from "lucide-react";

type Leaf = { label: string; href: string };
type NavSection = { label: string; icon: React.ReactNode; href?: string; children?: Leaf[] };

const SECTIONS: NavSection[] = [
  { label: "نمای کلی", icon: <LayoutGrid size={17} />, href: "/admin" },
  {
    label: "کاربران", icon: <Users size={17} />, href: "/admin/users",
    children: [
      { label: "همه کاربران", href: "/admin/users" },
      { label: "کاربران جدید", href: "/admin/users?filter=new" },
      { label: "کاربران فعال", href: "/admin/users?filter=active" },
      { label: "کاربران غیرفعال", href: "/admin/users?filter=inactive" },
      { label: "کاربران رایگان", href: "/admin/users?filter=free" },
      { label: "کاربران پولی", href: "/admin/users?filter=paid" },
    ],
  },
  {
    label: "اشتراک‌ها", icon: <CreditCard size={17} />, href: "/admin/subscriptions",
    children: [
      { label: "اشتراک‌های فعال", href: "/admin/subscriptions?tab=active" },
      { label: "اشتراک‌های منقضی", href: "/admin/subscriptions?tab=expired" },
      { label: "تمدیدها", href: "/admin/subscriptions?tab=renewals" },
      { label: "ارتقاها", href: "/admin/subscriptions?tab=upgrades" },
      { label: "لغو اشتراک", href: "/admin/subscriptions?tab=canceled" },
    ],
  },
  { label: "کدهای تخفیف", icon: <Tag size={17} />, href: "/admin/discount-codes" },
  { label: "تقویم اقتصادی", icon: <CalendarClock size={17} />, href: "/admin/economic-calendar" },
  {
    label: "درآمد", icon: <Coins size={17} />, href: "/admin/revenue",
    children: [
      { label: "درآمد امروز", href: "/admin/revenue?range=today" },
      { label: "درآمد این ماه", href: "/admin/revenue?range=30d" },
      { label: "درآمد سال", href: "/admin/revenue?range=12m" },
      { label: "تراکنش‌ها", href: "/admin/transactions" },
      { label: "بازپرداخت‌ها", href: "/admin/transactions?filter=refunded" },
    ],
  },
  {
    label: "محصولات", icon: <Boxes size={17} />,
    children: [
      { label: "روتین", href: "/admin/products/routine" },
      { label: "بدنسازی", href: "/admin/products/exercise" },
      { label: "کالری", href: "/admin/products/calorie" },
      { label: "ترید", href: "/admin/products/trade" },
      { label: "Skill / یادگیری", href: "/admin/products/roadmap" },
    ],
  },
  { label: "مصرف AI", icon: <Sparkles size={17} />, href: "/admin/ai-usage" },
  {
    label: "تحلیل", icon: <LineChart size={17} />,
    children: [
      { label: "Retention", href: "/admin/analytics/retention" },
      { label: "Funnel / Conversion", href: "/admin/analytics/funnel" },
      { label: "Churn", href: "/admin/analytics/churn" },
      { label: "Cohort", href: "/admin/analytics/cohort" },
    ],
  },
  {
    label: "سیستم", icon: <ServerCog size={17} />,
    children: [
      { label: "وضعیت سرورها و منابع", href: "/admin/system/status" },
      { label: "خطاها و لاگ‌ها", href: "/admin/system/errors" },
    ],
  },
  { label: "تنظیمات Owner", icon: <Settings size={17} />, href: "/admin/settings" },
];

function isActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/admin") return pathname === "/admin";
  return pathname === path || pathname.startsWith(path + "/");
}

function sectionActive(pathname: string, section: NavSection): boolean {
  if (section.href && isActive(pathname, section.href)) return true;
  return !!section.children?.some((c) => isActive(pathname, c.href));
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(() => SECTIONS.find((s) => s.children && sectionActive(pathname, s))?.label || null);

  return (
    <nav className="admin-nav">
      {SECTIONS.map((section) => {
        const active = sectionActive(pathname, section);
        const isOpen = expanded === section.label;
        return (
          <div key={section.label} className="admin-nav-section">
            {section.children ? (
              <button
                type="button"
                className={`admin-nav-head${active ? " active" : ""}`}
                onClick={() => setExpanded(isOpen ? null : section.label)}
              >
                <span className="admin-nav-icon">{section.icon}</span>
                <span className="admin-nav-label">{section.label}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="admin-nav-chevron">
                  <ChevronDown size={14} />
                </motion.span>
              </button>
            ) : (
              <Link href={section.href!} className={`admin-nav-head${active ? " active" : ""}`} onClick={onNavigate}>
                <span className="admin-nav-icon">{section.icon}</span>
                <span className="admin-nav-label">{section.label}</span>
              </Link>
            )}

            <AnimatePresence initial={false}>
              {section.children && isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="admin-nav-children">
                    {section.children.map((leaf) => (
                      <Link
                        key={leaf.href}
                        href={leaf.href}
                        onClick={onNavigate}
                        className={`admin-nav-leaf${isActive(pathname, leaf.href) ? " active" : ""}`}
                      >
                        {leaf.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <button type="button" className="admin-nav-head admin-nav-logout" onClick={() => signOut({ callbackUrl: "/" })}>
        <span className="admin-nav-icon"><LogOut size={17} /></span>
        <span className="admin-nav-label">خروج</span>
      </button>
    </nav>
  );
}

function pageTitle(pathname: string): string {
  for (const section of SECTIONS) {
    if (section.href && isActive(pathname, section.href) && !section.children) return section.label;
    if (section.children) {
      const leaf = section.children.find((c) => isActive(pathname, c.href));
      if (leaf) return section.label;
      if (section.href && pathname === section.href) return section.label;
    }
  }
  if (pathname.startsWith("/admin/products/")) return "محصولات";
  return "پنل Owner";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-root" dir="rtl">
      <div className="admin-sidebar-desktop">
        <div className="admin-brand">
          <span className="admin-brand-dot" />
          <span className="admin-brand-text">Arion <span className="admin-brand-sub">Owner</span></span>
        </div>
        <SidebarContent pathname={pathname} />
      </div>

      <div className="admin-main">
        <div className="admin-topbar">
          <button type="button" className="admin-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="منو">
            <Menu size={20} />
          </button>
          <h1 className="admin-page-title">{pageTitle(pathname)}</h1>
        </div>
        <div className="admin-content">{children}</div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="admin-mobile-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="admin-mobile-drawer"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="admin-brand">
                <span className="admin-brand-dot" />
                <span className="admin-brand-text">Arion <span className="admin-brand-sub">Owner</span></span>
                <button type="button" className="admin-mobile-close" onClick={() => setMobileOpen(false)} aria-label="بستن">
                  <X size={18} />
                </button>
              </div>
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
