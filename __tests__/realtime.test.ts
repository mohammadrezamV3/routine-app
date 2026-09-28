import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import http from "node:http";
import { EventEmitter } from "node:events";
import type { AddressInfo } from "node:net";

// لایه‌ی realtime (WebSocketِ `/ws`):
//  • بخشِ خالص (lib/realtimeProtocol.ts): ساختِ payload و سقفِ ۸KB، تمیزکاریِ
//    رویداد، Origin/کوکی، و «به کسِ دیگه نرسه» (selectRecipients).
//  • lib/realtime.ts: withLiveSync فقط روی پاسخِ ۲xx و با userIdِ واقعیِ JWT
//    pg_notify می‌زنه (Prisma ماک).
//  • lib/realtimeServer.ts: سرورِ واقعیِ http + کلاینتِ واقعیِ ws؛ فقط pg و
//    Prisma ماک‌ان — رد شدنِ بی‌کوکی/Originِ بد/کاربرِ مسدود، و fan-out.

const SECRET = "test-secret-for-realtime-0123456789";
process.env.NEXTAUTH_SECRET = SECRET;
process.env.NEXTAUTH_URL = "https://arionapp.ir";
process.env.DATABASE_URL = "postgresql://u:p@127.0.0.1:5432/db?schema=public&connection_limit=5";

// ── ماک‌ها ────────────────────────────────────────────────────────────
const executeRaw = vi.fn(async (..._args: unknown[]) => 1);
const users = new Map<string, { isBlocked: boolean; deletedAt: Date | null }>();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => executeRaw(...args),
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
    },
  },
}));
const liveSessions = new Set<string>();
vi.mock("@/lib/deviceSessions", () => ({
  isSessionLive: async (sid: string) => liveSessions.has(sid),
}));

// کلاینتِ جعلیِ pg: LISTEN رو ثبت می‌کنه و تست خودش `notification` می‌فرسته
const fakePg: { clients: FakeClient[] } = { clients: [] };
class FakeClient extends EventEmitter {
  queries: string[] = [];
  opts: any;
  constructor(opts: any) { super(); this.opts = opts; fakePg.clients.push(this); }
  async connect() {}
  async query(q: string) { this.queries.push(q); return { rows: [] }; }
  async end() {}
}
vi.mock("pg", () => ({ Client: FakeClient, default: { Client: FakeClient } }));

// ── بخشِ خالص ─────────────────────────────────────────────────────────
describe("realtimeProtocol — payload", () => {
  it("payload فقط متادیتا دارد و فیلدهای ناشناخته/محتوای بلند حذف می‌شوند", async () => {
    const { buildNotifyPayloads } = await import("@/lib/realtimeProtocol");
    const [p] = buildNotifyPayloads(["u1"], {
      type: "mentor.message",
      data: { mentorshipId: "m1", body: "x".repeat(500) } as any,
      text: "secret message",
    } as any);
    const obj = JSON.parse(p);
    expect(obj).toEqual({ u: ["u1"], e: { type: "mentor.message", data: { mentorshipId: "m1" } } });
    expect(p).not.toContain("secret");
  });

  it("نوعِ ناشناخته یا بدونِ گیرنده‌ی معتبر → هیچ NOTIFYی ساخته نمی‌شود", async () => {
    const { buildNotifyPayloads } = await import("@/lib/realtimeProtocol");
    expect(buildNotifyPayloads(["u1"], { type: "evil" } as any)).toEqual([]);
    expect(buildNotifyPayloads(["bad id!", ""], { type: "notification.new" })).toEqual([]);
  });

  it("گیرنده‌های زیاد تکه‌تکه می‌شوند و هیچ payloadی از سقف (زیر ۸۰۰۰ بایت) رد نمی‌شود", async () => {
    const { buildNotifyPayloads, parseNotifyPayload, MAX_NOTIFY_BYTES } = await import("@/lib/realtimeProtocol");
    const ids = Array.from({ length: 1000 }, (_, i) => `c${"k".repeat(40)}${i}`);
    const payloads = buildNotifyPayloads(ids, { type: "data.changed", keys: ["trade", "daily:2026-09-27"] });
    expect(payloads.length).toBeGreaterThan(1);
    const seen: string[] = [];
    for (const p of payloads) {
      expect(Buffer.byteLength(p, "utf8")).toBeLessThanOrEqual(MAX_NOTIFY_BYTES);
      expect(Buffer.byteLength(p, "utf8")).toBeLessThan(8000);
      const parsed = parseNotifyPayload(p)!;
      expect(parsed.event.keys).toEqual(["trade", "daily:2026-09-27"]);
      seen.push(...parsed.userIds);
    }
    expect(seen.sort()).toEqual([...ids].sort()); // هیچ گیرنده‌ای گم/تکرار نشده
  });

  it("کلیدها تمیز، یکتا و محدود می‌شوند", async () => {
    const { sanitizeEvent } = await import("@/lib/realtimeProtocol");
    const e = sanitizeEvent({ type: "data.changed", keys: ["trade", "trade", "<script>", "a b", ...Array(40).fill(0).map((_, i) => `k${i}`)], src: "tab_1" })!;
    expect(e.keys![0]).toBe("trade");
    expect(e.keys).not.toContain("<script>");
    expect(e.keys).not.toContain("a b");
    expect(e.keys!.length).toBeLessThanOrEqual(20);
    expect(e.src).toBe("tab_1");
    expect(sanitizeEvent({ type: "data.changed", src: "bad src!" })!.src).toBeUndefined();
  });

  it("parseNotifyPayload هرچیزِ بدشکل را رد می‌کند", async () => {
    const { parseNotifyPayload } = await import("@/lib/realtimeProtocol");
    expect(parseNotifyPayload("not json")).toBeNull();
    expect(parseNotifyPayload(JSON.stringify({ u: "u1", e: { type: "notification.new" } }))).toBeNull();
    expect(parseNotifyPayload(JSON.stringify({ u: ["u1"], e: { type: "nope" } }))).toBeNull();
    expect(parseNotifyPayload("x".repeat(9000))).toBeNull();
    expect(parseNotifyPayload(JSON.stringify({ u: ["u1"], e: { type: "notification.new" } }))).toEqual({
      userIds: ["u1"],
      event: { type: "notification.new" },
    });
  });

  it("fan-out فقط به سوکت‌های کاربرانِ مقصد می‌رسد", async () => {
    const { selectRecipients } = await import("@/lib/realtimeProtocol");
    const byUser = new Map<string, Set<string>>([
      ["alice", new Set(["a1", "a2"])],
      ["bob", new Set(["b1"])],
      ["carol", new Set(["c1"])],
    ]);
    expect(selectRecipients(byUser, ["alice"]).sort()).toEqual(["a1", "a2"]);
    expect(selectRecipients(byUser, ["bob", "bob", "nobody"])).toEqual(["b1"]);
    expect(selectRecipients(byUser, [])).toEqual([]);
  });
});

