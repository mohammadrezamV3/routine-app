"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, ToggleRight, Users, CreditCard, Coins, Boxes, Sparkles, LineChart, ServerCog, Settings, LogOut, ChevronDown,
  Menu, X, Tag, CalendarClock, Flag, Headset, ShieldCheck, History, Home, Sun, Moon, Lock,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { AdminToastProvider } from "@/components/admin/useAdminToast";
import { AdminAccessContext } from "@/components/admin/AdminAccess";
import { AdminPermission, hasPermission, permissionForPath } from "@/lib/adminPermissions";

type Leaf = { label: string; href: string; perm?: AdminPermission };
type NavSection = { label: string; icon: React.ReactNode; href?: string; perm?: AdminPermission; children?: Leaf[] };
type NavGroup = { title: string; sections: NavSection[] };

const GROUPS: NavGroup[] = [
  {
    title: "عمومی",
    sections: [{ label: "داشبورد", icon: <LayoutGrid size={17} />, href: "/admin" }],
  },
  {
    title: "کاربران و دسترسی",
    sections: [
      {
        label: "کاربران", icon: <Users size={17} />, href: "/admin/users", perm: "users.view",
        children: [
          { label: "همه کاربران", href: "/admin/users" },
          { label: "کاربران جدید", href: "/admin/users?filter=new" },
          { label: "کاربران فعال", href: "/admin/users?filter=active" },
          { label: "کاربران پولی", href: "/admin/users?filter=paid" },
          { label: "مسدودشده‌ها", href: "/admin/users?filter=blocked" },
          { label: "حذف‌شده‌ها", href: "/admin/users?filter=deleted" },
        ],
      },
      { label: "ادمین‌ها و دسترسی‌ها", icon: <ShieldCheck size={17} />, href: "/admin/admins", perm: "admins.manage" },
      { label: "لاگ فعالیت ادمین‌ها", icon: <History size={17} />, href: "/admin/audit", perm: "audit" },
    ],
  },
  {
    title: "مالی",
    sections: [
      {
        label: "اشتراک‌ها", icon: <CreditCard size={17} />, href: "/admin/subscriptions", perm: "subscriptions",
        children: [
          { label: "اشتراک‌های فعال", href: "/admin/subscriptions?tab=active" },
          { label: "اشتراک‌های منقضی", href: "/admin/subscriptions?tab=expired" },
          { label: "تمدیدها", href: "/admin/subscriptions?tab=renewals" },
          { label: "ارتقاها", href: "/admin/subscriptions?tab=upgrades" },
          { label: "لغو اشتراک", href: "/admin/subscriptions?tab=canceled" },
        ],
      },
      {
        label: "درآمد", icon: <Coins size={17} />, href: "/admin/revenue", perm: "finance",
        children: [
          { label: "درآمد", href: "/admin/revenue" },
          { label: "تراکنش‌ها", href: "/admin/transactions" },
          { label: "بازپرداخت‌ها", href: "/admin/transactions?filter=refunded" },
        ],
      },
      { label: "کدهای تخفیف", icon: <Tag size={17} />, href: "/admin/discount-codes", perm: "discounts" },
    ],
  },
  {
    title: "پشتیبانی و محتوا",
    sections: [
      { label: "تیکت‌های پشتیبانی", icon: <Headset size={17} />, href: "/admin/support", perm: "support" },
      { label: "گزارش‌های چت", icon: <Flag size={17} />, href: "/admin/chat-reports", perm: "chat" },
      { label: "تقویم اقتصادی", icon: <CalendarClock size={17} />, href: "/admin/economic-calendar", perm: "content" },
      {
        label: "محصولات", icon: <Boxes size={17} />,
        children: [
          { label: "روتین", href: "/admin/products/routine", perm: "analytics" },
          { label: "بدنسازی", href: "/admin/products/exercise", perm: "analytics" },
          { label: "کالری", href: "/admin/products/calorie", perm: "analytics" },
          { label: "ترید", href: "/admin/products/trade", perm: "analytics" },
          { label: "Skill / یادگیری", href: "/admin/products/roadmap", perm: "analytics" },
          { label: "عکس حرکات ورزشی", href: "/admin/exercise-media", perm: "content" },
        ],
      },
    ],
  },
  {
    title: "تحلیل و سیستم",
    sections: [
      { label: "مصرف AI", icon: <Sparkles size={17} />, href: "/admin/ai-usage", perm: "ai_usage" },
      {
        label: "تحلیل", icon: <LineChart size={17} />, perm: "analytics",
        children: [
          { label: "Retention", href: "/admin/analytics/retention" },
          { label: "Funnel / Conversion", href: "/admin/analytics/funnel" },
          { label: "Churn", href: "/admin/analytics/churn" },
          { label: "Cohort", href: "/admin/analytics/cohort" },
        ],
      },
      {
        label: "سیستم", icon: <ServerCog size={17} />, perm: "system",
        children: [
          { label: "وضعیت سرورها و منابع", href: "/admin/system/status" },
          { label: "خطاها و لاگ‌ها", href: "/admin/system/errors" },
        ],
      },
      { label: "قابلیت‌ها", icon: <ToggleRight size={17} />, href: "/admin/features", perm: "settings" },
      { label: "تنظیمات", icon: <Settings size={17} />, href: "/admin/settings", perm: "settings" },
    ],
  },
];

