// دو کانالِ همگام‌سازی: /api/mobile/sync (هسته + ورزش/کالری + پیشرفتِ رودمپ)
// و /api/mobile/trade (ترید — endpoint و cursorِ جدا).
import { MOBILE_SYNC_MAX_BATCH } from "@/lib/api-contract";
import { TRADE_SYNC_MAX_BATCH } from "@/lib/trade-contract";
import type { SyncChannel } from "./syncEngine";
import { coreAdapter } from "./coreAdapter";
import { fitnessAdapter } from "./fitnessAdapter";
import { roadmapAdapter } from "./roadmapAdapter";
import { tradeAdapter } from "./tradeAdapter";

export const mainChannel: SyncChannel = {
  name: "main",
  pushPath: "/api/mobile/sync/push",
  pullPath: "/api/mobile/sync/pull",
  maxBatch: MOBILE_SYNC_MAX_BATCH,
  adapters: [coreAdapter, fitnessAdapter, roadmapAdapter],
  lockedFrom: (res) => (Array.isArray(res?.lockedModules) ? res.lockedModules : []),
  // cursorِ کانالِ اصلی در دورانِ قفل جلو می‌ره → بعد از بازشدن pullِ کامل
  repullOnUnlock: true,
};

export const tradeChannel: SyncChannel = {
  name: "trade",
  pushPath: "/api/mobile/trade/push",
  pullPath: "/api/mobile/trade/pull",
  maxBatch: TRADE_SYNC_MAX_BATCH,
  adapters: [tradeAdapter],
  lockedFrom: (res) => (res?.moduleLocked ? ["TRADE"] : []),
  // وقتی قفله سرور همون since قبلی رو برمی‌گردونه — re-pull لازم نیست
  repullOnUnlock: false,
};

export const ALL_CHANNELS: SyncChannel[] = [mainChannel, tradeChannel];
