"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  User, SlidersHorizontal, LayoutGrid, CreditCard, ShieldCheck, Bell, Headset, LogOut,
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { invalidateStorageCache } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { clearAuthHintCookie } from "@/lib/preload";

// پنل کاربریِ Arion — این‌جا دیگه یک مودالِ روی صفحه نیست (اون AccountPanel
// قدیمی حذف شد)، یک صفحه‌ی مستقلِ کاملِ خودشه با آدرسِ /account. طبقِ
// درخواستِ صریح: «این صفحه Dashboard نیست» — یعنی هیچ آمار/نمودار/کارتِ
// خلاصه‌ای این‌جا نیست، فقط مدیریتِ حساب/تنظیمات. مسیرها:
//   /account                    → پروفایل (پیش‌فرض)
//   /account/subscription       → اشتراک
//   /account/arion-settings/*   → تنظیمات آریون (ظاهر/زبان/حریم‌خصوصی)
//   /account/modules/*          → تنظیمات بخش‌ها (روتین/بدنسازی/کالری/ترید/رودمپ)
//   /account/security           → امنیت
//   /account/notifications      → اعلان‌ها
//   /account/support            → پشتیبانی
const SECTIONS: { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean }[] = [
  { href: "/account", label: "پروفایل", icon: <User size={17} />, match: (p) => p === "/account" },
  { href: "/account/arion-settings", label: "تنظیمات آریون", icon: <SlidersHorizontal size={17} />, match: (p) => p.startsWith("/account/arion-settings") },
  { href: "/account/modules", label: "تنظیمات بخش‌ها", icon: <LayoutGrid size={17} />, match: (p) => p.startsWith("/account/modules") },
  { href: "/account/subscription", label: "اشتراک", icon: <CreditCard size={17} />, match: (p) => p.startsWith("/account/subscription") },
  { href: "/account/security", label: "امنیت", icon: <ShieldCheck size={17} />, match: (p) => p.startsWith("/account/security") },
  { href: "/account/notifications", label: "اعلان‌ها", icon: <Bell size={17} />, match: (p) => p.startsWith("/account/notifications") },
  { href: "/account/support", label: "پشتیبانی", icon: <Headset size={17} />, match: (p) => p.startsWith("/account/support") },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/account";
  const { status } = useSession();

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
      {/* نوارِ افقیِ موبایل — جایگزینِ سایدبار وقتی جا برای ستونِ کنارش نیست */}
      <nav className="account-mobile-tabs">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className={`account-mobile-tab${s.match(pathname) ? " active" : ""}`}>
            {s.icon}
            <span>{s.label}</span>
          </Link>
        ))}
        <button type="button" className="account-mobile-tab account-mobile-tab-danger" onClick={doLogout}>
          <LogOut size={17} />
          <span>خروج</span>
        </button>
      </nav>

      <div className="account-body">
        <aside className="account-sidebar">
          <div className="account-sidebar-title">پنل کاربری</div>
          <div className="account-sidebar-links">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className={`account-sidebar-link${s.match(pathname) ? " active" : ""}`}>
                <span className="account-sidebar-link-icon">{s.icon}</span>
                <span>{s.label}</span>
              </Link>
            ))}
          </div>
          <button type="button" className="account-sidebar-link account-sidebar-logout" onClick={doLogout}>
            <span className="account-sidebar-link-icon"><LogOut size={17} /></span>
            <span>خروج از حساب</span>
          </button>
        </aside>

        <main className="account-content">{children}</main>
      </div>
    </div>
  );
}
