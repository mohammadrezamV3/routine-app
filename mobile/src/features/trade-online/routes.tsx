import { Routes, Route, Navigate } from "react-router-dom";
import EconomicCalendar from "./screens/EconomicCalendar";
import Watchlist from "./screens/Watchlist";
import MetaTraderList from "./screens/MetaTraderList";
import MetaTraderAccount from "./screens/MetaTraderAccount";

/**
 * باید زیرِ `"/trade/online/*"` سوار بشه (Routesِ داخلی نسبی‌ان) — در App.tsx
 * یا داخلِ TradeRoutes به‌صورتِ `<Route path="online/*" element={<TradeOnlineRoutes />} />`.
 * مسیرهای مطلق: ./paths.ts
 */
export function TradeOnlineRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="calendar" replace />} />
      <Route path="calendar" element={<EconomicCalendar />} />
      <Route path="market" element={<Watchlist />} />
      <Route path="metatrader" element={<MetaTraderList />} />
      <Route path="metatrader/:accountId" element={<MetaTraderAccount />} />
    </Routes>
  );
}

export default TradeOnlineRoutes;
