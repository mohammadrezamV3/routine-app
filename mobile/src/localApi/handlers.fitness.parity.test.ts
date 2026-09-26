// parity (فاز 2): هندلرهای LOCAL ِ بدنسازی/کالری در برابرِ *خودِ فایل‌های روتِ وب*
// (app/api/exercise/**، app/api/calorie/**) — همون الگوی handlers.parity.test.ts:
// روتِ وب با prisma/requireModule ِ ساختگی اجرا می‌شه و خروجیِ هر دو طرف (status +
// JSON) باید یکی باشه.
//
// دیتای اولیه‌ی هر دو طرف از *یک* fixtureِ Prisma ساخته می‌شه: طرفِ وب همون ردیف،
// طرفِ اپ از مسیرِ واقعیِ pull (serialize* ِ سرور ← remote* ِ آداپتورِ سینک). پس
// GETها روی دیتای seed شده *عینا* مقایسه می‌شن (حتی id و زمان‌ها). بعد از نوشتن،
// id/زمان‌های تازه (cuid ِ Prisma در برابرِ id ِ محلی، now ِ سرور در برابرِ now ِ
// محلی) فقط از نظرِ نوع مقایسه می‌شن — VOLATILE.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  type Row = Record<string, any>;
  const state = {
    plans: new Map<string, Row>(),
    logs: new Map<string, Row>(),
    foods: new Map<string, Row>(),
    targets: new Map<string, Row>(),
    birthDate: null as Date | null,
    media: [] as { nameKey: string; dataUrl: string }[],
    locked: new Set<string>(),
  };
  let seq = 0;
  const cuid = () => `cweb${String(++seq).padStart(21, "0")}`;
  const dk = (d: Date) => d.toISOString().slice(0, 10);
  const same = (a: any, b: any) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
  function matches(row: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([k, v]) => {
      const cur = row[k];
      if (v === null) return cur === null || cur === undefined;
      if (v instanceof Date || typeof v !== "object") return same(cur, v);
      if ("gte" in v || "lte" in v) return (!("gte" in v) || cur >= v.gte) && (!("lte" in v) || cur <= v.lte);
      if ("not" in v) return !same(cur, v.not);
      if ("in" in v) return v.in.includes(cur);
      return false;
    });
  }
  function order(rows: Row[], orderBy?: Row): Row[] {
    if (!orderBy) return rows;
    const [[k, dir]] = Object.entries(orderBy);
    return [...rows].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (dir === "desc" ? -1 : 1));
  }
  function table(map: Map<string, Row>, defaults: () => Row) {
    return {
      findFirst: async ({ where, orderBy }: any) => order([...map.values()].filter((r) => matches(r, where)), orderBy)[0] ?? null,
      findMany: async ({ where, orderBy, take }: any) => {
        const rows = order([...map.values()].filter((r) => matches(r, where)), orderBy);
        return take ? rows.slice(0, take) : rows;
      },
      updateMany: async ({ where, data }: any) => {
        const rows = [...map.values()].filter((r) => matches(r, where));
        for (const r of rows) Object.assign(r, data, { updatedAt: new Date() });
        return { count: rows.length };
      },
      create: async ({ data }: any) => {
        const now = new Date();
        const row = { id: cuid(), createdAt: now, updatedAt: now, syncEditedAt: null, syncWrittenAt: null, ...defaults(), ...data };
        map.set(row.id, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = map.get(where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    };
  }
  const logKey = (w: any) => `${w.userId_planId_date.planId}|${dk(w.userId_planId_date.date)}`;
  const prisma = {
    exercisePlan: table(state.plans, () => ({
      heightCm: null, weightKg: null, goal: null, hasPhysicalLimitation: false, disclaimerAcceptedAt: null, gymDays: null,
      trainingPhase: null, trainingMonth: null, equipment: null, generatedByAi: false, startDate: new Date(), isActive: true,
    })),
    exerciseLog: {
      findUnique: async ({ where }: any) => state.logs.get(logKey(where)) ?? null,
      findMany: async ({ where }: any) => [...state.logs.values()].filter((r) => matches(r, where)),
      upsert: async ({ where, create, update }: any) => {
        const key = logKey(where);
        const cur = state.logs.get(key);
        const row = cur ? Object.assign(cur, update) : { id: cuid(), completedItems: null, notes: null, ...create };
        state.logs.set(key, row);
        return row;
      },
    },
    foodLogEntry: table(state.foods, () => ({
      foodItemId: null, customName: null, customCalories: null, mealType: null, proteinG: null, carbsG: null, fatG: null, aiScanned: false, deletedAt: null,
    })),
    calorieTarget: table(state.targets, () => ({
      goal: null, mealsPerDay: null, mealBreakdown: null, proteinTargetG: null, carbsTargetG: null, fatTargetG: null, sex: null,
      ageYears: null, heightCm: null, weightKg: null, effectiveFrom: new Date(), effectiveTo: null,
    })),
    user: { findUnique: async () => ({ birthDate: state.birthDate }) },
    exerciseMedia: {
      findMany: async () => state.media.map((m) => ({ nameKey: m.nameKey })),
      findUnique: async ({ where }: any) => {
        const m = state.media.find((x) => x.nameKey === where.nameKey);
        return m ? { dataUrl: m.dataUrl } : null;
      },
    },
  };
  const NextResponse = {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), { status: init?.status ?? 200, headers: { "Content-Type": "application/json" } }),
  };
  return { state, prisma, NextResponse };
});

