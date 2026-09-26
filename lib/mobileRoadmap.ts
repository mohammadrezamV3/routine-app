import { prisma } from "@/lib/prisma";
import { computePlanProgress, normalizePlan, sanitizeStepProgress } from "@/lib/roadmapPlan";
import { decideLww, effectiveEditedAt, syncStamp, type ParsedRoadmapProgressChange, type SyncResult, type SyncTimestamps } from "@/lib/mobileSync";
import type { MobileRoadmap, RoadmapProgressRecord } from "@/lib/mobileApiContract";

// رودمپ برای اپ موبایل: فهرستِ کامل (GET /api/mobile/roadmaps)، پیشرفتِ
// تغییرکرده در pull، و LWWِ پیشرفت در push. محتوای مسیر فقط خوانده می‌شه.
// هر کوئری با userId (ضد IDOR)؛ درصد همیشه سمتِ سرور حساب می‌شه — دقیقا مثلِ
// /api/roadmaps/[id] و /progress.

const FULL_SELECT = {
  id: true, topic: true, goal: true, title: true, summary: true, guide: true, steps: true, tools: true, meta: true,
  totalDuration: true, progress: true, generatedByAi: true, createdAt: true,
  updatedAt: true, syncEditedAt: true, syncWrittenAt: true,
} as const;

type ProgressRow = SyncTimestamps & { id: string; steps: unknown; progress: unknown };

const meta = (r: SyncTimestamps) => ({ editedAt: effectiveEditedAt(r).toISOString(), updatedAt: r.updatedAt.toISOString() });

function progressOf(r: { steps: unknown; progress: unknown }) {
  const plan = normalizePlan({ stages: r.steps });
  const stepProgress = sanitizeStepProgress(plan.stages, r.progress);
  return { stepProgress, progress: computePlanProgress(plan.stages, stepProgress) };
}

export function serializeRoadmapProgress(r: ProgressRow): RoadmapProgressRecord {
  return { id: r.id, ...progressOf(r), ...meta(r) };
}

export async function listMobileRoadmaps(userId: string, onlyId?: string): Promise<MobileRoadmap[]> {
  const rows = await prisma.roadmap.findMany({ where: { userId, ...(onlyId ? { id: onlyId } : {}) }, orderBy: { createdAt: "desc" }, select: FULL_SELECT });
  return rows.map((r) => {
    // ردیفِ قدیمی‌تر از تغییرِ ساختار هم با normalizePlan کامل می‌شه (مثل وب)
    const plan = normalizePlan({
      title: r.title, summary: r.summary, guide: r.guide, totalDuration: r.totalDuration, tools: r.tools, meta: r.meta, stages: r.steps,
    });
    const stepProgress = sanitizeStepProgress(plan.stages, r.progress);
    return {
      id: r.id,
      topic: r.topic,
      goal: r.goal,
      generatedByAi: r.generatedByAi,
      createdAt: r.createdAt.toISOString(),
      plan,
      stepProgress,
      progress: computePlanProgress(plan.stages, stepProgress),
      ...meta(r),
    };
  });
}

/** پیشرفتِ رودمپ‌هایی که بعد از since عوض شدن (رودمپ‌های هر کاربر انگشت‌شمارن، صفحه‌بندی لازم نیست) */
export async function pullRoadmapProgress(userId: string, since: Date | null): Promise<RoadmapProgressRecord[]> {
  const rows = await prisma.roadmap.findMany({
    where: { userId, ...(since ? { updatedAt: { gt: since } } : {}) },
    orderBy: { updatedAt: "asc" },
    select: { id: true, steps: true, progress: true, updatedAt: true, syncEditedAt: true, syncWrittenAt: true },
  });
  return rows.map(serializeRoadmapProgress);
}

export async function applyRoadmapProgress(userId: string, change: ParsedRoadmapProgressChange): Promise<SyncResult> {
  const ref = { entity: "roadmapProgress" as const, id: change.id };
  for (let attempt = 0; attempt < 3; attempt++) {
    // فقط رودمپِ خودِ کاربر — رودمپِ کسِ دیگه با «پیدا نشد» رد می‌شه، مثل وب
    const row = await prisma.roadmap.findFirst({
      where: { id: change.id, userId },
      select: { id: true, steps: true, progress: true, updatedAt: true, syncEditedAt: true, syncWrittenAt: true },
    });
    if (!row) return { ...ref, status: "rejected", code: "not_found", error: "رودمپ پیدا نشد", serverRecord: null };
    if (decideLww(row, change.clientAt) === "stale") {
      return { ...ref, status: "stale", serverRecord: serializeRoadmapProgress(row) };
    }
    const plan = normalizePlan({ stages: row.steps });
    const cleaned = sanitizeStepProgress(plan.stages, change.stepProgress);
    const { count } = await prisma.roadmap.updateMany({
      where: { id: row.id, userId, updatedAt: row.updatedAt },
      data: { progress: cleaned as any, ...syncStamp(change.clientAt) },
    });
    if (count === 0) continue; // وسطش عوض شد → دوباره با نسخه‌ی تازه
    const fresh = await prisma.roadmap.findFirst({
      where: { id: row.id, userId },
      select: { id: true, steps: true, progress: true, updatedAt: true, syncEditedAt: true, syncWrittenAt: true },
    });
    return { ...ref, status: "applied", serverRecord: fresh ? serializeRoadmapProgress(fresh) : null };
  }
  return { ...ref, status: "rejected", code: "busy", error: "تغییر هم‌زمان — دوباره تلاش کن", serverRecord: null };
}
