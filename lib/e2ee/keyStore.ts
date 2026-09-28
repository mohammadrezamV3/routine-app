"use client";

// نگه‌داریِ کلیدها روی دستگاه — IndexedDB، با CryptoKeyِ *غیرقابل‌استخراج*.
// CryptoKey قابلِ structured-clone است، پس خودِ شیء (نه بایت‌هایش) ذخیره می‌شود و
// هیچ اسکریپتی (حتی XSS) نمی‌تواند بایت‌های کلید را بیرون بکشد؛ فقط تا وقتی
// صفحه باز است می‌تواند از آن استفاده کند (docs/mentor-e2ee.md).
//
// انبارها (نسخه‌ی ۲):
//   keys    — همه‌ی کلیدهای خصوصیِ این دستگاه، به‌ازای (کاربر، نسخه): SYNCEDِ جاری،
//             کلیدِ این دستگاه (DEVICE) و نسخه‌های بازنشسته (برای خواندنِ پیام‌های قدیمی)
//   kek     — کلیدِ بسته‌بندیِ مشتق از رمزِ عبور (غیرقابل‌استخراج)؛ فقط تا خروج
//   pending — پشتیبانِ تازه‌ای که پس از تغییرِ رمز هنوز به سرور نرسیده (خودش رمزشده است)
//   peers   — اثرِ انگشتِ کلیدهای طرفِ مقابل (TOFU)
//
// نبودِ IndexedDB (برخی حالت‌های خصوصی) → فقط حافظه‌ی همین تب.

const DB_NAME = "arion-e2ee";
const DB_VERSION = 2;
const LEGACY_IDENTITY = "identity";
const KEYS = "keys";
const KEK = "kek";
const PENDING = "pending";
const PEERS = "peers";

export type LocalKeyKind = "SYNCED" | "DEVICE";
export type LocalKey = {
  id: string; // `${userId}:${version}`
  userId: string;
  version: number;
  kind: LocalKeyKind;
  publicKey: string;
  privateKey: CryptoKey;
  /** روی سرور بازنشسته شده؛ فقط برای خواندنِ پیام‌های قدیمی نگه داشته می‌شود */
  retired?: boolean;
  savedAt: number;
};
export type LocalKek = { userId: string; salt: string; iterations: number; kek: CryptoKey; savedAt: number };
export type PendingRewrap = { userId: string; version: number; backup: unknown; kdf: { salt: string; iterations: number }; savedAt: number };
export type PeerRecord = { userId: string; fingerprint: string; version: number; seenAt: number };

const memory = {
  keys: new Map<string, LocalKey>(),
  kek: new Map<string, LocalKek>(),
  pending: new Map<string, PendingRewrap>(),
  peers: new Map<string, PeerRecord>(),
};
let dbPromise: Promise<IDBDatabase | null> | null = null;

export const localKeyId = (userId: string, version: number) => `${userId}:${version}`;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        const t = req.transaction!;
        if (!db.objectStoreNames.contains(KEYS)) db.createObjectStore(KEYS, { keyPath: "id" }).createIndex("userId", "userId");
        if (!db.objectStoreNames.contains(KEK)) db.createObjectStore(KEK, { keyPath: "userId" });
        if (!db.objectStoreNames.contains(PENDING)) db.createObjectStore(PENDING, { keyPath: "userId" });
        if (!db.objectStoreNames.contains(PEERS)) db.createObjectStore(PEERS, { keyPath: "userId" });
        // نسخه‌ی ۱: یک کلید به‌ازای هر کاربر در انبارِ identity → کلیدِ SYNCED در keys
        if (db.objectStoreNames.contains(LEGACY_IDENTITY)) {
          const old = t.objectStore(LEGACY_IDENTITY).getAll();
          old.onsuccess = () => {
            const keys = t.objectStore(KEYS);
            for (const v of (old.result || []) as { userId: string; version: number; publicKey: string; privateKey: CryptoKey; savedAt: number }[]) {
              if (!v?.privateKey || typeof v.version !== "number") continue;
              keys.put({ id: localKeyId(v.userId, v.version), userId: v.userId, version: v.version, kind: "SYNCED", publicKey: v.publicKey, privateKey: v.privateKey, savedAt: v.savedAt || Date.now() } satisfies LocalKey);
            }
            db.deleteObjectStore(LEGACY_IDENTITY);
          };
        }
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

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
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

// ───────────────────────── کلیدها ─────────────────────────

export async function listLocalKeys(userId: string): Promise<LocalKey[]> {
  let rows: LocalKey[] = [];
  try {
    rows = (await run<LocalKey[]>(KEYS, "readonly", (s) => s.index("userId").getAll(userId))) || [];
  } catch {
    rows = [];
  }
  const byId = new Map<string, LocalKey>();
  for (const r of rows) if (r?.privateKey && typeof r.version === "number") byId.set(r.id, r);
  memory.keys.forEach((v, k) => {
    if (v.userId === userId && !byId.has(k)) byId.set(k, v);
  });
  return Array.from(byId.values()).sort((a, b) => a.version - b.version);
}

export async function putLocalKey(v: Omit<LocalKey, "id" | "savedAt"> & { savedAt?: number }): Promise<LocalKey> {
  const row: LocalKey = { ...v, id: localKeyId(v.userId, v.version), savedAt: v.savedAt ?? Date.now() };
  memory.keys.set(row.id, row);
  try {
    await run(KEYS, "readwrite", (s) => s.put(row));
  } catch {
    // فقط در حافظه‌ی همین تب
  }
  return row;
}

