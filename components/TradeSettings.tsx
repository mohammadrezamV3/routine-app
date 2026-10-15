"use client";

import { useEffect, useState } from "react";
import { TickButton } from "./TickButton";
import { CandlestickChart } from "lucide-react";
import { MarketPicker } from "@/components/MarketPicker";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { TradeStatsPicker } from "@/components/TradeStatsPicker";
import { AccountBlock, AccountOption } from "@/components/AccountUI";
import { getSetting, setSetting } from "@/lib/storage";
import { DEFAULT_TICKER_SYMBOLS_IRAN, MAX_TICKER_SYMBOLS, MIN_TICKER_SYMBOLS, TICKER_SETTING_KEY } from "@/lib/tickerSymbols";
import {
  CALENDAR_CURRENCIES, IMPACT_LABELS, IMPACT_ORDER, EconomicImpact,
} from "@/lib/economicCalendar";
import {
  DEFAULT_NEWS_ALERT_PREFS, MINUTES_BEFORE_OPTIONS, NEWS_ALERT_KEY,
  NewsAlertPrefs, normalizeNewsAlertPrefs,
} from "@/lib/tradeNewsAlerts";
import {
  CAL_SYSTEM_KEY, CalSystem,
  TradeStatKey, DEFAULT_VISIBLE_TRADE_STATS, TRADE_STAT_ORDER, TRADE_STATS_VISIBILITY_KEY,
  TradeTotalsStatKey, DEFAULT_VISIBLE_TRADE_TOTALS_STATS, TRADE_TOTALS_STAT_ORDER, TRADE_TOTALS_STAT_LABELS, TRADE_TOTALS_VISIBILITY_KEY,
  TradeFactKey, DEFAULT_VISIBLE_TRADE_FACTS, TRADE_FACTS_VISIBILITY_KEY,
  MAX_VISIBLE_TRADE_FACTS,
} from "@/lib/tradeTypes";
import { TradeFactsPicker } from "@/components/TradeFactsPicker";
import { tr } from "@/lib/i18n";

