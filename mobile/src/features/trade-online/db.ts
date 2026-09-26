// کشِ آفلاینِ بخش‌های آنلاینِ ترید — Dexie مستقل («arion-trade-online»).
// این‌ها «همگام‌سازی» نیستن: فقط آخرین پاسخ‌های سرور برای نمایشِ آفلاین.
//   • events/weeks: چند هفته‌ی آخرِ تقویمِ اقتصادی (هر هفته کامل و بی‌فیلتر)
//   • quotes: آخرین قیمتِ هر نماد + زمانش
//   • kv: واچ‌لیست، کاتالوگِ نمادها، آخرین فهرستِ وضعیتِ متاتریدر
// هیچ رازی این‌جا نیست — کدِ اتصالِ متاتریدر فقط در stateِ صفحه می‌مونه.
import Dexie, { type Table } from "dexie";
import type { EconomicEventDto, MarketQuote, MtAccountStatus, TickerSymbolDto } from "@m/lib/trade-online-contract";
import { weeksToEvict } from "./lib/calendar";

export const TRADE_ONLINE_DB_NAME = "arion-trade-online";

export type CachedEvent = EconomicEventDto & { weekStart: string };
export type CachedWeek = { weekStart: string; fetchedAt: string };
export type CachedQuote = MarketQuote & { fetchedAt: string };

export type KvValues = {
  watchlist: { symbols: string[]; saved: boolean };
  catalog: TickerSymbolDto[];
  mtAccounts: { accounts: MtAccountStatus[]; fetchedAt: string };
  calendarRange: { from: string | null; to: string | null };
};

export type KvRow = { [K in keyof KvValues]: { key: K; value: KvValues[K] } }[keyof KvValues];

class TradeOnlineDb extends Dexie {
  events!: Table<CachedEvent, string>;
  weeks!: Table<CachedWeek, string>;
  quotes!: Table<CachedQuote, string>;
  kv!: Table<KvRow, string>;

  constructor() {
    super(TRADE_ONLINE_DB_NAME);
    this.version(1).stores({
      events: "id, weekStart, occursAt",
      weeks: "weekStart, fetchedAt",
      quotes: "symbol",
      kv: "key",
    });
  }
}

export const onlineDb = new TradeOnlineDb();

export async function getKv<K extends keyof KvValues>(key: K): Promise<KvValues[K] | undefined> {
  try {
    const row = await onlineDb.kv.get(key);
    return row?.value as KvValues[K] | undefined;
  } catch {
    return undefined;
  }
}

export async function setKv(row: KvRow): Promise<void> {
  try {
    await onlineDb.kv.put(row);
  } catch {
    /* کش اختیاریه */
  }
}

/** جایگزینیِ کاملِ یک هفته (رویدادِ حذف‌شده از سرور هم از کش می‌ره) + هرسِ هفته‌های قدیمی */
export async function storeWeek(weekStart: string, events: EconomicEventDto[], fetchedAt: string): Promise<void> {
  await onlineDb.transaction("rw", onlineDb.events, onlineDb.weeks, async () => {
    await onlineDb.events.where("weekStart").equals(weekStart).delete();
    await onlineDb.events.bulkPut(events.map((e) => ({ ...e, weekStart })));
    await onlineDb.weeks.put({ weekStart, fetchedAt });
    const evict = weeksToEvict(await onlineDb.weeks.toArray());
    if (evict.length) {
      await onlineDb.events.where("weekStart").anyOf(evict).delete();
      await onlineDb.weeks.bulkDelete(evict);
    }
  });
}

export async function storeQuotes(quotes: MarketQuote[], fetchedAt: string): Promise<void> {
  try {
    await onlineDb.quotes.bulkPut(quotes.map((q) => ({ ...q, fetchedAt })));
  } catch {
    /* کش اختیاریه */
  }
}

/** پاک‌کردنِ کلِ کش (مثلا هنگامِ خروج) */
export async function clearTradeOnlineCache(): Promise<void> {
  await Promise.all([onlineDb.events.clear(), onlineDb.weeks.clear(), onlineDb.quotes.clear(), onlineDb.kv.clear()]);
}
