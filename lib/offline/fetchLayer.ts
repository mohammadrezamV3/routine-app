// لایه‌ی fetch آفلاین — از hook موجود lib/liveSync.ts صدا زده می‌شه (offlineFetch).
//
// فقط برای درخواست‌های هم‌مبدا `/api/*` و فقط وقتی کاربر شناخته‌ست فعاله:
//   GET (فهرست مجاز): اول شبکه، با تایم‌اوت کوتاه؛ اگه شبکه شکست خورد (نه خطای HTTP)
//     یا navigator.onLine=false بود، آخرین نسخه‌ی ذخیره‌شده با هدر x-arion-offline: cache.
//   نوشتن (فهرست مجاز): همیشه با x-arion-request-id؛ اگه آفلاین یا شبکه شکست خورد (یا
//     صف قبلی هنوز خالی نشده، برای حفظ ترتیب) در صف IndexedDB می‌ره، کش GETها همون لحظه
//     با کاهنده‌ها (reducers.ts) تغییر می‌کنه و پاسخ ساختگی 202 برمی‌گرده.
//   بقیه‌ی نوشتن‌ها وقتی مرورگر آفلاینه سریع با خطای شبکه شکست می‌خورن.

import { OFFLINE_HEADER, REQUEST_ID_HEADER, type OfflineSource, type OutboxItem } from "./types";
import * as db from "./db";
import { getKnownUserId } from "./identity";
import { isNavigatorOffline, isOffline, reportNetwork, setPending } from "./status";
import {
  affectedPrefixes, normalizeUrl, reduceMutation, remapIds, requestIdOfTmp, splitUrl,
  synthCalorieLog, synthDaily, synthDailyRange, synthExerciseLog, synthSleep,
  type CachedJson, type Method, type Mutation,
} from "./reducers";
import { tr } from "../i18n";

// ── پل به liveSync (وابستگی حلقوی رو با ثبت زمان اجرا می‌شکنیم) ──
export type OfflineBridge = {
  publishChange(keys: string | string[]): void;
  invalidate(keys: string | string[]): void;
  domainsForMutation(path: string): string[];
};
let bridge: OfflineBridge | null = null;
export function setOfflineBridge(b: OfflineBridge) { bridge = b; }
export function getOfflineBridge(): OfflineBridge | null { return bridge; }

let rawFetch: typeof fetch | null = null;
/** fetch اصلی مرورگر (بدون hook) — برای پخش صف و رفرش کش */
export function getRawFetch(): typeof fetch {
  return rawFetch ?? ((...a: Parameters<typeof fetch>) => window.fetch(...a));
}

/** فقط تست */
export function __setRawFetchForTests(f: typeof fetch | null) { rawFetch = f; }

// ── فهرست‌های مجاز ──
const GET_ALLOW: RegExp[] = [
  /^\/api\/tasks\/daily(\/range|\/keys)?$/,
  /^\/api\/settings\/[^/]+$/,
  /^\/api\/sleep$/,
  /^\/api\/bootstrap$/,
  /^\/api\/account(\/avatar)?$/,
  /^\/api\/features$/,
  /^\/api\/dashboard$/,
  /^\/api\/exercise\/(plan|schedule|log|log\/range)$/,
  /^\/api\/calorie\/(target|log|log\/range|foods)$/,
  /^\/api\/trade\/(accounts|entries|tags|checklists|notes|hub)$/,
  /^\/api\/trade\/entries\/[^/]+$/,
  /^\/api\/achievements$/,
  /^\/api\/friends$/,
  /^\/api\/notifications$/,
  /^\/api\/analysis\/letters\/live$/,
  /^\/api\/pricing$/,
  /^\/api\/maintenance$/,
  /^\/api\/auth\/session$/,
];

