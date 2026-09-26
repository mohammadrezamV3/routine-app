// لایه‌ی داده‌ی رودمپ — پل بینِ RoadmapApi و دیتابیسِ محلیِ آفلاین.
// صفحه‌ها مستقیم با Dexie/fetch کار نمی‌کنند، فقط با همین توابع.
import { db, nowIso, getListEtag, setListEtag, RoadmapCacheRow, RoadmapProgressRow } from "./db";
import { applyRemote as applyRemoteProgress } from "./syncHooks";
import { RoadmapApi } from "./api";
import type {
  MobileRoadmap,
  MobileRoadmapRegenerateRequest,
  RoadmapLevel,
  RoadmapStage,
  RoadmapStepProgress,
  RoadmapWeeklyHours,
} from "@m/lib/api-contract";

export type RoadmapListItem = {
  id: string;
  topic: string;
  goal: string | null;
  title: string;
  summary: string;
  totalDuration: string;
  level: RoadmapLevel | null;
  weeklyHours: RoadmapWeeklyHours | null;
  stageCount: number;
  /** مرحله‌هایی که جزئیاتشون هنوز ساخته نشده (detailed:false) */
  pendingCount: number;
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
      await db.roadmaps.put(cacheRowOf(r));
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

function cacheRowOf(r: MobileRoadmap): RoadmapCacheRow {
  return {
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
}

/** پس از ساختِ موفقِ یک رودمپِ جدید با AI — بلافاصله کش محلی را هم پر می‌کند
 *  تا کاربر بدونِ رفرشِ فهرست وارد جزئیاتش بشه. */
export async function seedRoadmap(roadmap: MobileRoadmap): Promise<void> {
  await db.transaction("rw", db.roadmaps, db.progress, async () => {
    await db.roadmaps.put(cacheRowOf(roadmap));
    await db.progress.put({ id: roadmap.id, stepProgress: roadmap.stepProgress, updatedAt: roadmap.editedAt, dirty: 0 });
  });
}

/** کلیدِ تیکِ کارِ iام (صفرمبنا) از مرحله‌ی n — همون taskKeyِ lib/roadmapPlan.ts */
export function taskKey(n: number, i: number): string {
  return `${n}.${i + 1}`;
}

/** فقط کلیدهایی که واقعا مرحله/کاری به اون شماره هست — آینه‌ی sanitizeStepProgressِ سرور */
export function sanitizeLocalProgress(stages: RoadmapStage[], raw: RoadmapStepProgress): RoadmapStepProgress {
  const valid = new Set<string>();
  for (const s of stages) {
    valid.add(String(s.n));
    s.tasks.forEach((_, i) => valid.add(taskKey(s.n, i)));
  }
  const out: RoadmapStepProgress = {};
  for (const [k, v] of Object.entries(raw)) if (valid.has(k) && v === true) out[k] = true;
  return out;
}

/** درصد فقط از کلیدهای *مرحله* (نه کار) — دقیقا مثلِ computePlanProgressِ سرور */
export function computeProgress(stages: RoadmapStage[], stepProgress: RoadmapStepProgress) {
  const total = stages.length;
  const done = stages.filter((s) => stepProgress[String(s.n)]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

/**
 * ساختِ دوباره‌ی جزئیاتِ یک مرحله یا راهنما (نیازمندِ اینترنت). کشِ محتوا
 * با جوابِ سرور عوض می‌شه؛ پیشرفت: اگه تیکِ محلیِ push‌نشده (dirty) داریم،
 * همون نگه داشته می‌شه (فقط کلیدِ کارهای حذف‌شده می‌ره) تا بعدا push بشه،
 * وگرنه نسخه‌ی سرور.
 */
export async function regenerateRoadmapPart(api: RoadmapApi, id: string, req: MobileRoadmapRegenerateRequest): Promise<void> {
  const { roadmap } = await api.regenerate(id, req);
  await db.transaction("rw", db.roadmaps, db.progress, async () => {
    await db.roadmaps.put(cacheRowOf(roadmap));
    const local = await db.progress.get(id);
    if (local?.dirty === 1) {
      await db.progress.put({ ...local, stepProgress: sanitizeLocalProgress(roadmap.plan.stages, local.stepProgress) });
    } else {
      await db.progress.put({ id, stepProgress: roadmap.stepProgress, updatedAt: roadmap.editedAt, dirty: 0 });
    }
  });
}

export async function listRoadmaps(): Promise<RoadmapListItem[]> {
  const rows = await db.roadmaps.toArray();
  const items: RoadmapListItem[] = [];
  for (const r of rows) {
    const progressRow = await db.progress.get(r.id);
    const stepProgress = progressRow?.stepProgress ?? r.serverStepProgress;
    const { total, done, pct } = computeProgress(r.plan.stages, stepProgress);
    items.push({
      id: r.id,
      topic: r.topic,
      goal: r.goal,
      title: r.plan.title,
      summary: r.plan.summary,
      totalDuration: r.plan.totalDuration,
      level: r.plan.meta.level ?? null,
      weeklyHours: r.plan.meta.weeklyHours ?? null,
      stageCount: total,
      pendingCount: r.plan.stages.filter((st) => !st.detailed).length,
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
  const { total, done, pct } = computeProgress(row.plan.stages, stepProgress);
  return { ...row, stepProgress, done, total, pct };
}

/** یک کلیدِ پیشرفت را می‌زند/برمی‌گرداند — کاملاً محلی و فوری (offline-first)،
 *  و رکورد را dirty می‌کند تا لایه‌ی سینک بعداً push کند. */
async function toggleKey(roadmapId: string, key: string): Promise<RoadmapStepProgress> {
  const existing = await db.progress.get(roadmapId);
  const current = existing?.stepProgress ?? {};
  const next: RoadmapStepProgress = { ...current };
  if (next[key]) delete next[key];
  else next[key] = true;

  const row: RoadmapProgressRow = { id: roadmapId, stepProgress: next, updatedAt: nowIso(), dirty: 1 };
  await db.progress.put(row);
  return next;
}

/** تیکِ «این مرحله تمام شد» (کلیدِ "n") */
export function toggleStep(roadmapId: string, stageN: number): Promise<RoadmapStepProgress> {
  return toggleKey(roadmapId, String(stageN));
}

/** تیکِ کارِ iامِ (صفرمبنا) مرحله‌ی n (کلیدِ "n.i") — در درصدِ کل حساب نمی‌شه، مثلِ وب */
export function toggleTask(roadmapId: string, stageN: number, taskIndex: number): Promise<RoadmapStepProgress> {
  return toggleKey(roadmapId, taskKey(stageN, taskIndex));
}
