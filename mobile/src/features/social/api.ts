// اینترفیسِ تزریق‌پذیرِ API اجتماعی (دوستان، چتِ نماد، گزارش هفتگی) — همون
// الگوی features/roadmaps/api.ts. صفحه‌ها فقط به SocialApi وابسته‌اند؛ لید
// Provider واقعی رو با `createSocialApi(apiClient)` روی apiClientِ مشترک
// (Bearer + refresh) سوار می‌کنه. پیش‌فرضِ context عمدا throw می‌کنه تا
// فراموشیِ wiring بی‌صدا رد نشه.
import { createContext, useContext } from "react";
import {
  SOCIAL_ENDPOINTS,
  type SocialBlockBody,
  type SocialChatReportBody,
  type SocialChatResponse,
  type SocialChatRoomsResponse,
  type SocialChatSendResponse,
  type SocialFriendsResponse,
  type SocialOkResponse,
  type SocialProfileResponse,
  type SocialRequestsResponse,
  type SocialSearchResponse,
  type SocialSendRequestBody,
  type SocialSendRequestResponse,
  type SocialStarResponse,
  type SocialStatsModule,
  type SocialWeeklyReportResponse,
} from "@/lib/social-contract";

/**
 * خطای API اجتماعی — status + بدنه‌ی error خامِ سرور (برای 403 ماژول
 * `module_locked`، برای 409 چت `rules_not_accepted`، وگرنه متنِ فارسی).
 * status=0 یعنی شبکه/تایم‌اوت (آفلاین).
 */
export class SocialApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "SocialApiError";
    this.status = status;
    this.code = code;
  }
}

export type ChatQuery = { symbol: string; since?: string; before?: string; limit?: number };

export type SocialApi = {
  friends(module: SocialStatsModule): Promise<SocialFriendsResponse>;
  requests(): Promise<SocialRequestsResponse>;
  search(q: string): Promise<SocialSearchResponse>;
  sendRequest(body: SocialSendRequestBody): Promise<SocialSendRequestResponse>;
  accept(friendshipId: string): Promise<SocialOkResponse>;
  /** رد/لغو/حذفِ دوست */
  remove(friendshipId: string): Promise<SocialOkResponse>;
  favorite(friendshipId: string, favorite: boolean): Promise<SocialOkResponse>;
  profile(userId: string): Promise<SocialProfileResponse>;
  star(userId: string, starred: boolean): Promise<SocialStarResponse>;
  block(userId: string, blocked: boolean): Promise<SocialOkResponse>;

  chatRooms(): Promise<SocialChatRoomsResponse>;
  chat(q: ChatQuery): Promise<SocialChatResponse>;
  sendChat(symbol: string, body: string): Promise<SocialChatSendResponse>;
  deleteChat(id: string): Promise<SocialOkResponse>;
  reportChat(body: SocialChatReportBody): Promise<SocialOkResponse>;
  ackWarning(): Promise<SocialOkResponse>;
  acceptRules(): Promise<SocialOkResponse>;

  weeklyReport(offset: number): Promise<SocialWeeklyReportResponse>;
  refreshWeeklyReport(offset: number): Promise<SocialWeeklyReportResponse>;
};

/** حداقلِ چیزی که از apiClientِ مشترک لازمه (ApiClient.authedRaw) */
export type SocialTransport = {
  authedRaw(method: "GET" | "POST", path: string, body?: unknown, opts?: { timeoutMs?: number }): Promise<Response>;
};

function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}

/**
 * پیاده‌سازیِ واقعی روی apiClient. خطای شبکه/تایم‌اوت → SocialApiError(0)،
 * پاسخِ غیرِ ok → SocialApiError(status, error). (خطای session_expired خودِ
 * apiClient رو دست‌نخورده بالا می‌فرسته تا لایه‌ی auth هندلش کنه.)
 */
export function createSocialApi(t: SocialTransport): SocialApi {
  async function call<T>(method: "GET" | "POST", path: string, body?: unknown, timeoutMs?: number): Promise<T> {
    let res: Response;
    try {
      res = await t.authedRaw(method, path, method === "POST" ? body ?? {} : undefined, timeoutMs ? { timeoutMs } : undefined);
    } catch (err: any) {
      if (err?.kind === "network" || err?.kind === "timeout") throw new SocialApiError(0, "offline");
      throw err;
    }
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* بدنه‌ی خالی */
    }
    if (!res.ok) throw new SocialApiError(res.status, typeof data?.error === "string" ? data.error : `http_${res.status}`);
    return data as T;
  }
  const E = SOCIAL_ENDPOINTS;
  return {
    friends: (module) => call("GET", E.friends + qs({ module })),
    requests: () => call("GET", E.requests),
    search: (q) => call("GET", E.search + qs({ q })),
    sendRequest: (body) => call("POST", E.sendRequest, body),
    accept: (friendshipId) => call("POST", E.accept, { friendshipId }),
    remove: (friendshipId) => call("POST", E.remove, { friendshipId }),
    favorite: (friendshipId, favorite) => call("POST", E.favorite, { friendshipId, favorite }),
    profile: (userId) => call("GET", E.profile(userId)),
    star: (userId, starred) => call("POST", E.star(userId), { starred }),
    block: (userId, blocked) => call("POST", E.block(userId), { blocked } satisfies SocialBlockBody),

    chatRooms: () => call("GET", E.chatRooms),
    chat: (q) => call("GET", E.chat + qs({ symbol: q.symbol, since: q.since, before: q.before, limit: q.limit })),
    sendChat: (symbol, body) => call("POST", E.chat, { symbol, body }),
    deleteChat: (id) => call("POST", E.chatDelete, { id }),
    reportChat: (body) => call("POST", E.chatReport, body),
    ackWarning: () => call("POST", E.chatAckWarning),
    acceptRules: () => call("POST", E.chatAcceptRules),

    // ساختِ گزارش ممکنه AI صدا بزنه — تایم‌اوتِ بلندتر
    weeklyReport: (offset) => call("GET", E.weeklyReport + qs({ offset }), undefined, 70_000),
    refreshWeeklyReport: (offset) => call("POST", E.weeklyReportRefresh, { offset }, 70_000),
  };
}

const notWiredError = () => new Error("offline: SocialApi وصل نشده — لایه‌ی apiClient باید Provider واقعی بده");
const notWired = new Proxy({} as SocialApi, {
  get: () => async () => {
    throw notWiredError();
  },
});

export const SocialApiContext = createContext<SocialApi>(notWired);

export function useSocialApi(): SocialApi {
  return useContext(SocialApiContext);
}

export const SocialApiProvider = SocialApiContext.Provider;
