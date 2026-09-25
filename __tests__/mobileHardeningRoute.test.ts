import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// integration روی دیتابیسِ واقعی: ابطالِ نشستِ موبایل با تغییرِ رمز، ROADMAP در
// پاسخِ ورود، بودجه‌ی بایتِ pull، صفحه‌بندیِ چک‌لیست‌های ترید، سطلِ مشترکِ 2fa/start.
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.hoisted(() => {
  process.env.TRUST_PROXY_HEADERS = "1";
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});
vi.mock("next-auth", async (orig) => ({
  ...(await orig<typeof import("next-auth")>()),
  getServerSession: async () => (session.userId ? { user: { id: session.userId } } : null),
}));

import { POST as login } from "@/app/api/mobile/auth/login/route";
import { POST as refresh } from "@/app/api/mobile/auth/refresh/route";
import { POST as changePassword } from "@/app/api/account/password/route";
import { POST as resetPassword } from "@/app/api/auth/forgot-password/verify/route";
import { POST as start2fa } from "@/app/api/auth/2fa/start/route";
import { prisma } from "@/lib/prisma";
import { pullChanges } from "@/lib/mobileSyncStore";
import { pullTradeChanges } from "@/lib/mobileTradeSyncStore";
import { PULL_PAGE_LIMIT } from "@/lib/mobileSync";
import type { MobileAuthSuccess } from "@/lib/mobileApiContract";

const PASSWORD = "Correct-Horse-Battery-9";
const createdUsers: string[] = [];

function req(path: string, body: unknown, ip = `10.${rnd()}.${rnd()}.${rnd()}`) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}
const rnd = () => Math.floor(Math.random() * 250);

async function makeUser(data: Record<string, unknown> = {}) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: { username: `hrd_${tag}`.slice(0, 20), passwordHash: await bcrypt.hash(PASSWORD, 4), market: "IRAN", ...data },
  });
  createdUsers.push(user.id);
  return user;
}

async function mobileLogin(username: string): Promise<MobileAuthSuccess> {
  const res = await login(req("/api/mobile/auth/login", { identifier: username, password: PASSWORD, deviceName: "Hardening" }));
  expect(res.status).toBe(200);
  return res.json();
}

