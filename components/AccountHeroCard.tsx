"use client";

import { Crown } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";

// کارتِ سرصفحه‌ی پنل کاربری (بالای /account) — آواتار سمتِ راست، وضعیتِ
// پریمیوم/رایگان سمتِ چپِ آواتار (نه زیرِ اسم)، نام+یوزرنیم سمتِ چپ‌ترین.
// dir="rtl" + flex-direction:row یعنی اولین فرزندِ DOM سمتِ راست می‌شینه —
// پس ترتیبِ فرزندها دقیقاً همون ترتیبِ راست‌به‌چپیه که می‌خوایم.
export function AccountHeroCard({
  fullName, username, avatarUrl, isPremium,
}: { fullName: string; username: string | null; avatarUrl: string | null; isPremium: boolean }) {
  return (
    <div className="account-hero" dir="rtl">
      <div className="account-hero-avatar-wrap">
        {avatarUrl ? (
          <img src={avatarUrl} alt="عکس پروفایل" className="account-hero-avatar-img" />
        ) : (
          <AgentAvatar seed={fullName || username || "؟"} size={58} className="account-hero-avatar-fallback" />
        )}
      </div>
      <span className={`account-hero-badge${isPremium ? " premium" : ""}`}>
        <Crown size={12} />
        {isPremium ? "پریمیوم" : "پایه"}
      </span>
      <div className="account-hero-info">
        <div className="account-hero-name">{fullName}</div>
        {username && <div className="account-hero-username mono" dir="ltr">@{username}</div>}
      </div>
    </div>
  );
}
