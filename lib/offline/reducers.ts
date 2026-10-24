// کاهنده‌های (reducer) خالص نوشتن آفلاین.
//
// وقتی یک نوشتن در صف می‌ره، پاسخ‌های GET کش‌شده باید همون لحظه تغییر رو نشون بدن
// (چون خواندن‌های بعدی از کش میان). هر کاهنده‌ی این‌جا: ورودی = نوشتن + نسخه‌ی
// کش‌شده‌ی GETهای مرتبط، خروجی = کدوم آدرس‌ها باید چه JSON جدیدی بگیرن + پاسخ
// ساختگی هم‌شکل با پاسخ واقعی روت. هیچ I/O‌ای این‌جا نیست.
//
// همین کاهنده‌ها بعد از نوشتن *آنلاین موفق* هم (با پاسخ واقعی سرور در `real`) کش
// آفلاین رو هم‌گام نگه می‌دارن.

import { computeR } from "../tradeSymbols";
import { sessionsAt } from "../forexSessions";

export type Method = "POST" | "PUT" | "PATCH" | "DELETE";

export type Mutation = {
  method: Method;
  path: string;
  query: URLSearchParams;
  body: any;
  requestId: string;
  now?: number;
};

export type CachedJson = { url: string; json: any; storedAt?: number };