/** وقتی آدرس دقیق (با query) کش نشده، آخرین نسخه‌ی همین مسیر جواب می‌ده */
const LATEST_FALLBACK = new Set([
  "/api/bootstrap", "/api/dashboard", "/api/analysis/letters/live", "/api/trade/hub", "/api/achievements",
  "/api/friends", "/api/notifications", "/api/features", "/api/pricing", "/api/maintenance", "/api/account",
  "/api/account/avatar", "/api/auth/session", "/api/calorie/target", "/api/exercise/plan", "/api/exercise/schedule",
]);

/**
 * پاسخ /api/dashboard مال بخش فعلیه (بلوک بخش‌های دیگه null ساخته می‌شه) ولی آدرسش بین بخش‌ها یکیه؛
 * پس کلید کش بخش رو هم داره تا دیدن داشبورد یک بخش، کش بخش دیگه رو خراب نکنه.
 */
export function cacheKeyFor(path: string, params: URLSearchParams | string): string {
  const p = new URLSearchParams(typeof params === "string" ? params : params.toString());
  if (path === "/api/dashboard" && typeof document !== "undefined" && !p.has("_sec")) {
    const sec = document.documentElement.getAttribute("data-section");
    if (sec) p.set("_sec", sec);
  }
  return normalizeUrl(path, p);
}

export function isCacheableGet(path: string): boolean {
  return GET_ALLOW.some((re) => re.test(path));
}

/** کلیدهای تنظیماتی که سرور مدیریتشون می‌کنه یا آنلاین بودن لازم دارن */
const NO_QUEUE_SETTINGS = new Set(["lang", "tradeChatRulesAccepted"]);

const MUTATION_ALLOW: { re: RegExp; methods: Method[] }[] = [
  { re: /^\/api\/tasks\/daily$/, methods: ["POST"] },
  { re: /^\/api\/settings\/[^/]+$/, methods: ["POST"] },
  { re: /^\/api\/sleep$/, methods: ["POST", "DELETE"] },
  { re: /^\/api\/exercise\/log$/, methods: ["POST"] },
  { re: /^\/api\/calorie\/log$/, methods: ["POST", "DELETE"] },
  { re: /^\/api\/trade\/(entries|tags|checklists|notes)$/, methods: ["POST", "PATCH", "DELETE"] },
  { re: /^\/api\/trade\/checklists\/[^/]+\/items$/, methods: ["PATCH"] },
];

export function isOfflineMutation(method: string, path: string): boolean {
  const m = path.match(/^\/api\/settings\/([^/]+)$/);
  if (m && NO_QUEUE_SETTINGS.has(decodeURIComponent(m[1]))) return false;
  return MUTATION_ALLOW.some((x) => x.re.test(path) && (x.methods as string[]).includes(method));
}

// ── وضعیت صف (هم‌گام برای تصمیم‌های فوری) ──
let pendingCount = 0;
let pendingPrefixes: string[] = [];
let channel: BroadcastChannel | null = null;

function ensureChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return;
  try {
    channel = new BroadcastChannel("arion-offline");
    channel.onmessage = (ev) => {
      if (ev.data === "pending") void refreshPending(false);
    };
  } catch { channel = null; }
}

export function getPendingCount() { return pendingCount; }

export function hasPendingFor(path: string): boolean {
  return pendingPrefixes.some((p) => path === p || path.startsWith(p + "/"));
}

export async function refreshPending(broadcast = true): Promise<number> {
  ensureChannel();
  const userId = getKnownUserId();
  if (!userId) {
    pendingCount = 0; pendingPrefixes = [];
    setPending(0);
    return 0;
  }
  const items = await db.outboxAll(userId);
  pendingCount = items.length;
  pendingPrefixes = Array.from(new Set(items.flatMap((i) => affectedPrefixes(splitUrl(i.url).path))));
  setPending(pendingCount);
  if (broadcast) { try { channel?.postMessage("pending"); } catch {} }
  return pendingCount;
}

// ── نگاشت شناسه‌ی موقت به واقعی ──
const IDMAP_KEY = "idmap";
const IDMAP_MAX = 500;

