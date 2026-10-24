// وضعیت آفلاین برای UI. «آنلاین» = navigator.onLine و آخرین تلاش شبکه‌ی ناموفق
// نبوده (با هر پاسخ موفق دوباره آنلاین می‌شه).
//
// namespace import عمدا: این فایل از زنجیره‌ی liveSync به گراف route handlerها هم
// می‌رسه و گارد RSC نکست import با نام هوک رو در گراف سرور رد می‌کنه.
import * as React from "react";
import type { OfflineStatus, OfflineSyncError } from "./types";

export const SERVER_SNAPSHOT: OfflineStatus = { online: true, pending: 0, syncing: false, lastError: null };

let state: OfflineStatus = SERVER_SNAPSHOT;
let lastNetworkFailed = false;
const listeners = new Set<() => void>();
let wired = false;

function navOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function compute(): OfflineStatus {
  const online = navOnline() && !lastNetworkFailed;
  return { ...state, online };
}

function commit(patch: Partial<OfflineStatus>) {
  const base = { ...state, ...patch };
  const next = { ...base, online: navOnline() && !lastNetworkFailed };
  if (
    next.online === state.online && next.pending === state.pending &&
    next.syncing === state.syncing && next.lastError === state.lastError
  ) return;
  state = next;
  listeners.forEach((fn) => { try { fn(); } catch {} });
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  state = compute();
  window.addEventListener("online", () => { commit({}); });
  window.addEventListener("offline", () => { commit({}); });
}

export function getOfflineStatus(): OfflineStatus {
  wire();
  return state;
}

export function subscribeOfflineStatus(cb: () => void): () => void {
  wire();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useOfflineStatus(): OfflineStatus {
  return React.useSyncExternalStore(subscribeOfflineStatus, getOfflineStatus, () => SERVER_SNAPSHOT);
}

/** آیا همین الان باید فرض کنیم شبکه نیست؟ (برای تصمیم‌های هم‌زمان) */
export function isOffline(): boolean {
  return !navOnline() || lastNetworkFailed;
}

/** فقط navigator.onLine — وقتی مرورگر خودش می‌گه قطعه، اصلا سراغ شبکه نمی‌ریم */
export function isNavigatorOffline(): boolean {
  return !navOnline();
}

/** هر درخواست /api: ok = به سرور رسید (هر کدی)، !ok = خطای شبکه/تایم‌اوت */
export function reportNetwork(ok: boolean) {
  const failed = !ok;
  if (failed === lastNetworkFailed) return;
  lastNetworkFailed = failed;
  commit({});
}

export function setPending(n: number) { commit({ pending: n }); }
export function setSyncing(v: boolean) { commit({ syncing: v }); }
export function setLastError(e: OfflineSyncError | null) { commit({ lastError: e }); }

export function clearOfflineError(): void { setLastError(null); }

/** صف را همین الان بفرست (خودش در sync.ts پیاده شده؛ تنبل لود می‌شه) */
export async function syncNow(): Promise<void> {
  const m = await import("./sync");
  await m.runSync({ force: true });
}

/** فقط تست */
export function __resetStatusForTests() {
  state = SERVER_SNAPSHOT;
  lastNetworkFailed = false;
  listeners.clear();
  wired = false;
}
