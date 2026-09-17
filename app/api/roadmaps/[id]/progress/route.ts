import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { computePlanProgress, normalizePlan, sanitizeStepProgress } from "@/lib/roadmapPlan";

/**
 * تیک‌زدن/برداشتنِ یک مرحله.
 *
 * درصد را همیشه سرور حساب می‌کند و هر درصدی که کلاینت بفرستد نادیده گرفته
 * می‌شود؛ کلیدِ مرحله‌ای که وجود ندارد هم دور ریخته می‌شود.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const n = (body as any)?.n;
  const done = (body as any)?.done;
  if (typeof n !== "number" || !Number.isFinite(n) || typeof done !== "boolean") {
    return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  }

  const row = await prisma.roadmap.findFirst({
    where: { id: params.id, userId: guard.userId },
    select: { steps: true, progress: true },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const plan = normalizePlan({ stages: row.steps });
  const current = sanitizeStepProgress(plan.stages, row.progress);

  const next = { ...current };
  if (done) next[String(n)] = true;
  else delete next[String(n)];
  const cleaned = sanitizeStepProgress(plan.stages, next);

  await prisma.roadmap.updateMany({
    where: { id: params.id, userId: guard.userId },
    data: { progress: cleaned as any },
  });

  return NextResponse.json({
    stepProgress: cleaned,
    progress: computePlanProgress(plan.stages, cleaned),
  });
}
