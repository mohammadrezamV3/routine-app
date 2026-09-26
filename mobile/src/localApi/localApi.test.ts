// هسته‌ی localApi: رهگیریِ fetch، گاردها، فوروارد (Bearer/refresh/بدنه‌ی دست‌نخورده/
// آفلاین)، کشِ SWR، NA، سدِ سینک، و shimِ پیش‌ورودِ /api/auth/2fa/start.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiClient, ApiError } from "@m/sync/apiClient";
import { memoryKV } from "@m/sync/kv";
import { TokenStore } from "@m/sync/tokenStore";
import { SyncEngine } from "@m/sync/syncEngine";
import { authSuccess, TEST_USER } from "@m/sync/testUtils";
import { setAuthBridge, takePreLogin } from "@m/shims/authBridge";
import { configureLocalApi } from "./services";
import { dispatch } from "./dispatch";
import { installLocalApi, sameOriginApiUrl } from "./install";
import { clearHttpCache, httpCacheDb } from "./cache";
import { isClassifiedPath } from "./router";
import { cachedAccount, clearAccountSnapshot, isSuperAdminCached } from "./accountState";

const ORIGIN = "https://localhost";

type Seen = { url: string; method: string; headers: Record<string, string>; body: unknown; credentials?: string };

function server(handler: (s: Seen) => Response | Promise<Response>) {
  const seen: Seen[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const s: Seen = {
      url,
      method: init?.method ?? "GET",
      headers: { ...((init?.headers as Record<string, string>) ?? {}) },
      body: init?.body,
      credentials: init?.credentials,
    };
    seen.push(s);
    return handler(s);
  };
  return { seen, fetchImpl };
}

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function setup(handler: (s: Seen) => Response | Promise<Response>, opts: { loggedIn?: boolean; engine?: Partial<SyncEngine>; syncEnabled?: boolean } = {}) {
  const kv = memoryKV();
  const tokens = new TokenStore(kv);
  if (opts.loggedIn !== false) await tokens.setSession(authSuccess(1));
  const { seen, fetchImpl } = server(handler);
  const api = new ApiClient({ baseUrl: "https://api.test", tokens, fetch: fetchImpl });
  const engine = (opts.engine as SyncEngine) ?? new SyncEngine(api, kv, []);
  configureLocalApi({ tokens, api, engine, syncEnabled: opts.syncEnabled ?? false });
  return { tokens, api, seen };
}

const call = (path: string, init?: RequestInit) => dispatch(path, init, new URL(path, ORIGIN));

beforeEach(async () => {
  await clearHttpCache();
  clearAccountSnapshot();
});
afterEach(() => configureLocalApi(null));

describe("interception", () => {
  const loc = { href: ORIGIN + "/weekly", origin: ORIGIN };

  it("same-origin /api/ as string, URL and Request; everything else passes through", () => {
    expect(sameOriginApiUrl("/api/tasks/daily?date=2026-09-01", loc)?.pathname).toBe("/api/tasks/daily");
    expect(sameOriginApiUrl(ORIGIN + "/api/account", loc)?.pathname).toBe("/api/account");
    expect(sameOriginApiUrl(new URL(ORIGIN + "/api/plans"), loc)?.pathname).toBe("/api/plans");
    expect(sameOriginApiUrl(new Request(ORIGIN + "/api/friends"), loc)?.pathname).toBe("/api/friends");
    expect(sameOriginApiUrl("https://api.test/api/mobile/sync/pull", loc)).toBeNull();
    expect(sameOriginApiUrl("/images/logo.png", loc)).toBeNull();
    expect(sameOriginApiUrl("/apiary", loc)).toBeNull();
  });

  it("installLocalApi patches window.fetch once and routes only /api/", async () => {
    await setup(() => ok({ never: true }));
    const nativeCalls: string[] = [];
    const g = globalThis as any;
    const prevWindow = g.window;
    g.window = {
      location: loc,
      fetch: async (input: RequestInfo | URL) => {
        nativeCalls.push(String(input instanceof Request ? input.url : input));
        return ok({ native: true });
      },
    };
    try {
      installLocalApi();
      installLocalApi();
      const keys = await (await g.window.fetch("/api/tasks/daily/keys")).json();
      expect(keys).toEqual({ keys: expect.any(Array) });
      const other = await (await g.window.fetch("https://cdn.example/x.js")).json();
      expect(other).toEqual({ native: true });
      expect(nativeCalls).toEqual(["https://cdn.example/x.js"]);
    } finally {
      g.window = prevWindow;
    }
  });
});