export async function deleteLocalKey(userId: string, version: number): Promise<void> {
  const id = localKeyId(userId, version);
  memory.keys.delete(id);
  try {
    await run(KEYS, "readwrite", (s) => s.delete(id));
  } catch {
    // ignore
  }
}

// ───────────────────────── KEK ─────────────────────────

export async function getKek(userId: string): Promise<LocalKek | null> {
  try {
    const v = await run<LocalKek>(KEK, "readonly", (s) => s.get(userId));
    if (v?.kek) return v;
  } catch {
    // حافظه
  }
  return memory.kek.get(userId) ?? null;
}

export async function putKek(v: LocalKek): Promise<void> {
  memory.kek.set(v.userId, v);
  try {
    await run(KEK, "readwrite", (s) => s.put(v));
  } catch {
    // حافظه
  }
}

export async function deleteKek(userId: string): Promise<void> {
  memory.kek.delete(userId);
  try {
    await run(KEK, "readwrite", (s) => s.delete(userId));
  } catch {
    // ignore
  }
}

// ───────────────────────── پشتیبانِ در انتظار ─────────────────────────

export async function getPending(userId: string): Promise<PendingRewrap | null> {
  try {
    const v = await run<PendingRewrap>(PENDING, "readonly", (s) => s.get(userId));
    if (v) return v;
  } catch {
    // حافظه
  }
  return memory.pending.get(userId) ?? null;
}

export async function putPending(v: PendingRewrap): Promise<void> {
  memory.pending.set(v.userId, v);
  try {
    await run(PENDING, "readwrite", (s) => s.put(v));
  } catch {
    // حافظه
  }
}

export async function deletePending(userId: string): Promise<void> {
  memory.pending.delete(userId);
  try {
    await run(PENDING, "readwrite", (s) => s.delete(userId));
  } catch {
    // ignore
  }
}

// ───────────────────────── خروج ─────────────────────────

const wipeListeners = new Set<() => void>();
/** client.ts وضعیتِ در حافظه را با خروج پاک می‌کند */
export function onWipe(fn: () => void): () => void {
  wipeListeners.add(fn);
  return () => wipeListeners.delete(fn);
}

/**
 * خروج از حساب: هرچه با ورودِ دوباره *بی‌صدا* برمی‌گردد پاک می‌شود — KEK، کلیدِ
 * SYNCEDِ جاری (با رمزِ عبور از پشتیبان باز می‌شود) و وضعیتِ در حافظه. کلیدی که
 * جای دیگری ندارد (کلیدِ DEVICEِ این دستگاه، نسخه‌های بازنشسته) می‌ماند، وگرنه
 * سابقه‌ی گفت‌وگو روی همین دستگاه با ورودِ بعدی برای همیشه از دست می‌رفت.
 * «حذف از این دستگاه» در تنظیمات همه را پاک می‌کند (wipeEverything).
 */
export async function wipeOnLogout(): Promise<void> {
  wipeListeners.forEach((l) => l());
  memory.kek.clear();
  memory.pending.clear();
  memory.keys.forEach((v, k) => {
    if (v.kind === "SYNCED" && !v.retired) memory.keys.delete(k);
  });
  try {
    await run(KEK, "readwrite", (s) => s.clear());
    await run(PENDING, "readwrite", (s) => s.clear());
    const all = (await run<LocalKey[]>(KEYS, "readonly", (s) => s.getAll())) || [];
    const drop = all.filter((v) => v.kind === "SYNCED" && !v.retired).map((v) => v.id);
    if (drop.length) await run(KEYS, "readwrite", (s) => { drop.forEach((id) => s.delete(id)); });
  } catch {
    // ignore
  }
}

/** پاک‌کردنِ همه‌چیزِ یک کاربر روی این مرورگر (تنظیمات → «حذف از این دستگاه») */
export async function wipeUser(userId: string): Promise<void> {
  memory.kek.delete(userId);
  memory.pending.delete(userId);
  memory.keys.forEach((v, k) => {
    if (v.userId === userId) memory.keys.delete(k);
  });
  try {
    await run(KEK, "readwrite", (s) => s.delete(userId));
    await run(PENDING, "readwrite", (s) => s.delete(userId));
    const ids = ((await run<IDBValidKey[]>(KEYS, "readonly", (s) => s.index("userId").getAllKeys(userId))) || []) as string[];
    if (ids.length) await run(KEYS, "readwrite", (s) => { ids.forEach((id) => s.delete(id)); });
  } catch {
    // ignore
  }
}

/** سازگاری با فراخوان‌های قدیمی (NavDrawer/AdminShell): همان سیاستِ خروج */
export const clearAllLocalKeys = wipeOnLogout;

// ───────────────────────── طرفِ مقابل (TOFU) ─────────────────────────

export async function getPeer(userId: string): Promise<PeerRecord | null> {
  try {
    const v = await run<PeerRecord>(PEERS, "readonly", (s) => s.get(userId));
    if (v) return v;
  } catch {
    // حافظه
  }
  return memory.peers.get(userId) ?? null;
}

export async function putPeer(v: PeerRecord): Promise<void> {
  memory.peers.set(v.userId, v);
  try {
    await run(PEERS, "readwrite", (s) => s.put(v));
  } catch {
    // ignore
  }
}
