"use client";

// /api/account یک پاسخِ نسبتاً سنگینه (کاربر + moduleAccess + اشتراک) و
// هم‌زمان از دو جای مستقل خونده می‌شد: NavDrawer (برای قفلِ آیتم‌های منو) و
// ModuleGate (برای گیتِ خودِ صفحه). چون هردو در همون لحظه‌ی mount اجرا می‌شن،
// هیچ‌کدوم کشِ اون یکی رو نمی‌دید و هر بارگذاریِ صفحه دو بار همون کوئری رو
// می‌زد. این ماژول همون الگویی رو داره که lib/storage.ts استفاده می‌کنه:
// دیدوپِ درخواستِ در حالِ اجرا + کشِ کوتاه‌مدت.

export type AccountModuleAccess = { module: string; active: boolean; expiresAt: string | null };
export type AccountData = { user?: { moduleAccess?: AccountModuleAccess[] } & Record<string, any> } | null;

const TTL_MS = 15_000;

let cache: { at: number; data: AccountData } | null = null;
let inFlight: Promise<AccountData> | null = null;

export async function getAccount(): Promise<AccountData> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!inFlight) {
    inFlight = fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AccountData) => {
        // پاسخِ ناموفق کش نمی‌شه — یه قطعیِ لحظه‌ای نباید تا کلِ TTL
        // کاربر رو «بدونِ دسترسی» نشون بده.
        if (data) cache = { at: Date.now(), data };
        return data;
      })
      .catch(() => null)
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

/** بعد از هر تغییری که پاسخِ /api/account رو کهنه می‌کنه (خرید اشتراک، خروج، …) */
export function invalidateAccountCache() {
  cache = null;
  inFlight = null;
}

/** ماژول‌های فعال و منقضی‌نشده — منطقِ مشترکِ NavDrawer و ModuleGate */
export function activeModulesOf(data: AccountData): Set<string> {
  const now = Date.now();
  return new Set<string>(
    (data?.user?.moduleAccess || [])
      .filter((m) => m.active && (!m.expiresAt || new Date(m.expiresAt).getTime() > now))
      .map((m) => m.module)
  );
}
