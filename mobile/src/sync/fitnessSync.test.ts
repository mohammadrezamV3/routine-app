import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { ExercisePlanRecord, FoodLogEntryRecord, SyncChange } from "@m/lib/api-contract";
import { fitnessDb } from "@m/features/fitness/db";
import { addCalorieEntry, archivePlan, createManualPlan, setCalorieTarget, toggleTodayItem } from "@m/features/fitness/lib/repo";
import { newLocalId } from "@m/features/fitness/lib/id";
import { db as roadmapDb } from "@m/features/roadmaps/db";
import { db as coreDb } from "@m/db/db";
import { calorieEntryToChange, calorieTargetToChange, remoteFoodLog, remotePlan } from "./fitnessAdapter";
import { SyncEngine } from "./syncEngine";
import { mainChannel } from "./channels";
import { wipeAllLocalData } from "./localData";
import { Call, json, loggedInClient } from "./testUtils";

const T1 = "2026-09-21T10:00:00.000Z";

function planRecord(p: Partial<ExercisePlanRecord> & { id: string }): ExercisePlanRecord {
  return {
    level: "custom",
    goal: null,
    heightCm: null,
    weightKg: null,
    hasPhysicalLimitation: false,
    gymDays: ["شنبه"],
    trainingPhase: "none",
    trainingMonth: null,
    equipment: null,
    generatedByAi: false,
    startDate: T1,
    isActive: true,
    planData: [{ day: "شنبه", focus: "x", items: ["اسکات"] }],
    createdAt: T1,
    editedAt: T1,
    updatedAt: T1,
    ...p,
  };
}

const emptyPull = (extra: Record<string, unknown> = {}) => ({
  cursor: "2026-09-25T00:00:00.000Z",
  hasMore: false,
  serverTime: T1,
  dailyEntries: [],
  sleepEntries: [],
  tasks: [],
  settings: [],
  lockedModules: [],
  ...extra,
});

async function setup(handler: (c: Call) => Response | Promise<Response>) {
  const ctx = await loggedInClient(handler);
  const engine = new SyncEngine(ctx.api, ctx.kv, [mainChannel]);
  await engine.init();
  return { ...ctx, engine };
}

/** همه‌ی تغییرهای push‌شده رو جمع می‌کنه و به همه applied با serverRecord=null می‌ده */
function recordingServer(pull: () => unknown = () => emptyPull(), results?: (ch: SyncChange, i: number) => any) {
  const pushes: SyncChange[][] = [];
  const pulls: string[] = [];
  const handler = (c: Call) => {
    if (c.path === "/api/mobile/sync/push") {
      const changes: SyncChange[] = c.body.changes;
      pushes.push(changes);
      return json(200, {
        serverTime: T1,
        results: changes.map((ch, index) => results?.(ch, index) ?? { index, entity: ch.entity, status: "applied", serverRecord: null }),
      });
    }
    pulls.push(c.path);
    return json(200, pull());
  };
  return { pushes, pulls, handler };
}

beforeEach(async () => {
  await wipeAllLocalData();
});

