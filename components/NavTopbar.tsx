"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { animate } from "animejs";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HeaderStreakClock } from "./HeaderStreakClock";
import { AgentAvatar } from "./AgentAvatar";
import { ProfileMenuList } from "./ProfileMenuList";
import { ICONS } from "./NavIcons";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { getNotificationPermission, requestNotificationPermission, notificationsSupported } from "@/lib/notifications";
import { subscribeToPush } from "@/lib/pushClient";
import { getPreloadedBootstrap } from "@/lib/preload";

// این فقط با کلیک باز می‌شه (نه توی رندر اولیه‌ی هیچ صفحه‌ای لازمه)، ولی
// NavDrawer خودش توی root layout هست و همه‌جا مانت می‌شه — پس اگه معمولی
// import بشه، باندل اصلی هر صفحه سنگین‌تر می‌شه. با dynamic+ssr:false جدا از
// باندل اصلی لود می‌شه، دقیقا مثل BackgroundCanvas.
const NotificationPanel = dynamic(() => import("./NotificationPanel").then((m) => m.NotificationPanel), { ssr: false });

// کش‌شده بیرون کامپوننت — مثل الگوی NotificationPanel/AccountPanel، تا
// هدر (که توی همه‌ی صفحه‌ها mount می‌شه) هر بار عکس رو دوباره فچ نکنه.
let cachedAvatarUrl: string | null = null;