afterAll(async () => {
  session.userId = null;
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

describe("password change / reset revokes mobile sessions only", () => {
  it("POST /api/account/password revokes every mobile session, leaves web sessions alone", async () => {
    const u = await makeUser();
    const a = await mobileLogin(u.username!);
    const web = await prisma.session.create({
      data: { userId: u.id, sessionToken: crypto.randomBytes(24).toString("hex"), provider: "credentials", expiresAt: new Date(Date.now() + 86400_000) },
    });
    session.userId = u.id;
    const res = await changePassword(req("/api/account/password", { currentPassword: PASSWORD, newPassword: "Brand-New-Passphrase-77" }));
    session.userId = null;
    expect(res.status).toBe(200);
    expect((await refresh(req("/api/mobile/auth/refresh", { refreshToken: a.refreshToken }))).status).toBe(401);
    const mobile = await prisma.session.findMany({ where: { userId: u.id, provider: "mobile" } });
    expect(mobile.every((s) => s.revokedAt)).toBe(true);
    expect((await prisma.session.findUnique({ where: { id: web.id } }))?.revokedAt).toBeNull();
  });

  it("forgot-password reset revokes mobile sessions", async () => {
    const phone = `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
    const u = await makeUser({ phone });
    const a = await mobileLogin(u.username!);
    const code = "12345";
    await prisma.passwordResetOtp.create({
      data: { userId: u.id, codeHash: crypto.createHash("sha256").update(code).digest("hex"), expiresAt: new Date(Date.now() + 600_000) },
    });
    const res = await resetPassword(req("/api/auth/forgot-password/verify", { identifier: phone, code, newPassword: "Another-Strong-Phrase-42" }));
    expect(res.status).toBe(200);
    expect((await refresh(req("/api/mobile/auth/refresh", { refreshToken: a.refreshToken }))).status).toBe(401);
  });
});

describe("module list sent to the app matches server gating", () => {
  it("ROADMAP is hidden for a non-superadmin even with an active ModuleAccess row", async () => {
    const u = await makeUser();
    await prisma.moduleAccess.createMany({
      data: [
        { userId: u.id, module: "ROADMAP", active: true },
        { userId: u.id, module: "TRADE", active: true },
      ],
    });
    const a = await mobileLogin(u.username!);
    expect(a.user.modules).toContain("TRADE");
    expect(a.user.modules).not.toContain("ROADMAP");
    expect(a.user.moduleAccess.map((m) => m.module)).not.toContain("ROADMAP");
  });

  it("superadmin still sees ROADMAP", async () => {
    const u = await makeUser({ isSuperAdmin: true });
    const a = await mobileLogin(u.username!);
    expect(a.user.modules).toContain("ROADMAP");
  });
});

describe("/api/auth/2fa/start shares the login password-guess bucket", () => {
  it("wrong guesses on 2fa/start count toward the login limit (different IPs)", async () => {
    const u = await makeUser({ twoFactorEnabled: true, phone: `0913${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}` });
    for (let i = 0; i < 8; i++) {
      const r = await start2fa(req("/api/auth/2fa/start", { identifier: u.username, password: "wrong-guess-" + i }));
      expect(await r.json()).toEqual({ required: false });
    }
    // سطلِ «به‌ازای شناسه»ِ ورود پر شده → ورودِ موبایل حتی با رمزِ درست ۴۲۹
    const res = await login(req("/api/mobile/auth/login", { identifier: u.username, password: PASSWORD }));
    expect(res.status).toBe(429);
  });

  it("non-2FA / unknown identifiers do not consume the login bucket", async () => {
    const u = await makeUser();
    for (let i = 0; i < 8; i++) {
      await start2fa(req("/api/auth/2fa/start", { identifier: u.username, password: "whatever-" + i }));
    }
    const res = await login(req("/api/mobile/auth/login", { identifier: u.username, password: PASSWORD }));
    expect(res.status).toBe(200);
  });
});

describe("pull byte budget", () => {
  it("routine pull pages by bytes and returns every row exactly once", async () => {
    const u = await makeUser();
    // ۳۰ روز، هر کدوم ~۲۰KB
    const tasks = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}_${"x".repeat(190)}`, true]));
    for (let d = 1; d <= 30; d++) {
      await prisma.dailyEntry.create({ data: { userId: u.id, date: new Date(Date.UTC(2026, 7, d)), completedItems: tasks } });
    }
    const access = { EXERCISE: false, CALORIE: false, ROADMAP: false };
    const seen: string[] = [];
    let since: Date | null = null;
    let pages = 0;
    for (;;) {
      const r = await pullChanges(u.id, since, access, 100 * 1024);
      pages++;
      expect(JSON.stringify(r.dailyEntries).length).toBeLessThanOrEqual(130 * 1024);
      seen.push(...r.dailyEntries.map((e) => e.date));
      since = new Date(r.cursor);
      if (!r.hasMore) break;
      expect(pages).toBeLessThan(40);
    }
    expect(pages).toBeGreaterThan(3);
    expect(new Set(seen).size).toBe(30);
  });

  it("trade pull pages by bytes too", async () => {
    const u = await makeUser();
    await prisma.moduleAccess.create({ data: { userId: u.id, module: "TRADE", active: true } });
    for (let i = 0; i < 20; i++) {
      await prisma.tradeNote.create({ data: { userId: u.id, title: `n${i}`, content: "y".repeat(10_000) } });
    }
    const ids = new Set<string>();
    let since: Date | null = null;
    let pages = 0;
    for (;;) {
      const r = await pullTradeChanges(u.id, since, 40 * 1024);
      pages++;
      r.notes.forEach((n) => ids.add(n.id));
      since = r.cursor ? new Date(r.cursor) : null;
      if (!r.hasMore) break;
      expect(pages).toBeLessThan(40);
    }
    expect(pages).toBeGreaterThan(3);
    expect(ids.size).toBe(20);
  });
});

describe("trade checklists are paged, not silently capped", () => {
  it(`more than ${PULL_PAGE_LIMIT} changed checklists → hasMore and the rest on the next page`, async () => {
    const u = await makeUser();
    await prisma.moduleAccess.create({ data: { userId: u.id, module: "TRADE", active: true } });
    const base = Date.UTC(2026, 8, 1);
    await prisma.tradeChecklist.createMany({
      data: Array.from({ length: PULL_PAGE_LIMIT + 5 }, (_, i) => ({
        userId: u.id,
        name: `cl${i}`,
        archived: true,
        updatedAt: new Date(base + i * 10),
      })),
    });
    const first = await pullTradeChanges(u.id, null);
    expect(first.hasMore).toBe(true);
    expect(first.checklists.length).toBeLessThanOrEqual(PULL_PAGE_LIMIT);
    const second = await pullTradeChanges(u.id, new Date(first.cursor!));
    const all = new Set([...first.checklists, ...second.checklists].map((c) => c.id));
    expect(all.size).toBe(PULL_PAGE_LIMIT + 5);
    expect(second.hasMore).toBe(false);
  });
});
