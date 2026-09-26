import { Routes, Route } from "react-router-dom";
import AccountHub from "./screens/AccountHub";
import PlansScreen from "./screens/PlansScreen";
import PlanCheckoutScreen from "./screens/PlanCheckoutScreen";
import PaymentResultScreen from "./screens/PaymentResultScreen";
import SupportList from "./screens/SupportList";
import SupportNew from "./screens/SupportNew";
import SupportThread from "./screens/SupportThread";
import NoticesScreen from "./screens/NoticesScreen";

/** زیرِ `/account/*` در App.tsx سوار می‌شه (همون الگوی RoadmapRoutes/MoreRoutes) */
export function AccountRoutes() {
  return (
    <Routes>
      <Route index element={<AccountHub />} />
      <Route path="plans" element={<PlansScreen />} />
      <Route path="plans/:key" element={<PlanCheckoutScreen />} />
      <Route path="payment/:checkoutId" element={<PaymentResultScreen />} />
      <Route path="support" element={<SupportList />} />
      <Route path="support/new" element={<SupportNew />} />
      <Route path="support/:id" element={<SupportThread />} />
      <Route path="notices" element={<NoticesScreen />} />
    </Routes>
  );
}
