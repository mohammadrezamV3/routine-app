// فیچرِ «حساب»: خرید پلن (دست‌به‌دست به وب)، تیکتِ پشتیبانی، اطلاعیه‌ها.
// App.tsx:   <Route path="/account/*" element={<AccountRoutes />} />
// Provider:  <AccountApiProvider value={createAccountApi(...)}> — نگاه کن به api.ts
export { AccountRoutes } from "./routes";
export { accountRoutePaths } from "./paths";
export { AccountApiContext, AccountApiProvider, AccountApiError, createAccountApi, useAccountApi, describeAccountError } from "./api";
export type { AccountApi, AccountRequest } from "./api";
export { default as NoticesBell } from "./components/NoticesBell";
export { default as PaymentDeepLinkListener } from "./components/PaymentDeepLinkListener";
export { default as AccountHub } from "./screens/AccountHub";
export { useNotices, refreshNotices } from "./useNotices";
export { openCheckoutUrl, onReturnFromCheckout, isPaymentResultUrl, PAYMENT_RESULT_SCHEME_URL } from "./browser";
