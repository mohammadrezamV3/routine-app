"use client";

import { useMemo, useState } from "react";
import { TICKER_CATALOG, CATEGORY_LABELS, MAX_TICKER_SYMBOLS, TickerSymbol } from "@/lib/tickerSymbols";

// انتخاب‌گر بازارها — هم توی پنل کاربری (مدیریت همیشگی) و هم توی خودِ
// صفحه‌ی ترید (فقط دفعه‌ی اول، برای onboarding) استفاده می‌شه. کاتالوگ حدود
// ۳۶۰ نماده، پس یک جستجو + گروه‌بندی بر اساس دسته لازم بود، نه یک لیست تخت.
export function MarketPicker({
  symbols,
  onToggle,
  onClose,
  title,
  intro,
}: {
  symbols: string[];
  onToggle: (symbol: string) => void;
  onClose: () => void;
  title: string;
  intro?: string;
}) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? TICKER_CATALOG.filter((s) => s.symbol.toLowerCase().includes(q) || s.label.toLowerCase().includes(q))
      : TICKER_CATALOG;
    const map = new Map<TickerSymbol["category"], TickerSymbol[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [query]);

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          {intro && <div className="section-note" style={{ marginTop: 0 }}>{intro}</div>}
          <div className="section-note" style={{ marginBottom: 10 }}>
            {symbols.length} از حداکثر {MAX_TICKER_SYMBOLS} بازار انتخاب شده
          </div>
          <input
            type="text"
            className="wsearch-newform-name"
            placeholder="جستجوی نماد یا اسم بازار…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category} className="tm-extra" style={{ marginTop: 14 }}>
              <div className="domain-sub" style={{ margin: 0 }}>{CATEGORY_LABELS[category]}</div>
              {items.map((s) => {
                const on = symbols.includes(s.symbol);
                return (
                  <div key={s.symbol} onClick={() => onToggle(s.symbol)} className="task">
                    <div className={`check${on ? " on" : ""}`}>
                      <svg className="c-check" viewBox="0 0 24 24" fill="none">
                        <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className={`task-name${on ? " done" : ""}`}>
                      {s.label}
                      {/* برای فارکس، label و symbol (مثلاً EUR/USD و EURUSD=X) عملاً همون
                          حروف رو تکرار می‌کنن — فقط برای بقیه‌ی دسته‌ها که واقعاً اطلاعات
                          اضافه می‌ده (مثلاً «بیت‌کوین» در برابر BTC-USD) نماد رو هم نشون بده */}
                      {s.category !== "forex" && (
                        <span className="mono" style={{ color: "var(--muted2)", fontSize: 11 }}> {s.symbol}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {grouped.size === 0 && <div className="item-line empty">چیزی پیدا نشد</div>}
        </div>
      </div>
    </>
  );
}
