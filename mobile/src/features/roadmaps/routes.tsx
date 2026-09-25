import { Routes, Route } from "react-router-dom";
import RoadmapsList from "./screens/RoadmapsList";
import RoadmapNew from "./screens/RoadmapNew";
import RoadmapDetail from "./screens/RoadmapDetail";

/** مسیرها — نسبی به جایی که RoadmapRoutes سوار می‌شه (`/roadmaps/*`
 *  در App.tsx، همون الگوی MoreRoutes). detail یک تابع است چون به id نیاز داره. */
export const roadmapRoutePaths = {
  list: "/roadmaps",
  new: "/roadmaps/new",
  detail: (id: string) => `/roadmaps/${id}`,
} as const;

export function RoadmapRoutes() {
  return (
    <Routes>
      <Route index element={<RoadmapsList />} />
      <Route path="new" element={<RoadmapNew />} />
      <Route path=":id" element={<RoadmapDetail />} />
    </Routes>
  );
}
