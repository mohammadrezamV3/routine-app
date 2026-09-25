import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

// integration روی دیتابیسِ واقعی — هم‌الگوی emailOtpFlow/routineAssistantRoute.
// هر درخواست IPِ تصادفیِ خودش رو داره تا سقفِ ورودِ ۸/۱۰دقیقه‌ی مشترک بینِ
// تست‌ها پر نشه (TRUST_PROXY_HEADERS موقعِ import خونده می‌شه → hoisted).
vi.hoisted(() => {
  process.env.TRUST_PROXY_HEADERS = "1";
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});

import { POST as login } from "@/app/api/mobile/auth/login/route";
import { POST as verify2fa } from "@/app/api/mobile/auth/verify-2fa/route";
import { POST as refresh } from "@/app/api/mobile/auth/refresh/route";
import { POST as logout } from "@/app/api/mobile/auth/logout/route";
import { GET as pull } from "@/app/api/mobile/sync/pull/route";
import { POST as push } from "@/app/api/mobile/sync/push/route";
import { GET as me } from "@/app/api/mobile/me/route";
import { maskPhone } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { revokeDeviceSession } from "@/lib/deviceSessions";
import { issueTwoFactorOtp } from "@/lib/twoFactor";
import type { MobileAuthSuccess, SyncPullResponse, SyncPushResponse } from "@/lib/mobileApiContract";

const PASSWORD = "Correct-Horse-Battery-9";
const createdUsers: string[] = [];

async function makeUser(opts: { twoFactor?: boolean } = {}) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      username: `mob_${tag}`.slice(0, 20),
      phone: opts.twoFactor ? `09${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}` : null,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      market: "IRAN",
      twoFactorEnabled: !!opts.twoFactor,
    },
  });
  createdUsers.push(user.id);
  return user;
}

function jsonReq(path: string, body: unknown, token?: string, method = "POST") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

async function loginAs(identifier: string): Promise<MobileAuthSuccess> {
  const res = await login(jsonReq("/api/mobile/auth/login", { identifier, password: PASSWORD, deviceName: "Pixel Test" }));
  expect(res.status).toBe(200);
  return res.json();
}

async function doPush(token: string, changes: unknown[]): Promise<SyncPushResponse> {
  const res = await push(jsonReq("/api/mobile/sync/push", { changes }, token));
  expect(res.status).toBe(200);
  return res.json();
}

