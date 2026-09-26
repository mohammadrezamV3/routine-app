import { Route, Routes } from "react-router-dom";
import FriendsScreen from "./screens/FriendsScreen";
import FriendProfileScreen from "./screens/FriendProfileScreen";
import ChatRoomsScreen from "./screens/ChatRoomsScreen";
import ChatRoomScreen from "./screens/ChatRoomScreen";
import WeeklyReportScreen from "./screens/WeeklyReportScreen";

/** مسیرها نسبی به `/social/*` در App.tsx (مسیرهای مطلق: ./paths.ts). */
export function SocialRoutes() {
  return (
    <Routes>
      <Route index element={<FriendsScreen />} />
      <Route path="users/:id" element={<FriendProfileScreen />} />
      <Route path="chat" element={<ChatRoomsScreen />} />
      <Route path="chat/:symbol" element={<ChatRoomScreen />} />
      <Route path="weekly" element={<WeeklyReportScreen />} />
    </Routes>
  );
}
