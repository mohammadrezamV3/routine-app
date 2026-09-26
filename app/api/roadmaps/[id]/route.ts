import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/featureFlagsServer";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { computePlanProgress, normalizePlan, sanitizeStepProgress } from "@/lib/roadmapPlan";
import { buildStatusOf } from "@/lib/roadmapBuilder";

/**
 * یک مسیر با مرحله‌های نرمال‌شده و پیشرفتِ حساب‌شده‌ی سمتِ سرور.
 *
 * چرا ردیف دوباره normalize می‌شود: ردیفی که پیش از یک تغییرِ ساختار ذخیره
 * شده ممکن است فیلدی کم داشته باشد و UI مستقیم روی این فیلدها map می‌زند.
 * کوئری هم همیشه `{ id, userId }` است، نه فقط `{ id }` — وگرنه با عوض‌کردنِ
 * id در URL می‌شود مسیرِ کاربرِ دیگری را دید.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireFeature("roadmaps");
  if (!guard.ok) return guard.response;
  // رودمپ ماژولِ پولیه — وقتی فلگ برای همه روشن شد، دسترسیِ ماژول هم لازمه
  { const mod = await requireModule(ModuleKey.ROADMAP); if (!mod.ok) return mod.response; }

  const row = await prisma.roadmap.findFirst({
    where: { id: params.id, userId: guard.userId },
    select: {
      id: true, topic: true, goal: true, title: true, summary: true, guide: true,
      steps: true, tools: true, meta: true, totalDuration: true, progress: true, createdAt: true,
    },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const plan = normalizePlan({
    title: row.title,
    summary: row.summary,
    guide: row.guide,
    totalDuration: row.totalDuration,
    tools: row.tools,
    meta: row.meta,
    stages: row.steps,
  });
  const progress = sanitizeStepProgress(plan.stages, row.progress);

  return NextResponse.json({
    roadmap: { id: row.id, topic: row.topic, goal: row.goal, createdAt: row.createdAt },
    plan,
    stepProgress: progress,
    progress: computePlanProgress(plan.stages, progress),
    build: buildStatusOf(row.meta),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireFeature("roadmaps");
  if (!guard.ok) return guard.response;
  // رودمپ ماژولِ پولیه — وقتی فلگ برای همه روشن شد، دسترسیِ ماژول هم لازمه
  { const mod = await requireModule(ModuleKey.ROADMAP); if (!mod.ok) return mod.response; }

  // deleteMany با شرطِ userId — delete با `{id}` تنها یعنی هر کاربری
  // می‌تواند مسیرِ کاربرِ دیگری را پاک کند.
  const { count } = await prisma.roadmap.deleteMany({ where: { id: params.id, userId: guard.userId } });
  if (!count) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
