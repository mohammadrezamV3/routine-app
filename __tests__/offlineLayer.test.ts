import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OFFLINE_HEADER, REQUEST_ID_HEADER } from "@/lib/offline/types";

// لایه‌ی fetch آفلاین + صف + پخش + هویت، با پایگاه حافظه‌ای و fetch شبیه‌سازی‌شده.

vi.mock("next-auth/react", () => ({ getSession: vi.fn(async () => null) }));

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
let online = true;
let handler: Handler;
const sent: { url: string; method: string; body: string | null; rid: string | null }[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function load() {
  const db = await import("@/lib/offline/db");
  db.__resetOfflineDbForTests();
  const identity = await import("@/lib/offline/identity");
  identity.__resetIdentityForTests("u1");
  const status = await import("@/lib/offline/status");
  status.__resetStatusForTests();
  const layer = await import("@/lib/offline/fetchLayer");
  const sync = await import("@/lib/offline/sync");
  sync.__resetSyncForTests();
  const orig = vi.fn(async (input: any, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input.href;
    sent.push({ url, method: (init.method || "GET").toUpperCase(), body: (init.body as string) ?? null, rid: new Headers(init.headers).get(REQUEST_ID_HEADER) });
    if (!online) throw new TypeError("Failed to fetch");
    return handler(url, init);
  });
  layer.__setRawFetchForTests(orig as any);
  layer.setOfflineBridge({ publishChange: vi.fn(), invalidate: vi.fn(), domainsForMutation: () => ["trade"] });
  await layer.refreshPending(false);
  const f = (input: string, init?: RequestInit) => layer.offlineFetch(orig as any, input, init);
  return { db, identity, status, layer, sync, orig, f };
}

beforeEach(() => {
  online = true;
  sent.length = 0;
  handler = () => json({}, 200);
  vi.stubGlobal("window", { fetch: undefined, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal("location", { origin: "http://t.test", href: "http://t.test/dashboard" });
  vi.stubGlobal("navigator", { get onLine() { return online; } });
});
afterEach(() => { vi.unstubAllGlobals(); });

const post = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("fetch layer — خواندن", () => {
  it("GET موفق ذخیره می‌شود و آفلاین با هدر cache برمی‌گردد؛ 401 هرگز کش نمی‌شود", async () => {
    const { f, db } = await load();
    handler = () => json({ value: 7 });
    expect((await f("/api/settings/theme")).headers.get(OFFLINE_HEADER)).toBeNull();
    await new Promise((r) => setTimeout(r, 5));
    expect((await db.cacheGet("u1", "/api/settings/theme"))?.body).toBe('{"value":7}');
    online = false;
    const r = await f("/api/settings/theme");
    expect(r.headers.get(OFFLINE_HEADER)).toBe("cache");
    expect(await r.json()).toEqual({ value: 7 });

    online = true;
    handler = () => json({ error: "unauthorized" }, 401);
    expect((await f("/api/settings/other")).status).toBe(401);
    await new Promise((r2) => setTimeout(r2, 5));
    expect(await db.cacheGet("u1", "/api/settings/other")).toBeUndefined();
    // 401 روی کش خوب قبلی چیزی ننوشت
    expect((await db.cacheGet("u1", "/api/settings/theme"))?.body).toBe('{"value":7}');
  });

  it("خطای شبکه (نه HTTP) با کش جواب می‌دهد؛ بدون کش خطا می‌اندازد؛ 500 همان 500 است", async () => {
    const { f, status } = await load();
    handler = () => json({ value: 1 });
    await f("/api/settings/a");
    await new Promise((r) => setTimeout(r, 5));
    online = false;
    // navigator.onLine هنوز true، ولی شبکه می‌میرد
    vi.stubGlobal("navigator", { onLine: true });
    expect((await f("/api/settings/a")).headers.get(OFFLINE_HEADER)).toBe("cache");
    expect(status.getOfflineStatus().online).toBe(false);
    await expect(f("/api/settings/never")).rejects.toThrow();
    online = true;
    handler = () => json({ error: "x" }, 500);
    expect((await f("/api/settings/a")).status).toBe(500);
    expect(status.getOfflineStatus().online).toBe(true);
  });

  it("آدرس بدون کش از ترکیب بازه‌ها جواب می‌گیرد", async () => {
    const { f } = await load();
    handler = () => json({ entries: { "2026-10-05": { tasks: { a: true }, wake: null } } });
    await f("/api/tasks/daily/range?from=2026-10-01&to=2026-10-31");
    await new Promise((r) => setTimeout(r, 5));
    online = false;
    const day = await (await f("/api/tasks/daily?date=2026-10-05")).json();
    expect(day.tasks).toEqual({ a: true });
    const sub = await (await f("/api/tasks/daily/range?from=2026-10-04&to=2026-10-06")).json();
    expect(Object.keys(sub.entries)).toEqual(["2026-10-05"]);
  });

  it("غیر /api و بدون کاربر دست‌نخورده می‌ماند", async () => {
    const { f, identity } = await load();
    await f("/other.json");
    identity.__resetIdentityForTests(null);
    online = false;
    await expect(f("/api/settings/a")).rejects.toThrow();
    expect(sent.at(-1)!.url).toBe("/api/settings/a");
  });
});

describe("fetch layer — نوشتن و صف", () => {
  it("آنلاین: با request-id مستقیم می‌رود و کش را هم‌گام می‌کند، صف خالی می‌ماند", async () => {
    const { f, db, layer } = await load();
    handler = () => json({ ok: true });
    const r = await f("/api/tasks/daily", post({ date: "2026-10-24", tasks: { a: true }, wake: null }));
    expect(r.status).toBe(200);
    expect(sent[0].rid).toBeTruthy();
    expect(layer.getPendingCount()).toBe(0);
    expect(JSON.parse((await db.cacheGet("u1", "/api/tasks/daily?date=2026-10-24"))!.body).tasks).toEqual({ a: true });
  });

  it("آفلاین: 202 ساختگی، کش به‌روز، ایتم صف؛ شبکه نمی‌رود", async () => {
    const { f, db, layer, status } = await load();
    handler = () => json({ entries: {} });
    await f("/api/tasks/daily/range?from=2026-10-01&to=2026-10-31");
    await new Promise((r) => setTimeout(r, 5));
    sent.length = 0;
    online = false;
    const r = await f("/api/tasks/daily", post({ date: "2026-10-24", tasks: { a: true }, wake: null }));
    expect(r.status).toBe(202);
    expect(r.headers.get(OFFLINE_HEADER)).toBe("queued");
    expect(await r.json()).toMatchObject({ queued: true, offline: true, ok: true });
    expect(sent).toHaveLength(0);
    expect(layer.getPendingCount()).toBe(1);
    expect(status.getOfflineStatus().pending).toBe(1);
    const items = await db.outboxAll("u1");
    expect(items[0]).toMatchObject({ userId: "u1", method: "POST", url: "/api/tasks/daily", attempts: 0 });
    expect(items[0].headers[REQUEST_ID_HEADER]).toBe(items[0].requestId);
    const range = await (await f("/api/tasks/daily/range?from=2026-10-01&to=2026-10-31")).json();
    expect(range.entries["2026-10-24"].tasks).toEqual({ a: true });
  });

  it("شبکه‌ی شکست‌خورده وسط نوشتن هم صف می‌شود؛ نوشتن غیرمجاز آفلاین سریع شکست می‌خورد", async () => {
    const { f, layer } = await load();
    online = false;
    vi.stubGlobal("navigator", { onLine: true });
    const r = await f("/api/sleep", post({ date: "2026-10-24", sleptAt: "2026-10-23T22:00:00Z", wokeAt: "2026-10-24T06:00:00Z" }));
    expect(r.status).toBe(202);
    expect(layer.getPendingCount()).toBe(1);
    vi.stubGlobal("navigator", { onLine: false });
    await expect(f("/api/trade/accounts", post({ name: "x" }))).rejects.toThrow(TypeError);
    // تنظیماتی که سرور مدیریت می‌کنه صف نمی‌شه
    await expect(f("/api/settings/lang", post({ value: "en" }))).rejects.toThrow(TypeError);
  });

  it("ایجاد با شناسه‌ی موقت و حذف همان قبل از همگام‌سازی: چیزی در صف نمی‌ماند", async () => {
    const { f, layer, db } = await load();
    online = false;
    const r = await f("/api/calorie/log", post({ date: "2026-10-24", customName: "x", customCalories: 10, grams: 5 }));
    const { entry } = await r.json();
    expect(entry.id).toMatch(/^tmp_/);
    expect(layer.getPendingCount()).toBe(1);
    const d = await f(`/api/calorie/log?id=${entry.id}`, { method: "DELETE" });
    expect(d.status).toBe(202);
    expect(layer.getPendingCount()).toBe(0);
    expect(await db.outboxAll("u1")).toHaveLength(0);
  });

  it("ویرایش یک ساخت صف‌شده بدنه‌ی همان ایتم را ادغام می‌کند", async () => {
    const { f, db } = await load();
    online = false;
    const t = await (await f("/api/trade/tags", post({ name: "A" }))).json();
    await f("/api/trade/tags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.tag.id, name: "B", color: "#123456" }) });
    const items = await db.outboxAll("u1");
    expect(items).toHaveLength(1);
    expect(JSON.parse(items[0].body!)).toEqual({ name: "B", color: "#123456" });
  });
});

describe("sync — پخش صف", () => {
  async function queueThree() {
    const ctx = await load();
    online = false;
    await ctx.f("/api/tasks/daily", post({ date: "2026-10-24", tasks: { a: true }, wake: null }));
    const tagRes = await (await ctx.f("/api/trade/tags", post({ name: "T" }))).json();
    await ctx.f("/api/trade/notes", post({ title: "n", tagIds: [tagRes.tag.id] }));
    sent.length = 0;
    return { ...ctx, tmpTag: tagRes.tag.id as string };
  }

  it("به ترتیب FIFO می‌فرستد، شناسه‌ی موقت را در ایتم‌های بعدی و کش به واقعی عوض می‌کند", async () => {
    const { sync, layer, status, db, tmpTag } = await queueThree();
    online = true;
    handler = (url) => {
      if (url === "/api/trade/tags") return json({ ok: true, tag: { id: "REALTAG", name: "T", color: "#3E7BFA" } });
      return json({ ok: true });
    };
    await sync.runSync({ force: true });
    const writes = sent.filter((s) => s.method !== "GET");
    expect(writes.map((w) => w.url)).toEqual(["/api/tasks/daily", "/api/trade/tags", "/api/trade/notes"]);
    expect(JSON.parse(writes[2].body!).tagIds).toEqual(["REALTAG"]);
    expect(layer.getPendingCount()).toBe(0);
    expect(status.getOfflineStatus()).toMatchObject({ pending: 0, syncing: false, lastError: null });
    expect(await db.outboxAll("u1")).toHaveLength(0);
    expect(tmpTag).toMatch(/^tmp_/);
    expect((await layer.getIdMap())[tmpTag]).toBe("REALTAG");
    // هر ایتم با request-id خودش رفت
    expect(new Set(writes.map((w) => w.rid)).size).toBe(3);
  });

  it("5xx: می‌ماند، attempts بالا می‌رود و backoff می‌گیرد؛ دور بعد (force) ادامه می‌دهد", async () => {
    const { sync, layer, db } = await queueThree();
    online = true;
    let fail = true;
    handler = (url) => (fail && url === "/api/trade/tags" ? json({ error: "boom" }, 503) : json({ ok: true, tag: { id: "R" } }));
    await sync.runSync({ force: true });
    expect(layer.getPendingCount()).toBe(2); // اولی رفت، tags و notes مانده
    const left = await db.outboxAll("u1");
    expect(left[0].attempts).toBe(1);
    expect(sync.__backoffUntilForTests()).toBeGreaterThan(Date.now());
    // بدون force در بازه‌ی backoff چیزی نمی‌رود
    sent.length = 0;
    await sync.runSync();
    expect(sent).toHaveLength(0);
    fail = false;
    await sync.runSync({ force: true });
    expect(layer.getPendingCount()).toBe(0);
  });

  it("4xx قطعی: حذف از صف + lastError با پیام سرور + رفرش کش؛ بقیه‌ی صف ادامه می‌یابد", async () => {
    const { sync, status, layer } = await queueThree();
    online = true;
    handler = (url) => (url === "/api/trade/tags" ? json({ error: "duplicate tag" }, 400) : json({ ok: true }));
    await sync.runSync({ force: true });
    expect(layer.getPendingCount()).toBe(0);
    const err = status.getOfflineStatus().lastError!;
    expect(err.message).toBe("duplicate tag");
    expect(err.label).toBeTruthy();
    status.clearOfflineError();
    expect(status.getOfflineStatus().lastError).toBeNull();
  });

  it("401: متوقف می‌شود و صف حفظ می‌شود", async () => {
    const { sync, status, layer } = await queueThree();
    online = true;
    handler = () => json({ error: "unauthorized" }, 401);
    await sync.runSync({ force: true });
    expect(layer.getPendingCount()).toBe(3);
    expect(status.getOfflineStatus().lastError).not.toBeNull();
    expect(sent.filter((s) => s.method !== "GET")).toHaveLength(1);
  });

  it("خطای شبکه در پخش: صف می‌ماند و آفلاین گزارش می‌شود", async () => {
    const { sync, status, layer } = await queueThree();
    online = true;
    handler = () => { throw new TypeError("Failed to fetch"); };
    await sync.runSync({ force: true });
    expect(layer.getPendingCount()).toBe(3);
    expect(status.getOfflineStatus().online).toBe(false);
  });

  it("دو پخش هم‌زمان یکی می‌شوند", async () => {
    const { sync } = await queueThree();
    online = true;
    handler = () => json({ ok: true });
    await Promise.all([sync.runSync({ force: true }), sync.runSync({ force: true })]);
    expect(sent.filter((s) => s.method !== "GET")).toHaveLength(3);
  });

  it("backoffMs نمایی با سقف", async () => {
    const { sync } = await load();
    expect([1, 2, 3, 4].map(sync.backoffMs)).toEqual([2000, 4000, 8000, 16000]);
    expect(sync.backoffMs(40)).toBe(sync.BACKOFF_MAX_MS);
    expect(sync.isRetryableStatus(500)).toBe(true);
    expect(sync.isRetryableStatus(429)).toBe(true);
    expect(sync.isRetryableStatus(422)).toBe(false);
  });
});

describe("هویت", () => {
  it("عوض‌شدن کاربر همه‌ی انبارها را پاک می‌کند؛ همان کاربر نه؛ خروج پاک و فراموش", async () => {
    const { db, identity } = await load();
    await db.cachePut("u1", "/api/settings/a", { body: "{}" });
    await db.outboxPut({ id: "r1", userId: "u1", url: "/api/tasks/daily", method: "POST", headers: {}, body: "{}", requestId: "r1", createdAt: 1, attempts: 0 });
    await db.metaSet("k", 1);
    await identity.setKnownUser("u1");
    expect(await db.cacheGet("u1", "/api/settings/a")).toBeDefined();
    await identity.setKnownUser("u2");
    expect(identity.getKnownUserId()).toBe("u2");
    expect(await db.cacheGet("u1", "/api/settings/a")).toBeUndefined();
    expect(await db.outboxAll("u1")).toHaveLength(0);
    expect(await db.metaGet("k")).toBeUndefined();
    expect(await db.metaGet("userId")).toBe("u2");
    await db.cachePut("u2", "/api/x", { body: "{}" });
    await identity.clearOfflineIdentity();
    expect(identity.getKnownUserId()).toBeNull();
    expect(await db.cacheGet("u2", "/api/x")).toBeUndefined();
  });

  it("کش به تفکیک کاربره: کاربر دیگر داده‌ی قبلی را نمی‌بیند", async () => {
    const { db } = await load();
    await db.cachePut("u1", "/api/settings/a", { body: '{"value":1}' });
    expect(await db.cacheGet("u2", "/api/settings/a")).toBeUndefined();
  });
});

describe("db — سقف کش", () => {
  it("بیش از سقف تعداد: قدیمی‌ترها حذف می‌شوند", async () => {
    const { db } = await load();
    for (let i = 0; i < db.CACHE_MAX_ENTRIES + 30; i++) {
      await db.cachePut("u1", `/api/settings/k${i}`, { body: "{}", storedAt: i + 1 });
    }
    await db.evictIfNeeded();
    expect(await db.cacheGet("u1", "/api/settings/k0")).toBeUndefined();
    expect(await db.cacheGet("u1", `/api/settings/k${db.CACHE_MAX_ENTRIES + 29}`)).toBeDefined();
    expect((await db.cacheByPathPrefix("u1", "/api/settings/")).length).toBeLessThanOrEqual(db.CACHE_MAX_ENTRIES);
  });
});

describe("storage — isLoggedIn آفلاین", () => {
  it("با کاربر شناخته‌شده و قطع شبکه به ذخیره‌ی مهمان برنمی‌گردد", async () => {
    vi.useFakeTimers();
    const identity = await import("@/lib/offline/identity");
    const st = await import("@/lib/storage");
    st.invalidateStorageCache();
    identity.__resetIdentityForTests("u1");
    online = false;
    const apiFetch = vi.fn(async () => json({ value: 42 }));
    vi.stubGlobal("fetch", apiFetch);
    const p = st.getSetting("someKey", 5);
    await vi.advanceTimersByTimeAsync(3100); // انتظار پل نشست
    expect(await p).toBe(42);
    expect(apiFetch).toHaveBeenCalled();

    st.invalidateStorageCache();
    identity.__resetIdentityForTests(null);
    apiFetch.mockClear();
    const p2 = st.getSetting("someKey2", 5);
    await vi.advanceTimersByTimeAsync(3100);
    expect(await p2).toBe(5); // مهمان واقعی (بدون localStorage در تست)
    expect(apiFetch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