describe("realtimeProtocol — Origin، کوکی و مسیر", () => {
  it("Origin: همان host یا hostهای env مجازند؛ بقیه و نبودنش رد", async () => {
    const { isOriginAllowed, allowedOriginHosts } = await import("@/lib/realtimeProtocol");
    const allowed = allowedOriginHosts({ NEXTAUTH_URL: "https://arionapp.ir", NEXT_PUBLIC_SITE_URL: undefined });
    expect(allowed.has("arionapp.ir")).toBe(true);
    expect(allowed.has("www.arionapp.ir")).toBe(true);
    expect(isOriginAllowed("https://arionapp.ir", "127.0.0.1:3000", allowed)).toBe(true);
    expect(isOriginAllowed("https://www.arionapp.ir", "127.0.0.1:3000", allowed)).toBe(true);
    expect(isOriginAllowed("http://localhost:3000", "localhost:3000", allowed)).toBe(true); // همان origin
    expect(isOriginAllowed("https://evil.example", "arionapp.ir", allowed)).toBe(false);
    expect(isOriginAllowed("https://arionapp.ir.evil.example", "arionapp.ir", allowed)).toBe(false);
    expect(isOriginAllowed(undefined, "arionapp.ir", allowed)).toBe(false);
    expect(isOriginAllowed("null", "arionapp.ir", allowed)).toBe(false);
    expect(isOriginAllowed("file:///x", "arionapp.ir", allowed)).toBe(false);
  });

  it("توکنِ نشست، هم کامل هم تکه‌شده (.0/.1)، با هر دو نامِ کوکی پیدا می‌شود", async () => {
    const { parseCookieHeader, pickSessionTokens } = await import("@/lib/realtimeProtocol");
    expect(pickSessionTokens(parseCookieHeader("a=1; next-auth.session-token=abc"))).toEqual(["abc"]);
    expect(pickSessionTokens(parseCookieHeader("__Secure-next-auth.session-token.0=ab; __Secure-next-auth.session-token.1=cd"))).toEqual(["abcd"]);
    expect(pickSessionTokens(parseCookieHeader("other=1"))).toEqual([]);
    expect(pickSessionTokens(parseCookieHeader(undefined))).toEqual([]);
  });

  it("فقط /ws گرفته می‌شود — HMRِ نکست و بقیه دست‌نخورده", async () => {
    const { isRealtimePath } = await import("@/lib/realtimeProtocol");
    expect(isRealtimePath("/ws")).toBe(true);
    expect(isRealtimePath("/ws?x=1")).toBe(true);
    expect(isRealtimePath("/_next/webpack-hmr")).toBe(false);
    expect(isRealtimePath("/wsx")).toBe(false);
    expect(isRealtimePath("/api/ws")).toBe(false);
  });
});

