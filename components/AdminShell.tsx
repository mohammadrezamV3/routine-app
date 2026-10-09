"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { logoutAndRedirect } from "@/lib/logout";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, Home, Sun, Moon, Lock, LogOut, Search, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, LayoutGrid, Users, Coins, Headset, Ellipsis } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { AdminToastProvider } from "@/components/admin/useAdminToast";
import { AdminAccessContext } from "@/components/admin/AdminAccess";
import { hasPermission, permissionForPath } from "@/lib/adminPermissions";
import { navGroups, type NavGroup, type NavItem, type NavLeaf, type NavAccess } from "@/components/adminNavConfig";
import { tr } from "@/lib/i18n";
import { useIsEn } from "@/components/I18nProvider";
import { AdminAlertsProvider, useAdminAlerts } from "@/components/AdminAlerts";
import { AdminAlertsBell } from "@/components/AdminAlertsBell";
import { AdminCommandPalette } from "@/components/AdminCommandPalette";
import "@/components/admin-shell.css";

type Access = NavAccess;
const COLLAPSE_KEY = "arion:adminSidebarCollapsed";

// منو فقط بخش‌هایی رو نشون می‌ده که ادمین بهشون دسترسی داره؛ گروه خالی حذف می‌شه
function visibleGroups(access: Access): NavGroup[] {
  return navGroups().map((g) => ({
    ...g,
    items: g.items
      .filter((s) => hasPermission(access, s.perm) && (!s.ownerOnly || access.isSuperAdmin))
      .map((s) => (s.children ? { ...s, children: s.children.filter((c) => hasPermission(access, c.perm)) } : s)),
  })).filter((g) => g.items.length > 0);
}

function isActive(pathname: string, href: string, exact = false): boolean {
  const path = href.split("?")[0];
  if (path === "/admin" || exact) return pathname === path;
  return pathname === path || pathname.startsWith(path + "/");
}

function itemActive(pathname: string, item: NavItem): boolean {
  if (item.children?.length) return item.children.some((c) => isActive(pathname, c.href, c.exact)) || isActive(pathname, item.href, false);
  return isActive(pathname, item.href);
}

// کدوم زیرمنو فعاله — با query هم مقایسه می‌شه. برگی که query داره فقط وقتی
// همه‌ی پارامترهاش با URL یکی باشه فعاله؛ برگ بدون query فقط وقتی هیچ برگ
// خاص‌تری مطابق نباشه.
function activeLeafHref(pathname: string, search: URLSearchParams, leaves: NavLeaf[]): string | null {
  let best: { href: string; score: number } | null = null;
  for (const leaf of leaves) {
    if (!isActive(pathname, leaf.href, leaf.exact)) continue;
    const q = leaf.href.split("?")[1];
    const params = q ? Array.from(new URLSearchParams(q).entries()) : [];
    if (!params.every(([k, v]) => search.get(k) === v)) continue;
    const score = params.length;
    if (!best || score > best.score) best = { href: leaf.href, score };
  }
  return best?.href ?? null;
}

