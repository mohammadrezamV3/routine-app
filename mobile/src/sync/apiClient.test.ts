import { describe, expect, it } from "vitest";
import { ApiClient, ApiError, AuthEvent } from "./apiClient";
import { memoryKV } from "./kv";
import { TokenStore } from "./tokenStore";
import { authSuccess, json, loggedInClient, mockFetch } from "./testUtils";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe("apiClient — single-flight refresh", () => {
  it("دو درخواستِ هم‌زمان با 401 → دقیقا یک refresh، و هر دو با توکنِ تازه تکرار می‌شن", async () => {
    let refreshes = 0;
    const { api, calls, tokens } = await loggedInClient(async (c) => {
      if (c.path === "/api/mobile/auth/refresh") {
        refreshes++;
        expect(c.body).toEqual({ refreshToken: "refresh-1" });
        await tick(20); // refresh کُند — درخواستِ دوم باید منتظر همین بمونه
        return json(200, authSuccess(2));
      }
      if (c.auth === "Bearer access-1") return json(401, { error: "unauthorized" });
      if (c.auth === "Bearer access-2") return json(200, { ok: c.path });
      return json(500, {});
    });

    const [a, b] = await Promise.all([
      api.authed<{ ok: string }>("GET", "/api/mobile/sync/pull"),
      api.authed<{ ok: string }>("POST", "/api/mobile/sync/push", { changes: [] }),
    ]);
    expect(a.ok).toBe("/api/mobile/sync/pull");
    expect(b.ok).toBe("/api/mobile/sync/push");
    expect(refreshes).toBe(1);
    expect(calls.filter((c) => c.path === "/api/mobile/auth/refresh")).toHaveLength(1);
    expect(tokens.getRefreshToken()).toBe("refresh-2");
  });

  it("401ِ دیررس بعد از refreshِ تموم‌شده، refreshِ دوم (با توکنِ قدیمی) نمی‌زنه", async () => {
    let refreshes = 0;
    let releaseSlow!: () => void;
    const slow = new Promise<void>((r) => (releaseSlow = r));
    const { api } = await loggedInClient(async (c) => {
      if (c.path === "/api/mobile/auth/refresh") {
        refreshes++;
        return json(200, authSuccess(1 + refreshes));
      }
      if (c.path === "/slow" && c.auth === "Bearer access-1") {
        await slow; // بعد از اتمامِ refresh با 401 برمی‌گرده
        return json(401, {});
      }
      if (c.auth === "Bearer access-1") return json(401, {});
      return json(200, { ok: true });
    });
    const slowReq = api.authed("GET", "/slow");
    await api.authed("GET", "/fast"); // refresh انجام می‌شه
    releaseSlow();
    await slowReq;
    expect(refreshes).toBe(1);
  });

  it("بدونِ accessToken (شروعِ اپ) درخواست‌های هم‌زمان فقط یک refresh می‌زنن", async () => {
    let refreshes = 0;
    const { api } = await loggedInClient(
      async (c) => {
        if (c.path === "/api/mobile/auth/refresh") {
          refreshes++;
          await tick(5);
          return json(200, authSuccess(2));
        }
        return c.auth === "Bearer access-2" ? json(200, {}) : json(401, {});
      },
      { withAccess: false }
    );
    await Promise.all([api.authed("GET", "/a"), api.authed("GET", "/b"), api.authed("GET", "/c")]);
    expect(refreshes).toBe(1);
  });

  it("refresh با 401 → خروجِ محلی + رویدادِ expired، بدونِ تلاشِ دوباره", async () => {
    const { api, tokens, kv, calls } = await loggedInClient(async (c) => {
      if (c.path === "/api/mobile/auth/refresh") return json(401, { error: "نشست منقضی شده" });
      return json(401, {});
    });
    const events: AuthEvent[] = [];
    api.onAuthEvent((e) => events.push(e));
    const results = await Promise.allSettled([api.authed("GET", "/a"), api.authed("GET", "/b")]);
    for (const r of results) {
      expect(r.status).toBe("rejected");
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(ApiError);
      expect(((r as PromiseRejectedResult).reason as ApiError).kind).toBe("session_expired");
    }
    expect(calls.filter((c) => c.path === "/api/mobile/auth/refresh")).toHaveLength(1);
    expect(tokens.isLoggedIn()).toBe(false);
    expect(kv.data.has("arion.sync.refreshToken")).toBe(false);
    expect(events).toEqual([{ type: "expired" }]);
  });

  it("خطای شبکه در refresh خروج نمی‌زنه", async () => {
    const { api, tokens } = await loggedInClient(
      async (c) => {
        if (c.path === "/api/mobile/auth/refresh") throw new TypeError("Failed to fetch");
        return json(200, {});
      },
      { withAccess: false }
    );
    await expect(api.authed("GET", "/a")).rejects.toMatchObject({ kind: "network" });
    expect(tokens.isLoggedIn()).toBe(true);
  });

  it("timeout با AbortController", async () => {
    const tokens = new TokenStore(memoryKV());
    await tokens.setSession(authSuccess(1));
    const api = new ApiClient({
      baseUrl: "https://api.test",
      tokens,
      timeoutMs: 20,
      fetch: (_u, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    });
    await expect(api.authed("GET", "/x")).rejects.toMatchObject({ kind: "timeout" });
  });
});

describe("apiClient — login", () => {
  it("2FA → بدونِ ذخیره‌ی توکن؛ verify-2fa → نشست ذخیره می‌شه", async () => {
    const kv = memoryKV();
    const tokens = new TokenStore(kv);
    const { fetchImpl, calls } = mockFetch((c) => {
      if (c.path === "/api/mobile/auth/login") return json(200, { requires2fa: true, phoneHint: "0912***45" });
      if (c.path === "/api/mobile/auth/verify-2fa") return json(200, authSuccess(7));
      return json(404, {});
    });
    const api = new ApiClient({ baseUrl: "https://api.test/", tokens, fetch: fetchImpl });
    const r = await api.login({ identifier: "u", password: "p", deviceName: "x" });
    expect(r).toEqual({ requires2fa: true, phoneHint: "0912***45" });
    expect(tokens.isLoggedIn()).toBe(false);
    await api.verify2fa({ identifier: "u", code: "123456" });
    expect(tokens.getRefreshToken()).toBe("refresh-7");
    expect(tokens.getAccessToken()).toBe("access-7");
    expect(kv.data.get("arion.sync.refreshToken")).toBe("refresh-7");
    expect(kv.data.has("access-7")).toBe(false);
    expect([...kv.data.values()].some((v) => v.includes("access-7"))).toBe(false); // accessToken فقط در حافظه
    expect(calls.every((c) => c.auth === null)).toBe(true);
  });

  it("401 و 429 به ApiError با status تبدیل می‌شن", async () => {
    const tokens = new TokenStore(memoryKV());
    let n = 0;
    const { fetchImpl } = mockFetch(() => (n++ === 0 ? json(401, { error: "اطلاعات ورود نادرست است" }) : json(429, { error: "زیاد" })));
    const api = new ApiClient({ baseUrl: "https://api.test", tokens, fetch: fetchImpl });
    await expect(api.login({ identifier: "a", password: "b" })).rejects.toMatchObject({ status: 401, kind: "http" });
    await expect(api.login({ identifier: "a", password: "b" })).rejects.toMatchObject({ status: 429 });
  });

  it("logout: refreshToken به سرور می‌ره و نشستِ محلی پاک می‌شه حتی اگه سرور در دسترس نباشه", async () => {
    const { api, tokens, calls } = await loggedInClient(() => {
      throw new TypeError("offline");
    });
    await api.logout();
    expect(calls[0]).toMatchObject({ path: "/api/mobile/auth/logout", body: { refreshToken: "refresh-1" } });
    expect(tokens.isLoggedIn()).toBe(false);
  });
});
