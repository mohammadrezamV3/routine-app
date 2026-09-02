"use client";

import { Crown } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";

// کارتِ سرصفحه‌ی پنل کاربری (بالای /account).
//
// چیدمان طبقِ درخواستِ صریحِ کاربر، از راست به چپ (dir="rtl" + flex row یعنی
// اولین فرزندِ DOM سمتِ راست می‌شینه):
//   آواتار (کوچیک‌تر از قبل) → نام و آیدی → … → نشانِ اشتراک، چسبیده به لبه‌ی چپِ باکس.
// قبلاً نشانِ اشتراک بلافاصله کنارِ آواتار بود (نه لبه‌ی چپ) و نام هم زیرش
// می‌افتاد؛ حالا `account-hero-info` با flex:1 فاصله رو پر می‌کنه و نشان به چپ می‌ره.
export function AccountHeroCard({
  fullName, username, avatarUrl, isPremium, planNameFa,
}: {
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  isPremium: boolean;
  planNameFa?: string | null;
}) {
  return (
    <div className="account-hero" dir="rtl">
      <div className="account-hero-avatar-wrap">
        {avatarUrl ? (
          <img src={avatarUrl} alt="عکس پروفایل" className="account-hero-avatar-img" />
        ) : (
          <AgentAvatar seed={fullName || username || "؟"} size={44} className="account-hero-avatar-fallback" />
        )}
      </div>
      <div className="account-hero-info">
        {/* اسم کامل نوشته می‌شه (بدونِ کوتاه‌شدن با «…») و اگه جا نشد به خطِ بعد می‌ره */}
        <div className="account-hero-name">{fullName}</div>
        {username && <div className="account-hero-username mono" dir="ltr">@{username}</div>}
      </div>
      <span className={`account-hero-badge${isPremium ? " premium" : ""}`}>
        <Crown size={12} />
        {planNameFa || (isPremium ? "پریمیوم" : "پلن پایه")}
      </span>
    </div>
  );
}