describe("fitness mapping", () => {
  it("newLocalId با الگوی سرور جوره", () => {
    for (let i = 0; i < 20; i++) expect(newLocalId()).toMatch(/^[a-z][a-z0-9]{19,31}$/);
  });

  it("ثبتِ غذا: به‌ازای ۱۰۰ گرم → کلِ مقدار (و برعکس)، بدونِ گردکردن", () => {
    const row = {
      id: "mabc0000000000000000000000000001",
      name: "برنج",
      caloriesPer100g: 130,
      proteinPer100g: 2.7,
      carbsPer100g: 28,
      fatPer100g: 0.3,
      grams: 250,
      date: "2026-09-25",
      mealType: "lunch" as const,
      aiScanned: false,
      createdAt: T1,
      updatedAt: T1,
      deletedAt: null,
      dirty: 1 as const,
    };
    const ch = calorieEntryToChange(row)!;
    expect(ch).toMatchObject({
      entity: "foodLogEntry",
      op: "upsert",
      data: { customName: "برنج", customCalories: 325, grams: 250, proteinG: 6.75, carbsG: 70, fatG: 0.75 },
    });
    const rec: FoodLogEntryRecord = {
      id: row.id,
      date: row.date,
      customName: "برنج",
      customCalories: 325,
      grams: 250,
      mealType: "snack2",
      proteinG: null,
      carbsG: null,
      fatG: null,
      aiScanned: false,
      createdAt: T1,
      deleted: false,
      editedAt: T1,
      updatedAt: T1,
    };
    // mealType عینا (چیدمانِ وعده‌های وب: snack1، snack2، …) — قبلا به "snack" نرمال می‌شد
    expect(remoteFoodLog(rec)).toMatchObject({ caloriesPer100g: 130, proteinPer100g: null, mealType: "snack2", dirty: 0 });
    // رفت‌وبرگشتِ دقیق: کلِ ۲۵۰ کالری روی ۱۵۰ گرم (per100 ِ نامتناهی) دوباره ۲۵۰ می‌شه
    const odd = remoteFoodLog({ ...rec, customCalories: 250, grams: 150, proteinG: 12.34, carbsG: 0.1, fatG: 7 });
    expect(calorieEntryToChange({ ...odd, dirty: 1 })).toMatchObject({ data: { customCalories: 250, proteinG: 12.34, carbsG: 0.1, fatG: 7 } });
    expect(calorieEntryToChange({ ...row, deletedAt: T1 })).toMatchObject({ op: "delete" });
  });

  it("هدفِ کالری: جدید → compute، شناخته‌شده → meals، بسته‌شده → push نمی‌شه", () => {
    const base = {
      id: "mtgt0000000000000000000000000001",
      dailyTargetKcal: 2000,
      goal: "lose" as const,
      mealsPerDay: 3,
      mealBreakdown: [{ key: "breakfast", label: "صبحانه", kcal: 600 }],
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
      sex: "male" as const,
      ageYears: 30,
      heightCm: 180,
      weightKg: 80,
      effectiveFrom: T1,
      effectiveTo: null,
      createdAt: T1,
      updatedAt: T1,
      deletedAt: null,
      dirty: 1 as const,
    };
    expect(calorieTargetToChange(base)).toMatchObject({ data: { kind: "compute", goal: "lose", sex: "male", heightCm: 180, ageYears: 30 } });
    expect(calorieTargetToChange({ ...base, synced: true })).toMatchObject({ data: { kind: "meals" } });
    expect(calorieTargetToChange({ ...base, effectiveTo: T1 })).toBeNull();
    expect(calorieTargetToChange({ ...base, heightCm: null })).toBeNull();
  });

  it("برنامه‌ی قالبیِ محلی که روی سرور custom شده متادیتای محلیش رو نگه می‌داره؛ آرشیوِ محلی می‌مونه", () => {
    const local = {
      ...remotePlan(planRecord({ id: "mpln0000000000000000000000000001" })),
      level: "beginner" as const,
      goal: "hypertrophy",
      deletedAt: T1,
    };
    const merged = remotePlan(planRecord({ id: local.id, isActive: false }), local);
    expect(merged).toMatchObject({ level: "beginner", goal: "hypertrophy", deletedAt: T1 });
  });
});

