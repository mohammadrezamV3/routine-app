"use client";

// بخش جاری (همیشه یکی از routine/trade/workout) برای کامپوننت‌های کلاینت.
// مقدار از layout ریشه (هدر middleware، سمت سرور) میاد، پس رندر سرور و هیدریت یکی‌ان — lib/sections.ts
import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_SECTION, pathAllowedIn, type SectionKey } from "@/lib/sections";

const SectionContext = createContext<SectionKey>(DEFAULT_SECTION);

const RELOAD_KEY = "arion:sectionSync";

/**
 * layout ریشه در ناوبری کلاینتی دوباره رندر نمی‌شه. وقتی مسیر جدید مال بخش دیگه‌ست، middleware در
 * درخواست RSC کوکی بخش رو عوض کرده؛ اینجا یک بارگذاری کامل می‌کنیم تا layout (data-section، پالت،
 * منو) با بخش تازه رندر بشه. نگهبان حلقه: برای یک آدرس در ۱۰ ثانیه فقط یک بار.
 */
function SectionSync({ section }: { section: SectionKey }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathAllowedIn(section, pathname)) return;
    const href = window.location.href;
    try {
      const last = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || "null") as { href: string; at: number } | null;
      if (last && last.href === href && Date.now() - last.at < 10_000) return;
      sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ href, at: Date.now() }));
    } catch {
      // sessionStorage در دسترس نیست: بدون نگهبان حلقه ریلود نمی‌کنیم (ایمن‌تر از ریلود بی‌پایان)
      return;
    }
    window.location.replace(href);
  }, [pathname, section]);
  return null;
}

export function SectionProvider({ section, children }: { section: SectionKey; children: React.ReactNode }) {
  return (
    <SectionContext.Provider value={section}>
      <SectionSync section={section} />
      {children}
    </SectionContext.Provider>
  );
}

export function useSection(): SectionKey {
  return useContext(SectionContext);
}
