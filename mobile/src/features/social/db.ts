// کشِ آفلاینِ بخشِ اجتماعی — دیتابیسِ جدای `arion-social` (نه arion-mobile).
// این داده‌ها مالِ سرورن و فقط‌خواندنی کش می‌شن: هیچ‌چیزی dirty نمی‌شه و
// هیچ عملیاتی آفلاین صف نمی‌شه (درخواست دوستی/پیام/گزارش همه «نیاز به اینترنت»).
//
// یک جدولِ key/value کافیه: کلیدها مثل `friends:routine`، `requests`،
// `profile:<id>`، `chat:<SYMBOL>`، `rooms`، `weekly:<offset>`.
import Dexie, { Table } from "dexie";

export interface SocialCacheRow {
  key: string;
  value: unknown;
  /** زمانِ آخرین دریافتِ موفق از سرور (ISO) */
  savedAt: string;
}

class SocialDB extends Dexie {
  cache!: Table<SocialCacheRow, string>;

  constructor() {
    super("arion-social");
    this.version(1).stores({ cache: "key, savedAt" });
  }
}

export const socialDb = new SocialDB();

export const cacheKeys = {
  friends: (module: string) => `friends:${module}`,
  requests: "requests",
  profile: (userId: string) => `profile:${userId}`,
  rooms: "rooms",
  chat: (symbol: string) => `chat:${symbol}`,
  weekly: (offset: number) => `weekly:${offset}`,
} as const;

export async function readCache<T>(key: string): Promise<{ value: T; savedAt: string } | null> {
  try {
    const row = await socialDb.cache.get(key);
    return row ? { value: row.value as T, savedAt: row.savedAt } : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await socialDb.cache.put({ key, value, savedAt: new Date().toISOString() });
  } catch {
    /* کش best-effortه — نبودنش نباید صفحه رو بشکنه */
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await socialDb.cache.delete(key);
  } catch {
    /* noop */
  }
}

/** خروج از حساب — داده‌ی اجتماعیِ کاربرِ قبلی نباید برای بعدی بمونه */
export async function clearSocialCache(): Promise<void> {
  try {
    await socialDb.cache.clear();
  } catch {
    /* noop */
  }
}