describe("guards", () => {
  it("401 {error:'unauthorized'} without a session, before any network", async () => {
    const { seen } = await setup(() => ok({}), { loggedIn: false });
    for (const p of ["/api/tasks/daily/keys", "/api/account", "/api/friends"]) {
      const res = await call(p);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "unauthorized" });
    }
    expect(seen).toEqual([]);
  });

  it("403 for a locked module from the cached /api/account; superadmin cache unlocks", async () => {
    const { tokens } = await setup((s) =>
      s.url.endsWith("/api/account") ? ok({ user: { isSuperAdmin: false, moduleAccess: [{ module: "ROUTINE", active: true, expiresAt: null }] } }) : ok({})
    );
    await tokens.setUser({ ...TEST_USER, modules: ["ROUTINE", "EXERCISE"] });
    // هنوز /api/account نیومده ← ماژول‌های MobileUser (EXERCISE باز)
    expect((await call("/api/exercise/schedule")).status).toBe(200);
    await call("/api/account");
    expect(cachedAccount(TEST_USER.id)?.user?.isSuperAdmin).toBe(false);
    const locked = await call("/api/exercise/schedule");
    expect(locked.status).toBe(403);
    expect(await locked.json()).toEqual({ error: "این بخش نیاز به اشتراک فعال دارد" });
  });

  it("isSuperAdmin comes from the cached account of the same user only", async () => {
    await setup(() => ok({ user: { isSuperAdmin: true, moduleAccess: [] } }));
    await call("/api/account");
    expect(isSuperAdminCached(TEST_USER.id)).toBe(true);
    expect(isSuperAdminCached("someone-else")).toBe(false);
  });
});

describe("ONLINE forward", () => {
  it("adds Bearer, keeps path+query, omits cookies, passes FormData untouched", async () => {
    const { seen } = await setup(() => ok({ ok: true }));
    const fd = new FormData();
    fd.append("file", new Blob(["abc"], { type: "audio/webm" }), "v.webm");
    const res = await call("/api/support/tickets/voice?x=1", { method: "POST", body: fd, headers: { Cookie: "a=b" } });
    expect(res.status).toBe(200);
    expect(seen[0].url).toBe("https://api.test/api/support/tickets/voice?x=1");
    expect(seen[0].headers.Authorization).toBe("Bearer access-1");
    expect(seen[0].headers.cookie).toBeUndefined();
    expect(seen[0].headers["content-type"]).toBeUndefined();
    expect(seen[0].body).toBe(fd);
    expect(seen[0].credentials).toBe("omit");
  });

  it("public routes go without any token", async () => {
    const { seen } = await setup(() => ok({ ok: true }), { loggedIn: false });
    const res = await call("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(res.status).toBe(200);
    expect(seen[0].headers.Authorization).toBeUndefined();
    expect(seen[0].headers["content-type"]).toBe("application/json");
  });

  it("offline → 503 with the Persian message", async () => {
    await setup(() => {
      throw new TypeError("Failed to fetch");
    });
    const res = await call("/api/friends");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "اتصال اینترنت برقرار نیست" });
  });

  it("session 401 → single refresh → retry once", async () => {
    let n = 0;
    const { seen } = await setup((s) => {
      if (s.url.endsWith("/api/mobile/auth/refresh")) return ok(authSuccess(2));
      n++;
      return n === 1 ? ok({ error: "unauthorized" }, 401) : ok({ friends: [] });
    });
    const res = await call("/api/friends");
    expect(await res.json()).toEqual({ friends: [] });
    expect(seen.map((s) => s.headers.Authorization ?? "refresh")).toEqual(["Bearer access-1", "refresh", "Bearer access-2"]);
  });

  it("a route's own 401 (wrong current password) is returned as-is — no refresh, no logout", async () => {
    const { seen, tokens } = await setup(() => ok({ error: "رمز عبور فعلی اشتباه است" }, 401));
    const res = await call("/api/account/password", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "رمز عبور فعلی اشتباه است" });
    expect(seen).toHaveLength(1);
    expect(tokens.isLoggedIn()).toBe(true);
  });

  it("revoked session (refresh 401) → 401 unauthorized and local logout", async () => {
    const { tokens } = await setup((s) => (s.url.endsWith("/refresh") ? ok({ error: "x" }, 401) : ok({ error: "unauthorized" }, 401)));
    const res = await call("/api/friends");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(tokens.isLoggedIn()).toBe(false);
  });

  it("unclassified paths are forwarded ONLINE", async () => {
    const { seen } = await setup(() => ok({ ok: 1 }));
    expect(isClassifiedPath("/api/definitely/unknown")).toBe(false);
    expect((await call("/api/definitely/unknown")).status).toBe(200);
    expect(seen[0].url).toBe("https://api.test/api/definitely/unknown");
  });

  it("NA routes never touch the network", async () => {
    const { seen } = await setup(() => ok({}));
    expect((await call("/api/bootstrap?from=a&to=b")).status).toBe(404);
    expect(seen).toEqual([]);
  });
});

