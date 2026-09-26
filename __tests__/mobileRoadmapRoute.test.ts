import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

// integration روی دیتابیسِ واقعی — رودمپ + AIِ برنامه‌ی تمرینی + bodyMetrics.
vi.hoisted(() => {
  process.env.TRUST_PROXY_HEADERS = "1";
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});

// ردیفِ قدیمی (learn/do/done) — normalizePlan باید به شکلِ جدید نگاشتش کنه
const STAGES = [1, 2, 3].map((n) => ({
  n, title: `مرحله ${n}`, goal: "g", duration: "۱ هفته", learn: ["a"], do: ["b", "c"], tools: [], resources: [], done: "d",
}));
// خروجیِ ساختِ دوفازی: مرحله‌ی ۳ جزئیاتش نرسیده (detailed:false)
const AI_STAGES = [1, 2, 3].map((n) => ({
  n, title: `مرحله ${n}`, goal: "g", duration: "۱ هفته", focus: "f", why: "w", detailed: n !== 3,
  prerequisites: [], topics: n !== 3 ? [{ title: "t", detail: "", points: [] }] : [],
  tasks: n !== 3 ? [{ title: "k1", detail: "", output: "" }, { title: "k2", detail: "", output: "" }] : [],
  project: null, tools: [{ name: "x", use: "" }], resources: [], pitfalls: [], done: ["d"],
}));
let exerciseAiFails = false;
vi.mock("@/lib/aiClient", () => ({
  generateRoadmapPlan: vi.fn(async (profile: any) => ({
    plan: {
      title: "شبکه", summary: "s", guide: "g".repeat(700), totalDuration: "۳ ماه", tools: [{ name: "x", use: "" }],
      meta: { level: profile.level, weeklyHours: profile.weeklyHours, audience: "a", prerequisites: [], outcomes: ["o"], certifications: [] },
      stages: AI_STAGES,
    },
    meta: { attempts: 1, durationMs: 1, pendingStages: [3], guideReady: true },
  })),
  generateStageDetail: vi.fn(async (_ctx: any, n: number) => ({
    ...AI_STAGES[0], n, title: `مرحله ${n}`, detailed: true, tasks: [{ title: "new", detail: "", output: "" }],
  })),
  generateRoadmapGuide: vi.fn(async () => "## راهنما\nمتن"),
  generateExercisePlan: vi.fn(async () => {
    if (exerciseAiFails) throw new Error("gateway down");
    return { feasible: true, days: [{ day: "شنبه", focus: "سینه", items: ["پرس سینه"] }] };
  }),
}));

import { POST as login } from "@/app/api/mobile/auth/login/route";
import { GET as pull } from "@/app/api/mobile/sync/pull/route";
import { POST as push } from "@/app/api/mobile/sync/push/route";
import { GET as roadmaps } from "@/app/api/mobile/roadmaps/route";
import { POST as aiRoadmap } from "@/app/api/mobile/ai/roadmap/route";
import { POST as aiRoadmapRegenerate } from "@/app/api/mobile/ai/roadmap/[id]/regenerate/route";
import { POST as aiExercise } from "@/app/api/mobile/ai/exercise-plan/route";
import { prisma } from "@/lib/prisma";
import type { MobileAuthSuccess, MobileRoadmapRegenerateResponse, MobileRoadmapResponse, MobileRoadmapsResponse, SyncPullResponse, SyncPushResponse } from "@/lib/mobileApiContract";

const PASSWORD = "Correct-Horse-Battery-9";
const createdUsers: string[] = [];

