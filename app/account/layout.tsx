"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  User, SlidersHorizontal, LayoutGrid, CreditCard, ShieldCheck, Bell, Headset, LogOut,
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { invalidateStorageCache } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { clearAuthHintCookie } from "@/lib/preload";

// پنل کاربریِ Arion — صفحه‌ی مستقلِ /account (نه مودال، نه داشبورد). مسیرها:
//   /account                    → پروفایل (پیش‌فرض)
//   /account/subscription       → اشتراک
//   /account/arion-settings     → تنظیمات آریون (زبان/حریم‌خصوصی — تمِ نمایش
//                                  عمداً این‌جا نیست، همون سوییچِ بالای منوی
//                                  همبرگری کفایت می‌کنه، تکرارش نمی‌کنیم)
//   /account/modules/*          → تنظیمات بخش‌ها (روتین/بدنسازی/کالری/ترید/رودمپ)
//   /account/security           → امنیت
//   /account/notifications      → اعلان‌ها
//   /account/support            → پشتیبانی
const SECTIONS: { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean }[] = [
  { href: "/account", label: "پروفایل", icon: <User size={15} />, match: (p) => p === "/account" },
  { href: "/account/arion-settings", label: "تنظیمات آریون", icon: <SlidersHorizontal size={15} />, match: (p) => p.startsWith("/account/arion-settings") },
  { href: "/account/modules", label: "تنظیمات بخش‌ها", icon: <LayoutGrid size={15} />, match: (p) => p.startsWith("/account/modules") },
  { href: "/account/subscription", label: "اشتراک", icon: <CreditCard size={15} />, match: (p) => p.startsWith("/account/subscription") },
  { href: "/account/security", label: "امنیت", icon: <ShieldCheck size={15} />, match: (p) => p.startsWith("/account/security") },
  { href: "/account/notifications", label: "اعلان‌ها", icon: <Bell size={15} />, match: (p) => p.startsWith("/account/notifications") },
  { href: "/account/support", label: "پشتیبانی", icon: <Headset size={15} />, match: (p) => p.startsWith("/account/support") },
];

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/account";
  const { status } = useSession();
  const mobileTabsRef = useRef<HTMLElement>(null);

  // تبِ فعالِ نوارِ موبایل همیشه به دیدرس اسکرول می‌آد — راهِ قابل‌اتکا برای
  // «راست‌چین/درست‌جادیده‌شدنِ» تب‌ها، چون رفتارِ پیش‌فرضِ scrollLeft توی
  // overflow-x:auto با dir="rtl" بینِ مرورگرها ناسازگاره (کروم/فایرفاکس/سافاری
  // علامت و مبدأش فرق می‌کنه) — به‌جای اتکا به اون، هر بار خودمون صریح
  // اسکرول می‌کنیم، مستقل از هر مبداءِ RTLِ مرورگر.
  useEffect(() => {
    const active = mobileTabsRef.current?.querySelector<HTMLElement>(".account-mobile-tab.active");
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [pathname]);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <section className="account-shell">
        <h1>پنل کاربری</h1>
        <AuthGate message="برای دیدن پنل کاربری اول باید وارد حساب بشی" />
      </section>
    );
  }

  function doLogout() {
    invalidateStorageCache();
    invalidateAccountCache();
    clearAuthHintCookie();
    signOut({ callbackUrl: "/" });
  }

  return (
    <div className="account-shell" dir="rtl">
      <nav className="account-mobile-tabs" ref={mobileTabsRef}>
        {SECTIONS.map((s) => {
          const active = s.match(pathname);
          return (
            <Link key={s.href} href={s.href} className={`account-mobile-tab${active ? " active" : ""}`}>
              {active && <motion.span layoutId="account-mobile-active-pill" className="account-mobile-tab-pill" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} />}
              {s.icon}
              <span>{s.label}</span>
            </Link>
          );
        })}
        <button type="button" className="account-mobile-tab account-mobile-tab-danger" onClick={doLogout}>
          <LogOut size={15} />
          <span>خروج</span>
        </button>
      </nav>

      <div className="account-body">
        <aside className="account-sidebar">
          <div className="account-sidebar-title">پنل کاربری</div>
          <div className="account-sidebar-links">
            {SECTIONS.map((s) => {
              const active = s.match(pathname);
              return (
                <Link key={s.href} href={s.href} className={`account-sidebar-link${active ? " active" : ""}`}>
                  {active && <motion.span layoutId="account-sidebar-active-pill" className="account-sidebar-active-pill" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />}
                  <span className="account-sidebar-link-icon">{s.icon}</span>
                  <span>{s.label}</span>
                </Link>
              );
            })}
          </div>
          <button type="button" className="account-sidebar-logout" onClick={doLogout}>
            <span className="account-sidebar-link-icon"><LogOut size={15} /></span>
            <span>خروج از حساب</span>
          </button>
        </aside>

        <main className="account-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
