"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AccountRows, AccountRowLink, AccountRowButton } from "@/components/AccountRow";
import { AccountHeroCard } from "@/components/AccountHeroCard";
import { useAccountSummary } from "@/components/AccountSummary";
import { getAccountSections, type AccountSectionGroup } from "@/components/accountSections";
import { logoutAndRedirect } from "@/lib/logout";
import { tr } from "@/lib/i18n";

const GROUP_ORDER: AccountSectionGroup[] = ["account", "preferences", "help"];

// صفحه‌ی اول پنل کاربری (موبایل/تبلت): سرصفحه‌ی حساب (آواتار، نام، پلن،
// چند واقعیت کوتاه) + بخش‌ها در سه کارت جدا + خروج. روی دسکتاپ سایدبار
// همین فهرسته، پس این صفحه با CSS پنهان و بلافاصله به «پروفایل» می‌ره.
export default function AccountIndexPage() {
  const router = useRouter();
  const sections = getAccountSections();
  const summary = useAccountSummary();

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      router.replace("/account/profile");
    }
  }, [router]);

  let i = 0;
  return (
    <section className="ap-index">
      <h1 className="ap-sr">{tr("پنل کاربری", "Account")}</h1>

      {summary ? <AccountHeroCard summary={summary} /> : <span className="ap-skel ap-hero-skel" style={{ borderRadius: 22 }} />}

      {GROUP_ORDER.map((g) => {
        const items = sections.filter((s) => s.group === g);
        if (!items.length) return null;
        return (
          <AccountRows key={g}>
            {items.map((s) => (
              <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i++} />
            ))}
          </AccountRows>
        );
      })}

      {/* خروج داخل کارت جدای خودش (موبایل سایدبار نداره و این تنها راه خروجه) */}
      <AccountRows>
        <AccountRowButton icon={<LogOut size={17} />} label={tr("خروج از حساب", "Log out")} onClick={logoutAndRedirect} danger index={i} />
      </AccountRows>

      <div className="ap-version mono" dir="ltr">Arion v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</div>
    </section>
  );
}