vi.mock("../shims/serverOnlyStub", () => ({
  default: {},
  prisma: fake.prisma,
  NextResponse: fake.NextResponse,
  NextRequest: Request,
  getRequestUser: async () => ({ userId: "u1", isSuperAdmin: false }),
  requireModule: async (module: string) =>
    fake.state.locked.has(String(module))
      ? { ok: false, response: fake.NextResponse.json({ error: "این بخش نیاز به اشتراک فعال دارد" }, { status: 403 }) }
      : { ok: true, userId: "u1", isSuperAdmin: false },
}));
// سقفِ نرخِ وب (GET ِ plan، substitute) — اپ عمدا نداره (handlers/exercise.ts)
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => true }));

const webRoute = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const webPlan = await webRoute("@/app/api/exercise/plan/route");
const webManual = await webRoute("@/app/api/exercise/plan/manual/route");
const webSub = await webRoute("@/app/api/exercise/plan/substitute/route");
const webLog = await webRoute("@/app/api/exercise/log/route");
const webLogRange = await webRoute("@/app/api/exercise/log/range/route");
const webMedia = await webRoute("@/app/api/exercise/media/route");
const webSchedule = await webRoute("@/app/api/exercise/schedule/route");
const webFoods = await webRoute("@/app/api/calorie/foods/route");
const webCal = await webRoute("@/app/api/calorie/log/route");
const webCalRange = await webRoute("@/app/api/calorie/log/range/route");
const webTarget = await webRoute("@/app/api/calorie/target/route");
const { serializeExercisePlan, serializeExerciseLog, serializeFoodLogEntry, serializeCalorieTarget, MAX_FOOD_KCAL } = await webRoute("@/lib/mobileSync");
const { EXERCISE_CATALOG } = await webRoute("@/lib/exerciseCatalog");
import { fitnessDb } from "@m/features/fitness/db";
import { catalogDb } from "@m/sync/catalog";
import { remoteCalorieTarget, remoteExerciseLog, remoteFoodLog, remotePlan } from "@m/sync/fitnessAdapter";
import { SyncEngine } from "@m/sync/syncEngine";
import { json as jsonRes, loggedInClient, TEST_USER, type Call } from "@m/sync/testUtils";
import { clearAccountSnapshot } from "./accountState";
import { httpCacheDb, storeCached } from "./cache";
import { configureLocalApi } from "./services";
import { dispatch } from "./dispatch";
import { LOCAL_MAX_FOOD_KCAL } from "./handlers/calorie";

const ORIGIN = "https://localhost";
const T0 = new Date("2026-09-20T08:00:00.000Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);
const day = (s: string) => new Date(s + "T00:00:00.000Z");

function webReq(path: string, init?: RequestInit): any {
  const r = new Request(ORIGIN + path, init);
  return Object.assign(r, { nextUrl: new URL(ORIGIN + path) });
}
const local = (path: string, init?: RequestInit) => dispatch(path, init, new URL(path, ORIGIN));
async function body(res: Response) {
  return { status: res.status, json: await res.json() };
}
const send = (method: string, b: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
const post = (b: unknown) => send("POST", b);

/** id و زمان‌های تازه‌ی نوشتن ← فقط نوع */
const VOLATILE = new Set(["id", "createdAt", "updatedAt", "startDate", "disclaimerAcceptedAt", "effectiveFrom"]);
function loose(v: any): any {
  if (Array.isArray(v)) return v.map(loose);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, VOLATILE.has(k) || (k === "effectiveTo" && x) ? typeof x : loose(x)]));
  }
  return v;
}
const looseBody = (b: { status: number; json: any }) => ({ status: b.status, json: loose(b.json) });

// ─── seed: یک fixture ← ردیفِ Prisma (وب) + ردیفِ pull‌شده (اپ) ─────────────

async function seedPlan(p: Record<string, any>) {
  const row: Record<string, any> = {
    userId: "u1", level: "custom", heightCm: null, weightKg: null, goal: null, hasPhysicalLimitation: false, gymDays: null,
    trainingPhase: "none", trainingMonth: null, equipment: null, generatedByAi: false, startDate: T0, isActive: true,
    createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null, ...p,
  };
  row.disclaimerAcceptedAt = row.createdAt; // remotePlan: rulesAcceptedAt ← createdAt
  fake.state.plans.set(row.id, row);
  await fitnessDb.plans.put(remotePlan(serializeExercisePlan(row)));
}

