"use client";

import { User, SlidersHorizontal, ShieldCheck, Headset } from "lucide-react";

// فهرست بخش‌های پنل کاربری. عمدا این‌جاست نه توی app/account/layout.tsx:
// Next.js از فایل layout فقط export‌های شناخته‌شده‌ی خودش را می‌پذیرد و هر
// export دیگری build را می‌شکند.
//
// «اشتراک» طبقِ درخواستِ صریح از این فهرست حذف شد — صفحه‌ی مستقلِ
// `/subscription` (نه `/account/subscription`) همان کار را می‌کند و از
// نویگیشنِ اصلی (نه پنل کاربری) در دسترس است.
export const ACCOUNT_SECTIONS: { href: string; label: string; desc: string; icon: React.ReactNode; match: (p: string) => boolean }[] = [
  { href: "/account/profile", label: "پروفایل", desc: "پروفایل عمومی و پروفایل ورزشی، بنر و عکس پروفایل", icon: <User size={15} />, match: (p) => p.startsWith("/account/profile") },
  // «اعلان‌ها» طبقِ درخواستِ صریح با «تنظیمات» ادغام شد و دیگر زبانه‌ی جدا ندارد.
  { href: "/account/general", label: "تنظیمات", desc: "تنظیمات آریون، اعلان‌ها، روتین و ترید", icon: <SlidersHorizontal size={15} />, match: (p) => p.startsWith("/account/general") || p.startsWith("/account/notifications") },
  { href: "/account/security", label: "امنیت", desc: "رمز عبور و امنیت حساب", icon: <ShieldCheck size={15} />, match: (p) => p.startsWith("/account/security") },
  { href: "/account/support", label: "پشتیبانی", desc: "ارتباط با تیم پشتیبانی", icon: <Headset size={15} />, match: (p) => p.startsWith("/account/support") },
];
