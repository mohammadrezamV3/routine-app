// parity: هندلرهای LOCAL ِ localApi در برابرِ *خودِ فایل‌های روتِ وب*
// (app/api/**/route.ts) روی همون ردیف‌ها. روتِ وب با prisma/getRequestUser/
// requireModule ِ ساختگی اجرا می‌شه (همه‌ی ماژول‌های سرور-فقط در vitest به
// shims/serverOnlyStub می‌رسن — tooling/webCompat.ts — پس همون یک ماژول mock می‌شه)،
// و خروجیِ هر دو طرف (status + JSON) باید یکی باشه. تنها استثنای مستند:
// `updatedAt` ِ تنظیمات (زمانِ سرور در برابرِ زمانِ ویرایشِ محلی) و `id` ِ POSTِ
// روزانه (cuid ِ Prisma در برابرِ کلیدِ روز) — این دوتا فقط از نظرِ نوع مقایسه می‌شن.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  type Daily = { id: string; userId: string; date: Date; completedItems: any; wakeUpAt: Date | null };
  const state = {
    daily: new Map<string, Daily>(),
    settings: new Map<string, { value: any; updatedAt: Date }>(),
    plans: [] as { isActive: boolean; startDate: Date; gymDays: any }[],
    moduleOk: true,
  };
  const k = (d: Date) => d.toISOString().slice(0, 10);
  let seq = 0;
  const prisma = {
    dailyEntry: {
      findUnique: async ({ where }: any) => state.daily.get(k(where.userId_date.date)) ?? null,
      findMany: async ({ where, select }: any) => {
        let rows = [...state.daily.values()];
        if (where.date) rows = rows.filter((r) => r.date >= where.date.gte && r.date <= where.date.lte);
        return select?.date ? rows.map((r) => ({ date: r.date })) : rows;
      },
      upsert: async ({ where, create, update }: any) => {
        const key = k(where.userId_date.date);
        const cur = state.daily.get(key);
        const row = cur ? { ...cur, ...update } : { id: `c${++seq}`, ...create };
        state.daily.set(key, row);
        return row;
      },
    },
    userSetting: {
      findUnique: async ({ where }: any) => state.settings.get(where.userId_key.key) ?? null,
      upsert: async ({ where, create, update }: any) => {
        state.settings.set(where.userId_key.key, { value: (state.settings.has(where.userId_key.key) ? update : create).value, updatedAt: new Date() });
        return {};
      },
    },
    exercisePlan: {
      findFirst: async () => {
        const act = state.plans.filter((p) => p.isActive).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        return act[0] ? { gymDays: act[0].gymDays } : null;
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
  requireModule: async () =>
    fake.state.moduleOk
      ? { ok: true, userId: "u1" }
      : { ok: false, response: fake.NextResponse.json({ error: "این بخش نیاز به اشتراک فعال دارد" }, { status: 403 }) },
}));

// روت‌های وب با import پویا (specifierِ غیرلیترال): vitest مثلِ بقیه از pipelineِ
// Vite (aliasها + serverOnlyGuard ← stubِ mockشده) بارشون می‌کنه، ولی tsc ِ
// اپ دنبالشون نمی‌ره (گرافِ سرور — lib/auth، next-auth — با تایپ‌های shimِ اپ
// type-check نمی‌شه و نباید بشه).
const webRoute = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const webDaily = await webRoute("@/app/api/tasks/daily/route");
const webRange = await webRoute("@/app/api/tasks/daily/range/route");
const webKeys = await webRoute("@/app/api/tasks/daily/keys/route");
const webSettings = await webRoute("@/app/api/settings/[key]/route");
const webSchedule = await webRoute("@/app/api/exercise/schedule/route");
import { db } from "@m/db/db";
import { fitnessDb } from "@m/features/fitness/db";
import { SyncEngine } from "@m/sync/syncEngine";
import { loggedInClient, TEST_USER } from "@m/sync/testUtils";
import { configureLocalApi } from "./services";
import { dispatch } from "./dispatch";

const ORIGIN = "https://localhost";

function webReq(path: string, init?: RequestInit): any {
  const r = new Request(ORIGIN + path, init);
  return Object.assign(r, { nextUrl: new URL(ORIGIN + path) });
}

async function local(path: string, init?: RequestInit): Promise<Response> {
  return dispatch(path, init, new URL(path, ORIGIN));
}

async function body(res: Response) {
  return { status: res.status, json: await res.json() };
}

