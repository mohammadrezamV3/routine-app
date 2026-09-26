import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

// پلِ Bearer روی روت‌های وب (lib/requestAuth.ts): اپ موبایل همون روت‌های وب رو
// با `Authorization: Bearer` صدا می‌زنه. روی دیتابیسِ واقعی بررسی می‌شه که
// Bearer روی هر سه نگهبان (مستقیم، requireModule، requireSuperAdmin) کار
// می‌کنه، روت‌های ادمین Bearer رو قبول نمی‌کنن، نشستِ باطل/کاربرِ مسدود ۴۰۱
// می‌گیره، Bearer هیچ‌وقت به کوکی fallback نمی‌کنه، و مسیرِ کوکی دست‌نخورده‌ست.
const ctx = vi.hoisted(() => ({
  cookieUser: null as null | { id: string; isSuperAdmin?: boolean },
  headers: new Headers(),
}));
vi.hoisted(() => {
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});
vi.mock("next-auth", async (orig) => ({
  ...(await orig<typeof import("next-auth")>()),
  getServerSession: async () => (ctx.cookieUser ? { user: { ...ctx.cookieUser } } : null),
}));
// زمینه‌ی درخواستِ Next: route handlerها بدونِ آرگومان getRequestUser() رو صدا
// می‌زنن و هدر از next/headers خونده می‌شه.
vi.mock("next/headers", async (orig) => ({
  ...(await orig<typeof import("next/headers")>()),
  headers: () => ctx.headers,
}));

import { GET as dailyKeys } from "@/app/api/tasks/daily/keys/route";
import { GET as listSessions } from "@/app/api/account/sessions/route";
import { GET as tradeTags } from "@/app/api/trade/tags/route";
import { GET as roadmaps } from "@/app/api/roadmaps/route";
import { GET as adminOverview } from "@/app/api/admin/overview/route";
import { prisma } from "@/lib/prisma";
import { issueAccessToken, MOBILE_PROVIDER } from "@/lib/mobileAuth";
import { getRequestUser } from "@/lib/requestAuth";

const createdUsers: string[] = [];

async function makeUser(data: Record<string, unknown> = {}) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: { username: `brg_${tag}`.slice(0, 20), passwordHash: "x", market: "IRAN", ...data },
  });
  createdUsers.push(user.id);
  return user;
}

async function mobileToken(userId: string) {
  const row = await prisma.session.create({
    data: {
      userId,
      sessionToken: crypto.randomBytes(32).toString("hex"),
      provider: MOBILE_PROVIDER,
      expiresAt: new Date(Date.now() + 86400_000),
    },
  });
  return { sessionId: row.id, token: await issueAccessToken(userId, row.id) };
}

function useBearer(token: string | null) {
  ctx.headers = new Headers(token ? { authorization: `Bearer ${token}` } : {});
}

const get = (path: string) => new NextRequest(`http://localhost${path}`, { headers: ctx.headers });

beforeEach(() => {
  ctx.cookieUser = null;
  useBearer(null);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

describe("getRequestUser", () => {
  it("resolves a Bearer user with flags read from the DB, not the token", async () => {
    const u = await makeUser({ isSuperAdmin: true, name: "Bridge" });
    const { token, sessionId } = await mobileToken(u.id);
    useBearer(token);
    const r = await getRequestUser();
    expect(r).toMatchObject({ userId: u.id, isSuperAdmin: true, isAdmin: true, name: "Bridge", via: "bearer", mobileSessionId: sessionId });
  });

  it("reads the header from an explicit req too", async () => {
    const u = await makeUser();
    const { token } = await mobileToken(u.id);
    const r = await getRequestUser(new Request("http://localhost/x", { headers: { authorization: `Bearer ${token}` } }));
    expect(r?.userId).toBe(u.id);
  });

  it("never falls back to the cookie session when a Bearer header is present", async () => {
    const u = await makeUser();
    ctx.cookieUser = { id: u.id };
    useBearer("garbage");
    expect(await getRequestUser()).toBeNull();
    const res = await dailyKeys();
    expect(res.status).toBe(401);
  });
});

describe("Bearer on web routes", () => {
  it("direct route (/api/tasks/daily/keys) works with Bearer", async () => {
    const u = await makeUser();
    useBearer((await mobileToken(u.id)).token);
    const res = await dailyKeys();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ keys: [] });
  });

  it("/api/account/sessions marks the mobile session as current", async () => {
    const u = await makeUser();
    const { token, sessionId } = await mobileToken(u.id);
    useBearer(token);
    const res = await listSessions(get("/api/account/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions.find((s: any) => s.id === sessionId)?.current).toBe(true);
  });

  it("requireModule (/api/trade/tags): 403 without access, 200 with an active module row", async () => {
    const u = await makeUser();
    useBearer((await mobileToken(u.id)).token);
    expect((await tradeTags()).status).toBe(403);
    await prisma.moduleAccess.create({ data: { userId: u.id, module: "TRADE", active: true } });
    expect((await tradeTags()).status).toBe(200);
  });

  it("requireSuperAdmin (/api/roadmaps): isSuperAdmin comes from the DB", async () => {
    const plain = await makeUser();
    useBearer((await mobileToken(plain.id)).token);
    expect((await roadmaps()).status).toBe(403);
    const sa = await makeUser({ isSuperAdmin: true });
    useBearer((await mobileToken(sa.id)).token);
    expect((await roadmaps()).status).toBe(200);
  });

  it("admin routes reject Bearer (even for a super admin)", async () => {
    const sa = await makeUser({ isSuperAdmin: true });
    useBearer((await mobileToken(sa.id)).token);
    const res = await adminOverview(get("/api/admin/overview"));
    expect(res.status).toBe(401);
  });

  it("revoked session → 401", async () => {
    const u = await makeUser();
    const { token, sessionId } = await mobileToken(u.id);
    await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    useBearer(token);
    expect((await dailyKeys()).status).toBe(401);
    expect((await tradeTags()).status).toBe(401);
  });

  it("blocked or deleted user → 401", async () => {
    const u = await makeUser({ isSuperAdmin: true });
    const { token } = await mobileToken(u.id);
    useBearer(token);
    await prisma.user.update({ where: { id: u.id }, data: { isBlocked: true } });
    expect((await dailyKeys()).status).toBe(401);
    expect((await roadmaps()).status).toBe(401);
    await prisma.user.update({ where: { id: u.id }, data: { isBlocked: false, deletedAt: new Date() } });
    expect((await tradeTags()).status).toBe(401);
  });

  it("a web-cookie access token is not accepted as Bearer", async () => {
    const { encode } = await import("next-auth/jwt");
    const u = await makeUser();
    const webJwt = await encode({ token: { userId: u.id, sub: u.id }, secret: process.env.NEXTAUTH_SECRET! });
    useBearer(webJwt);
    expect((await dailyKeys()).status).toBe(401);
  });
});

describe("cookie path unchanged", () => {
  it("no Authorization header → getServerSession as before", async () => {
    const u = await makeUser();
    ctx.cookieUser = { id: u.id };
    expect((await dailyKeys()).status).toBe(200);
    const r = await getRequestUser();
    expect(r).toMatchObject({ userId: u.id, via: "cookie", isSuperAdmin: false });
    ctx.cookieUser = { id: u.id, isSuperAdmin: true };
    expect((await roadmaps()).status).toBe(200);
    ctx.cookieUser = null;
    expect((await dailyKeys()).status).toBe(401);
  });
});
