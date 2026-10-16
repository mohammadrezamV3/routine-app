"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { SmartLink as Link } from "@/components/SmartLink";
import { AgentAvatar } from "@/components/AgentAvatar";
import { GoldenName } from "@/components/GoldenName";
import { getAccountSections } from "@/components/accountSections";
import { useAccountSummary } from "@/components/AccountSummary";
import { logoutAndRedirect } from "@/lib/logout";
import { tr } from "@/lib/i18n";

// سایدبار دسکتاپ پنل کاربری (از 1024px به بالا؛ زیرش با CSS مخفیه و
// ناوبری از صفحه‌ی اول پنل و نان‌ریز بازگشت انجام می‌شه). کارت کوچک
// کاربر بالا، لینک بخش‌ها وسط، خروج پایین با خط جداکننده.
export function AccountSidebar() {
  const pathname = usePathname() || "/account";
  const sections = getAccountSections();
  const me = useAccountSummary();

  return (
    <aside className="ap-nav account-card ap-card" aria-label={tr("پنل کاربری", "Account")}>
      <Link href="/account/profile" className="ap-nav-me">
        <span className="ap-nav-me-avatar">
          {me?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatarUrl} alt="" />
          ) : me ? (
            <AgentAvatar seed={me.name || me.username || "?"} size={44} />
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

      <nav className="ap-nav-links">
        {sections.map((s) => {
          const active = s.match(pathname);
          return (
            <Link key={s.href} href={s.href} className={`ap-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="ap-nav-link-icon" aria-hidden="true">{s.icon}</span>
              <span>{s.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ap-nav-foot">
        <button type="button" className="ap-plain ap-nav-link is-danger" onClick={logoutAndRedirect}>
          <span className="ap-nav-link-icon" aria-hidden="true"><LogOut size={16} /></span>
          <span>{tr("خروج از حساب", "Log out")}</span>
        </button>
      </div>
    </aside>
  );
}
