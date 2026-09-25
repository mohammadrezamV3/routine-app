import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { SyncChange, SyncChangeResult, TaskRecord } from "@/lib/api-contract";
import { db } from "@/db/db";
import { addTask, deleteTask, setDaily, updateTask } from "@/db/repo";
import { applyRemote, wipeAll } from "@/db/syncHooks";
import { makeBatches, SyncEngine } from "./syncEngine";
import { remoteDaily, remoteTask } from "./mappers";
import { Call, json, loggedInClient } from "./testUtils";

const T0 = "2026-09-20T10:00:00.000Z";
const T1 = "2026-09-21T10:00:00.000Z";
const T2 = "2026-09-22T10:00:00.000Z";

function taskRecord(p: Partial<TaskRecord> & { id: string }): TaskRecord {
  return {
    title: "سرور",
    notes: null,
    dueDate: null,
    priority: 1,
    completedAt: null,
    createdAt: T0,
    deleted: false,
    editedAt: T1,
    updatedAt: T1,
    ...p,
  };
}

/** سرورِ ساختگیِ خیلی ساده با LWW (تساوی → stale)، فقط برای task و dailyEntry */
function fakeServer() {
  const tasks = new Map<string, TaskRecord>();
  const daily = new Map<string, any>();
  const pushes: SyncChange[][] = [];
  const handler = (c: Call) => {
    if (c.path === "/api/mobile/sync/push") {
      const changes: SyncChange[] = c.body.changes;
      pushes.push(changes);
      const results: SyncChangeResult[] = changes.map((ch, index) => {
        if (ch.entity === "task") {
          const ex = tasks.get(ch.id);
          if (ex && Date.parse(ch.clientUpdatedAt) <= Date.parse(ex.editedAt)) {
            return { index, entity: "task", id: ch.id, status: "stale", serverRecord: ex };
          }
          if (ch.op === "upsert" && !ch.data.title.trim()) {
            return { index, entity: "task", id: ch.id, status: "rejected", error: "عنوان", serverRecord: null };
          }
          const rec = taskRecord({
            id: ch.id,
            ...(ch.op === "upsert" ? { ...ch.data, title: ch.data.title.trim() } : { ...(ex ?? {}), deleted: true }),
            deleted: ch.op === "delete",
            editedAt: ch.clientUpdatedAt,
            updatedAt: new Date().toISOString(),
          });
          tasks.set(ch.id, rec);
          return { index, entity: "task", id: ch.id, status: "applied", serverRecord: rec };
        }
        if (ch.entity === "dailyEntry") {
          const ex = daily.get(ch.key);
          if (ex && Date.parse(ch.clientUpdatedAt) <= Date.parse(ex.editedAt)) {
            return { index, entity: "dailyEntry", key: ch.key, status: "stale", serverRecord: ex };
          }
          const rec = {
            date: ch.key,
            tasks: ch.op === "upsert" ? ch.data.tasks : {},
            wake: ch.op === "upsert" ? ch.data.wake : null,
            editedAt: ch.clientUpdatedAt,
            updatedAt: new Date().toISOString(),
          };
          daily.set(ch.key, rec);
          return { index, entity: "dailyEntry", key: ch.key, status: "applied", serverRecord: rec };
        }
        return { index, entity: ch.entity, status: "applied", serverRecord: null } as SyncChangeResult;
      });
      return json(200, { serverTime: new Date().toISOString(), results });
    }
    if (c.path.startsWith("/api/mobile/sync/pull")) {
      return json(200, {
        cursor: "2026-09-25T00:00:00.000Z",
        hasMore: false,
        serverTime: "2026-09-25T00:00:05.000Z",
        dailyEntries: [],
        sleepEntries: [],
        tasks: [],
        settings: [],
        lockedModules: [],
      });
    }
    return json(404, {});
  };
  return { tasks, daily, pushes, handler };
}

async function setup(handler: (c: Call) => Response | Promise<Response>) {
  const ctx = await loggedInClient(handler);
  const engine = new SyncEngine(ctx.api, ctx.kv);
  await engine.init();
  return { ...ctx, engine };
}

beforeEach(async () => {
  await wipeAll();
});

