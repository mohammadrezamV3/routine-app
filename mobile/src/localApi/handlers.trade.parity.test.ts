// parity (فاز 3): هندلرهای LOCAL ِ ترید در برابرِ *خودِ فایل‌های روتِ وب*
// (app/api/trade/**) — همون الگوی handlers.fitness.parity.test.ts: روتِ وب با
// prisma/requireModule ِ ساختگی اجرا می‌شه و خروجیِ هر دو طرف (status + JSON)
// باید یکی باشه.
//
// دیتای اولیه‌ی هر دو طرف از *یک* fixtureِ Prisma ساخته می‌شه: طرفِ وب همون
// ردیف، طرفِ اپ از مسیرِ واقعیِ pull (serializeTrade* ِ سرور ← remote* ِ آداپتورِ
// سینک). id/زمان‌های تازه (cuid ِ Prisma در برابرِ id ِ محلی، now ِ سرور در برابرِ
// now ِ محلی) فقط از نظرِ نوع مقایسه می‌شن — VOLATILE.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── fake Prisma عمومی (چندجدولی، با رابطه‌ی تگ M2M و $transaction) ───────
const fake = vi.hoisted(() => {
  type Row = Record<string, any>;
  const state = {
    accounts: new Map<string, Row>(),
    entries: new Map<string, Row>(),
    checklists: new Map<string, Row>(),
    checklistItems: new Map<string, Row>(),
    notes: new Map<string, Row>(),
    tags: new Map<string, Row>(),
    settings: new Map<string, Row>(),
    locked: new Set<string>(),
  };
  let seq = 0;
  const cuid = () => `cweb${String(++seq).padStart(21, "0")}`;
  const same = (a: any, b: any) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
  function matches(row: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([k, v]) => {
      if (k === "OR") return (v as Row[]).some((c) => matches(row, c));
      if (k === "NOT") return !matches(row, v as Row);
      const cur = row[k];
      if (v === null) return cur === null || cur === undefined;
      if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
        if ("gte" in v || "lte" in v) return (!("gte" in v) || cur >= v.gte) && (!("lte" in v) || cur <= v.lte);
        if ("not" in v) return !same(cur, v.not);
        if ("in" in v) return v.in.includes(cur);
        if ("contains" in v) return typeof cur === "string" && cur.toLowerCase().includes(String(v.contains).toLowerCase());
        if ("some" in v) return (row._m2m ?? []).some((id: string) => matches({ id }, v.some));
        return false;
      }
      return same(cur, v);
    });
  }
  function orderKeys(orderBy?: Row | Row[]): [string, string][] {
    if (!orderBy) return [];
    const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
    return arr.map((o) => Object.entries(o)[0] as [string, string]);
  }
  function order(rows: Row[], orderBy?: Row | Row[]): Row[] {
    const keys = orderKeys(orderBy);
    if (!keys.length) return rows;
    return [...rows].sort((a, b) => {
      for (const [k, dir] of keys) {
        const av = a[k];
        const bv = b[k];
        let cmp = av < bv ? -1 : av > bv ? 1 : 0;
        if (dir === "desc") cmp = -cmp;
        if (cmp) return cmp;
      }
      return 0;
    });
  }

  // ── تگ M2M: هر ردیف یک `_m2m: string[]` (idِ برچسب‌ها) نگه می‌داره ──────
  function applyTagRelation(row: Row, data: Row) {
    if (data.tags?.connect) row._m2m = [...new Set([...(row._m2m ?? []), ...data.tags.connect.map((c: Row) => c.id)])];
    if (data.tags?.set) row._m2m = data.tags.set.map((c: Row) => c.id);
    delete data.tags;
  }
  function projectTags(row: Row) {
    return (row._m2m ?? []).map((id: string) => state.tags.get(id)).filter(Boolean).map((t: Row) => ({ id: t.id, name: t.name, color: t.color }));
  }

  function baseTable(map: Map<string, Row>, defaults: () => Row, opts: { onCreate?: (row: Row, data: Row) => void } = {}) {
    return {
      findFirst: async ({ where, orderBy, select }: any) => {
        const row = order([...map.values()].filter((r) => matches(r, where)), orderBy)[0];
        return row ? projectRow(row, select) : null;
      },
      findMany: async ({ where, orderBy, take, select, include }: any) => {
        let rows = order([...map.values()].filter((r) => matches(r, where)), orderBy);
        if (take) rows = rows.slice(0, take);
        return rows.map((r) => projectRow(r, select ?? include, !!include));
      },
      count: async ({ where }: any = {}) => [...map.values()].filter((r) => matches(r, where)).length,
      create: async ({ data, select }: any) => {
        const now = new Date();
        const row: Row = { id: cuid(), createdAt: now, updatedAt: now, ...defaults(), ...data };
        applyTagRelation(row, row);
        opts.onCreate?.(row, data);
        map.set(row.id, row);
        return projectRow(row, select);
      },
      update: async ({ where, data, select }: any) => {
        const row = map.get(where.id)!;
        applyTagRelation(row, data);
        Object.assign(row, data, { updatedAt: new Date() });
        opts.onCreate?.(row, data);
        return projectRow(row, select);
      },
      updateMany: async ({ where, data }: any) => {
        const rows = [...map.values()].filter((r) => matches(r, where));
        for (const r of rows) Object.assign(r, data, { updatedAt: new Date() });
        return { count: rows.length };
      },
      deleteMany: async ({ where }: any) => {
        const ids = [...map.values()].filter((r) => matches(r, where)).map((r) => r.id);
        for (const id of ids) map.delete(id);
        return { count: ids.length };
      },
    };
  }

  function projectRow(row: Row, sel: any, isInclude = false): Row {
    if (!sel) {
      // بدونِ select/include: همه‌ی فیلدهای اسکالر (بدونِ بوکینگِ داخلیِ _m2m)
      const { _m2m, ...rest } = row;
      return rest;
    }
    const out: Row = isInclude ? { ...(() => { const { _m2m, ...r } = row; return r; })() } : {};
    for (const [k, v] of Object.entries(sel)) {
      if (v === true) out[k] = row[k];
      else if (k === "tags") out.tags = projectTags(row);
      else if (k === "images") {
        const conf = v as Row;
        let imgs = (row.images ?? []).slice();
        imgs = order(imgs, conf.orderBy);
        out.images = imgs.map((i: Row) => projectRow(i, conf.select));
      } else if (k === "items") {
        const conf = v as Row;
        let items = [...state.checklistItems.values()].filter((i) => i.checklistId === row.id);
        items = order(items, conf.orderBy);
        out.items = items.map((i: Row) => projectRow(i, conf.select));
      } else if (k === "_count") {
        const conf = (v as Row).select;
        out._count = {};
        if (conf?.images) out._count.images = (row.images ?? []).length;
      } else if (k === "mtLink") {
        out.mtLink = row.mtLink ?? null;
      }
    }
    return out;
  }

  const accounts = baseTable(state.accounts, () => ({
    broker: null, leverage: null, note: null, archived: false, archivedAt: null, order: 0, mtLink: null,
  }));
  const tags = baseTable(state.tags, () => ({}));
  const notes = baseTable(state.notes, () => ({ accountId: null, entryId: null }));
  const checklists = baseTable(state.checklists, () => ({ color: "#3E7BFA", required: false, archived: false, order: 0, note: null }), {
    onCreate: (row, data) => {
      if (Array.isArray(data.items?.create)) {
        for (const it of data.items.create) state.checklistItems.set(cuid(), { id: [...state.checklistItems.keys()].length as any });
      }
    },
  });
  // چک‌لیست: آیتم‌ها با create: [...] موقعِ ساخت
  const realChecklistCreate = checklists.create;
  (checklists as any).create = async ({ data, select }: any) => {
    const itemsCreate = data.items?.create as Row[] | undefined;
    const { items, ...rest } = data;
    const row = await realChecklistCreate({ data: rest, select: undefined });
    if (itemsCreate) {
      for (const it of itemsCreate) {
        const id = cuid();
        state.checklistItems.set(id, { id, checklistId: row.id, text: it.text, order: it.order, checked: false });
      }
    }
    return select ? projectRow(state.checklists.get(row.id)!, select) : state.checklists.get(row.id)!;
  };

  const entries = baseTable(state.entries, () => ({
    riskFree: false, entryReasons: [], exitReasons: [], images: [],
    checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: null,
    externalId: null,
  }), {
    onCreate: (row, data) => {
      if (Array.isArray(data.images?.create)) row.images = data.images.create.map((im: Row, i: number) => ({ id: cuid(), dataUrl: im.dataUrl, caption: im.caption, order: im.order ?? i }));
      delete row.images_create;
    },
  });

  const checklistItems = {
    updateMany: async ({ where, data }: any) => {
      const rows = [...state.checklistItems.values()].filter((r) => matches(r, where));
      for (const r of rows) Object.assign(r, data);
      return { count: rows.length };
    },
    deleteMany: async ({ where }: any) => {
      const ids = [...state.checklistItems.values()].filter((r) => matches(r, where)).map((r) => r.id);
      for (const id of ids) state.checklistItems.delete(id);
      return { count: ids.length };
    },
    createMany: async ({ data }: any) => {
      for (const d of data) {
        const id = cuid();
        state.checklistItems.set(id, { checked: false, ...d, id });
      }
      return { count: data.length };
    },
  };

  const images = {
    deleteMany: async ({ where }: any) => {
      const entry = [...state.entries.values()].find((e) => e.id === where.entryId);
      if (entry) entry.images = [];
      return { count: 0 };
    },
  };

  const userSetting = {
    findUnique: async ({ where }: any) => state.settings.get(where.userId_key.key) ?? null,
    upsert: async ({ where }: any) => {
      state.settings.set(where.userId_key.key, { value: true });
      return { value: true };
    },
  };

  async function runTx(arg: any) {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg({ tradeChecklistItem: checklistItems, tradeChecklist: checklists });
  }

  const prisma = {
    tradeAccount: accounts,
    tradeEntry: entries,
    tradeChecklist: checklists,
    tradeChecklistItem: checklistItems,
    tradeNote: notes,
    tradeTag: tags,
    tradeImage: images,
    userSetting,
    $transaction: runTx,
  };
  const NextResponse = {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), { status: init?.status ?? 200, headers: { "Content-Type": "application/json" } }),
  };
  return { state, prisma, NextResponse, cuid };
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

