"use client";

import { SECTION_KEYS, SECTION_META, type SectionKey } from "@/lib/sections";
import { switchSectionAndGo } from "@/lib/sectionClient";
import { brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";

// نوار کوچک «بخش‌های دیگر آریون» ته لندینگ زیردامنه‌ها: آیکون رنگی هر بخش + لینک به ریشه‌ی
// صفحه‌ی اصلی. دامنه عوض نمی‌شه: کلیک کوکی بخش رو ست می‌کنه و کامل به "/" می‌ره (href ساده برای بدون JS
// و کلیک میانی/Ctrl). بی‌بک‌گراند، فقط خط.
function onPick(e: React.MouseEvent, key: SectionKey) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  switchSectionAndGo(key, "/");
}

export function LandingOtherSections({ section }: { section: SectionKey }) {
  const others = SECTION_KEYS.filter((k) => k !== section);
  return (
    <nav id="sec-landing-others" className="lso" aria-label={tr("بخش‌های دیگر آریون", `Other ${brandName()} products`)}>
      <div className="lso-title">{tr("بخش‌های دیگر آریون", `Other ${brandName()} products`)}</div>
      <ul className="lso-list">
        {others.map((k) => {
          const m = SECTION_META[k];
          return (
            <li key={k}>
              <a href="/" onClick={(e) => onPick(e, k)} className="lso-link" style={{ ["--lso-c" as string]: m.colors.mid }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.icon} alt="" width={30} height={30} loading="lazy" decoding="async" className="lso-ic" />
                <span className="lso-txt">
                  <b>{brandName()} {m.label}</b>
                  <span>{m.tagline}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