describe("applyRemote — LWW", () => {
  it("ردیفِ محلیِ ناموجود → درج با dirty=0", async () => {
    expect(await applyRemote("tasks", remoteTask(taskRecord({ id: "mremote000000000000000000001" })))).toBe(true);
    const row = await db.tasks.get("mremote000000000000000000001");
    expect(row).toMatchObject({ title: "سرور", dirty: 0, updatedAt: T1, priority: "medium" });
  });

  it("محلیِ dirty و جدیدتر → نسخه‌ی محلی می‌مونه", async () => {
    await db.tasks.put({ id: "ma0000000000000000000000000001", title: "محلی", notes: null, dueDate: null, priority: "high", completedAt: null, updatedAt: T2, deletedAt: null, dirty: 1 });
    expect(await applyRemote("tasks", remoteTask(taskRecord({ id: "ma0000000000000000000000000001", editedAt: T1 })))).toBe(false);
    expect(await db.tasks.get("ma0000000000000000000000000001")).toMatchObject({ title: "محلی", dirty: 1 });
  });

  it("محلیِ dirty با زمانِ مساوی → محلی می‌مونه (فقط remote.editedAt > local برنده‌ست)", async () => {
    await db.tasks.put({ id: "ma0000000000000000000000000002", title: "محلی", notes: null, dueDate: null, priority: "high", completedAt: null, updatedAt: T1, deletedAt: null, dirty: 1 });
    expect(await applyRemote("tasks", remoteTask(taskRecord({ id: "ma0000000000000000000000000002", editedAt: T1 })))).toBe(false);
  });

  it("محلیِ dirty ولی قدیمی‌تر → ریموت برنده، updatedAt = editedAt، dirty=0", async () => {
    await db.tasks.put({ id: "ma0000000000000000000000000003", title: "محلی", notes: null, dueDate: null, priority: "high", completedAt: null, updatedAt: T0, deletedAt: null, dirty: 1 });
    expect(await applyRemote("tasks", remoteTask(taskRecord({ id: "ma0000000000000000000000000003", editedAt: T2 })))).toBe(true);
    expect(await db.tasks.get("ma0000000000000000000000000003")).toMatchObject({ title: "سرور", dirty: 0, updatedAt: T2 });
  });

  it("محلیِ تمیز ولی با updatedAt جدیدتر → ریموت برنده (سرور منبعِ حقیقته)", async () => {
    await db.dailyEntries.put({ date: "2026-09-20", completedItems: { a: true }, wakeUpAt: null, updatedAt: T2, deletedAt: null, dirty: 0 });
    const ok = await applyRemote("dailyEntries", remoteDaily({ date: "2026-09-20", tasks: { b: true }, wake: null, editedAt: T1, updatedAt: T1 }));
    expect(ok).toBe(true);
    expect(await db.dailyEntries.get("2026-09-20")).toMatchObject({ completedItems: { b: true }, updatedAt: T1, dirty: 0 });
  });

  it("tombstoneِ تسک → deletedAt محلی", async () => {
    await applyRemote("tasks", remoteTask(taskRecord({ id: "ma0000000000000000000000000004", deleted: true, editedAt: T2 })));
    expect((await db.tasks.get("ma0000000000000000000000000004"))?.deletedAt).toBe(T2);
  });
});