const webRoute = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const webAccounts = await webRoute("@/app/api/trade/accounts/route");
const webEntries = await webRoute("@/app/api/trade/entries/route");
const webEntryDetail = await webRoute("@/app/api/trade/entries/[id]/route");
const webChecklists = await webRoute("@/app/api/trade/checklists/route");
const webChecklistItems = await webRoute("@/app/api/trade/checklists/[id]/items/route");
const webNotes = await webRoute("@/app/api/trade/notes/route");
const webTags = await webRoute("@/app/api/trade/tags/route");
const { serializeTradeAccount, serializeTradeTag, serializeTradeChecklist, serializeTradeEntry, serializeTradeNote } = await webRoute("@/lib/mobileTradeSync");

import { db as tradeDb } from "@m/features/trade/db";
import { remoteAccount, remoteTag, remoteChecklist, remoteEntry, remoteNote } from "@m/sync/tradeAdapter";
import { json as jsonRes, loggedInClient, TEST_USER, type Call } from "@m/sync/testUtils";
import { clearAccountSnapshot } from "./accountState";
import { storeCached } from "./cache";
import { configureLocalApi } from "./services";
import { dispatch } from "./dispatch";
import { SyncEngine } from "@m/sync/syncEngine";

const ORIGIN = "https://localhost";
const T0 = new Date("2026-09-20T08:00:00.000Z");
/** ISOِ رشته‌ای — برای بدنه‌ی JSONِ POST/PATCH */
const at = (min: number) => new Date(T0.getTime() + min * 60_000).toISOString();
/** Date ِ واقعی — برای فیکسچرِ ردیفِ Prisma (سمتِ وب) */
const atDate = (min: number) => new Date(T0.getTime() + min * 60_000);

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
const patch = (b: unknown) => send("PATCH", b);