describe("fitness push/pull", () => {
  it("برنامه (با قوانین) قبل از لاگ push می‌شه؛ آرشیو = isActive:false؛ کلیدِ لاگ planId|date", async () => {
    const srv = recordingServer();
    const { engine } = await setup(srv.handler);
    const plan = await createManualPlan({ goal: null, gymDays: ["شنبه"], days: [{ day: "شنبه", focus: "", items: ["اسکات"] }], rulesAccepted: true });
    await toggleTodayItem(plan.id, "2026-09-25", "اسکات", 1);
    await engine.sync();
    const changes = srv.pushes.flat();
    const iPlan = changes.findIndex((c) => c.entity === "exercisePlan");
    const iLog = changes.findIndex((c) => c.entity === "exerciseLog");
    expect(iPlan).toBeGreaterThanOrEqual(0);
    expect(iPlan).toBeLessThan(iLog);
    expect(changes[iPlan]).toMatchObject({ id: plan.id, data: { isActive: true, rulesAccepted: true } });
    expect(changes[iLog]).toMatchObject({ key: `${plan.id}|2026-09-25`, data: { completed: true, completedItems: ["اسکات"] } });

    await new Promise((r) => setTimeout(r, 2));
    await archivePlan(plan.id);
    await engine.sync();
    expect(srv.pushes[srv.pushes.length - 1]).toEqual([expect.objectContaining({ entity: "exercisePlan", op: "upsert", data: expect.objectContaining({ isActive: false }) })]);
    expect((await fitnessDb.plans.get(plan.id))?.deletedAt).not.toBeNull();
  });

  it("pull: لاگِ سرور با ردیفِ محلیِ همون planId|date ادغام می‌شه (id ِ محلی می‌مونه، notes هم مثلِ بقیه‌ی فیلدها از سرور میاد)", async () => {
    const planId = "mpln0000000000000000000000000002";
    await fitnessDb.exerciseLogs.put({
      id: "mlocal00000000000000000000000001",
      planId,
      date: "2026-09-20",
      completed: false,
      completedItems: [],
      notes: "یادداشتِ محلیِ قدیمی",
      createdAt: T1,
      updatedAt: "2026-09-20T00:00:00.000Z",
      deletedAt: null,
      dirty: 0,
    });
    const srv = recordingServer(() =>
      emptyPull({
        exercisePlans: [planRecord({ id: planId })],
        exerciseLogs: [
          {
            key: `${planId}|2026-09-20`,
            planId,
            date: "2026-09-20",
            completed: true,
            completedItems: ["اسکات"],
            notes: "یادداشتِ سرور",
            editedAt: T1,
            updatedAt: T1,
          },
        ],
        foodLogEntries: [],
        calorieTargets: [],
      })
    );
    const { engine } = await setup(srv.handler);
    await engine.sync();
    const logs = await fitnessDb.exerciseLogs.toArray();
    expect(logs).toHaveLength(1);
    // id فقط محلیه (حفظ می‌شه)؛ notes دیگه فقط محلی نیست — چون local.dirty=0
    // بود (ادیتِ سینک‌نشده‌ای در جریان نیست)، ریموت برنده‌ست و همه‌ی فیلدها
    // از سرور میان.
    expect(logs[0]).toMatchObject({ id: "mlocal00000000000000000000000001", notes: "یادداشتِ سرور", completed: true, dirty: 0 });
    expect(await fitnessDb.plans.get(planId)).toMatchObject({ isActive: true, dirty: 0 });
  });

  it("compute ← stale: هدفِ جدیدترِ سرور جایگزین می‌شه و هدفِ محلی کنار می‌ره", async () => {
    const serverTarget = {
      id: "ctarget0000000000000000000000001",
      dailyTargetKcal: 2222,
      goal: "gain",
      mealsPerDay: 4,
      mealBreakdown: null,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
      sex: "female",
      ageYears: null,
      heightCm: 170,
      weightKg: 60,
      effectiveFrom: "2099-01-01T00:00:00.000Z",
      effectiveTo: null,
      editedAt: "2099-01-01T00:00:00.000Z",
      updatedAt: "2099-01-01T00:00:00.000Z",
    };
    const srv = recordingServer(undefined, (ch, index) =>
      ch.entity === "calorieTarget" ? { index, entity: ch.entity, id: (ch as any).id, status: "stale", serverRecord: serverTarget } : undefined
    );
    const { engine } = await setup(srv.handler);
    const mine = await setCalorieTarget({
      dailyTargetKcal: 1800,
      goal: "lose",
      mealsPerDay: 3,
      mealBreakdown: null,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
      sex: "male",
      ageYears: 30,
      heightCm: 180,
      weightKg: 90,
    });
    await engine.sync();
    expect(await fitnessDb.calorieTargets.get(serverTarget.id)).toMatchObject({ dailyTargetKcal: 2222, synced: true, dirty: 0 });
    const local = await fitnessDb.calorieTargets.get(mine.id);
    expect(local?.deletedAt).not.toBeNull();
    expect(local?.dirty).toBe(0);
  });
});

