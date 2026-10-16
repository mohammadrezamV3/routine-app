"use client";

// بخش جاری (routine/trade/workout یا null = دامنه‌ی اصلی) برای کامپوننت‌های کلاینت.
// مقدار از layout ریشه (هدر middleware، سمت سرور) میاد، پس رندر سرور و هیدریت یکی‌ان — lib/sections.ts
import { createContext, useContext } from "react";
import type { SectionKey } from "@/lib/sections";

const SectionContext = createContext<SectionKey | null>(null);

export function SectionProvider({ section, children }: { section: SectionKey | null; children: React.ReactNode }) {
  return <SectionContext.Provider value={section}>{children}</SectionContext.Provider>;
}

export function useSection(): SectionKey | null {
  return useContext(SectionContext);
}
