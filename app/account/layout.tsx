"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User, SlidersHorizontal, CreditCard, ShieldCheck, Bell, Headset, LogOut, Menu, ChevronDown,
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { invalidateStorageCache } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { clearAuthHintCookie } from "@/lib/preload";

// پنل کاربریِ Arion — صفحه‌ی مستقلِ /account (نه مودال، نه داشبورد). مسیرها:
//   /account                    → منوی بخش‌ها (فقط لیستِ زبانه‌ها، بدونِ محتوا)
//   /account/profile            → پروفایل
//   /account/general            → «تنظیمات» — تنظیماتِ آریون + تنظیماتِ روتین و
//                                  ترید، همه یک‌جا و بدونِ ناوبریِ تودرتو
//                                  (تمِ نمایش عمداً این‌جا نیست — همون سوییچِ
//                                  بالای منوی همبرگری کفایت می‌کنه)
//   /account/subscription       → اشتراک
//   /account/security           → امنیت
//   /account/notifications      → اعلان‌ها
//   /account/support            → پشتیبانی
export const ACCOUNT_SECTIONS: { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean }[] = [
  { href: "/account/profile", label: "پروفایل", icon: <User size={15} />, match: (p) => p.startsWith("/account/profile") },
  { href: "/account/general", label: "تنظیمات", icon: <SlidersHorizontal size={15} />, match: (p) => p.startsWith("/account/general") },
  { href: "/account/subscription", label: "اشتراک", icon: <CreditCard size={15} />, match: (p) => p.startsWith("/account/subscription") },
  { href: "/account/security", label: "امنیت", icon: <ShieldCheck size={15} />, match: (p) => p.startsWith("/account/security") },
  { href: "/account/notifications", label: "اعلان‌ها", icon: <Bell size={15} />, match: (p) => p.startsWith("/account/notifications") },
  { href: "/account/support", label: "پشتیبانی", icon: <Headset size={15} />, match: (p) => p.startsWith("/account/support") },
];
const SECTIONS = ACCOUNT_SECTIONS;

// انیمیشنِ ورودِ صفحه‌های پنل. عمداً بدونِ فازِ exit و بدونِ `mode="wait"`:
// با اون‌ها هر کلیک اول باید ۰.۲۲ ثانیه صبر می‌کرد تا صفحه‌ی قبلی محو بشه و
// تازه بعدش صفحه‌ی جدید می‌اومد — همون «کندی/گیرکردن»ی که گزارش شد. حالا
// صفحه‌ی جدید بلافاصله میاد و فقط یک fadeِ کوتاه می‌خوره.
const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/account";
  const { status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // با هر تغییرِ مسیر (چه با کلیک روی یه تایتل، چه از هرجای دیگه) منوی
  // همبرگریِ موبایل باید بسته بشه — وگرنه باز می‌مونه رو صفحه‌ی جدید.
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

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

  // توی صفحه‌ی اولِ پنل (/account) خودِ فهرستِ بخش‌ها به‌صورت کارت پایینِ
  // صفحه هست، پس منوی همبرگریِ بالای صفحه فقط یک تکرارِ بی‌فایده بود.
  const isIndex = pathname === "/account" || pathname === "/account/";

  return (
    <div className="account-shell" dir="rtl">
      <div className="account-mobile-menu" hidden={isIndex}>
        <button
          type="button"
          className="account-mobile-menu-btn"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-expanded={mobileMenuOpen}
        >
          <span className="account-mobile-menu-btn-icon"><Menu size={16} /></span>
          <span className="account-mobile-menu-btn-label">
            {SECTIONS.find((s) => s.match(pathname))?.label || "بخش‌ها"}
          </span>
          <ChevronDown size={15} className={`account-mobile-menu-btn-chevron${mobileMenuOpen ? " open" : ""}`} />
        </button>
        {mobileMenuOpen && (
            <nav className="account-mobile-menu-panel">
              <div className="account-mobile-menu-panel-inner">
                {SECTIONS.map((s) => {
                  const active = s.match(pathname);
                  return (
                    <Link key={s.href} href={s.href} className={`account-mobile-menu-item${active ? " active" : ""}`}>
                      {s.icon}
                      <span>{s.label}</span>
                    </Link>
                  );
                })}
                <button type="button" className="account-mobile-menu-item account-mobile-menu-item-danger" onClick={doLogout}>
                  <LogOut size={15} />
                  <span>خروج</span>
                </button>
              </div>
            </nav>
          )}
      </div>

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
          <motion.div
            key={pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            transition={pageTransition.transition}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
