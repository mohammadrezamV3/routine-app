"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSetting, setSetting } from "@/lib/storage";
import { getSiteMarket } from "@/lib/market";
import {
  TICKER_CATALOG, DEFAULT_TICKER_SYMBOLS_IRAN, DEFAULT_TICKER_SYMBOLS_INTERNATIONAL,
  MAX_TICKER_SYMBOLS, MIN_TICKER_SYMBOLS, tickerLabelFor,
} from "@/lib/tickerSymbols";

const TICKER_SETTING_KEY = "tradeTickerSymbols";
const POLL_MS = 30_000;

type Quote = { symbol: string; price: number; changePercent: number; changeAbs: number };

// نوار قیمت لحظه‌ای زیر هدر صفحه‌ی ترید — خودش با سرعت کم اسلاید می‌شه،
// کاربر با دکمه‌ی تنظیمات کنارش بازارهای دلخواهش رو انتخاب می‌کنه.
export function MarketTicker() {
  const defaultSymbols = useMemo(
    () => (getSiteMarket() === "INTERNATIONAL" ? DEFAULT_TICKER_SYMBOLS_INTERNATIONAL : DEFAULT_TICKER_SYMBOLS_IRAN),
    []
  );
  const [symbols, setSymbols] = useState<string[]>(defaultSymbols);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    getSetting<string[]>(TICKER_SETTING_KEY, defaultSymbols).then((saved) => {
      if (saved?.length) setSymbols(saved);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!symbols.length) { setQuotes([]); return; }
      try {
        const res = await fetch(`/api/market/prices?symbols=${symbols.map(encodeURIComponent).join(",")}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setQuotes(data.quotes || []);
      } catch {
        // بی‌صدا نادیده گرفته می‌شه — دفعه بعد دوباره امتحان می‌کنه
      }
    }
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [symbols]);

  function toggleSymbol(symbol: string) {
    setSymbols((prev) => {
      const has = prev.includes(symbol);
      if (has && prev.length <= MIN_TICKER_SYMBOLS) return prev;
      if (!has && prev.length >= MAX_TICKER_SYMBOLS) return prev;
      const next = has ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      setSetting(TICKER_SETTING_KEY, next);
      return next;
    });
  }

  const loop = quotes.length ? [...quotes, ...quotes] : [];

  return (
    <div className="ticker-bar">
      {quotes.length ? (
        <div className="ticker-viewport">
          <div className="ticker-track">
            {loop.map((q, i) => (
              <span key={`${q.symbol}-${i}`} className="ticker-item">
                <span className="ticker-symbol">{tickerLabelFor(q.symbol)}</span>
                <span className="mono ticker-price">{q.price.toFixed(q.price < 10 ? 4 : 2)}</span>
                <span className={`mono ticker-change ${q.changePercent >= 0 ? "up" : "down"}`}>
                  {q.changePercent >= 0 ? "↗" : "↘"} {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}٪
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="ticker-viewport ticker-empty-msg">قیمت‌ها موقتاً در دسترس نیست</div>
      )}

      <button type="button" className="ticker-settings-btn" onClick={() => setPickerOpen(true)} aria-label="انتخاب بازارها">
        <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
      </button>

      {pickerOpen && (
        <TickerSymbolPicker symbols={symbols} onToggle={toggleSymbol} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

function TickerSymbolPicker({
  symbols,
  onToggle,
  onClose,
}: {
  symbols: string[];
  onToggle: (symbol: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open">
        <div className="modal-head">
          <div className="modal-title">بازارهای دنبال‌شده</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <div className="section-note" style={{ marginBottom: 10 }}>
            {symbols.length} از حداکثر {MAX_TICKER_SYMBOLS} بازار انتخاب شده
          </div>
          {TICKER_CATALOG.map((s) => {
            const on = symbols.includes(s.symbol);
            return (
              <div key={s.symbol} onClick={() => onToggle(s.symbol)} className="task">
                <div className={`check${on ? " on" : ""}`}>
                  <svg className="c-check" viewBox="0 0 24 24" fill="none">
                    <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={`task-name${on ? " done" : ""}`}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
