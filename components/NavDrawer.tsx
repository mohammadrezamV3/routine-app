"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { animate } from "animejs";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { HeaderStreakClock } from "./HeaderStreakClock";
import { getNotificationPermission, requestNotificationPermission, notificationsSupported } from "@/lib/notifications";

// این دوتا فقط با کلیک باز می‌شن (نه توی رندر اولیه‌ی هیچ صفحه‌ای لازم‌ان)،
// ولی NavDrawer خودش توی root layout هست و همه‌جا مانت می‌شه — پس اگه معمولی
// import بشن، باندلِ اصلیِ هر صفحه سنگین‌تر می‌شه (مخصوصاً AccountPanel که
// حالا کاتالوگ ~۳۶۰تاییِ بازارها رو هم می‌کِشه). با dynamic+ssr:false جدا از
// باندل اصلی لود می‌شن، دقیقاً مثل BackgroundCanvas.
const AccountPanel = dynamic(() => import("./AccountPanel").then((m) => m.AccountPanel), { ssr: false });
const NotificationPanel = dynamic(() => import("./NotificationPanel").then((m) => m.NotificationPanel), { ssr: false });

// آیکون‌های خطی ساده برای هر آیتم منو — یک svg مجموعه یکدست برای همه.
// export شده چون LandingPage هم همین ست رو برای کارت‌های ماژول استفاده می‌کنه.
export const ICONS: Record<string, JSX.Element> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  weekly: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 9.5h17M8 3v3.4M16 3v3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  roadmaps: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 20 9 4l4 12 3-6 4 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  exercise: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M6.5 8v8M17.5 8v8M3 10v4M21 10v4M6.5 12h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  trade: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 17 9.5 11l3.5 3 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 6.5h4.5V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  // آیکونِ اختصاصیِ «برنامه غذایی» (زیرمجموعه‌ی بدنسازی) — سیب، تا از
  // آیکونِ دمبلِ «برنامه تمرینی» واضح جدا باشه
  food: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 8.3c-2.7-2.5-6.4-1.5-7.7 1.1-1.7 3.3-.4 8.3 2.5 10.4 1.3 1 2.7 1 3.9.3.6-.3 1.1-.3 1.7 0 1.2.7 2.6.7 3.9-.3 2.9-2.1 4.2-7.1 2.5-10.4-1.3-2.6-5-3.6-7.7-1.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 8.3c0-1.9.8-3.4 2.2-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  // آیکونِ اختصاصیِ «ژورنال» (زیرمجموعه‌ی ترید) — دفترچه
  journal: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M9 8h6M9 12h6M9 16h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  // آیکونِ اختصاصیِ «چک‌لیست» (زیرمجموعه‌ی ترید) — چک‌باکس‌های ردیفی
  checklist: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/><path d="M4.3 6.5 5.2 7.4 6.8 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="3.5" y="14" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/><path d="M4.3 16 5.2 16.9 6.8 15.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 6.5h9.5M11 16h9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7"/><path d="M12 11v5.2M12 8.3v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.7"/><path d="M5 19.5c1.3-3.3 4-5 7-5s5.7 1.7 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  subscription: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7"/><path d="M7 14h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M15 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 12h10m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 12H4m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  signup: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.7"/><path d="M2.5 19c1.2-3.2 3.7-4.9 6.5-4.9s5.3 1.7 6.5 4.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M18.5 8v5.5M15.8 10.75h5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
};

