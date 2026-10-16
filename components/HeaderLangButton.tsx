"use client";

// کنترل کوچیک زبان توی هدر — فقط روی صفحه‌ی لندینگ (مهمان روی «/») رندر می‌شه
// (NavDrawer شرطش رو چک می‌کنه). زبان فقط از تنظیمات و همین دکمه عوض می‌شه.
// دو زبان بیشتر نیست، پس یک ضربه مستقیم به زبان دیگه می‌ره (کوکی + بارگذاری کامل،
// lib/i18n.ts). بی‌بک‌گراند؛ استایل در site-header.css. روی دسکتاپ انگلیسی
// (>= 1024px) آیکون کره‌ی DesktopNavEnd جاش رو می‌گیره و این با CSS مخفی می‌شه.
import { Globe } from "lucide-react";
import { useLocale } from "./I18nProvider";
import { switchLocale, tr } from "@/lib/i18n";

export default function HeaderLangButton() {
  const locale = useLocale();
  const target = locale === "en" ? "fa" : "en";
  return (
    <button
      type="button"
      className="hdr-lang-btn"
      lang={target}
      aria-label={tr("تغییر زبان به انگلیسی", "Switch language to Persian")}
      onClick={() => switchLocale(target)}
    >
      <Globe size={14} aria-hidden="true" />
      <span dir="ltr">{target === "en" ? "EN" : "FA"}</span>
    </button>
  );
}
