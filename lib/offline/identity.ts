// هویت آفلاین: «آخرین کاربری که روی این دستگاه وارد شده». کش و صف آفلاین به تفکیک
// همین کاربره. منبع هم‌گام: localStorage (برای شروع سرد بدون اینترنت)، نسخه‌ی پشتیبان:
// انبار meta در IndexedDB. عوض‌شدن کاربر یا خروج = پاک‌سازی کامل (IDB + کش‌های سرویس‌ورکر).
//
// کاربر با منقضی‌شدن نشست فراموش نمی‌شه (صف نوشتن‌هاش می‌مونه تا دوباره وارد بشه)؛
// فقط خروج صریح یا ورود کاربر دیگه پاک می‌کنه.

import * as db from "./db";

const LS_KEY = "arion:offlineUser";
const META_KEY = "userId";

function readLs(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LS_KEY) || null;
  } catch { return null; }
}
function writeLs(v: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem(LS_KEY, v); else window.localStorage.removeItem(LS_KEY);
  } catch {}
}

// گرم‌کردن پوسته (boot.ts) یک‌بار برای هر تب انجام می‌شه؛ با عوض‌شدن/خروج کاربر باید دوباره انجام بشه
function resetShellWarmFlag() {
  try { if (typeof window !== "undefined") window.sessionStorage.removeItem("arion:shellWarmed"); } catch {}
}

let known: string | null = readLs();
const listeners = new Set<(userId: string | null) => void>();

export function getKnownUserId(): string | null {
  return known;
}

export function subscribeIdentity(fn: (userId: string | null) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit() {
  listeners.forEach((fn) => { try { fn(known); } catch {} });
}

export async function swCall<T>(fn: (m: any) => T | Promise<T>): Promise<void> {
  try {
    const m = await import("./swBridge");
    await fn(m);
  } catch {}
}

/** کش‌های خصوصی سرویس‌ورکر + همه‌ی انبارهای IDB */
export async function wipeOfflineData(): Promise<void> {
  await Promise.all([db.wipeAll(), swCall((m) => m.wipeSwCaches())]);
}

/** شروع سرد: اگه localStorage خالی بود از IDB می‌خونیم */
export async function loadKnownUser(): Promise<string | null> {
  if (known) return known;
  const fromMeta = (await db.metaGet<string>(META_KEY)) || null;
  if (fromMeta && !known) { known = fromMeta; writeLs(fromMeta); emit(); }
  return known;
}

/**
 * کاربر فعلی شناخته شد (نشست، ورود، حساب). اگه با کاربر قبلی فرق دارد همه‌چیز پاک می‌شه.
 * null را این‌جا نده — برای خروج از clearOfflineIdentity استفاده کن.
 */
export async function setKnownUser(userId: string): Promise<void> {
  if (!userId) return;
  if (known === userId) {
    // هر بار مطمئن می‌شیم سرویس‌ورکر هم می‌دونه (ارزونه)
    await swCall((m) => m.setSwUser(userId));
    return;
  }
  const prev = known;
  known = userId;
  writeLs(userId);
  emit();
  if (prev && prev !== userId) { resetShellWarmFlag(); await wipeOfflineData(); }
  await db.metaSet(META_KEY, userId);
  await swCall((m) => m.setSwUser(userId));
}

/** خروج از حساب: همه‌چیز پاک و کاربر فراموش می‌شه */
export async function clearOfflineIdentity(): Promise<void> {
  known = null;
  writeLs(null);
  resetShellWarmFlag();
  emit();
  await wipeOfflineData();
  await swCall((m) => m.setSwUser(null));
}

/** فقط تست */
export function __resetIdentityForTests(userId: string | null = null) {
  known = userId;
  listeners.clear();
}
