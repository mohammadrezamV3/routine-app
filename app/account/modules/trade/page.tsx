"use client";

import { useEffect, useState } from "react";
import { LineChart, CalendarDays, Target, BarChart2 } from "lucide-react";
import { MarketPicker } from "@/components/MarketPicker";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { TradeStatsPicker } from "@/components/TradeStatsPicker";
import { AccountSectionCard } from "@/components/AccountSectionCard";
import { getSetting, setSetting } from "@/lib/storage";
import { getSiteMarket } from "@/lib/market";
import { DEFAULT_TICKER_SYMBOLS_IRAN, DEFAULT_TICKER_SYMBOLS_INTERNATIONAL, MAX_TICKER_SYMBOLS, MIN_TICKER_SYMBOLS, TICKER_SETTING_KEY } from "@/lib/tickerSymbols";
import {
  CAL_SYSTEM_KEY, MONTHLY_GOAL_KEY, CalSystem,
  TradeStatKey, DEFAULT_VISIBLE_TRADE_STATS, TRADE_STATS_VISIBILITY_KEY,
} from "@/lib/tradeTypes";

export default function TradeModuleSettingsPage() {
  const [tickerSymbols, setTickerSymbols] = useState<string[]>([]);
  const [marketPickerOpen, setMarketPickerOpen] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [goalDraft, setGoalDraft] = useState("");
  const [goalSaved, setGoalSaved] = useState(false);
  const [visibleStats, setVisibleStats] = useState<TradeStatKey[]>(DEFAULT_VISIBLE_TRADE_STATS);
  const [statsPickerOpen, setStatsPickerOpen] = useState(false);

  useEffect(() => {
    const defaultSymbols = getSiteMarket() === "INTERNATIONAL" ? DEFAULT_TICKER_SYMBOLS_INTERNATIONAL : DEFAULT_TICKER_SYMBOLS_IRAN;
    getSetting<string[]>(TICKER_SETTING_KEY, defaultSymbols).then((saved) => setTickerSymbols(saved?.length ? saved : defaultSymbols));
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<number>(MONTHLY_GOAL_KEY, 0).then((v) => { setMonthlyGoal(v); setGoalDraft(v ? String(v) : ""); });
    getSetting<TradeStatKey[]>(TRADE_STATS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_STATS).then((v) => setVisibleStats(v?.length ? v : DEFAULT_VISIBLE_TRADE_STATS));
  }, []);

  function toggleTickerSymbol(symbol: string) {
    setTickerSymbols((prev) => {
      const has = prev.includes(symbol);
      if (has && prev.length <= MIN_TICKER_SYMBOLS) return prev;
      if (!has && prev.length >= MAX_TICKER_SYMBOLS) return prev;
      const next = has ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      setSetting(TICKER_SETTING_KEY, next);
      return next;
    });
  }

  function changeCalSystem(v: CalSystem) {
    setCalSystem(v);
    setSetting(CAL_SYSTEM_KEY, v);
  }

  function saveMonthlyGoal() {
    const v = Math.max(0, +goalDraft || 0);
    setMonthlyGoal(v);
    setSetting(MONTHLY_GOAL_KEY, v);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 1800);
  }

  function toggleVisibleStat(key: TradeStatKey) {
    setVisibleStats((prev) => {
      const has = prev.includes(key);
      if (has && prev.length <= 1) return prev;
      const next = has ? prev.filter((k) => k !== key) : [...prev, key];
      setSetting(TRADE_STATS_VISIBILITY_KEY, next);
      return next;
    });
  }

  return (
    <section>
      <h1>ترید</h1>
      <div className="account-content-hint">تنظیمات مربوط به بخش ترید</div>

      <AccountSectionCard icon={<LineChart size={16} />} title="بازارهای دنبال‌شده" index={0}>
        <div className="item-line">{tickerSymbols.length} بازار برای نوار قیمتِ بالای صفحه‌ی ترید انتخاب شده</div>
        <button className="account-outline-btn" onClick={() => setMarketPickerOpen(true)} style={{ marginTop: 10 }}>
          تغییر بازارها
        </button>
      </AccountSectionCard>

      <AccountSectionCard icon={<CalendarDays size={16} />} title="تقویم ژورنال ترید" index={1}>
        <div className="item-line" style={{ marginBottom: 10 }}>تاریخ‌های ژورنال ترید به چه تقویمی نمایش داده بشه</div>
        <SegmentedTabs
          options={[{ value: "jalali", label: "شمسی" }, { value: "gregorian", label: "میلادی" }]}
          active={calSystem}
          onChange={changeCalSystem}
        />
      </AccountSectionCard>

      <AccountSectionCard icon={<Target size={16} />} title="هدف سود ماهانه ترید" index={2}>
        <div className="item-line" style={{ marginBottom: 10 }}>
          {monthlyGoal > 0
            ? <>هدف فعلی: <b className="mono" style={{ color: "var(--accent)" }}>{monthlyGoal}</b> — به‌صورت آمار دایره‌ای توی صفحه ترید نشون داده می‌شه</>
            : "هنوز هدفی تنظیم نکردی — با تعیین هدف، پیشرفتت توی صفحه ترید به‌صورت دایره نشون داده می‌شه"}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number" min={0} value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
            placeholder="مثلاً 500" style={{ maxWidth: 140 }}
          />
          <button className="account-outline-btn" onClick={saveMonthlyGoal}>
            {goalSaved ? "ذخیره شد ✓" : "ذخیره هدف"}
          </button>
        </div>
      </AccountSectionCard>

      <AccountSectionCard icon={<BarChart2 size={16} />} title="آمارهای صفحه ترید" index={3}>
        <div className="item-line" style={{ marginBottom: 10 }}>{visibleStats.length} از ۱۰ آمار برای نمایش توی صفحه‌ی ترید انتخاب شده</div>
        <button className="account-outline-btn" onClick={() => setStatsPickerOpen(true)}>
          تغییر
        </button>
      </AccountSectionCard>

      {marketPickerOpen && (
        <MarketPicker
          title="بازارهای دنبال‌شده"
          symbols={tickerSymbols}
          onToggle={toggleTickerSymbol}
          onClose={() => setMarketPickerOpen(false)}
        />
      )}

      {statsPickerOpen && (
        <TradeStatsPicker
          visible={visibleStats}
          onToggle={toggleVisibleStat}
          onClose={() => setStatsPickerOpen(false)}
        />
      )}
    </section>
  );
}
