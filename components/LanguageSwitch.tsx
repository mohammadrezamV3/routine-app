"use client";

// انتخاب زبان سایت (فارسی/انگلیسی) — کوکی + بارگذاری کامل (lib/i18n.ts)
import { SegmentedTabs } from "./SegmentedTabs";
import { useLocale } from "./I18nProvider";
import { switchLocale, type Locale } from "@/lib/i18n";

export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  return (
    <SegmentedTabs<Locale>
      className={className}
      ariaLabel={locale === "en" ? "Language" : "زبان"}
      options={[
        { value: "fa", label: "فارسی" },
        { value: "en", label: "English" },
      ]}
      active={locale}
      onChange={(l) => { if (l !== locale) switchLocale(l); }}
    />
  );
}
