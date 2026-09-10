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

      {/* دقیقاً هم‌الگویِ منوی سه‌نقطه‌ی «برنامه‌های امروز»ِ روتین من
          (DashTaskRow) — همون کلاس‌های Tailwind مستقیم روی هر ردیف، نه
          کلاسِ قدیمیِ .wsearch-fab-option/.trade-account-menu که ظاهرشون
          با مرجع فرق داشت و طبقِ گزارشِ کاربر انگار «یه دکمه‌ی بزرگ» بود. */}
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ top: pos.top, right: pos.right }}
          className="dash-context-menu fixed z-[70] min-w-[150px] overflow-hidden rounded-2xl border border-dash-border p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
        >
          {actions.map((a) => (
            <div
              key={a.label}
              onClick={() => { if (a.disabled) return; setOpen(false); a.onClick(); }}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] transition sm:text-[13px] ${
                a.disabled
                  ? "cursor-default opacity-45"
                  : a.danger
                  ? "cursor-pointer text-[#E05252] hover:bg-[#E05252]/10"
                  : "cursor-pointer text-dash-text hover:bg-white/5"
              }`}
            >
              <span className="shrink-0">{a.icon}</span>
              {a.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
