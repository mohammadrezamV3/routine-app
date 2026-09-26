import { Routes, Route } from "react-router-dom";
import FitnessHub from "./screens/FitnessHub";
import PlanCreateScreen from "./screens/PlanCreateScreen";
import CatalogScreen from "./screens/CatalogScreen";
import CalorieHistoryScreen from "./screens/CalorieHistoryScreen";
import AiPlanWizardScreen from "./screens/AiPlanWizardScreen";

// مسیرهای ماژول ورزش/کالری — از بیرون (App.tsx) با
// `<Route path="/exercise/*" element={<FitnessRoutes />} />` سوار می‌شه.
export const fitnessRoutePaths = {
  hub: "/exercise",
  planNew: "/exercise/plan/new",
  planAi: "/exercise/plan/ai",
  catalog: "/exercise/catalog",
  calorieHistory: "/exercise/calorie/history",
} as const;

export function FitnessRoutes() {
  return (
    <Routes>
      <Route index element={<FitnessHub />} />
      <Route path="plan/new" element={<PlanCreateScreen />} />
      <Route path="plan/ai" element={<AiPlanWizardScreen />} />
      <Route path="catalog" element={<CatalogScreen />} />
      <Route path="calorie/history" element={<CalorieHistoryScreen />} />
    </Routes>
  );
}
