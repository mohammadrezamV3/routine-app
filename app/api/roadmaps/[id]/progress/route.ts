import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/featureFlagsServer";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { computePlanProgress, normalizePlan, sanitizeStepProgress, taskKey } from "@/lib/roadmapPlan";
import { withLiveSync } from "@/lib/realtime";

/**
 * تیک‌زدن/برداشتن یک مرحله (`{n, done}`) یا یک کار داخل مرحله
 * (`{n, task, done}` — task اندیس صفرمبنای کار است).
 *
 * درصد را همیشه سرور حساب می‌کند و هر درصدی که کلاینت بفرستد نادیده گرفته
 * می‌شود؛ کلید مرحله‌ای که وجود ندارد هم دور ریخته می‌شود.
 */
async function handlePATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireFeature("roadmaps");
  if (!guard.ok) return guard.response;
  // رودمپ ماژول پولیه — وقتی فلگ برای همه روشن شد، دسترسی ماژول هم لازمه
  { const mod = await requireModule(ModuleKey.ROADMAP); if (!mod.ok) return mod.response; }

  const body = await req.json().catch(() => null);
  const n = (body as any)?.n;
  const done = (body as any)?.done;
  const task = (body as any)?.task;
  if (
    typeof n !== "number" || !Number.isFinite(n) || typeof done !== "boolean" ||
    (task !== undefined && (typeof task !== "number" || !Number.isInteger(task) || task < 0))
  ) {
    return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });
  }

  const row = await prisma.roadmap.findFirst({
    where: { id: params.id, userId: guard.userId },
    select: { steps: true, progress: true },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const plan = normalizePlan({ stages: row.steps });
  const current = sanitizeStepProgress(plan.stages, row.progress);

  // کلید ناموجود (مرحله/کاری که نیست) این‌جا اضافه می‌شود و sanitize
  // پایین دورش می‌ریزد — پس نیازی به چک جدا نیست.
  const key = task === undefined ? String(n) : taskKey(n, task);
  const next = { ...current };
  if (done) next[key] = true;
  else delete next[key];
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

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const PATCH = withLiveSync(["roadmaps"], handlePATCH);