async function seedLog(l: { planId: string; date: string; completed: boolean; completedItems: string[] | null }, opts: { tombstone?: boolean } = {}) {
  const row = { id: "clog" + l.planId.slice(-4) + l.date.replace(/-/g, ""), userId: "u1", ...l, date: day(l.date), notes: null, createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null };
  fake.state.logs.set(`${l.planId}|${l.date}`, row);
  const mapped = remoteExerciseLog(serializeExerciseLog(row));
  await fitnessDb.exerciseLogs.put(opts.tombstone ? { ...mapped, completed: true, completedItems: ["x"], deletedAt: T0.toISOString() } : mapped);
}

async function seedFood(f: Record<string, any>) {
  const row: Record<string, any> = {
    userId: "u1", foodItemId: null, mealType: null, proteinG: null, carbsG: null, fatG: null, aiScanned: false, deletedAt: null,
    createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null, ...f, date: day(f.date),
  };
  fake.state.foods.set(row.id, row);
  await fitnessDb.calorieEntries.put(remoteFoodLog(serializeFoodLogEntry(row)));
}

async function seedTarget(t: Record<string, any>) {
  const row: Record<string, any> = {
    userId: "u1", goal: "maintain", mealsPerDay: 3, mealBreakdown: null, proteinTargetG: null, carbsTargetG: null, fatTargetG: null,
    sex: "male", ageYears: 30, heightCm: 180, weightKg: 80, effectiveTo: null, syncEditedAt: null, syncWrittenAt: null, ...t,
  };
  row.createdAt = row.effectiveFrom; // remoteCalorieTarget: createdAt ← effectiveFrom
  row.updatedAt = row.updatedAt ?? row.effectiveFrom;
  fake.state.targets.set(row.id, row);
  await fitnessDb.calorieTargets.put(remoteCalorieTarget(serializeCalorieTarget(row)));
}

/** /api/account ِ کش‌شده (birthDate + moduleAccess) — منبعِ needsAge و گاردها در اپ */
async function seedAccount(birthDate: string | null, modules = ["ROUTINE", "SLEEP", "TASKS", "EXERCISE", "CALORIE"]) {
  fake.state.birthDate = birthDate ? new Date(birthDate) : null;
  fake.state.locked = new Set(["EXERCISE", "CALORIE"].filter((m) => !modules.includes(m)));
  const user = { id: "u1", birthDate, moduleAccess: modules.map((module) => ({ module, active: true, expiresAt: null })) };
  await storeCached({ key: "/api/account", userId: "u1", status: 200, contentType: "application/json", body: JSON.stringify({ user }), storedAt: Date.now() });
}

let network: (c: Call) => Response | Promise<Response> = () => new Response(null, { status: 599 });

beforeEach(async () => {
  for (const m of [fake.state.plans, fake.state.logs, fake.state.foods, fake.state.targets]) m.clear();
  fake.state.birthDate = null;
  fake.state.media = [];
  fake.state.locked = new Set();
  network = () => new Response(null, { status: 599 });
  clearAccountSnapshot();
  await Promise.all([fitnessDb.delete().then(() => fitnessDb.open()), catalogDb.meta.clear(), catalogDb.media.clear(), httpCacheDb.responses.clear()]);
  const { tokens, api, kv } = await loggedInClient((c) => network(c));
  await tokens.setUser({ ...TEST_USER, modules: ["ROUTINE", "SLEEP", "TASKS", "EXERCISE", "CALORIE"] });
  configureLocalApi({ tokens, api, engine: new SyncEngine(api, kv, []), syncEnabled: true });
});

const P1 = "cplan000000000000000000001";
const P2 = "cplan000000000000000000002";
const P3 = "cplan000000000000000000003";
const catalogName = (i: number): string => EXERCISE_CATALOG[i].name;

async function seedPlans() {
  await seedPlan({ id: P1, startDate: at(0), gymDays: ["شنبه"], planData: [{ day: "شنبه", focus: "پا", items: ["اسکات"] }] });
  await seedPlan({
    id: P2,
    level: "intermediate",
    goal: "حجم",
    heightCm: 180,
    weightKg: 82.5,
    trainingMonth: 4,
    equipment: "باشگاه کامل",
    generatedByAi: true,
    trainingPhase: "bulk",
    startDate: at(10),
    createdAt: at(10),
    updatedAt: at(12),
    gymDays: ["شنبه", "دوشنبه", "چهارشنبه"],
    planData: [
      { day: "شنبه", focus: "سینه", items: [`${catalogName(0)} ۳×۱۰`, catalogName(1), catalogName(2)] },
      { day: "دوشنبه", focus: "پشت", items: ["حرکتِ ناشناخته‌ی خیالی", catalogName(3)] },
      { day: "چهارشنبه", focus: "پا", items: [catalogName(4)] },
    ],
  });
  await seedPlan({ id: P3, isActive: false, startDate: at(20), gymDays: ["جمعه"], planData: [{ day: "جمعه", focus: "x", items: ["y"] }] });
}

// ─── بدنسازی ────────────────────────────────────────────────────────────

