// لایه‌ی API بخش‌های «آنلاینِ» ترید (/api/mobile/trade-online/*).
//
// صفحه‌ها فقط به اینترفیسِ TradeOnlineApi وابسته‌ان. پیاده‌سازیِ پیش‌فرض روی
// همون apiClientِ مشترکی ساخته می‌شه که SyncProvider از useSync().api
// می‌ده (Bearer + refreshِ single-flight) — پس wiringِ جدا لازم نیست. برای
// تست یا جایگزینی، TradeOnlineApiProvider مقدارِ دیگه‌ای تزریق می‌کنه.
import { createContext, useContext, useMemo } from "react";
import { useSync } from "@/sync/SyncProvider";
import { makeTradeOnlineApi, type TradeOnlineApi } from "./client";

export * from "./client";

const TradeOnlineApiContext = createContext<TradeOnlineApi | null>(null);
export const TradeOnlineApiProvider = TradeOnlineApiContext.Provider;

export function useTradeOnlineApi(): TradeOnlineApi {
  const injected = useContext(TradeOnlineApiContext);
  const { api, loggedIn } = useSync();
  // loggedIn در deps تا بعد از ورود/خروج `available` تازه بشه
  return useMemo(() => injected ?? makeTradeOnlineApi(api), [injected, api, loggedIn]);
}

