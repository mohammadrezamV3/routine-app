// کشِ HTTPِ روت‌های CACHED (stale-while-revalidate) — Dexieِ `arion-http-cache`.
//
// • فقط GETِ موفق (2xx) ذخیره می‌شه، با کلیدِ مسیر+query و صاحبِ ردیف (userId):
//   ردیفِ کاربرِ دیگه هیچ‌وقت خونده نمی‌شه، و خروج/تعویضِ حساب کلِ جدول رو پاک
//   می‌کنه (LOCAL_DB_NAMES + clearHttpCache در SyncProvider.logout).
// • hit ← همون لحظه پاسخِ ذخیره‌شده، و اگه از آخرین تازه‌سازی بیش از
//   REVALIDATE_AFTER_MS گذشته، تازه‌سازیِ پس‌زمینه (dedupe شده).
// • miss ← فوروارد؛ آفلاین ← 503 (مثلِ ONLINE).
import Dexie, { type Table } from "dexie";

export type HttpCacheRow = {
  key: string; // pathname + search
  userId: string;
  status: number;
  contentType: string | null;
  body: string;
  storedAt: number;
};

class HttpCacheDb extends Dexie {
  responses!: Table<HttpCacheRow, string>;
  constructor() {
    super("arion-http-cache");
    this.version(1).stores({ responses: "key, userId, storedAt" });
  }
}

export const httpCacheDb = new HttpCacheDb();

/** کمتر از این فاصله از آخرین تازه‌سازی، پاسخِ کش بدونِ رفت به سرور */
export const REVALIDATE_AFTER_MS = 30_000;

type Listener = (row: HttpCacheRow) => void;
const listeners = new Set<Listener>();

/** شنونده‌ی «یک پاسخِ تازه در کش نشست» (مثلا /api/account ← isSuperAdmin/ماژول‌ها) */
export function onCacheStored(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function readCached(key: string, userId: string): Promise<HttpCacheRow | null> {
  try {
    const row = await httpCacheDb.responses.get(key);
    return row && row.userId === userId ? row : null;
  } catch {
    return null;
  }
}

export async function storeCached(row: HttpCacheRow): Promise<void> {
  try {
    await httpCacheDb.responses.put(row);
  } catch {
    /* IndexedDB در دسترس نیست — فقط کش نمی‌شه */
  }
  listeners.forEach((fn) => {
    try {
      fn(row);
    } catch {
      /* noop */
    }
  });
}

/** بعد از یک mutationِ آنلاینِ موفق: پاسخ‌های GETِ همون منبع کهنه‌ان (مثلا
 *  PATCH /api/account/avatar ← /api/account و /api/account/avatar) */
export async function invalidateCachedPrefix(prefix: string): Promise<void> {
  try {
    await httpCacheDb.responses.where("key").startsWith(prefix).delete();
  } catch {
    /* noop */
  }
}

export async function clearHttpCache(): Promise<void> {
  try {
    await httpCacheDb.responses.clear();
  } catch {
    /* noop */
  }
}
