// هشدارِ پیش از اخبارِ مهم اقتصادی.
//
// تنظیماتش سمتِ کاربر ذخیره می‌شود (کلیدِ tradeNewsAlerts) و خودِ ارسال با
// کرانِ سرور انجام می‌شود، نه مرورگر — وگرنه فقط وقتی تبِ اپ باز بود کار
// می‌کرد، که دقیقاً همان لحظه‌ای است که کاربر کمترین نیاز را به یادآوری دارد.

import { SETTING_KEYS } from "./userSettingKeys";
import type { EconomicImpact } from "./economicCalendar";

export const NEWS_ALERT_KEY = SETTING_KEYS.tradeNewsAlerts;

/** ردِ رویدادهایی که برایشان قبلاً هشدار رفته — حالتِ داخلیِ سرور، نه ترجیحِ کاربر */
export const NEWS_ALERT_LOG_KEY = "tradeNewsAlertLog";

export type NewsAlertPrefs = {
  enabled: boolean;
  /** چند دقیقه قبل از رویداد هشدار برود */
  minutesBefore: number;
  impacts: EconomicImpact[];
  /** خالی یعنی «همه‌ی ارزها» */
  currencies: string[];
};

export const DEFAULT_NEWS_ALERT_PREFS: NewsAlertPrefs = {
  enabled: false,
  minutesBefore: 30,
  impacts: ["HIGH"],
  currencies: [],
};

export const MINUTES_BEFORE_OPTIONS = [15, 30, 60] as const;

/** ورودیِ ذخیره‌شده ممکن است قدیمی یا دستکاری‌شده باشد — همیشه نرمال می‌شود */
export function normalizeNewsAlertPrefs(raw: unknown): NewsAlertPrefs {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<NewsAlertPrefs>;
  const impacts = Array.isArray(v.impacts)
    ? v.impacts.filter((i): i is EconomicImpact => i === "LOW" || i === "MEDIUM" || i === "HIGH")
    : DEFAULT_NEWS_ALERT_PREFS.impacts;
  const minutes = Number(v.minutesBefore);
  return {
    enabled: !!v.enabled,
    minutesBefore: (MINUTES_BEFORE_OPTIONS as readonly number[]).includes(minutes)
      ? minutes
      : DEFAULT_NEWS_ALERT_PREFS.minutesBefore,
    impacts: impacts.length ? impacts : DEFAULT_NEWS_ALERT_PREFS.impacts,
    currencies: Array.isArray(v.currencies)
      ? v.currencies.filter((c): c is string => typeof c === "string").slice(0, 20)
      : [],
  };
}
