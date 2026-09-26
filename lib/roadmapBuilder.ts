import { prisma } from "@/lib/prisma";
import { generateRoadmapGuide, generateRoadmapPlan, generateStageDetail, RoadmapProfile, STAGE_REGEN_TIMEOUT_MS } from "@/lib/aiClient";
import { normalizePlan, PlanStage } from "@/lib/roadmapPlan";
import { logError } from "@/lib/errorLog";

// ساختِ رودمپ در پس‌زمینه‌ی سرور — طبقِ درخواستِ صریح کاربر دیگر پشتِ صفحه‌ی
// ساخت منتظر نمی‌ماند: ردیف فورا با وضعیتِ «در حال ساخت» ذخیره می‌شود، کاربر
// به لیستِ رودمپ‌ها برمی‌گردد و کارتِ همان رودمپ پیشرفت را زنده نشان می‌دهد.
//
// وضعیت داخلِ Roadmap.meta.build نگه داشته می‌شود (بدونِ migration):
//   { status: "building" | "ready" | "failed", phase, done, total, error?, at }
// اجرا یک promiseِ رهاشده روی همان پروسه‌ی Node است (سرورِ شخصی/Docker، نه
// serverless). اگر پروسه وسطِ کار ری‌استارت شود، ردیف «building» می‌ماند —
// buildStatusOf آن را بعد از STALE_MS «متوقف‌شده» حساب می‌کند و صفحه‌ی رودمپ
// مرحله‌های باقی‌مانده را خودش کامل می‌کند.

export type BuildPhase = "outline" | "stages" | "guide";
export type BuildState = { status: "building" | "ready" | "failed"; phase?: BuildPhase; done?: number; total?: number; error?: string; at: number };

const STALE_MS = 6 * 60_000;
const running = new Set<string>();

export function buildStatusOf(meta: unknown): BuildState | null {
  const b = (meta as any)?.build;
  if (!b || typeof b !== "object") return null;
  if (b.status === "building" && Date.now() - Number(b.at || 0) > STALE_MS) {
    return { ...b, status: "failed", error: b.error || "ساخت نیمه‌کاره ماند — ادامه‌اش از صفحه‌ی خودِ رودمپ کامل می‌شود" };
  }
  return b as BuildState;
}

async function setBuild(id: string, userId: string, meta: any, build: Omit<BuildState, "at">, extra: Record<string, any> = {}) {
  await prisma.roadmap.updateMany({
    where: { id, userId },
    data: { ...extra, meta: { ...(meta || {}), build: { ...build, at: Date.now() } } },
  });
}

export function startRoadmapBuild(id: string, userId: string, profile: RoadmapProfile) {
  if (running.has(id)) return;
  running.add(id);
  runBuild(id, userId, profile)
    .catch((err) => logError("roadmap-plan", `background build crashed: ${err?.message || err}`, { context: { feature: "ROADMAP_PLAN" } }))
    .finally(() => running.delete(id));
}

async function runBuild(id: string, userId: string, profile: RoadmapProfile) {
  const baseMeta = { level: profile.level, weeklyHours: profile.weeklyHours, background: profile.background };

  // ۱) اسکلت + جزئیاتِ موازیِ مرحله‌ها تا جایی که بودجه‌ی زمانی اجازه بدهد
  let plan;
  try {
    plan = (await generateRoadmapPlan(profile, userId)).plan;
  } catch (err: any) {
    await setBuild(id, userId, baseMeta, { status: "failed", phase: "outline", error: err?.message || "ساختِ مسیر انجام نشد" });
    return;
  }
  let stages: PlanStage[] = plan.stages;
  let guide = plan.guide;
  const meta = { ...plan.meta };
  const total = stages.length;
  const doneCount = () => stages.filter((s) => s.detailed).length;

  await setBuild(id, userId, meta, { status: "building", phase: "stages", done: doneCount(), total }, {
    title: plan.title || profile.topic,
    summary: plan.summary || null,
    guide: guide || null,
    steps: stages as any,
    totalDuration: plan.totalDuration || null,
    tools: plan.tools as any,
  });

  // ۲) مرحله‌هایی که به بودجه‌ی اول نرسیدند — یکی‌یکی، هرکدام با مهلتِ کامل
  const ctx = { profile, plan: normalizePlan({ ...plan, stages }) };
  for (const s of stages.filter((x) => !x.detailed)) {
    try {
      const detailed = await generateStageDetail(ctx, s.n, userId, STAGE_REGEN_TIMEOUT_MS);
      stages = stages.map((x) => (x.n === s.n ? detailed : x));
    } catch (err: any) {
      logError("roadmap-plan", `background stage ${s.n} failed: ${err?.message || err}`, { severity: "WARNING" as any, context: { feature: "ROADMAP_PLAN" } });
    }
    await setBuild(id, userId, meta, { status: "building", phase: "stages", done: doneCount(), total }, { steps: stages as any });
  }

  // ۳) راهنما، اگر در بودجه‌ی اول ساخته نشد
  if (!guide) {
    await setBuild(id, userId, meta, { status: "building", phase: "guide", done: doneCount(), total });
    try { guide = await generateRoadmapGuide(ctx, userId, STAGE_REGEN_TIMEOUT_MS); } catch { /* از صفحه‌ی رودمپ دوباره ساخته می‌شود */ }
  }

  await setBuild(id, userId, meta, { status: "ready", done: doneCount(), total }, { guide: guide || null, steps: stages as any });
}