// ── lib/realtime.ts (انتشار) ───────────────────────────────────────────
async function sessionCookie(claims: Record<string, unknown>, secret = SECRET) {
  const { encode } = await import("next-auth/jwt");
  const token = await encode({ token: claims as any, secret });
  return `next-auth.session-token=${token}`;
}

function notifiedPayloads(): { u: string[]; e: any }[] {
  // tagged template: args = [strings, channel, payload]
  return executeRaw.mock.calls.map((c) => JSON.parse(c[2] as string));
}

describe("realtime — انتشار", () => {
  beforeEach(() => executeRaw.mockClear());

  it("pg_notify پارامتری صدا زده می‌شود (نه رشته‌ی چسبانده)", async () => {
    const { publishToUsers } = await import("@/lib/realtime");
    await publishToUsers(["u1", null, "u2"], { type: "notification.new", keys: ["notifications"] });
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const [strings, channel] = executeRaw.mock.calls[0] as [TemplateStringsArray, string, string];
    expect(strings.join("?")).toBe("SELECT pg_notify(?, ?)");
    expect(channel).toBe("arion_rt");
    expect(notifiedPayloads()[0].u).toEqual(["u1", "u2"]);
  });

  it("شکستِ انتشار هیچ‌وقت throw نمی‌کند", async () => {
    const { publishToUser } = await import("@/lib/realtime");
    executeRaw.mockRejectedValueOnce(new Error("db down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(publishToUser("u1", { type: "notification.new" })).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it("withLiveSync: فقط پاسخِ ۲xx، با userIdِ JWT و شناسه‌ی تب", async () => {
    const { withLiveSync } = await import("@/lib/realtime");
    const cookie = await sessionCookie({ userId: "user_a", sid: "s1" });
    const ok = withLiveSync(["trade"], async () => new Response("{}", { status: 200 }));
    const bad = withLiveSync(["trade"], async () => new Response("{}", { status: 400 }));
    const mk = () => new Request("http://x/api/trade/entries", { method: "POST", headers: { cookie, "x-arion-client": "tab42" } });

    expect((await bad(mk())).status).toBe(400);
    await new Promise((r) => setTimeout(r, 30));
    expect(executeRaw).not.toHaveBeenCalled();

    expect((await ok(mk())).status).toBe(200);
    await vi.waitFor(() => expect(executeRaw).toHaveBeenCalledTimes(1));
    expect(notifiedPayloads()[0]).toEqual({ u: ["user_a"], e: { type: "data.changed", keys: ["trade"], src: "tab42" } });
  });

  it("withLiveSync: کلیدِ پویا از params (settings/[key])", async () => {
    const { withLiveSync } = await import("@/lib/realtime");
    const cookie = await sessionCookie({ userId: "user_b" });
    const h = withLiveSync((_req: Request, ctx: { params: { key: string } }) => [ctx.params.key], async () => new Response(null, { status: 204 }));
    await h(new Request("http://x/api/settings/wakeSleepTimes", { method: "POST", headers: { cookie } }), { params: { key: "wakeSleepTimes" } });
    await vi.waitFor(() => expect(executeRaw).toHaveBeenCalledTimes(1));
    expect(notifiedPayloads()[0].e.keys).toEqual(["wakeSleepTimes"]);
  });

  it("کوکیِ امضاشده با رمزِ دیگر هیچ userIdی نمی‌دهد", async () => {
    const { userIdFromCookieHeader } = await import("@/lib/realtime");
    expect(await userIdFromCookieHeader(await sessionCookie({ userId: "x" }, "another-secret-another-secret-00"))).toBeNull();
    expect(await userIdFromCookieHeader(await sessionCookie({ userId: "x" }))).toBe("x");
  });
});

// ── lib/realtimeServer.ts (سرورِ واقعی روی http) ───────────────────────
describe("realtimeServer — upgrade، احراز هویت و fan-out", () => {
  let server: http.Server;
  let port = 0;
  let WS: typeof import("ws").WebSocket;
  const nextUpgrades: string[] = [];

  beforeAll(async () => {
    WS = (await import("ws")).WebSocket;
    const { startRealtimeServer } = await import("@/lib/realtimeServer");
    startRealtimeServer();
    server = http.createServer((_req, res) => res.end("ok"));
    // شبیه‌سازیِ هندلرِ upgradeِ خودِ نکست (HMR) — باید دست‌نخورده برسد
    server.on("upgrade", (req, socket) => {
      nextUpgrades.push(req.url || "");
      socket.destroy();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    port = (server.address() as AddressInfo).port;
    users.set("alice", { isBlocked: false, deletedAt: null });
    users.set("bob", { isBlocked: false, deletedAt: null });
    users.set("blocked", { isBlocked: true, deletedAt: null });
    users.set("deleted", { isBlocked: false, deletedAt: new Date() });
    liveSessions.add("live-sid");
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  function open(opts: { cookie?: string; origin?: string; path?: string }): Promise<{ ws?: InstanceType<typeof WS>; status?: number; messages: any[] }> {
    return new Promise((resolve) => {
      const headers: Record<string, string> = {};
      if (opts.cookie) headers.cookie = opts.cookie;
      const ws = new WS(`ws://127.0.0.1:${port}${opts.path ?? "/ws"}`, { headers, origin: opts.origin ?? "https://arionapp.ir" });
      const messages: any[] = [];
      ws.on("message", (d) => messages.push(JSON.parse(String(d))));
      ws.on("open", () => resolve({ ws, messages }));
      ws.on("unexpected-response", (_req, res) => { resolve({ status: res.statusCode, messages }); ws.terminate(); });
      ws.on("error", () => resolve({ status: -1, messages }));
    });
  }

  function listener(): FakeClient {
    const c = fakePg.clients[fakePg.clients.length - 1];
    expect(c).toBeTruthy();
    return c;
  }

  it("LISTEN روی arion_rt با URLِ بدونِ پارامترهای مخصوصِ Prisma", async () => {
    await vi.waitFor(() => expect(listener().queries).toContain("LISTEN arion_rt"));
    const cs = listener().opts.connectionString as string;
    expect(cs).not.toContain("schema=");
    expect(cs).not.toContain("connection_limit");
  });

  it("بدونِ کوکی → 401", async () => {
    const r = await open({});
    expect(r.status).toBe(401);
  });

  it("Originِ بیگانه → 403 (حتی با کوکیِ معتبر)", async () => {
    const r = await open({ cookie: await sessionCookie({ userId: "alice" }), origin: "https://evil.example" });
    expect(r.status).toBe(403);
  });

  it("کاربرِ مسدود/حذف‌شده یا نشستِ ابطال‌شده → 401", async () => {
    expect((await open({ cookie: await sessionCookie({ userId: "blocked" }) })).status).toBe(401);
    expect((await open({ cookie: await sessionCookie({ userId: "deleted" }) })).status).toBe(401);
    expect((await open({ cookie: await sessionCookie({ userId: "ghost" }) })).status).toBe(401);
    expect((await open({ cookie: await sessionCookie({ userId: "alice", sid: "revoked-sid" }) })).status).toBe(401);
  });

  it("upgradeِ مسیرهای دیگر (HMR) به هندلرِ خودِ سرور می‌رسد", async () => {
    await open({ path: "/_next/webpack-hmr" });
    expect(nextUpgrades).toContain("/_next/webpack-hmr");
  });

  it("رویدادِ NOTIFY فقط به سوکت‌های کاربرِ مقصد (همه‌ی دستگاه‌هایش) می‌رسد", async () => {
    const a1 = await open({ cookie: await sessionCookie({ userId: "alice", sid: "live-sid" }) });
    const a2 = await open({ cookie: await sessionCookie({ userId: "alice" }) });
    const b = await open({ cookie: await sessionCookie({ userId: "bob" }) });
    expect(a1.ws && a2.ws && b.ws).toBeTruthy();
    await vi.waitFor(() => expect(a1.messages[0]?.type).toBe("hello"));

    const { buildNotifyPayloads } = await import("@/lib/realtimeProtocol");
    const [payload] = buildNotifyPayloads(["alice"], { type: "mentor.message", data: { mentorshipId: "m1" } });
    listener().emit("notification", { channel: "arion_rt", payload });
    listener().emit("notification", { channel: "other", payload });
    listener().emit("notification", { channel: "arion_rt", payload: "garbage" });

    await vi.waitFor(() => {
      expect(a1.messages.filter((m) => m.type !== "hello")).toEqual([{ type: "mentor.message", data: { mentorshipId: "m1" } }]);
      expect(a2.messages.filter((m) => m.type !== "hello")).toEqual([{ type: "mentor.message", data: { mentorshipId: "m1" } }]);
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(b.messages.filter((m) => m.type !== "hello")).toEqual([]);
    for (const c of [a1, a2, b]) c.ws?.close();
  });

  it("پیامِ بزرگ‌تر از maxPayload از سمتِ کلاینت اتصال را می‌بندد", async () => {
    const c = await open({ cookie: await sessionCookie({ userId: "bob" }) });
    const closed = new Promise<number>((r) => c.ws!.on("close", (code) => r(code)));
    c.ws!.send("x".repeat(5000));
    expect(await closed).toBe(1009);
  });
});