describe("ماژول‌های قفل", () => {
  it("module_locked: خطا ثبت نمی‌شه، تغییر صف می‌مونه و تا بازشدن دوباره فرستاده نمی‌شه", async () => {
    let locked = true;
    const srv = recordingServer(
      () => emptyPull({ lockedModules: locked ? ["CALORIE"] : [] , ...(locked ? {} : { foodLogEntries: [], calorieTargets: [] }) }),
      (ch, index) =>
        locked && ch.entity === "foodLogEntry"
          ? { index, entity: ch.entity, id: (ch as any).id, status: "rejected", code: "module_locked", error: "module_locked", serverRecord: null }
          : undefined
    );
    const { engine } = await setup(srv.handler);
    const e = await addCalorieEntry({ name: "سیب", caloriesPer100g: 52, grams: 150, date: "2026-09-25", mealType: "snack" });
    await engine.sync();
    expect(engine.getState().rejectedCount).toBe(0);
    expect(engine.getState().lockedModules).toEqual(["CALORIE"]);
    expect((await fitnessDb.calorieEntries.get(e.id))?.dirty).toBe(1);

    const before = srv.pushes.length;
    await engine.sync(); // هنوز قفل → اصلا push نمی‌شه
    expect(srv.pushes.slice(before).flat().some((c) => c.entity === "foodLogEntry")).toBe(false);

    locked = false;
    await engine.sync(); // pull می‌فهمه باز شده؛ دورِ بعد push می‌شه
    await engine.sync();
    expect(engine.getState().lockedModules).toEqual([]);
    expect((await fitnessDb.calorieEntries.get(e.id))?.dirty).toBe(0);
  });

  it("locked → باز: یک‌بار pullِ کامل (بدونِ since)", async () => {
    let locked = true;
    const srv = recordingServer(() => emptyPull({ lockedModules: locked ? ["EXERCISE"] : [] }));
    const { engine, kv } = await setup(srv.handler);
    await engine.sync();
    expect(srv.pulls).toEqual(["/api/mobile/sync/pull"]);
    await engine.sync();
    expect(srv.pulls[srv.pulls.length - 1]).toContain("since=");
    locked = false;
    srv.pulls.length = 0;
    await engine.sync();
    expect(srv.pulls).toEqual(["/api/mobile/sync/pull?since=2026-09-25T00%3A00%3A00.000Z", "/api/mobile/sync/pull"]);
    expect(await kv.get("arion.sync.cursor")).toBe("2026-09-25T00:00:00.000Z");
  });
});

describe("رودمپ و پاک‌کردنِ داده", () => {
  it("پیشرفتِ رودمپ push و pull می‌شه", async () => {
    const srv = recordingServer(() =>
      emptyPull({ roadmapProgress: [{ id: "croadmap000000000000000000000002", stepProgress: { "1": true }, progress: { total: 3, done: 1, pct: 33 }, editedAt: T1, updatedAt: T1 }] })
    );
    const { engine } = await setup(srv.handler);
    await roadmapDb.progress.put({ id: "croadmap000000000000000000000001", stepProgress: { "2": true }, updatedAt: T1, dirty: 1 });
    await engine.sync();
    expect(srv.pushes.flat()).toContainEqual(
      expect.objectContaining({ entity: "roadmapProgress", id: "croadmap000000000000000000000001", data: { stepProgress: { "2": true } } })
    );
    expect((await roadmapDb.progress.get("croadmap000000000000000000000001"))?.dirty).toBe(0);
    expect(await roadmapDb.progress.get("croadmap000000000000000000000002")).toMatchObject({ stepProgress: { "1": true }, dirty: 0 });
  });

  it("wipeAllLocalData همه‌ی دیتابیس‌ها رو خالی می‌کنه و نمونه‌های باز کار می‌کنن", async () => {
    await addCalorieEntry({ name: "x", caloriesPer100g: 10, grams: 10, date: "2026-09-25", mealType: null });
    await roadmapDb.progress.put({ id: "croadmap000000000000000000000009", stepProgress: {}, updatedAt: T1, dirty: 1 });
    await coreDb.tasks.put({ id: "mtask000000000000000000000000001", title: "t", notes: null, dueDate: null, priority: "low", completedAt: null, updatedAt: T1, deletedAt: null, dirty: 1 });
    await wipeAllLocalData();
    expect(await fitnessDb.calorieEntries.count()).toBe(0);
    expect(await roadmapDb.progress.count()).toBe(0);
    expect(await coreDb.tasks.count()).toBe(0);
    await addCalorieEntry({ name: "y", caloriesPer100g: 10, grams: 10, date: "2026-09-25", mealType: null });
    expect(await fitnessDb.calorieEntries.count()).toBe(1);
  });
});

