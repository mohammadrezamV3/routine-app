"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { M_DUR, mT } from "./MentorMotion";

export type MentorMenuAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type Anchor = { top: number; bottom: number; left: number; right: number };

/**
 * منوی شناور بخش منتورها — همان ظاهر منوی سه‌نقطه‌ی سایت (TradeKebabMenu:
 * dash-context-menu با همان ردیف‌ها و رنگ خطرناک)، به‌علاوه‌ی باز/بسته‌شدن نرم.
 * هم زیر دکمه‌ی سه‌نقطه (MentorKebabMenu) و هم کنار یک حباب پیام
 * (MentorMenuAt) باز می‌شود. پورتال به body، موقعیت fixed؛ با اسکرول بسته می‌شود.
 */
export function MentorMenuAt({
  anchor, actions, onClose, label = "گزینه‌ها", align = "end",
}: {
  anchor: Anchor | null;
  actions: MentorMenuAction[];
  onClose: () => void;
  label?: string;
  /** end: لبه‌ی چپ منو با لبه‌ی چپ لنگر (RTL: انتهای ردیف)؛ start: لبه‌ی راست */
  align?: "start" | "end";
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!anchor) return;
    function onDoc(e: MouseEvent | TouchEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    // تاخیر: همان کلیکی که منو را باز کرد نباید فورا ببندد
    const t = setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("touchstart", onDoc, { passive: true });
    }, 0);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    if (anchor) menuRef.current?.querySelector<HTMLElement>("[role=menuitem]:not([aria-disabled=true])")?.focus({ preventScroll: true });
  }, [anchor]);

  if (!mounted) return null;

  let style: React.CSSProperties = {};
  let fromBelow = true;
  if (anchor) {
    const vh = window.innerHeight;
    const estH = actions.length * 40 + 14;
    fromBelow = anchor.bottom + 6 + estH <= vh - 8 || anchor.top < estH + 14;
    const vert = fromBelow ? { top: Math.min(anchor.bottom + 6, vh - estH - 8) } : { bottom: vh - anchor.top + 6 };
    const horiz = align === "end"
      ? { left: Math.max(8, anchor.left) }
      : { right: Math.max(8, window.innerWidth - anchor.right) };
    style = { ...vert, ...horiz };
  }

  return createPortal(
    <AnimatePresence>
      {anchor && (
        <motion.div
          key="m-menu"
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ ...style, transformOrigin: `${align === "end" ? "left" : "right"} ${fromBelow ? "top" : "bottom"}` }}
          className="dash-context-menu mentor-menu fixed z-[96] min-w-[168px] overflow-hidden rounded-2xl border border-dash-border p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
          initial={{ opacity: 0, scale: 0.96, y: fromBelow ? -4 : 4 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: mT(M_DUR.fast) }}
          exit={{ opacity: 0, scale: 0.97, transition: mT(0.12) }}
        >
          {actions.map((a) => (
            <div
              key={a.label}
              role="menuitem"
              tabIndex={a.disabled ? -1 : 0}
              aria-disabled={a.disabled || undefined}
              onClick={() => { if (a.disabled) return; onClose(); a.onClick(); }}
              onKeyDown={(e) => {
                if (a.disabled) return;
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); a.onClick(); }
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") ?? []);
                  const i = items.indexOf(e.currentTarget);
                  items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] outline-none transition sm:text-[13px] ${
                a.disabled
                  ? "cursor-default opacity-45"
                  : a.danger
                  ? "mentor-menu-danger cursor-pointer text-[#E05252] hover:bg-[#E05252]/10 focus-visible:bg-[#E05252]/10"
                  : "cursor-pointer text-dash-text hover:bg-white/5 focus-visible:bg-white/5"
              }`}
            >
              <span className="shrink-0">{a.icon}</span>
              {a.label}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** دکمه‌ی سه‌نقطه + منو (همان trade-kebab-trigger سایت) */
export function MentorKebabMenu({
  actions, label = "گزینه‌ها", className = "trade-icon-btn trade-kebab-trigger", iconSize = 16,
}: {
  actions: MentorMenuAction[];
  label?: string;
  className?: string;
  iconSize?: number;
}) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  if (actions.length === 0) return null;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (anchor) { setAnchor(null); return; }
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
        }}
      >
        <MoreVertical size={iconSize} strokeWidth={1.75} aria-hidden />
      </button>
      <MentorMenuAt anchor={anchor} actions={actions} label={label} onClose={() => { setAnchor(null); }} />
    </>
  );
}
