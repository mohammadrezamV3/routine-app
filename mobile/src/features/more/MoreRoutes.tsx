import { Routes, Route } from "react-router-dom";
import MoreSettings from "./MoreSettings";
import MoreAccount from "./MoreAccount";
import MoreAbout from "./MoreAbout";
import MoreRoadmaps from "./MoreRoadmaps";

export const moreRoutePaths = {
  settings: "/more/settings",
  account: "/more/account",
  about: "/more/about",
  roadmaps: "/more/roadmaps",
} as const;

export function MoreRoutes() {
  return (
    <Routes>
      <Route path="settings" element={<MoreSettings />} />
      <Route path="account" element={<MoreAccount />} />
      <Route path="about" element={<MoreAbout />} />
      <Route path="roadmaps" element={<MoreRoadmaps />} />
    </Routes>
  );
}
