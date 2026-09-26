// پاسخِ کش‌شده‌ی GET /api/account برای همین نشست — منبعِ isSuperAdmin ِ shimِ
// نشست و moduleAccess ِ گاردهای محلی (همون چیزی که وب از /api/account و JWT
// می‌خونه). در حافظه نگه داشته می‌شه (خواندنِ همگام در رندر) و از Dexie
// (arion-http-cache) در شروعِ اپ بار می‌شه تا آفلاین هم معتبر باشه.
import { useSyncExternalStore } from "react";
import { activeModulesOf, type AccountData } from "@/lib/accountCache";
import { onCacheStored, readCached } from "./cache";

export const ACCOUNT_KEY = "/api/account";

let snapshot: { userId: string; data: AccountData } | null = null;
let version = 0;
const listeners = new Set<() => void>();

function set(next: typeof snapshot) {
  snapshot = next;
  version++;
  listeners.forEach((fn) => fn());
}

onCacheStored((row) => {
  if (row.key !== ACCOUNT_KEY) return;
  try {
    set({ userId: row.userId, data: JSON.parse(row.body) as AccountData });
  } catch {
    /* پاسخِ خراب — نگه‌داشتنِ قبلی */
  }
});

/** بارگذاریِ اولیه از Dexie (یک‌بار، وقتی کاربرِ واردشده معلوم شد) */
export async function loadAccountSnapshot(userId: string): Promise<void> {
  if (snapshot?.userId === userId) return;
  const row = await readCached(ACCOUNT_KEY, userId);
  if (!row) return;
  try {
    set({ userId, data: JSON.parse(row.body) as AccountData });
  } catch {
    /* noop */
  }
}

export function clearAccountSnapshot(): void {
  if (snapshot) set(null);
}

/** پاسخِ /api/account ِ همین کاربر، یا null اگه هنوز یک‌بار هم نیومده */
export function cachedAccount(userId: string | null | undefined): AccountData {
  return userId && snapshot?.userId === userId ? snapshot.data : null;
}

export function isSuperAdminCached(userId: string | null | undefined): boolean {
  return !!cachedAccount(userId)?.user?.isSuperAdmin;
}

/**
 * ماژول‌های فعال طبقِ /api/account ِ کش‌شده (سوپرادمین ← سرور خودش همه رو
 * فعال برمی‌گردونه). null یعنی «هنوز نمی‌دونیم» — گارد اجازه می‌ده و سرور
 * موقعِ push خودش module_locked برمی‌گردونه.
 */
export function activeModulesCached(userId: string | null | undefined): Set<string> | null {
  const data = cachedAccount(userId);
  if (!data?.user) return null;
  return activeModulesOf(data);
}

export function useAccountSnapshotVersion(): number {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => version
  );
}
