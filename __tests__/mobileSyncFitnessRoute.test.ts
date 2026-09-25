import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

// integration روی دیتابیسِ واقعی — فاز ۴ (بدنسازی/کالری) + catalog + food-scan.
vi.hoisted(() => {
  process.env.TRUST_PROXY_HEADERS = "1";
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});

// AI نباید به شبکه/هزینه‌ی واقعی وابسته باشه — فقط رفتارِ wrapper تست می‌شه
const scanCalls: string[] = [];
vi.mock("@/lib/aiClient", () => ({
  analyzeFoodPhoto: vi.fn(async (_b64: string, _mt: string, userId: string) => {
    scanCalls.push(userId);
    return { recognized: true, name: "سیب", estimatedGrams: 150, calories: 80, proteinG: 0, carbsG: 20, fatG: 0 };
  }),
}));

import { POST as login } from "@/app/api/mobile/auth/login/route";
import { GET as pull } from "@/app/api/mobile/sync/pull/route";
import { POST as push } from "@/app/api/mobile/sync/push/route";
import { GET as catalog } from "@/app/api/mobile/catalog/route";
import { GET as media } from "@/app/api/mobile/catalog/media/route";
import { POST as foodScan } from "@/app/api/mobile/ai/food-scan/route";
import { prisma } from "@/lib/prisma";
import type { MobileAuthSuccess, MobileCatalogResponse, SyncPullResponse, SyncPushResponse } from "@/lib/mobileApiContract";

