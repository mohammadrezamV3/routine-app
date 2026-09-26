// آداپتورِ سینکِ پیشرفتِ رودمپ (features/roadmaps — دیتابیسِ arion-roadmaps).
// فقط جدولِ progress همگام می‌شه (LWW روی کلِ نقشه‌ی تیک‌ها)؛ خودِ رودمپ‌ها
// از GET /api/mobile/roadmaps کش می‌شن (features/roadmaps/repo.ts).
import type { RoadmapProgressRecord } from "@m/lib/api-contract";
import { db as roadmapDb, type RoadmapProgressRow } from "@m/features/roadmaps/db";
import type { PendingItem, SyncAdapter } from "./adapter";

function remoteWins(local: RoadmapProgressRow | undefined, editedAt: string): boolean {
  return !local || local.dirty !== 1 || Date.parse(editedAt) > Date.parse(local.updatedAt);
}

function toRow(r: RoadmapProgressRecord): RoadmapProgressRow {
  return { id: r.id, stepProgress: r.stepProgress ?? {}, updatedAt: r.editedAt, dirty: 0 };
}

export async function applyRemoteRoadmapProgress(r: RoadmapProgressRecord): Promise<boolean> {
  return roadmapDb.transaction("rw", roadmapDb.progress, async () => {
    const local = await roadmapDb.progress.get(r.id);
    if (!remoteWins(local, r.editedAt)) return false;
    await roadmapDb.progress.put(toRow(r));
    return true;
  });
}

export const roadmapAdapter: SyncAdapter = {
  name: "roadmaps",

  async collect() {
    const items: PendingItem[] = [];
    for (const row of await roadmapDb.progress.where("dirty").equals(1).toArray()) {
      const updatedAt = row.updatedAt;
      items.push({
        fk: `roadmapProgress:${row.id}`,
        updatedAt,
        module: "ROADMAP",
        change: { entity: "roadmapProgress", id: row.id, op: "upsert", data: { stepProgress: row.stepProgress }, clientUpdatedAt: updatedAt },
        settle: async (rec) => {
          await roadmapDb.transaction("rw", roadmapDb.progress, async () => {
            const local = await roadmapDb.progress.get(row.id);
            if (!local || local.updatedAt !== updatedAt) return;
            const r = rec as RoadmapProgressRecord | null;
            if (r && r.id === row.id) await roadmapDb.progress.put(toRow(r));
            else await roadmapDb.progress.update(row.id, { dirty: 0 });
          });
        },
      });
    }
    return items;
  },

  async applyPull(res) {
    // progressِ رودمپی که هنوز توی کشِ فهرست نیست هم نگه داشته می‌شه — وقتی
    // فهرست (GET /api/mobile/roadmaps) بیاد، با همین ردیف نمایش داده می‌شه؛
    // و اگه رودمپ حذف شده باشه، applyServerListِ فیچر پاکش می‌کنه.
    for (const r of res.roadmapProgress ?? []) await applyRemoteRoadmapProgress(r);
  },

  async markAllDirty() {
    await roadmapDb.progress.toCollection().modify({ dirty: 1 });
  },
};

export const roadmapSyncTables = [roadmapDb.progress];
