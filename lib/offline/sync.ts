// پخش صف نوشتن‌های آفلاین (FIFO به ازای کاربر) وقتی اینترنت برمی‌گرده.
//
// نتیجه‌ی هر ایتم:
//   2xx            حذف از صف، نگاشت شناسه‌ی موقت به واقعی (برای ساخت‌ها)
//   401            توقف؛ صف می‌مونه و lastError می‌گه باید دوباره وارد بشی
//   408/425/429/5xx یا خطای شبکه: می‌مونه، backoff نمایی، توقف این دور
//   بقیه‌ی 4xx     (400/403/404/409/422 …) حذف از صف + lastError + برگردوندن کش با رفرش از سرور
// هیچ‌وقت دو پخش هم‌زمان نداریم: توی یک تب با یک promise، بین تب‌ها با navigator.locks
// (یا اجاره‌ی localStorage وقتی در دسترس نباشه).

import * as db from "./db";
import { getKnownUserId } from "./identity";
import {
  addIdMap, getIdMap, getOfflineBridge, getPendingCount, getRawFetch, isCacheableGet, refreshPending, remapCacheIds,
} from "./fetchLayer";
import { affectedPrefixes, remapIds, splitUrl, tmpIdFor } from "./reducers";
import { getOfflineStatus, isNavigatorOffline, isOffline, reportNetwork, setLastError, setSyncing } from "./status";
import { REQUEST_ID_HEADER, type OutboxItem } from "./types";
import { tr } from "../i18n";

const LOCK_NAME = "arion-offline-sync";
const LEASE_KEY = "arion:offlineSyncLease";
const LEASE_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;
const INTERVAL_MS = 15_000;
const REFRESH_PER_PREFIX = 12;

export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_MAX_MS = 5 * 60_000;

/** 2s, 4s, 8s … تا سقف ۵ دقیقه */
export function backoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempts - 1));
}

/** کدهایی که تلاش دوباره دارن (بقیه‌ی 4xx قطعی‌ان) */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 425 || status === 429;
}

let running: Promise<void> | null = null;
let backoffUntil = 0;
let authErrorAt = 0;
const tabId = Math.random().toString(36).slice(2);

// ── قفل بین تب‌ها ──
async function withLock(fn: (renew: () => void) => Promise<void>): Promise<void> {
  const locks = typeof navigator !== "undefined" ? (navigator as any).locks : null;
  if (locks?.request) {
    await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock: unknown) => {
      if (lock) await fn(() => {});
    });
    return;
  }
  // جایگزین: اجاره‌ی localStorage
  let ls: Storage | null = null;
  try { ls = typeof window !== "undefined" ? window.localStorage : null; } catch {}
  if (!ls) { await fn(() => {}); return; }
  const mine = () => `${tabId}|${Date.now() + LEASE_MS}`;
  const cur = ls.getItem(LEASE_KEY);
  if (cur) {
    const [owner, exp] = cur.split("|");
    if (owner !== tabId && Number(exp) > Date.now()) return;
  }
  ls.setItem(LEASE_KEY, mine());
  try {
    await fn(() => { try { ls!.setItem(LEASE_KEY, mine()); } catch {} });
  } finally {
    try { if ((ls.getItem(LEASE_KEY) || "").startsWith(tabId + "|")) ls.removeItem(LEASE_KEY); } catch {}
  }
}

function domainsFor(path: string): string[] {
  if (path.startsWith("/api/tasks/daily")) return ["daily"];
  const s = /^\/api\/settings\/([^/]+)$/.exec(path);
  if (s) return [decodeURIComponent(s[1])];
  if (path.startsWith("/api/sleep")) return ["sleep"];
  return getOfflineBridge()?.domainsForMutation(path) ?? [];
}

/** پاسخ واقعی ساخت → شناسه‌ی واقعی */
function createdId(json: any): string | null {
  const o = json?.entry ?? json?.tag ?? json?.checklist ?? json?.note;
  return o && typeof o.id === "string" ? o.id : null;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try { return await getRawFetch()(url, { ...init, signal: ctrl.signal, credentials: "same-origin" }); }
  finally { clearTimeout(timer); }
}

/** GETهای کش‌شده‌ی مسیرهای تحت تاثیر رو از سرور تازه می‌کنه (بعد از خالی‌شدن صف) */
export async function refreshCaches(userId: string, paths: Iterable<string>): Promise<void> {
  const prefixes = new Set<string>();
  for (const p of paths) for (const x of affectedPrefixes(p)) prefixes.add(x);
  for (const prefix of Array.from(prefixes)) {
    const recs = (await db.cacheByPathPrefix(userId, prefix))
      .filter((r) => isCacheableGet(splitUrl(r.url).path))
      .sort((a, b) => b.storedAt - a.storedAt)
      .slice(0, REFRESH_PER_PREFIX);
    for (const r of recs) {
      try {
        const res = await fetchWithTimeout(r.url, { method: "GET" });
        if (res.status === 200) await db.cachePut(userId, r.url, { body: await res.text(), headers: r.headers });
        else if (res.status === 404) await db.cacheDelete(userId, r.url);
      } catch { return; }
    }
  }
}

