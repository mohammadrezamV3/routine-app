"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Leaf, Ghost, Flame, TreePine, Heart, Flower2, MoonStar, Sprout, PartyPopper, type LucideIcon } from "lucide-react";
import { eventThemeById, type EventTheme } from "@/lib/eventThemes";

// فقط آیکون‌هایی که کاتالوگ (lib/eventThemes.ts) استفاده می‌کنه — نه import پویای کل
// lucide-react که یک chunk خیلی بزرگ روی همه‌ی صفحه‌ها اضافه می‌کرد. تم تازه با
// آیکون تازه = همین‌جا اضافه بشه.
const EVENT_ICONS: Record<string, LucideIcon> = { Leaf, Ghost, Flame, TreePine, Heart, Flower2, MoonStar, Sprout };

export function EventThemeIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = EVENT_ICONS[name] ?? PartyPopper;
  return <Icon size={size} aria-hidden />;
}

const SHOW_MS = 6000;
const SHOW_MS_WITH_CODE = 10000;

type LiveCode = { code: string; percent: number };

// تبریک مناسبت: یک بار برای هر وقوع (سال) روی هر دستگاه، یک قرص کوچک زیر هدر
export function EventThemeGreeting() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<EventTheme | null>(null);
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<LiveCode | null>(null);
  const inAdmin = !!pathname && pathname.startsWith("/admin");

  useEffect(() => {
    if (inAdmin) return;
    try {
      const id = document.documentElement.getAttribute("data-event-theme");
      const t = eventThemeById(id);
      if (!t) return;
      const key = `arion:eventGreet:${t.id}:${new Date().getFullYear()}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      setTheme(t);
      setOpen(true);
    } catch { /* localStorage ممکنه در دسترس نباشه */ }
  }, [inAdmin]);

  // کد تخفیف زنده‌ی مناسبت؛ هر خطایی = فقط تبریک ساده
  useEffect(() => {
    if (!theme) return;
    let cancelled = false;
    fetch(`/api/event-discount?theme=${encodeURIComponent(theme.id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.code === "string" && Number.isFinite(d.percent)) setOffer({ code: d.code, percent: d.percent });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), offer ? SHOW_MS_WITH_CODE : SHOW_MS);
    return () => clearTimeout(t);
  }, [open, offer]);

  if (!theme || !open || inAdmin) return null;

  return (
    <div
      role="status"
      dir="rtl"
      className="event-greet"
      style={{
        position: "fixed",
        top: "calc(86px + env(safe-area-inset-top))",
        insetInline: 0,
        margin: "0 auto",
        width: "max-content",
        maxWidth: "calc(100vw - 32px)",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 8px 8px 14px",
        borderRadius: offer ? 22 : 999,
        background: "var(--box-bg)",
        border: "1px solid var(--surface-line)",
        color: "var(--text)",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 6px 20px rgba(0,0,0,.18)",
        animation: "event-greet-in .35s ease both",
      }}
    >
      <style>{`@keyframes event-greet-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.event-greet{animation:none!important}}`}</style>
      <span style={{ display: "inline-flex", color: theme.swatch[0] }}>
        <EventThemeIcon name={theme.icon} size={18} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span>{theme.greeting}</span>
        {offer && (
          <span style={{ fontSize: 12, fontWeight: 500 }}>
            کد <span dir="ltr" style={{ fontFamily: "monospace", fontWeight: 700 }}>{offer.code}</span>: {offer.percent}٪ تخفیف روی همه‌ی پلن‌ها
          </span>
        )}
      </span>
      <button
        type="button"
        aria-label="بستن"
        onClick={() => setOpen(false)}
        style={{
          background: "none",
          border: "none",
          boxShadow: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          padding: 4,
          borderRadius: 999,
          display: "inline-flex",
          color: "var(--muted, currentColor)",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
