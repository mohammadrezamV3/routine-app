"use client";

import { useFeatures } from "@/lib/useFeatures";
import { useMenuPresence } from "@/lib/useMenuPresence";
import { featureVisible } from "@/lib/featureFlags";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "./ThemeProvider";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import { getAccount, activeModulesOf } from "@/lib/accountCache";
import { HeaderStreakClock } from "./HeaderStreakClock";
import { AgentAvatar } from "./AgentAvatar";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { getNotificationPermission, requestNotificationPermission, notificationsSupported } from "@/lib/notifications";
import { subscribeToPush } from "@/lib/pushClient";
import { getPreloadedBootstrap } from "@/lib/preload";
import { tr } from "@/lib/i18n";
import { brandName } from "@/lib/brand";
import { SECTION_META } from "@/lib/sections";
import { BLANK_PIXEL, HEADER_DESKTOP_MEDIA, HEADER_MOBILE_MEDIA, sectionIconSm, sectionWordmarkSm } from "@/lib/sectionAssets";
import { useSection } from "./SectionProvider";
import HeaderLangButton from "./HeaderLangButton";
import OfflineIndicator from "./OfflineIndicator";
import "./site-header.css";

// NavDrawer توی root layout هست و روی هر صفحه mount می‌شه، پس فقط خود نوار هدر
// (لوگو، همبرگر، آواتار/زنگوله/استریک) و استیت کوچکش توی باندل اصلیه. بقیه lazy:
//  - محتوای کشو (لینک‌ها، ICONS، سوییچ تم/زبان): بعد از اولین پینت در زمان بیکاری،
//    یا همون لحظه‌ی هاور/لمس/فوکوس دکمه‌ی منو لود می‌شه تا باز شدنش فوری باشه.
//  - پنل پروفایل و پنل اعلان: با اولین کلیک (پیش‌لود روی هاور/لمس/بیکاری).
//  - منوی افقی دسکتاپ (DesktopNav / DesktopNavEnd): برای هر دو زبان، SSR می‌شن
//    (بدون پرش چیدمان)؛ زیر 1024px با CSS مخفیان.
const loadDrawer = () => import("./NavDrawerContent");
const loadProfileMenu = () => import("./NavProfileMenu");
const loadNotifPanel = () => import("./NotificationPanel");
const loadSwitcher = () => import("./SectionSwitcher");
const NavDrawerContent = dynamic(loadDrawer, { ssr: false });
const NavProfileMenu = dynamic(loadProfileMenu, { ssr: false });
const SectionSwitcher = dynamic(loadSwitcher, { ssr: false });
const NotificationPanel = dynamic(() => loadNotifPanel().then((m) => m.NotificationPanel), { ssr: false });
const DesktopNav = dynamic(() => import("./DesktopNav"));
const DesktopNavEnd = dynamic(() => import("./DesktopNavEnd"));

// آیکون ورود (فقط همین یکی توی نوار لازمه؛ بقیه‌ی ست در NavIcons.tsx)
const LOGIN_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><path d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 12H4m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

function whenIdle(fn: () => void, timeout = 2500): () => void {
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = setTimeout(fn, 1200);
  return () => clearTimeout(t);
}