const PASSWORD = "Correct-Horse-Battery-9";
const createdUsers: string[] = [];
const createdMedia: string[] = [];
let idSeq = 0;
const newId = () => `f${Date.now().toString(36)}${(idSeq++).toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 24).padEnd(24, "z");

async function makeUser(modules: ("EXERCISE" | "CALORIE")[] = []) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: { username: `fit_${tag}`.slice(0, 20), passwordHash: await bcrypt.hash(PASSWORD, 4), market: "IRAN" },
  });
  createdUsers.push(user.id);
  for (const module of modules) {
    await prisma.moduleAccess.create({ data: { userId: user.id, module, active: true, expiresAt: new Date(Date.now() + 86400_000) } });
  }
  return user;
}

function req(path: string, body: unknown, token?: string, method = "POST", extra: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extra,
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

async function tokenFor(username: string): Promise<string> {
  const res = await login(req("/api/mobile/auth/login", { identifier: username, password: PASSWORD }));
  expect(res.status).toBe(200);
  return ((await res.json()) as MobileAuthSuccess).accessToken;
}
async function doPush(token: string, changes: unknown[]): Promise<SyncPushResponse> {
  const res = await push(req("/api/mobile/sync/push", { changes }, token));
  expect(res.status).toBe(200);
  return res.json();
}
async function doPull(token: string, since?: string): Promise<SyncPullResponse> {
  const res = await pull(req(`/api/mobile/sync/pull${since ? `?since=${encodeURIComponent(since)}` : ""}`, null, token, "GET"));
  expect(res.status).toBe(200);
  return res.json();
}
const now = () => new Date().toISOString();
const food = (over: Record<string, unknown> = {}) => ({ date: "2026-09-24", customName: "برنج", customCalories: 200, grams: 150, mealType: "lunch", ...over });

afterAll(async () => {
  await prisma.exerciseLog.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.exerciseMedia.deleteMany({ where: { nameKey: { in: createdMedia } } });
  await prisma.$disconnect();
});

describe("module gating", () => {
  it("locked user: pull omits entities, push says module_locked, catalog hides media, scan is 403", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const p = await doPull(t);
    expect(p.lockedModules.sort()).toEqual(["CALORIE", "EXERCISE", "ROADMAP"]);
    expect(p).not.toHaveProperty("foodLogEntries");
    expect(p).not.toHaveProperty("exercisePlans");

    const r = await doPush(t, [
      { entity: "foodLogEntry", id: newId(), op: "upsert", data: food(), clientUpdatedAt: now() },
      { entity: "task", id: newId(), op: "upsert", data: { title: "basic still works" }, clientUpdatedAt: now() },
    ]);
    expect(r.results.map((x) => [x.status, x.error ?? null])).toEqual([["rejected", "module_locked"], ["applied", null]]);
    expect(await prisma.foodLogEntry.count({ where: { userId: u.id } })).toBe(0);

    const c: MobileCatalogResponse = await (await catalog(req("/api/mobile/catalog", null, t, "GET"))).json();
    expect(c.exerciseMedia).toBeNull();
    expect(c.foods.length).toBeGreaterThan(10);
    expect(c.exercises.length).toBeGreaterThan(10);

    const s = await foodScan(req("/api/mobile/ai/food-scan", { imageBase64: "aGk=", mediaType: "image/jpeg" }, t));
    expect(s.status).toBe(403);
    expect(await s.json()).toEqual({ error: "module_locked" });
  });

  it("partial access: only the unlocked module's entities are included", async () => {
    const u = await makeUser(["CALORIE"]);
    const p = await doPull(await tokenFor(u.username!));
    expect(p.lockedModules).toEqual(["EXERCISE", "ROADMAP"]);
    expect(p.foodLogEntries).toEqual([]);
    expect(p).not.toHaveProperty("exerciseLogs");
  });
});

describe("foodLogEntry", () => {
  it("LWW + ownership + tombstones, and web readers ignore soft-deleted rows", async () => {
    const alice = await makeUser(["CALORIE"]);
    const mallory = await makeUser(["CALORIE"]);
    const a = await tokenFor(alice.username!);
    const m = await tokenFor(mallory.username!);
    const id = newId();

    const c = await doPush(a, [{ entity: "foodLogEntry", id, op: "upsert", data: food(), clientUpdatedAt: "2026-09-24T12:00:00.000Z" }]);
    expect(c.results[0]).toMatchObject({ status: "applied", serverRecord: { id, customName: "برنج", deleted: false } });

    const old = await doPush(a, [{ entity: "foodLogEntry", id, op: "upsert", data: food({ grams: 999 }), clientUpdatedAt: "2026-09-24T11:00:00.000Z" }]);
    expect(old.results[0].status).toBe("stale");

    const atk = await doPush(m, [{ entity: "foodLogEntry", id, op: "delete", clientUpdatedAt: now() }]);
    expect(atk.results[0]).toMatchObject({ status: "rejected", serverRecord: null });

    await doPush(a, [{ entity: "foodLogEntry", id, op: "delete", clientUpdatedAt: now() }]);
    expect((await prisma.foodLogEntry.findUnique({ where: { id } }))?.deletedAt).not.toBeNull();
    expect(await prisma.foodLogEntry.count({ where: { userId: alice.id, deletedAt: null } })).toBe(0);
    expect((await doPull(a)).foodLogEntries?.find((f) => f.id === id)).toMatchObject({ deleted: true });

    // حذفِ ثبتی که سرور ندیده → tombstone، و upsertِ قدیمی‌تر بعدش stale
    const ghost = newId();
    const d = await doPush(a, [{ entity: "foodLogEntry", id: ghost, op: "delete", clientUpdatedAt: "2026-09-24T12:00:00.000Z" }]);
    expect(d.results[0]).toMatchObject({ status: "applied", serverRecord: { id: ghost, deleted: true } });
    const late = await doPush(a, [{ entity: "foodLogEntry", id: ghost, op: "upsert", data: food(), clientUpdatedAt: "2026-09-24T11:00:00.000Z" }]);
    expect(late.results[0].status).toBe("stale");
  });
});

describe("exercise plan + log", () => {
  it("manual plan needs rulesAccepted; activation deactivates the web plan; logs need an owned plan", async () => {
    const u = await makeUser(["EXERCISE"]);
    const other = await makeUser(["EXERCISE"]);
    const t = await tokenFor(u.username!);
    const webPlan = await prisma.exercisePlan.create({ data: { userId: u.id, level: "beginner", planData: [{ day: "شنبه", focus: "x", items: ["a"] }], isActive: true } });
    const foreignPlan = await prisma.exercisePlan.create({ data: { userId: other.id, level: "beginner", planData: [], isActive: true } });
    const pid = newId();
    const planData = [{ day: "یکشنبه", focus: "پا", items: ["اسکوات"] }];

    const noRules = await doPush(t, [{ entity: "exercisePlan", id: pid, op: "upsert", data: { planData, isActive: true }, clientUpdatedAt: now() }]);
    expect(noRules.results[0]).toMatchObject({ status: "rejected" });

    const before = await doPull(t);
    const ok = await doPush(t, [{ entity: "exercisePlan", id: pid, op: "upsert", data: { planData, isActive: true, rulesAccepted: true }, clientUpdatedAt: now() }]);
    expect(ok.results[0]).toMatchObject({ status: "applied", serverRecord: { id: pid, level: "custom", isActive: true, gymDays: ["یکشنبه"] } });
    expect((await prisma.exercisePlan.findUnique({ where: { id: webPlan.id } }))?.isActive).toBe(false);
    // غیرفعال‌شدنِ برنامه‌ی وب هم به بقیه‌ی دستگاه‌ها می‌رسه (updateMany → updatedAt)
    const after = await doPull(t, before.cursor);
    expect(after.exercisePlans?.find((p) => p.id === webPlan.id)).toMatchObject({ isActive: false });

    // جایگزینیِ حرکت روی برنامه‌ی وب (بدونِ rulesAccepted — ردیف موجوده)
    const sub = await doPush(t, [{ entity: "exercisePlan", id: webPlan.id, op: "upsert", data: { planData: [{ day: "شنبه", focus: "x", items: ["b"] }], isActive: false }, clientUpdatedAt: now() }]);
    expect(sub.results[0]).toMatchObject({ status: "applied", serverRecord: { planData: [{ items: ["b"] }] } });

    const foreign = await doPush(t, [
      { entity: "exercisePlan", id: foreignPlan.id, op: "upsert", data: { planData, isActive: true }, clientUpdatedAt: now() },
      { entity: "exerciseLog", key: `${foreignPlan.id}|2026-09-24`, op: "upsert", data: { completed: true, completedItems: [] }, clientUpdatedAt: now() },
    ]);
    expect(foreign.results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect((await prisma.exercisePlan.findUnique({ where: { id: foreignPlan.id } }))?.isActive).toBe(true);

    const key = `${pid}|2026-09-24`;
    const log = await doPush(t, [{ entity: "exerciseLog", key, op: "upsert", data: { completed: true, completedItems: ["اسکوات"] }, clientUpdatedAt: "2026-09-24T18:00:00.000Z" }]);
    expect(log.results[0]).toMatchObject({ status: "applied", serverRecord: { key, completed: true, completedItems: ["اسکوات"] } });
    const del = await doPush(t, [{ entity: "exerciseLog", key: `${pid}|2026-09-23`, op: "delete", clientUpdatedAt: "2026-09-24T18:00:00.000Z" }]);
    expect(del.results[0]).toMatchObject({ status: "applied", serverRecord: { completed: false } });
    const stale = await doPush(t, [{ entity: "exerciseLog", key: `${pid}|2026-09-23`, op: "upsert", data: { completed: true, completedItems: [] }, clientUpdatedAt: "2026-09-24T17:00:00.000Z" }]);
    expect(stale.results[0].status).toBe("stale");
  });
});

describe("calorieTarget", () => {
  it("compute closes the previous target, respects LWW, and meals only patches the current one", async () => {
    const u = await makeUser(["CALORIE"]);
    const t = await tokenFor(u.username!);
    const compute = { kind: "compute", goal: "maintain", mealsPerDay: 3, sex: "male", ageYears: 30, heightCm: 180, weightKg: 80 };

    const first = newId();
    const r1 = await doPush(t, [{ entity: "calorieTarget", id: first, op: "upsert", data: compute, clientUpdatedAt: now() }]);
    expect(r1.results[0]).toMatchObject({ status: "applied", serverRecord: { id: first, effectiveTo: null, mealsPerDay: 3 } });
    expect((r1.results[0].serverRecord as any).dailyTargetKcal).toBeGreaterThan(1500);

    // هدفِ قدیمی‌تر از هدفِ فعلی → stale و هدفِ فعلی برمی‌گرده
    const r2 = await doPush(t, [{ entity: "calorieTarget", id: newId(), op: "upsert", data: compute, clientUpdatedAt: "2026-01-01T00:00:00.000Z" }]);
    expect(r2.results[0]).toMatchObject({ status: "stale", serverRecord: { id: first } });

    const second = newId();
    const r3 = await doPush(t, [{ entity: "calorieTarget", id: second, op: "upsert", data: { ...compute, goal: "lose" }, clientUpdatedAt: now() }]);
    expect(r3.results[0].status).toBe("applied");
    expect((await prisma.calorieTarget.findUnique({ where: { id: first } }))?.effectiveTo).not.toBeNull();

    const meals = { kind: "meals", mealBreakdown: [{ key: "a", label: "صبحانه", kcal: 700 }, { key: "b", label: "شام", kcal: 900 }], proteinTargetG: 120 };
    const closed = await doPush(t, [{ entity: "calorieTarget", id: first, op: "upsert", data: meals, clientUpdatedAt: now() }]);
    expect(closed.results[0].status).toBe("rejected");
    const ok = await doPush(t, [{ entity: "calorieTarget", id: second, op: "upsert", data: meals, clientUpdatedAt: now() }]);
    expect(ok.results[0]).toMatchObject({ status: "applied", serverRecord: { dailyTargetKcal: 1600, mealsPerDay: 2, proteinTargetG: 120 } });

    // سن لازمه وقتی تاریخ تولد نیست
    const noAge = await doPush(t, [{ entity: "calorieTarget", id: newId(), op: "upsert", data: { ...compute, ageYears: undefined }, clientUpdatedAt: now() }]);
    expect(noAge.results[0].status).toBe("rejected");
  });
});

describe("catalog + media + food scan", () => {
  it("ETag round-trip returns 304; media key list is versioned; media fetch works", async () => {
    const u = await makeUser(["EXERCISE", "CALORIE"]);
    const t = await tokenFor(u.username!);
    const key = `test-media-${Date.now()}`;
    createdMedia.push(key);
    await prisma.exerciseMedia.create({ data: { nameKey: key, name: key, dataUrl: "data:image/png;base64,AAAA" } });

    const r1 = await catalog(req("/api/mobile/catalog", null, t, "GET"));
    const etag = r1.headers.get("etag")!;
    const body: MobileCatalogResponse = await r1.json();
    expect(body.exerciseMedia?.map((m) => m.key)).toContain(key);
    expect(etag).toBe(`"${body.version}"`);

    const r2 = await catalog(req("/api/mobile/catalog", null, t, "GET", { "if-none-match": etag }));
    expect(r2.status).toBe(304);

    await prisma.exerciseMedia.update({ where: { nameKey: key }, data: { dataUrl: "data:image/png;base64,BBBB" } });
    const r3 = await catalog(req("/api/mobile/catalog", null, t, "GET", { "if-none-match": etag }));
    expect(r3.status).toBe(200);

    const m = await media(req(`/api/mobile/catalog/media?key=${encodeURIComponent(key)}`, null, t, "GET"));
    expect(await m.json()).toMatchObject({ key, dataUrl: "data:image/png;base64,BBBB" });
  });

  it("food scan wrapper validates input and calls the shared AI path", async () => {
    const u = await makeUser(["CALORIE"]);
    const t = await tokenFor(u.username!);
    expect((await foodScan(req("/api/mobile/ai/food-scan", { imageBase64: "aGk=", mediaType: "image/gif" }, t))).status).toBe(400);
    const ok = await foodScan(req("/api/mobile/ai/food-scan", { imageBase64: "aGk=", mediaType: "image/jpeg" }, t));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, result: { recognized: true } });
    expect(scanCalls).toContain(u.id);
  });
});
