// لایه‌ی داده‌ی رودمپ — پل بینِ RoadmapApi و دیتابیسِ محلیِ آفلاین.
// صفحه‌ها مستقیم با Dexie/fetch کار نمی‌کنند، فقط با همین توابع.
import { db, nowIso, getListEtag, setListEtag, RoadmapCacheRow, RoadmapProgressRow } from "./db";
import { applyRemote as applyRemoteProgress } from "./syncHooks";
import { RoadmapApi } from "./api";
import type { MobileRoadmap, RoadmapStepProgress } from "@/lib/api-contract";

export type RoadmapListItem = {
  id: string;
  topic: string;
  goal: string | null;
  title: string;
  summary: string;
  totalDuration: string;
  stageCount: number;
  progress: { total: number; done: number; pct: number };
};

export type RoadmapDetail = RoadmapCacheRow & { stepProgress: RoadmapStepProgress; pct: number; done: number; total: number };

/**
 * فهرستِ رودمپ‌ها را از سرور می‌گیرد و کش/پیشرفتِ محلی را به‌روز می‌کند.
 * آفلاین یا 304 → false (چیزی عوض نشده یا نشد، خودِ کش قبلی معتبره).
 * ماژول قفل → RoadmapApiError با status=403 پرتاب می‌شود (صفحه مسئولِ
 * نمایشِ حالتِ قفل است).
 */
export async function refreshRoadmapsFromServer(api: RoadmapApi): Promise<boolean> {
  const etag = await getListEtag();
  const res = await api.fetchRoadmaps(etag);
  if (res.status === 304) return false;

  await setListEtag(res.etag);
  await applyServerList(res.data);
  return true;
}

async function applyServerList(list: MobileRoadmap[]): Promise<void> {
  const seenIds = list.map((r) => r.id);

  await db.transaction("rw", db.roadmaps, db.progress, async () => {
    // حذف‌ها فقط از همین فهرست دیده می‌شوند (منبعِ مرجع) — رودمپی که
    // اینجا نیست یعنی وب واقعاً پاکش کرده.
    const existingIds = await db.roadmaps.toCollection().primaryKeys();
    const removed = existingIds.filter((id) => !seenIds.includes(id));
    if (removed.length) {
      await db.roadmaps.bulkDelete(removed);
      await db.progress.bulkDelete(removed);
    }

    for (const r of list) {
      const cacheRow: RoadmapCacheRow = {
        id: r.id,
        topic: r.topic,
        goal: r.goal,
        generatedByAi: r.generatedByAi,
        createdAt: r.createdAt,
        plan: r.plan,
        serverStepProgress: r.stepProgress,
        serverProgress: r.progress,
        updatedAt: r.updatedAt,
      };
      await db.roadmaps.put(cacheRow);
      await applyRemoteProgress({ id: r.id, stepProgress: r.stepProgress, editedAt: r.editedAt });

      // رودمپِ تازه (بدونِ ردیفِ progress محلی) — seed اولیه از سرور.
      const localProgress = await db.progress.get(r.id);
      if (!localProgress) {
        const row: RoadmapProgressRow = { id: r.id, stepProgress: r.stepProgress, updatedAt: r.editedAt, dirty: 0 };
        await db.progress.put(row);
      }
    }
  });
}

/** پس از ساختِ موفقِ یک رودمپِ جدید با AI — بلافاصله کش محلی را هم پر می‌کند
 *  تا کاربر بدونِ رفرشِ فهرست وارد جزئیاتش بشه. */
export async function seedRoadmap(roadmap: MobileRoadmap): Promise<void> {
  await db.transaction("rw", db.roadmaps, db.progress, async () => {
    const cacheRow: RoadmapCacheRow = {
      id: roadmap.id,
      topic: roadmap.topic,
      goal: roadmap.goal,
      generatedByAi: roadmap.generatedByAi,
      createdAt: roadmap.createdAt,
      plan: roadmap.plan,
      serverStepProgress: roadmap.stepProgress,
      serverProgress: roadmap.progress,
      updatedAt: roadmap.updatedAt,
    };
    await db.roadmaps.put(cacheRow);
    await db.progress.put({ id: roadmap.id, stepProgress: roadmap.stepProgress, updatedAt: roadmap.editedAt, dirty: 0 });
  });
}

function computeProgress(total: number, stepProgress: RoadmapStepProgress) {
  const done = Object.values(stepProgress).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { done, pct };
}

export async function listRoadmaps(): Promise<RoadmapListItem[]> {
  const rows = await db.roadmaps.toArray();
  const items: RoadmapListItem[] = [];
  for (const r of rows) {
    const progressRow = await db.progress.get(r.id);
    const stepProgress = progressRow?.stepProgress ?? r.serverStepProgress;
    const total = r.plan.stages.length;
    const { done, pct } = computeProgress(total, stepProgress);
    items.push({
      id: r.id,
      topic: r.topic,
      goal: r.goal,
      title: r.plan.title,
      summary: r.plan.summary,
      totalDuration: r.plan.totalDuration,
      stageCount: total,
      progress: { total, done, pct },
    });
  }
  // جدیدترین اول — همون ترتیبِ سرور
  items.sort((a, b) => (a.id < b.id ? 1 : -1));
  return items;
}

export async function getRoadmap(id: string): Promise<RoadmapDetail | null> {
  const row = await db.roadmaps.get(id);
  if (!row) return null;
  const progressRow = await db.progress.get(id);
  const stepProgress = progressRow?.stepProgress ?? row.serverStepProgress;
  const total = row.plan.stages.length;
  const { done, pct } = computeProgress(total, stepProgress);
  return { ...row, stepProgress, done, total, pct };
}

/** تیکِ یک مرحله را می‌زند/برمی‌گرداند — کاملاً محلی و فوری (offline-first)،
 *  و رکورد را dirty می‌کند تا لایه‌ی سینک بعداً push کند. */
export async function toggleStep(roadmapId: string, stageN: number): Promise<RoadmapStepProgress> {
  const key = String(stageN);
  const existing = await db.progress.get(roadmapId);
  const current = existing?.stepProgress ?? {};
  const next: RoadmapStepProgress = { ...current };
  if (next[key]) delete next[key];
  else next[key] = true;

  const row: RoadmapProgressRow = { id: roadmapId, stepProgress: next, updatedAt: nowIso(), dirty: 1 };
  await db.progress.put(row);
  return next;
}
