"use client";

import { useEffect, useMemo, useState } from "react";
import { getSetting, setSetting } from "@/lib/storage";
import { getSiteMarket } from "@/lib/market";
import {
  DEFAULT_TICKER_SYMBOLS_IRAN, DEFAULT_TICKER_SYMBOLS_INTERNATIONAL,
  MAX_TICKER_SYMBOLS, MIN_TICKER_SYMBOLS, tickerLabelFor, TICKER_SETTING_KEY,
} from "@/lib/tickerSymbols";
import { MarketPicker } from "./MarketPicker";

const ONBOARDED_KEY = "tradeMarketsOnboarded";
const POLL_MS = 30_000;

type Quote = { symbol: string; price: number; changePercent: number; changeAbs: number };

// نوار قیمت لحظه‌ای تمام‌عرضِ بالای صفحه‌ی ترید — خودش با سرعت کم اسلاید
// می‌شه. انتخاب بازارها دیگه دکمه‌ی کنار همین نواره نیست (رفته توی پنل
// کاربری)؛ فقط دفعه‌ی اولی که کاربر این صفحه رو می‌بینه و هنوز هیچ انتخابی
// نکرده، همینجا ازش می‌پرسیم کدوم بازارها رو دنبال کنه.
export function MarketTicker() {
  const defaultSymbols = useMemo(
    () => (getSiteMarket() === "INTERNATIONAL" ? DEFAULT_TICKER_SYMBOLS_INTERNATIONAL : DEFAULT_TICKER_SYMBOLS_IRAN),
    []
  );
  const [symbols, setSymbols] = useState<string[]>(defaultSymbols);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [onboardOpen, setOnboardOpen] = useState(false);

  useEffect(() => {
    getSetting<string[]>(TICKER_SETTING_KEY, defaultSymbols).then((saved) => {
      if (saved?.length) setSymbols(saved);
    });
    getSetting<boolean>(ONBOARDED_KEY, false).then((done) => {
      if (!done) setOnboardOpen(true);
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

  function closeOnboarding() {
    setOnboardOpen(false);
    setSetting(ONBOARDED_KEY, true);
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

      {onboardOpen && (
        <MarketPicker
          title="کدوم بازارها رو دنبال کنی؟"
          intro="بازارهایی که می‌خوای توی نوار بالای صفحه ببینی رو انتخاب کن — هروقت خواستی از پنل کاربری عوضش کن."
          symbols={symbols}
          onToggle={toggleSymbol}
          onClose={closeOnboarding}
        />
      )}
    </div>
  );
}
