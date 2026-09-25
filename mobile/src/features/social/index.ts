// بخشِ اجتماعی: دوستان، گفت‌وگوی نمادها، گزارش هفتگی.
//
// wiring (کارِ لید، در App.tsx):
//   const SocialRoutes = lazy(() => import("@/features/social").then((m) => ({ default: m.SocialRoutes })));
//   <SocialApiProvider value={createSocialApi(apiClient)}> … <Route path="/social/*" element={<SocialRoutes />} />
//   و در خروج از حساب: clearSocialCache()
export { SocialRoutes } from "./routes";
export { socialRoutePaths } from "./paths";
export { SocialApiContext, SocialApiProvider, SocialApiError, createSocialApi, useSocialApi } from "./api";
export type { SocialApi, SocialTransport, ChatQuery } from "./api";
export { clearSocialCache } from "./db";
export { default as FriendsScreen } from "./screens/FriendsScreen";
export { default as FriendProfileScreen } from "./screens/FriendProfileScreen";
export { default as ChatRoomsScreen } from "./screens/ChatRoomsScreen";
export { default as ChatRoomScreen } from "./screens/ChatRoomScreen";
export { default as WeeklyReportScreen } from "./screens/WeeklyReportScreen";