async function doPull(token: string, since?: string): Promise<SyncPullResponse> {
  const q = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await pull(jsonReq(`/api/mobile/sync/pull${q}`, null, token, "GET"));
  expect(res.status).toBe(200);
  return res.json();
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

describe("mobile auth", () => {
  it("logs in, never leaks isSuperAdmin, and registers a visible device session", async () => {
    const u = await makeUser();
    const auth = await loginAs(u.username!);
    expect(auth.user.id).toBe(u.id);
    expect(auth.user).not.toHaveProperty("isSuperAdmin");
    const row = await prisma.session.findFirst({ where: { userId: u.id, provider: "mobile" } });
    expect(row?.deviceName).toBe("Pixel Test");
    // فقط هش ذخیره شده
    expect(row?.sessionToken).not.toBe(auth.refreshToken);
    expect(row?.sessionToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the same generic 401 for unknown user and wrong password", async () => {
    const u = await makeUser();
    const a = await login(jsonReq("/api/mobile/auth/login", { identifier: u.username, password: "wrong-password-1" }));
    const b = await login(jsonReq("/api/mobile/auth/login", { identifier: `nobody_${Date.now()}`, password: "wrong-password-1" }));
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(await a.json()).toEqual(await b.json());
  });

  it("2FA: password step returns requires2fa (no tokens); code step issues tokens", async () => {
    const u = await makeUser({ twoFactor: true });
    const res = await login(jsonReq("/api/mobile/auth/login", { identifier: u.username, password: PASSWORD }));
    const body = await res.json();
    expect(body).toMatchObject({ requires2fa: true });
    expect(body).not.toHaveProperty("accessToken");

    const bad = await verify2fa(jsonReq("/api/mobile/auth/verify-2fa", { identifier: u.username, code: "00000" }));
    expect(bad.status).toBe(401);
    const code = await issueTwoFactorOtp(u.id);
    const ok = await verify2fa(jsonReq("/api/mobile/auth/verify-2fa", { identifier: u.username, code }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).accessToken).toBeTruthy();
  });

  it("rotates refresh tokens: the old one dies after use", async () => {
    const u = await makeUser();
    const auth = await loginAs(u.username!);
    const r1 = await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: auth.refreshToken }));
    expect(r1.status).toBe(200);
    const next: MobileAuthSuccess = await r1.json();
    expect(next.refreshToken).not.toBe(auth.refreshToken);
    // access tokenِ جدید کار می‌کنه
    await doPull(next.accessToken);
    // توکنِ قبلی دیگه قبول نمی‌شه (و طبقِ reuse detection کلِ نشست رو می‌کشه — تستِ بعدی)
    const reuse = await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: auth.refreshToken }));
    expect(reuse.status).toBe(401);
  });

  it("reusing an already-rotated refresh token revokes the whole session", async () => {
    const u = await makeUser();
    const auth = await loginAs(u.username!);
    const r1 = await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: auth.refreshToken }));
    const next: MobileAuthSuccess = await r1.json();
    // مهاجم (یا کپیِ قدیمی) توکنِ مصرف‌شده رو می‌فرسته
    expect((await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: auth.refreshToken }))).status).toBe(401);
    // حالا توکنِ «سالمِ» جدید و access tokenش هم مردن
    expect((await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: next.refreshToken }))).status).toBe(401);
    expect((await pull(jsonReq("/api/mobile/sync/pull", null, next.accessToken, "GET"))).status).toBe(401);
    const row = await prisma.session.findFirst({ where: { userId: u.id, provider: "mobile" } });
    expect(row?.revokedAt).not.toBeNull();
  });

  it("enforces the absolute 180-day lifetime regardless of the sliding window", async () => {
    const u = await makeUser();
    const auth = await loginAs(u.username!);
    await prisma.session.updateMany({
      where: { userId: u.id, provider: "mobile" },
      data: { createdAt: new Date(Date.now() - 181 * 86400_000) },
    });
    expect((await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: auth.refreshToken }))).status).toBe(401);

    // نزدیکِ سقف: انقضای جدید به createdAt + 180 روز بریده می‌شه
    const u2 = await makeUser();
    const a2 = await loginAs(u2.username!);
    const created = new Date(Date.now() - 170 * 86400_000);
    await prisma.session.updateMany({ where: { userId: u2.id, provider: "mobile" }, data: { createdAt: created } });
    const r = await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: a2.refreshToken }));
    expect(r.status).toBe(200);
    const body: MobileAuthSuccess = await r.json();
    expect(new Date(body.refreshTokenExpiresAt).getTime()).toBe(created.getTime() + 180 * 86400_000);
  });

  it("revoking the device from the web sessions UI kills the access token immediately", async () => {
    const u = await makeUser();
    const auth = await loginAs(u.username!);
    await doPull(auth.accessToken);
    const row = await prisma.session.findFirst({ where: { userId: u.id, provider: "mobile" } });
    expect(await revokeDeviceSession(u.id, row!.id)).toBe(true);
    const res = await pull(jsonReq("/api/mobile/sync/pull", null, auth.accessToken, "GET"));
    expect(res.status).toBe(401);
    const r = await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: auth.refreshToken }));
    expect(r.status).toBe(401);
  });

  it("blocked users are rejected on the next request; logout revokes", async () => {
    const u = await makeUser();
    const auth = await loginAs(u.username!);
    await prisma.user.update({ where: { id: u.id }, data: { isBlocked: true } });
    expect((await pull(jsonReq("/api/mobile/sync/pull", null, auth.accessToken, "GET"))).status).toBe(401);
    await prisma.user.update({ where: { id: u.id }, data: { isBlocked: false } });

    await logout(jsonReq("/api/mobile/auth/logout", { refreshToken: auth.refreshToken }, auth.accessToken));
    expect((await pull(jsonReq("/api/mobile/sync/pull", null, auth.accessToken, "GET"))).status).toBe(401);
  });

  it("rejects missing / non-Bearer auth", async () => {
    expect((await pull(jsonReq("/api/mobile/sync/pull", null, undefined, "GET"))).status).toBe(401);
    expect((await push(jsonReq("/api/mobile/sync/push", { changes: [] }, "garbage"))).status).toBe(401);
  });
});

