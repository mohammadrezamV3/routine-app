"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getLanguageSetting, setLanguageSetting } from "@/lib/storage";
import { applyLanguageAttribute, readLanguageFromDom, Language } from "@/lib/language";

const LanguageContext = createContext<{ lang: Language; setLang: (l: Language) => void }>({
  lang: "fa",
  setLang: () => {},
});

// دقیقا هم‌الگوی ThemeProvider.tsx — نگاه کن به توضیحاتِ کاملِ اون‌جا برای
// چرایی useLayoutEffect/persisted/userChose. خلاصه: state اولیه همیشه
// "fa" است (همون پیش‌فرضِ رندرِ سرور)، و useLayoutEffect قبل از اولین
// پینت از روی چیزی که اسکریپتِ inline (lib/language.ts) از روی کوکی
// روی <html> نشونده، خودش رو اصلاح می‌کنه — بدون میس‌مچِ هیدریت.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("fa");
  const mounted = useRef(false);
  const persisted = useRef<Language | null>(null);
  const userChose = useRef(false);

  useLayoutEffect(() => {
    const domLang = readLanguageFromDom();
    if (domLang === "en" || domLang === "fa") setLangState(domLang);
  }, []);

  useEffect(() => {
    getLanguageSetting().then((saved) => {
      if (saved !== "en" && saved !== "fa") return;
      persisted.current = saved;
      if (!userChose.current) setLangState(saved);
    });
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    applyLanguageAttribute(lang);
    if (persisted.current !== lang) {
      persisted.current = lang;
      setLanguageSetting(lang);
    }
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang: (l) => {
          userChose.current = true;
          setLangState(l);
        },
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * ترجمه‌ی سبک — بدون کتابخانه‌ی i18n جداگانه، فقط یک دیکشنری inline:
 * `t({ fa: "متن فارسی", en: "English text" })`. برای صفحاتی که هنوز
 * ترجمه نشدن، همیشه fa برمی‌گرده (چون هنوز اون شاخه صدا زده نمی‌شه).
 */
export function useT() {
  const { lang } = useLanguage();
  return function t(strings: { fa: string; en: string }): string {
    return lang === "en" ? strings.en : strings.fa;
  };
}