describe("push", () => {
  it("applied → ردیف تمیز با رکوردِ سرور؛ mapping درست (priority/dueDate/wake)", async () => {
    const srv = fakeServer();
    const { engine } = await setup(srv.handler);
    const t = await addTask({ title: "  خرید  ", priority: "high", dueDate: "2026-09-26" });
    await setDaily("2026-09-25", { tasks: { gym: true }, wake: "2026-09-25T03:30:00.000Z" });
    await engine.sync();
    expect(engine.getState()).toMatchObject({ status: "idle", error: null });

    const pushed = srv.pushes[0];
    const tc = pushed.find((c) => c.entity === "task")!;
    expect(tc).toMatchObject({ op: "upsert", id: t.id, data: { priority: 2, dueDate: "2026-09-26T00:00:00.000Z" } });
    const dc = pushed.find((c) => c.entity === "dailyEntry")!;
    expect(dc).toMatchObject({ key: "2026-09-25", data: { tasks: { gym: true }, wake: "2026-09-25T03:30:00.000Z" } });

    const row = await db.tasks.get(t.id);
    expect(row).toMatchObject({ dirty: 0, title: "خرید", priority: "high", dueDate: "2026-09-26" });
    expect((await db.dailyEntries.get("2026-09-25"))?.dirty).toBe(0);
    expect(t.id).toMatch(/^[a-z][a-z0-9]{19,31}$/);
  });

  it("stale → نسخه‌ی سرور جایگزین می‌شه", async () => {
    const srv = fakeServer();
    const { engine } = await setup(srv.handler);
    const t = await addTask({ title: "محلی" });
    srv.tasks.set(t.id, taskRecord({ id: t.id, title: "ویرایشِ وب", editedAt: "2099-01-01T00:00:00.000Z" }));
    await engine.sync();
    expect(await db.tasks.get(t.id)).toMatchObject({ title: "ویرایشِ وب", dirty: 0, updatedAt: "2099-01-01T00:00:00.000Z" });
  });

  it("delete → op delete و tombstone", async () => {
    const srv = fakeServer();
    const { engine } = await setup(srv.handler);
    const t = await addTask({ title: "x" });
    await engine.sync();
    await new Promise((r) => setTimeout(r, 2));
    await deleteTask(t.id);
    await engine.sync();
    expect(srv.pushes[1]).toEqual([expect.objectContaining({ entity: "task", id: t.id, op: "delete" })]);
    expect(await db.tasks.get(t.id)).toMatchObject({ dirty: 0 });
    expect((await db.tasks.get(t.id))?.deletedAt).not.toBeNull();
  });

  it("rejected → dirty می‌مونه، دوباره فرستاده نمی‌شه تا وقتی ویرایش بشه", async () => {
    const srv = fakeServer();
    const { engine } = await setup(srv.handler);
    const t = await addTask({ title: "   " });
    await engine.sync();
    expect(srv.pushes).toHaveLength(1);
    expect((await db.tasks.get(t.id))?.dirty).toBe(1);
    expect(engine.getState().rejectedCount).toBe(1);

    await engine.sync(); // بدونِ ویرایش → push خالی (هیچ درخواستی)
    expect(srv.pushes).toHaveLength(1);

    await new Promise((r) => setTimeout(r, 2));
    await updateTask(t.id, { title: "درست شد" });
    await engine.sync();
    expect(srv.pushes).toHaveLength(2);
    expect((await db.tasks.get(t.id))?.dirty).toBe(0);
    expect(engine.getState().rejectedCount).toBe(0);
  });

  it("ویرایشِ هم‌زمان با push: ردیف dirty می‌مونه و دورِ بعد push می‌شه", async () => {
    const srv = fakeServer();
    let id = "";
    let edited = false;
    const { engine } = await setup(async (c) => {
      if (c.path === "/api/mobile/sync/push" && !edited) {
        edited = true;
        await new Promise((r) => setTimeout(r, 2));
        await updateTask(id, { title: "ویرایشِ وسطِ push" }); // کاربر حینِ درخواست ویرایش کرد
      }
      return srv.handler(c);
    });
    id = (await addTask({ title: "اول" })).id;
    await engine.sync();
    await engine.sync();
    expect(srv.tasks.get(id)?.title).toBe("ویرایشِ وسطِ push");
    expect(await db.tasks.get(id)).toMatchObject({ title: "ویرایشِ وسطِ push", dirty: 0 });
  });

  it("تسکِ قدیمی با idِ ناسازگار با سرور قبل از push id تازه می‌گیره", async () => {
    const srv = fakeServer();
    const { engine } = await setup(srv.handler);
    await db.tasks.put({ id: "m0b7c1e2a-1111-2222-3333-444455556666", title: "قدیمی", notes: null, dueDate: null, priority: "low", completedAt: null, updatedAt: T0, deletedAt: null, dirty: 1 });
    await engine.sync();
    expect(await db.tasks.get("m0b7c1e2a-1111-2222-3333-444455556666")).toBeUndefined();
    const all = await db.tasks.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].id).toMatch(/^[a-z][a-z0-9]{19,31}$/);
    expect(all[0]).toMatchObject({ title: "قدیمی", dirty: 0 });
  });

  it("دسته‌بندی: حداکثر ۲۰۰ تغییر و سقفِ حجم", () => {
    const items = Array.from({ length: 450 }, (_, i) => ({
      entity: "tasks" as const,
      key: String(i),
      updatedAt: T0,
      change: { entity: "task", id: String(i), op: "delete", clientUpdatedAt: T0 } as SyncChange,
    }));
    expect(makeBatches(items).map((b) => b.length)).toEqual([200, 200, 50]);
    const big = items.slice(0, 5);
    expect(makeBatches(big, 200, 200).every((b) => b.length <= 2)).toBe(true);
  });

  it("۴۵۰ ردیف → ۳ درخواستِ push", async () => {
    const srv = fakeServer();
    const { engine } = await setup(srv.handler);
    await db.dailyEntries.bulkPut(
      Array.from({ length: 450 }, (_, i) => ({
        date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
        completedItems: { a: true },
        wakeUpAt: null,
        updatedAt: T0,
        deletedAt: null,
        dirty: 1 as const,
      }))
    );
    await engine.sync();
    expect(srv.pushes.map((p) => p.length)).toEqual([200, 200, 50]);
    expect(await db.dailyEntries.where("dirty").equals(1).count()).toBe(0);
  });
});