export async function getIdMap(): Promise<Record<string, string>> {
  return (await db.metaGet<Record<string, string>>(IDMAP_KEY)) ?? {};
}
export async function addIdMap(tmp: string, real: string): Promise<void> {
  const map = await getIdMap();
  map[tmp] = real;
  const keys = Object.keys(map);
  if (keys.length > IDMAP_MAX) for (const k of keys.slice(0, keys.length - IDMAP_MAX)) delete map[k];
  await db.metaSet(IDMAP_KEY, map);
}

/** در همه‌ی ورودی‌های کش مرتبط، شناسه‌ی موقت رو با واقعی جایگزین می‌کنه */
export async function remapCacheIds(userId: string, path: string, tmp: string, real: string): Promise<void> {
  for (const prefix of affectedPrefixes(path)) {
    const recs = await db.cacheByPathPrefix(userId, prefix);
    for (const r of recs) {
      if (!r.body.includes(tmp) && !r.url.includes(tmp)) continue;
      const url = r.url.split(tmp).join(real);
      if (url !== r.url) await db.cacheDelete(userId, r.url);
      await db.cachePut(userId, url, { status: r.status, body: r.body.split(tmp).join(real), headers: r.headers, storedAt: r.storedAt });
    }
  }
}

// ── ابزار ──
const JSON_HEADERS = { "content-type": "application/json" };

function mkResponse(body: string, source: OfflineSource, status = 200): Response {
  return new Response(body, { status, headers: { ...JSON_HEADERS, [OFFLINE_HEADER]: source } });
}

function networkError(): TypeError {
  return new TypeError("Failed to fetch");
}