describe("exercise/plan parity", () => {
  it("GET without a plan → {plan:null}", async () => {
    expect(await body(await local("/api/exercise/plan"))).toEqual(await body(await webPlan.GET()));
  });

  it("GET: latest active plan, every Prisma column identical", async () => {
    await seedPlans();
    const l = await body(await local("/api/exercise/plan"));
    expect(l).toEqual(await body(await webPlan.GET()));
    expect(l.json.plan.id).toBe(P2);
    expect(await body(await local("/api/exercise/schedule"))).toEqual(await body(await webSchedule.GET()));
  });

  const manual: [string, unknown][] = [
    ["valid", { rulesAccepted: true, planData: [{ day: "شنبه", focus: "  ", items: [" اسکات ", "", 12] }, { day: "دوشنبه", focus: "پشت", items: ["بارفیکس"] }] }],
    ["rules not accepted", { rulesAccepted: false, planData: [{ day: "شنبه", items: ["x"] }] }],
    ["empty planData", { rulesAccepted: true, planData: [] }],
    ["no planData", { rulesAccepted: true }],
    ["bad day", { rulesAccepted: true, planData: [{ day: "Monday", items: ["x"] }] }],
    ["duplicate day", { rulesAccepted: true, planData: [{ day: "شنبه", items: ["x"] }, { day: "شنبه", items: ["y"] }] }],
    ["day without items", { rulesAccepted: true, planData: [{ day: "شنبه", items: ["  "] }] }],
  ];
  it.each(manual)("POST manual %s → same status/body; read-back identical", async (_n, payload) => {
    await seedPlans();
    const w = looseBody(await body(await webManual.POST(webReq("/api/exercise/plan/manual", post(payload)))));
    const l = looseBody(await body(await local("/api/exercise/plan/manual", post(payload))));
    expect(l).toEqual(w);
    expect(looseBody(await body(await local("/api/exercise/plan")))).toEqual(looseBody(await body(await webPlan.GET())));
    expect(await body(await local("/api/exercise/schedule"))).toEqual(await body(await webSchedule.GET()));
    if (w.status === 200) {
      const rows = await fitnessDb.plans.toArray();
      expect(rows.filter((p) => p.isActive)).toHaveLength(1);
      // قبلی‌ها غیرفعال + dirty (push ِ isActive:false)، جدید dirty با قوانینِ پذیرفته
      expect(rows.find((p) => p.id === P2)).toMatchObject({ isActive: false, dirty: 1 });
      expect(rows.find((p) => p.isActive)).toMatchObject({ dirty: 1, level: "custom" });
      expect(rows.find((p) => p.isActive)?.rulesAcceptedAt).toBeTruthy();
    }
  });

  it("POST manual beyond the sync caps is rejected locally (the server push would reject it)", async () => {
    const payload = { rulesAccepted: true, planData: [{ day: "شنبه", items: Array.from({ length: 51 }, (_, i) => `حرکت ${i}`) }] };
    const l = await body(await local("/api/exercise/plan/manual", post(payload)));
    expect(l.status).toBe(400);
    expect(await fitnessDb.plans.count()).toBe(0);
  });
});

describe("exercise/plan/substitute parity", () => {
  const patch = (b: unknown) => send("PATCH", b);
  const cases: [string, number, () => unknown][] = [
    ["missing fields", 400, () => ({ planId: P2, day: "شنبه" })],
    ["unknown plan", 404, () => ({ planId: "cnope0000000000000000000", day: "شنبه", oldItem: "x" })],
    ["item not in day", 404, () => ({ planId: P2, day: "شنبه", oldItem: catalogName(3) })],
    ["unknown day", 404, () => ({ planId: P2, day: "جمعه", oldItem: catalogName(1) })],
    ["candidates (set suffix)", 200, () => ({ planId: P2, day: "شنبه", oldItem: `${catalogName(0)} ۳×۱۰` })],
    ["candidates (plain)", 200, () => ({ planId: P2, day: "چهارشنبه", oldItem: catalogName(4) })],
    ["no catalog match → 422", 422, () => ({ planId: P2, day: "دوشنبه", oldItem: "حرکتِ ناشناخته‌ی خیالی" })],
    ["apply newItem", 200, () => ({ planId: P2, day: "شنبه", oldItem: catalogName(1), newItem: "دمبل پرس" })],
  ];
  it.each(cases)("PATCH %s → %i", async (_n, status, make) => {
    await seedPlans();
    const payload = make();
    const w = looseBody(await body(await webSub.PATCH(webReq("/api/exercise/plan/substitute", patch(payload)))));
    const l = looseBody(await body(await local("/api/exercise/plan/substitute", patch(payload))));
    expect(w.status).toBe(status);
    expect(l).toEqual(w);
    expect(looseBody(await body(await local("/api/exercise/plan")))).toEqual(looseBody(await body(await webPlan.GET())));
    if ((payload as any).newItem) expect((await fitnessDb.plans.get(P2))?.dirty).toBe(1);
    else expect((await fitnessDb.plans.get(P2))?.dirty).toBe(0);
  });
});

