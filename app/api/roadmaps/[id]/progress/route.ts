import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { NODE_STATUSES, NodeStatus, computeProgress, sanitizeProgress } from "@/lib/roadmapGraph";
import { loadOwnedRoadmap } from "@/lib/roadmapStore";

// وضعیتِ یک نود (یا چند نود) در رودمپِ گراف‌محور.
//
// پیشرفت هیچ‌وقت از کلاینت به‌عنوانِ «درصد» گرفته نمی‌شود — فقط وضعیتِ خامِ
// نودها ذخیره می‌شود و درصد همیشه این‌جا از روی گراف حساب می‌شود. این تنها
// راهی‌ست که عدد قابلِ اعتماد بماند (کلاینت قابلِ دستکاری‌ست).

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);

  // مالکیت همین‌جا چک می‌شود: loadOwnedRoadmap همیشه با {id, userId} می‌خواند،
  // پس رودمپِ کاربرِ دیگر اصلاً پیدا نمی‌شود (۴۰۴، نه ۴۰۳ — وجود/نبودش هم لو نرود).
  const current = await loadOwnedRoadmap(params.id, userId);
  if (!current) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  if (!current.graph) return NextResponse.json({ error: "این رودمپ گراف ندارد" }, { status: 400 });

  let next = { ...current.nodeProgress };

  if (typeof body?.nodeId === "string") {
    const status = body?.status;
    if (typeof status !== "string" || !(NODE_STATUSES as string[]).includes(status)) {
      return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
    }
    next[body.nodeId] = status as NodeStatus;
  } else if (body?.nodeProgress && typeof body.nodeProgress === "object") {
    next = body.nodeProgress as Record<string, NodeStatus>;
  } else {
    return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  }

  // کلیدهای ناموجود/وضعیت‌های نامعتبر همین‌جا دور ریخته می‌شوند
  const clean = sanitizeProgress(current.graph, next);

  const updated = await prisma.roadmap.updateMany({
    where: { id: params.id, userId },
    data: { nodeProgress: clean as any },
  });
  if (updated.count === 0) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    nodeProgress: clean,
    progress: computeProgress(current.graph, clean),
  });
}
