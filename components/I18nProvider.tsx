"use client";

// زبان جاری برای کامپوننت‌های کلاینت. مقدار از layout ریشه (کوکی، سمت سرور)
// میاد، پس رندر سرور و هیدریت یکی‌ان. tr() از lib/i18n.ts هم بدون این
// کانتکست کار می‌کنه (روی کلاینت از <html lang> می‌خونه)؛ useLocale فقط برای
// جاهاییه که خود مقدار زبان لازمه.
import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

const I18nContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext);
}

export function useIsEn(): boolean {
  return useContext(I18nContext) === "en";
}