/** id و زمان‌های تازه‌ی نوشتن ← فقط نوع (کوید ِ وب در برابرِ idِ محلی، now ِ سرور در برابرِ now ِ محلی) */
const VOLATILE = new Set(["id", "createdAt", "updatedAt"]);
function loose(v: any): any {
  if (Array.isArray(v)) return v.map(loose);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, VOLATILE.has(k) ? typeof x : loose(x)]));
  }
  return v;
}
const looseBody = (b: { status: number; json: any }) => ({ status: b.status, json: loose(b.json) });

// ─── seed: یک fixture ← ردیفِ Prisma (وب) + ردیفِ pull‌شده (اپ) ─────────────

function tagsOfIds(ids: string[] | undefined) {
  return (ids ?? []).map((id) => fake.state.tags.get(id)).filter(Boolean).map((t: any) => ({ id: t.id, name: t.name, color: t.color }));
}

async function seedAccount(a: Record<string, any>) {
  const row: Record<string, any> = {
    userId: "u1", broker: null, leverage: null, note: null, archived: false, archivedAt: null, order: 0,
    createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null, mtLink: null, _m2m: [], ...a,
  };
  fake.state.accounts.set(row.id, row);
  await tradeDb.accounts.put(remoteAccount(serializeTradeAccount({ ...row, tags: tagsOfIds(row._m2m) })));
  return row;
}

async function seedTag(t: Record<string, any>) {
  const row: Record<string, any> = { userId: "u1", createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null, ...t };
  fake.state.tags.set(row.id, row);
  await tradeDb.tags.put(remoteTag(serializeTradeTag(row)));
  return row;
}

async function seedChecklist(c: Record<string, any>, items: { id: string; text: string; order: number; checked?: boolean }[] = []) {
  const row: Record<string, any> = { userId: "u1", color: "#3E7BFA", required: false, archived: false, order: 0, note: null, createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null, ...c };
  fake.state.checklists.set(row.id, row);
  for (const it of items) fake.state.checklistItems.set(it.id, { checklistId: row.id, checked: false, updatedAt: T0, ...it });
  const rec = serializeTradeChecklist({
    ...row,
    items: items.map((it) => fake.state.checklistItems.get(it.id)!),
  } as any);

  const { row: localRow, items: localItems } = remoteChecklist(rec);
  await tradeDb.checklists.put(localRow);
  await tradeDb.checklistItems.bulkPut(localItems);
  return row;
}

async function seedEntry(e: Record<string, any>) {
  const row: Record<string, any> = {
    userId: "u1", symbol: "EURUSD", direction: "BUY", status: "OPEN", result: "PROFIT", pnl: 0, volume: 1,
    volumeUnit: "LOT", openedAt: atDate(0),
    riskFree: false, timeframe: null, closedAt: null, entryPrice: null, exitPrice: null,
    stopLoss: null, takeProfit: null, commission: null, swap: null, riskAmount: null, rMultiple: null,
    sessions: [], setup: null, entryReasons: [], exitReasons: [], entryReasonNote: null, exitReasonNote: null,
    note: null, emotionBefore: null, emotionAfter: null, confidence: null, followedPlan: null,
    checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: null,
    images: [], externalId: null, externalSource: null, syncLocked: false, manualEditedAt: null, _m2m: [],
    createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null, ...e,
  };
  row.manualEditedAt = row.manualEditedAt ?? row.updatedAt;
  fake.state.entries.set(row.id, row);
  await tradeDb.trades.put(remoteEntry(serializeTradeEntry({ ...row, tags: tagsOfIds(row._m2m), _count: { images: (row.images ?? []).length } })));
  return row;
}

async function seedNote(n: Record<string, any>) {
  const row: Record<string, any> = { userId: "u1", accountId: null, entryId: null, pinned: false, createdAt: T0, updatedAt: T0, syncEditedAt: null, syncWrittenAt: null, _m2m: [], ...n };
  fake.state.notes.set(row.id, row);
  await tradeDb.notes.put(remoteNote(serializeTradeNote({ ...row, tags: tagsOfIds(row._m2m) })));
  return row;
}

let currentTokens: Awaited<ReturnType<typeof loggedInClient>>["tokens"];

/** قفلِ TRADE هم‌زمان سمتِ وب (fake requireModule) و سمتِ اپ (fallback ماژول‌های
 *  کاربر — چون هیچ /api/account کش‌شده‌ای در این تست‌ها ذخیره نمی‌شه). */