describe("fitness ← onRemoteApplied / هدفِ کالریِ ویرایش‌شده قبل از compute", () => {
  /** سرورِ حالت‌دار برای ثبتِ غذا: push ← رکوردِ سرور، pull ← همه‌ی رکوردها (+ رکوردِ ریموتِ تزریقی) */
  function foodServer() {
    const rows = new Map<string, FoodLogEntryRecord>();
    const handler = (c: Call) => {
      if (c.path === "/api/mobile/sync/push") {
        const changes: SyncChange[] = c.body.changes;
        return json(200, {
          serverTime: T1,
          results: changes.map((ch: any, index) => {
            const rec: FoodLogEntryRecord = {
              id: ch.id,
              ...ch.data,
              mealType: ch.data?.mealType ?? null,
              proteinG: ch.data?.proteinG ?? null,
              carbsG: ch.data?.carbsG ?? null,
              fatG: ch.data?.fatG ?? null,
              aiScanned: !!ch.data?.aiScanned,
              createdAt: T1,
              deleted: ch.op === "delete",
              editedAt: ch.clientUpdatedAt,
              updatedAt: new Date().toISOString(),
            };
            rows.set(ch.id, rec);
            return { index, entity: ch.entity, id: ch.id, status: "applied", serverRecord: rec };
          }),
        });
      }
      return json(200, emptyPull({ foodLogEntries: [...rows.values()], calorieTargets: [], exercisePlans: [], exerciseLogs: [] }));
    };
    return { handler, rows };
  }

  it("برگشتِ push ِ خودمون در pull ← بدونِ remount؛ رکوردِ واقعا ریموت ← remount", async () => {
    const srv = foodServer();
    const { engine } = await setup(srv.handler);
    const seen: number[] = [];
    engine.onRemoteApplied((n) => seen.push(n));
    await addCalorieEntry({ name: "برنج", caloriesPer100g: 250 / 1.5, grams: 150, date: "2026-09-25", mealType: "snack2" });
    await engine.sync();
    expect(seen).toEqual([]);
    srv.rows.set("cfromweb000000000000000001", {
      id: "cfromweb000000000000000001",
      date: "2026-09-25",
      customName: "نان",
      customCalories: 187,
      grams: 70,
      mealType: "breakfast",
      proteinG: null,
      carbsG: null,
      fatG: null,
      aiScanned: false,
      createdAt: T1,
      deleted: false,
      editedAt: "2026-09-25T09:00:00.000Z",
      updatedAt: "2026-09-25T09:00:00.000Z",
    });
    await engine.sync();
    expect(seen).toEqual([1]);
    await engine.sync(); // همون رکورد دوباره ← بی‌تغییر
    expect(seen).toEqual([1]);
    expect([...srv.rows.values()].find((r) => r.customName === "برنج")).toMatchObject({ customCalories: 250, mealType: "snack2" });
  });

  it("PATCH ِ وعده‌ها روی هدفِ هنوز-compute‌نشده: compute ← بعدش meals با همون چیدمان، در همون sync", async () => {
    const meals = [{ key: "a", label: "الف", kcal: 900 }, { key: "b", label: "ب", kcal: 600 }];
    const serverMeals = [{ key: "breakfast", label: "صبحانه", kcal: 700 }, { key: "lunch", label: "ناهار", kcal: 1100 }];
    const pushed: any[] = [];
    const handler = (c: Call) => {
      if (c.path === "/api/mobile/sync/push") {
        const changes: any[] = c.body.changes;
        pushed.push(...changes);
        return json(200, {
          serverTime: T1,
          results: changes.map((ch, index) => {
            const computed = ch.data.kind === "compute";
            const rec = {
              id: ch.id,
              dailyTargetKcal: computed ? 1800 : 1500,
              goal: "lose",
              mealsPerDay: computed ? 2 : 2,
              mealBreakdown: computed ? serverMeals : ch.data.mealBreakdown,
              proteinTargetG: null,
              carbsTargetG: null,
              fatTargetG: null,
              sex: "male",
              ageYears: 30,
              heightCm: 180,
              weightKg: 80,
              effectiveFrom: T1,
              effectiveTo: null,
              editedAt: ch.clientUpdatedAt,
              updatedAt: new Date().toISOString(),
            };
            return { index, entity: ch.entity, id: ch.id, status: "applied", serverRecord: rec };
          }),
        });
      }
      return json(200, emptyPull({ calorieTargets: [], foodLogEntries: [], exercisePlans: [], exerciseLogs: [] }));
    };
    const { engine } = await setup(handler);
    const t = await setCalorieTarget({
      dailyTargetKcal: 1500,
      goal: "lose",
      mealsPerDay: 2,
      mealBreakdown: meals,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
      sex: "male",
      ageYears: 30,
      heightCm: 180,
      weightKg: 80,
    });
    await fitnessDb.calorieTargets.update(t.id, { mealsEdited: true });
    // یک sync: compute، بعد (settle ← "repush") همون دور meals
    await engine.sync();
    expect(pushed.map((c) => c.data.kind)).toEqual(["compute", "meals"]);
    expect((await fitnessDb.calorieTargets.get(t.id))?.mealsEdited).toBeFalsy();
    expect(pushed[1].data.mealBreakdown).toEqual(meals);
    expect(await fitnessDb.calorieTargets.get(t.id)).toMatchObject({ synced: true, dirty: 0, mealBreakdown: meals });
  });
});