export type Reduction = {
  /** آدرس نرمال‌شده → JSON جدید (ساخت یا جایگزینی) */
  updates: CachedJson[];
  /** بدنه‌ی پاسخ ساختگی (هم‌شکل پاسخ واقعی روت) */
  response: Record<string, unknown>;
  /** true = باید توی صف بره؛ false = با حذف/ادغام توی یک ایتم صف‌شده تموم شده */
  queue: boolean;
  /** شناسه‌ی موقتی که ساختش هنوز توی صفه و الان حذف شد → خود ایتم صف حذف شه */
  cancelQueued?: string;
  /** ویرایش یک ساخت صف‌شده: بدنه‌ی ساخت با این ادغام شه */
  mergeQueued?: { tmpId: string; patch: any };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const TMP_PREFIX = "tmp_";

export const tmpIdFor = (requestId: string) => TMP_PREFIX + requestId;
export const isTmpId = (id: unknown): id is string => typeof id === "string" && id.startsWith(TMP_PREFIX);
/** شناسه‌ی ایتم صف (= requestId) از شناسه‌ی موقت */
export const requestIdOfTmp = (tmp: string) => tmp.slice(TMP_PREFIX.length);

// ── آدرس‌ها ──
export function splitUrl(url: string): { path: string; params: URLSearchParams } {
  const i = url.indexOf("?");
  return i < 0 ? { path: url, params: new URLSearchParams() } : { path: url.slice(0, i), params: new URLSearchParams(url.slice(i + 1)) };
}

/** path + query مرتب‌شده — کلید کش */
export function normalizeUrl(path: string, search: string | URLSearchParams = ""): string {
  const p = typeof search === "string" ? new URLSearchParams(search) : new URLSearchParams(search.toString());
  const pairs = Array.from(p.entries()).sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
  if (!pairs.length) return path;
  const q = new URLSearchParams();
  for (const [k, v] of pairs) q.append(k, v);
  return `${path}?${q.toString()}`;
}

function keyUrl(path: string, rec: Record<string, string>): string {
  return normalizeUrl(path, new URLSearchParams(rec));
}

/** کدام پیشوند مسیرهای کش‌شده تحت تاثیر نوشتن روی این path هستن */
export function affectedPrefixes(path: string): string[] {
  if (path.startsWith("/api/tasks/daily")) return ["/api/tasks/daily"];
  if (path.startsWith("/api/settings/")) return [path];
  if (path.startsWith("/api/sleep")) return ["/api/sleep"];
  if (path.startsWith("/api/exercise/log")) return ["/api/exercise/log"];
  if (path.startsWith("/api/calorie/log")) return ["/api/calorie/log"];
  if (path.startsWith("/api/trade/entries")) return ["/api/trade/entries", "/api/trade/tags", "/api/trade/checklists"];
  if (path.startsWith("/api/trade/tags")) return ["/api/trade/tags", "/api/trade/entries", "/api/trade/notes"];
  if (path.startsWith("/api/trade/checklists")) return ["/api/trade/checklists"];
  if (path.startsWith("/api/trade/notes")) return ["/api/trade/notes", "/api/trade/tags"];
  return [];
}

// ── نگاشت شناسه‌ی موقت به واقعی ──
export function remapIds(text: string, map: Record<string, string>): string {
  let out = text;
  for (const [tmp, real] of Object.entries(map)) {
    if (out.includes(tmp)) out = out.split(tmp).join(real);
  }
  return out;
}

// ── ابزار داخلی ──
type Parsed = { url: string; path: string; params: URLSearchParams; json: any; storedAt?: number };

function parseAll(cached: CachedJson[]): Parsed[] {
  return cached.map((c) => ({ ...splitUrl(c.url), url: c.url, json: c.json, storedAt: c.storedAt }));
}

class Out {
  private m = new Map<string, any>();
  set(url: string, json: any) { this.m.set(url, json); }
  get(url: string) { return this.m.get(url); }
  list(): CachedJson[] { return Array.from(this.m, ([url, json]) => ({ url, json })); }
}

function inRange(date: string, from: string | null, to: string | null): boolean {
  return !!from && !!to && from <= date && date <= to;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function isoOf(v: unknown, fallback: number): string {
  const d = typeof v === "string" || typeof v === "number" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date(fallback).toISOString();
}

// ── روزانه ──
function reduceDaily(m: Mutation, parsed: Parsed[], out: Out): Reduction | null {
  if (m.method !== "POST") return null;
  const date = m.body?.date;
  if (typeof date !== "string" || !ISO_DATE.test(date)) return null;
  const rec = { tasks: m.body.tasks && typeof m.body.tasks === "object" ? m.body.tasks : {}, wake: m.body.wake ?? null };
  out.set(keyUrl("/api/tasks/daily", { date }), rec);
  for (const c of parsed) {
    if (c.path === "/api/tasks/daily/range" && inRange(date, c.params.get("from"), c.params.get("to"))) {
      out.set(c.url, { ...c.json, entries: { ...(c.json?.entries ?? {}), [date]: rec } });
    } else if (c.path === "/api/tasks/daily/keys") {
      const keys: string[] = Array.isArray(c.json?.keys) ? c.json.keys : [];
      if (!keys.includes(date)) out.set(c.url, { ...c.json, keys: [...keys, date] });
    }
  }
  return { updates: [], response: { ok: true }, queue: true };
}

// ── تنظیمات ──
function reduceSetting(m: Mutation, out: Out): Reduction | null {
  if (m.method !== "POST") return null;
  const value = m.body && typeof m.body === "object" && "value" in m.body ? m.body.value : null;
  out.set(m.path, { value, updatedAt: new Date(m.now ?? Date.now()).toISOString() });
  return { updates: [], response: { ok: true }, queue: true };
}

// ── خواب ──
function sleepRecord(b: any): any {
  return {
    date: b.date,
    sleptAt: b.sleptAt,
    wokeAt: b.wokeAt,
    quality: b.quality ?? null,
    note: typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 200) : null,
    latencyMin: b.latencyMin ?? null,
    awakenings: b.awakenings ?? null,
    napMin: b.napMin ?? null,
    tags: Array.isArray(b.tags) ? b.tags : [],
  };
}

function reduceSleep(m: Mutation, parsed: Parsed[], out: Out): Reduction | null {
  if (m.method === "POST") {
    const b = m.body;
    if (!b || typeof b.date !== "string" || !ISO_DATE.test(b.date)) return null;
    const rec = sleepRecord(b);
    // یک ورودی «تک‌روز» تا ترکیب بازه‌ها (synthSleep) خواب تازه را هم ببیند
    out.set(keyUrl("/api/sleep", { from: b.date, to: b.date }), { entries: [rec] });
    for (const c of parsed) {
      if (c.path !== "/api/sleep") continue;
      if (inRange(b.date, c.params.get("from"), c.params.get("to"))) {
        const list = (Array.isArray(c.json?.entries) ? c.json.entries : []).filter((e: any) => e?.date !== b.date);
        list.push(rec);
        list.sort((a: any, z: any) => String(a.date).localeCompare(String(z.date)));
        out.set(c.url, { ...c.json, entries: list });
      }
    }
    return { updates: [], response: { entry: rec }, queue: true };
  }
  if (m.method === "DELETE") {
    const date = m.query.get("date");
    if (!date || !ISO_DATE.test(date)) return null;
    for (const c of parsed) {
      if (c.path !== "/api/sleep" || !Array.isArray(c.json?.entries)) continue;
      const next = c.json.entries.filter((e: any) => e?.date !== date);
      if (next.length !== c.json.entries.length) out.set(c.url, { ...c.json, entries: next });
    }
    return { updates: [], response: { ok: true }, queue: true };
  }
  return null;
}

// ── ورزش ──
function reduceExerciseLog(m: Mutation, parsed: Parsed[], out: Out): Reduction | null {
  if (m.method !== "POST") return null;
  const { planId, date } = m.body ?? {};
  if (typeof planId !== "string" || !planId || typeof date !== "string" || !ISO_DATE.test(date)) return null;
  const single = keyUrl("/api/exercise/log", { date, planId });
  const prev = parsed.find((c) => c.url === single)?.json ?? { completed: false, completedItems: [], started: false };
  let next;
  if (m.body.started === true && m.body.completed === undefined) {
    next = { ...prev, started: true };
  } else {
    next = {
      ...prev,
      completed: !!m.body.completed,
      completedItems: Array.isArray(m.body.completedItems)
        ? m.body.completedItems.filter((x: unknown) => typeof x === "string")
        : (prev.completedItems ?? []),
    };
  }
  out.set(single, next);
  for (const c of parsed) {
    if (c.path === "/api/exercise/log/range" && c.params.get("planId") === planId && inRange(date, c.params.get("start"), c.params.get("end"))) {
      out.set(c.url, { ...c.json, logs: { ...(c.json?.logs ?? {}), [date]: next } });
    }
  }
  return { updates: [], response: { ok: true }, queue: true };
}

// ── کالری ──
function dayOf(v: unknown): string {
  return typeof v === "string" ? v.slice(0, 10) : "";
}

function reduceCalorie(m: Mutation, parsed: Parsed[], out: Out, real: any): Reduction | null {
  if (m.method === "POST") {
    const b = m.body ?? {};
    if (typeof b.date !== "string" || !ISO_DATE.test(b.date)) return null;
    const tmp = tmpIdFor(m.requestId);
    const entry = real?.entry?.id
      ? real.entry
      : {
          id: tmp, userId: "", foodItemId: null,
          customName: typeof b.customName === "string" ? b.customName.slice(0, 80) : "",
          customCalories: num(b.customCalories),
          date: `${b.date}T00:00:00.000Z`,
          grams: num(b.grams) ?? 0,
          mealType: b.mealType || null,
          proteinG: num(b.proteinG), carbsG: num(b.carbsG), fatG: num(b.fatG),
          aiScanned: false,
          createdAt: new Date(m.now ?? Date.now()).toISOString(),
        };
    const single = keyUrl("/api/calorie/log", { date: b.date });
    const cur = parsed.find((c) => c.url === single)?.json;
    out.set(single, { ...(cur ?? {}), entries: [...(Array.isArray(cur?.entries) ? cur.entries.filter((e: any) => e?.id !== entry.id) : []), entry] });
    for (const c of parsed) {
      if (c.path === "/api/calorie/log/range" && inRange(b.date, c.params.get("from"), c.params.get("to"))) {
        const list: any[] = (Array.isArray(c.json?.entries) ? c.json.entries : []).filter((e: any) => e?.id !== entry.id);
        const at = list.findIndex((e) => dayOf(e?.date) <= b.date);
        list.splice(at < 0 ? list.length : at, 0, entry);
        out.set(c.url, { ...c.json, entries: list });
      }
    }
    return { updates: [], response: { ok: true, entry }, queue: true };
  }
  if (m.method === "DELETE") {
    const id = m.query.get("id");
    if (!id) return null;
    for (const c of parsed) {
      if (!Array.isArray(c.json?.entries)) continue;
      const next = c.json.entries.filter((e: any) => e?.id !== id);
      if (next.length !== c.json.entries.length) out.set(c.url, { ...c.json, entries: next });
    }
    if (isTmpId(id)) return { updates: [], response: { ok: true }, queue: false, cancelQueued: id };
    return { updates: [], response: { ok: true }, queue: true };
  }
  return null;
}

// ── ترید ──
type Tag = { id: string; name: string; color: string };

function tagsFor(ids: unknown, parsed: Parsed[]): Tag[] {
  const list = Array.isArray(ids) ? ids.filter((t) => typeof t === "string") : [];
  if (!list.length) return [];
  const known = new Map<string, Tag>();
  for (const c of parsed) {
    if (c.path === "/api/trade/tags" && Array.isArray(c.json?.tags)) for (const t of c.json.tags) known.set(t.id, t);
  }
  return list.map((id) => known.get(id)).filter((t): t is Tag => !!t);
}

function buildTradeEntry(body: any, id: string, parsed: Parsed[], now: number): any {
  const opened = new Date(body.openedAt);
  const openedAt = Number.isNaN(opened.getTime()) ? new Date(now) : opened;
  const pnl = num(body.pnl) ?? 0;
  const riskAmount = num(body.riskAmount);
  const unit = body.volumeUnit === "USD" ? "USD" : "LOT";
  const images = Array.isArray(body.images) ? body.images.length : 0;
  let checklistName: string | null = null, checklistDone: number | null = null, checklistTotal: number | null = null;
  const checklistId = typeof body.checklistId === "string" && body.checklistId ? body.checklistId : null;
  if (checklistId) {
    for (const c of parsed) {
      if (c.path !== "/api/trade/checklists" || !Array.isArray(c.json?.checklists)) continue;
      const cl = c.json.checklists.find((x: any) => x?.id === checklistId);
      if (!cl) continue;
      const state = body.checklistState && typeof body.checklistState === "object" ? body.checklistState : {};
      checklistName = cl.name ?? null;
      checklistTotal = Array.isArray(cl.items) ? cl.items.length : 0;
      checklistDone = Array.isArray(cl.items) ? cl.items.filter((i: any) => !!state[i.id]).length : 0;
      break;
    }
  }
  return {
    id,
    accountId: String(body.accountId || ""),
    symbol: String(body.symbol || "").trim().toUpperCase(),
    direction: body.direction,
    timeframe: body.timeframe ? String(body.timeframe).slice(0, 8) : null,
    openedAt: openedAt.toISOString(),
    closedAt: body.closedAt ? isoOf(body.closedAt, now) : null,
    volume: num(body.volume),
    volumeUnit: unit,
    result: body.result,
    pnl,
    riskFree: !!body.riskFree,
    status: body.status,
    entryPrice: num(body.entryPrice), exitPrice: num(body.exitPrice),
    stopLoss: num(body.stopLoss), takeProfit: num(body.takeProfit),
    commission: num(body.commission), swap: num(body.swap),
    riskAmount,
    rMultiple: computeR(pnl, riskAmount),
    sessions: sessionsAt(openedAt),
    setup: body.setup ? String(body.setup).trim().slice(0, 60) : null,
    entryReasons: Array.isArray(body.entryReasons) ? body.entryReasons : [],
    exitReasons: Array.isArray(body.exitReasons) ? body.exitReasons : [],
    entryReasonNote: body.entryReasonNote || null,
    exitReasonNote: body.exitReasonNote || null,
    note: body.note || null,
    emotionBefore: body.emotionBefore ?? null,
    emotionAfter: body.emotionAfter ?? null,
    confidence: num(body.confidence),
    followedPlan: typeof body.followedPlan === "boolean" ? body.followedPlan : null,
    checklistId: checklistName ? checklistId : null,
    checklistName, checklistDone, checklistTotal,
    tags: tagsFor(body.tagIds, parsed),
    imageCount: images,
  };
}

function entryFitsList(entry: any, params: URLSearchParams): boolean {
  if ((params.get("accountId") || "") !== entry.accountId) return false;
  const from = params.get("from"), to = params.get("to");
  if (from || to) {
    const d = String(entry.openedAt).slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
  }
  return true;
}

function reduceTradeEntry(m: Mutation, parsed: Parsed[], out: Out, real: any): Reduction | null {
  const now = m.now ?? Date.now();
  const lists = parsed.filter((c) => c.path === "/api/trade/entries");
  const removeFrom = (id: string) => {
    for (const c of lists) {
      if (!Array.isArray(c.json?.entries)) continue;
      const next = (out.get(c.url) ?? c.json).entries.filter((e: any) => e?.id !== id);
      out.set(c.url, { ...c.json, entries: next });
    }
  };
  const insert = (entry: any) => {
    for (const c of lists) {
      if (!entryFitsList(entry, c.params)) continue;
      const base = out.get(c.url) ?? c.json;
      const list: any[] = (Array.isArray(base?.entries) ? base.entries : []).filter((e: any) => e?.id !== entry.id);
      const at = list.findIndex((e) => String(e?.openedAt) <= entry.openedAt);
      list.splice(at < 0 ? list.length : at, 0, entry);
      out.set(c.url, { ...c.json, entries: list });
    }
  };
  if (m.method === "POST") {
    const b = m.body;
    if (!b || typeof b !== "object") return null;
    const entry = real?.entry?.id ? real.entry : buildTradeEntry(b, tmpIdFor(m.requestId), parsed, now);
    insert(entry);
    return { updates: [], response: { ok: true, entry }, queue: true };
  }
  if (m.method === "PATCH") {
    const b = m.body;
    const id = String(b?.id || "");
    if (!id) return null;
    const old = lists.flatMap((c) => (Array.isArray(c.json?.entries) ? c.json.entries : [])).find((e: any) => e?.id === id);
    const entry = real?.entry?.id ? real.entry : { ...buildTradeEntry(b, id, parsed, now) };
    if (old && !real?.entry) {
      // فیلدهایی که سرور تعیین می‌کنه (مثل قفل همگام‌سازی) از نسخه‌ی قبلی می‌مونن
      for (const k of Object.keys(old)) if (!(k in entry)) entry[k] = old[k];
    }
    removeFrom(id);
    insert(entry);
    for (const c of parsed) {
      if (c.path === `/api/trade/entries/${id}` && c.json?.entry) out.set(c.url, { ...c.json, entry: { ...c.json.entry, ...entry } });
    }
    if (isTmpId(id)) {
      const { id: _drop, ...patch } = b;
      return { updates: [], response: { ok: true, entry }, queue: false, mergeQueued: { tmpId: id, patch } };
    }
    return { updates: [], response: { ok: true, entry }, queue: true };
  }
  if (m.method === "DELETE") {
    const id = m.query.get("id");
    if (!id) return null;
    removeFrom(id);
    if (isTmpId(id)) return { updates: [], response: { ok: true }, queue: false, cancelQueued: id };
    return { updates: [], response: { ok: true }, queue: true };
  }
  return null;
}

function reduceTags(m: Mutation, parsed: Parsed[], out: Out, real: any): Reduction | null {
  const lists = parsed.filter((c) => c.path === "/api/trade/tags");
  if (m.method === "POST") {
    const name = String(m.body?.name || "").trim().slice(0, 30);
    if (!name) return null;
    const color = typeof m.body?.color === "string" && /^#[0-9a-fA-F]{6}$/.test(m.body.color) ? m.body.color : "#3E7BFA";
    const tag: Tag = real?.tag?.id ? real.tag : { id: tmpIdFor(m.requestId), name, color };
    for (const c of lists) {
      const arr: Tag[] = (Array.isArray(c.json?.tags) ? c.json.tags : []).filter((t: Tag) => t.id !== tag.id);
      out.set(c.url, { ...c.json, tags: [...arr, tag] });
    }
    if (!lists.length) out.set("/api/trade/tags", { tags: [tag] });
    return { updates: [], response: { ok: true, tag }, queue: true };
  }
  const rewriteTag = (id: string, fn: (t: Tag) => Tag | null) => {
    for (const c of parsed) {
      if (c.path === "/api/trade/tags" && Array.isArray(c.json?.tags)) {
        out.set(c.url, { ...c.json, tags: c.json.tags.map((t: Tag) => (t.id === id ? fn(t) : t)).filter(Boolean) });
      } else if (c.path === "/api/trade/entries" && Array.isArray(c.json?.entries)) {
        out.set(c.url, { ...c.json, entries: c.json.entries.map((e: any) => (Array.isArray(e?.tags) && e.tags.some((t: Tag) => t.id === id) ? { ...e, tags: e.tags.map((t: Tag) => (t.id === id ? fn(t) : t)).filter(Boolean) } : e)) });
      } else if (c.path === "/api/trade/notes" && Array.isArray(c.json?.notes)) {
        out.set(c.url, { ...c.json, notes: c.json.notes.map((n: any) => (Array.isArray(n?.tags) && n.tags.some((t: Tag) => t.id === id) ? { ...n, tags: n.tags.map((t: Tag) => (t.id === id ? fn(t) : t)).filter(Boolean) } : n)) });
      }
    }
  };
  if (m.method === "PATCH") {
    const id = String(m.body?.id || "");
    const name = String(m.body?.name || "").trim().slice(0, 30);
    if (!id || !name) return null;
    const color = typeof m.body?.color === "string" && /^#[0-9a-fA-F]{6}$/.test(m.body.color) ? m.body.color : null;
    rewriteTag(id, (t) => ({ ...t, name, ...(color ? { color } : {}) }));
    if (isTmpId(id)) {
      const { id: _d, ...patch } = m.body;
      return { updates: [], response: { ok: true }, queue: false, mergeQueued: { tmpId: id, patch } };
    }
    return { updates: [], response: { ok: true }, queue: true };
  }
  if (m.method === "DELETE") {
    const id = m.query.get("id");
    if (!id) return null;
    rewriteTag(id, () => null);
    if (isTmpId(id)) return { updates: [], response: { ok: true }, queue: false, cancelQueued: id };
    return { updates: [], response: { ok: true }, queue: true };
  }
  return null;
}

function checklistItemsFrom(raw: unknown, existing: any[], requestId: string): any[] {
  const texts = (Array.isArray(raw) ? raw : [])
    .map((t: any) => (typeof t === "string" ? t : t?.text))
    .filter((t: unknown): t is string => typeof t === "string" && !!t.trim())
    .map((t) => t.trim().slice(0, 200));
  return texts.map((text, i) => {
    const same = existing.find((x) => x?.text === text);
    return { id: same?.id ?? `${tmpIdFor(requestId)}_${i}`, text, order: i, checked: same?.checked ?? false };
  });
}

function reduceChecklists(m: Mutation, parsed: Parsed[], out: Out, real: any): Reduction | null {
  const lists = parsed.filter((c) => c.path === "/api/trade/checklists");
  const mapLists = (fn: (arr: any[]) => any[]) => {
    for (const c of lists) if (Array.isArray(c.json?.checklists)) out.set(c.url, { ...c.json, checklists: fn(c.json.checklists) });
  };
  // آیتم‌ها: /api/trade/checklists/<id>/items
  const itemsMatch = /^\/api\/trade\/checklists\/([^/]+)\/items$/.exec(m.path);
  if (itemsMatch) {
    if (m.method !== "PATCH") return null;
    const id = decodeURIComponent(itemsMatch[1]);
    const b = m.body ?? {};
    if (b.resetAll === true) mapLists((arr) => arr.map((cl) => (cl.id === id ? { ...cl, items: (cl.items ?? []).map((i: any) => ({ ...i, checked: false })) } : cl)));
    else if (typeof b.itemId === "string" && typeof b.checked === "boolean") {
      mapLists((arr) => arr.map((cl) => (cl.id === id ? { ...cl, items: (cl.items ?? []).map((i: any) => (i.id === b.itemId ? { ...i, checked: b.checked } : i)) } : cl)));
    } else return null;
    // روی چک‌لیست ساخته‌شده‌ی آفلاین، شناسه‌ی آیتم‌ها هم موقتیه: فقط کش، بدون صف
    return { updates: [], response: { ok: true }, queue: !isTmpId(id) };
  }
  if (m.path !== "/api/trade/checklists") return null;
  if (m.method === "POST") {
    const b = m.body ?? {};
    let items = checklistItemsFrom(b.items, [], m.requestId);
    let name = String(b.name || "").trim().slice(0, 60);
    let color = typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#3E7BFA";
    let note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 2000) : null;
    if (b.duplicateOf) {
      const src = lists.flatMap((c) => c.json?.checklists ?? []).find((x: any) => x?.id === b.duplicateOf);
      if (src) {
        items = checklistItemsFrom((src.items ?? []).map((i: any) => i.text), [], m.requestId);
        name = name || `${src.name} (copy)`.slice(0, 60);
        color = src.color; note = src.note ?? null;
      }
    }
    const order = lists.length ? (lists[0].json?.checklists ?? []).length : 0;
    const checklist = real?.checklist?.id
      ? real.checklist
      : { id: tmpIdFor(m.requestId), name, color, required: !!b.required, archived: false, order, note, items };
    mapLists((arr) => [...arr.filter((x) => x.id !== checklist.id), checklist]);
    if (!lists.length) out.set("/api/trade/checklists", { checklists: [checklist] });
    return { updates: [], response: { ok: true, checklist }, queue: true };
  }
  if (m.method === "PATCH") {
    const b = m.body ?? {};
    const id = String(b.id || "");
    if (!id) return null;
    mapLists((arr) => arr.map((cl) => {
      if (cl.id !== id) return cl;
      const next = { ...cl };
      if (typeof b.name === "string" && b.name.trim()) next.name = b.name.trim().slice(0, 60);
      if (typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color)) next.color = b.color;
      if (typeof b.required === "boolean") next.required = b.required;
      if (typeof b.archived === "boolean") next.archived = b.archived;
      if (typeof b.note === "string") next.note = b.note.trim() ? b.note.trim().slice(0, 2000) : null;
      if (Array.isArray(b.items)) next.items = checklistItemsFrom(b.items, cl.items ?? [], m.requestId);
      return next;
    }));
    if (isTmpId(id)) {
      const { id: _d, ...patch } = b;
      return { updates: [], response: { ok: true }, queue: false, mergeQueued: { tmpId: id, patch } };
    }
    return { updates: [], response: { ok: true }, queue: true };
  }
  if (m.method === "DELETE") {
    const id = m.query.get("id");
    if (!id) return null;
    mapLists((arr) => arr.filter((cl) => cl.id !== id));
    if (isTmpId(id)) return { updates: [], response: { ok: true }, queue: false, cancelQueued: id };
    return { updates: [], response: { ok: true }, queue: true };
  }
  return null;
}