async function lockTrade(locked: boolean) {
  fake.state.locked = new Set(locked ? ["TRADE"] : []);
  await currentTokens.setUser({ ...TEST_USER, modules: locked ? ["ROUTINE", "SLEEP", "TASKS"] : ["ROUTINE", "SLEEP", "TASKS", "TRADE"] });
}

let network: (c: Call) => Response | Promise<Response> = () => new Response(null, { status: 599 });

beforeEach(async () => {
  for (const m of [fake.state.accounts, fake.state.entries, fake.state.checklists, fake.state.checklistItems, fake.state.notes, fake.state.tags, fake.state.settings]) m.clear();
  fake.state.locked = new Set();
  network = () => new Response(null, { status: 599 });
  clearAccountSnapshot();
  await tradeDb.delete().then(() => tradeDb.open());
  const { tokens, api, kv } = await loggedInClient((c) => network(c));
  currentTokens = tokens;
  await tokens.setUser({ ...TEST_USER, modules: ["ROUTINE", "SLEEP", "TASKS", "TRADE"] });
  configureLocalApi({ tokens, api, engine: new SyncEngine(api, kv, []), syncEnabled: true });
});

const ACC = "cacc00000000000000000001";
const ACC2 = "cacc00000000000000000002";

// ─── حساب‌ها ────────────────────────────────────────────────────────────

describe("trade/accounts parity", () => {
  it("GET empty → same", async () => {
    expect(await body(await local("/api/trade/accounts"))).toEqual(await body(await webAccounts.GET(webReq("/api/trade/accounts"))));
  });

  it("GET: summary/mtConnected/order identical, with trades feeding the stats", async () => {
    await seedAccount({ id: ACC, name: "حساب اصلی", initialBalance: 1000, goalType: "PERCENT", goalValue: 10, order: 0 });
    await seedAccount({ id: ACC2, name: "دمو", type: "DEMO", initialBalance: 500, order: 1, archived: true, archivedAt: T0 });
    await seedEntry({ id: "cent0000000000000000001", accountId: ACC, symbol: "EURUSD", direction: "BUY", status: "CLOSED", result: "PROFIT", pnl: 50, openedAt: atDate(0) });
    await seedEntry({ id: "cent0000000000000000002", accountId: ACC, symbol: "GBPUSD", direction: "SELL", status: "OPEN", result: "PROFIT", pnl: 0, openedAt: atDate(10) });

    expect(await body(await local("/api/trade/accounts"))).toEqual(await body(await webAccounts.GET(webReq("/api/trade/accounts"))));
    const q = "/api/trade/accounts?archived=1";
    expect(await body(await local(q))).toEqual(await body(await webAccounts.GET(webReq(q))));
  });

  const posts: [string, unknown][] = [
    ["minimal", { name: "حساب من" }],
    ["full", { name: "پراپ", broker: "FTMO", type: "PROP", currency: "eur", initialBalance: 10000, leverage: 100, color: "#112233", note: "یادداشت", goalType: "AMOUNT", goalValue: 500 }],
    ["no name", { name: "" }],
    ["bad type", { name: "x", type: "FAKE" }],
    ["bad color", { name: "x", color: "blue" }],
  ];
  it.each(posts)("POST %s → same status/body; read-back identical", async (_n, payload) => {
    const w = looseBody(await body(await webAccounts.POST(webReq("/api/trade/accounts", post(payload)))));
    const l = looseBody(await body(await local("/api/trade/accounts", post(payload))));
    expect(l).toEqual(w);
    expect(looseBody(await body(await local("/api/trade/accounts")))).toEqual(looseBody(await body(await webAccounts.GET(webReq("/api/trade/accounts")))));
  });

  it("POST beyond MAX_ACCOUNTS active accounts → same 400", async () => {
    for (let i = 0; i < 10; i++) await seedAccount({ id: `cacc0000000000000000${String(i).padStart(3, "0")}`, name: `a${i}`, order: i });
    const payload = { name: "extra" };
    expect(await body(await local("/api/trade/accounts", post(payload)))).toEqual(await body(await webAccounts.POST(webReq("/api/trade/accounts", post(payload)))));
  });

  it("PATCH: unknown id → 404; owned → same body, tags replaced", async () => {
    await seedAccount({ id: ACC, name: "a" });
    await seedTag({ id: "ctag0000000000000000001", name: "swing" });
    const bad = { id: "cnope00000000000000001", name: "x" };
    expect(await body(await local("/api/trade/accounts", patch(bad)))).toEqual(await body(await webAccounts.PATCH(webReq("/api/trade/accounts", patch(bad)))));

    const payload = { id: ACC, name: "ویرایش‌شده", tagIds: ["ctag0000000000000000001"] };
    const w = looseBody(await body(await webAccounts.PATCH(webReq("/api/trade/accounts", patch(payload)))));
    const l = looseBody(await body(await local("/api/trade/accounts", patch(payload))));
    expect(l).toEqual(w);
  });

  it("DELETE (archive, default) → same status; toggles back and forth", async () => {
    await seedAccount({ id: ACC, name: "a" });
    const q = `/api/trade/accounts?id=${ACC}`;
    const w = await body(await webAccounts.DELETE(webReq(q, { method: "DELETE" })));
    const l = await body(await local(q, { method: "DELETE" }));
    expect(l).toEqual(w);
    expect(l.json.archived).toBe(true);
  });

  it("DELETE ?mode=purge is ONLINE+barrier, not LOCAL — offline gives the standard 503, local Dexie untouched", async () => {
    await seedAccount({ id: ACC, name: "a" });
    const q = `/api/trade/accounts?id=${ACC}&mode=purge`;
    network = () => {
      throw new TypeError("Failed to fetch"); // آفلاینِ واقعی (نه فقط پاسخِ ناموفق)
    };
    const res = await local(q, { method: "DELETE" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "اتصال اینترنت برقرار نیست" });
    // هرگز محلی hard-delete نشده (فقط سرور، از راهِ tombstoneِ pull، این کار رو می‌کنه)
    expect(await tradeDb.accounts.get(ACC)).toBeDefined();
  });

  it("DELETE unknown id → same 404", async () => {
    const q = "/api/trade/accounts?id=cnope00000000000000002";
    expect(await body(await local(q, { method: "DELETE" }))).toEqual(await body(await webAccounts.DELETE(webReq(q, { method: "DELETE" }))));
  });

  it("locked TRADE → same 403", async () => {
    await lockTrade(true);
    expect(await body(await local("/api/trade/accounts"))).toEqual(await body(await webAccounts.GET(webReq("/api/trade/accounts"))));
  });
});