// هدر بالای وب (لوگو، همبرگر، چیپ پروفایل + منوش، زنگوله + پنل اطلاعیه‌ها،
// استریک). خود کشوی منو (NavMenuPanel) جداست و state بازبودنش دست
// NavDrawerه؛ این‌جا فقط باز/بسته‌کردنش هماهنگ می‌شه.
export function NavTopbar({
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
}: {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  // قفل اسکرول کشو خودش در NavDrawerه؛ شمارنده‌ی سراسری useLockBodyScroll
  // باعث می‌شه دو قفل جدا دقیقا مثل همون `open || profileMenuOpen` قبلی رفتار کنن.
  useLockBodyScroll(profileMenuOpen);
  // موقعیت لنگر پنل‌های پروفایل/اعلان‌ها — چون این دو تا حالا به بادی
  // پورتال می‌شن (نه دیگه فرزند app-topbar)، باید مختصاتشون رو خودمون از
  // روی دکمه‌ی محرک حساب کنیم. علت پورتال‌کردن: app-topbar خودش
  // backdrop-filter داره، و یه پنل توی فرزندانش که خودش هم backdrop-filter
  // داره فقط لایه‌ی از‌قبل‌بلورشده‌ی تقریبا خالی همون stacking context رو
  // می‌بینه، نه محتوای واقعی پشت صفحه — پس هیچ‌وقت واقعا مات نمی‌شد.
  const [profileAnchor, setProfileAnchor] = useState<{ top: number; right: number } | null>(null);
  const [bellAnchor, setBellAnchor] = useState<{ top: number; right: number } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatarUrl);
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const authSlotRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  // صفحات ورود/ثبت‌نام هدر خودشونو دارن (فلش بازگشت + نشان برند) — هدر
  // سراسری سایت اونجا لازم نیست و فقط شلوغی اضافه می‌کنه.
  // پنل Owner (/admin) کاملا محیط جدایی‌ست — نه هدر/منوی سایت اصلی، نه
  // پس‌زمینه‌ی aurora (پایین‌تر در BackgroundCanvasLoader)
  const hideTopbar = pathname?.startsWith("/auth") || pathname?.startsWith("/admin");

  // منوی همبرگری، پروفایل، و اعلان‌ها هر سه توی هدر همزمان قابل بازشدن
  // بودن (سه تا state جدا، بدون هماهنگی) — کاربر می‌تونست چندتاشونو با هم
  // باز کنه. الان باز کردن هرکدوم اون دوتای دیگه رو می‌بنده.
  function openHamburgerDrawer() {
    onOpenDrawer();
    setProfileMenuOpen(false);
    setNotifPanelOpen(false);
  }
  // مقصدهای منوی پروفایل در هیچ `<Link>`ی نیستند (آیتم‌هایش دکمه‌اند، چون
  // پنل پورتال‌شده است)، پس Next خودش آماده‌شان نمی‌کند. با بازشدنِ پنل
  // همان‌جا prefetch می‌شوند تا ضربه‌ی بعدی منتظرِ دانلود نماند.
  useEffect(() => {
    if (!profileMenuOpen) return;
    router.prefetch("/account");
    router.prefetch("/subscription");
  }, [profileMenuOpen, router]);

  // بستن کشو (state والد) عمدا بیرون از updater ـه — updaterها ممکنه وسط
  // رندر همین کامپوننت اجرا بشن و setState والد اون‌جا مجاز نیست.
  function toggleProfileMenu() {
    const next = !profileMenuOpen;
    if (next) {
      onCloseDrawer();
      setNotifPanelOpen(false);
      const r = profileBtnRef.current?.getBoundingClientRect();
      if (r) setProfileAnchor({ top: r.bottom + 12, right: window.innerWidth - r.right });
    }
    setProfileMenuOpen(next);
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

  // یه لیسنر سطح document به‌جای لایه‌ی overlay fixed — چون app-topbar
  // (والد چیپ پروفایل) backdrop-filter داره و برای فرزندهای position:fixed
  // یه containing-block جدید می‌سازه؛ یعنی اون overlay فقط داخل کادر خود
  // هدر پوشش می‌داد، نه کل صفحه، پس کلیک روی بقیه‌ی صفحه بسته‌ش نمی‌کرد.
  // خود پنل حالا به بادی پورتال می‌شه (دیگه فرزند authSlotRef نیست)، پس
  // یه ref جدا برای خود پنل پورتال‌شده هم لازمه — وگرنه کلیک روی خود
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
    // اگه از قبل (مثلا یه نسخه‌ی قدیمی‌تر) اجازه‌ی نوتیف داده شده بود ولی
    // این دستگاه هنوز به Web Push سابسکرایب نشده، همین‌جا (بی‌صدا، بدون
    // نیاز به باز کردن دوباره‌ی پنل) انجامش می‌ده — subscribeToPush خودش
    // idempotent ـه (سابسکریپشن موجود رو دوباره می‌فرسته، نه یکی جدید).
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
  // باز شه (نه از صفر، که «بارگذاری خیلی طول می‌کشه» حس می‌داد).
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    import("./NotificationPanel").then(({ preloadNotifications }) =>
      preloadNotifications().then((items) => {
        if (!cancelled) setNotifCount(items.length);
      })
    );
    return () => { cancelled = true; };
  }, [status]);

  // کلیک روی زنگوله همیشه پنل اطلاعیه‌ها رو باز/بسته می‌کنه؛ اگه هنوز اجازه‌ی
  // نوتیف مرورگر گرفته نشده (نقطه‌ی قرمز)، جدا از باز شدن پنل، درخواستش هم می‌ره.
  async function handleBellClick() {
    const next = !notifPanelOpen;
    if (next) {
      onCloseDrawer();
      setProfileMenuOpen(false);
      setNotifCount(0);
      const r = bellBtnRef.current?.getBoundingClientRect();
      if (r) setBellAnchor({ top: r.bottom + 12, right: window.innerWidth - r.right });
    }
    setNotifPanelOpen(next);
    if (!notificationsSupported() || notifPermission === "granted") return;
    const p = await requestNotificationPermission();
    setNotifPermission(p);
    // اجازه‌ی نوتیف مرورگر جدا از سابسکرایب‌شدن به Web Pushه — این یکی
    // برای یادآوری‌های واقعی حتی وقتی تب/اپ بسته‌ست لازمه (lib/pushClient.ts).
    if (p === "granted") subscribeToPush();
  }

  if (hideTopbar) return null;

  return (
    <>
      {/* طبقِ درخواستِ صریح: بالای صفحه (پشتِ نوار وضعیت/بریدگیِ دوربین
          روی موبایل) هم باید موقعِ اسکرول بلور بماند، نه بک‌گراندِ خامِ
          صفحه. .app-topbar خودش از `top:14px + safe-area-inset-top`
          شروع می‌شود، یعنی از خودِ safe-area تا لبه‌ی بالای صفحه یک
          نواری می‌ماند که قبلاً هیچ بلوری نداشت. این عنصر مستقل، فقط
          همان نوار را (به ارتفاعِ safe-area-inset-top) می‌پوشاند. */}
      <div className="app-topbar-statusbar-blur" aria-hidden="true" />
      <header className="app-topbar">
      <div className="topbar-actions-left">
        {/* هر دو نسخه (روز/شب) هم‌زمان با اولین رندر لود می‌شن (هردو priority)،
            فقط با opacity جابه‌جا می‌شن — نه اینکه src عوض بشه، وگرنه موقع
            تعویض تم، تصویر تم جدید (که تا اون لحظه fetch نشده) یه تاخیر
            دیدنی داشت تا دانلود بشه. */}
        <Link href="/" aria-label="رفتن به صفحه اصلی" className="topbar-logo-lockup-wrap">
          <Image
            src="/images/logo-lockup-dark-theme.png"
            alt="Arion"
            width={138}
            height={34}
            className={`topbar-logo-lockup${theme === "light" ? " topbar-logo-lockup-hidden" : ""}`}
            priority
          />
          <Image
            src="/images/logo-lockup-light-theme.webp"
            alt="Arion"
            width={138}
            height={34}
            className={`topbar-logo-lockup${theme === "light" ? "" : " topbar-logo-lockup-hidden"}`}
            priority
          />
        </Link>
      </div>
      <div className="topbar-actions">
        <button
          id="menuBtn"
          className={`hamburger${drawerOpen ? " active" : ""}`}
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
                    <AgentAvatar seed={session?.user?.name || session?.user?.email || "؟"} size={28} />
                  )}
                </span>
              </button>
              {profileMenuOpen && profileAnchor && createPortal(
                <div
                  ref={profilePanelRef}
                  className="notif-panel open"
                  style={{ position: "fixed", top: profileAnchor.top, right: profileAnchor.right, left: "auto" }}
                >
                  <ProfileMenuList onPick={() => setProfileMenuOpen(false)} />
                </div>,
                document.body
              )}
            </div>
            <div className="bell-btn-wrap">
              <button ref={bellBtnRef} className="bell-btn" aria-label="اعلان‌ها" onClick={handleBellClick}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.4 5.6 2 6.5H4c.6-.9 2-2.5 2-6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.5 19a2.6 2.6 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                {(notifCount > 0 || notifPermission !== "granted") && <span className="bell-dot" />}
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
    </>
  );
}
