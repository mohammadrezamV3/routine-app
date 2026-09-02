"use client";

import { useCallback, useEffect, useState } from "react";
import { getSetting, setSetting } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { CAL_SYSTEM_KEY, CalSystem, TradeAccount, TradeTag } from "@/lib/tradeTypes";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import { TradingViewChart } from "./TradingViewChart";
import { SymbolSearchField } from "./SymbolSearchField";
import { ChartTradePanel } from "./ChartTradePanel";
import { ChartCalendarPanel } from "./ChartCalendarPanel";
import { SymbolChatPanel } from "./SymbolChatPanel";
import { PanelSkeleton } from "./PanelSkeleton";

const SYMBOL_KEY = SETTING_KEYS.tradeChartSymbol;

/**
 * صفحه‌ی چارت.
 *
 * چیدمان (راست‌به‌چپ): ستونِ راست پهن است — چارت، بعد گفت‌وگوی همان نماد،
 * بعد تقویم اقتصادی. ستونِ چپ باریک است — چک‌لیست و ثبتِ معامله.
 *
 * نماد یک انتخابِ سراسریِ صفحه است: هر سه بخش (چارت، ثبتِ معامله، اتاقِ
 * گفت‌وگو) از همان یک نماد پیروی می‌کنند.
 *
 * تایم‌فریم عمداً این‌جا نیست — نوارِ بالاییِ خودِ تریدینگ‌ویو داردش و دو
 * جای کنترلِ یک چیز فقط گیج‌کننده است.
 */
export function TradeChartView() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<string>(SYMBOL_KEY, "EURUSD").then((v) => {
      if (v && TRADE_PAIRS.some((p) => p.code === v)) setSymbol(v);
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

  if (loading) return <PanelSkeleton />;

  return (
    <div className="tv-page">
      {/* ستونِ راست (پهن) */}
      <div className="tv-main">
        <div className="tv-chart-card">
          <SymbolSearchField symbol={symbol} onChange={changeSymbol} />
          <TradingViewChart symbol={symbol} />
        </div>

        <SymbolChatPanel symbol={symbol} />
        <ChartCalendarPanel />
      </div>

      {/* ستونِ چپ (باریک) */}
      <aside className="tv-aside">
        <ChartTradePanel
          symbol={symbol}
          accounts={accounts}
          tags={tags}
          calSystem={calSystem}
          onTagCreated={(t) => setTags((prev) => [...prev, t])}
          onSaved={() => load(true)}
        />
      </aside>
    </div>
  );
}