describe("exercise/log parity", () => {
  beforeEach(async () => {
    await seedPlans();
    await seedLog({ planId: P2, date: "2026-09-19", completed: true, completedItems: ["a", "b"] });
    await seedLog({ planId: P2, date: "2026-09-20", completed: false, completedItems: null });
    // tombstone: سرور ردیف رو با completed=false/[] نگه می‌داره، اپ deletedAt
    await seedLog({ planId: P2, date: "2026-09-21", completed: false, completedItems: [] }, { tombstone: true });
    await seedLog({ planId: P1, date: "2026-09-19", completed: true, completedItems: ["z"] });
  });

  it.each([
    `?planId=${P2}&date=2026-09-19`,
    `?planId=${P2}&date=2026-09-20`,
    `?planId=${P2}&date=2026-09-21`,
    `?planId=${P2}&date=2026-09-22`,
    `?planId=${P1}&date=2026-09-19`,
    `?date=2026-09-19`,
    `?planId=${P2}&date=2026-02-30`,
    `?planId=${P2}`,
  ])("GET %s", async (q) => {
    const path = "/api/exercise/log" + q;
    expect(await body(await local(path))).toEqual(await body(await webLog.GET(webReq(path))));
  });

  const posts: [string, unknown][] = [
    ["new day with items", { planId: P2, date: "2026-09-22", completed: false, completedItems: ["a", 5, "x".repeat(300)] }],
    ["update, items omitted keeps them", { planId: P2, date: "2026-09-19", completed: false }],
    ["update with items", { planId: P2, date: "2026-09-19", completed: 1, completedItems: [] }],
    ["revive tombstone without items", { planId: P2, date: "2026-09-21", completed: true }],
    ["new day without items", { planId: P1, date: "2026-09-23", completed: true }],
    ["missing planId", { date: "2026-09-19", completed: true }],
    ["bad date", { planId: P2, date: "19-09-2026", completed: true }],
  ];
  it.each(posts)("POST %s → same status/body; read-back + range identical", async (_n, payload) => {
    const w = await body(await webLog.POST(webReq("/api/exercise/log", post(payload))));
    const l = await body(await local("/api/exercise/log", post(payload)));
    expect(l).toEqual(w);
    const p = payload as any;
    if (p.planId && p.date) {
      const q = `/api/exercise/log?planId=${p.planId}&date=${p.date}`;
      expect(await body(await local(q))).toEqual(await body(await webLog.GET(webReq(q))));
    }
    const r = `/api/exercise/log/range?planId=${P2}&start=2026-09-01&end=2026-09-30`;
    expect(await body(await local(r))).toEqual(await body(await webLogRange.GET(webReq(r))));
    if (w.status === 200) {
      const row = await fitnessDb.exerciseLogs.where("[planId+date]").equals([p.planId, p.date]).first();
      expect(row).toMatchObject({ dirty: 1, deletedAt: null });
    }
  });

  it.each([
    `?planId=${P2}&start=2026-09-01&end=2026-09-30`,
    `?planId=${P2}&start=2026-09-20&end=2026-09-20`,
    `?planId=${P1}&start=2026-09-01&end=2026-09-30`,
    `?planId=${P2}&start=2026-09-30&end=2026-09-01`,
    `?planId=${P2}&start=2020-01-01&end=2026-09-30`,
    `?start=2026-09-01&end=2026-09-30`,
    `?planId=${P2}&start=bad&end=2026-09-30`,
  ])("range %s", async (q) => {
    const path = "/api/exercise/log/range" + q;
    expect(await body(await local(path))).toEqual(await body(await webLogRange.GET(webReq(path))));
  });
});

describe("exercise/media parity", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgo=";
  beforeEach(() => {
    fake.state.media = [
      { nameKey: "پرس سینه", dataUrl: PNG },
      { nameKey: "اسکات", dataUrl: "data:image/webp;base64,UklGRg==" },
    ];
  });

  it("catalog downloaded: keys + cached image + missing image, no network", async () => {
    await catalogDb.meta.put({
      key: "catalog",
      version: "v1",
      etag: null,
      foods: [],
      exercises: [],
      exerciseMedia: fake.state.media.map((m) => ({ key: m.nameKey, updatedAt: "2026-09-01T00:00:00.000Z" })),
      checkedAt: new Date().toISOString(),
    });
    await catalogDb.media.put({ key: "پرس سینه", dataUrl: PNG, updatedAt: "2026-09-01T00:00:00.000Z", etag: null });
    let calls = 0;
    network = () => (calls++, new Response(null, { status: 599 }));
    expect(await body(await local("/api/exercise/media"))).toEqual(await body(await webMedia.GET(webReq("/api/exercise/media"))));
    // «ي» ِ عربی و نیم‌فاصله همون کلید (normalizeFa)
    for (const name of ["پرس سينه", "حرکتِ بی‌عکس"]) {
      const q = `/api/exercise/media?name=${encodeURIComponent(name)}`;
      expect(await body(await local(q))).toEqual(await body(await webMedia.GET(webReq(q))));
    }
    expect(calls).toBe(0);
  });

  it("catalog not downloaded yet → CACHED forward of the same web route", async () => {
    network = async (c) => {
      const res = await webMedia.GET(webReq(c.path));
      return jsonRes(res.status, await res.json());
    };
    for (const q of ["/api/exercise/media", "/api/exercise/media?name=%D8%A7%D8%B3%DA%A9%D8%A7%D8%AA"]) {
      const l = await local(q);
      expect(await body(l)).toEqual(await body(await webMedia.GET(webReq(q))));
    }
    // دومی از کش (بدونِ شبکه)
    network = () => new Response(null, { status: 599 });
    const hit = await local("/api/exercise/media");
    expect(hit.headers.get("X-Arion-Cache")).toBe("hit");
  });
});

