"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { ACCOUNT_SECTIONS } from "@/components/accountSections";
import { logoutAndRedirect } from "@/lib/logout";

// پنل کاربری Arion — صفحه‌ی مستقل /account (نه مودال، نه داشبورد). مسیرها:
//   /account                    → منوی بخش‌ها (فقط لیست زبانه‌ها، بدون محتوا)
//   /account/profile            → پروفایل (دو بخش: «پروفایل عمومی» و
//                                  «پروفایل ورزشی»، هردو توی همین یک صفحه)
//   /account/sport-profile      → فقط ریدایرکت به /account/profile (مسیر قدیمی)
//   /account/general            → «تنظیمات» — تنظیمات آریون + اعلان‌ها +
//                                  تنظیمات روتین و ترید، همه یک‌جا و بدون
//                                  ناوبری تودرتو
//                                  (تم نمایش عمدا این‌جا نیست — همون سوییچ
//                                  بالای منوی همبرگری کفایت می‌کنه)
//   /account/subscription       → اشتراک
//   /account/security           → امنیت
//   /account/notifications      → فقط ریدایرکت به /account/general (ادغام شد)
//   /account/support            → پشتیبانی
const SECTIONS = ACCOUNT_SECTIONS;

// انیمیشن ورود صفحه‌های پنل. عمدا بدون فاز exit و بدون `mode="wait"`:
// با اون‌ها هر کلیک اول باید ۰.۲۲ ثانیه صبر می‌کرد تا صفحه‌ی قبلی محو بشه و
// تازه بعدش صفحه‌ی جدید می‌اومد — همون «کندی/گیرکردن»ی که گزارش شد. حالا
// صفحه‌ی جدید بلافاصله میاد و فقط یک fade کوتاه می‌خوره.
const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const },
};

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

  return (
    <div className="account-shell" dir="rtl">
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
          <button type="button" className="account-sidebar-logout" onClick={logoutAndRedirect}>
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
