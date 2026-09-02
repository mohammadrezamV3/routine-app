"use client";

import { useEffect, useState } from "react";
import { LineChart, CalendarDays, BarChart2, BellRing } from "lucide-react";
import { MarketPicker } from "@/components/MarketPicker";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { TradeStatsPicker } from "@/components/TradeStatsPicker";
import { AccountSectionCard } from "@/components/AccountSectionCard";
import { getSetting, setSetting } from "@/lib/storage";
import { getSiteMarket } from "@/lib/market";
import { DEFAULT_TICKER_SYMBOLS_IRAN, DEFAULT_TICKER_SYMBOLS_INTERNATIONAL, MAX_TICKER_SYMBOLS, MIN_TICKER_SYMBOLS, TICKER_SETTING_KEY } from "@/lib/tickerSymbols";
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
} from "@/lib/tradeTypes";

// تنظیمات بخش «ترید» — مثل RoutineSettings، مستقیم داخل صفحه‌ی تنظیمات.
export function TradeSettings() {
  const [tickerSymbols, setTickerSymbols] = useState<string[]>([]);
  const [marketPickerOpen, setMarketPickerOpen] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [visibleStats, setVisibleStats] = useState<TradeStatKey[]>(DEFAULT_VISIBLE_TRADE_STATS);
  const [statsPickerOpen, setStatsPickerOpen] = useState(false);
  const [alerts, setAlerts] = useState<NewsAlertPrefs>(DEFAULT_NEWS_ALERT_PREFS);

  useEffect(() => {
    const defaultSymbols = getSiteMarket() === "INTERNATIONAL" ? DEFAULT_TICKER_SYMBOLS_INTERNATIONAL : DEFAULT_TICKER_SYMBOLS_IRAN;
    getSetting<string[]>(TICKER_SETTING_KEY, defaultSymbols).then((saved) => setTickerSymbols(saved?.length ? saved : defaultSymbols));
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<TradeStatKey[]>(TRADE_STATS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_STATS).then((v) => setVisibleStats(v?.length ? v : DEFAULT_VISIBLE_TRADE_STATS));
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

  return (
    <>

      <AccountSectionCard icon={<LineChart size={16} />} title="بازارهای دنبال‌شده" index={0}>
        <div className="item-line">{tickerSymbols.length} بازار برای نوار قیمت بالای صفحه‌ی ترید انتخاب شده</div>
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

      <AccountSectionCard icon={<BarChart2 size={16} />} title="آمارهای صفحه ترید" index={2}>
        <div className="item-line" style={{ marginBottom: 10 }}>{visibleStats.length} از {TRADE_STAT_ORDER.length} آمار برای نمایش توی صفحه‌ی ترید انتخاب شده</div>
        <button className="account-outline-btn" onClick={() => setStatsPickerOpen(true)}>
          تغییر
        </button>
      </AccountSectionCard>

      <AccountSectionCard icon={<BellRing size={16} />} title="هشدار قبل از اخبار مهم" index={3}>
        <div className="item-line" style={{ marginBottom: 10 }}>
          قبل از انتشار رویدادهای تقویم اقتصادی، نوتیفیکیشن بگیر. برای رسیدن نوتیف باید
          اجازه‌ی نوتیفیکیشن مرورگر را هم داده باشی.
        </div>

        <button
          type="button"
          className={`trade-toggle${alerts.enabled ? " on" : ""}`}
          onClick={() => patchAlerts({ enabled: !alerts.enabled })}
        >
          <span className="trade-toggle-knob" />
          <span className="trade-toggle-label">{alerts.enabled ? "روشن" : "خاموش"}</span>
        </button>

        {alerts.enabled && (
          <>
            <label className="exercise-form-label">چند دقیقه قبل</label>
            <SegmentedTabs
              active={String(alerts.minutesBefore)}
              onChange={(v) => patchAlerts({ minutesBefore: Number(v) })}
              options={MINUTES_BEFORE_OPTIONS.map((m) => ({ value: String(m), label: `${m} دقیقه` }))}
            />

            <label className="exercise-form-label">برای کدام سطح تأثیر</label>
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
              ارزها {alerts.currencies.length ? "" : "(خالی یعنی همه)"}
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
    </>
  );
}