function noteFitsList(note: any, params: URLSearchParams): boolean {
  const q = (params.get("q") || "").trim().toLowerCase();
  if (q && !(String(note.title).toLowerCase().includes(q) || String(note.content).toLowerCase().includes(q))) return false;
  const tags = (params.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length && !(note.tags ?? []).some((t: Tag) => tags.includes(t.id))) return false;
  const accountId = params.get("accountId");
  if (accountId && note.accountId !== accountId) return false;
  return true;
}

function sortNotes(list: any[]): any[] {
  return list.sort((a, b) => (a.pinned === b.pinned ? String(b.updatedAt).localeCompare(String(a.updatedAt)) : a.pinned ? -1 : 1));
}

function reduceNotes(m: Mutation, parsed: Parsed[], out: Out, real: any): Reduction | null {
  const lists = parsed.filter((c) => c.path === "/api/trade/notes");
  const now = new Date(m.now ?? Date.now()).toISOString();
  const place = (note: any) => {
    for (const c of lists) {
      const base = out.get(c.url) ?? c.json;
      const arr: any[] = (Array.isArray(base?.notes) ? base.notes : []).filter((n: any) => n?.id !== note.id);
      if (noteFitsList(note, c.params)) arr.push(note);
      out.set(c.url, { ...c.json, notes: sortNotes(arr) });
    }
  };
  if (m.method === "POST") {
    const b = m.body ?? {};
    const title = String(b.title || "").trim();
    if (!title) return null;
    const note = real?.note?.id
      ? real.note
      : {
          id: tmpIdFor(m.requestId), title: title.slice(0, 120), content: String(b.content || "").slice(0, 20000),
          color: typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#3E7BFA",
          pinned: !!b.pinned, accountId: b.accountId ? String(b.accountId) : null, entryId: b.entryId ? String(b.entryId) : null,
          createdAt: now, updatedAt: now, tags: tagsFor(b.tagIds, parsed),
        };
    place(note);
    return { updates: [], response: { ok: true, note }, queue: true };
  }
  if (m.method === "PATCH") {
    const b = m.body ?? {};
    const id = String(b.id || "");
    const title = String(b.title || "").trim();
    if (!id || !title) return null;
    const old = lists.flatMap((c) => c.json?.notes ?? []).find((n: any) => n?.id === id);
    const note = real?.note?.id
      ? real.note
      : {
          ...(old ?? { id, createdAt: now, accountId: null, entryId: null }),
          title: title.slice(0, 120), content: String(b.content || "").slice(0, 20000),
          color: typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#3E7BFA",
          pinned: !!b.pinned, updatedAt: now, tags: tagsFor(b.tagIds, parsed),
        };
    place(note);
    if (isTmpId(id)) {
      const { id: _d, ...patch } = b;
      return { updates: [], response: { ok: true, note }, queue: false, mergeQueued: { tmpId: id, patch } };
    }
    return { updates: [], response: { ok: true, note }, queue: true };
  }
  if (m.method === "DELETE") {
    const id = m.query.get("id");
    if (!id) return null;
    for (const c of lists) {
      if (Array.isArray(c.json?.notes)) out.set(c.url, { ...c.json, notes: c.json.notes.filter((n: any) => n?.id !== id) });
    }
    if (isTmpId(id)) return { updates: [], response: { ok: true }, queue: false, cancelQueued: id };
    return { updates: [], response: { ok: true }, queue: true };
  }
  return null;
}

