"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { eventThemeById, type EventTheme } from "@/lib/eventThemes";

type IconComp = ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean }>;

// آیکون تم از روی اسم lucide؛ کل کتابخونه فقط وقتی تم فعاله و تازه بعد از
// mount لود می‌شه (chunk جدا) تا باندل صفحه‌های عادی بزرگ نشه.
export function EventThemeIcon({ name, size = 18 }: { name: string; size?: number }) {
  const [Icon, setIcon] = useState<IconComp | null>(null);
  useEffect(() => {
    let alive = true;
    import("lucide-react")
      .then((m) => {
        const found = (m.icons as Record<string, IconComp>)[name];
        if (alive && found) setIcon(() => found);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [name]);
  if (!Icon) return <span style={{ width: size, height: size, display: "inline-block" }} aria-hidden />;
  return <Icon size={size} aria-hidden />;
}

const SHOW_MS = 6000;

// تبریک مناسبت: یک بار برای هر وقوع (سال) روی هر دستگاه، یک قرص کوچک زیر هدر
export function EventThemeGreeting() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<EventTheme | null>(null);
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [open]);

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
        borderRadius: 999,
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
      <span>{theme.greeting}</span>
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
