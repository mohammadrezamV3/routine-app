"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { animate } from "animejs";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { getAccount, activeModulesOf, invalidateAccountCache } from "@/lib/accountCache";
import { HeaderStreakClock } from "./HeaderStreakClock";
import { AgentAvatar } from "./AgentAvatar";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { getNotificationPermission, requestNotificationPermission, notificationsSupported } from "@/lib/notifications";
import { subscribeToPush } from "@/lib/pushClient";

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
  notepad: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 6.5c-1.6-1.2-3.7-1.7-6-1.7v13c2.3 0 4.4.5 6 1.7 1.6-1.2 3.7-1.7 6-1.7v-13c-2.3 0-4.4.5-6 1.7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 6.5v13" stroke="currentColor" strokeWidth="1.6"/></svg>
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
// module: اگه ست بشه، یعنی این آیتم پولیه — اگه کاربر دسترسیِ فعال به این
// ماژول رو نداشته باشه، کنار لیبلش یه آیکون قفل نشون داده می‌شه (فقط
// نشانه‌ست، enforcement واقعی همچنان سمتِ سرور/ModuleGate انجام می‌شه).
// superAdminOnly: کلاً برای همه به‌جز سوپریوزر غیرفعاله (نه یه ماژولِ
// خریدنی مثلِ بقیه) — از منو هم مخفی می‌شه، نه فقط قفل‌نشون‌داده.
type NavLink = { href: string; label: string; icon: string; module?: string; superAdminOnly?: boolean };
type NavGroup = { label: string; icon: string; children: NavLink[]; module?: string };
type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const LINKS: NavItem[] = [
  { href: "/weekly", label: "روتین", icon: "weekly" },
  { href: "/notepad", label: "Notepad", icon: "notepad", superAdminOnly: true },
  { href: "/roadmaps", label: "رودمپ‌ها", icon: "roadmaps", superAdminOnly: true },
  {
    label: "بدنسازی", icon: "exercise",
    children: [
      { href: "/exercise?tab=exercise", label: "برنامه تمرینی", icon: "exercise", module: "EXERCISE" },
      { href: "/exercise?tab=calorie", label: "برنامه غذایی", icon: "food", module: "CALORIE" },
    ],
  },
  {
    label: "ترید", icon: "trade",
    children: [
      { href: "/trade?tab=journal", label: "ژورنال", icon: "journal", module: "TRADE" },
      { href: "/trade?tab=checklist", label: "چک‌لیست", icon: "checklist", module: "TRADE" },
    ],
  },
  { href: "/about", label: "درباره ما", icon: "about" },
];

