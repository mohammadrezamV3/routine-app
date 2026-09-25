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
