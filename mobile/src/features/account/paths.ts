/** مسیرهای فیچرِ حساب — AccountRoutes زیرِ `/account/*` در App.tsx سوار می‌شه */
export const accountRoutePaths = {
  hub: "/account",
  plans: "/account/plans",
  plan: (key: string) => `/account/plans/${encodeURIComponent(key)}`,
  payment: (checkoutId: string) => `/account/payment/${encodeURIComponent(checkoutId)}`,
  support: "/account/support",
  supportNew: "/account/support/new",
  ticket: (id: string) => `/account/support/${encodeURIComponent(id)}`,
  notices: "/account/notices",
} as const;
