// بخش‌های «آنلاینِ» ترید: تقویمِ اقتصادی، قیمتِ بازار/واچ‌لیست، اتصالِ متاتریدر.
// wiring برای لید:
//   • App.tsx: <Route path="/trade/online/*" element={<TradeOnlineRoutes />} />
//     (یا داخلِ TradeRoutes: path="online/*")
//   • TradeHub: <TradeOnlineEntryCards /> به‌جای کارتِ ComingSoon
//   • API: خودکار روی useSync().api — Provider لازم نیست (TradeOnlineApiProvider فقط برای تست/جایگزینی)
//   • خروج/پاک‌کردنِ داده: "arion-trade-online" (TRADE_ONLINE_DB_NAME) رو به LOCAL_DB_NAMES
//     در sync/localData.ts اضافه کن تا کش هم پاک بشه.
export { TradeOnlineRoutes } from "./routes";
export { tradeOnlineRoutePaths } from "./paths";
export { default as TradeOnlineEntryCards, TradeOnlineEntryCard, TRADE_ONLINE_ENTRIES } from "./components/TradeOnlineEntryCards";
export { TradeOnlineApiProvider, makeTradeOnlineApi, useTradeOnlineApi, type TradeOnlineApi } from "./api";
export { TRADE_ONLINE_DB_NAME, clearTradeOnlineCache } from "./db";
