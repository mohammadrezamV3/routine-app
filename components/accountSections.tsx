"use client";

import { tr } from "@/lib/i18n";
import { User, SlidersHorizontal, ShieldCheck, Headset, Gift } from "lucide-react";

export type AccountSectionGroup = "account" | "preferences" | "help";

export type AccountSection = {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  group: AccountSectionGroup;
  match: (p: string) => boolean;
};

// فهرست بخش‌های پنل کاربری. عمدا این‌جاست نه توی app/account/layout.tsx:
// Next.js از فایل layout فقط export‌های شناخته‌شده‌ی خودش را می‌پذیرد و هر
// export دیگری build را می‌شکند.
//
// «اشتراک» طبق درخواست صریح از این فهرست حذف شد — صفحه‌ی مستقل
// `/subscription` (نه `/account/subscription`) همان کار را می‌کند و از
// نویگیشن اصلی (نه پنل کاربری) در دسترس است.
//
// group فقط برای صفحه‌ی اول پنل (موبایل) است: بخش‌ها در سه کارت جدا چیده می‌شن.
export function getAccountSections(): AccountSection[] {
  return [
    { href: "/account/profile", group: "account", label: tr("پروفایل", "Profile"), desc: tr("پروفایل عمومی و پروفایل ورزشی، بنر و عکس پروفایل", "Public profile, sports profile, banner and photo"), icon: <User size={17} />, match: (p) => p.startsWith("/account/profile") },
    { href: "/account/security", group: "account", label: tr("امنیت", "Security"), desc: tr("رمز عبور، ورود دومرحله‌ای و دستگاه‌ها", "Password, two-step login and devices"), icon: <ShieldCheck size={17} />, match: (p) => p.startsWith("/account/security") },
    { href: "/account/referral", group: "account", label: tr("رفرال", "Referral"), desc: tr("دعوت دوستان و کیف اعتبار درون‌اپی", "Invite friends and your in-app credit wallet"), icon: <Gift size={17} />, match: (p) => p.startsWith("/account/referral") },
    // «اعلان‌ها» طبق درخواست صریح با «تنظیمات» ادغام شد و دیگر زبانه‌ی جدا ندارد.
    { href: "/account/general", group: "preferences", label: tr("تنظیمات", "Settings"), desc: tr("زبان، اعلان‌ها، روتین، ترید و حریم خصوصی مربی", "Language, notifications, routine, trading and mentor privacy"), icon: <SlidersHorizontal size={17} />, match: (p) => p.startsWith("/account/general") || p.startsWith("/account/notifications") },
    { href: "/account/support", group: "help", label: tr("پشتیبانی", "Support"), desc: tr("ارتباط با تیم پشتیبانی", "Contact the support team"), icon: <Headset size={17} />, match: (p) => p.startsWith("/account/support") },
  ];
}
