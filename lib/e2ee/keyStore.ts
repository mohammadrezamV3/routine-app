"use client";

// نگه‌داریِ کلیدِ خصوصی روی دستگاه — IndexedDB، با CryptoKeyِ *غیرقابل‌استخراج*.
// CryptoKey قابلِ structured-clone است، پس خودِ شیء (نه بایت‌هایش) ذخیره می‌شود و
// هیچ اسکریپتی (حتی XSS) نمی‌تواند بایت‌های کلید را بیرون بکشد؛ فقط تا وقتی
// صفحه باز است می‌تواند از آن استفاده کند (docs/mentor-e2ee.md).
//
// نبودِ IndexedDB (برخی حالت‌های خصوصیِ قدیمی) → فقط حافظه‌ی همین تب؛ UI این را
// صادقانه می‌گوید («روی این دستگاه ذخیره نمی‌شود»).

const DB_NAME = "arion-e2ee";
const DB_VERSION = 1;
const IDENTITY = "identity";
const PEERS = "peers";

export type LocalIdentity = { userId: string; version: number; publicKey: string; privateKey: CryptoKey; savedAt: number };
export type PeerRecord = { userId: string; fingerprint: string; version: number; seenAt: number };

const memory = { identity: new Map<string, LocalIdentity>(), peers: new Map<string, PeerRecord>() };
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDENTITY)) db.createObjectStore(IDENTITY, { keyPath: "userId" });
        if (!db.objectStoreNames.contains(PEERS)) db.createObjectStore(PEERS, { keyPath: "userId" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        if (!db) return reject(new Error("no-idb"));
        try {
          const t = db.transaction(store, mode);
          const r = fn(t.objectStore(store));
          t.oncomplete = () => resolve(r ? (r.result as T) : undefined);
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error);
        } catch (e) {
          reject(e);
        }
      })
  );
}

export async function isPersistent(): Promise<boolean> {
  return !!(await openDb());
}

export async function getLocalIdentity(userId: string): Promise<LocalIdentity | null> {
  try {
    const v = await tx<LocalIdentity>(IDENTITY, "readonly", (s) => s.get(userId));
    if (v && v.privateKey && typeof v.version === "number") return v;
  } catch {
    // حافظه
  }
  return memory.identity.get(userId) ?? null;
}

export async function putLocalIdentity(v: LocalIdentity): Promise<void> {
  memory.identity.set(v.userId, v);
  try {
    await tx(IDENTITY, "readwrite", (s) => s.put(v));
  } catch {
    // فقط در حافظه‌ی همین تب
  }
}

export async function deleteLocalIdentity(userId: string): Promise<void> {
  memory.identity.delete(userId);
  try {
    await tx(IDENTITY, "readwrite", (s) => s.delete(userId));
  } catch {
    // ignore
  }
}

/** پاک‌کردنِ همه‌ی کلیدهای این مرورگر (خروج از حساب روی دستگاهِ مشترک) */
export async function clearAllLocalKeys(): Promise<void> {
  memory.identity.clear();
  memory.peers.clear();
  try {
    await tx(IDENTITY, "readwrite", (s) => s.clear());
    await tx(PEERS, "readwrite", (s) => s.clear());
  } catch {
    // ignore
  }
}

export async function getPeer(userId: string): Promise<PeerRecord | null> {
  try {
    const v = await tx<PeerRecord>(PEERS, "readonly", (s) => s.get(userId));
    if (v) return v;
  } catch {
    // حافظه
  }
  return memory.peers.get(userId) ?? null;
}

export async function putPeer(v: PeerRecord): Promise<void> {
  memory.peers.set(v.userId, v);
  try {
    await tx(PEERS, "readwrite", (s) => s.put(v));
  } catch {
    // ignore
  }
}
