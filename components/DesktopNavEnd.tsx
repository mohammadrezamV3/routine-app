"use client";

// سمت راست هدر دسکتاپ انگلیسی: انتخاب زبان (آیکون کره + منو) و برای مهمان
// «Log in» و «Start free». به‌علاوه سایه/بلور قوی‌تر هدر بعد از چند پیکسل
// اسکرول (data-scrolled روی هدر، با یک لیسنر passive؛ روی دستگاه ضعیف
// lib/perfTier.ts هیچ لیسنری نمی‌ذاره). زیر 1024px با CSS مخفیه.
import { useEffect, useRef, useState } from "react";
import { SmartLink as Link } from "./SmartLink";
import { Check, Globe } from "lucide-react";
import { useLocale } from "./I18nProvider";
import { isLowPerfDevice } from "@/lib/perfTier";
import { switchLocale, tr, type Locale } from "@/lib/i18n";

const LANGS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fa", label: "فارسی" },
];

export default function DesktopNavEnd({ guest }: { guest: boolean }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isLowPerfDevice()) return;
    const header = wrapRef.current?.closest<HTMLElement>(".app-topbar");
    if (!header) return;
    let on = false;
    const onScroll = () => {
      const next = window.scrollY > 6;
      if (next !== on) { on = next; header.toggleAttribute("data-scrolled", next); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    const i = items.indexOf(e.target as HTMLElement);
    if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); btnRef.current?.focus(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setArmed(true); setOpen(true); requestAnimationFrame(() => wrapRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus()); return; }
      const d = e.key === "ArrowDown" ? 1 : -1;
      items[(i + d + items.length) % items.length]?.focus();
    }
  }

  return (
    <div ref={wrapRef} className="dnav-end" onKeyDown={onKeyDown}>
      <div className="dnav-lang">
        <button
          ref={btnRef}
          type="button"
          className="dnav-icon-btn"
          aria-label={tr("زبان", "Language")}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => { setArmed(true); setOpen((v) => !v); }}
        >
          <Globe size={18} aria-hidden="true" />
        </button>
        {armed && (
          <div role="menu" aria-label={tr("زبان", "Language")} className="notif-panel dnav-panel dnav-lang-panel" data-popup-exit="self" data-open={open ? "true" : "false"}>
            {LANGS.map((l) => (
              <button
                key={l.value}
                type="button"
                role="menuitemradio"
                aria-checked={locale === l.value}
                tabIndex={-1}
                className="notif-panel-item dnav-menu-link"
                onClick={() => { setOpen(false); if (l.value !== locale) switchLocale(l.value); }}
              >
                <span>{l.label}</span>
                {locale === l.value && <Check size={14} aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {guest && (
        <>
          <Link href="/auth/login" className="dnav-login">{tr("ورود", "Log in")}</Link>
          <Link href="/auth/signup" className="topbar-signin-btn dnav-cta">{tr("شروع رایگان", "Start free")}</Link>
        </>
      )}
    </div>
  );
}