function Brand({ onClose, collapsed }: { onClose?: () => void; collapsed?: boolean }) {
  const { theme } = useTheme();
  return (
    <div className="admin-brand">
      <span className="admin-brand-logo" aria-hidden="true">
        <Image src="/images/logo-icon-dark-theme.png" alt="" fill sizes="30px" className={`object-contain transition-opacity duration-150${theme === "light" ? " opacity-0" : " opacity-100"}`} />
        <Image src="/images/logo-icon-light-theme.webp" alt="" fill sizes="30px" className={`object-contain transition-opacity duration-150${theme === "light" ? " opacity-100" : " opacity-0"}`} />
      </span>
      {!collapsed && <span className="admin-brand-text">Arion <span className="admin-brand-sub">{tr("پنل مدیریت", "Admin panel")}</span></span>}
      {onClose && (
        <button type="button" className="admin-mobile-close" onClick={onClose} aria-label={tr("بستن", "Close")}>
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function RoleCard({ access }: { access: Access }) {
  const { data: session } = useSession();
  const name = (session?.user as any)?.name || tr("ادمین", "Admin");
  return (
    <div className="admin-role-card">
      <span className="admin-avatar-fallback admin-role-avatar">{String(name)[0]?.toUpperCase()}</span>
      <div className="admin-role-info">
        <div className="admin-role-name">{name}</div>
        <div className="admin-role-sub">{access.isSuperAdmin ? tr("Owner — دسترسی کامل", "Owner — full access") : tr(`ادمین · ${access.permissions.length} دسترسی`, `Admin · ${access.permissions.length} permissions`)}</div>
      </div>
    </div>
  );
}

function useBadges(): Record<string, number> {
  const { items, total } = useAdminAlerts();
  return useMemo(() => {
    const m: Record<string, number> = { alerts: total };
    for (const i of items) m[i.key] = i.count;
    return m;
  }, [items, total]);
}

function SidebarContent({ pathname, groups, access, collapsed, onNavigate }: { pathname: string; groups: NavGroup[]; access: Access; collapsed?: boolean; onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const search = useMemo(() => new URLSearchParams(searchParams?.toString() || ""), [searchParams]);
  const badges = useBadges();
  const { theme, toggle } = useTheme();
  const activeParent = groups.flatMap((g) => g.items).find((s) => s.children && s.children.length > 0 && itemActive(pathname, s))?.href || null;
  const [expanded, setExpanded] = useState<string | null>(activeParent);

  // سایدبار دسکتاپ بین صفحه‌ها unmount نمی‌شه — با رفتن به یه بخش دیگه، زیرمنوی همون باز بشه
  useEffect(() => { if (activeParent) setExpanded(activeParent); }, [activeParent]);

  return (
    <nav className={`admin-nav ads-nav${collapsed ? " is-rail" : ""}`} aria-label={tr("منوی ادمین", "Admin menu")}>
      {!collapsed && <RoleCard access={access} />}
      {groups.map((group) => (
        <div key={group.title} className="ads-group">
          {collapsed ? <span className="ads-group-rule" aria-hidden="true" /> : <div className="ads-group-title">{group.title}</div>}
          {group.items.map((item) => {
            const active = itemActive(pathname, item);
            const kids = item.children && item.children.length > 1 ? item.children : null;
            const isOpen = !!kids && !collapsed && expanded === item.href;
            const n = item.badge ? badges[item.badge] || 0 : 0;
            return (
              <div key={item.href} className="ads-item-wrap">
                <div className="ads-item-row">
                  <Link
                    href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined}
                    aria-current={active && !kids ? "page" : undefined}
                    className={`ads-item${active ? " active" : ""}`}
                  >
                    {collapsed ? <span className="ads-item-icon">{item.icon}</span> : <span className="ads-item-dot" aria-hidden="true" />}
                    {!collapsed && <span className="ads-item-label">{item.label}</span>}
                    {n > 0 && <span className={`ads-count${collapsed ? " rail" : ""}`}>{n > 99 ? "99+" : n}</span>}
                  </Link>
                  {kids && !collapsed && (
                    <button type="button" className="ads-chev" aria-expanded={isOpen} aria-label={tr(`زیرمنوی ${item.label}`, `${item.label} submenu`)} onClick={() => setExpanded(isOpen ? null : item.href)}>
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: "flex" }}><ChevronDown size={14} /></motion.span>
                    </button>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {kids && isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}
                    >
                      <div className="ads-children">
                        {(() => {
                          const activeHref = activeLeafHref(pathname, search, kids);
                          return kids.map((leaf) => (
                            <Link key={leaf.href} href={leaf.href} onClick={onNavigate} aria-current={activeHref === leaf.href ? "page" : undefined} className={`ads-leaf${activeHref === leaf.href ? " active" : ""}`}>
                              {leaf.label}
                            </Link>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ))}

      <div className="ads-group ads-foot">
        {collapsed ? <span className="ads-group-rule" aria-hidden="true" /> : null}
        <button type="button" className="ads-item ads-foot-btn" onClick={toggle} title={tr("تغییر تم", "Change theme")}>
          <span className="ads-item-icon">{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</span>
          {!collapsed && <span className="ads-item-label">{theme === "light" ? tr("تم تیره", "Dark theme") : tr("تم روشن", "Light theme")}</span>}
        </button>
        <Link href="/" className="ads-item" onClick={onNavigate} title={tr("بازگشت به اپ", "Back to app")}>
          <span className="ads-item-icon"><Home size={16} /></span>
          {!collapsed && <span className="ads-item-label">{tr("بازگشت به اپ", "Back to app")}</span>}
        </Link>
        <button type="button" className="ads-item ads-foot-btn ads-logout" onClick={logoutAndRedirect} title={tr("خروج", "Sign out")}>
          <span className="ads-item-icon"><LogOut size={16} /></span>
          {!collapsed && <span className="ads-item-label">{tr("خروج", "Sign out")}</span>}
        </button>
      </div>
    </nav>
  );
}

function extraTitles(): [string, string][] {
  return [["/admin/alerts", tr("هشدارها", "Alerts")], ["/admin/mentors", tr("مربی‌ها", "Mentors")], ["/admin/products", tr("محصولات", "Products")]];
}

function pageTitle(pathname: string): string {
  let best: { label: string; len: number } | null = null;
  for (const item of navGroups().flatMap((g) => g.items)) {
    for (const h of [item.href, ...(item.children?.map((c) => c.href) ?? [])]) {
      const path = h.split("?")[0];
      if (isActive(pathname, h) && (!best || path.length > best.len)) best = { label: item.label, len: path.length };
    }
  }
  if (best) return best.label;
  for (const [pre, label] of extraTitles()) if (pathname.startsWith(pre)) return label;
  return tr("پنل مدیریت", "Admin panel");
}

function NoAccess() {
  return (
    <div className="admin-card admin-no-access">
      <span className="admin-no-access-icon"><Lock size={22} /></span>
      <div className="admin-no-access-title">{tr("به این بخش دسترسی نداری", "You don't have access to this section")}</div>
      <div className="admin-section-hint admin-no-access-hint">{tr("برای دسترسی، از Owner یا ادمینی که «مدیریت ادمین‌ها» داره بخواه دسترسی این بخش رو بهت بده.", "To get access, ask the Owner or an admin with «Manage admins» to grant you access to this section.")}</div>
      <Link href="/admin" className="admin-btn admin-no-access-btn">{tr("برگشت به داشبورد", "Back to dashboard")}</Link>
    </div>
  );
}

function BottomNav({ pathname, access, onMore }: { pathname: string; access: Access; onMore: () => void }) {
  const badges = useBadges();
  const tabs = [
    { label: tr("داشبورد", "Dashboard"), href: "/admin", icon: <LayoutGrid size={18} />, perm: undefined, n: 0 },
    { label: tr("کاربران", "Users"), href: "/admin/users", icon: <Users size={18} />, perm: "users.view" as const, n: 0 },
    { label: tr("درآمد", "Revenue"), href: "/admin/revenue", icon: <Coins size={18} />, perm: "finance" as const, n: 0 },
    { label: tr("پشتیبانی", "Support"), href: "/admin/support", icon: <Headset size={18} />, perm: "support" as const, n: badges.tickets || 0 },
  ].filter((t) => hasPermission(access, t.perm));
  return (
    <nav className="ads-bottom" aria-label={tr("ناوبری پایین", "Bottom navigation")}>
      {tabs.map((t) => {
        const on = isActive(pathname, t.href);
        return (
          <Link key={t.href} href={t.href} className={`ads-tab${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
            <span className="ads-tab-dot" aria-hidden="true" />
            <span className="ads-tab-icon">{t.icon}{t.n > 0 && <span className="ads-count rail">{t.n > 99 ? "99+" : t.n}</span>}</span>
            {t.label}
          </Link>
        );
      })}
      <button type="button" className="ads-tab" onClick={onMore}>
        <span className="ads-tab-dot" aria-hidden="true" />
        <span className="ads-tab-icon"><Ellipsis size={18} /></span>
        {tr("بیشتر", "More")}
      </button>
    </nav>
  );
}

export function AdminShell({ children, isSuperAdmin, permissions }: { children: React.ReactNode; isSuperAdmin: boolean; permissions: string[] }) {
  const pathname = usePathname() || "/admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggle } = useTheme();
  const en = useIsEn();
  const drawerX = en ? "-100%" : "100%";
  const access = useMemo<Access>(() => ({ isSuperAdmin, permissions }), [isSuperAdmin, permissions]);
  const groups = useMemo(() => visibleGroups(access), [access]);
  const allowed = hasPermission(access, permissionForPath(pathname) || undefined);

  useEffect(() => {
    try { if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true); } catch { /* حافظه در دسترس نیست */ }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try { localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1"); } catch { /* حافظه در دسترس نیست */ }
      return !v;
    });
  };

  // کشوی موبایل: Esc می‌بنده، با عوض‌شدن مسیر بسته می‌شه، و تا بازه اسکرول صفحه‌ی پشت قفله
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useLockBodyScroll(mobileOpen);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AdminAccessContext.Provider value={access}>
    <AdminToastProvider>
    <AdminAlertsProvider>
      <div className="admin-root ads-root" dir={en ? "ltr" : "rtl"} data-collapsed={collapsed ? "1" : undefined}>
        <div className="admin-sidebar-desktop ads-sidebar">
          <div className="ads-sidebar-top">
            <Brand collapsed={collapsed} />
            <button type="button" className="ads-collapse" onClick={toggleCollapsed} aria-label={collapsed ? tr("باز کردن منو", "Expand menu") : tr("جمع کردن منو", "Collapse menu")} aria-pressed={collapsed}>
              {collapsed ? (en ? <PanelLeftOpen size={16} /> : <PanelRightOpen size={16} />) : (en ? <PanelLeftClose size={16} /> : <PanelRightClose size={16} />)}
            </button>
          </div>
          <SidebarContent pathname={pathname} groups={groups} access={access} collapsed={collapsed} />
        </div>

        <div className="admin-main">
          <div className="admin-topbar ads-topbar">
            <button type="button" className="admin-mobile-toggle ads-round-btn" onClick={() => setMobileOpen(true)} aria-label={tr("منو", "Menu")} aria-expanded={mobileOpen}>
              <Menu size={20} />
            </button>
            <h1 className="admin-page-title ads-title">{pageTitle(pathname)}</h1>
            <button type="button" className="ads-search" onClick={() => setPaletteOpen(true)} aria-label={tr("جست‌وجو", "Search")} aria-keyshortcuts="Control+K">
              <Search size={15} aria-hidden="true" />
              <span className="ads-search-text">{tr("جست‌وجوی کاربر، تراکنش، کد تخفیف، تیکت", "Search users, transactions, discount codes, tickets")}</span>
              <kbd className="ads-kbd">Ctrl K</kbd>
            </button>
            <div className="admin-topbar-actions ads-actions">
              <AdminAlertsBell />
              <button type="button" className="admin-icon-btn ads-hide-sm" onClick={toggle} aria-label={tr("تغییر تم", "Change theme")}>
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <Link href="/" className="admin-icon-btn ads-hide-sm" aria-label={tr("بازگشت به اپ", "Back to app")}><Home size={16} /></Link>
            </div>
          </div>
          <div className="admin-content ads-content">{allowed ? children : <NoAccess />}</div>
        </div>

        <BottomNav pathname={pathname} access={access} onMore={() => setMobileOpen(true)} />
        <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} access={access} />

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div className="admin-mobile-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
              <motion.div
                className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label={tr("منوی پنل", "Panel menu")}
                initial={{ x: drawerX }} animate={{ x: 0 }} exit={{ x: drawerX }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <Brand onClose={() => setMobileOpen(false)} />
                <SidebarContent pathname={pathname} groups={groups} access={access} onNavigate={() => setMobileOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AdminAlertsProvider>
    </AdminToastProvider>
    </AdminAccessContext.Provider>
  );
}
