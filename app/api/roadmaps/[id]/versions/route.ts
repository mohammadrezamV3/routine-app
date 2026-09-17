import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { computeProgress, sanitizeProgress } from "@/lib/roadmapGraph";
import { loadOwnedRoadmap, pushVersion } from "@/lib/roadmapStore";
import { logEvent } from "@/lib/roadmapEvents";

// نسخه‌های قبلیِ رودمپ و برگرداندنشان.
//
// GET  — فهرستِ نسخه‌ها (فقط فراداده، نه کلِ گرافِ هر نسخه: فهرست نباید
//        چند صد کیلوبایت JSON بفرستد).
// POST — برگرداندن به یک نسخه‌ی مشخص. خودِ «برگرداندن» هم یک نسخه‌ی تازه
//        می‌سازد، پس بازگشتش هم قابلِ برگشت است.

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const current = await loadOwnedRoadmap(params.id, guard.userId);
  if (!current) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });

  return NextResponse.json({
    current: current.version,
    versions: current.history.map((h) => ({
      version: h.version,
      savedAt: h.savedAt,
      reason: h.reason,
      nodes: h.graph?.stages?.reduce((n, s) => n + (s.nodes?.length ?? 0), 0) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const target = Number(body?.version);
  if (!Number.isInteger(target)) {
    return NextResponse.json({ error: "شماره‌ی نسخه نامعتبر است" }, { status: 400 });
  }

  const current = await loadOwnedRoadmap(params.id, userId);
  if (!current) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });

  const snapshot = current.history.find((h) => h.version === target);
  if (!snapshot?.graph) return NextResponse.json({ error: "این نسخه پیدا نشد" }, { status: 404 });

  // خودِ بازگردانی هم یک نسخه‌ی تازه است — تا کاربر بتواند «برگشت» را هم برگرداند.
  const history = pushVersion(current, `بازگشت به نسخه‌ی ${target}`);
  const graph = snapshot.graph;
  // پیشرفتِ ثبت‌شده‌ی همان نسخه برمی‌گردد، ولی باز هم با گراف تطبیق داده می‌شود
  const progress = sanitizeProgress(graph, snapshot.nodeProgress);

  await prisma.roadmap.updateMany({
    where: { id: params.id, userId },
    data: {
      title: graph.title,
      note: graph.description,
      level: graph.level || null,
      estimatedHours: graph.estimatedHours || null,
      totalWeeks: graph.estimatedWeeks || null,
      stages: graph.stages as any,
      connections: graph.connections as any,
      nodeProgress: progress as any,
      history: history as any,
      version: current.version + 1,
    },
  });

  logEvent("roadmap_version_restored", { userId, roadmapId: params.id, restored: target, version: current.version + 1 });

  return NextResponse.json({
    ok: true,
    version: current.version + 1,
    graph,
    nodeProgress: progress,
    progress: computeProgress(graph, progress),
  });
}
