"use client";

import { useTheme } from "@/components/ThemeProvider";

// روز = نارنجی (طبق طرح جدید)، شب = همون هویت رنگی قبلی سایت (سبز اصلی +
// آبی برای تراز ویژه‌ی پلن مکس) — یکی‌شدن دو تم فقط قالب/چیدمانه، نه رنگ.
export function useThemeTokens() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    isLight,
    cardBg: isLight ? "bg-white/40" : "bg-white/[0.05]",
    cardBorder: isLight ? "border-white/60" : "border-[#242E28]",
    shadow: isLight ? "shadow-[0_15px_45px_rgba(0,0,0,0.06)]" : "shadow-[0_15px_45px_rgba(0,0,0,0.35)]",
    heading: isLight ? "text-[#2B2118]" : "text-[#F3EADD]",
    muted: isLight ? "text-[#6B5D4D]" : "text-[#A79A8A]",
    line: isLight ? "border-[#E7DCC8]" : "border-[#262A2C]",
    secondaryBtnBg: isLight ? "bg-white/70 hover:bg-white" : "bg-white/5 hover:bg-white/10",

    accentColorRaw: isLight ? "#D97706" : "#00A86B",
    accentText: isLight ? "text-[#D97706]" : "text-[#00A86B]",
    accentHoverText: isLight ? "hover:text-[#D97706]" : "hover:text-[#00A86B]",
    accentBg: isLight ? "bg-[#D97706]" : "bg-[#00A86B]",
    accentBgSoft: isLight ? "bg-[#D97706]/10" : "bg-[#00A86B]/10",
    accentBgSofter: isLight ? "bg-[#D97706]/12" : "bg-[#00A86B]/12",
    accentBorder: isLight ? "border-[#D97706]" : "border-[#00A86B]",
    accentHoverBorder: isLight ? "hover:border-[#D97706]" : "hover:border-[#00A86B]",
    accentShadow: isLight ? "shadow-[0_12px_30px_rgba(217,119,6,0.28)]" : "shadow-[0_12px_30px_rgba(0,168,107,0.28)]",

    secondaryText: isLight ? "text-[#D97706]" : "text-[#3E7BFA]",
    secondaryBg: isLight ? "bg-[#D97706]" : "bg-[#3E7BFA]",
    secondaryBgSoft: isLight ? "bg-[#D97706]/10" : "bg-[#3E7BFA]/10",
    secondaryBorderSoft: isLight ? "border-[#D97706]/50" : "border-[#3E7BFA]/50",
    secondaryCardShadow: isLight ? "shadow-[0_18px_45px_rgba(217,119,6,0.16)]" : "shadow-[0_18px_45px_rgba(62,123,250,0.18)]",
    secondaryBadgeShadow: isLight ? "shadow-[0_8px_20px_rgba(217,119,6,0.35)]" : "shadow-[0_8px_20px_rgba(62,123,250,0.35)]",
  };
}
