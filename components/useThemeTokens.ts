"use client";

import { useTheme } from "@/components/ThemeProvider";

// رنگ‌های «هویتی» با متغیر --sec-* و پیش‌فرض همون رنگ قبلی: روی دامنه‌ی اصلی و بخش
// روتین این متغیرها تعریف نشدن (fallback = رنگ قبلی، بدون هیچ تغییری)، ولی
// app/palette-themes.css اونا رو برای پالت‌های ترید/ورزش و پالت‌های آماده/سفارشی تعریف می‌کنه
// تا لندینگ و کارت‌های پلن رنگ همون بخش رو بگیرن. کلاس‌ها باید literal بمونن (tailwind).
export function useThemeTokens() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    isLight,
    cardBg: isLight ? "bg-white/40" : "bg-white/[0.05]",
    cardBorder: isLight ? "border-white/60" : "border-[color:var(--sec-card-border,#242E28)]",
    shadow: isLight ? "shadow-[0_15px_45px_rgba(0,0,0,0.06)]" : "shadow-[0_15px_45px_rgba(0,0,0,0.35)]",
    heading: isLight ? "text-[color:var(--sec-head,#2B2118)]" : "text-[color:var(--sec-head,#F3EADD)]",
    muted: isLight ? "text-[color:var(--sec-muted,#6B5D4D)]" : "text-[color:var(--sec-muted,#A79A8A)]",
    line: isLight ? "border-[color:var(--sec-line,#E7DCC8)]" : "border-[color:var(--sec-line,#262A2C)]",
    secondaryBtnBg: isLight ? "bg-white/70 hover:bg-white" : "bg-white/5 hover:bg-white/10",

    accentColorRaw: isLight ? "var(--sec-accent,#D97706)" : "var(--sec-accent,#00A86B)",
    accentText: isLight ? "text-[color:var(--sec-accent,#D97706)]" : "text-[color:var(--sec-accent,#00A86B)]",
    accentHoverText: isLight ? "hover:text-[color:var(--sec-accent,#D97706)]" : "hover:text-[color:var(--sec-accent,#00A86B)]",
    accentBg: isLight ? "bg-[color:var(--sec-accent,#D97706)] ![color:var(--sec-on-accent,#fff)]" : "bg-[color:var(--sec-accent,#00A86B)] ![color:var(--sec-on-accent,#fff)]",
    accentBgSoft: isLight ? "bg-[color:rgba(var(--sec-accent-rgb,217,119,6),0.10)]" : "bg-[color:rgba(var(--sec-accent-rgb,0,168,107),0.10)]",
    accentBgSofter: isLight ? "bg-[color:rgba(var(--sec-accent-rgb,217,119,6),0.12)]" : "bg-[color:rgba(var(--sec-accent-rgb,0,168,107),0.12)]",
    accentBorder: isLight ? "border-[color:var(--sec-accent,#D97706)]" : "border-[color:var(--sec-accent,#00A86B)]",
    accentHoverBorder: isLight ? "hover:border-[color:var(--sec-accent,#D97706)]" : "hover:border-[color:var(--sec-accent,#00A86B)]",
    accentShadow: isLight ? "shadow-[0_12px_30px_rgba(var(--sec-accent-rgb,217,119,6),0.28)]" : "shadow-[0_12px_30px_rgba(var(--sec-accent-rgb,0,168,107),0.28)]",

    secondaryText: isLight ? "text-[color:var(--sec-secondary,#D97706)]" : "text-[color:var(--sec-secondary,#3E7BFA)]",
    secondaryBg: isLight ? "bg-[color:var(--sec-secondary,#D97706)] ![color:var(--sec-on-secondary,#fff)]" : "bg-[color:var(--sec-secondary,#3E7BFA)] ![color:var(--sec-on-secondary,#fff)]",
    secondaryBgSoft: isLight ? "bg-[color:rgba(var(--sec-secondary-rgb,217,119,6),0.10)]" : "bg-[color:rgba(var(--sec-secondary-rgb,62,123,250),0.10)]",
    secondaryBorderSoft: isLight ? "border-[color:rgba(var(--sec-secondary-rgb,217,119,6),0.50)]" : "border-[color:rgba(var(--sec-secondary-rgb,62,123,250),0.50)]",
    secondaryCardShadow: isLight ? "shadow-[0_18px_45px_rgba(var(--sec-secondary-rgb,217,119,6),0.16)]" : "shadow-[0_18px_45px_rgba(var(--sec-secondary-rgb,62,123,250),0.18)]",
    secondaryBadgeShadow: isLight ? "shadow-[0_8px_20px_rgba(var(--sec-secondary-rgb,217,119,6),0.35)]" : "shadow-[0_8px_20px_rgba(var(--sec-secondary-rgb,62,123,250),0.35)]",
  };
}
