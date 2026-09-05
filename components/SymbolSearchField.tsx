"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { TRADE_PAIRS, searchTradePairs } from "@/lib/tradePairs";

/**
 * جست‌وجوی نماد — جایگزینِ `<select>`ِ قبلی.
 *
 * چرا جست‌وجو و نه لیستِ کشویی: کاتالوگ نزدیکِ پنجاه نماد دارد و پیداکردنِ
 * «XAUUSD» در یک لیستِ کشویی یعنی اسکرول‌کردنِ کور. با تایپ، همان چند
 * نتیجه‌ی مرتبط می‌آید — هم با کدِ لاتین («xau») هم با نامِ فارسی («طلا»).
 *
 * لیستِ نتایج عمداً اسکرول‌بار ندارد: حداکثر هشت نتیجه نشان داده می‌شود و
 * بقیه با تایپِ دقیق‌تر فیلتر می‌شوند.
 */
export function SymbolSearchField({
  symbol,
  onChange,
}: {
  symbol: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const current = useMemo(() => TRADE_PAIRS.find((p) => p.code === symbol), [symbol]);
  const results = useMemo(() => searchTradePairs(query, 8), [query]);

  // بستن با کلیکِ بیرون. `pointerdown` (نه `blur`) چون روی لمس، blur پیش از
  // رسیدنِ کلیک به آیتم اجرا می‌شد و انتخاب دو ضربه می‌خواست.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  function pick(code: string) {
    onChange(code);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="tv-symbol-search" ref={wrapRef}>
      <Search size={15} className="tv-symbol-search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        className="tv-symbol-input"
        value={open ? query : `${symbol}${current ? ` — ${current.label}` : ""}`}
        placeholder="جست‌وجوی نماد… مثلا XAU یا طلا"
        aria-label="جست‌وجوی نماد"
        onFocus={() => { setQuery(""); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active].code); }
          else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
        }}
      />
      {open && (
        <button type="button" className="tv-symbol-clear" aria-label="بستن"
                onPointerDown={(e) => { e.preventDefault(); setOpen(false); }}>
          <X size={14} />
        </button>
      )}

      {open && (
        <div className="tv-symbol-results" role="listbox">
          {!results.length && <div className="tv-symbol-empty">نمادی پیدا نشد</div>}
          {results.map((p, i) => (
            <button
              key={p.code}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`tv-symbol-option${i === active ? " active" : ""}${p.code === symbol ? " current" : ""}`}
              onPointerDown={(e) => { e.preventDefault(); pick(p.code); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="tv-symbol-code mono">{p.code}</span>
              <span className="tv-symbol-label">{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