function uuid(): string {
  try {
    const c: any = typeof crypto !== "undefined" ? crypto : null;
    if (c?.randomUUID) return c.randomUUID();
  } catch {}
  return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function parseApiUrl(input: RequestInfo | URL): URL | null {
  if (typeof input !== "string" && !(input instanceof URL)) return null;
  try {
    const u = new URL(typeof input === "string" ? input : input.href, location.href);
    if (u.origin !== location.origin || !u.pathname.startsWith("/api/")) return null;
    return u;
  } catch { return null; }
}

const MAX_CACHE_BODY = 4 * 1024 * 1024;

export async function loadCached(userId: string, path: string): Promise<CachedJson[]> {
  const out: CachedJson[] = [];
  for (const prefix of affectedPrefixes(path)) {
    for (const r of await db.cacheByPathPrefix(userId, prefix)) {
      try { out.push({ url: r.url, json: JSON.parse(r.body), storedAt: r.storedAt }); } catch {}
    }
  }
  return out;
}

export async function applyUpdates(userId: string, updates: CachedJson[]): Promise<void> {
  for (const u of updates) await db.cachePut(userId, u.url, { body: JSON.stringify(u.json) });
}

/** ذخیره‌ی یک JSON که از مسیر دیگه‌ای رسیده (پیش‌درخواست inline، bootstrap) */
export async function storeJson(url: string, json: unknown): Promise<void> {
  const userId = getKnownUserId();
  if (!userId || json === null || json === undefined) return;
  try {
    const { path, params } = splitUrl(url);
    if (!isCacheableGet(path)) return;
    if (hasPendingFor(path)) return;
    await db.cachePut(userId, cacheKeyFor(path, params), { body: JSON.stringify(json) });
  } catch {}
}

/** پر کردن کش از پاسخ bootstrap (تنظیمات، حساب، آواتار، بازه‌ی روزانه) */
export async function seedFromBootstrap(payload: any): Promise<void> {
  const userId = getKnownUserId();
  if (!userId || !payload || typeof payload !== "object") return;
  // آفلاین یا وسط صف: payload کهنه‌ست و تغییرهای صف رو نداره
  if (isNavigatorOffline() || pendingCount > 0) return;
  const put = (url: string, json: unknown) => db.cachePut(userId, url, { body: JSON.stringify(json) });
  try {
    const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
    for (const [key, value] of Object.entries(settings)) {
      await put(`/api/settings/${encodeURIComponent(key)}`, { value: value ?? null, updatedAt: null });
    }
    if (payload.account) await put("/api/account", payload.account);
    if (payload.avatarUrl !== undefined) await put("/api/account/avatar", { avatarUrl: payload.avatarUrl ?? null });
    const dr = payload.dailyRange;
    if (dr?.from && dr?.to && dr.entries) {
      await put(normalizeUrl("/api/tasks/daily/range", new URLSearchParams({ from: dr.from, to: dr.to })), { entries: dr.entries });
    }
  } catch {}
}

// ── خواندن از کش (دقیق، ترکیبی، آخرین نسخه‌ی مسیر) ──
async function fromCache(userId: string, path: string, params: URLSearchParams, key: string): Promise<Response | null> {
  const hit = await db.cacheGet(userId, key);
  if (hit) return mkResponse(hit.body, "cache");

  const synth = async (prefix: string, fn: (c: CachedJson[]) => unknown): Promise<Response | null> => {
    const recs = await db.cacheByPathPrefix(userId, prefix);
    const cached: CachedJson[] = [];
    for (const r of recs) { try { cached.push({ url: r.url, json: JSON.parse(r.body), storedAt: r.storedAt }); } catch {} }
    const v = fn(cached);
    return v ? mkResponse(JSON.stringify(v), "cache") : null;
  };
  const date = params.get("date");
  if (path === "/api/tasks/daily" && date) {
    const r = await synth("/api/tasks/daily", (c) => synthDaily(date, c)); if (r) return r;
  } else if (path === "/api/tasks/daily/range" && params.get("from") && params.get("to")) {
    const r = await synth("/api/tasks/daily", (c) => synthDailyRange(params.get("from")!, params.get("to")!, c)); if (r) return r;
  } else if (path === "/api/sleep" && params.get("from") && params.get("to")) {
    const r = await synth("/api/sleep", (c) => synthSleep(params.get("from")!, params.get("to")!, c)); if (r) return r;
  } else if (path === "/api/exercise/log" && params.get("planId") && date) {
    const r = await synth("/api/exercise/log", (c) => synthExerciseLog(params.get("planId")!, date, c)); if (r) return r;
  } else if (path === "/api/calorie/log" && date) {
    const r = await synth("/api/calorie/log", (c) => synthCalorieLog(date, c)); if (r) return r;
  }
  if (LATEST_FALLBACK.has(path)) {
    let recs = (await db.cacheByPathPrefix(userId, path)).filter((r) => splitUrl(r.url).path === path);
    if (path === "/api/dashboard") {
      const mine = recs.filter((r) => splitUrl(r.url).params.get("_sec") === splitUrl(key).params.get("_sec"));
      if (mine.length) recs = mine;
    }
    recs.sort((a, b) => b.storedAt - a.storedAt);
    if (recs[0]) return mkResponse(recs[0].body, "cache");
  }
  return null;
}

async function storeResponse(userId: string, path: string, key: string, res: Response): Promise<void> {
  try {
    if (res.headers.get(OFFLINE_HEADER)) return;
    const text = await res.text();
    if (text.length > MAX_CACHE_BODY) return;
    if (path === "/api/auth/session") {
      const j = JSON.parse(text);
      if (!j?.user?.id) return;
    }
    if (getKnownUserId() !== userId) return;
    if (hasPendingFor(path)) return;
    await db.cachePut(userId, key, { body: text, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
  } catch {}
}

export const GET_RACE_MS = 4000;

async function handleGet(orig: typeof fetch, input: RequestInfo | URL, init: RequestInit | undefined, url: URL, userId: string): Promise<Response> {
  const path = url.pathname;
  const key = cacheKeyFor(path, url.searchParams);

  if (isNavigatorOffline()) {
    const c = await fromCache(userId, path, url.searchParams, key);
    if (c) return c;
    throw networkError();
  }
  if (pendingCount > 0 && hasPendingFor(path)) {
    // نوشتن‌های صف‌شده هنوز روی سرور نیستن؛ خواندن از سرور تغییرشون رو پنهان می‌کرد
    const c = await fromCache(userId, path, url.searchParams, key);
    if (c) { kickSync(); return c; }
  }

  const net = orig.call(window, input, init).then((res) => {
    reportNetwork(true);
    if (res.status === 200) void storeResponse(userId, path, key, res.clone());
    return res;
  });

  return new Promise<Response>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(async () => {
      const c = await fromCache(userId, path, url.searchParams, key).catch(() => null);
      if (c && !done) { done = true; resolve(c); }
    }, GET_RACE_MS);
    net.then(
      (res) => { clearTimeout(timer); if (!done) { done = true; resolve(res); } },
      async (err) => {
        clearTimeout(timer);
        const aborted = err?.name === "AbortError";
        if (!aborted) reportNetwork(false);
        if (done) return;
        const c = aborted ? null : await fromCache(userId, path, url.searchParams, key).catch(() => null);
        done = true;
        if (c) resolve(c); else reject(err);
      },
    );
  });
}

// ── نوشتن ──
const labelFor = (path: string): string => {
  if (path.startsWith("/api/tasks/daily")) return tr("تیک روتین", "Routine update");
  if (path.startsWith("/api/settings/")) return tr("تنظیمات", "Settings");
  if (path.startsWith("/api/sleep")) return tr("ثبت خواب", "Sleep log");
  if (path.startsWith("/api/exercise/log")) return tr("ثبت تمرین", "Workout log");
  if (path.startsWith("/api/calorie/log")) return tr("ثبت غذا", "Food log");
  if (path.startsWith("/api/trade/entries")) return tr("معامله", "Trade");
  if (path.startsWith("/api/trade/tags")) return tr("برچسب", "Tag");
  if (path.startsWith("/api/trade/checklists")) return tr("چک‌لیست", "Checklist");
  if (path.startsWith("/api/trade/notes")) return tr("یادداشت", "Note");
  return tr("تغییر", "Change");
};

let lastCreatedAt = 0;
const nextCreatedAt = () => (lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1));

