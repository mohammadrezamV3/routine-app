// اینترفیسِ تزریق‌پذیرِ API برای فیچرِ «حساب» (خرید پلن، پشتیبانی، اطلاعیه‌ها)
// — همون الگوی features/roadmaps/api.ts. صفحه‌ها فقط به AccountApi وابسته‌اند.
//
// wiring (لید، داخلِ SyncProvider):
//   const accountApi = useMemo(() => createAccountApi(
//     async (method, path, body) => {
//       const res = await api.authedRaw(method, path, body);
//       return { status: res.status, body: await ApiClient.readJson(res) };
//     },
//     { refreshAccount: async () => { await api.me(); } },   // /api/mobile/me → به‌روزرسانیِ کاربر
//   ), [api]);
//   <AccountApiProvider value={accountApi}>…</AccountApiProvider>
//
// مقدارِ پیش‌فرضِ context عمدا throw می‌کنه تا فراموشیِ wiring بی‌صدا رد نشه.
import { createContext, useContext } from "react";
import type {
  MobileBillingDuration,
  MobileBillingPlansResponse,
  MobileCheckoutResponse,
  MobileCheckoutStatusResponse,
  MobileDiscountPreviewResponse,
  MobileNoticesResponse,
  MobileTicketCreateResponse,
  MobileTicketDetailResponse,
  MobileTicketReplyResponse,
  MobileTicketsResponse,
} from "@m/lib/account-contract";

/** خطای API ِ حساب — status صفر یعنی شبکه/آفلاین. message همون متنِ فارسیِ سرور (اگه بود). */
export class AccountApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AccountApiError";
    this.status = status;
  }
}

export type AccountApi = {
  listPlans(): Promise<MobileBillingPlansResponse>;
  previewDiscount(planKey: string, code: string): Promise<MobileDiscountPreviewResponse>;
  createCheckout(planKey: string, duration: MobileBillingDuration, discountCode?: string): Promise<MobileCheckoutResponse>;
  checkoutStatus(checkoutId: string): Promise<MobileCheckoutStatusResponse>;
  /** GET /api/mobile/me و به‌روزرسانیِ کاربرِ محلی (ماژول‌ها/پلن) — بعد از خریدِ موفق */
  refreshAccount(): Promise<void>;

  listTickets(): Promise<MobileTicketsResponse>;
  createTicket(subject: string, message: string): Promise<MobileTicketCreateResponse>;
  getTicket(id: string): Promise<MobileTicketDetailResponse>;
  replyTicket(id: string, message: string): Promise<MobileTicketReplyResponse>;

  listNotices(): Promise<MobileNoticesResponse>;
  markNoticesRead(input: { ids?: string[]; all?: boolean }): Promise<MobileNoticesResponse>;
};

export type AccountRequest = (method: "GET" | "POST", path: string, body?: unknown) => Promise<{ status: number; body: any }>;

/** پیاده‌سازیِ AccountApi روی هر تابعِ درخواستِ Bearer‌دار (مثلا ApiClient.authedRaw) */
export function createAccountApi(request: AccountRequest, hooks: { refreshAccount: () => Promise<void> }): AccountApi {
  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    let res: { status: number; body: any };
    try {
      res = await request(method, path, body);
    } catch (err) {
      if (err instanceof AccountApiError) throw err;
      const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 0;
      const msg = (err as { serverMessage?: unknown })?.serverMessage;
      throw new AccountApiError(status, typeof msg === "string" ? msg : "");
    }
    if (res.status < 200 || res.status >= 300) {
      throw new AccountApiError(res.status, typeof res.body?.error === "string" ? res.body.error : "");
    }
    return res.body as T;
  }
  const enc = encodeURIComponent;
  return {
    listPlans: () => call("GET", "/api/mobile/billing/plans"),
    previewDiscount: (planKey, code) => call("POST", "/api/mobile/billing/discount", { planKey, code }),
    createCheckout: (planKey, duration, discountCode) =>
      call("POST", "/api/mobile/billing/checkout", { planKey, duration, ...(discountCode ? { discountCode } : {}) }),
    checkoutStatus: (id) => call("GET", `/api/mobile/billing/status/${enc(id)}`),
    refreshAccount: () => hooks.refreshAccount(),
    listTickets: () => call("GET", "/api/mobile/support/tickets"),
    createTicket: (subject, message) => call("POST", "/api/mobile/support/tickets", { subject, message }),
    getTicket: (id) => call("GET", `/api/mobile/support/tickets/${enc(id)}`),
    replyTicket: (id, message) => call("POST", `/api/mobile/support/tickets/${enc(id)}/messages`, { message }),
    listNotices: () => call("GET", "/api/mobile/notices"),
    markNoticesRead: (input) => call("POST", "/api/mobile/notices/read", input),
  };
}

const notWired = new Proxy({} as AccountApi, {
  get() {
    return async () => {
      throw new AccountApiError(0, "AccountApi وصل نشده — لایه‌ی apiClient باید Provider واقعی بده");
    };
  },
});

export const AccountApiContext = createContext<AccountApi>(notWired);
export const AccountApiProvider = AccountApiContext.Provider;

export function useAccountApi(): AccountApi {
  return useContext(AccountApiContext);
}

/** پیامِ فارسیِ قابلِ نمایش برای هر خطا */
export function describeAccountError(err: unknown): string {
  if (err instanceof AccountApiError) {
    if (err.status === 0) return "اتصال به اینترنت برقرار نیست — دوباره امتحان کن";
    if (err.status === 401) return "نشستت منقضی شده — دوباره وارد شو";
    if (err.status === 429) return err.message || "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن";
    if (err.status === 404) return "پیدا نشد";
    // ۵۰۲/۵۰۳ پیامِ مشخص دارن (مثلا «درگاه هنوز راه‌اندازی نشده»)؛ ۵۰۰ عمومیه
    if (err.status >= 500) return err.status !== 500 && err.message ? err.message : "خطای سرور — کمی بعد دوباره امتحان کن";
    if (err.message) return err.message;
  }
  return "مشکلی پیش آمد — دوباره امتحان کن";
}
