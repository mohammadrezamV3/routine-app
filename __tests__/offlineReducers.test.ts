import { describe, it, expect } from "vitest";
import {
  reduceMutation, normalizeUrl, remapIds, tmpIdFor, isTmpId, requestIdOfTmp, affectedPrefixes,
  synthDaily, synthDailyRange, synthSleep, synthCalorieLog, synthExerciseLog,
  type CachedJson, type Mutation,
} from "@/lib/offline/reducers";

const mut = (p: Partial<Mutation> & Pick<Mutation, "method" | "path">): Mutation => ({
  query: new URLSearchParams(), body: null, requestId: "req1", now: Date.parse("2026-10-24T10:00:00Z"), ...p,
});
const q = (s: string) => new URLSearchParams(s);
const apply = (cached: CachedJson[], updates: CachedJson[]) => {
  const m = new Map(cached.map((c) => [c.url, c.json]));
  for (const u of updates) m.set(u.url, u.json);
  return m;
};

describe("offline reducers — url", () => {
  it("normalizeUrl پارامترها را مرتب می‌کند", () => {
    expect(normalizeUrl("/api/x", "b=2&a=1")).toBe("/api/x?a=1&b=2");
    expect(normalizeUrl("/api/x", "")).toBe("/api/x");
  });
  it("remapIds شناسه‌ی موقت را در متن عوض می‌کند", () => {
    expect(remapIds('{"id":"tmp_a","t":["tmp_a","tmp_b"]}', { tmp_a: "real1" })).toBe('{"id":"real1","t":["real1","tmp_b"]}');
    expect(isTmpId(tmpIdFor("abc"))).toBe(true);
    expect(requestIdOfTmp(tmpIdFor("abc"))).toBe("abc");
  });
  it("affectedPrefixes", () => {
    expect(affectedPrefixes("/api/tasks/daily")).toEqual(["/api/tasks/daily"]);
    expect(affectedPrefixes("/api/trade/tags")).toContain("/api/trade/entries");
    expect(affectedPrefixes("/api/nothing")).toEqual([]);
  });
});

describe("offline reducers — روزانه و تنظیمات", () => {
  const rec = { tasks: { a: true }, wake: null };
  it("daily: روز تکی، بازه‌ی شامل و keys به‌روز می‌شن؛ بازه‌ی نامرتبط دست‌نخورده", () => {
    const cached: CachedJson[] = [
      { url: "/api/tasks/daily/range?from=2026-10-01&to=2026-10-31", json: { entries: { "2026-10-01": { tasks: {}, wake: null } } } },
      { url: "/api/tasks/daily/range?from=2026-09-01&to=2026-09-30", json: { entries: {} } },
      { url: "/api/tasks/daily/keys", json: { keys: ["2026-10-01"] } },
    ];
    const r = reduceMutation(mut({ method: "POST", path: "/api/tasks/daily", body: { date: "2026-10-24", ...rec } }), cached)!;
    expect(r.queue).toBe(true);
    const m = apply(cached, r.updates);
    expect(m.get("/api/tasks/daily?date=2026-10-24")).toEqual(rec);
    expect(m.get("/api/tasks/daily/range?from=2026-10-01&to=2026-10-31").entries["2026-10-24"]).toEqual(rec);
    expect(m.get("/api/tasks/daily/range?from=2026-09-01&to=2026-09-30").entries).toEqual({});
    expect(m.get("/api/tasks/daily/keys").keys).toEqual(["2026-10-01", "2026-10-24"]);
  });
  it("daily با تاریخ نامعتبر کاهنده ندارد (فقط صف می‌شود)", () => {
    expect(reduceMutation(mut({ method: "POST", path: "/api/tasks/daily", body: { date: "x" } }), [])).toBeNull();
  });
  it("setting: مقدار جدید با updatedAt", () => {
    const r = reduceMutation(mut({ method: "POST", path: "/api/settings/theme", body: { value: "dark" } }), [])!;
    expect(r.updates[0].url).toBe("/api/settings/theme");
    expect(r.updates[0].json.value).toBe("dark");
  });
});

