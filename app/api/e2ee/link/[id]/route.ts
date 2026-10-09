import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, notFound } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };

// POST /api/e2ee/link/:id { action: "done", moved } | { action: "decline" }
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const parsed = await readJsonBody(req, 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const action = parsed.body?.action;
  if (action !== "done" && action !== "decline") return badRequest(tr("درخواست نامعتبر است", "Invalid request"));
  const moved = Number.isInteger(parsed.body?.moved) && parsed.body.moved >= 0 ? Math.min(parsed.body.moved, 1e7) : 0;
  const r = await prisma.e2EDeviceLink.updateMany({
    where: { id: String(params.id).slice(0, 64), userId: me, status: "PENDING" },
    data: { status: action === "done" ? "DONE" : "DECLINED", moved, completedAt: new Date() },
  });
  if (r.count === 0) return notFound();
  if (action === "done") {
    await prisma.auditLog.create({ data: { actorUserId: me, action: "e2ee.history_link", targetType: "User", targetId: me, meta: { moved } } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