function parseJson(s: string | null): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

let syncKick: Promise<void> | null = null;
export function kickSync() {
  if (syncKick) return;
  syncKick = import("./sync").then((m) => m.runSync()).catch(() => {}).finally(() => { syncKick = null; });
}

async function enqueue(userId: string, method: Method, url: URL, headers: Headers, bodyStr: string | null, requestId: string): Promise<Response> {
  const map = await getIdMap();
  const search = url.searchParams.toString();
  const fullUrl = remapIds(url.pathname + (search ? `?${search}` : ""), map);
  const body = bodyStr === null ? null : remapIds(bodyStr, map);
  const { path, params } = splitUrl(fullUrl);

  const m: Mutation = { method, path, query: params, body: parseJson(body), requestId };
  const cached = await loadCached(userId, path);
  const red = reduceMutation(m, cached);
  if (red) await applyUpdates(userId, red.updates);

  let queue = red ? red.queue : true;
  if (red?.cancelQueued) {
    const id = requestIdOfTmp(red.cancelQueued);
    if (await db.outboxGet(id)) await db.outboxDelete(id);
  } else if (red?.mergeQueued) {
    const item = await db.outboxGet(requestIdOfTmp(red.mergeQueued.tmpId));
    if (item) {
      const merged = { ...(parseJson(item.body) ?? {}), ...red.mergeQueued.patch };
      await db.outboxPut({ ...item, body: JSON.stringify(merged) });
    }
  }
  if (queue) {
    const item: OutboxItem = {
      id: requestId, userId, url: fullUrl, method,
      headers: { "Content-Type": headers.get("content-type") || "application/json", [REQUEST_ID_HEADER]: requestId },
      body, requestId, createdAt: nextCreatedAt(), attempts: 0, label: labelFor(path),
    };
    await db.outboxPut(item);
  }
  await refreshPending();
  if (!isOffline()) kickSync();

  return mkResponse(JSON.stringify({ queued: true, offline: true, ...(red?.response ?? { ok: true }) }), "queued", 202);
}

