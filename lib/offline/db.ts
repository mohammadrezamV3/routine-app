// لایه‌ی ذخیره‌سازی آفلاین — یک پوشش کوچک روی IndexedDB (بدون وابستگی تازه).
//
// پایگاه "arion-offline" سه انبار دارد:
//   cache   کلید = `${userId}|${آدرس نرمال‌شده با query}` → پاسخ GET ذخیره‌شده
//   outbox  نوشتن‌های منتظر ارسال (OutboxItem) با ایندکس [userId, createdAt]
//   meta    مقدارهای کوچک (نگاشت شناسه‌ی موقت به واقعی، آخرین کاربر، …)
//
// اگر IndexedDB در دسترس نباشد (حالت خصوصی، تست) همه‌چیز در حافظه می‌ماند؛ همان
// قرارداد، فقط با عمر یک نشست. انتخاب بک‌اند یک بار انجام می‌شود تا حالت ترکیبی نداشته باشیم.

import type { OutboxItem } from "./types";

export type StoreName = "cache" | "outbox" | "meta";

export type CacheRecord = {
  key: string;
  userId: string;
  /** آدرس نرمال‌شده (path?query مرتب‌شده) */
  url: string;
  status: number;
  body: string;
  headers: Record<string, string>;
  storedAt: number;
  size: number;
};

export const DB_NAME = "arion-offline";
const DB_VERSION = 1;
const OPEN_TIMEOUT_MS = 4000;

/** سقف‌های کش: بیشتر از این، قدیمی‌ترها حذف می‌شن */
export const CACHE_MAX_BYTES = 25 * 1024 * 1024;
export const CACHE_MAX_ENTRIES = 2000;

interface Backend {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  put(store: StoreName, key: string, value: unknown): Promise<void>;
  del(store: StoreName, keys: string[]): Promise<void>;
  getAll<T>(store: StoreName): Promise<T[]>;
  /** مقدارهایی که کلیدشان با prefix شروع می‌شود (فقط انبارهای با کلید رشته‌ای) */
  range<T>(store: StoreName, prefix: string): Promise<T[]>;
  /** پیمایش جریانی با نگاشت — بدنه‌ها در حافظه جمع نمی‌شن */
  scan<T>(store: StoreName, map: (v: any) => T | undefined): Promise<T[]>;
  clear(store: StoreName): Promise<void>;
}

// ── بک‌اند حافظه ──
function memoryBackend(): Backend {
  const stores: Record<StoreName, Map<string, unknown>> = { cache: new Map(), outbox: new Map(), meta: new Map() };
  return {
    async get(store, key) { return stores[store].get(key) as any; },
    async put(store, key, value) { stores[store].set(key, value); },
    async del(store, keys) { for (const k of keys) stores[store].delete(k); },
    async getAll(store) { return Array.from(stores[store].values()) as any; },
    async range(store, prefix) {
      const out: any[] = [];
      stores[store].forEach((v, k) => { if (k.startsWith(prefix)) out.push(v); });
      return out;
    },
    async scan(store, map) {
      const out: any[] = [];
      stores[store].forEach((v) => { const m = map(v); if (m !== undefined) out.push(m); });
      return out;
    },
    async clear(store) { stores[store].clear(); },
  };
}

// ── بک‌اند IndexedDB ──
function reqP<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function idbBackend(db: IDBDatabase): Backend {
  const keyed = (store: StoreName) => store !== "outbox";
  return {
    async get(store, key) { return reqP(db.transaction(store, "readonly").objectStore(store).get(key)) as any; },
    async put(store, key, value) {
      const tx = db.transaction(store, "readwrite");
      if (keyed(store)) tx.objectStore(store).put(value, key); else tx.objectStore(store).put(value);
      await txDone(tx);
    },
    async del(store, keys) {
      if (!keys.length) return;
      const tx = db.transaction(store, "readwrite");
      const os = tx.objectStore(store);
      for (const k of keys) os.delete(k);
      await txDone(tx);
    },
    async getAll(store) { return reqP(db.transaction(store, "readonly").objectStore(store).getAll()) as any; },
    async range(store, prefix) {
      const range = IDBKeyRange.bound(prefix, prefix + "￿");
      return reqP(db.transaction(store, "readonly").objectStore(store).getAll(range)) as any;
    },
    scan<T>(store: StoreName, map: (v: any) => T | undefined): Promise<T[]> {
      return new Promise((resolve, reject) => {
        const out: T[] = [];
        const r = db.transaction(store, "readonly").objectStore(store).openCursor();
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const c = r.result;
          if (!c) return resolve(out);
          const m = map(c.value);
          if (m !== undefined) out.push(m);
          c.continue();
        };
      });
    },
    async clear(store) {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      await txDone(tx);
    },
  };
}

function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: IDBDatabase | null) => { if (!settled) { settled = true; resolve(v); } };
    const timer = setTimeout(() => done(null), OPEN_TIMEOUT_MS);
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
        if (!db.objectStoreNames.contains("outbox")) {
          const os = db.createObjectStore("outbox", { keyPath: "id" });
          os.createIndex("byUser", ["userId", "createdAt"]);
        }
      };
      req.onsuccess = () => { clearTimeout(timer); done(req.result); };
      req.onerror = () => { clearTimeout(timer); done(null); };
      req.onblocked = () => { clearTimeout(timer); done(null); };
    } catch {
      clearTimeout(timer);
      done(null);
    }
  });
}