/**
 * نوشتن رو روی کش اعمال می‌کنه. null = این نوشتن کاهنده نداره (فقط صف می‌شه، بدون تغییر کش).
 * `real` = پاسخ واقعی سرور (وقتی نوشتن آنلاین موفق بوده و فقط کش رو هم‌گام می‌کنیم).
 */
export function reduceMutation(m: Mutation, cached: CachedJson[], real?: any): Reduction | null {
  const parsed = parseAll(cached);
  const out = new Out();
  let r: Reduction | null = null;
  const p = m.path;
  if (p === "/api/tasks/daily") r = reduceDaily(m, parsed, out);
  else if (/^\/api\/settings\/[^/]+$/.test(p)) r = reduceSetting(m, out);
  else if (p === "/api/sleep") r = reduceSleep(m, parsed, out);
  else if (p === "/api/exercise/log") r = reduceExerciseLog(m, parsed, out);
  else if (p === "/api/calorie/log") r = reduceCalorie(m, parsed, out, real);
  else if (p === "/api/trade/entries") r = reduceTradeEntry(m, parsed, out, real);
  else if (p === "/api/trade/tags") r = reduceTags(m, parsed, out, real);
  else if (p === "/api/trade/checklists" || /^\/api\/trade\/checklists\/[^/]+\/items$/.test(p)) r = reduceChecklists(m, parsed, out, real);
  else if (p === "/api/trade/notes") r = reduceNotes(m, parsed, out, real);
  if (!r) return null;
  return { ...r, updates: out.list() };
}