describe("offline reducers — خواب", () => {
  const rec = (date: string) => ({ date, sleptAt: `${date}T00:00:00.000Z`, wokeAt: `${date}T07:00:00.000Z` });
  it("upsert مرتب در بازه‌ی شامل و حذف", () => {
    const cached: CachedJson[] = [{ url: "/api/sleep?from=2026-10-20&to=2026-10-26", json: { entries: [rec("2026-10-20"), rec("2026-10-25")] } }];
    const r = reduceMutation(mut({ method: "POST", path: "/api/sleep", body: rec("2026-10-22") }), cached)!;
    const list = apply(cached, r.updates).get("/api/sleep?from=2026-10-20&to=2026-10-26").entries.map((e: any) => e.date);
    expect(list).toEqual(["2026-10-20", "2026-10-22", "2026-10-25"]);
    expect((r.response as any).entry.tags).toEqual([]);
    const del = reduceMutation(mut({ method: "DELETE", path: "/api/sleep", query: q("date=2026-10-20") }), cached)!;
    expect(apply(cached, del.updates).get("/api/sleep?from=2026-10-20&to=2026-10-26").entries.map((e: any) => e.date)).toEqual(["2026-10-25"]);
  });
  it("synthSleep: ترکیب بازه‌ها و رکورد تکی تازه", () => {
    const cached: CachedJson[] = [
      { url: "/api/sleep?from=2026-10-01&to=2026-10-10", json: { entries: [rec("2026-10-02")] }, storedAt: 1 },
      { url: "/api/sleep?from=2026-10-11&to=2026-10-11", json: { entries: [rec("2026-10-11")] }, storedAt: 2 },
    ];
    expect(synthSleep("2026-10-01", "2026-10-20", cached)!.entries.map((e) => e.date)).toEqual(["2026-10-02", "2026-10-11"]);
    expect(synthSleep("2026-10-01", "2026-10-20", [])).toBeNull();
  });
});

describe("offline reducers — تمرین", () => {
  it("log تکی و بازه، started بدون پاک شدن آیتم‌ها", () => {
    const cached: CachedJson[] = [
      { url: "/api/exercise/log/range?end=2026-10-31&planId=p1&start=2026-10-01", json: { logs: {} } },
      { url: "/api/exercise/log/range?end=2026-10-31&planId=p2&start=2026-10-01", json: { logs: {} } },
    ];
    const r = reduceMutation(mut({ method: "POST", path: "/api/exercise/log", body: { planId: "p1", date: "2026-10-24", completed: false, completedItems: ["a"] } }), cached)!;
    let m = apply(cached, r.updates);
    expect(m.get("/api/exercise/log?date=2026-10-24&planId=p1")).toEqual({ completed: false, completedItems: ["a"], started: false });
    expect(m.get("/api/exercise/log/range?end=2026-10-31&planId=p1&start=2026-10-01").logs["2026-10-24"].completedItems).toEqual(["a"]);
    expect(m.get("/api/exercise/log/range?end=2026-10-31&planId=p2&start=2026-10-01").logs).toEqual({});
    const cached2 = r.updates;
    const s = reduceMutation(mut({ method: "POST", path: "/api/exercise/log", body: { planId: "p1", date: "2026-10-24", started: true } }), cached2)!;
    m = apply(cached2, s.updates);
    expect(m.get("/api/exercise/log?date=2026-10-24&planId=p1")).toMatchObject({ started: true, completedItems: ["a"] });
    expect(synthExerciseLog("p1", "2026-10-05", cached)).toEqual({ completed: false, completedItems: [], started: false });
  });
});

