"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { SmartLink as Link } from "@/components/SmartLink";
import { AgentAvatar } from "@/components/AgentAvatar";
import { GoldenName } from "@/components/GoldenName";
import { getAccountSections } from "@/components/accountSections";
import { formatAccountDate, useAccountSummary } from "@/components/AccountSummary";
import { logoutAndRedirect } from "@/lib/logout";
import { tr } from "@/lib/i18n";

// سایدبار دسکتاپ پنل کاربری (از 1024px به بالا؛ زیرش با CSS مخفیه و
// ناوبری از صفحه‌ی اول پنل و نان‌ریز بازگشت انجام می‌شه). طبق طراحی دو
// کارت: کارت کاربر (آواتار، نام، یوزرنیم + خط پلن که به /subscription
// می‌ره) و کارت ناوبری (بخش‌ها، ردیف فعال به رنگ تونال، و بعد از یک خط
// جداکننده «خروج از حساب» به رنگ خطر).
export function AccountSidebar() {
  const pathname = usePathname() || "/account";
  const sections = getAccountSections();
  const me = useAccountSummary();
  const plan = me?.plan ?? null;

  const planLabel = !me
    ? null
    : plan
      ? (plan.trial ? tr(`پلن ${plan.name} (آزمایشی)`, `${plan.name} plan (trial)`) : tr(`پلن ${plan.name}`, `${plan.name} plan`))
      : tr("بدون پلن فعال", "No active plan");
  const planValue = !me
    ? null
    : plan?.end
      ? tr(`تا ${formatAccountDate(plan.end)}`, `Until ${formatAccountDate(plan.end)}`)
      : plan ? "" : tr("مشاهده پلن‌ها", "View plans");

  return (
    <aside className="ap-nav" aria-label={tr("پنل کاربری", "Account")}>
      <div className="ap-nav-card ap-nav-me-card account-card ap-card">
        <Link href="/account/profile" className="ap-nav-me">
          <span className="ap-nav-me-avatar">
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatarUrl} alt="" />
            ) : me ? (
              <AgentAvatar seed={me.name || me.username || "?"} size={52} />
            ) : null}
          </span>
          <span className="ap-nav-me-text">
            {me ? (
              <>
                <span className="ap-nav-me-name"><GoldenName golden={me.golden} staff={me.staff}>{me.name}</GoldenName></span>
                {me.username && <span className="ap-nav-me-user mono" dir="ltr">@{me.username}</span>}
              </>
            ) : (
              <>
                <span className="ap-skel ap-nav-skel" style={{ width: 110 }} />
                <span className="ap-skel ap-nav-skel" style={{ width: 70, height: 11 }} />
              </>
            )}
          </span>
        </Link>
        <Link href="/subscription" className="ap-nav-plan">
          {me ? (
            <>
              <span className="ap-nav-plan-label">{planLabel}</span>
              {planValue && <span className={`ap-nav-plan-value${plan ? "" : " is-cta"}`}>{planValue}</span>}
            </>
          ) : (
            <span className="ap-skel ap-nav-skel" style={{ width: "70%", height: 12 }} />
          )}
        </Link>
      </div>

      <nav className="ap-nav-card ap-nav-links account-card ap-card" aria-label={tr("بخش‌های حساب", "Account sections")}>
        {sections.map((s) => {
          const active = s.match(pathname);
          return (
            <Link key={s.href} href={s.href} className={`ap-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="ap-nav-link-icon" aria-hidden="true">{s.icon}</span>
              <span>{s.label}</span>
            </Link>
          );
        })}
        <div className="ap-nav-sep" role="separator" />
        <button type="button" className="ap-plain ap-nav-link is-danger" onClick={logoutAndRedirect}>
          <span className="ap-nav-link-icon" aria-hidden="true"><LogOut size={17} /></span>
          <span>{tr("خروج از حساب", "Log out")}</span>
        </button>
      </nav>
    </aside>
  );
}