// ─── معاملات ──────────────────────────────────────────────────────────────

describe("trade/entries parity", () => {
  beforeEach(async () => {
    await seedAccount({ id: ACC, name: "a", initialBalance: 100 });
    await seedChecklist({ id: "ccl00000000000000000001", name: "چک‌لیستِ من" }, [
      { id: "citm000000000000000001", text: "سطح معتبره؟", order: 0 },
      { id: "citm000000000000000002", text: "تاییدیه؟", order: 1 },
    ]);
  });

  it("GET: unknown account → 404; range + list identical", async () => {
    const bad = "/api/trade/entries?accountId=cnope";
    expect(await body(await local(bad))).toEqual(await body(await webEntries.GET(webReq(bad))));

    await seedEntry({ id: "cent0000000000000000010", accountId: ACC, symbol: "EURUSD", direction: "BUY", status: "CLOSED", result: "PROFIT", pnl: 12, openedAt: atDate(0) });
    await seedEntry({ id: "cent0000000000000000011", accountId: ACC, symbol: "XAUUSD", direction: "SELL", status: "CLOSED", result: "LOSS", pnl: -8, openedAt: atDate(60 * 24) });
    for (const q of [`/api/trade/entries?accountId=${ACC}`, `/api/trade/entries?accountId=${ACC}&from=2026-09-20&to=2026-09-20`, `/api/trade/entries?accountId=${ACC}&from=bad&to=2026-09-20`]) {
      expect(await body(await local(q))).toEqual(await body(await webEntries.GET(webReq(q))));
    }
  });

  const openedAt = "2026-09-20T09:00:00.000Z"; // چهارشنبه — لندن باز
  const posts: [string, unknown][] = [
    ["closed profit with checklist", { accountId: ACC, symbol: "eurusd", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: 25, volume: 1, openedAt, riskAmount: 10, checklistId: "ccl00000000000000000001", checklistState: { citm000000000000000001: true } }],
    ["mismatched sign result/pnl", { accountId: ACC, symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: -1, volume: 1, openedAt }],
    ["bad symbol", { accountId: ACC, symbol: "  ", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: 1, volume: 1, openedAt }],
    ["future date", { accountId: ACC, symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "OPEN", pnl: 0, volume: 1, openedAt: "2999-01-01T00:00:00.000Z" }],
    ["unknown account", { accountId: "cnope", symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "OPEN", pnl: 0, volume: 1, openedAt }],
    ["with entry/exit reasons + emotions", { accountId: ACC, symbol: "XAUUSD", direction: "SELL", result: "LOSS", status: "CLOSED", pnl: -30, volume: 0.5, openedAt, entryReasons: ["STRATEGY", "NEWS"], exitReasons: ["STOP_LOSS"], emotionBefore: "ANXIOUS", emotionAfter: "REGRET", confidence: 7 }],
  ];
  it.each(posts)("POST %s → same status/body; checklist snapshot + session/R computed server-side", async (_n, payload) => {
    const w = looseBody(await body(await webEntries.POST(webReq("/api/trade/entries", post(payload)))));
    const l = looseBody(await body(await local("/api/trade/entries", post(payload))));
    expect(l).toEqual(w);
    if (w.status === 200) {
      const q = `/api/trade/entries?accountId=${(payload as any).accountId}`;
      expect(looseBody(await body(await local(q)))).toEqual(looseBody(await body(await webEntries.GET(webReq(q)))));
    }
  });

  it("checklist snapshot is immutable after creation even if the checklist text changes later (local-only invariant)", async () => {
    await local("/api/trade/entries", post({ accountId: ACC, symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: 20, volume: 1, openedAt, checklistId: "ccl00000000000000000001", checklistState: { citm000000000000000001: true, citm000000000000000002: true } }));
    const localRow = (await tradeDb.trades.toArray())[0];
    expect(localRow.checklistSnapshot).toEqual([
      { text: "سطح معتبره؟", checked: true },
      { text: "تاییدیه؟", checked: true },
    ]);

    // چک‌لیست بعدا عوض می‌شه — اسنپ‌شاتِ معامله‌ی قبلی نباید عوض بشه
    await local("/api/trade/checklists", patch({ id: "ccl00000000000000000001", items: ["متنِ جدید یک", "متنِ جدید دو"] }));
    expect((await tradeDb.trades.get(localRow.id))?.checklistSnapshot).toEqual([
      { text: "سطح معتبره؟", checked: true },
      { text: "تاییدیه؟", checked: true },
    ]);
  });

  it("PATCH replaces the full record (same accountId/id on both fixtures) → same status/body", async () => {
    const ID = "cent0000000000000000050";
    await seedEntry({ id: ID, accountId: ACC, symbol: "EURUSD", direction: "BUY", status: "CLOSED", result: "PROFIT", pnl: 20, volume: 1, openedAt: atDate(0) });
    const payload = { id: ID, accountId: ACC, symbol: "EURUSD", direction: "SELL", result: "LOSS", status: "CLOSED", pnl: -5, volume: 2, openedAt, checklistId: null };
    const w = looseBody(await body(await webEntries.PATCH(webReq("/api/trade/entries", patch(payload)))));
    const l = looseBody(await body(await local("/api/trade/entries", patch(payload))));
    expect(l).toEqual(w);
  });

  it("PATCH unknown id → same 404", async () => {
    const payload = { id: "cnope", accountId: ACC, symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "OPEN", pnl: 0, volume: 1, openedAt };
    expect(await body(await local("/api/trade/entries", patch(payload)))).toEqual(await body(await webEntries.PATCH(webReq("/api/trade/entries", patch(payload)))));
  });

  it("DELETE → same 200 (idempotent unknown id too)", async () => {
    await seedEntry({ id: "cent0000000000000000099", accountId: ACC });
    for (const q of ["/api/trade/entries?id=cent0000000000000000099", "/api/trade/entries?id=cnope"]) {
      expect(await body(await local(q, { method: "DELETE" }))).toEqual(await body(await webEntries.DELETE(webReq(q, { method: "DELETE" }))));
    }
  });

  it("detail: GET /api/trade/entries/:id → images + checklistSnapshot present, same shape", async () => {
    await local("/api/trade/entries", post({
      accountId: ACC, symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: 10, volume: 1, openedAt,
      checklistId: "ccl00000000000000000001", checklistState: { citm000000000000000001: true },
      images: [{ dataUrl: "data:image/png;base64,iVBORw0KGgo=", caption: "شات" }],
    }));
    const row = (await tradeDb.trades.toArray())[0];
    const l = looseBody(await body(await local(`/api/trade/entries/${row.id}`)));
    expect(l.status).toBe(200);
    expect(l.json.entry.checklistSnapshot).toEqual([{ text: "سطح معتبره؟", checked: true }, { text: "تاییدیه؟", checked: false }]);
    expect(l.json.entry.images).toHaveLength(1);
    expect(l.json.entry.images[0]).toMatchObject({ dataUrl: "data:image/png;base64,iVBORw0KGgo=", caption: "شات" });

    const missing = await body(await local("/api/trade/entries/cnope"));
    expect(missing).toEqual(await body(await webEntryDetail.GET(webReq("/api/trade/entries/cnope"), { params: { id: "cnope" } })));
  });

  it("UTC + real-DST session computation matches the web for a London-hours trade", async () => {
    // چهارشنبه ۹ صبحِ UTC، پاییز — لندن باز (DST تابستانی هنوز فعاله تا آخرِ اکتبر)
    const payload = { accountId: ACC, symbol: "GBPUSD", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: 5, volume: 1, openedAt: "2026-09-23T09:00:00.000Z" };
    const w = looseBody(await body(await webEntries.POST(webReq("/api/trade/entries", post(payload)))));
    const l = looseBody(await body(await local("/api/trade/entries", post(payload))));
    expect(l).toEqual(w);
    expect((w.json.entry.sessions as string[]).includes("LONDON")).toBe(true);
  });

  it("MT manual-field rule: server ignores client accountId/broker fields on push (adapter strips them) — local entry still carries externalId read-only", async () => {
    await seedEntry({ id: "cent0000000000000000077", accountId: ACC, externalId: "mt-1", externalSource: "MT5", symbol: "EURUSD", pnl: 15, status: "CLOSED", result: "PROFIT" });
    const row = await tradeDb.trades.get("cent0000000000000000077");
    expect(row).toMatchObject({ externalId: "mt-1", externalSource: "MT5" });
    const { entryToChange } = await import("@m/sync/tradeAdapter");
    const change = entryToChange({ ...row!, dirty: 1 }) as any;
    // فیلدهای بروکری push نمی‌شن (TRADE_ENTRY_BROKER_FIELDS)
    expect(change.data).not.toHaveProperty("symbol");
    expect(change.data).not.toHaveProperty("accountId");
  });

  it("locked TRADE → same 403", async () => {
    await lockTrade(true);
    expect(await body(await local(`/api/trade/entries?accountId=${ACC}`))).toEqual(await body(await webEntries.GET(webReq(`/api/trade/entries?accountId=${ACC}`))));
  });
});