describe("offline reducers — کالری", () => {
  const body = { date: "2026-10-24", customName: "نان", customCalories: 200, grams: 80, mealType: "lunch" };
  it("افزودن با شناسه‌ی موقت و شکل پاسخ واقعی؛ حذف شناسه‌ی موقت = لغو ساخت صف‌شده", () => {
    const cached: CachedJson[] = [
      { url: "/api/calorie/log?date=2026-10-24", json: { entries: [{ id: "old", date: "2026-10-24T00:00:00.000Z" }] } },
      { url: "/api/calorie/log/range?from=2026-10-20&to=2026-10-30", json: { entries: [{ id: "x", date: "2026-10-25T00:00:00.000Z" }, { id: "old", date: "2026-10-24T00:00:00.000Z" }] } },
    ];
    const r = reduceMutation(mut({ method: "POST", path: "/api/calorie/log", body }), cached)!;
    const entry = (r.response as any).entry;
    expect(entry.id).toBe("tmp_req1");
    expect(entry).toMatchObject({ customName: "نان", customCalories: 200, grams: 80, proteinG: null, aiScanned: false });
    const m = apply(cached, r.updates);
    expect(m.get("/api/calorie/log?date=2026-10-24").entries.map((e: any) => e.id)).toEqual(["old", "tmp_req1"]);
    expect(m.get("/api/calorie/log/range?from=2026-10-20&to=2026-10-30").entries.map((e: any) => e.id)).toEqual(["x", "tmp_req1", "old"]);

    const after = r.updates;
    const del = reduceMutation(mut({ method: "DELETE", path: "/api/calorie/log", query: q("id=tmp_req1"), requestId: "req2" }), after)!;
    expect(del.queue).toBe(false);
    expect(del.cancelQueued).toBe("tmp_req1");
    expect(apply(after, del.updates).get("/api/calorie/log?date=2026-10-24").entries.map((e: any) => e.id)).toEqual(["old"]);

    const realDel = reduceMutation(mut({ method: "DELETE", path: "/api/calorie/log", query: q("id=old") }), cached)!;
    expect(realDel.queue).toBe(true);
  });
  it("write-through با پاسخ واقعی سرور از شناسه‌ی واقعی استفاده می‌کند", () => {
    const real = { ok: true, entry: { id: "srv1", date: "2026-10-24T00:00:00.000Z" } };
    const r = reduceMutation(mut({ method: "POST", path: "/api/calorie/log", body }), [], real)!;
    expect(r.updates[0].json.entries[0].id).toBe("srv1");
  });
  it("synthCalorieLog از بازه", () => {
    const cached: CachedJson[] = [{ url: "/api/calorie/log/range?from=2026-10-20&to=2026-10-30", json: { entries: [{ id: "a", date: "2026-10-24T00:00:00.000Z" }, { id: "b", date: "2026-10-25T00:00:00.000Z" }] } }];
    expect(synthCalorieLog("2026-10-24", cached)!.entries.map((e) => e.id)).toEqual(["a"]);
    expect(synthCalorieLog("2026-11-24", cached)).toBeNull();
  });
});

