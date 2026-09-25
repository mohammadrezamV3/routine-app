/** مسیرهای بخشِ اجتماعی — App.tsx باید `SocialRoutes` را روی `/social/*` سوار کند. */
export const socialRoutePaths = {
  home: "/social",
  profile: (userId: string) => `/social/users/${encodeURIComponent(userId)}`,
  chatRooms: "/social/chat",
  chatRoom: (symbol: string) => `/social/chat/${encodeURIComponent(symbol)}`,
  weekly: "/social/weekly",
} as const;