describe("pull", () => {
  it("صفحه‌بندی: تا hasMore=false با cursorِ هر صفحه ادامه می‌ده و cursor ذخیره می‌شه", async () => {
    const pulls: string[] = [];
    const pages = [
      { cursor: "2026-09-24T00:00:00.000Z", hasMore: true, tasks: [taskRecord({ id: "mp0000000000000000000000000001" })] },
      { cursor: "2026-09-24T12:00:00.000Z", hasMore: true, tasks: [taskRecord({ id: "mp0000000000000000000000000002" })] },
      { cursor: "2026-09-25T00:00:00.000Z", hasMore: false, tasks: [taskRecord({ id: "mp0000000000000000000000000003", deleted: true })] },
    ];
    const { engine, kv } = await setup((c) => {
      if (c.path.startsWith("/api/mobile/sync/pull")) {
        pulls.push(c.path);
        const p = pages[pulls.length - 1];
        return json(200, { ...p, serverTime: T2, dailyEntries: [], sleepEntries: [], settings: [], lockedModules: ["EXERCISE", "CALORIE"] });
      }
      return json(200, { serverTime: T2, results: [] });
    });
    await kv.set("arion.sync.cursor", "2026-09-01T00:00:00.000Z");
    await engine.sync();
    expect(pulls).toEqual([
      "/api/mobile/sync/pull?since=2026-09-01T00%3A00%3A00.000Z",
      "/api/mobile/sync/pull?since=2026-09-24T00%3A00%3A00.000Z",
      "/api/mobile/sync/pull?since=2026-09-24T12%3A00%3A00.000Z",
    ]);
    expect(await kv.get("arion.sync.cursor")).toBe("2026-09-25T00:00:00.000Z");
    expect(await db.tasks.count()).toBe(3);
    expect((await db.tasks.get("mp0000000000000000000000000003"))?.deletedAt).not.toBeNull();
  });

  it("بدونِ cursorِ ذخیره‌شده → pull کامل (بدونِ since)", async () => {
    const pulls: string[] = [];
    const { engine } = await setup((c) => {
      pulls.push(c.path);
      return json(200, { cursor: T2, hasMore: false, serverTime: T2, dailyEntries: [], sleepEntries: [], tasks: [], settings: [], lockedModules: [] });
    });
    await engine.sync();
    expect(pulls).toEqual(["/api/mobile/sync/pull"]);
  });

  it("خطای سرور → status=error با پیامِ فارسی", async () => {
    const { engine } = await setup(() => json(500, { error: "x" }));
    await engine.sync();
    expect(engine.getState().status).toBe("error");
    expect(engine.getState().error).toMatch(/سرور/);
  });
});

