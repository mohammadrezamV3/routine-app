"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export type KebabAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

/**
 * منوی سه‌نقطه‌ی مشترک بخش ترید (چک‌لیست‌ها، یادداشت‌ها، حساب‌ها).
 *
 * با `createPortal` به body می‌رود چون هر کارت `.trade-surface` یک
 * stacking-context جداست و منو داخلش زیر کارت‌های بعدی گم می‌شد. موقعیتش
 * هم `position:fixed` نسبت به خود دکمه محاسبه می‌شود، پس اسکرول شدن لیست
 * منو را جا نمی‌گذارد (با اسکرول بسته می‌شود).
 */
export function TradeKebabMenu({ actions, label = "گزینه‌ها" }: { actions: KebabAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function close() { setOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="trade-icon-btn trade-kebab-trigger"
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) { setOpen(false); return; }
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
          setOpen(true);
        }}
      >
        <MoreVertical size={16} />
      </button>

      {open && pos && createPortal(
        <div ref={menuRef} className="dash-context-menu trade-account-menu" style={{ top: pos.top, right: pos.right }}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              className={`wsearch-fab-option${a.danger ? " danger" : ""}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); a.onClick(); }}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