// تنظیمات بخش «ترید» — مثل RoutineSettings، مستقیم داخل صفحه‌ی تنظیمات.
//
// طبق درخواست صریح، ترید *یک* بخش است: یک تیتر، یک قاب، و بالای هر
// گزینه فقط اسم خودش. قبلا هر گزینه یک کارت مستقل با تیتر و آیکون
// خودش بود و صفحه‌ی تنظیمات شبیه هشت کارت پشت‌سرهم می‌شد.
export function TradeSettings() {
  const [tickerSymbols, setTickerSymbols] = useState<string[]>([]);
  const [marketPickerOpen, setMarketPickerOpen] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [visibleStats, setVisibleStats] = useState<TradeStatKey[]>(DEFAULT_VISIBLE_TRADE_STATS);
  const [statsPickerOpen, setStatsPickerOpen] = useState(false);
  const [visibleTotals, setVisibleTotals] = useState<TradeTotalsStatKey[]>(DEFAULT_VISIBLE_TRADE_TOTALS_STATS);
  const [totalsPickerOpen, setTotalsPickerOpen] = useState(false);
  const [visibleFacts, setVisibleFacts] = useState<TradeFactKey[]>(DEFAULT_VISIBLE_TRADE_FACTS);
  const [factsPickerOpen, setFactsPickerOpen] = useState(false);
  const [alerts, setAlerts] = useState<NewsAlertPrefs>(DEFAULT_NEWS_ALERT_PREFS);

  useEffect(() => {
    const defaultSymbols = DEFAULT_TICKER_SYMBOLS_IRAN;
    getSetting<string[]>(TICKER_SETTING_KEY, defaultSymbols).then((saved) => setTickerSymbols(saved?.length ? saved : defaultSymbols));
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<TradeStatKey[]>(TRADE_STATS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_STATS).then((v) => setVisibleStats(v?.length ? v : DEFAULT_VISIBLE_TRADE_STATS));
    getSetting<TradeTotalsStatKey[]>(TRADE_TOTALS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_TOTALS_STATS).then((v) => setVisibleTotals(Array.isArray(v) && v.length ? v : DEFAULT_VISIBLE_TRADE_TOTALS_STATS));
    getSetting<TradeFactKey[]>(TRADE_FACTS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_FACTS).then((v) => setVisibleFacts(v?.length ? v : DEFAULT_VISIBLE_TRADE_FACTS));
    getSetting<unknown>(NEWS_ALERT_KEY, DEFAULT_NEWS_ALERT_PREFS).then((v) => setAlerts(normalizeNewsAlertPrefs(v)));
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

  // هر تغییر تنظیمات هشدار بلافاصله ذخیره می‌شود (بدون دکمه‌ی «ذخیره») —
  // هم‌قاعده‌ی بقیه‌ی تنظیمات همین صفحه.
  function patchAlerts(p: Partial<NewsAlertPrefs>) {
    setAlerts((prev) => {
      const next = normalizeNewsAlertPrefs({ ...prev, ...p });
      setSetting(NEWS_ALERT_KEY, next);
      return next;
    });
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

  function toggleVisibleTotal(key: TradeTotalsStatKey) {
    setVisibleTotals((prev) => {
      const has = prev.includes(key);
      if (has && prev.length <= 1) return prev;
      const next = has ? prev.filter((k) => k !== key) : [...prev, key];
      setSetting(TRADE_TOTALS_VISIBILITY_KEY, next);
      return next;
    });
  }

  // سقف هشت‌تایی همین‌جا نگه داشته می‌شود (نه فقط در UI): تاگل بیشتر از سقف
  // اصلا اعمال نمی‌شود، پس حتی اگر دو تب هم‌زمان باز باشند مقدار ذخیره‌شده
  // از سقف رد نمی‌شود.
  function toggleVisibleFact(key: TradeFactKey) {
    setVisibleFacts((prev) => {
      const has = prev.includes(key);
      if (has && prev.length <= 1) return prev;
      if (!has && prev.length >= MAX_VISIBLE_TRADE_FACTS) return prev;
      const next = has ? prev.filter((k) => k !== key) : [...prev, key];
      setSetting(TRADE_FACTS_VISIBILITY_KEY, next);
      return next;
    });
  }

  return (
    <AccountBlock icon={<CandlestickChart size={15} />} title={tr("ترید", "Trading")} index={3}>

      <AccountOption label={tr("بازارهای دنبال‌شده", "Followed markets")}>
        <div className="item-line">{tr(`${tickerSymbols.length} بازار برای نوار قیمت بالای صفحه‌ی ترید انتخاب شده`, `${tickerSymbols.length} ${tickerSymbols.length === 1 ? "market" : "markets"} selected for the price bar at the top of the trading page`)}</div>
        <button className="account-outline-btn" onClick={() => setMarketPickerOpen(true)} style={{ marginTop: 10 }}>
          {tr("تغییر بازارها", "Change markets")}
        </button>
      </AccountOption>

      <AccountOption label={tr("تقویم ژورنال ترید", "Journal calendar")}>
        <div className="item-line" style={{ marginBottom: 10 }}>{tr("تاریخ‌های ژورنال ترید به چه تقویمی نمایش داده بشه", "Which calendar to use for dates in the trading journal")}</div>
        <SegmentedTabs
          options={[{ value: "jalali", label: tr("شمسی", "Jalali") }, { value: "gregorian", label: tr("میلادی", "Gregorian") }]}
          active={calSystem}
          onChange={changeCalSystem}
        />
      </AccountOption>

      <AccountOption label={tr("آمارهای صفحه ترید", "Trading page stats")}>
        <div className="item-line" style={{ marginBottom: 10 }}>{tr(`${visibleStats.length} از ${TRADE_STAT_ORDER.length} آمار برای نمایش توی صفحه‌ی ترید انتخاب شده`, `${visibleStats.length} of ${TRADE_STAT_ORDER.length} stats selected for the trading page`)}</div>
        <button className="account-outline-btn" onClick={() => setStatsPickerOpen(true)}>
          {tr("تغییر", "Change")}
        </button>
      </AccountOption>

      <AccountOption label={tr("آمارهای کل حساب‌ها", "All-accounts stats")}>
        <div className="item-line" style={{ marginBottom: 10 }}>
          {tr(`${visibleTotals.length} از ${TRADE_TOTALS_STAT_ORDER.length} آمار برای بالای صفحه‌ی حساب‌ها انتخاب شده — سه‌تای اول سرخط، بقیه پشت «جزئیات بیشتر»`, `${visibleTotals.length} of ${TRADE_TOTALS_STAT_ORDER.length} stats selected for the top of the accounts page. The first three are headlines, the rest are behind "More details"`)}
        </div>
        <button className="account-outline-btn" onClick={() => setTotalsPickerOpen(true)}>
          {tr("تغییر", "Change")}
        </button>
      </AccountOption>

      <AccountOption label={tr("جزئیات ترید در لیست", "Trade details in the list")}>
        <div className="item-line" style={{ marginBottom: 10 }}>
          {tr(`${visibleFacts.length} از ${MAX_VISIBLE_TRADE_FACTS} جزئیات برای نمایش کنار هر ترید انتخاب شده`, `${visibleFacts.length} of ${MAX_VISIBLE_TRADE_FACTS} details selected to show next to each trade`)}
        </div>
        <button className="account-outline-btn" onClick={() => setFactsPickerOpen(true)}>
          {tr("تغییر", "Change")}
        </button>
      </AccountOption>

      <AccountOption label={tr("هشدار قبل از اخبار مهم", "Alert before important news")}>
        <div className="item-line" style={{ marginBottom: 10 }}>
          {tr("قبل از انتشار رویدادهای تقویم اقتصادی، نوتیفیکیشن بگیر. برای رسیدن نوتیف باید اجازه‌ی نوتیفیکیشن مرورگر را هم داده باشی.", "Get a notification before economic calendar events are released. You also need to allow browser notifications for it to arrive.")}
        </div>

        <button
          type="button"
          className={`trade-toggle${alerts.enabled ? " on" : ""}`}
          onClick={() => patchAlerts({ enabled: !alerts.enabled })}
        >
          <TickButton as="span" checked={alerts.enabled} size={22} />
          <span className="trade-toggle-label">{alerts.enabled ? tr("روشن", "On") : tr("خاموش", "Off")}</span>
        </button>

        {alerts.enabled && (
          <>
            <label className="exercise-form-label">{tr("چند دقیقه قبل", "Minutes before")}</label>
            <SegmentedTabs
              active={String(alerts.minutesBefore)}
              onChange={(v) => patchAlerts({ minutesBefore: Number(v) })}
              options={MINUTES_BEFORE_OPTIONS.map((m) => ({ value: String(m), label: tr(`${m} دقیقه`, `${m} min`) }))}
            />

            <label className="exercise-form-label">{tr("برای کدام سطح تاثیر", "Impact levels")}</label>
            <div className="trade-choice-grid">
              {IMPACT_ORDER.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`trade-choice${alerts.impacts.includes(i) ? " active" : ""}`}
                  onClick={() => patchAlerts({
                    impacts: alerts.impacts.includes(i)
                      ? alerts.impacts.filter((x) => x !== i)
                      : [...alerts.impacts, i as EconomicImpact],
                  })}
                >
                  {IMPACT_LABELS[i]}
                </button>
              ))}
            </div>

            <label className="exercise-form-label">
              {tr("ارزها", "Currencies")} {alerts.currencies.length ? "" : tr("(خالی یعنی همه)", "(empty means all)")}
            </label>
            <div className="trade-choice-grid">
              {CALENDAR_CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`trade-choice${alerts.currencies.includes(c.code) ? " active" : ""}`}
                  onClick={() => patchAlerts({
                    currencies: alerts.currencies.includes(c.code)
                      ? alerts.currencies.filter((x) => x !== c.code)
                      : [...alerts.currencies, c.code],
                  })}
                >
                  {c.flag} {c.code}
                </button>
              ))}
            </div>
          </>
        )}
      </AccountOption>

      {marketPickerOpen && (
        <MarketPicker
          title={tr("بازارهای دنبال‌شده", "Followed markets")}
          symbols={tickerSymbols}
          onToggle={toggleTickerSymbol}
          onClose={() => setMarketPickerOpen(false)}
        />
      )}

      {totalsPickerOpen && (
        <TradeStatsPicker<TradeTotalsStatKey>
          title={tr("آمارهای کل حساب‌ها", "All-accounts stats")}
          note={tr("کدوم آمارها بالای صفحه‌ی حساب‌ها نشون داده بشن رو انتخاب کن. سه‌تای اول سرخط می‌شن.", "Choose which stats show at the top of the accounts page. The first three become headlines.")}
          order={TRADE_TOTALS_STAT_ORDER}
          labels={TRADE_TOTALS_STAT_LABELS}
          visible={visibleTotals}
          onToggle={toggleVisibleTotal}
          onClose={() => setTotalsPickerOpen(false)}
        />
      )}

      {statsPickerOpen && (
        <TradeStatsPicker
          visible={visibleStats}
          onToggle={toggleVisibleStat}
          onClose={() => setStatsPickerOpen(false)}
        />
      )}

      {factsPickerOpen && (
        <TradeFactsPicker
          visible={visibleFacts}
          onToggle={toggleVisibleFact}
          onClose={() => setFactsPickerOpen(false)}
        />
      )}
    </AccountBlock>
  );
}
