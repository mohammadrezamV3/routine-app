import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { MOBILE_SYNC_SETTING_KEYS, type SettingRecord } from "@m/lib/api-contract";
import { db } from "@m/db/db";
import { wipeAll } from "@m/db/syncHooks";
import { coreAdapter } from "./coreAdapter";
import { toChange } from "./mappers";

// کلیدهای اعلان/ترجیحاتِ ترید (Phase 0b) باید مثل بقیه‌ی کلیدهای همگام در
// arion.settings ذخیره بشن تا صفحه‌های وبِ داخلِ اپ از /api/settings/:key محلی بخونن.
const NEW_KEYS = [
  "notifPrefs", "dismissedStaticNotifs",
  "tradeTickerSymbols", "tradeCalendarSystem", "tradeVisibleStats", "tradeVisibleFacts",
  "tradeMarketsOnboarded", "tradeNewsAlerts", "tradeChartSymbol", "tradeChartInterval",
  "tradeChatRulesAccepted",
] as const;

const T1 = "2026-09-21T10:00:00.000Z";

describe("settings sync — notification & trade preference keys", () => {
  beforeEach(async () => {
    await wipeAll();
  });

  it("are part of MOBILE_SYNC_SETTING_KEYS", () => {
    for (const k of NEW_KEYS) expect((MOBILE_SYNC_SETTING_KEYS as readonly string[]).includes(k)).toBe(true);
  });

  it("pull stores them in arion.settings", async () => {
    const settings: SettingRecord[] = NEW_KEYS.map((key, i) => ({ key, value: { v: i }, editedAt: T1, updatedAt: T1 }));
    await coreAdapter.applyPull({ settings } as any);
    for (const [i, key] of NEW_KEYS.entries()) {
      const row = await db.settings.get(key);
      expect(row).toMatchObject({ key, value: { v: i }, updatedAt: T1, deletedAt: null, dirty: 0 });
    }
  });

  it("local edits are pushed (not filtered as local-only)", () => {
    for (const key of NEW_KEYS) {
      expect(toChange("settings", { key, value: 1, updatedAt: T1, deletedAt: null, dirty: 1 })).toMatchObject({
        entity: "setting", key, op: "upsert",
      });
    }
  });
});