// «صفحه اصلی» قدیمی (/) دیگه توی منو نیست — کاربرِ لاگین‌کرده مستقیم به
// برنامه هفتگی می‌ره، پس همون این‌جا لیبل «روتین» رو می‌گیره؛ خودِ صفحه‌ی
// هیرو (/) دست‌نخورده می‌مونه، فقط دیگه لینک جدایی توی منو نداره.
//
// «بدنسازی» و «ترید» دیگه لینکِ مستقیم نیستن — با کلیک زیرمجموعه‌هاشون باز
// می‌شن (برنامه‌ی تمرینی/برنامه‌ی غذایی، چک‌لیست/ژورنال) تا کاربر مستقیم از
// منو به تبِ موردنظر بره، نه اینکه اول صفحه باز شه و بعد از توی خودش تب بزنه.
type NavLink = { href: string; label: string; icon: string };
type NavGroup = { label: string; icon: string; children: NavLink[] };
type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const LINKS: NavItem[] = [
  { href: "/weekly", label: "روتین", icon: "weekly" },
  { href: "/roadmaps", label: "رودمپ‌ها", icon: "roadmaps" },
  {
    label: "بدنسازی", icon: "exercise",
    children: [
      { href: "/exercise?tab=exercise", label: "برنامه تمرینی", icon: "exercise" },
      { href: "/exercise?tab=calorie", label: "برنامه غذایی", icon: "food" },
    ],
  },
  {
    label: "ترید", icon: "trade",
    children: [
      { href: "/trade?tab=journal", label: "ژورنال", icon: "journal" },
      { href: "/trade?tab=checklist", label: "چک‌لیست", icon: "checklist" },
    ],
  },
  { href: "/about", label: "درباره ما", icon: "about" },
];

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  // گروهِ بازشده‌ی منو (بدنسازی/ترید) — با کلیک روی هرکدوم toggle می‌شه؛
  // اگه صفحه‌ی فعلی زیرمجموعه‌ی یه گروهه، همون گروه پیش‌فرض باز می‌مونه.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const authSlotRef = useRef<HTMLDivElement>(null);
  // صفحات ورود/ثبت‌نام هدر خودشونو دارن (فلش بازگشت + نشان برند) — هدر
  // سراسری سایت اونجا لازم نیست و فقط شلوغی اضافه می‌کنه.
  const hideTopbar = pathname?.startsWith("/auth");

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  // منوی همبرگری، پروفایل، و اعلان‌ها هر سه توی هدر همزمان قابلِ بازشدن
  // بودن (سه تا state جدا، بدون هماهنگی) — کاربر می‌تونست چندتاشونو با هم
  // باز کنه. الان باز کردنِ هرکدوم اون دوتای دیگه رو می‌بنده.
  function openHamburgerDrawer() {
    setOpen(true);
    setProfileMenuOpen(false);
    setNotifPanelOpen(false);
  }
  function toggleProfileMenu() {
    setProfileMenuOpen((v) => {
      const next = !v;
      if (next) { setOpen(false); setNotifPanelOpen(false); }
      return next;
    });
  }

  useEffect(() => {
    if (status === "loading" || !authSlotRef.current) return;
    animate(authSlotRef.current, {
      opacity: [0, 1],
      scale: [0.85, 1],
      duration: 380,
      ease: "outBack",
    });
  }, [status]);

  // یه لیسنرِ سطحِ document به‌جای لایه‌ی overlayِ fixed — چون app-topbar
  // (والدِ چیپِ پروفایل) backdrop-filter داره و برای فرزندهای position:fixed
  // یه containing-block جدید می‌سازه؛ یعنی اون overlay فقط داخلِ کادرِ خودِ
  // هدر پوشش می‌داد، نه کلِ صفحه، پس کلیک روی بقیه‌ی صفحه بسته‌ش نمی‌کرد.
  useEffect(() => {
    if (!profileMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (authSlotRef.current && !authSlotRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [profileMenuOpen]);

  // دکمه‌ی «خرید اشتراک» توی دیوارهای پی‌وال (ModuleGate)، از هر صفحه‌ای، با
  // این event پنل کاربری رو باز می‌کنه — بدون نیاز به query-param یا context
  useEffect(() => {
    const openAccount = () => setAccountOpen(true);
    window.addEventListener("open-account-panel", openAccount);
    return () => window.removeEventListener("open-account-panel", openAccount);
  }, []);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  // وقتی صفحه‌ی فعلی زیرمجموعه‌ی یه گروهه (مثلاً روی /exercise هستیم)،
  // همون گروه پیش‌فرض باز باشه — کاربر نباید مجبور باشه اول باز کنه تا ببینه کجاست
  useEffect(() => {
    const activeGroup = LINKS.find((item) => isGroup(item) && item.children.some((c) => c.href.startsWith(pathname || "")));
    if (activeGroup && isGroup(activeGroup)) setExpandedGroup(activeGroup.label);
  }, [pathname]);

  // کلیک روی زنگوله همیشه پنل اطلاعیه‌ها رو باز/بسته می‌کنه؛ اگه هنوز اجازه‌ی
  // نوتیف مرورگر گرفته نشده (نقطه‌ی قرمز)، جدا از باز شدن پنل، درخواستش هم می‌ره.
  async function handleBellClick() {
    setNotifPanelOpen((v) => {
      const next = !v;
      if (next) { setOpen(false); setProfileMenuOpen(false); }
      return next;
    });
    if (!notificationsSupported() || notifPermission === "granted") return;
    const p = await requestNotificationPermission();
    setNotifPermission(p);
  }

  return (
    <>
      {!hideTopbar && (
        <header className="app-topbar">
          <div className="topbar-actions-left">
            <Link href="/" aria-label="رفتن به صفحه اصلی">
              <Image
                src={theme === "light" ? "/images/logo-lockup-light-theme.png" : "/images/logo-lockup-dark-theme.png"}
                alt="Arion"
                width={138}
                height={34}
                className="topbar-logo-lockup"
                priority
              />
            </Link>
          </div>
          <div className="topbar-actions">
            <button
              id="menuBtn"
              className={`hamburger${open ? " active" : ""}`}
              aria-label="باز کردن منو"
              onClick={openHamburgerDrawer}
            >
              <span></span><span></span><span></span>
            </button>
            {status === "loading" ? (
              <span className="topbar-auth-placeholder" />
            ) : status === "authenticated" ? (
              <>
                <div ref={authSlotRef} className="profile-chip-wrap">
                  <button className="profile-chip" aria-label="پروفایل" onClick={toggleProfileMenu}>
                    <span className="profile-chip-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
                      </svg>
                    </span>
                  </button>
                  {profileMenuOpen && (
                    <div className="notif-panel open">
                      <div className="notif-panel-list">
                        <div
                          className="notif-panel-item profile-menu-item"
                          onClick={() => { setProfileMenuOpen(false); setAccountOpen(true); }}
                        >
                          <span className="nav-link-icon-svg">{ICONS.account}</span>
                          <span>پنل کاربری</span>
                        </div>
                        <div
                          className="notif-panel-item profile-menu-item"
                          onClick={() => { setProfileMenuOpen(false); setAccountOpen(true); }}
                        >
                          <span className="nav-link-icon-svg">{ICONS.subscription}</span>
                          <span>اشتراک</span>
                        </div>
                        <div
                          className="notif-panel-item profile-menu-item"
                          style={{ color: "#E05252" }}
                          onClick={() => { setProfileMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                        >
                          <span className="nav-link-icon-svg">{ICONS.logout}</span>
                          <span>خروج از حساب</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bell-btn-wrap">
                  <button className="bell-btn" aria-label="اعلان‌ها" onClick={handleBellClick}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.4 5.6 2 6.5H4c.6-.9 2-2.5 2-6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    {notifPermission !== "granted" && <span className="bell-dot" />}
                  </button>
                  {notifPanelOpen && <NotificationPanel onClose={() => setNotifPanelOpen(false)} />}
                </div>
                <HeaderStreakClock />
              </>
            ) : (
              <div ref={authSlotRef}>
                <button className="topbar-signin-btn" onClick={() => router.push("/auth/login")}>
                  <span className="topbar-signin-icon">{ICONS.login}</span>
                  <span>ورود</span>
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      <div className={`nav-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} />

      <nav className={`nav-drawer${open ? " open" : ""}`}>
        <div className="nav-drawer-glass">
          <div className="nav-title">
            <button onClick={toggle} className="theme-switch" aria-label="تغییر حالت نمایش">
              <span className="ts-knob">
                <span className="ts-icon ts-sun">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4.5" fill="var(--sun)" />
                    <g stroke="var(--sun)" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="1.5" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22.5" />
                      <line x1="1.5" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22.5" y2="12" />
                      <line x1="4.5" y1="4.5" x2="6.2" y2="6.2" /><line x1="17.8" y1="17.8" x2="19.5" y2="19.5" />
                      <line x1="4.5" y1="19.5" x2="6.2" y2="17.8" /><line x1="17.8" y1="6.2" x2="19.5" y2="4.5" />
                    </g>
                  </svg>
                </span>
                <span className="ts-icon ts-moon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="var(--moon)" />
                  </svg>
                </span>
              </span>
            </button>
            <button onClick={() => setOpen(false)} className="nav-close" aria-label="بستن منو">×</button>
          </div>

          {LINKS.map((item) => {
            if (isGroup(item)) {
              const isExpanded = expandedGroup === item.label;
              const isActive = item.children.some((c) => pathname === c.href.split("?")[0]);
              return (
                <div key={item.label}>
                  <a
                    onClick={() => setExpandedGroup((g) => (g === item.label ? null : item.label))}
                    className={`nav-link nav-link-icon${isActive ? " active" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="nav-link-icon-svg">{ICONS[item.icon]}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "flex" }}
                    >
                      <ChevronDown size={16} />
                    </motion.span>
                  </a>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="nav-subgroup-box">
                          {item.children.map((c) => (
                            <a
                              key={c.href}
                              onClick={() => go(c.href)}
                              className={`nav-link-sub-item${pathname === c.href.split("?")[0] ? " active" : ""}`}
                            >
                              <span className="nav-link-icon-svg">{ICONS[c.icon]}</span>
                              <span>{c.label}</span>
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }
            return (
              <a
                key={item.href}
                onClick={() => go(item.href)}
                className={`nav-link nav-link-icon${pathname === item.href ? " active" : ""}`}
              >
                <span className="nav-link-icon-svg">{ICONS[item.icon]}</span>
                <span>{item.label}</span>
              </a>
            );
          })}

          {/* برای کاربر لاگین‌کرده «پنل کاربری» دیگه اینجا نیست — همون گزینه‌ها
              (پنل کاربری/اشتراک/خروج) با کلیک روی آواتار توی هدر باز می‌شن،
              دوباره‌کاری نداره. مهمون هنوز آواتار نداره، پس ورود/ثبت‌نامش می‌مونه. */}
          {status !== "authenticated" && (
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}>
              <a onClick={() => go("/auth/login")} className="nav-link nav-link-icon" style={{ cursor: "pointer" }}>
                <span className="nav-link-icon-svg">{ICONS.login}</span>
                <span>ورود</span>
              </a>
              <a onClick={() => go("/auth/signup")} className="nav-link nav-link-icon" style={{ cursor: "pointer" }}>
                <span className="nav-link-icon-svg">{ICONS.signup}</span>
                <span>ثبت‌نام</span>
              </a>
            </div>
          )}
        </div>
      </nav>

      {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} />}
    </>
  );
}