describe("mobile sync — LWW", () => {
  it("applies newer edits, marks older ones stale, and respects a later web write", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    const day = "2026-09-20";

    const r1 = await doPush(accessToken, [
      { entity: "dailyEntry", key: day, op: "upsert", data: { tasks: { a: true }, wake: null }, clientUpdatedAt: "2026-09-20T08:00:00.000Z" },
    ]);
    expect(r1.results[0].status).toBe("applied");
    expect(r1.results[0].serverRecord).toMatchObject({ date: day, tasks: { a: true }, editedAt: "2026-09-20T08:00:00.000Z" });

    // قدیمی‌تر → stale و نسخه‌ی سرور برمی‌گرده
    const r2 = await doPush(accessToken, [
      { entity: "dailyEntry", key: day, op: "upsert", data: { tasks: { b: true }, wake: null }, clientUpdatedAt: "2026-09-20T07:00:00.000Z" },
    ]);
    expect(r2.results[0].status).toBe("stale");
    expect(r2.results[0].serverRecord).toMatchObject({ tasks: { a: true } });

    // تکرارِ همون تغییر (retry شبکه) → stale، نه دوباره‌نویسی
    const r3 = await doPush(accessToken, [
      { entity: "dailyEntry", key: day, op: "upsert", data: { tasks: { a: true }, wake: null }, clientUpdatedAt: "2026-09-20T08:00:00.000Z" },
    ]);
    expect(r3.results[0].status).toBe("stale");

    // نوشتنِ وب (مثل /api/tasks/daily) — updatedAt خودکار = حالا
    await prisma.dailyEntry.update({ where: { userId_date: { userId: u.id, date: new Date(`${day}T00:00:00Z`) } }, data: { completedItems: { web: true } } });
    const r4 = await doPush(accessToken, [
      { entity: "dailyEntry", key: day, op: "upsert", data: { tasks: { c: true }, wake: null }, clientUpdatedAt: "2026-09-21T00:00:00.000Z" },
    ]);
    expect(r4.results[0].status).toBe("stale");
    expect(r4.results[0].serverRecord).toMatchObject({ tasks: { web: true } });

    // ویرایشِ موبایلِ جدیدتر از نوشتنِ وب → برنده
    const r5 = await doPush(accessToken, [
      { entity: "dailyEntry", key: day, op: "upsert", data: { tasks: { d: true }, wake: null }, clientUpdatedAt: new Date().toISOString() },
    ]);
    expect(r5.results[0].status).toBe("applied");
  });

  it("a backdated offline edit still reaches devices that already pulled past it", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    const first = await doPull(accessToken);
    // ویرایشِ آفلاینِ «دیروز» که الان رسیده
    await doPush(accessToken, [
      { entity: "setting", key: "outingDates", op: "upsert", data: { value: ["2026-09-01"] }, clientUpdatedAt: "2026-09-01T10:00:00.000Z" },
    ]);
    const second = await doPull(accessToken, first.cursor);
    expect(second.settings.map((s) => s.key)).toContain("outingDates");
    expect(second.settings.find((s) => s.key === "outingDates")).toMatchObject({ value: ["2026-09-01"], editedAt: "2026-09-01T10:00:00.000Z" });
  });

  it("task ids are owner-scoped: another user cannot overwrite or read a guessed id", async () => {
    const alice = await makeUser();
    const mallory = await makeUser();
    const a = await loginAs(alice.username!);
    const m = await loginAs(mallory.username!);
    const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 25).padEnd(24, "x");

    const created = await doPush(a.accessToken, [
      { entity: "task", id, op: "upsert", data: { title: "alice task", notes: null, dueDate: null, priority: 1, completedAt: null }, clientUpdatedAt: "2026-09-24T10:00:00.000Z" },
    ]);
    expect(created.results[0].status).toBe("applied");

    const attack = await doPush(m.accessToken, [
      { entity: "task", id, op: "upsert", data: { title: "pwned", notes: null, dueDate: null, priority: 1, completedAt: null }, clientUpdatedAt: new Date().toISOString() },
      { entity: "task", id, op: "delete", clientUpdatedAt: new Date().toISOString() },
    ]);
    expect(attack.results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(attack.results[0].serverRecord).toBeNull();
    const row = await prisma.task.findUnique({ where: { id } });
    expect(row).toMatchObject({ userId: alice.id, title: "alice task", deletedAt: null });
    expect((await doPull(m.accessToken)).tasks).toHaveLength(0);

    // حذف توسط صاحب → tombstone در pull
    const del = await doPush(a.accessToken, [{ entity: "task", id, op: "delete", clientUpdatedAt: new Date().toISOString() }]);
    expect(del.results[0].status).toBe("applied");
    const pulled = await doPull(a.accessToken);
    expect(pulled.tasks.find((t) => t.id === id)).toMatchObject({ deleted: true });
  });

  it("deletes of records the server never had leave tombstones so older upserts lose", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    const id = `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 24).padEnd(24, "q");
    const del = "2026-09-24T12:00:00.000Z";
    const older = "2026-09-24T11:00:00.000Z";

    const d = await doPush(accessToken, [
      { entity: "task", id, op: "delete", clientUpdatedAt: del },
      { entity: "dailyEntry", key: "2026-09-10", op: "delete", clientUpdatedAt: del },
      { entity: "sleepEntry", key: "2026-09-10", op: "delete", clientUpdatedAt: del },
      { entity: "setting", key: "outingDates", op: "delete", clientUpdatedAt: del },
    ]);
    expect(d.results.map((r) => r.status)).toEqual(["applied", "applied", "applied", "applied"]);
    expect(d.results[0].serverRecord).toMatchObject({ id, deleted: true, editedAt: del });
    expect(d.results[1].serverRecord).toMatchObject({ tasks: {}, wake: null });
    expect(d.results[3].serverRecord).toMatchObject({ key: "outingDates", value: null });

    // upsertهای قدیمی‌ترِ یک دستگاهِ دیگه که دیر رسیدن
    const late = await doPush(accessToken, [
      { entity: "task", id, op: "upsert", data: { title: "zombie", notes: null, dueDate: null, priority: 0, completedAt: null }, clientUpdatedAt: older },
      { entity: "dailyEntry", key: "2026-09-10", op: "upsert", data: { tasks: { a: true }, wake: null }, clientUpdatedAt: older },
      { entity: "sleepEntry", key: "2026-09-10", op: "upsert", data: { quality: 5 }, clientUpdatedAt: older },
      { entity: "setting", key: "outingDates", op: "upsert", data: { value: ["2026-09-01"] }, clientUpdatedAt: older },
    ]);
    expect(late.results.map((r) => r.status)).toEqual(["stale", "stale", "stale", "stale"]);
    expect(await prisma.task.findUnique({ where: { id } })).toMatchObject({ userId: u.id, deletedAt: new Date(del) });

    // tombstoneها توی pull هم میان
    const p = await doPull(accessToken);
    expect(p.tasks.find((t) => t.id === id)).toMatchObject({ deleted: true });
    expect(p.settings.find((x) => x.key === "outingDates")).toMatchObject({ value: null });
  });

  it("syncs the theme setting", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    const r = await doPush(accessToken, [
      { entity: "setting", key: "theme", op: "upsert", data: { value: "dark" }, clientUpdatedAt: "2026-09-24T10:00:00.000Z" },
    ]);
    expect(r.results[0]).toMatchObject({ status: "applied", serverRecord: { key: "theme", value: "dark" } });
  });

  it("rejects invalid changes individually and caps the batch", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    const r = await doPush(accessToken, [
      { entity: "setting", key: "pushSentLog", op: "upsert", data: { value: "2099-01-01" }, clientUpdatedAt: "2026-09-24T10:00:00.000Z" },
      { entity: "sleepEntry", key: "2026-09-24", op: "upsert", data: { quality: 4 }, clientUpdatedAt: "2026-09-24T10:00:00.000Z" },
    ]);
    expect(r.results.map((x) => x.status)).toEqual(["rejected", "applied"]);
    expect(await prisma.userSetting.findUnique({ where: { userId_key: { userId: u.id, key: "pushSentLog" } } })).toBeNull();

    const tooMany = Array.from({ length: 201 }, () => ({ entity: "task", id: "x", op: "delete", clientUpdatedAt: "2026-09-24T10:00:00.000Z" }));
    const res = await push(jsonReq("/api/mobile/sync/push", { changes: tooMany }, accessToken));
    expect(res.status).toBe(413);
  });
});

describe("mobile sync — contract fixes", () => {
  it("rejections carry a stable code; exhausted concurrency retries are code=busy", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    await doPush(accessToken, [{ entity: "dailyEntry", key: "2026-09-21", op: "upsert", data: { tasks: { a: true }, wake: null }, clientUpdatedAt: "2026-09-21T08:00:00.000Z" }]);

    // هر updateMany «وسطش عوض شد» برمی‌گردونه → سه دور retry و بعد busy
    const spy = vi.spyOn(prisma.dailyEntry, "updateMany").mockResolvedValue({ count: 0 } as any);
    try {
      const r = await doPush(accessToken, [
        { entity: "dailyEntry", key: "2026-09-21", op: "upsert", data: { tasks: { b: true }, wake: null }, clientUpdatedAt: new Date().toISOString() },
        { entity: "setting", key: "pushSentLog", op: "upsert", data: { value: 1 }, clientUpdatedAt: new Date().toISOString() },
        { entity: "foodLogEntry", id: "cfood0000000000000000000001", op: "delete", clientUpdatedAt: new Date().toISOString() },
      ]);
      expect(r.results.map((x) => [x.status, x.code])).toEqual([
        ["rejected", "busy"],
        ["rejected", "invalid"],
        ["rejected", "module_locked"],
      ]);
      expect(r.results[2].error).toBe("module_locked"); // سازگاریِ قبلی
    } finally {
      spy.mockRestore();
    }
  });

  it("cleared days come back from pull as deleted:true", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    await doPush(accessToken, [
      { entity: "dailyEntry", key: "2026-09-22", op: "upsert", data: { tasks: { a: true }, wake: null }, clientUpdatedAt: "2026-09-22T08:00:00.000Z" },
      { entity: "sleepEntry", key: "2026-09-22", op: "upsert", data: { quality: 4 }, clientUpdatedAt: "2026-09-22T08:00:00.000Z" },
      { entity: "dailyEntry", key: "2026-09-22", op: "delete", clientUpdatedAt: "2026-09-22T09:00:00.000Z" },
      { entity: "sleepEntry", key: "2026-09-22", op: "delete", clientUpdatedAt: "2026-09-22T09:00:00.000Z" },
    ]);
    const p = await doPull(accessToken);
    expect(p.dailyEntries.find((d) => d.date === "2026-09-22")).toMatchObject({ deleted: true, tasks: {} });
    expect(p.sleepEntries.find((d) => d.date === "2026-09-22")).toMatchObject({ deleted: true, quality: null });
  });

  it("tasks: priority defaults to 1 and dueDate round-trips as YYYY-MM-DD", async () => {
    const u = await makeUser();
    const { accessToken } = await loginAs(u.username!);
    const id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 24).padEnd(24, "z");
    const r = await doPush(accessToken, [
      { entity: "task", id, op: "upsert", data: { title: "t", notes: null, dueDate: "2026-10-01", completedAt: null }, clientUpdatedAt: "2026-09-24T10:00:00.000Z" },
    ]);
    expect(r.results[0]).toMatchObject({ status: "applied", serverRecord: { priority: 1, dueDate: "2026-10-01" } });
    expect((await prisma.task.findUnique({ where: { id } }))?.dueDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("sleep targets accept HH:mm in the user's timezone and return ISO + HH:mm", async () => {
    const u = await makeUser();
    await prisma.user.update({ where: { id: u.id }, data: { timezone: "Europe/London" } });
    const { accessToken } = await loginAs(u.username!);
    const r = await doPush(accessToken, [
      { entity: "sleepEntry", key: "2026-07-10", op: "upsert", data: { targetSleptAt: "23:15", targetWokeAt: "07:00" }, clientUpdatedAt: "2026-07-10T08:00:00.000Z" },
    ]);
    // لندن در جولای BST (+01:00)
    expect(r.results[0]).toMatchObject({
      status: "applied",
      serverRecord: {
        targetSleptAt: "2026-07-10T22:15:00.000Z",
        targetWokeAt: "2026-07-10T06:00:00.000Z",
        targetSleptAtHhmm: "23:15",
        targetWokeAtHhmm: "07:00",
        timezone: "Europe/London",
        deleted: false,
      },
    });
    const p = await doPull(accessToken);
    expect(p.sleepEntries[0]).toMatchObject({ targetWokeAtHhmm: "07:00", timezone: "Europe/London" });
  });
});

describe("mobile account info (login/refresh user + GET /api/mobile/me)", () => {
  it("masks phones", () => {
    expect(maskPhone("09121234567")).toBe("0912***4567");
    expect(maskPhone("+989121234567")).toBe("+989***4567");
    expect(maskPhone("1234")).toBe("***34");
    expect(maskPhone(null)).toBeNull();
  });

  it("returns username, masked phone, current plan and modules with expiry — never the full phone or isSuperAdmin", async () => {
    const u = await makeUser();
    const phone = `09${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
    await prisma.user.update({ where: { id: u.id }, data: { phone } });
    const exp = new Date(Date.now() + 20 * 86400_000);
    await prisma.moduleAccess.createMany({
      data: [
        { userId: u.id, module: "TRADE", active: true, expiresAt: exp },
        { userId: u.id, module: "EXERCISE", active: true, expiresAt: new Date(Date.now() - 1000) }, // منقضی
        { userId: u.id, module: "ROUTINE", active: true, expiresAt: null },
      ],
    });
    const plan = await prisma.plan.create({
      data: { key: `trade_${Date.now()}`, nameFa: "پلن ترید", nameEn: "Trade", market: "IRAN", currency: "IRR", priceMonthly: 1000 },
    });
    try {
      // اشتراکِ لغوشده‌ی دیرتر نباید انتخاب بشه
      await prisma.subscription.create({ data: { userId: u.id, planId: plan.id, status: "CANCELED", currentPeriodEnd: new Date(Date.now() + 90 * 86400_000) } });
      await prisma.subscription.create({ data: { userId: u.id, planId: plan.id, status: "ACTIVE", currentPeriodEnd: exp } });

      const auth = await loginAs(u.username!);
      const expected = {
        id: u.id,
        username: u.username,
        phoneMasked: `${phone.slice(0, 4)}***${phone.slice(-4)}`,
        plan: { key: plan.key, name: "پلن ترید", status: "ACTIVE", expiresAt: exp.toISOString() },
        moduleAccess: [
          { module: "ROUTINE", expiresAt: null },
          { module: "TRADE", expiresAt: exp.toISOString() },
        ],
      };
      expect(auth.user).toMatchObject(expected);
      expect(auth.user.modules.sort()).toEqual(["ROUTINE", "TRADE"]);
      expect(JSON.stringify(auth.user)).not.toContain(phone);
      expect(auth.user).not.toHaveProperty("isSuperAdmin");

      const r = await me(jsonReq("/api/mobile/me", null, auth.accessToken, "GET"));
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.user).toMatchObject(expected);

      const rr = await refresh(jsonReq("/api/mobile/auth/refresh", { refreshToken: auth.refreshToken }));
      expect((await rr.json()).user).toMatchObject(expected);

      expect((await me(jsonReq("/api/mobile/me", null, undefined, "GET"))).status).toBe(401);
    } finally {
      await prisma.subscription.deleteMany({ where: { userId: u.id } });
      await prisma.plan.delete({ where: { id: plan.id } });
    }
  });
});