// ── ترکیب پاسخ برای خواندن آفلاین وقتی آدرس دقیق کش نشده ──

/** کش‌های مرتبط با تاریخ‌های روتین: بازه‌ها و روزهای تکی */
export function synthDaily(date: string, cached: CachedJson[]): { tasks: any; wake: string | null } | null {
  const parsed = parseAll(cached).sort((a, b) => (a.storedAt ?? 0) - (b.storedAt ?? 0));
  let found: any = null;
  let covered = false;
  for (const c of parsed) {
    if (c.path === "/api/tasks/daily/range" && inRange(date, c.params.get("from"), c.params.get("to"))) {
      covered = true;
      found = c.json?.entries?.[date] ?? null;
    } else if (c.path === "/api/tasks/daily" && c.params.get("date") === date) {
      covered = true;
      found = { tasks: c.json?.tasks ?? {}, wake: c.json?.wake ?? null };
    }
  }
  if (!covered) return null;
  return found ? { tasks: found.tasks ?? {}, wake: found.wake ?? null } : { tasks: {}, wake: null };
}

export function synthDailyRange(from: string, to: string, cached: CachedJson[]): { entries: Record<string, any> } | null {
  const parsed = parseAll(cached).sort((a, b) => (a.storedAt ?? 0) - (b.storedAt ?? 0));
  const entries: Record<string, any> = {};
  let any = false;
  for (const c of parsed) {
    if (c.path === "/api/tasks/daily/range") {
      any = true;
      for (const [d, rec] of Object.entries<any>(c.json?.entries ?? {})) if (d >= from && d <= to) entries[d] = rec;
    } else if (c.path === "/api/tasks/daily") {
      const d = c.params.get("date");
      any = true;
      if (d && d >= from && d <= to) entries[d] = { tasks: c.json?.tasks ?? {}, wake: c.json?.wake ?? null };
    }
  }
  return any ? { entries } : null;
}