async function makeUser(opts: { superAdmin?: boolean; modules?: ("ROADMAP" | "EXERCISE")[] } = {}) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: { username: `rm_${tag}`.slice(0, 20), passwordHash: await bcrypt.hash(PASSWORD, 4), market: "IRAN", isSuperAdmin: !!opts.superAdmin },
  });
  createdUsers.push(user.id);
  for (const module of opts.modules ?? []) {
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
async function tokenFor(username: string) {
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
  return res.json();
}
const makeRoadmap = (userId: string) =>
  prisma.roadmap.create({ data: { userId, topic: "شبکه", title: "شبکه", guide: "g", steps: STAGES as any, progress: { "1": true } as any } });
const now = () => new Date().toISOString();

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

describe("roadmap gating mirrors the web's superadmin-only lock", () => {
  it("a normal user with an active ROADMAP module is still locked out", async () => {
    const u = await makeUser({ modules: ["ROADMAP"] });
    const t = await tokenFor(u.username!);
    const rm = await makeRoadmap(u.id);
    expect((await roadmaps(req("/api/mobile/roadmaps", null, t, "GET"))).status).toBe(403);
    expect((await aiRoadmap(req("/api/mobile/ai/roadmap", { topic: "x" }, t))).status).toBe(403);
    const p = await doPull(t);
    expect(p.lockedModules).toContain("ROADMAP");
    expect(p).not.toHaveProperty("roadmapProgress");
    const r = await doPush(t, [{ entity: "roadmapProgress", id: rm.id, op: "upsert", data: { stepProgress: { "2": true } }, clientUpdatedAt: now() }]);
    expect(r.results[0]).toMatchObject({ status: "rejected", error: "module_locked" });
  });
});

describe("roadmaps (superadmin)", () => {
  it("lists full content with server-computed progress, ETag 304, LWW progress sync, ownership", async () => {
    const u = await makeUser({ superAdmin: true });
    const other = await makeUser({ superAdmin: true });
    const t = await tokenFor(u.username!);
    const rm = await makeRoadmap(u.id);
    const foreign = await makeRoadmap(other.id);

    const r1 = await roadmaps(req("/api/mobile/roadmaps", null, t, "GET"));
    const list: MobileRoadmapsResponse = await r1.json();
    expect(list.roadmaps).toHaveLength(1);
    expect(list.roadmaps[0]).toMatchObject({ id: rm.id, stepProgress: { "1": true }, progress: { total: 3, done: 1, pct: 33 } });
    expect(list.roadmaps[0].plan.stages).toHaveLength(3);
    // ردیفِ قدیمی به شکلِ دوفازی نگاشت می‌شه (learn → topics، do → tasks، done → [done])
    expect(list.roadmaps[0].plan.stages[0]).toMatchObject({
      detailed: true, topics: [{ title: "a" }], tasks: [{ title: "b" }, { title: "c" }], done: ["d"],
    });
    expect(list.roadmaps[0].plan.meta).toEqual({ audience: "", prerequisites: [], outcomes: [], certifications: [] });
    const etag = r1.headers.get("etag")!;
    expect((await roadmaps(req("/api/mobile/roadmaps", null, t, "GET", { "if-none-match": etag }))).status).toBe(304);

    const before = await doPull(t);
    expect(before.roadmapProgress?.map((x) => x.id)).toEqual([rm.id]);

    // کلیدِ مرحله‌ی ناموجود (۹) دور ریخته می‌شه؛ درصد سمتِ سرور
    const ok = await doPush(t, [{ entity: "roadmapProgress", id: rm.id, op: "upsert", data: { stepProgress: { "1": true, "2": true, "9": true } }, clientUpdatedAt: now() }]);
    expect(ok.results[0]).toMatchObject({ status: "applied", serverRecord: { stepProgress: { "1": true, "2": true }, progress: { done: 2, pct: 67 } } });
    const after = await doPull(t, before.cursor);
    expect(after.roadmapProgress?.[0]).toMatchObject({ id: rm.id, progress: { done: 2 } });
    // ETag عوض شد
    expect((await roadmaps(req("/api/mobile/roadmaps", null, t, "GET", { "if-none-match": etag }))).status).toBe(200);

    // کلیدِ کار ("n.i") هم sync می‌شه ولی در درصد حساب نمی‌شه؛ کارِ ناموجود (1.3) دور ریخته می‌شه
    const tasks = await doPush(t, [{ entity: "roadmapProgress", id: rm.id, op: "upsert", data: { stepProgress: { "1": true, "1.2": true, "1.3": true } }, clientUpdatedAt: now() }]);
    expect(tasks.results[0]).toMatchObject({ status: "applied", serverRecord: { stepProgress: { "1": true, "1.2": true }, progress: { done: 1 } } });
    const bad = await doPush(t, [{ entity: "roadmapProgress", id: rm.id, op: "upsert", data: { stepProgress: { "1.x": true } }, clientUpdatedAt: now() }]);
    expect(bad.results[0]).toMatchObject({ status: "rejected" });

    // ویرایشِ وب (PATCH progress → updatedAt خودکار) بعدش؛ ویرایشِ قدیمی‌ترِ گوشی می‌بازه
    await prisma.roadmap.updateMany({ where: { id: rm.id, userId: u.id }, data: { progress: { "3": true } as any } });
    const stale = await doPush(t, [{ entity: "roadmapProgress", id: rm.id, op: "upsert", data: { stepProgress: {} }, clientUpdatedAt: new Date(Date.now() - 60_000).toISOString() }]);
    expect(stale.results[0]).toMatchObject({ status: "stale", serverRecord: { stepProgress: { "3": true } } });

    const atk = await doPush(t, [{ entity: "roadmapProgress", id: foreign.id, op: "upsert", data: { stepProgress: { "1": true, "2": true } }, clientUpdatedAt: now() }]);
    expect(atk.results[0]).toMatchObject({ status: "rejected", serverRecord: null });
    expect((await prisma.roadmap.findUnique({ where: { id: foreign.id } }))?.progress).toEqual({ "1": true });
  });

  it("AI roadmap wrapper creates and returns the full roadmap", async () => {
    const u = await makeUser({ superAdmin: true });
    const t = await tokenFor(u.username!);
    expect((await aiRoadmap(req("/api/mobile/ai/roadmap", { topic: "  " }, t))).status).toBe(400);
    const res = await aiRoadmap(req("/api/mobile/ai/roadmap", { topic: "شبکه", goal: "استخدام", level: "mid", weeklyHours: "8", background: "پایتون" }, t));
    expect(res.status).toBe(201);
    const body: MobileRoadmapResponse = await res.json();
    expect(body.roadmap).toMatchObject({ topic: "شبکه", goal: "استخدام", generatedByAi: true, progress: { total: 3, done: 0 } });
    expect(body.roadmap.plan.meta).toMatchObject({ level: "mid", weeklyHours: "8", outcomes: ["o"] });
    expect(body).toMatchObject({ pendingStages: [3], guideReady: true });
    const { generateRoadmapPlan } = await import("@/lib/aiClient");
    expect(generateRoadmapPlan).toHaveBeenLastCalledWith(
      { topic: "شبکه", goal: "استخدام", level: "mid", weeklyHours: "8", background: "پایتون" }, u.id
    );
    // مقدارِ خارج از فهرست یعنی «نگفته»، نه متنی که به پرامپت بره
    await aiRoadmap(req("/api/mobile/ai/roadmap", { topic: "شبکه", level: "hacker", weeklyHours: "99" }, t));
    expect(generateRoadmapPlan).toHaveBeenLastCalledWith(
      { topic: "شبکه", goal: undefined, level: undefined, weeklyHours: undefined, background: undefined }, u.id
    );
    expect(await prisma.roadmap.count({ where: { userId: u.id } })).toBe(2);
  });

  it("regenerate wrapper: pending stage gets details, task ticks of the replaced stage are dropped, ownership", async () => {
    const u = await makeUser({ superAdmin: true });
    const other = await makeUser({ superAdmin: true });
    const t = await tokenFor(u.username!);
    const created: MobileRoadmapResponse = await (await aiRoadmap(req("/api/mobile/ai/roadmap", { topic: "شبکه" }, t))).json();
    const id = created.roadmap.id;
    await prisma.roadmap.updateMany({ where: { id, userId: u.id }, data: { progress: { "1": true, "3": true, "3.2": true } as any } });

    const regen = (body: unknown, rid = id) =>
      aiRoadmapRegenerate(req(`/api/mobile/ai/roadmap/${rid}/regenerate`, body, t), { params: { id: rid } });
    expect((await regen({ target: "nope" })).status).toBe(400);
    expect((await regen({ target: "stage", n: "3" })).status).toBe(400);

    const res = await regen({ target: "stage", n: 3 });
    expect(res.status).toBe(200);
    const body: MobileRoadmapRegenerateResponse = await res.json();
    expect(body.roadmap.plan.stages[2]).toMatchObject({ n: 3, detailed: true, tasks: [{ title: "new" }] });
    expect(body.roadmap.stepProgress).toEqual({ "1": true, "3": true });

    const g = await regen({ target: "guide" });
    expect(((await g.json()) as MobileRoadmapRegenerateResponse).roadmap.plan.guide).toBe("## راهنما\nمتن");

    const foreign = await prisma.roadmap.create({ data: { userId: other.id, topic: "x", title: "x", guide: "g", steps: STAGES as any } });
    expect((await regen({ target: "guide" }, foreign.id)).status).toBe(404);
    expect((await prisma.roadmap.findUnique({ where: { id: foreign.id } }))?.guide).toBe("g");

    const locked = await makeUser({ modules: ["ROADMAP"] });
    const lt = await tokenFor(locked.username!);
    expect((await aiRoadmapRegenerate(req(`/api/mobile/ai/roadmap/${id}/regenerate`, { target: "guide" }, lt), { params: { id } })).status).toBe(403);
    expect((await aiRoadmapRegenerate(req(`/api/mobile/ai/roadmap/${id}/regenerate`, { target: "guide" }), { params: { id } })).status).toBe(401);
  });
});

describe("AI exercise plan wrapper", () => {
  it("gates on EXERCISE, validates, creates an active plan, and falls back to the static template", async () => {
    const locked = await makeUser();
    expect((await aiExercise(req("/api/mobile/ai/exercise-plan", {}, await tokenFor(locked.username!)))).status).toBe(403);

    const u = await makeUser({ modules: ["EXERCISE"] });
    const t = await tokenFor(u.username!);
    const input = { level: "beginner", goal: "افزایش قدرت", equipment: "باشگاه کامل", gymDays: ["شنبه", "دوشنبه"], rulesAccepted: true };
    expect((await aiExercise(req("/api/mobile/ai/exercise-plan", { ...input, level: "pro" }, t))).status).toBe(400);
    expect((await aiExercise(req("/api/mobile/ai/exercise-plan", { ...input, rulesAccepted: false }, t))).status).toBe(400);

    const r1 = await aiExercise(req("/api/mobile/ai/exercise-plan", input, t));
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1).toMatchObject({ ok: true, generatedByAi: true, plan: { isActive: true, level: "beginner", planData: [{ day: "شنبه" }] } });
    expect(typeof b1.plan.editedAt).toBe("string");

    exerciseAiFails = true;
    const r2 = await aiExercise(req("/api/mobile/ai/exercise-plan", input, t));
    const b2 = await r2.json();
    expect(b2).toMatchObject({ ok: true, generatedByAi: false, plan: { isActive: true } });
    exerciseAiFails = false;
    // برنامه‌ی قبلی غیرفعال شد
    expect(await prisma.exercisePlan.count({ where: { userId: u.id, isActive: true } })).toBe(1);
  });
});

describe("bodyMetrics setting", () => {
  it("is synced", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const r = await doPush(t, [{ entity: "setting", key: "bodyMetrics", op: "upsert", data: { value: { weightKg: 80 } }, clientUpdatedAt: now() }]);
    expect(r.results[0]).toMatchObject({ status: "applied", serverRecord: { key: "bodyMetrics", value: { weightKg: 80 } } });
  });
});