async function replay(userId: string, renew: () => void): Promise<void> {
  const touched = new Set<string>();
  const dirty = new Set<string>();
  const domains = new Set<string>();
  let stopped = false;

  while (!stopped) {
    if (getKnownUserId() !== userId || isNavigatorOffline()) { stopped = true; break; }
    const items = await db.outboxAll(userId);
    const item: OutboxItem | undefined = items[0];
    if (!item) break;
    renew();

    const map = await getIdMap();
    const url = remapIds(item.url, map);
    const body = item.body === null ? undefined : remapIds(item.body, map);
    const path = splitUrl(url).path;
    const label = item.label || tr("تغییر", "Change");

    let res: Response;
    try {
      res = await fetchWithTimeout(url, { method: item.method, headers: { ...item.headers, [REQUEST_ID_HEADER]: item.requestId }, body });
    } catch {
      reportNetwork(false);
      await db.outboxPut({ ...item, attempts: item.attempts + 1 });
      backoffUntil = Date.now() + backoffMs(item.attempts + 1);
      stopped = true;
      break;
    }
    reportNetwork(true);

    if (res.ok) {
      const json = await res.json().catch(() => null);
      const real = createdId(json);
      const tmp = tmpIdFor(item.requestId);
      if (real && item.method === "POST") {
        await addIdMap(tmp, real);
        await remapCacheIds(userId, path, tmp, real);
      }
      await db.outboxDelete(item.id);
      touched.add(path);
      for (const d of domainsFor(path)) domains.add(d);
      backoffUntil = 0;
      // فقط خطای «نشست تمام شده» با موفقیت بعدی خودش پاک می‌شه؛ ردشدن یک تغییر رو کاربر باید ببینه
      if (authErrorAt && getOfflineStatus().lastError?.at === authErrorAt) { setLastError(null); authErrorAt = 0; }
    } else if (res.status === 401) {
      authErrorAt = Date.now();
      setLastError({ label, message: tr("نشست تمام شده؛ برای فرستادن تغییرها دوباره وارد شو", "Your session expired. Sign in again to send your changes."), at: authErrorAt });
      stopped = true;
    } else if (isRetryableStatus(res.status)) {
      await db.outboxPut({ ...item, attempts: item.attempts + 1 });
      backoffUntil = Date.now() + backoffMs(item.attempts + 1);
      stopped = true;
    } else {
      const j = await res.json().catch(() => null);
      const message = typeof j?.error === "string" && j.error
        ? j.error
        : tr(`سرور این تغییر را قبول نکرد (کد ${res.status})`, `The server rejected this change (code ${res.status})`);
      setLastError({ label, message, at: Date.now() });
      await db.outboxDelete(item.id);
      dirty.add(path);
      for (const d of domainsFor(path)) domains.add(d);
    }
    await refreshPending();
  }

  const left = await refreshPending();
  // کش فقط وقتی تازه می‌شه که صف خالی باشه؛ وگرنه نسخه‌ی سرور تغییرهای باقی‌مونده رو نداره
  if (left === 0 && (touched.size || dirty.size)) {
    await refreshCaches(userId, [...Array.from(touched), ...Array.from(dirty)]);
  }
  if (domains.size) getOfflineBridge()?.publishChange(Array.from(domains));
}

/** صف رو بفرست. force=true: backoff رو نادیده بگیر (رویداد online، دکمه‌ی «همین الان») */
export async function runSync(opts: { force?: boolean } = {}): Promise<void> {
  if (running) return running;
  const userId = getKnownUserId();
  if (!userId) return;
  if (isNavigatorOffline()) return;
  if (!opts.force && Date.now() < backoffUntil) return;
  if (opts.force) backoffUntil = 0;
  running = (async () => {
    setSyncing(true);
    try {
      if ((await refreshPending(false)) === 0) return;
      await withLock((renew) => replay(userId, renew));
    } catch {
      // خطای غیرمنتظره نباید حلقه‌ی بعدی رو بکشه
    } finally {
      setSyncing(false);
      running = null;
    }
  })();
  return running;
}

// ── محرک‌ها ──
let started = false;

async function probe() {
  // «آفلاین» به خاطر شکست آخرین درخواسته نه مرورگر: یک پینگ کوچیک تا با اولین موفقیت برگرده
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await getRawFetch()("/api/health", { cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    if (res) {
      reportNetwork(true);
      getOfflineBridge()?.invalidate("*");
    }
  } catch { reportNetwork(false); }
}

export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => { void runSync({ force: true }); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void runSync();
  });
  setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (isNavigatorOffline()) return;
    if (isOffline()) { void probe().then(() => { if (!isOffline()) void runSync({ force: true }); }); return; }
    if (getPendingCount() > 0) void runSync();
  }, INTERVAL_MS);
  const idle = (cb: () => void) => ("requestIdleCallback" in window ? (window as any).requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500));
  idle(() => { void refreshPending().then((n) => { if (n > 0) void runSync(); }); });
}

/** فقط تست */
export function __resetSyncForTests() {
  running = null;
  backoffUntil = 0;
}
export function __backoffUntilForTests() { return backoffUntil; }
