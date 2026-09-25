import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// روت‌های /api/mobile/social/* و هسته‌ی مشترکشون با وب — روی یک prismaِ
// درون‌حافظه‌ای (بدون دیتابیس). چیزی که این‌جا مهمه قواعدِ سروره:
// حریم خصوصی (discoverable/sharePhone/بلاک)، IDOR، بن/غیرفعال‌سازی/قوانینِ چت،
// سقف‌های نرخ و گیتِ ماژول.

type Row = Record<string, any>;
const db = vi.hoisted(() => ({
  users: [] as Row[],
  friendships: [] as Row[],
  blocks: [] as Row[],
  stars: [] as Row[],
  messages: [] as Row[],
  reports: [] as Row[],
  settings: [] as Row[],
  modules: new Map<string, Set<string>>(),
  seq: 0,
}));

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((w) => matches(row, w));
    if (k === "AND") return (v as Row[]).every((w) => matches(row, w));
    if (k === "NOT") return !matches(row, v as Row);
    const val = row[k];
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("in" in v) return (v.in as unknown[]).includes(val);
      if ("not" in v) return val !== v.not;
      if ("equals" in v) return String(val).toLowerCase() === String(v.equals).toLowerCase();
      if ("contains" in v) return String(val ?? "").toLowerCase().includes(String(v.contains).toLowerCase());
      if ("gt" in v || "lt" in v) {
        const t = new Date(val).getTime();
        return (v.gt ? t > new Date(v.gt).getTime() : true) && (v.lt ? t < new Date(v.lt).getTime() : true);
      }
      return true;
    }
    return val === v;
  });
}
const id = () => `c${(++db.seq).toString().padStart(24, "0")}`;
const withUser = (m: Row) => ({ ...m, user: db.users.find((u) => u.id === m.userId) });