describe("ادغامِ مهمان → ورود", () => {
  it("دیتای مهمان (و ردیف‌های تمیزِ قبلی) در اولین ورود push می‌شن؛ LWW تصمیم می‌گیره", async () => {
    const srv = fakeServer();
    // ردیفِ مهمان
    const guest = await addTask({ title: "تسکِ مهمان" });
    await setDaily("2026-09-24", { tasks: { read: true }, wake: null });
    // ردیفِ تمیز (مثلا از نشستِ قبلی نگه داشته شده)
    await db.dailyEntries.put({ date: "2026-09-01", completedItems: { old: true }, wakeUpAt: null, updatedAt: T0, deletedAt: null, dirty: 0 });
    // سرور نسخه‌ی جدیدتری از یکی داره
    srv.daily.set("2026-09-01", { date: "2026-09-01", tasks: { server: true }, wake: null, editedAt: T2, updatedAt: T2 });

    const { engine, kv } = await setup(srv.handler);
    await kv.set("arion.sync.cursor", "stale-cursor-of-another-account");
    await engine.prepareFirstSync();
    expect(await kv.get("arion.sync.cursor")).toBeNull();
    await engine.sync();

    const pushed = srv.pushes.flat();
    expect(pushed.map((c) => ("id" in c ? c.id : c.key)).sort()).toEqual(["2026-09-01", "2026-09-24", guest.id].sort());
    expect(srv.tasks.get(guest.id)?.title).toBe("تسکِ مهمان");
    expect(srv.daily.get("2026-09-24")?.tasks).toEqual({ read: true });
    // سرور جدیدتر بود → stale → نسخه‌ی سرور محلی شد
    expect(await db.dailyEntries.get("2026-09-01")).toMatchObject({ completedItems: { server: true }, dirty: 0 });
    // هیچ‌چیز محلی گم نشد
    expect(await db.tasks.get(guest.id)).toMatchObject({ title: "تسکِ مهمان", dirty: 0 });
  });

  it("خروج با wipeLocal دیتای محلی رو پاک می‌کنه؛ بدونِ اون نگه می‌داره", async () => {
    const { engine, kv } = await setup(fakeServer().handler);
    await addTask({ title: "بمون" });
    await kv.set("arion.sync.cursor", T1);
    await engine.resetAfterLogout(false);
    expect(await db.tasks.count()).toBe(1);
    expect(await kv.get("arion.sync.cursor")).toBeNull();
    await engine.resetAfterLogout(true);
    expect(await db.tasks.count()).toBe(0);
  });
});

describe("single-flight sync", () => {
  it("دو sync هم‌زمان → یک اجرا (+ حداکثر یک دورِ تکمیلی)", async () => {
    let pulls = 0;
    const { engine } = await setup(async (c) => {
      if (c.path.startsWith("/api/mobile/sync/pull")) {
        pulls++;
        await new Promise((r) => setTimeout(r, 10));
        return json(200, { cursor: T2, hasMore: false, serverTime: T2, dailyEntries: [], sleepEntries: [], tasks: [], settings: [], lockedModules: [] });
      }
      return json(200, { serverTime: T2, results: [] });
    });
    await Promise.all([engine.sync(), engine.sync(), engine.sync()]);
    expect(pulls).toBe(2); // اجرای اول + یک rerun برای درخواست‌هایی که وسطش اومدن
  });
});

describe("onLocalWrite", () => {
  it("برای نوشتنِ repo (dirty=1) صدا زده می‌شه، نه برای applyRemote", async () => {
    const { onLocalWrite } = await import("@/db/syncHooks");
    let n = 0;
    const off = onLocalWrite(() => n++);
    const flush = () => new Promise((r) => setTimeout(r, 0));
    await setDaily("2026-09-10", { tasks: {}, wake: null }); // create
    await flush();
    expect(n).toBe(1);
    await setDaily("2026-09-10", { tasks: { a: true }, wake: null }); // put روی ردیفِ dirtyِ موجود
    await flush();
    expect(n).toBe(2);
    await applyRemote("dailyEntries", remoteDaily({ date: "2026-09-11", tasks: {}, wake: null, editedAt: T1, updatedAt: T1 }));
    await applyRemote("dailyEntries", remoteDaily({ date: "2026-09-10", tasks: {}, wake: null, editedAt: "2099-01-01T00:00:00.000Z", updatedAt: T1 }));
    await flush();
    expect(n).toBe(2);
    off();
  });
});
