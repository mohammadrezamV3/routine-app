import { Routes, Route } from "react-router-dom";
import TradeHub from "./screens/TradeHub";
import AccountDetail from "./screens/AccountDetail";
import Checklists from "./screens/Checklists";
import Calendar from "./screens/Calendar";
import Clock from "./screens/Clock";
import Notes from "./screens/Notes";

// مسیرهای مطلق در ./paths.ts (جدا، تا صفحه‌ها چرخه‌ی import نسازن)
export { tradeRoutePaths } from "./paths";

/** باید زیرِ یک مسیرِ `"/trade/*"` مونت شود (Routes داخلی‌اش نسبی‌ست). */
export default function TradeRoutes() {
  return (
    <Routes>
      <Route index element={<TradeHub />} />
      <Route path="accounts/:id" element={<AccountDetail />} />
      <Route path="checklists" element={<Checklists />} />
      <Route path="calendar" element={<Calendar />} />
      <Route path="clock" element={<Clock />} />
      <Route path="notes" element={<Notes />} />
    </Routes>
  );
}

export { TradeRoutes };