describe("CACHED (stale-while-revalidate)", () => {
  it("miss → forward+store; offline → cached copy; mutation invalidates the resource", async () => {
    let online = true;
    let version = 1;
    const { seen } = await setup((s) => {
      if (!online) throw new TypeError("offline");
      if (s.method === "PATCH") return ok({ ok: true });
      return ok({ user: { name: `v${version}` } });
    });
    expect(await (await call("/api/account")).json()).toEqual({ user: { name: "v1" } });
    online = false;
    const hit = await call("/api/account");
    expect(hit.headers.get("X-Arion-Cache")).toBe("hit");
    expect(await hit.json()).toEqual({ user: { name: "v1" } });
    // آفلاین و بدونِ کش ← 503
    expect((await call("/api/plans")).status).toBe(503);
    online = true;
    version = 2;
    expect((await call("/api/account/avatar", { method: "PATCH", body: "{}" })).status).toBe(200);
    expect(await httpCacheDb.responses.count()).toBe(0);
    expect(await (await call("/api/account")).json()).toEqual({ user: { name: "v2" } });
    expect(seen.filter((s) => s.method === "GET")).toHaveLength(3);
  });

  it("rows of another user are never served", async () => {
    await setup(() => ok({ user: { name: "me" } }));
    await call("/api/account");
    const row = (await httpCacheDb.responses.get("/api/account"))!;
    await httpCacheDb.responses.put({ ...row, userId: "other", body: JSON.stringify({ user: { name: "other" } }) });
    await setup(() => {
      throw new TypeError("offline");
    });
    expect((await call("/api/account")).status).toBe(503);
  });
});

describe("sync barrier", () => {
  it("routine/assistant POST: sync (push) → forward → sync (pull)", async () => {
    const order: string[] = [];
    const engine = { sync: async () => void order.push("sync") } as unknown as SyncEngine;
    await setup(
      () => {
        order.push("forward");
        return ok({ changed: true });
      },
      { engine, syncEnabled: true }
    );
    await call("/api/routine/assistant", { method: "POST", body: "{}" });
    expect(order).toEqual(["sync", "forward", "sync"]);
    order.length = 0;
    await call("/api/routine/assistant");
    expect(order).toEqual(["forward"]);
  });

  it("no pull after a failed request", async () => {
    const order: string[] = [];
    const engine = { sync: async () => void order.push("sync") } as unknown as SyncEngine;
    await setup(() => ok({ error: "x" }, 429), { engine, syncEnabled: true });
    await call("/api/routine/assistant", { method: "POST", body: "{}" });
    expect(order).toEqual(["sync"]);
  });
});

describe("/api/auth/2fa/start shim", () => {
  const post = (b: unknown) => call("/api/auth/2fa/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  const bridge = (login: (i: string, p: string) => Promise<any>) =>
    setAuthBridge({ ready: true, session: null, login, verify2fa: async () => undefined, logout: async () => undefined, navigate: () => undefined });

  beforeEach(async () => {
    await setup(() => ok({}), { loggedIn: false });
  });

  it("2FA account → {required:true, phoneHint}", async () => {
    bridge(async () => ({ status: "2fa", phoneHint: "4567" }));
    expect(await (await post({ identifier: "u", password: "p" })).json()).toEqual({ required: true, phoneHint: "4567" });
  });

  it("success → {required:false}; signIn consumes the same attempt exactly once", async () => {
    let logins = 0;
    bridge(async () => {
      logins++;
      return { status: "ok" };
    });
    expect(await (await post({ identifier: " u ", password: "p" })).json()).toEqual({ required: false });
    expect(takePreLogin("u", "wrong")).toBeNull();
    expect(logins).toBe(1);
  });

  it("wrong password → {required:false} (no enumeration) and the error is kept for signIn", async () => {
    bridge(async () => {
      throw new ApiError("http", 401, "x");
    });
    expect(await (await post({ identifier: "u", password: "p" })).json()).toEqual({ required: false });
    const pre = takePreLogin("u", "p");
    expect(pre && !pre.ok && pre.error instanceof ApiError).toBe(true);
    expect(takePreLogin("u", "p")).toBeNull();
  });

  it("rate limited → 429 like the web route", async () => {
    bridge(async () => {
      throw new ApiError("http", 429, "زیاد");
    });
    const res = await post({ identifier: "u", password: "p" });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "زیاد" });
  });

  it("missing fields → {required:false} without logging in", async () => {
    let logins = 0;
    bridge(async () => {
      logins++;
      return { status: "ok" };
    });
    expect(await (await post({ identifier: "", password: "" })).json()).toEqual({ required: false });
    expect(logins).toBe(0);
  });
});
