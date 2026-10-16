"use client";

import "@/app/_area/account.css";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthGate } from "@/components/AuthGate";
import { AccountSidebar } from "@/components/AccountSidebar";
import { tr, isEn } from "@/lib/i18n";

// پنل کاربری Arion — صفحه‌ی مستقل /account (نه مودال، نه داشبورد). مسیرها:
//   /account                    → صفحه‌ی اول (موبایل): سرصفحه‌ی حساب + فهرست بخش‌ها؛
//                                  روی دسکتاپ مستقیم می‌ره روی «پروفایل»
//   /account/profile            → پروفایل (بنر و عکس، پروفایل عمومی، کد دعوت،
//                                  پروفایل ورزشی، همه با یک دکمه‌ی ذخیره)
//   /account/sport-profile      → فقط ریدایرکت به /account/profile (مسیر قدیمی)
//   /account/general            → «تنظیمات» — فهرست گروه‌بندی‌شده: داشبورد، زبان،
//                                  اعلان‌ها، روتین، بدنسازی، ترید، بازخورد لمسی،
//                                  دسترسی مربی‌ها، سابقه‌ی گفت‌وگو (هر کدام صفحه‌ی خودش)
//   /account/referral           → رفرال و کیف اعتبار
//   /account/security           → امنیت و حریم خصوصی
//   /account/support            → پشتیبانی (تیکت)
//   /account/subscription       → ریدایرکت به /subscription
//   /account/notifications      → ریدایرکت به /account/general/notifications
//
// چیدمان: دسکتاپ = سایدبار چسبان + ستون محتوا؛ موبایل = فقط محتوا (صفحه‌ی اول
// فهرست بخش‌هاست و هر زیرصفحه نان‌ریز بازگشت داره). ورود صفحه با کلاس مشترک
// حرکت اپ (m-rise-soft) انجام می‌شه، بدون فاز خروج تا کلیک هیچ‌وقت منتظر نمونه.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/account";
  const { status } = useSession();
  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <section className="account-shell ap-shell">
        <h1>{tr("پنل کاربری", "Account")}</h1>
        <AuthGate message={tr("برای دیدن پنل کاربری اول باید وارد حساب بشی", "Log in to see your account")} />
      </section>
    );
  }

  return (
    <div className="account-shell ap-shell" dir={isEn() ? "ltr" : "rtl"}>
      <div className="ap-grid">
        <AccountSidebar />
        <main className="ap-main">
          <div key={pathname} className="m-rise-soft">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