const post = (b: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

async function seed() {
  fake.state.daily.clear();
  fake.state.settings.clear();
  fake.state.plans = [];
  fake.state.moduleOk = true;
  await Promise.all([db.dailyEntries.clear(), db.settings.clear(), fitnessDb.plans.clear()]);
  const rows: { date: string; completedItems: Record<string, boolean>; wakeUpAt: string | null; deleted?: boolean }[] = [
    { date: "2026-09-20", completedItems: { a: true, b: false }, wakeUpAt: "2026-09-20T03:30:00.000Z" },
    // «روزِ خالی»: در وب ردیفِ خالی، در اپ tombstoneِ pull شده
    { date: "2026-09-21", completedItems: {}, wakeUpAt: null, deleted: true },
    { date: "2026-09-25", completedItems: { x: true }, wakeUpAt: null },
  ];
  for (const r of rows) {
    fake.state.daily.set(r.date, {
      id: "c-" + r.date,
      userId: "u1",
      date: new Date(r.date + "T00:00:00.000Z"),
      completedItems: r.completedItems,
      wakeUpAt: r.wakeUpAt ? new Date(r.wakeUpAt) : null,
    });
    await db.dailyEntries.put({
      date: r.date,
      completedItems: r.completedItems,
      wakeUpAt: r.wakeUpAt,
      updatedAt: "2026-09-25T10:00:00.000Z",
      deletedAt: r.deleted ? "2026-09-25T10:00:00.000Z" : null,
      dirty: 0,
    });
  }
  const occ = [{ id: "o1", name: "مطالعه", jsDay: 1, time: "08:00", importance: "high" }];
  fake.state.settings.set("customOccurrences", { value: occ, updatedAt: new Date() });
  fake.state.settings.set("outingDates", { value: null, updatedAt: new Date() });
  await db.settings.put({ key: "customOccurrences", value: occ, updatedAt: "2026-09-25T10:00:00.000Z", deletedAt: null, dirty: 0 });
  await db.settings.put({ key: "outingDates", value: null, updatedAt: "2026-09-25T10:00:00.000Z", deletedAt: "2026-09-25T10:00:00.000Z", dirty: 0 });
}

beforeEach(async () => {
  const { tokens, api, kv } = await loggedInClient(() => new Response(null, { status: 599 }));
  await tokens.setUser({ ...TEST_USER, modules: ["ROUTINE", "SLEEP", "TASKS", "EXERCISE"] });
  configureLocalApi({ tokens, api, engine: new SyncEngine(api, kv, []), syncEnabled: false });
  await seed();
});

describe("tasks/daily parity", () => {
  it.each(["2026-09-20", "2026-09-21", "2026-09-22", " 2026-09-25 ", "2026-02-31", "bad", ""])("GET ?date=%j", async (date) => {
    const q = `/api/tasks/daily?date=${encodeURIComponent(date)}`;
    expect(await body(await local(q))).toEqual(await body(await webDaily.GET(webReq(q))));
  });

  it("GET without date", async () => {
    expect(await body(await local("/api/tasks/daily"))).toEqual(await body(await webDaily.GET(webReq("/api/tasks/daily"))));
  });

  const posts: [string, unknown][] = [
    ["normal", { date: "2026-09-22", tasks: { a: true, b: 0, c: "yes" }, wake: "2026-09-22T04:00:00+03:30" }],
    ["bad wake", { date: "2026-09-23", tasks: {}, wake: "not-a-date" }],
    ["long key dropped", { date: "2026-09-24", tasks: { ["k".repeat(201)]: true, ok: 1 }, wake: null }],
    ["overwrites existing", { date: "2026-09-20", tasks: { z: true } }],
    ["bad date", { date: "2026-13-01", tasks: {} }],
    ["no date", { tasks: {} }],
  ];
  it.each(posts)("POST %s → same status/body, same read-back", async (_n, payload) => {
    const w = await body(await webDaily.POST(webReq("/api/tasks/daily", post(payload))));
    const l = await body(await local("/api/tasks/daily", post(payload)));
    expect(l.status).toBe(w.status);
    if (w.status === 200) {
      expect(Object.keys(l.json).sort()).toEqual(Object.keys(w.json).sort());
      expect(l.json.ok).toBe(true);
      expect(typeof l.json.id).toBe(typeof w.json.id);
      const date = (payload as any).date;
      const q = `/api/tasks/daily?date=${date}`;
      expect(await body(await local(q))).toEqual(await body(await webDaily.GET(webReq(q))));
      const row = await db.dailyEntries.get(date);
      expect(row?.dirty).toBe(1);
    } else {
      expect(l.json).toEqual(w.json);
    }
  });

  it("POST with a malformed JSON body → same error", async () => {
    const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{nope" };
    expect(await body(await local("/api/tasks/daily", init))).toEqual(await body(await webDaily.POST(webReq("/api/tasks/daily", init))));
  });

  it.each([
    ["2026-09-19", "2026-09-26"],
    ["2026-09-21", "2026-09-21"],
    ["2026-09-26", "2026-09-19"],
    ["2020-01-01", "2026-01-01"],
    ["x", "2026-01-01"],
  ])("range %s..%s", async (from, to) => {
    const q = `/api/tasks/daily/range?from=${from}&to=${to}`;
    expect(await body(await local(q))).toEqual(await body(await webRange.GET(webReq(q))));
  });

  it("keys (as a set)", async () => {
    const l = await body(await local("/api/tasks/daily/keys"));
    const w = await body(await webKeys.GET());
    expect(l.status).toBe(w.status);
    expect([...l.json.keys].sort()).toEqual([...w.json.keys].sort());
  });
});

describe("settings/[key] parity", () => {
  const shape = (b: { status: number; json: any }) => ({
    status: b.status,
    json: b.json && "updatedAt" in b.json ? { ...b.json, updatedAt: b.json.updatedAt === null ? null : typeof b.json.updatedAt } : b.json,
  });
  const webGet = async (key: string) => shape(await body(await webSettings.GET(webReq(`/api/settings/${key}`), { params: { key } })));
  const webPost = async (key: string, init: RequestInit) => body(await webSettings.POST(webReq(`/api/settings/${key}`, init), { params: { key } }));

  it.each(["customOccurrences", "outingDates", "medications", "pushSentLog", "routineAssistantUses", "nope"])("GET %s", async (key) => {
    expect(shape(await body(await local(`/api/settings/${key}`)))).toEqual(await webGet(key));
  });

  it.each([
    ["wakeSleepTimes", { value: { wake: "07:00", sleep: "23:30" } }],
    ["dashboardPrefs", { value: { showReminders: false } }],
    ["medications", { value: null }],
    ["theme", {}],
    ["pushSentLog", { value: 1 }],
    ["tradeChecklistSeeded", { value: true }],
  ])("POST %s → same status/body and read-back", async (key, payload) => {
    const w = await webPost(key, post(payload));
    const l = await body(await local(`/api/settings/${key}`, post(payload)));
    expect(l).toEqual(w);
    expect(shape(await body(await local(`/api/settings/${key}`)))).toEqual(await webGet(key));
    if (w.status === 200) expect((await db.settings.get(key))?.dirty).toBe(1);
  });

  it("value over MAX_SETTING_VALUE_BYTES → same 413", async () => {
    const init = post({ value: "x".repeat(70 * 1024) });
    const w = await webPost("medications", init);
    const l = await body(await local("/api/settings/medications", post({ value: "x".repeat(70 * 1024) })));
    expect(w.status).toBe(413);
    expect(l).toEqual(w);
  });

  it("percent-encoded key is decoded like Next params", async () => {
    const l = await body(await local("/api/settings/%63ustomOccurrences"));
    expect(shape(l)).toEqual(await webGet("customOccurrences"));
  });
});

describe("exercise/schedule parity", () => {
  it("no plan → []", async () => {
    expect(await body(await local("/api/exercise/schedule"))).toEqual(await body(await webSchedule.GET()));
  });

  it("latest active plan wins; non-strings filtered", async () => {
    const plans = [
      { id: "p1", isActive: true, startDate: "2026-09-01T00:00:00.000Z", gymDays: ["sat", "mon"] },
      { id: "p2", isActive: true, startDate: "2026-09-10T00:00:00.000Z", gymDays: ["sun", 3, "tue"] },
      { id: "p3", isActive: false, startDate: "2026-09-20T00:00:00.000Z", gymDays: ["fri"] },
    ];
    fake.state.plans = plans.map((p) => ({ isActive: p.isActive, startDate: new Date(p.startDate), gymDays: p.gymDays }));
    for (const p of plans) await fitnessDb.plans.put({ ...(p as any), deletedAt: null, dirty: 0, updatedAt: p.startDate });
    const l = await body(await local("/api/exercise/schedule"));
    expect(l).toEqual(await body(await webSchedule.GET()));
    expect(l.json.gymDays).toEqual(["sun", "tue"]);
  });

  it("locked module → same 403 as requireModule", async () => {
    fake.state.moduleOk = false;
    const { tokens, api, kv } = await loggedInClient(() => new Response(null, { status: 599 }));
    await tokens.setUser({ ...TEST_USER, modules: ["ROUTINE", "SLEEP", "TASKS"] });
    configureLocalApi({ tokens, api, engine: new SyncEngine(api, kv, []), syncEnabled: false });
    expect(await body(await local("/api/exercise/schedule"))).toEqual(await body(await webSchedule.GET()));
  });
});
