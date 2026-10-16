"use client";

import { Crown, Sparkles } from "lucide-react";
import { SmartLink as Link } from "@/components/SmartLink";
import { AgentAvatar } from "@/components/AgentAvatar";
import { GoldenName } from "@/components/GoldenName";
import { formatAccountDate, type AccountSummary } from "@/components/AccountSummary";
import { tr } from "@/lib/i18n";

// کارت سرصفحه‌ی /account (موبایل): آواتار با حلقه‌ی اکسنت، نام، یوزرنیم،
// نشان پلن و (از داده‌ی موجود حساب) چند واقعیت کوتاه: اعتبار تا، زمان باقی‌مانده، عضویت از.
// نشان پلن به صفحه‌ی مستقل /subscription لینک می‌خوره.
export function AccountHeroCard({ summary }: { summary: AccountSummary }) {
  const { plan } = summary;
  const planLabel = plan ? plan.name : tr("بدون پلن فعال", "No active plan");
  const planChip = (
    <Link href="/subscription" className={`ap-chip ${plan ? "is-gold" : "is-accent"}`}>
      {plan ? <Crown size={12} aria-hidden="true" /> : <Sparkles size={12} aria-hidden="true" />}
      {plan ? (plan.trial ? tr(`${planLabel} (آزمایشی)`, `${planLabel} (trial)`) : planLabel) : tr("مشاهده پلن‌ها", "View plans")}
    </Link>
  );
  const facts: { label: string; value: string }[] = [];
  if (plan?.end) facts.push({ label: plan.trial ? tr("پایان دوره‌ی آزمایشی", "Trial ends") : tr("اعتبار تا", "Valid until"), value: formatAccountDate(plan.end) });
  if (plan?.daysLeft != null) facts.push({ label: tr("زمان باقی‌مانده", "Time left"), value: tr(`${plan.daysLeft} روز`, `${plan.daysLeft} ${plan.daysLeft === 1 ? "day" : "days"}`) });
  if (summary.createdAt) facts.push({ label: tr("عضویت از", "Member since"), value: formatAccountDate(summary.createdAt) });

  return (
    <div className="ap-hero account-card ap-card m-rise">
      <div className="ap-hero-top">
        <div className="ap-hero-avatar">
          {summary.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={summary.avatarUrl} alt={tr("عکس پروفایل", "Profile photo")} />
          ) : (
            <AgentAvatar seed={summary.name || summary.username || "?"} size={68} />
          )}
        </div>
        <div className="ap-hero-id">
          <div className="ap-hero-name"><GoldenName golden={summary.golden} staff={summary.staff}>{summary.name}</GoldenName></div>
          {summary.username && <div className="ap-hero-user mono" dir="ltr">@{summary.username}</div>}
          <div className="ap-hero-chips">
            {planChip}
          </div>
        </div>
      </div>
      {facts.length > 0 && (
        <div className="ap-hero-facts" style={{ "--n": facts.length } as React.CSSProperties}>
          {facts.map((f) => (
            <div className="ap-fact" key={f.label}>
              <span className="ap-fact-label">{f.label}</span>
              <span className="ap-fact-value">{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
