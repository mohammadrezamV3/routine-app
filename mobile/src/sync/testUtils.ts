// کمکی‌های مشترکِ تست‌های سینک (فقط در vitest import می‌شه)
import type { MobileAuthSuccess, MobileUser } from "@/lib/api-contract";
import { ApiClient } from "./apiClient";
import { memoryKV } from "./kv";
import { TokenStore } from "./tokenStore";

export const TEST_USER: MobileUser = { id: "u1", name: "تست", market: "IRAN", modules: ["ROUTINE", "SLEEP", "TASKS"], username: null, phoneMasked: null, moduleAccess: [], plan: null };

export function authSuccess(n: number): MobileAuthSuccess {
  return {
    accessToken: `access-${n}`,
    accessTokenExpiresIn: 900,
    refreshToken: `refresh-${n}`,
    refreshTokenExpiresAt: "2026-12-01T00:00:00.000Z",
    user: TEST_USER,
  };
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export type Call = { method: string; path: string; auth: string | null; body: any };
export type Handler = (call: Call) => Response | Promise<Response>;

/** fetchِ ساختگی که هر درخواست رو ثبت و به handler می‌سپاره */
export function mockFetch(handler: Handler) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Call = {
      method: init?.method ?? "GET",
      path: u.pathname + u.search,
      auth: headers.Authorization ?? null,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return handler(call);
  };
  return { fetchImpl, calls };
}

/** کلاینتی که از قبل وارد شده (refresh-1 ذخیره‌شده، accessToken در حافظه) */
export async function loggedInClient(handler: Handler, opts: { withAccess?: boolean } = {}) {
  const kv = memoryKV();
  const tokens = new TokenStore(kv);
  await tokens.setSession(authSuccess(1));
  if (opts.withAccess === false) tokens.invalidateAccessToken();
  const { fetchImpl, calls } = mockFetch(handler);
  const api = new ApiClient({ baseUrl: "https://api.test", tokens, fetch: fetchImpl });
  return { kv, tokens, api, calls };
}
