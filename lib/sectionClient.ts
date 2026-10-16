"use client";

// تعویض بخش سمت کلاینت بدون عوض‌شدن دامنه: کوکی host-only `arion_section` + ناوبری کامل روی همون origin.
// (PWA نصب‌شده از scope بیرون نمی‌افته.) قرارداد: lib/sections.ts و docs/sections.md
import { serializeSectionCookie, type SectionKey } from "@/lib/sections";

export function setSectionCookie(section: SectionKey): void {
  try {
    document.cookie = serializeSectionCookie(section, window.location.protocol === "https:");
  } catch {
    // کوکی مسدود: ناوبری بعدی هم بخش رو عوض نمی‌کنه، ولی چیزی نمی‌شکنه
  }
}

/** بخش رو عوض می‌کنه و با بارگذاری کامل به مسیر می‌ره (layout ریشه باید با بخش تازه دوباره رندر بشه) */
export function switchSectionAndGo(section: SectionKey, path: string): void {
  setSectionCookie(section);
  window.location.assign(path);
}
