"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { getSetting, setSetting } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { CAL_SYSTEM_KEY, CalSystem, TradeAccount, TradeTag } from "@/lib/tradeTypes";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import { CHART_INTERVALS, ChartInterval, isChartInterval, pairLabel } from "@/lib/tradingView";
import { TradingViewChart } from "./TradingViewChart";
import { ChartTradePanel } from "./ChartTradePanel";
import { ChartCalendarPanel } from "./ChartCalendarPanel";
import { SymbolChatPanel } from "./SymbolChatPanel";
import { PanelSkeleton } from "./PanelSkeleton";

const SYMBOL_KEY = SETTING_KEYS.tradeChartSymbol;
const INTERVAL_KEY = SETTING_KEYS.tradeChartInterval;

/**
 * صفحه‌ی چارت — چارتِ تریدینگ‌ویو در مرکز، چک‌لیست و ثبتِ معامله در کنار،
 * و پایین دو کارت: تقویم اقتصادی و گفت‌وگوی گروهیِ همان نماد.
 *
 * نماد یک انتخابِ سراسریِ صفحه است: هر چهار بخش (چارت، ثبتِ معامله، اتاقِ
 * گفت‌وگو) از همان یک نماد پیروی می‌کنند، چون عوض‌کردنِ نماد در یک بخش و
 * ثابت‌ماندنِ بقیه دقیقاً همان چیزی است که کاربر را گیج می‌کند.
 */
export function TradeChartView() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [interval, setIntervalValue] = useState<ChartInterval>("60");
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    // انتخابِ قبلیِ کاربر برمی‌گردد — باز کردنِ دوباره‌ی صفحه نباید هر بار
    // به EURUSD برگردد.
    getSetting<string>(SYMBOL_KEY, "EURUSD").then((v) => {
      if (v && TRADE_PAIRS.some((p) => p.code === v)) setSymbol(v);
    });
    getSetting<string>(INTERVAL_KEY, "60").then((v) => {
      if (isChartInterval(v)) setIntervalValue(v);
    });
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([
        fetch("/api/trade/accounts?archived=0"),
        fetch("/api/trade/tags"),
      ]);
      setAccounts(aRes.ok ? (await aRes.json()).accounts || [] : []);
      setTags(tRes.ok ? (await tRes.json()).tags || [] : []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function changeSymbol(next: string) {
    setSymbol(next);
    setSetting(SYMBOL_KEY, next);
  }

  function changeInterval(next: ChartInterval) {
    setIntervalValue(next);
    setSetting(INTERVAL_KEY, next);
  }

  if (loading) return <PanelSkeleton />;

  return (
    <div className="trade-chart-page">
      <div className="trade-chart-main">
        <div className="trade-surface trade-chart-card">
          <div className="trade-chart-toolbar">
            <div className="trade-chart-symbol-wrap">
              <select
                className="trade-chart-symbol-select"
                value={symbol}
                onChange={(e) => changeSymbol(e.target.value)}
                aria-label="انتخاب نماد"
              >
                {TRADE_PAIRS.map((p) => (
                  <option key={p.code} value={p.code}>{p.code} — {p.label}</option>
                ))}
              </select>
              <ChevronDown size={15} className="trade-chart-symbol-caret" />
            </div>

            <div className="trade-chart-intervals">
              {CHART_INTERVALS.map((it) => (
                <button
                  key={it.tv}
                  type="button"
                  className={`trade-chart-interval${interval === it.tv ? " active" : ""}`}
                  onClick={() => changeInterval(it.tv)}
                  title={it.label}
                >
                  {it.short}
                </button>
              ))}
            </div>
          </div>

          <TradingViewChart symbol={symbol} interval={interval} />
        </div>

        <div className="trade-chart-bottom">
          {/* جای این دو نسبت به طرحِ اولیه عوض شده: تقویم سمتِ چت و چت
              سمتِ اخبارِ قبلی */}
          <ChartCalendarPanel />
          <SymbolChatPanel symbol={symbol} />
        </div>
      </div>

      <motion.aside
        className="trade-chart-aside"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <ChartTradePanel
          symbol={symbol}
          accounts={accounts}
          tags={tags}
          calSystem={calSystem}
          onTagCreated={(t) => setTags((prev) => [...prev, t])}
          onSaved={() => load(true)}
        />
      </motion.aside>
    </div>
  );
}