// ─── چک‌لیست‌ها ────────────────────────────────────────────────────────────

describe("trade/checklists parity", () => {
  it("GET empty → default checklist seeded exactly once (same items/order)", async () => {
    const w1 = looseBody(await body(await webChecklists.GET()));
    const l1 = looseBody(await body(await local("/api/trade/checklists")));
    expect(l1).toEqual(w1);
    expect(l1.json.checklists).toHaveLength(1);

    // دومین GET دیگه دوباره سید نمی‌کنه (فرضِ «حذفِ آخرین چک‌لیست»)
    await webChecklists.DELETE(webReq(`/api/trade/checklists?id=${[...fake.state.checklists.keys()][0]}`, { method: "DELETE" }));
    const localFirst = (await tradeDb.checklists.toArray())[0];
    await local(`/api/trade/checklists?id=${localFirst.id}`, { method: "DELETE" });
    expect(looseBody(await body(await local("/api/trade/checklists")))).toEqual(looseBody(await body(await webChecklists.GET())));
    expect((await body(await local("/api/trade/checklists"))).json.checklists).toEqual([]);
  });

  it("two concurrent GETs on an empty list only seed once (no duplicate default checklist)", async () => {
    const [r1, r2] = await Promise.all([local("/api/trade/checklists"), local("/api/trade/checklists")]);
    const [b1, b2] = await Promise.all([body(r1), body(r2)]);
    expect(b1.json.checklists).toHaveLength(1);
    expect(b2.json.checklists).toHaveLength(1);
    expect(await tradeDb.checklists.count()).toBe(1);
  });

  const posts: [string, unknown][] = [
    ["valid", { name: "استراتژیِ روند", items: ["یک", "دو", "سه"] }],
    ["too few items", { name: "x", items: ["فقط یکی"] }],
    ["no name", { items: ["یک", "دو"] }],
  ];
  it.each(posts)("POST %s → same status/body", async (_n, payload) => {
    const w = looseBody(await body(await webChecklists.POST(webReq("/api/trade/checklists", post(payload)))));
    const l = looseBody(await body(await local("/api/trade/checklists", post(payload))));
    expect(l).toEqual(w);
  });

  it("POST duplicateOf → same copy semantics", async () => {
    await seedChecklist({ id: "ccl00000000000000000002", name: "اصلی", color: "#123456" }, [
      { id: "citm000000000000000010", text: "الف", order: 0 },
      { id: "citm000000000000000011", text: "ب", order: 1 },
    ]);
    const payload = { duplicateOf: "ccl00000000000000000002" };
    const w = looseBody(await body(await webChecklists.POST(webReq("/api/trade/checklists", post(payload)))));
    const l = looseBody(await body(await local("/api/trade/checklists", post(payload))));
    expect(l).toEqual(w);
  });

  it("PATCH: rename/color/items replace; unknown id → same 404", async () => {
    await seedChecklist({ id: "ccl00000000000000000003", name: "قدیمی" }, [
      { id: "citm000000000000000020", text: "یک", order: 0, checked: true },
      { id: "citm000000000000000021", text: "دو", order: 1 },
    ]);
    const bad = { id: "cnope", name: "x" };
    expect(await body(await local("/api/trade/checklists", patch(bad)))).toEqual(await body(await webChecklists.PATCH(webReq("/api/trade/checklists", patch(bad)))));

    const payload = { id: "ccl00000000000000000003", name: "جدید", items: ["الف", "ب", "ج"] };
    const w = looseBody(await body(await webChecklists.PATCH(webReq("/api/trade/checklists", patch(payload)))));
    const l = looseBody(await body(await local("/api/trade/checklists", patch(payload))));
    expect(l).toEqual(w);
    // آیتم‌های تیک‌خورده‌ی قبلی با جایگزینیِ کامل پاک می‌شن (مثلِ وب)
    expect(l.json.checklist.items.every((i: any) => !i.checked)).toBe(true);
  });

  it("DELETE: linked entry loses checklistId, snapshot text stays", async () => {
    await seedAccount({ id: ACC, name: "a" });
    await seedChecklist({ id: "ccl00000000000000000004", name: "c" }, [{ id: "citm000000000000000030", text: "x", order: 0 }]);
    await local("/api/trade/entries", post({ accountId: ACC, symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "CLOSED", pnl: 1, volume: 1, openedAt: at(0), checklistId: "ccl00000000000000000004", checklistState: { citm000000000000000030: true } }));
    const row = (await tradeDb.trades.toArray())[0];
    expect(row.checklistId).toBe("ccl00000000000000000004");

    await local("/api/trade/checklists?id=ccl00000000000000000004", { method: "DELETE" });
    const after = await tradeDb.trades.get(row.id);
    expect(after?.checklistId).toBeNull();
    expect(after?.checklistSnapshot).toEqual([{ text: "x", checked: true }]);
  });

  it("checklist items PATCH: single-item toggle + resetAll, same as web", async () => {
    await seedChecklist({ id: "ccl00000000000000000005", name: "c" }, [
      { id: "citm000000000000000040", text: "یک", order: 0, checked: false },
      { id: "citm000000000000000041", text: "دو", order: 1, checked: true },
    ]);
    const toggle = { itemId: "citm000000000000000040", checked: true };
    const w = await body(await webChecklistItems.PATCH(webReq("/api/trade/checklists/ccl00000000000000000005/items", patch(toggle)), { params: { id: "ccl00000000000000000005" } }));
    const l = await body(await local("/api/trade/checklists/ccl00000000000000000005/items", patch(toggle)));
    expect(l).toEqual(w);
    expect((await tradeDb.checklistItems.get("citm000000000000000040"))?.checked).toBe(true);

    const reset = { resetAll: true };
    const w2 = await body(await webChecklistItems.PATCH(webReq("/api/trade/checklists/ccl00000000000000000005/items", patch(reset)), { params: { id: "ccl00000000000000000005" } }));
    const l2 = await body(await local("/api/trade/checklists/ccl00000000000000000005/items", patch(reset)));
    expect(l2).toEqual(w2);
    expect((await tradeDb.checklistItems.get("citm000000000000000041"))?.checked).toBe(false);
  });

  it("checklist items PATCH: unknown checklist/item → same 404", async () => {
    const badChecklist = { itemId: "x", checked: true };
    expect(await body(await local("/api/trade/checklists/cnope/items", patch(badChecklist)))).toEqual(
      await body(await webChecklistItems.PATCH(webReq("/api/trade/checklists/cnope/items", patch(badChecklist)), { params: { id: "cnope" } }))
    );
    await seedChecklist({ id: "ccl00000000000000000006", name: "c" }, [{ id: "citm000000000000000050", text: "x", order: 0 }]);
    const badItem = { itemId: "cnope-item", checked: true };
    expect(await body(await local("/api/trade/checklists/ccl00000000000000000006/items", patch(badItem)))).toEqual(
      await body(await webChecklistItems.PATCH(webReq("/api/trade/checklists/ccl00000000000000000006/items", patch(badItem)), { params: { id: "ccl00000000000000000006" } }))
    );
  });

  it("locked TRADE → same 403", async () => {
    await lockTrade(true);
    expect(await body(await local("/api/trade/checklists"))).toEqual(await body(await webChecklists.GET()));
  });
});