async function writeThrough(userId: string, method: Method, url: URL, bodyStr: string | null, requestId: string, res: Response) {
  try {
    const real = await res.clone().json().catch(() => null);
    const m: Mutation = { method, path: url.pathname, query: url.searchParams, body: parseJson(bodyStr), requestId };
    const cached = await loadCached(userId, url.pathname);
    const red = reduceMutation(m, cached, real);
    if (red) await applyUpdates(userId, red.updates);
  } catch {}
}

export const MUTATION_TIMEOUT_MS = 20_000;

async function handleMutation(orig: typeof fetch, input: RequestInfo | URL, init: RequestInit | undefined, url: URL, userId: string, method: Method): Promise<Response> {
  const bodyStr = init?.body === undefined || init.body === null ? null : typeof init.body === "string" ? init.body : undefined;
  if (bodyStr === undefined) return orig.call(window, input, init); // FormData و … در صف نمی‌ره
  const headers = new Headers(init?.headers);
  const requestId = headers.get(REQUEST_ID_HEADER) || uuid();
  headers.set(REQUEST_ID_HEADER, requestId);

  // صف قبلی هنوز خالی نشده → این نوشتن هم پشتش می‌ره تا ترتیب (مثلا دو بار تیک همون روز) به‌هم نخوره
  if (!isNavigatorOffline() && pendingCount === 0) {
    const ctrl = new AbortController();
    let timedOut = false;
    const onAbort = () => ctrl.abort();
    init?.signal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, MUTATION_TIMEOUT_MS);
    try {
      const res = await orig.call(window, input, { ...init, headers, signal: ctrl.signal });
      reportNetwork(true);
      if (res.ok) await writeThrough(userId, method, url, bodyStr, requestId, res);
      return res;
    } catch (err) {
      if (init?.signal?.aborted && !timedOut) throw err;
      reportNetwork(false);
    } finally {
      clearTimeout(timer);
      init?.signal?.removeEventListener("abort", onAbort);
    }
  }
  return enqueue(userId, method, url, headers, bodyStr, requestId);
}

/**
 * نقطه‌ی ورود: جایگزین `orig.call(window, input, init)` توی hook لایه‌ی زنده.
 * هر چیزی که مال این لایه نیست (غیر /api، Request، کاربر ناشناس) مستقیم می‌ره.
 */
export async function offlineFetch(orig: typeof fetch, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!rawFetch) rawFetch = orig;
  if (typeof window === "undefined") return orig.call(window, input, init);
  const url = parseApiUrl(input);
  if (!url) return orig.call(window, input, init);
  const userId = getKnownUserId();
  const method = (init?.method || "GET").toUpperCase();

  if (userId && url.pathname.startsWith("/api/auth/") === false) {
    if (method === "GET" && isCacheableGet(url.pathname)) return handleGet(orig, input, init, url, userId);
    if (method !== "GET" && method !== "HEAD" && isOfflineMutation(method, url.pathname)) {
      return handleMutation(orig, input, init, url, userId, method as Method);
    }
    if (method !== "GET" && method !== "HEAD" && isNavigatorOffline()) throw networkError();
  } else if (userId && method === "GET" && url.pathname === "/api/auth/session") {
    return handleGet(orig, input, init, url, userId);
  }

  // مسیر عادی؛ فقط نتیجه‌ی شبکه رو گزارش می‌کنیم
  try {
    const res = await orig.call(window, input, init);
    reportNetwork(true);
    return res;
  } catch (err: any) {
    if (err?.name !== "AbortError") reportNetwork(false);
    throw err;
  }
}
