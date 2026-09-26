// «pull دیتای ریموت آورد» ← SyncEngine.onRemoteApplied (شل: invalidateStorageCache +
// remount). برگشتِ همون تغییری که خودمون push کردیم نباید حساب بشه — وگرنه
// بعد از هر تیک صفحه remount می‌شد.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@m/db/db";
import { applyRemote, sameRow, wipeAll } from "@m/db/syncHooks";
import { SETTING_KEYS, isUserSettingKey } from "@/lib/userSettingKeys";
import { MOBILE_SYNC_SETTING_KEYS } from "@m/lib/api-contract";
import { SyncEngine } from "./syncEngine";
import { coreAdapter } from "./coreAdapter";
import type { SyncChannel } from "./syncEngine";
import { Call, json, loggedInClient } from "./testUtils";
import { remoteDaily } from "./mappers";

const channel: SyncChannel = {
  name: "main",
  pushPath: "/api/mobile/sync/push",
  pullPath: "/api/mobile/sync/pull",
  maxBatch: 100,
  adapters: [coreAdapter],
  lockedFrom: () => [],
  repullOnUnlock: false,
};

function fake() {
  const daily = new Map<string, any>();
  let extra: any[] = [];
  const handler = (c: Call) => {
    if (c.path === channel.pushPath) {
      const results = c.body.changes.map((ch: any, index: number) => {
        const rec = { date: ch.key, tasks: ch.data?.tasks ?? {}, wake: ch.data?.wake ?? null, deleted: false, editedAt: ch.clientUpdatedAt, updatedAt: new Date().toISOString() };
        daily.set(ch.key, rec);
        return { index, entity: "dailyEntry", key: ch.key, status: "applied", serverRecord: rec };
      });
      return json(200, { results });
    }
    const out = { dailyEntries: [...daily.values(), ...extra], sleepEntries: [], tasks: [], settings: [], cursor: "c1", hasMore: false };
    extra = [];
    return json(200, out);
  };
  return { handler, addRemote: (r: any) => extra.push(r) };
}

describe("onRemoteApplied", () => {
  beforeEach(async () => {
    await wipeAll();
  });

  it("own push echoed back by pull is not a remote change; a real remote row is", async () => {
    const f = fake();
    const { api, kv } = await loggedInClient(f.handler);
    const engine = new SyncEngine(api, kv, [channel]);
    const seen: number[] = [];
    engine.onRemoteApplied((n) => seen.push(n));

    await db.dailyEntries.put({ date: "2026-09-20", completedItems: { a: true }, wakeUpAt: null, updatedAt: "2026-09-20T08:00:00.000Z", deletedAt: null, dirty: 1 });
    await engine.sync();
    expect(seen).toEqual([]);
    expect((await db.dailyEntries.get("2026-09-20"))?.dirty).toBe(0);

    f.addRemote({ date: "2026-09-21", tasks: { b: true }, wake: null, deleted: false, editedAt: "2026-09-21T08:00:00.000Z", updatedAt: "2026-09-21T08:00:00.000Z" });
    await engine.sync();
    expect(seen).toEqual([1]);
  });

  it("applyRemote of an identical clean row is a no-op", async () => {
    const rec = remoteDaily({ date: "2026-09-22", tasks: { a: true }, wake: null, deleted: false, editedAt: "2026-09-22T08:00:00.000Z", updatedAt: "x" } as any);
    expect(await applyRemote("dailyEntries", rec)).toBe(true);
    expect(await applyRemote("dailyEntries", { ...rec })).toBe(false);
    expect(await applyRemote("dailyEntries", { ...rec, completedItems: { a: false } })).toBe(true);
    expect(sameRow({ a: 1, b: { c: [1, 2] }, dirty: 1 }, { b: { c: [1, 2] }, a: 1, dirty: 0 })).toBe(true);
  });
});

describe("setting keys", () => {
  it("every key the web lets the client write is synced (else a local write would never reach the server)", () => {
    const synced = new Set<string>(MOBILE_SYNC_SETTING_KEYS);
    const missing = Object.values(SETTING_KEYS).filter((k) => isUserSettingKey(k) && !synced.has(k));
    expect(missing).toEqual([]);
  });
});