// ─── یادداشت‌ها ────────────────────────────────────────────────────────────

describe("trade/notes parity", () => {
  it("GET filters (q/tags/accountId) identical", async () => {
    await seedAccount({ id: ACC, name: "a" });
    await seedTag({ id: "ctag0000000000000000002", name: "مهم" });
    await seedNote({ id: "cnote000000000000000001", title: "یادداشتِ استراتژی", content: "توضیح", accountId: ACC, _m2m: ["ctag0000000000000000002"] });
    await seedNote({ id: "cnote000000000000000002", title: "دیگری", content: "x", pinned: true });

    for (const q of ["/api/trade/notes", "/api/trade/notes?q=استراتژی", `/api/trade/notes?accountId=${ACC}`, "/api/trade/notes?tags=ctag0000000000000000002"]) {
      expect(await body(await local(q))).toEqual(await body(await webNotes.GET(webReq(q))));
    }
  });

  const posts: [string, unknown][] = [
    ["minimal", { title: "یادداشتِ من" }],
    ["full", { title: "کامل", content: "متن", color: "#334455", pinned: true }],
    ["no title", { content: "بدونِ عنوان" }],
  ];
  it.each(posts)("POST %s → same status/body", async (_n, payload) => {
    const w = looseBody(await body(await webNotes.POST(webReq("/api/trade/notes", post(payload)))));
    const l = looseBody(await body(await local("/api/trade/notes", post(payload))));
    expect(l).toEqual(w);
  });

  it("PATCH unknown id → same 404; owned → same body", async () => {
    await seedNote({ id: "cnote000000000000000003", title: "t", content: "" });
    const bad = { id: "cnope", title: "x" };
    expect(await body(await local("/api/trade/notes", patch(bad)))).toEqual(await body(await webNotes.PATCH(webReq("/api/trade/notes", patch(bad)))));
    const payload = { id: "cnote000000000000000003", title: "ویرایش‌شده" };
    expect(looseBody(await body(await local("/api/trade/notes", patch(payload))))).toEqual(looseBody(await body(await webNotes.PATCH(webReq("/api/trade/notes", patch(payload))))));
  });

  it("DELETE → same 200", async () => {
    await seedNote({ id: "cnote000000000000000004", title: "t", content: "" });
    const q = "/api/trade/notes?id=cnote000000000000000004";
    expect(await body(await local(q, { method: "DELETE" }))).toEqual(await body(await webNotes.DELETE(webReq(q, { method: "DELETE" }))));
  });

  it("locked TRADE → same 403", async () => {
    await lockTrade(true);
    expect(await body(await local("/api/trade/notes"))).toEqual(await body(await webNotes.GET(webReq("/api/trade/notes"))));
  });
});