export function synthSleep(from: string, to: string, cached: CachedJson[]): { entries: any[] } | null {
  const parsed = parseAll(cached).filter((c) => c.path === "/api/sleep").sort((a, b) => (a.storedAt ?? 0) - (b.storedAt ?? 0));
  if (!parsed.length) return null;
  const byDate = new Map<string, any>();
  for (const c of parsed) {
    const cf = c.params.get("from"), ct = c.params.get("to");
    // پوشش این بازه از این پاسخ: روزهای خارج از بازه‌ی خودش «نامعلوم»ن، نه خالی
    for (const e of Array.isArray(c.json?.entries) ? c.json.entries : []) {
      if (e?.date >= from && e.date <= to) byDate.set(e.date, e);
    }
    if (cf && ct) {
      // روزی که توی بازه‌ی این پاسخ هست و رکورد نداره = حذف‌شده یا خالی
      byDate.forEach((_v, d) => {
        if (d >= cf && d <= ct && !(c.json?.entries ?? []).some((e: any) => e?.date === d)) byDate.delete(d);
      });
    }
  }
  return { entries: Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date))) };
}

export function synthExerciseLog(planId: string, date: string, cached: CachedJson[]): any | null {
  const parsed = parseAll(cached).sort((a, b) => (a.storedAt ?? 0) - (b.storedAt ?? 0));
  let found: any = null;
  let covered = false;
  for (const c of parsed) {
    if (c.path === "/api/exercise/log/range" && c.params.get("planId") === planId && inRange(date, c.params.get("start"), c.params.get("end"))) {
      covered = true;
      found = c.json?.logs?.[date] ?? null;
    }
  }
  if (!covered) return null;
  return found ?? { completed: false, completedItems: [], started: false };
}

export function synthCalorieLog(date: string, cached: CachedJson[]): { entries: any[] } | null {
  const parsed = parseAll(cached).sort((a, b) => (a.storedAt ?? 0) - (b.storedAt ?? 0));
  let found: any[] | null = null;
  for (const c of parsed) {
    if (c.path === "/api/calorie/log/range" && inRange(date, c.params.get("from"), c.params.get("to"))) {
      found = (Array.isArray(c.json?.entries) ? c.json.entries : []).filter((e: any) => dayOf(e?.date) === date);
    }
  }
  return found ? { entries: found } : null;
}