describe("exercise module lock", () => {
  it.each(["/api/exercise/plan", `/api/exercise/log?planId=${P1}&date=2026-09-19`, "/api/exercise/media"])("%s → same 403", async (path) => {
    await seedAccount(null, ["ROUTINE", "SLEEP", "TASKS", "CALORIE"]);
    const web = path.startsWith("/api/exercise/plan") ? await webPlan.GET() : path.includes("log") ? await webLog.GET(webReq(path)) : await webMedia.GET(webReq(path));
    expect(await body(await local(path))).toEqual(await body(web));
  });
});

// ─── کالری ──────────────────────────────────────────────────────────────

describe("calorie/foods parity", () => {
  it.each(["", "برنج", "  نان ", "zzz", "ا".repeat(200)])("GET ?q=%j", async (q) => {
    const path = `/api/calorie/foods?q=${encodeURIComponent(q)}`;
    expect(await body(await local(path))).toEqual(await body(await webFoods.GET(webReq(path))));
  });

  it("works without a session, like the web route", async () => {
    const { tokens, api, kv } = await loggedInClient(() => new Response(null, { status: 599 }));
    await tokens.clear();
    configureLocalApi({ tokens, api, engine: new SyncEngine(api, kv, []), syncEnabled: false });
    expect(tokens.isLoggedIn()).toBe(false);
    expect(await body(await local("/api/calorie/foods?q=x"))).toEqual(await body(await webFoods.GET(webReq("/api/calorie/foods?q=x"))));
    expect((await local("/api/calorie/log?date=2026-09-20")).status).toBe(401);
  });
});