type Access = { isSuperAdmin: boolean; permissions: readonly string[] };

// منو فقط بخش‌هایی رو نشون می‌ده که ادمین بهشون دسترسی داره
function visibleGroups(access: Access): NavGroup[] {
  return GROUPS.map((g) => ({
    ...g,
    sections: g.sections
      .filter((s) => hasPermission(access, s.perm))
      .map((s) => (s.children ? { ...s, children: s.children.filter((c) => hasPermission(access, c.perm)) } : s))
      .filter((s) => !s.children || s.children.length > 0),
  })).filter((g) => g.sections.length > 0);
}

function isActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/admin") return pathname === "/admin";
  return pathname === path || pathname.startsWith(path + "/");
}

function sectionActive(pathname: string, section: NavSection): boolean {
  if (section.href && isActive(pathname, section.href)) return true;
  return !!section.children?.some((c) => isActive(pathname, c.href));
}

function Brand({ onClose }: { onClose?: () => void }) {
  const { theme } = useTheme();
  return (
    <div className="admin-brand">
      <span className="admin-brand-logo" aria-hidden="true">
        <Image src="/images/logo-icon-dark-theme.png" alt="" fill sizes="30px" className={`object-contain transition-opacity duration-150${theme === "light" ? " opacity-0" : " opacity-100"}`} />
        <Image src="/images/logo-icon-light-theme.webp" alt="" fill sizes="30px" className={`object-contain transition-opacity duration-150${theme === "light" ? " opacity-100" : " opacity-0"}`} />
      </span>
      <span className="admin-brand-text">Arion <span className="admin-brand-sub">پنل مدیریت</span></span>
      {onClose && (
        <button type="button" className="admin-mobile-close" onClick={onClose} aria-label="بستن">
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function RoleCard({ access }: { access: Access }) {
  const { data: session } = useSession();
  const name = (session?.user as any)?.name || "ادمین";
  return (
    <div className="admin-role-card">
      <span className="admin-avatar-fallback" style={{ width: 34, height: 34, fontSize: 13, borderRadius: 11 }}>{String(name)[0]?.toUpperCase()}</span>
      <div style={{ minWidth: 0 }}>
        <div className="admin-role-name">{name}</div>
        <div className="admin-role-sub">{access.isSuperAdmin ? "Owner — دسترسی کامل" : `ادمین · ${access.permissions.length} دسترسی`}</div>
      </div>
    </div>
  );
}

function SidebarContent({ pathname, groups, access, onNavigate }: { pathname: string; groups: NavGroup[]; access: Access; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(
    () => groups.flatMap((g) => g.sections).find((s) => s.children && sectionActive(pathname, s))?.label || null,
  );

  return (
    <nav className="admin-nav">
      <RoleCard access={access} />
      {groups.map((group) => (
        <div key={group.title} className="admin-nav-group">
          <div className="admin-nav-group-title">{group.title}</div>
          {group.sections.map((section) => {
            const active = sectionActive(pathname, section);
            const isOpen = expanded === section.label;
            return (
              <div key={section.label} className="admin-nav-section">
                {section.children ? (
                  <button type="button" className={`admin-nav-head${active ? " active" : ""}`} onClick={() => setExpanded(isOpen ? null : section.label)}>
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
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}
                    >
                      <div className="admin-nav-children">
                        {section.children.map((leaf) => (
                          <Link key={leaf.href} href={leaf.href} onClick={onNavigate} className={`admin-nav-leaf${isActive(pathname, leaf.href) ? " active" : ""}`}>
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
        </div>
      ))}

      <div className="admin-nav-group">
        <Link href="/" className="admin-nav-head" onClick={onNavigate}>
          <span className="admin-nav-icon"><Home size={17} /></span>
          <span className="admin-nav-label">بازگشت به اپ</span>
        </Link>
        <button type="button" className="admin-nav-head admin-nav-logout" onClick={() => signOut({ callbackUrl: "/" })}>
          <span className="admin-nav-icon"><LogOut size={17} /></span>
          <span className="admin-nav-label">خروج</span>
        </button>
      </div>
    </nav>
  );
}

function pageTitle(pathname: string): string {
  for (const section of GROUPS.flatMap((g) => g.sections)) {
    if (section.href && isActive(pathname, section.href)) return section.label;
    const leaf = section.children?.find((c) => isActive(pathname, c.href));
    if (leaf) return section.label;
  }
  if (pathname.startsWith("/admin/products/")) return "محصولات";
  return "پنل مدیریت";
}

function NoAccess() {
  return (
    <div className="admin-card admin-no-access">
      <span className="admin-no-access-icon"><Lock size={22} /></span>
      <div className="admin-no-access-title">به این بخش دسترسی نداری</div>
      <div className="admin-section-hint" style={{ margin: 0 }}>برای دسترسی، از Owner یا ادمینی که «مدیریت ادمین‌ها» داره بخواه دسترسی این بخش رو بهت بده.</div>
      <Link href="/admin" className="admin-btn" style={{ marginTop: 14 }}>برگشت به داشبورد</Link>
    </div>
  );
}

export function AdminShell({ children, isSuperAdmin, permissions }: { children: React.ReactNode; isSuperAdmin: boolean; permissions: string[] }) {
  const pathname = usePathname() || "/admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const access = useMemo<Access>(() => ({ isSuperAdmin, permissions }), [isSuperAdmin, permissions]);
  const groups = useMemo(() => visibleGroups(access), [access]);
  const allowed = hasPermission(access, permissionForPath(pathname) || undefined);

  return (
    <AdminAccessContext.Provider value={access}>
    <AdminToastProvider>
      <div className="admin-root" dir="rtl">
        <div className="admin-sidebar-desktop">
          <Brand />
          <SidebarContent pathname={pathname} groups={groups} access={access} />
        </div>

        <div className="admin-main">
          <div className="admin-topbar">
            <button type="button" className="admin-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="منو">
              <Menu size={20} />
            </button>
            <h1 className="admin-page-title">{pageTitle(pathname)}</h1>
            <div className="admin-topbar-actions">
              <button type="button" className="admin-icon-btn" onClick={toggle} aria-label="تغییر تم">
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <Link href="/" className="admin-icon-btn" aria-label="بازگشت به اپ"><Home size={16} /></Link>
            </div>
          </div>
          <div className="admin-content">{allowed ? children : <NoAccess />}</div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div className="admin-mobile-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
              <motion.div
                className="admin-mobile-drawer"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <Brand onClose={() => setMobileOpen(false)} />
                <SidebarContent pathname={pathname} groups={groups} access={access} onNavigate={() => setMobileOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AdminToastProvider>
    </AdminAccessContext.Provider>
  );
}