vi.mock("@/lib/prisma", () => {
  const userMatches = (u: Row, where: Row) => {
    const { NOT, ...rest } = where;
    if (!matches(u, rest)) return false;
    if (NOT) {
      // بلاکِ دوطرفه‌ی جست‌وجو
      const viewer = NOT.OR[0].blockedByUsers.some.blockerId;
      if (db.blocks.some((b) => (b.blockerId === viewer && b.blockedId === u.id) || (b.blockerId === u.id && b.blockedId === viewer))) return false;
    }
    return true;
  };
  const prisma = {
    user: {
      findUnique: vi.fn(async ({ where }: Row) => db.users.find((u) => u.id === where.id) ?? null),
      findFirst: vi.fn(async ({ where }: Row) => db.users.find((u) => matches(u, where)) ?? null),
      findMany: vi.fn(async ({ where, take }: Row) => db.users.filter((u) => userMatches(u, where)).slice(0, take)),
      update: vi.fn(async ({ where, data }: Row) => Object.assign(db.users.find((u) => u.id === where.id)!, data)),
    },
    friendship: {
      findMany: vi.fn(async ({ where }: Row) =>
        db.friendships.filter((f) => matches(f, where)).map((f) => ({
          ...f,
          requester: db.users.find((u) => u.id === f.requesterId),
          addressee: db.users.find((u) => u.id === f.addresseeId),
        }))
      ),
      findFirst: vi.fn(async ({ where }: Row) => db.friendships.find((f) => matches(f, where)) ?? null),
      findUnique: vi.fn(async ({ where }: Row) => db.friendships.find((f) => f.id === where.id) ?? null),
      create: vi.fn(async ({ data }: Row) => { const f = { id: id(), favoritedByRequester: false, favoritedByAddressee: false, ...data }; db.friendships.push(f); return f; }),
      update: vi.fn(async ({ where, data }: Row) => Object.assign(db.friendships.find((f) => f.id === where.id)!, data)),
      delete: vi.fn(async ({ where }: Row) => { db.friendships = db.friendships.filter((f) => f.id !== where.id); return {}; }),
    },
    userBlock: {
      findFirst: vi.fn(async ({ where }: Row) => db.blocks.find((b) => matches(b, where)) ?? null),
      upsert: vi.fn(async ({ create }: Row) => { if (!db.blocks.some((b) => matches(b, create))) db.blocks.push(create); return create; }),
      deleteMany: vi.fn(async ({ where }: Row) => { db.blocks = db.blocks.filter((b) => !matches(b, where)); return { count: 1 }; }),
    },
    friendStar: {
      count: vi.fn(async ({ where }: Row) => db.stars.filter((s) => matches(s, where)).length),
      findUnique: vi.fn(async ({ where }: Row) => db.stars.find((s) => matches(s, where.giverId_receiverId)) ?? null),
      upsert: vi.fn(async ({ create }: Row) => { if (!db.stars.some((s) => matches(s, create))) db.stars.push(create); return create; }),
      deleteMany: vi.fn(async ({ where }: Row) => { db.stars = db.stars.filter((s) => !matches(s, where)); return { count: 1 }; }),
    },
    roadmap: { findMany: vi.fn(async () => []) },
    exercisePlan: { count: vi.fn(async () => 0) },
    subscription: { findFirst: vi.fn(async () => null) },
    tradeChatMessage: {
      findMany: vi.fn(async ({ where, orderBy, take, skip }: Row) => {
        const rows = db.messages.filter((m) => matches(m, where)).sort((a, b) => b.createdAt - a.createdAt);
        void orderBy;
        return rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length)).map(withUser);
      }),
      findUnique: vi.fn(async ({ where }: Row) => db.messages.find((m) => m.id === where.id) ?? null),
      create: vi.fn(async ({ data }: Row) => {
        const m = { id: id(), createdAt: new Date(Date.now() + db.seq), deletedAt: null, ...data };
        db.messages.push(m);
        return withUser(m);
      }),
      update: vi.fn(async ({ where, data }: Row) => Object.assign(db.messages.find((m) => m.id === where.id)!, data)),
      deleteMany: vi.fn(async ({ where }: Row) => { db.messages = db.messages.filter((m) => !matches(m, where)); return {}; }),
    },
    tradeChatReport: {
      findMany: vi.fn(async ({ where }: Row) => db.reports.filter((r) => matches(r, where))),
      upsert: vi.fn(async ({ create }: Row) => { db.reports.push({ status: "OPEN", ...create }); return create; }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    userSetting: {
      findUnique: vi.fn(async ({ where }: Row) => db.settings.find((s) => s.userId === where.userId_key.userId && s.key === where.userId_key.key) ?? null),
      upsert: vi.fn(async ({ where, create, update }: Row) => {
        const ex = db.settings.find((s) => s.userId === where.userId_key.userId && s.key === where.userId_key.key);
        if (ex) Object.assign(ex, update); else db.settings.push(create);
        return create;
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma };
});

// Bearer «uid:<id>» → همون کاربر؛ هر چیز دیگه → ۴۰۱
vi.mock("@/lib/mobileAuth", () => ({
  getMobileUserId: vi.fn(async (req: Request) => {
    const m = /^Bearer uid:(\S+)$/.exec(req.headers.get("authorization") || "");
    return m && db.users.some((u) => u.id === m[1]) ? m[1] : null;
  }),
}));
vi.mock("@/lib/moduleAccess", () => ({
  checkModuleForUser: vi.fn(async (userId: string, module: string) => {
    const u = db.users.find((x) => x.id === userId);
    if (!u) return { ok: false, reason: "blocked" };
    if (u.isSuperAdmin) return { ok: true, isSuperAdmin: true };
    return db.modules.get(userId)?.has(module) ? { ok: true, isSuperAdmin: false } : { ok: false, reason: "locked" };
  }),
}));
vi.mock("@/lib/friendStats", () => ({ routineStatsForUsers: vi.fn(async () => new Map()) }));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));
const weeklyMock = vi.hoisted(() => ({ fail: null as null | Error }));
vi.mock("@/lib/weeklyReport/snapshot", () => ({
  getOrGenerateWeeklyReport: vi.fn(async (_u: string, _tz: string, _s: boolean, offset: number) => {
    if (weeklyMock.fail) throw weeklyMock.fail;
    return { weekStart: "2026-09-19", weekEnd: "2026-09-25", status: offset === 0 ? "COLLECTING" : "READY", overallScore: 70 };
  }),
}));

import { GET as friendsGET } from "@/app/api/mobile/social/friends/route";
import { GET as searchGET } from "@/app/api/mobile/social/friends/search/route";
import { POST as requestPOST } from "@/app/api/mobile/social/friends/request/route";
import { POST as acceptPOST } from "@/app/api/mobile/social/friends/accept/route";
import { POST as removePOST } from "@/app/api/mobile/social/friends/remove/route";
import { POST as favoritePOST } from "@/app/api/mobile/social/friends/favorite/route";
import { GET as profileGET } from "@/app/api/mobile/social/users/[id]/profile/route";
import { POST as starPOST } from "@/app/api/mobile/social/users/[id]/star/route";
import { POST as blockPOST } from "@/app/api/mobile/social/users/[id]/block/route";
import { GET as chatGET, POST as chatPOST } from "@/app/api/mobile/social/chat/route";
import { POST as chatDelete } from "@/app/api/mobile/social/chat/delete/route";
import { POST as chatReport } from "@/app/api/mobile/social/chat/report/route";
import { POST as chatRules } from "@/app/api/mobile/social/chat/rules/route";
import { POST as chatAck } from "@/app/api/mobile/social/chat/ack-warning/route";
import { GET as roomsGET } from "@/app/api/mobile/social/chat/rooms/route";
import { GET as weeklyGET } from "@/app/api/mobile/social/weekly-report/route";
import { prisma } from "@/lib/prisma";

function mkUser(over: Partial<Row> = {}) {
  const u: Row = {
    id: id(), name: null, username: `u${db.seq}`, avatarUrl: null, bannerUrl: null, bio: null, bestStreak: 0,
    phone: "09120000000", sharePhone: false, discoverable: true, isSuperAdmin: false, isBlocked: false, deletedAt: null,
    timezone: "Asia/Tehran", chatBanUntil: null, chatDisabled: false, chatWarnAt: null, chatWarnNote: null, chatWarnSeenAt: null,
    ...over,
  };
  db.users.push(u);
  return u;
}
function req(path: string, opts: { token?: string | null; body?: unknown; method?: string } = {}) {
  const method = opts.method ?? (opts.body === undefined ? "GET" : "POST");
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer uid:${opts.token}` } : {}) },
    body: method === "GET" ? undefined : JSON.stringify(opts.body ?? {}),
  });
}
const params = (userId: string) => ({ params: { id: userId } });
const befriend = (a: Row, b: Row, status = "ACCEPTED") => {
  const f = { id: id(), requesterId: a.id, addresseeId: b.id, status, favoritedByRequester: false, favoritedByAddressee: false, createdAt: new Date() };
  db.friendships.push(f);
  return f;
};

beforeEach(() => {
  db.users = []; db.friendships = []; db.blocks = []; db.stars = []; db.messages = []; db.reports = []; db.settings = [];
  db.modules = new Map();
  weeklyMock.fail = null;
});

describe("auth", () => {
  it("every social route rejects requests without a valid Bearer", async () => {
    expect((await friendsGET(req("/api/mobile/social/friends"))).status).toBe(401);
    expect((await searchGET(req("/api/mobile/social/friends/search?q=ab"))).status).toBe(401);
    expect((await chatGET(req("/api/mobile/social/chat?symbol=EURUSD"))).status).toBe(401);
    expect((await weeklyGET(req("/api/mobile/social/weekly-report"))).status).toBe(401);
    expect((await requestPOST(req("/x", { body: { username: "whoever" } }))).status).toBe(401);
  });
});

describe("friends — privacy", () => {
  it("search hides non-discoverable users and blocks in both directions", async () => {
    const me = mkUser({ username: "viewer" });
    mkUser({ username: "alpha_open" });
    mkUser({ username: "alpha_hidden", discoverable: false });
    const blockedByMe = mkUser({ username: "alpha_blocked" });
    const blocksMe = mkUser({ username: "alpha_blocker" });
    db.blocks.push({ blockerId: me.id, blockedId: blockedByMe.id }, { blockerId: blocksMe.id, blockedId: me.id });

    const res = await searchGET(req("/api/mobile/social/friends/search?q=alpha", { token: me.id }));
    expect(res.status).toBe(200);
    const { users } = await res.json();
    expect(users.map((u: Row) => u.username)).toEqual(["alpha_open"]);
    expect(users[0]).not.toHaveProperty("phone");
    const where = (prisma.user.findMany as any).mock.calls.at(-1)[0].where;
    expect(where.discoverable).toBe(true);
  });

  it("search is rate limited (30/min per user)", async () => {
    const me = mkUser();
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await searchGET(req("/api/mobile/social/friends/search?q=zz", { token: me.id }))).status;
    expect(last).toBe(429);
  });

  it("profile: phone only with sharePhone; non-discoverable only for friends; blocked → 404", async () => {
    const me = mkUser();
    const shy = mkUser({ discoverable: false, sharePhone: true });
    const open = mkUser({ sharePhone: false });

    const openRes = await profileGET(req(`/p`, { token: me.id }), params(open.id));
    expect(openRes.status).toBe(200);
    expect((await openRes.json()).profile.phone).toBeNull();

    expect((await profileGET(req(`/p`, { token: me.id }), params(shy.id))).status).toBe(404);
    befriend(me, shy);
    const shyRes = await profileGET(req(`/p`, { token: me.id }), params(shy.id));
    expect(shyRes.status).toBe(200);
    expect((await shyRes.json()).profile.phone).toBe("09120000000");

    db.blocks.push({ blockerId: shy.id, blockedId: me.id });
    expect((await profileGET(req(`/p`, { token: me.id }), params(shy.id))).status).toBe(404);
    expect((await profileGET(req(`/p`, { token: me.id }), params(me.id))).status).toBe(404);
  });

  it("star requires an accepted friendship", async () => {
    const me = mkUser();
    const other = mkUser();
    expect((await starPOST(req("/s", { token: me.id, body: { starred: true } }), params(other.id))).status).toBe(409);
    befriend(other, me);
    const res = await starPOST(req("/s", { token: me.id, body: { starred: true } }), params(other.id));
    expect(await res.json()).toMatchObject({ ok: true, starred: true, starsCount: 1 });
  });

  it("block removes the user from search and unblock restores", async () => {
    const me = mkUser();
    const other = mkUser({ username: "blockme" });
    expect((await blockPOST(req("/b", { token: me.id, body: {} }), params(other.id))).status).toBe(200);
    let users = (await (await searchGET(req("/s?q=blockme", { token: me.id }))).json()).users;
    expect(users).toHaveLength(0);
    await blockPOST(req("/b", { token: me.id, body: { blocked: false } }), params(other.id));
    users = (await (await searchGET(req("/s?q=blockme", { token: me.id }))).json()).users;
    expect(users).toHaveLength(1);
  });
});

describe("friends — requests & IDOR", () => {
  it("send → accept (addressee only) → favorite → remove", async () => {
    const a = mkUser();
    const b = mkUser({ username: "Target_User" });
    const sent = await requestPOST(req("/r", { token: a.id, body: { username: "target_user" } }));
    expect(sent.status).toBe(200);
    const { friendshipId } = await sent.json();

    expect((await requestPOST(req("/r", { token: a.id, body: { userId: b.id } }))).status).toBe(409);
    expect((await requestPOST(req("/r", { token: a.id, body: { userId: a.id } }))).status).toBe(400);

    // درخواست‌دهنده نمی‌تونه خودش قبول کنه
    expect((await acceptPOST(req("/a", { token: a.id, body: { friendshipId } }))).status).toBe(404);
    expect((await acceptPOST(req("/a", { token: b.id, body: { friendshipId } }))).status).toBe(200);
    expect((await acceptPOST(req("/a", { token: b.id, body: { friendshipId } }))).status).toBe(409);

    const fav = await favoritePOST(req("/f", { token: a.id, body: { friendshipId, favorite: true } }));
    expect(await fav.json()).toEqual({ ok: true, favorite: true });
    expect(db.friendships[0].favoritedByRequester).toBe(true);
    expect(db.friendships[0].favoritedByAddressee).toBe(false);

    const list = await (await friendsGET(req("/api/mobile/social/friends?module=bogus", { token: b.id }))).json();
    expect(list.module).toBe("routine");
    expect(list.friends.map((f: Row) => f.id)).toEqual([a.id]);

    expect((await removePOST(req("/d", { token: b.id, body: { friendshipId } }))).status).toBe(200);
    expect(db.friendships).toHaveLength(0);
  });

  it("a third party cannot accept, favorite or remove someone else's friendship", async () => {
    const a = mkUser();
    const b = mkUser();
    const intruder = mkUser();
    const f = befriend(a, b, "PENDING");
    expect((await acceptPOST(req("/a", { token: intruder.id, body: { friendshipId: f.id } }))).status).toBe(404);
    expect((await removePOST(req("/d", { token: intruder.id, body: { friendshipId: f.id } }))).status).toBe(404);
    expect((await favoritePOST(req("/f", { token: intruder.id, body: { friendshipId: f.id, favorite: true } }))).status).toBe(404);
    expect(db.friendships).toHaveLength(1);
    expect(db.friendships[0].status).toBe("PENDING");
  });
});

describe("symbol chat", () => {
  function trader(over: Partial<Row> = {}) {
    const u = mkUser(over);
    db.modules.set(u.id, new Set(["TRADE"]));
    return u;
  }
  const acceptRules = (u: Row) => chatRules(req("/r", { token: u.id, body: {} }));

  it("is gated by the TRADE module", async () => {
    const u = mkUser();
    const res = await chatGET(req("/api/mobile/social/chat?symbol=EURUSD", { token: u.id }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "module_locked" });
    expect((await roomsGET(req("/rooms", { token: u.id }))).status).toBe(403);
  });

  it("requires accepting the rules before sending, then stores the web setting", async () => {
    const u = trader();
    const res = await chatPOST(req("/c", { token: u.id, body: { symbol: "EURUSD", body: "سلام" } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "rules_not_accepted" });

    await acceptRules(u);
    expect(db.settings).toEqual([{ userId: u.id, key: "tradeChatRulesAccepted", value: true }]);
    const ok = await chatPOST(req("/c", { token: u.id, body: { symbol: "eurusd", body: "سلام" } }));
    expect(ok.status).toBe(201);
    const { message } = await ok.json();
    expect(message).toMatchObject({ symbol: "EURUSD", mine: true });
    expect(message).not.toHaveProperty("phone");

    const rooms = await (await roomsGET(req("/rooms", { token: u.id }))).json();
    expect(rooms.rulesAccepted).toBe(true);
    expect(rooms.rooms.some((r: Row) => r.symbol === "EURUSD")).toBe(true);
  });

  it("rejects unknown symbols and empty bodies", async () => {
    const u = trader();
    await acceptRules(u);
    expect((await chatGET(req("/c?symbol=FAKECOIN", { token: u.id }))).status).toBe(400);
    expect((await chatPOST(req("/c", { token: u.id, body: { symbol: "FAKECOIN", body: "x" } }))).status).toBe(400);
    expect((await chatPOST(req("/c", { token: u.id, body: { symbol: "EURUSD", body: "   " } }))).status).toBe(400);
  });

  it("bans and disabled chat block sending (not reading); warnings are reported until acked", async () => {
    const banned = trader({ chatBanUntil: new Date(Date.now() + 3600_000) });
    const disabled = trader({ chatDisabled: true });
    const warned = trader({ chatWarnAt: new Date(), chatWarnNote: "رعایت کن" });
    for (const u of [banned, disabled, warned]) await acceptRules(u);

    expect((await chatPOST(req("/c", { token: banned.id, body: { symbol: "EURUSD", body: "x" } }))).status).toBe(403);
    expect((await chatPOST(req("/c", { token: disabled.id, body: { symbol: "EURUSD", body: "x" } }))).status).toBe(403);
    const read = await (await chatGET(req("/c?symbol=EURUSD", { token: banned.id }))).json();
    expect(read.moderation).toMatchObject({ canSend: false });
    expect(read.moderation.bannedUntil).toBeTruthy();

    let w = await (await chatGET(req("/c?symbol=EURUSD", { token: warned.id }))).json();
    expect(w.moderation.warning).toMatchObject({ note: "رعایت کن" });
    expect((await chatPOST(req("/c", { token: warned.id, body: { symbol: "EURUSD", body: "ok" } }))).status).toBe(201);
    await chatAck(req("/a", { token: warned.id, body: {} }));
    w = await (await chatGET(req("/c?symbol=EURUSD", { token: warned.id }))).json();
    expect(w.moderation.warning).toBeNull();
  });

  it("super admins bypass bans", async () => {
    const admin = mkUser({ isSuperAdmin: true, chatDisabled: true });
    await acceptRules(admin);
    expect((await chatPOST(req("/c", { token: admin.id, body: { symbol: "EURUSD", body: "x" } }))).status).toBe(201);
  });

  it("send is rate limited at 10/min per user", async () => {
    const u = trader();
    await acceptRules(u);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await chatPOST(req("/c", { token: u.id, body: { symbol: "GBPUSD", body: `m${i}` } }))).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("paginates backwards with before/hasMore and polls with since", async () => {
    const author = mkUser({ name: "نویسنده" });
    const u = trader();
    for (let i = 0; i < 5; i++) {
      db.messages.push({ id: `m${i}`, symbol: "USDJPY", body: `b${i}`, userId: author.id, deletedAt: null, createdAt: new Date(1_700_000_000_000 + i * 1000) });
    }
    const p1 = await (await chatGET(req("/c?symbol=USDJPY&limit=2", { token: u.id }))).json();
    expect(p1.messages.map((m: Row) => m.id)).toEqual(["m3", "m4"]);
    expect(p1.hasMore).toBe(true);
    expect(p1.messages[0]).toMatchObject({ authorName: "نویسنده", mine: false });

    const p2 = await (await chatGET(req(`/c?symbol=USDJPY&limit=10&before=${encodeURIComponent(p1.messages[0].createdAt)}`, { token: u.id }))).json();
    expect(p2.messages.map((m: Row) => m.id)).toEqual(["m0", "m1", "m2"]);
    expect(p2.hasMore).toBe(false);

    const poll = await (await chatGET(req(`/c?symbol=USDJPY&since=${encodeURIComponent(p1.messages[0].createdAt)}`, { token: u.id }))).json();
    expect(poll.messages.map((m: Row) => m.id)).toEqual(["m4"]);
  });

  it("delete: only author (or admin); report: not own message, soft-deletes", async () => {
    const author = trader();
    const other = trader();
    await acceptRules(author);
    const { message } = await (await chatPOST(req("/c", { token: author.id, body: { symbol: "XAUUSD", body: "hi" } }))).json();

    expect((await chatDelete(req("/d", { token: other.id, body: { id: message.id } }))).status).toBe(403);
    expect((await chatReport(req("/r", { token: author.id, body: { messageId: message.id, reason: "SPAM" } }))).status).toBe(400);
    expect((await chatReport(req("/r", { token: other.id, body: { messageId: message.id, reason: "NOPE" } }))).status).toBe(400);
    expect((await chatReport(req("/r", { token: other.id, body: { messageId: message.id, reason: "SPAM" } }))).status).toBe(200);
    expect(db.messages.find((m) => m.id === message.id)!.deletedAt).toBeInstanceOf(Date);
    expect((await chatDelete(req("/d", { token: author.id, body: { id: message.id } }))).status).toBe(404);
  });
});

describe("weekly report", () => {
  it("is gated by AI_INSIGHT and rejects future weeks", async () => {
    const u = mkUser();
    expect((await weeklyGET(req("/w", { token: u.id }))).status).toBe(403);
    db.modules.set(u.id, new Set(["AI_INSIGHT"]));
    expect((await weeklyGET(req("/w?offset=1", { token: u.id }))).status).toBe(400);
    const res = await weeklyGET(req("/w?offset=-2", { token: u.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ offset: -2, report: { status: "READY" } });
  });

  it("maps AI failures to JSON errors instead of throwing", async () => {
    const u = mkUser();
    db.modules.set(u.id, new Set(["AI_INSIGHT"]));
    weeklyMock.fail = Object.assign(new Error("t"), { name: "TimeoutError" });
    const res = await weeklyGET(req("/w", { token: u.id }));
    expect(res.status).toBe(504);
    expect((await res.json()).error).toBeTruthy();
  });
});