describe("calorie/log parity", () => {
  beforeEach(async () => {
    await seedFood({ id: "cfood000000000000000000001", date: "2026-09-20", customName: "برنج", customCalories: 250, grams: 150, mealType: "lunch", createdAt: at(2) });
    await seedFood({
      id: "cfood000000000000000000002",
      date: "2026-09-20",
      customName: "مرغ (اسکن)",
      customCalories: 333,
      grams: 7,
      mealType: "snack2",
      proteinG: 12.34,
      carbsG: 0.1,
      fatG: 7,
      aiScanned: true,
      createdAt: at(1),
    });
    await seedFood({ id: "cfood000000000000000000003", date: "2026-09-20", customName: "حذف‌شده", customCalories: 100, grams: 100, deletedAt: at(3), createdAt: at(3) });
    await seedFood({ id: "cfood000000000000000000004", date: "2026-09-18", customName: "سیب", customCalories: 52, grams: 100, mealType: null, createdAt: at(0) });
  });

  it.each(["2026-09-20", "2026-09-18", "2026-09-19", "bad", ""])("GET ?date=%j", async (d) => {
    const path = `/api/calorie/log?date=${d}`;
    expect(await body(await local(path))).toEqual(await body(await webCal.GET(webReq(path))));
  });

  const posts: [string, unknown][] = [
    ["catalog entry", { date: "2026-09-20", customName: "نان", customCalories: 187, grams: 70, mealType: "breakfast" }],
    ["float kcal, custom meal key", { date: "2026-09-20", customName: "x", customCalories: 0.5, grams: 3, mealType: "meal_2_abc" }],
    ["AI scan with macros", { date: "2026-09-20", customName: "پیتزا", customCalories: 812, grams: 310, mealType: "dinner", proteinG: 31.5, carbsG: 90, fatG: 33.3, aiScanned: true }],
    ["manual macros, no aiScanned", { date: "2026-09-20", customName: "y", customCalories: 100, grams: 50, proteinG: 0, carbsG: 10, fatG: 1 }],
    ["aiScanned without macros → false", { date: "2026-09-20", customName: "z", customCalories: 10, grams: 10, aiScanned: true }],
    ["long name clamped", { date: "2026-09-20", customName: "ن".repeat(120), customCalories: 10, grams: 10 }],
    ["partial macros", { date: "2026-09-20", customName: "x", customCalories: 10, grams: 10, proteinG: 5 }],
    ["macro out of range", { date: "2026-09-20", customName: "x", customCalories: 10, grams: 10, proteinG: 5, carbsG: 2001, fatG: 1 }],
    ["zero kcal", { date: "2026-09-20", customName: "x", customCalories: 0, grams: 10 }],
    ["negative kcal", { date: "2026-09-20", customName: "x", customCalories: -5, grams: 10 }],
    ["string kcal", { date: "2026-09-20", customName: "x", customCalories: "10", grams: 10 }],
    ["too many grams", { date: "2026-09-20", customName: "x", customCalories: 10, grams: 10001 }],
    ["no name", { date: "2026-09-20", customCalories: 10, grams: 10 }],
    ["meal key too long", { date: "2026-09-20", customName: "x", customCalories: 10, grams: 10, mealType: "m".repeat(21) }],
    ["bad date", { date: "2026-09-31", customName: "x", customCalories: 10, grams: 10 }],
  ];
  it.each(posts)("POST %s → same status/body; read-back identical", async (_n, payload) => {
    const w = looseBody(await body(await webCal.POST(webReq("/api/calorie/log", post(payload)))));
    const l = looseBody(await body(await local("/api/calorie/log", post(payload))));
    expect(l).toEqual(w);
    // ترتیبِ createdAt: ثبتِ تازه‌ی هر دو طرف آخرِ لیسته
    const q = "/api/calorie/log?date=2026-09-20";
    expect(looseBody(await body(await local(q)))).toEqual(looseBody(await body(await webCal.GET(webReq(q)))));
    const dirty = await fitnessDb.calorieEntries.where("dirty").equals(1).toArray();
    expect(dirty).toHaveLength(w.status === 200 ? 1 : 0);
  });

  it("POST with a malformed JSON body → same error", async () => {
    const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{nope" };
    expect(await body(await local("/api/calorie/log", init))).toEqual(await body(await webCal.POST(webReq("/api/calorie/log", init))));
  });

  it.each(["cfood000000000000000000001", "cfood000000000000000000003", "cnope", ""])("DELETE ?id=%j → same; soft-delete read-back", async (id) => {
    const path = `/api/calorie/log?id=${id}`;
    const w = await body(await webCal.DELETE(webReq(path, { method: "DELETE" })));
    const l = await body(await local(path, { method: "DELETE" }));
    expect(l).toEqual(w);
    const q = "/api/calorie/log?date=2026-09-20";
    expect(await body(await local(q))).toEqual(await body(await webCal.GET(webReq(q))));
    if (id === "cfood000000000000000000001") expect(await fitnessDb.calorieEntries.get(id)).toMatchObject({ dirty: 1, deletedAt: expect.any(String) });
    if (id === "cfood000000000000000000003") expect((await fitnessDb.calorieEntries.get(id))?.dirty).toBe(0);
  });

  it.each([
    ["2026-09-01", "2026-09-30"],
    ["2026-09-19", "2026-09-20"],
    ["2026-09-30", "2026-09-01"],
    ["2020-01-01", "2026-09-30"],
    ["x", "2026-09-30"],
  ])("range %s..%s", async (from, to) => {
    const path = `/api/calorie/log/range?from=${from}&to=${to}`;
    const w = await body(await webCalRange.GET(webReq(path)));
    const l = await body(await local(path));
    expect(l.status).toBe(w.status);
    // وب فقط روی date مرتب می‌کنه (ترتیبِ ردیف‌های یک روز مشخص نیست) ← مقایسه‌ی مجموعه‌ای + ترتیبِ روزها
    if (w.status === 200) {
      const byId = (a: any, b: any) => a.id.localeCompare(b.id);
      expect([...l.json.entries].sort(byId)).toEqual([...w.json.entries].sort(byId));
      expect(l.json.entries.map((e: any) => e.date)).toEqual(w.json.entries.map((e: any) => e.date));
    } else expect(l.json).toEqual(w.json);
  });

  it("local kcal cap equals the sync push cap", () => {
    expect(LOCAL_MAX_FOOD_KCAL).toBe(MAX_FOOD_KCAL);
  });
});

describe("calorie/target parity", () => {
  const targetOf = (goal = "lose", extra: Record<string, unknown> = {}) => ({ goal, mealsPerDay: 4, sex: "female", heightCm: 165, weightKg: 62, ...extra });

  it.each([null, "1994-03-21T00:00:00.000Z"])("GET without a target (birthDate=%s)", async (bd) => {
    await seedAccount(bd);
    expect(await body(await local("/api/calorie/target"))).toEqual(await body(await webTarget.GET()));
  });

  it("GET: latest open target, every column identical", async () => {
    await seedAccount("1994-03-21T00:00:00.000Z");
    await seedTarget({ id: "ctarget00000000000000001", effectiveFrom: at(0), effectiveTo: at(5), dailyTargetKcal: 1900 });
    await seedTarget({
      id: "ctarget00000000000000002",
      effectiveFrom: at(5),
      dailyTargetKcal: 2100,
      mealBreakdown: [{ key: "breakfast", label: "صبحانه", kcal: 700 }, { key: "snack1", label: "میان‌وعده", kcal: 1400 }],
      proteinTargetG: 120,
    });
    await seedTarget({ id: "ctarget00000000000000003", effectiveFrom: at(1), dailyTargetKcal: 1500 });
    const l = await body(await local("/api/calorie/target"));
    expect(l).toEqual(await body(await webTarget.GET()));
    expect(l.json.target.id).toBe("ctarget00000000000000002");
  });

  const posts: [string, string | null, unknown][] = [
    ["computed with birthDate + active plan", "1994-03-21T00:00:00.000Z", targetOf("gain", { ageYears: 50 })],
    ["age from input", null, targetOf("maintain", { ageYears: 27, sex: "male", mealsPerDay: 6 })],
    ["age required", null, targetOf()],
    ["age out of range", null, targetOf("lose", { ageYears: 9 })],
    ["bad goal", null, targetOf("bulk", { ageYears: 30 })],
    ["bad meals", null, targetOf("lose", { ageYears: 30, mealsPerDay: 7 })],
    ["bad sex", null, targetOf("lose", { ageYears: 30, sex: "x" })],
    ["bad height", null, targetOf("lose", { ageYears: 30, heightCm: 20 })],
    ["bad weight", null, targetOf("lose", { ageYears: 30, weightKg: "70" })],
    ["no body", null, null],
  ];
  it.each(posts)("POST %s → same status/body; read-back identical", async (_n, bd, payload) => {
    await seedAccount(bd);
    await seedPlan({ id: P2, gymDays: ["شنبه", "دوشنبه", "چهارشنبه", "جمعه"], trainingPhase: "cut", planData: [{ day: "شنبه", focus: "x", items: ["y"] }] });
    await seedTarget({ id: "ctarget00000000000000001", effectiveFrom: at(0), dailyTargetKcal: 1900 });
    const w = looseBody(await body(await webTarget.POST(webReq("/api/calorie/target", post(payload)))));
    const l = looseBody(await body(await local("/api/calorie/target", post(payload))));
    expect(l).toEqual(w);
    expect(looseBody(await body(await local("/api/calorie/target")))).toEqual(looseBody(await body(await webTarget.GET())));
    if (w.status === 200) {
      const rows = await fitnessDb.calorieTargets.toArray();
      expect(rows.find((t) => t.id === "ctarget00000000000000001")).toMatchObject({ effectiveTo: expect.any(String), dirty: 1 });
      expect(rows.find((t) => !t.effectiveTo)).toMatchObject({ synced: false, dirty: 1 });
    }
  });

  const patches: [string, boolean, unknown][] = [
    ["meals + macros", true, { mealBreakdown: [{ key: "breakfast", label: " صبحانه ", kcal: 600.4 }, { key: "dinner", label: "شام", kcal: 900 }], proteinTargetG: "120", carbsTargetG: "", fatTargetG: null }],
    ["no target yet", false, { mealBreakdown: [{ key: "a", label: "a", kcal: 800 }] }],
    ["empty label", true, { mealBreakdown: [{ key: "a", label: " ", kcal: 800 }] }],
    ["too few kcal", true, { mealBreakdown: [{ key: "a", label: "a", kcal: 400 }] }],
    ["bad macro", true, { mealBreakdown: [{ key: "a", label: "a", kcal: 800 }], fatTargetG: 3000 }],
    ["nine meals", true, { mealBreakdown: Array.from({ length: 9 }, (_, i) => ({ key: `m${i}`, label: "x", kcal: 100 })) }],
  ];
  it.each(patches)("PATCH %s", async (_n, withTarget, payload) => {
    if (withTarget) await seedTarget({ id: "ctarget00000000000000002", effectiveFrom: at(5), dailyTargetKcal: 2100 });
    const w = looseBody(await body(await webTarget.PATCH(webReq("/api/calorie/target", send("PATCH", payload)))));
    const l = looseBody(await body(await local("/api/calorie/target", send("PATCH", payload))));
    expect(l).toEqual(w);
    expect(looseBody(await body(await local("/api/calorie/target")))).toEqual(looseBody(await body(await webTarget.GET())));
    if (w.status === 200) {
      // هدفِ شناخته‌شده‌ی سرور ← push ِ بعدی kind=meals
      expect(await fitnessDb.calorieTargets.get("ctarget00000000000000002")).toMatchObject({ synced: true, dirty: 1 });
    }
  });

  it("PATCH right after a local POST marks the unsynced target mealsEdited", async () => {
    await seedAccount(null);
    await local("/api/calorie/target", post(targetOf("lose", { ageYears: 30 })));
    const res = await local("/api/calorie/target", send("PATCH", { mealBreakdown: [{ key: "a", label: "a", kcal: 800 }] }));
    expect(res.status).toBe(200);
    const open = (await fitnessDb.calorieTargets.toArray()).find((t) => !t.effectiveTo);
    expect(open).toMatchObject({ synced: false, mealsEdited: true, dailyTargetKcal: 800, dirty: 1 });
  });

  it("locked CALORIE → same 403", async () => {
    await seedAccount(null, ["ROUTINE", "SLEEP", "TASKS", "EXERCISE"]);
    expect(await body(await local("/api/calorie/target"))).toEqual(await body(await webTarget.GET()));
    expect(await body(await local("/api/calorie/log?date=2026-09-20"))).toEqual(await body(await webCal.GET(webReq("/api/calorie/log?date=2026-09-20"))));
  });
});