// کش‌شده بیرون کامپوننت — مثل الگوی NotificationPanel/AccountPanel، تا
// هدر (که توی همه‌ی صفحه‌ها mount می‌شه) هر بار عکس رو دوباره فچ نکنه.
let cachedAvatarUrl: string | null = null;
// ارجاع به تصویرهای گرم‌شده تا دانلودشون وسط راه رها نشه
let warmedWordmarks: HTMLImageElement[] = [];
// لنگر پنل‌های پروفایل/اعلان: در دسکتاپ rtl گروه دکمه‌ها سمت چپ صفحه‌ست، پس پنل
// به لبه‌ی چپ دکمه می‌چسبه و به راست باز می‌شه (آینه‌ی ltr). موبایل بدون تغییر.
function anchorOf(r: DOMRect) {
  const start = document.documentElement.dir === "rtl" && window.innerWidth >= 1024;
  return { top: r.bottom + 12, edge: start ? r.left : window.innerWidth - r.right, start };
}

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  // لود محتوای کشو: بعد از بیکاری/هاور/لمس/باز شدن (پایین‌تر)
  const [drawerWanted, setDrawerWanted] = useState(false);
  // برای نشون قفل آیتم‌های پولی منو — null یعنی «هنوز معلوم نیست»
  // (چیزی رندر نمی‌کنیم تا از فلش اشتباه جلوگیری بشه).
  const [activeModules, setActiveModules] = useState<Set<string> | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  // خروج نرم منوی پروفایل و پنل اعلان (حرکت مشترک menu-motion)
  const profilePresence = useMenuPresence(profileMenuOpen);
  const notifPresence = useMenuPresence(notifPanelOpen);
  // پنجره‌ی جابه‌جایی بخش‌ها (زدن لوگوی هدر)
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherPresence = useMenuPresence(switcherOpen);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);
  const section = useSection();
  useLockBodyScroll(open || profileMenuOpen);
  // موقعیت لنگر پنل‌های پروفایل/اعلان‌ها — چون این دو تا به بادی پورتال
  // می‌شن (نه دیگه فرزند app-topbar)، باید مختصاتشون رو خودمون از روی دکمه‌ی
  // محرک حساب کنیم. علت پورتال‌کردن: app-topbar خودش backdrop-filter داره، و یه
  // پنل توی فرزندانش که خودش هم backdrop-filter داره فقط لایه‌ی از‌قبل‌بلورشده‌ی
  // تقریبا خالی همون stacking context رو می‌بینه، نه محتوای واقعی پشت صفحه.
  const [profileAnchor, setProfileAnchor] = useState<{ top: number; edge: number; start?: boolean } | null>(null);
  const [bellAnchor, setBellAnchor] = useState<{ top: number; edge: number; start?: boolean } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatarUrl);
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const features = useFeatures();
  const authSlotRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const logoBtnRef = useRef<HTMLButtonElement>(null);
  // صفحات ورود/ثبت‌نام هدر خودشونو دارن (فلش بازگشت + نشان برند) — هدر
  // سراسری سایت اونجا لازم نیست و فقط شلوغی اضافه می‌کنه.
  // پنل Owner (/admin) کاملا محیط جدایی‌ست — نه هدر/منوی سایت اصلی، نه
  // پس‌زمینه‌ی aurora (پایین‌تر در BackgroundCanvasLoader)
  const hideTopbar = pathname?.startsWith("/auth") || pathname?.startsWith("/admin");
  // تغییر زبان فقط از تنظیمات و از هدر صفحه‌ی لندینگ (مهمان روی «/») ممکنه
  const isLanding = pathname === "/" && status === "unauthenticated";

  // آیتم‌های منو عمدا `<Link>` واقعی‌اند، نه `<a onClick={router.push}>`:
  // با router.push هیچ prefetchی وجود ندارد و ضربه یعنی شروع دانلود صفحه از
  // صفر؛ Link مقصد را از قبل آماده می‌کند و ناوبری‌اش دست خود Next است.

  // پیش‌لود تکه‌های lazy: بعد از اولین پینت در زمان بیکاری (کشو برای همه، منوی
  // پروفایل فقط برای کاربر واردشده)، تا اولین باز شدن فوری باشه.
  useEffect(() => {
    return whenIdle(() => {
      setDrawerWanted(true);
      loadDrawer();
    });
  }, []);
  useEffect(() => {
    if (status !== "authenticated") return;
    return whenIdle(() => { loadProfileMenu(); }, 4000);
  }, [status]);
  // بعد از اولین پینت در بیکاری (سقف 2.5 ثانیه): چانک پنجره‌ی بخش‌ها
  useEffect(() => whenIdle(() => { loadSwitcher(); }, 2500), []);
  // حروف ARION هر دو تم: هدر دسکتاپ فقط تم جاری رو داره و موبایل اصلا نداره، ولی ردیف‌های پنجره‌ی
  // بخش‌ها (SectionSwitcher) همین تصویرها رو دارن؛ بعد از اولین پینت در بیکاری با همون URL و همون
  // ویژگی‌ها گرم می‌شن (بدون preload پرالویت) تا اولین باز شدن پنجره بدون پاپ‌این باشه.
  useEffect(() => whenIdle(() => {
    if (typeof Image === "undefined" || warmedWordmarks.length) return;
    warmedWordmarks = (["dark", "light"] as const).map((t) => {
      const img = new Image(264, 36);
      img.loading = "eager";
      img.decoding = "sync";
      img.src = sectionWordmarkSm(t);
      return img;
    });
  }, 4000), []);
  // ناوبری = پنجره‌ی بخش‌ها بسته
  useEffect(() => { setSwitcherOpen(false); }, [pathname]);

  function wantDrawer() {
    if (!drawerWanted) setDrawerWanted(true);
    loadDrawer();
  }

  // منوی همبرگری، پروفایل، و اعلان‌ها هر سه توی هدر همزمان قابل بازشدن
  // بودن — الان باز کردن هرکدوم اون دوتای دیگه رو می‌بنده.
  function openHamburgerDrawer() {
    wantDrawer();
    setOpen(true);
    setProfileMenuOpen(false);
    setNotifPanelOpen(false);
    setSwitcherOpen(false);
  }
  function toggleSwitcher() {
    loadSwitcher();
    if (!switcherOpen) {
      setOpen(false);
      setProfileMenuOpen(false);
      setNotifPanelOpen(false);
    }
    setSwitcherOpen(!switcherOpen);
  }
  function toggleProfileMenu() {
    setProfileMenuOpen((v) => {
      const next = !v;
      if (next) {
        setOpen(false);
        setNotifPanelOpen(false);
        setSwitcherOpen(false);
        const r = profileBtnRef.current?.getBoundingClientRect();
        if (r) setProfileAnchor(anchorOf(r));
      }
      return next;
    });
  }

  // یه لیسنر سطح document به‌جای لایه‌ی overlay fixed — چون app-topbar
  // (والد چیپ پروفایل) backdrop-filter داره و برای فرزندهای position:fixed
  // یه containing-block جدید می‌سازه؛ یعنی اون overlay فقط داخل کادر خود
  // هدر پوشش می‌داد، نه کل صفحه. خود پنل به بادی پورتال می‌شه (دیگه فرزند
  // authSlotRef نیست)، پس یه ref جدا برای خود پنل هم لازمه — وگرنه کلیک روی
  // آیتم‌های پنل هم «بیرون» حساب می‌شد و فورا می‌بستش.
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
    // اگه از قبل اجازه‌ی نوتیف داده شده بود ولی این دستگاه هنوز به Web Push
    // سابسکرایب نشده، همین‌جا (بی‌صدا) انجامش می‌ده — subscribeToPush idempotent ـه.
    if (p === "granted") subscribeToPush();
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    function loadAvatar() {
      // آواتار توی پاسخ bootstrap هست (ستونی از خود User) — درخواست جدا
      // فقط وقتی لازمه که bootstrap نرفته باشه.
      const boot = getPreloadedBootstrap();
      const source = boot
        ? boot.data.then((b: any) => (b ? { avatarUrl: b.avatarUrl } : null))
        : fetch("/api/account/avatar").then((r) => (r.ok ? r.json() : null));
      source.then((res: any) => {
        cachedAvatarUrl = res?.avatarUrl ?? null;
        setAvatarUrl(cachedAvatarUrl);
      });
    }
    loadAvatar();
    window.addEventListener("avatar-updated", loadAvatar);
    return () => window.removeEventListener("avatar-updated", loadAvatar);
  }, [status]);

  // پیش‌بارگذاری اطلاعیه‌ها موقع لود صفحه — هم برای نشون تعداد نخونده‌ها
  // روی زنگوله، هم اینکه وقتی کاربر واقعا زنگوله رو بزنه، پنل از کش آماده
  // باز شه.
  const notifPanelOpenRef = useRef(false);
  notifPanelOpenRef.current = notifPanelOpen;
  const notifLoadSeq = useRef(0);
  function loadNotifCount() {
    if (status !== "authenticated") return;
    const seq = ++notifLoadSeq.current;
    loadNotifPanel().then(({ preloadNotifications, countUnreadNotifications }) =>
      preloadNotifications().then((items) => {
        // پنل باز یعنی کاربر همین الان داره می‌بینه — نقطه‌ی زنگوله خاموش می‌مونه
        if (seq === notifLoadSeq.current && !notifPanelOpenRef.current) setNotifCount(countUnreadNotifications(items));
      })
    );
  }
  useEffect(() => {
    loadNotifCount();
    return () => { notifLoadSeq.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  // زنده: اعلان تازه (WebSocket/تب دیگه) یا تغییر برنامه‌ها/تیک‌ها → شمارنده همون لحظه.
  // پولینگ فقط-وقت-دیده‌شدن تور ایمنیه برای وقتی WebSocket وصل نیست.
  useLiveRefresh(["notifications", "mentor", "customOccurrences", "removedOccurrences", "daily"], loadNotifCount, {
    enabled: status === "authenticated",
  });
  useVisiblePolling(loadNotifCount, 60_000, { enabled: status === "authenticated", realtimeIntervalMs: 5 * 60_000 });

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

  // طبق درخواست صریح، منو هیچ‌وقت خودکار یه گروه رو باز/سلکت‌شده نشون نده.

  // کلیک روی زنگوله همیشه پنل اطلاعیه‌ها رو باز/بسته می‌کنه؛ اگه هنوز اجازه‌ی
  // نوتیف مرورگر گرفته نشده (نقطه‌ی قرمز)، جدا از باز شدن پنل، درخواستش هم می‌ره.
  async function handleBellClick() {
    setNotifPanelOpen((v) => {
      const next = !v;
      if (next) {
        setOpen(false);
        setProfileMenuOpen(false);
        setSwitcherOpen(false);
        setNotifCount(0);
        const r = bellBtnRef.current?.getBoundingClientRect();
        if (r) setBellAnchor(anchorOf(r));
      }
      return next;
    });
    if (!notificationsSupported() || notifPermission === "granted") return;
    const p = await requestNotificationPermission();
    setNotifPermission(p);
    // اجازه‌ی نوتیف مرورگر جدا از سابسکرایب‌شدن به Web Pushه — این یکی
    // برای یادآوری‌های واقعی حتی وقتی تب/اپ بسته‌ست لازمه (lib/pushClient.ts).
    if (p === "granted") subscribeToPush();
  }

  const closeDrawer = () => setOpen(false);

  return (
    <>
      {!hideTopbar && (
        <>
          {/* طبق درخواست صریح: بالای صفحه (پشت نوار وضعیت/بریدگی دوربین
              روی موبایل) هم باید موقع اسکرول بلور بماند. این عنصر مستقل، فقط
              همان نوار را (به ارتفاع safe-area-inset-top) می‌پوشاند. */}
          <div className="app-topbar-statusbar-blur" aria-hidden="true" />
          <header className="app-topbar" data-site-header="1">
          <div className="topbar-actions-left">
            {/* لوگو دکمه‌ی پنجره‌ی بخش‌هاست (SectionSwitcher). بخش موثر همیشه یکی از سه بخشه: دسکتاپ
                «ARION | TRADE»، موبایل «نشان A رنگی | TRADE». تصویرها همون اولین رندر سرور داخل HTMLان و
                preload اون‌ها از layout ریشه میاد (app/layout.tsx، با همین media و همین URL)؛ <picture>
                باعث می‌شه فقط تصویر جور با عرض صفحه (و فقط تم جاری) دانلود بشه. */}
            <button
              ref={logoBtnRef}
              type="button"
              className="topbar-logo-lockup-wrap topbar-logo-section"
              aria-label={`${tr("تغییر بخش آریون", "Switch Arion section")} (${SECTION_META[section].label})`}
              aria-haspopup="menu"
              aria-expanded={switcherOpen}
              onClick={toggleSwitcher}
              onPointerEnter={() => { loadSwitcher(); }}
              onTouchStart={() => { loadSwitcher(); }}
              onFocus={() => { loadSwitcher(); }}
              style={{
                "--sec-from": SECTION_META[section].colors.from,
                "--sec-mid": SECTION_META[section].colors.mid,
                "--sec-to": SECTION_META[section].colors.to,
              } as React.CSSProperties}
            >
              {/* فقط موبایل (CSS): نشان A رنگی بخش به‌جای حروف ARION؛ با پالت صریح همون .logo-tint */}
              <span className="tls-icon" aria-hidden="true">
                <picture>
                  <source media={HEADER_MOBILE_MEDIA} srcSet={sectionIconSm(section)} />
                  <img src={BLANK_PIXEL} alt="" width={100} height={85} decoding="sync" fetchPriority="high" draggable={false} />
                </picture>
                <span className="logo-tint" />
              </span>
              {/* فقط دسکتاپ (CSS): حروف ARION تم جاری */}
              <span className="tls-word">
                <picture>
                  <source media={HEADER_DESKTOP_MEDIA} srcSet={sectionWordmarkSm(theme === "light" ? "light" : "dark")} />
                  <img src={BLANK_PIXEL} alt={brandName()} width={264} height={36} decoding="sync" fetchPriority="high" className="topbar-logo-lockup" />
                </picture>
              </span>
              <span className="tls-sep" aria-hidden="true" />
              <span className="tls-label" dir="ltr">{SECTION_META[section].wordmark}</span>
              {/* فلش کوچیک: نشون می‌ده لوگو منو باز می‌کنه؛ داخل همون دکمه تا یک هدف کلیک باشه */}
              <svg className="tl-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {switcherPresence.present && (
              <SectionSwitcher
                state={switcherPresence.state}
                anchorRef={logoBtnRef}
                section={section}
                signedIn={status === "authenticated"}
                onClose={closeSwitcher}
              />
            )}
          </div>
          <DesktopNav
            pathname={pathname || ""}
            features={features}
            activeModules={activeModules}
          />
          <div className="topbar-actions">
            <button
              id="menuBtn"
              className={`hamburger${open ? " active" : ""}`}
              aria-label={tr("باز کردن منو", "Open menu")}
              onClick={openHamburgerDrawer}
              onPointerEnter={wantDrawer}
              onTouchStart={wantDrawer}
              onFocus={wantDrawer}
            >
              <span></span><span></span><span></span>
            </button>
            {status === "loading" ? (
              <span className="topbar-auth-placeholder" />
            ) : status === "authenticated" ? (
              <>
                <div ref={authSlotRef} className="profile-chip-wrap topbar-auth-pop">
                  <button
                    ref={profileBtnRef}
                    className="profile-chip"
                    aria-label={tr("پروفایل", "Profile")}
                    onClick={toggleProfileMenu}
                    onPointerEnter={() => { loadProfileMenu(); }}
                    onTouchStart={() => { loadProfileMenu(); }}
                  >
                    <span className="profile-chip-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="profile-chip-avatar-img" />
                      ) : (
                        <AgentAvatar seed={session?.user?.name || session?.user?.email || "؟"} size={28} />
                      )}
                    </span>
                  </button>
                  {profilePresence.present && profileAnchor && (
                    <NavProfileMenu
                      panelRef={profilePanelRef}
                      state={profilePresence.state}
                      anchor={profileAnchor}
                      showMentor={features?.mentors === true}
                      showAdmin={!!((session?.user as any)?.isAdmin || (session?.user as any)?.isSuperAdmin)}
                      onClose={() => setProfileMenuOpen(false)}
                    />
                  )}
                </div>
                {featureVisible(features, "notifications") && <div className="bell-btn-wrap">
                  <button ref={bellBtnRef} className="bell-btn" aria-label={tr("اعلان‌ها", "Notifications")} onClick={handleBellClick}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.4 5.6 2 6.5H4c.6-.9 2-2.5 2-6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    {(notifCount > 0 || notifPermission !== "granted") && <span className="bell-dot" />}
                  </button>
                  {notifPresence.present && bellAnchor && (
                    <NotificationPanel onClose={() => setNotifPanelOpen(false)} anchor={bellAnchor} closing={!notifPanelOpen} />
                  )}
                </div>}
                {/* استریک روتین فقط روی روتین و دامنه‌ی اصلی؛ ورزش و ترید ندارن (جداسازی بخش‌ها) */}
                {section === "routine" && featureVisible(features, "routine") && featureVisible(features, "streak") && <HeaderStreakClock />}
              </>
            ) : (
              <div ref={authSlotRef} className="topbar-auth-pop topbar-guest-slot">
                <button className="topbar-signin-btn" onClick={() => router.push("/auth/login")}>
                  <span className="topbar-signin-icon">{LOGIN_ICON}</span>
                  <span>{tr("ورود", "Log in")}</span>
                </button>
              </div>
            )}
            {isLanding && <HeaderLangButton />}
            <DesktopNavEnd guest={status === "unauthenticated"} />
          </div>
        </header>
        <OfflineIndicator />
        </>
      )}

      <div className={`nav-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} />

      <nav className={`nav-drawer${open ? " open" : ""}`}>
        <div className="nav-drawer-glass">
          {drawerWanted && (
            <NavDrawerContent
              open={open}
              onClose={closeDrawer}
              authed={status === "authenticated"}
              features={features}
              activeModules={activeModules}
            />
          )}
        </div>
      </nav>
    </>
  );
}