let backendP: Promise<Backend> | null = null;
let usingMemory = false;

function backend(): Promise<Backend> {
  if (!backendP) {
    backendP = (async () => {
      if (typeof indexedDB !== "undefined") {
        const db = await openIdb();
        if (db) {
          db.onversionchange = () => { db.close(); };
          return idbBackend(db);
        }
      }
      usingMemory = true;
      return memoryBackend();
    })();
  }
  return backendP;
}

/** برای تست و نشانگر: آیا فقط در حافظه کار می‌کنیم؟ */
export async function isMemoryOnly(): Promise<boolean> {
  await backend();
  return usingMemory;
}

/** فقط تست: بک‌اند را به حافظه‌ی تازه برمی‌گرداند */
export function __resetOfflineDbForTests() {
  backendP = Promise.resolve(memoryBackend());
  usingMemory = true;
  stats = null;
  putsSinceCheck = 0;
}

// ── کلیدها ──
export function cacheKey(userId: string, url: string): string {
  return `${userId}|${url}`;
}

// ── کش پاسخ‌ها ──
let stats: { count: number; bytes: number } | null = null;
let putsSinceCheck = 0;

export async function cacheGet(userId: string, url: string): Promise<CacheRecord | undefined> {
  try { return await (await backend()).get<CacheRecord>("cache", cacheKey(userId, url)); } catch { return undefined; }
}

export async function cachePut(userId: string, url: string, rec: { status?: number; body: string; headers?: Record<string, string>; storedAt?: number }): Promise<void> {
  const key = cacheKey(userId, url);
  const full: CacheRecord = {
    key, userId, url,
    status: rec.status ?? 200,
    body: rec.body,
    headers: rec.headers ?? { "content-type": "application/json" },
    storedAt: rec.storedAt ?? Date.now(),
    size: rec.body.length,
  };
  try {
    await (await backend()).put("cache", key, full);
    if (stats) { stats.count++; stats.bytes += full.size; }
    putsSinceCheck++;
    if (!stats || putsSinceCheck >= 40 || stats.bytes > CACHE_MAX_BYTES || stats.count > CACHE_MAX_ENTRIES) {
      await evictIfNeeded();
    }
  } catch {}
}

export async function cacheDelete(userId: string, url: string): Promise<void> {
  try { await (await backend()).del("cache", [cacheKey(userId, url)]); } catch {}
}

/** همه‌ی ورودی‌های کش این کاربر که path‌شان با prefix شروع می‌شود (با بدنه) */
export async function cacheByPathPrefix(userId: string, pathPrefix: string): Promise<CacheRecord[]> {
  try { return await (await backend()).range<CacheRecord>("cache", cacheKey(userId, pathPrefix)); } catch { return []; }
}

/** شمار و حجم واقعی + حذف قدیمی‌ترها تا زیر ۸۵٪ سقف */
export async function evictIfNeeded(): Promise<void> {
  putsSinceCheck = 0;
  try {
    const b = await backend();
    const lite = await b.scan<{ key: string; at: number; size: number }>("cache", (v) => ({ key: v.key, at: v.storedAt, size: v.size || 0 }));
    let count = lite.length;
    let bytes = lite.reduce((s, r) => s + r.size, 0);
    if (count > CACHE_MAX_ENTRIES || bytes > CACHE_MAX_BYTES) {
      lite.sort((a, c) => a.at - c.at);
      const victims: string[] = [];
      for (const r of lite) {
        if (count <= CACHE_MAX_ENTRIES * 0.85 && bytes <= CACHE_MAX_BYTES * 0.85) break;
        victims.push(r.key);
        count--;
        bytes -= r.size;
      }
      await b.del("cache", victims);
    }
    stats = { count, bytes };
  } catch {}
}

// ── صف نوشتن ──
export async function outboxPut(item: OutboxItem): Promise<void> {
  const b = await backend();
  await b.put("outbox", item.id, item);
}
export async function outboxDelete(id: string): Promise<void> {
  try { await (await backend()).del("outbox", [id]); } catch {}
}
export async function outboxGet(id: string): Promise<OutboxItem | undefined> {
  try { return await (await backend()).get<OutboxItem>("outbox", id); } catch { return undefined; }
}
/** صف یک کاربر به ترتیب زمان ساخت */
export async function outboxAll(userId: string): Promise<OutboxItem[]> {
  try {
    const all = await (await backend()).getAll<OutboxItem>("outbox");
    return all.filter((i) => i.userId === userId).sort((a, c) => a.createdAt - c.createdAt || (a.id < c.id ? -1 : 1));
  } catch { return []; }
}

// ── متا ──
export async function metaGet<T>(key: string): Promise<T | undefined> {
  try { return await (await backend()).get<T>("meta", key); } catch { return undefined; }
}
export async function metaSet(key: string, value: unknown): Promise<void> {
  try { await (await backend()).put("meta", key, value); } catch {}
}
export async function metaDelete(key: string): Promise<void> {
  try { await (await backend()).del("meta", [key]); } catch {}
}

/** همه‌ی انبارها — خروج یا عوض‌شدن کاربر */
export async function wipeAll(): Promise<void> {
  stats = null;
  putsSinceCheck = 0;
  try {
    const b = await backend();
    await Promise.all([b.clear("cache"), b.clear("outbox"), b.clear("meta")]);
  } catch {}
}