// کش‌شده بیرونِ کامپوننت — مثلِ الگوی NotificationPanel/AccountPanel، تا
// هدر (که توی همه‌ی صفحه‌ها mount می‌شه) هر بار عکس رو دوباره فچ نکنه.
let cachedAvatarUrl: string | null = null;

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  // گروهِ بازشده‌ی منو (بدنسازی/ترید) — با کلیک روی هرکدوم toggle می‌شه؛
  // همیشه با همه‌چیز بسته شروع می‌شه، هیچ‌وقت خودکار باز نمی‌شه.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  // برای نشونِ قفلِ آیتم‌های پولیِ منو — null یعنی «هنوز معلوم نیست»
  // (چیزی رندر نمی‌کنیم تا از فلشِ اشتباه جلوگیری بشه).
  const [activeModules, setActiveModules] = useState<Set<string> | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  useLockBodyScroll(open || profileMenuOpen);
  // موقعیتِ لنگرِ پنل‌های پروفایل/اعلان‌ها — چون این دو تا حالا به بادی
  // پورتال می‌شن (نه دیگه فرزندِ app-topbar)، باید مختصاتشون رو خودمون از
  // روی دکمه‌ی محرک حساب کنیم. علتِ پورتال‌کردن: app-topbar خودش
  // backdrop-filter داره، و یه پنلِ توی فرزندانش که خودش هم backdrop-filter
  // داره فقط لایه‌ی از‌قبل‌بلورشده‌ی تقریباً خالیِ همون stacking context رو
  // می‌بینه، نه محتوای واقعیِ پشتِ صفحه — پس هیچ‌وقت واقعاً مات نمی‌شد.
  const [profileAnchor, setProfileAnchor] = useState<{ top: number; right: number } | null>(null);
  const [bellAnchor, setBellAnchor] = useState<{ top: number; right: number } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatarUrl);
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const authSlotRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
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
      if (next) {
        setOpen(false);
        setNotifPanelOpen(false);
        const r = profileBtnRef.current?.getBoundingClientRect();
        if (r) setProfileAnchor({ top: r.bottom + 12, right: window.innerWidth - r.right });
      }
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
  // خودِ پنل حالا به بادی پورتال می‌شه (دیگه فرزندِ authSlotRef نیست)، پس
  // یه ref جدا برای خودِ پنلِ پورتال‌شده هم لازمه — وگرنه کلیک روی خودِ
  // آیتم‌های پنل هم «بیرون» حساب می‌شد و فوراً می‌بستش.
  const profilePanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (authSlotRef.current?.contains(target)) return;
      if (profilePanelRef.current?.contains(target)) return;
      setProfileMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [profileMenuOpen]);

  useEffect(() => {
    const p = getNotificationPermission();
    setNotifPermission(p);
    // اگه از قبل (مثلاً یه نسخه‌ی قدیمی‌تر) اجازه‌ی نوتیف داده شده بود ولی
    // این دستگاه هنوز به Web Push سابسکرایب نشده، همین‌جا (بی‌صدا، بدون
    // نیاز به باز کردنِ دوباره‌ی پنل) انجامش می‌ده — subscribeToPush خودش
    // idempotent ـه (سابسکریپشنِ موجود رو دوباره می‌فرسته، نه یکی جدید).
    if (p === "granted") subscribeToPush();
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    function loadAvatar() {
      fetch("/api/account/avatar").then((r) => (r.ok ? r.json() : null)).then((res) => {
        cachedAvatarUrl = res?.avatarUrl ?? null;
        setAvatarUrl(cachedAvatarUrl);
      });
    }
    loadAvatar();
    window.addEventListener("avatar-updated", loadAvatar);
    return () => window.removeEventListener("avatar-updated", loadAvatar);
  }, [status]);

  // برای نشونِ قفلِ آیتم‌های پولیِ منو — همون /api/account که ModuleGate هم
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

  // طبقِ درخواستِ صریح، منو هیچ‌وقت خودکار یه گروه رو باز/سلکت‌شده نشون نده —
  // حتی وقتی توی زیرصفحه‌ی یه گروهی (مثلاً /exercise)، منو همیشه با همه‌چیز
  // بسته باز می‌شه؛ کاربر خودش هرکدوم رو خواست دستی باز می‌کنه.

  // کلیک روی زنگوله همیشه پنل اطلاعیه‌ها رو باز/بسته می‌کنه؛ اگه هنوز اجازه‌ی
  // نوتیف مرورگر گرفته نشده (نقطه‌ی قرمز)، جدا از باز شدن پنل، درخواستش هم می‌ره.
  async function handleBellClick() {
    setNotifPanelOpen((v) => {
      const next = !v;
      if (next) {
        setOpen(false);
        setProfileMenuOpen(false);
        const r = bellBtnRef.current?.getBoundingClientRect();
        if (r) setBellAnchor({ top: r.bottom + 12, right: window.innerWidth - r.right });
      }
      return next;
    });
    if (!notificationsSupported() || notifPermission === "granted") return;
    const p = await requestNotificationPermission();
    setNotifPermission(p);
    // اجازه‌ی نوتیفِ مرورگر جدا از سابسکرایب‌شدن به Web Pushه — این یکی
    // برای یادآوری‌های واقعی حتی وقتی تب/اپ بسته‌ست لازمه (lib/pushClient.ts).
    if (p === "granted") subscribeToPush();
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
                  <button ref={profileBtnRef} className="profile-chip" aria-label="پروفایل" onClick={toggleProfileMenu}>
                    <span className="profile-chip-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="profile-chip-avatar-img" />
                      ) : (
                        <AgentAvatar name={session?.user?.name || "؟"} size={27} />
                      )}
                    </span>
                  </button>
                  {profileMenuOpen && profileAnchor && createPortal(
                    <div
                      ref={profilePanelRef}
                      className="notif-panel open"
                      style={{ position: "fixed", top: profileAnchor.top, right: profileAnchor.right, left: "auto" }}
                    >
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
                          onClick={() => { setProfileMenuOpen(false); router.push("/subscription"); }}
                        >
                          <span className="nav-link-icon-svg">{ICONS.subscription}</span>
                          <span>اشتراک</span>
                        </div>
                        <div
                          className="notif-panel-item profile-menu-item"
                          style={{ color: "#E05252" }}
                          onClick={() => { setProfileMenuOpen(false); invalidateStorageCache(); invalidateAccountCache(); signOut({ callbackUrl: "/" }); }}
                        >
                          <span className="nav-link-icon-svg">{ICONS.logout}</span>
                          <span>خروج از حساب</span>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
                <div className="bell-btn-wrap">
                  <button ref={bellBtnRef} className="bell-btn" aria-label="اعلان‌ها" onClick={handleBellClick}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.4 5.6 2 6.5H4c.6-.9 2-2.5 2-6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    {notifPermission !== "granted" && <span className="bell-dot" />}
                  </button>
                  {notifPanelOpen && bellAnchor && createPortal(
                    <NotificationPanel onClose={() => setNotifPanelOpen(false)} anchor={bellAnchor} />,
                    document.body
                  )}
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

          {LINKS.filter((item) => !("superAdminOnly" in item && item.superAdminOnly) || (session?.user as any)?.isSuperAdmin).map((item) => {
            const isLocked = (m?: string) => !!m && activeModules !== null && !activeModules.has(m);
            if (isGroup(item)) {
              const isExpanded = expandedGroup === item.label;
              const groupLocked = item.children.every((c) => isLocked(c.module));
              return (
                <div key={item.label} className={isExpanded ? "nav-group-expanded" : undefined}>
                  <a
                    onClick={() => setExpandedGroup((g) => (g === item.label ? null : item.label))}
                    className={`nav-link nav-link-icon${isExpanded ? " nav-link-active" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="nav-link-icon-svg">{ICONS[item.icon]}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {groupLocked && <Lock size={13} className="nav-link-lock" />}
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
                        <div className="nav-group-children">
                          {item.children.map((c) => (
                            <a key={c.href} onClick={() => go(c.href)} className="nav-link-sub-item">
                              <span style={{ flex: 1 }}>{c.label}</span>
                              {isLocked(c.module) && <Lock size={12} className="nav-link-lock" />}
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
              <a key={item.href} onClick={() => go(item.href)} className="nav-link nav-link-icon">
                <span className="nav-link-icon-svg">{ICONS[item.icon]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isLocked(item.module) && <Lock size={13} className="nav-link-lock" />}
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