// ─── برچسب‌ها ──────────────────────────────────────────────────────────────

describe("trade/tags parity", () => {
  it("GET/POST/PATCH/DELETE parity, incl. duplicate-name rejection", async () => {
    expect(await body(await local("/api/trade/tags"))).toEqual(await body(await webTags.GET()));

    const payload = { name: "روند", color: "#00ff00" };
    const w = looseBody(await body(await webTags.POST(webReq("/api/trade/tags", post(payload)))));
    const l = looseBody(await body(await local("/api/trade/tags", post(payload))));
    expect(l).toEqual(w);

    const dup = { name: "روند" };
    expect(await body(await local("/api/trade/tags", post(dup)))).toEqual(await body(await webTags.POST(webReq("/api/trade/tags", post(dup)))));

    const localTag = (await tradeDb.tags.toArray())[0];
    const webTag = [...fake.state.tags.values()][0];
    const renamePayload = { name: "بازگشتی" };
    expect(await body(await local("/api/trade/tags", patch({ id: localTag.id, ...renamePayload })))).toEqual(
      await body(await webTags.PATCH(webReq("/api/trade/tags", patch({ id: webTag.id, ...renamePayload }))))
    );

    expect(await body(await local(`/api/trade/tags?id=${localTag.id}`, { method: "DELETE" }))).toEqual(
      await body(await webTags.DELETE(webReq(`/api/trade/tags?id=${webTag.id}`, { method: "DELETE" })))
    );
  });

  it("POST beyond MAX_TAGS → same 400", async () => {
    for (let i = 0; i < 40; i++) await seedTag({ id: `ctag00000000000000${String(i).padStart(4, "0")}`, name: `t${i}` });
    const payload = { name: "extra" };
    expect(await body(await local("/api/trade/tags", post(payload)))).toEqual(await body(await webTags.POST(webReq("/api/trade/tags", post(payload)))));
  });

  it("locked TRADE → same 403", async () => {
    await lockTrade(true);
    expect(await body(await local("/api/trade/tags"))).toEqual(await body(await webTags.GET()));
  });
});
