"use client";

import { tr } from "@/lib/i18n";
import { User, SlidersHorizontal, ShieldCheck, Headset, Gift } from "lucide-react";

// فهرست بخش‌های پنل کاربری. عمدا این‌جاست نه توی app/account/layout.tsx:
// Next.js از فایل layout فقط export‌های شناخته‌شده‌ی خودش را می‌پذیرد و هر
// export دیگری build را می‌شکند.
//
// «اشتراک» طبق درخواست صریح از این فهرست حذف شد — صفحه‌ی مستقل
// `/subscription` (نه `/account/subscription`) همان کار را می‌کند و از
// نویگیشن اصلی (نه پنل کاربری) در دسترس است.
export function getAccountSections(): { href: string; label: string; desc: string; icon: React.ReactNode; match: (p: string) => boolean }[] {
  return [
  { href: "/account/profile", label: tr("پروفایل", "Profile"), desc: tr("پروفایل عمومی و پروفایل ورزشی، بنر و عکس پروفایل", "Public profile, sports profile, banner and photo"), icon: <User size={15} />, match: (p) => p.startsWith("/account/profile") },
  // «اعلان‌ها» طبق درخواست صریح با «تنظیمات» ادغام شد و دیگر زبانه‌ی جدا ندارد.
  { href: "/account/general", label: tr("تنظیمات", "Settings"), desc: tr("تنظیمات آریون، اعلان‌ها، روتین و ترید", "App settings, notifications, routine and trading"), icon: <SlidersHorizontal size={15} />, match: (p) => p.startsWith("/account/general") || p.startsWith("/account/notifications") },
  { href: "/account/referral", label: tr("رفرال", "Referral"), desc: tr("دعوت دوستان و کیفِ اعتبارِ درون‌اپی", "Invite friends and your in-app credit wallet"), icon: <Gift size={15} />, match: (p) => p.startsWith("/account/referral") },
  { href: "/account/security", label: tr("امنیت", "Security"), desc: tr("رمز عبور و امنیت حساب", "Password and account security"), icon: <ShieldCheck size={15} />, match: (p) => p.startsWith("/account/security") },
  { href: "/account/support", label: tr("پشتیبانی", "Support"), desc: tr("ارتباط با تیم پشتیبانی", "Contact the support team"), icon: <Headset size={15} />, match: (p) => p.startsWith("/account/support") },
];
}
