// آداپتورِ سینکِ چهار جدولِ هسته (mobile/src/db): dailyEntries، sleepEntries، tasks، settings.
import type { SyncServerRecord } from "@m/lib/api-contract";
import { newId } from "@m/db/db";
import { applyRemote, EntityName, getDirty, markAllDirty, rekeyTask, settlePushed } from "@m/db/syncHooks";
import type { PendingItem, SyncAdapter } from "./adapter";
import { isValidClientId, localKey, remoteDaily, remoteSetting, remoteSleep, remoteTask, toChange } from "./mappers";

const ENTITIES: EntityName[] = ["dailyEntries", "sleepEntries", "tasks", "settings"];

const SERVER_ENTITY: Record<EntityName, string> = {
  dailyEntries: "dailyEntry",
  sleepEntries: "sleepEntry",
  tasks: "task",
  settings: "setting",
};

function mapRemote(entity: EntityName, rec: SyncServerRecord): any {
  switch (entity) {
    case "dailyEntries":
      return remoteDaily(rec as any);
    case "sleepEntries":
      return remoteSleep(rec as any);
    case "tasks":
      return remoteTask(rec as any);
    case "settings":
      return remoteSetting(rec as any);
  }
}

export const coreAdapter: SyncAdapter = {
  name: "core",

  async prepare() {
    // تسک‌های قدیمی که id‌شون با الگوی سرور جور نیست (نسخه‌ی قبلیِ newId) → id تازه
    for (const t of await getDirty("tasks")) {
      if (!isValidClientId(t.id)) await rekeyTask(t.id, newId());
    }
  },

  async collect() {
    const items: PendingItem[] = [];
    for (const entity of ENTITIES) {
      for (const row of (await getDirty(entity)) as any[]) {
        const change = toChange(entity, row);
        if (!change) continue; // سینک‌نشدنی (کلیدِ تنظیماتِ فقط‌محلی)
        const key = localKey(entity, row);
        const updatedAt: string = row.updatedAt;
        items.push({
          fk: `${entity}:${key}`,
          updatedAt,
          change,
          async settle(rec) {
            // پاسخِ ناهمخوان (entity/کلیدِ دیگه) — فقط dirty رو پاک کن، دیتا دست نخوره
            let mapped = rec && change.entity === SERVER_ENTITY[entity] ? mapRemote(entity, rec) : null;
            if (mapped && localKey(entity, mapped) !== key) mapped = null;
            await settlePushed(entity, key, updatedAt, mapped);
          },
        });
      }
    }
    return items;
  },

  async applyPull(res) {
    let applied = 0;
    const count = (ok: boolean) => void (ok && applied++);
    for (const r of res.dailyEntries ?? []) count(await applyRemote("dailyEntries", remoteDaily(r)));
    for (const r of res.sleepEntries ?? []) count(await applyRemote("sleepEntries", remoteSleep(r)));
    for (const r of res.tasks ?? []) count(await applyRemote("tasks", remoteTask(r)));
    for (const r of res.settings ?? []) count(await applyRemote("settings", remoteSetting(r)));
    return applied;
  },

  markAllDirty,
};