describe("offline reducers — ترید", () => {
  const tag = { id: "t1", name: "A", color: "#111111" };
  const tradeBody = {
    accountId: "acc1", symbol: "eurusd", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: 50, riskAmount: 25,
    openedAt: "2026-10-24T10:00:00.000Z", tagIds: ["t1"], images: [{ dataUrl: "data:image/png;base64,AA" }],
  };
  const lists = (): CachedJson[] => [
    { url: "/api/trade/entries?accountId=acc1", json: { entries: [{ id: "e0", accountId: "acc1", openedAt: "2026-10-20T10:00:00.000Z" }] } },
    { url: "/api/trade/entries?accountId=acc2", json: { entries: [] } },
    { url: "/api/trade/tags", json: { tags: [tag] } },
  ];
  it("create / patch (روی tmp ادغام در صف) / delete", () => {
    const c = lists();
    const r = reduceMutation(mut({ method: "POST", path: "/api/trade/entries", body: tradeBody }), c)!;
    const e = (r.response as any).entry;
    expect(e).toMatchObject({ id: "tmp_req1", symbol: "EURUSD", pnl: 50, rMultiple: 2, imageCount: 1, tags: [tag] });
    const m = apply(c, r.updates);
    expect(m.get("/api/trade/entries?accountId=acc1").entries.map((x: any) => x.id)).toEqual(["tmp_req1", "e0"]);
    expect(m.get("/api/trade/entries?accountId=acc2").entries).toEqual([]);

    const cached2 = [...c.filter((x) => !r.updates.find((u) => u.url === x.url)), ...r.updates];
    const p = reduceMutation(mut({ method: "PATCH", path: "/api/trade/entries", body: { ...tradeBody, id: "tmp_req1", pnl: 60, requestId: undefined } }), cached2)!;
    expect(p.queue).toBe(false);
    expect(p.mergeQueued!.tmpId).toBe("tmp_req1");
    expect((p.mergeQueued!.patch as any).id).toBeUndefined();
    expect(apply(cached2, p.updates).get("/api/trade/entries?accountId=acc1").entries[0].pnl).toBe(60);

    const d = reduceMutation(mut({ method: "DELETE", path: "/api/trade/entries", query: q("id=e0") }), c)!;
    expect(d.queue).toBe(true);
    expect(apply(c, d.updates).get("/api/trade/entries?accountId=acc1").entries).toEqual([]);
  });
  it("لیست فیلترشده با بازه‌ی تاریخ فقط معامله‌ی داخل بازه را می‌گیرد", () => {
    const c: CachedJson[] = [{ url: "/api/trade/entries?accountId=acc1&from=2026-10-01&to=2026-10-10", json: { entries: [] } }];
    const r = reduceMutation(mut({ method: "POST", path: "/api/trade/entries", body: tradeBody }), c)!;
    expect(apply(c, r.updates).get(c[0].url).entries).toEqual([]);
  });
  it("برچسب: ساخت، تغییر نام در معامله‌ها، حذف", () => {
    const c = lists();
    c[0].json.entries[0].tags = [tag];
    const created = reduceMutation(mut({ method: "POST", path: "/api/trade/tags", body: { name: "B" } }), c)!;
    expect((created.response as any).tag).toEqual({ id: "tmp_req1", name: "B", color: "#3E7BFA" });
    expect(apply(c, created.updates).get("/api/trade/tags").tags).toHaveLength(2);
    const ren = reduceMutation(mut({ method: "PATCH", path: "/api/trade/tags", body: { id: "t1", name: "Z" } }), c)!;
    const m = apply(c, ren.updates);
    expect(m.get("/api/trade/tags").tags[0].name).toBe("Z");
    expect(m.get("/api/trade/entries?accountId=acc1").entries[0].tags[0].name).toBe("Z");
    const del = reduceMutation(mut({ method: "DELETE", path: "/api/trade/tags", query: q("id=t1") }), c)!;
    expect(apply(c, del.updates).get("/api/trade/entries?accountId=acc1").entries[0].tags).toEqual([]);
  });
  it("چک‌لیست: ساخت با آیتم، تیک آیتم، حذف tmp = لغو", () => {
    const c: CachedJson[] = [{ url: "/api/trade/checklists", json: { checklists: [{ id: "c1", name: "N", items: [{ id: "i1", text: "x", checked: false }] }] } }];
    const r = reduceMutation(mut({ method: "POST", path: "/api/trade/checklists", body: { name: "New", items: ["a", "b"] } }), c)!;
    const cl = (r.response as any).checklist;
    expect(cl.id).toBe("tmp_req1");
    expect(cl.items.map((i: any) => i.text)).toEqual(["a", "b"]);
    const tick = reduceMutation(mut({ method: "PATCH", path: "/api/trade/checklists/c1/items", body: { itemId: "i1", checked: true } }), c)!;
    expect(apply(c, tick.updates).get("/api/trade/checklists").checklists[0].items[0].checked).toBe(true);
    const del = reduceMutation(mut({ method: "DELETE", path: "/api/trade/checklists", query: q("id=tmp_req1") }), r.updates)!;
    expect(del.cancelQueued).toBe("tmp_req1");
  });
  it("یادداشت: ساخت، فیلتر q/tags/accountId، مرتب‌سازی", () => {
    const c: CachedJson[] = [
      { url: "/api/trade/notes", json: { notes: [{ id: "n0", title: "old", content: "", pinned: false, updatedAt: "2026-10-01T00:00:00.000Z", tags: [] }] } },
      { url: "/api/trade/notes?q=zzz", json: { notes: [] } },
      { url: "/api/trade/tags", json: { tags: [tag] } },
    ];
    const r = reduceMutation(mut({ method: "POST", path: "/api/trade/notes", body: { title: "Hello", content: "c", tagIds: ["t1"], pinned: true } }), c)!;
    const m = apply(c, r.updates);
    expect(m.get("/api/trade/notes").notes.map((n: any) => n.id)).toEqual(["tmp_req1", "n0"]);
    expect(m.get("/api/trade/notes?q=zzz").notes).toEqual([]);
    expect((r.response as any).note.tags).toEqual([tag]);
  });
});

describe("offline reducers — ترکیب خواندن", () => {
  it("synthDaily و synthDailyRange: تازه‌ترین پوشش برنده؛ بدون کش null", () => {
    const cached: CachedJson[] = [
      { url: "/api/tasks/daily/range?from=2026-10-01&to=2026-10-31", json: { entries: { "2026-10-05": { tasks: { a: true }, wake: null } } }, storedAt: 1 },
      { url: "/api/tasks/daily?date=2026-10-05", json: { tasks: { a: false }, wake: null }, storedAt: 2 },
    ];
    expect(synthDaily("2026-10-05", cached)).toEqual({ tasks: { a: false }, wake: null });
    expect(synthDaily("2026-10-06", cached)).toEqual({ tasks: {}, wake: null });
    expect(synthDaily("2026-12-06", cached)).toBeNull();
    expect(synthDailyRange("2026-10-01", "2026-10-10", cached)!.entries["2026-10-05"].tasks).toEqual({ a: false });
    expect(synthDailyRange("2026-10-01", "2026-10-10", [])).toBeNull();
  });
});
