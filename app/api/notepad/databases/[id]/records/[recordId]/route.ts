import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TEXT = 4000;

function sanitizeValues(raw: unknown, validPropertyIds: Set<string>): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!validPropertyIds.has(key)) continue;
    if (typeof val === "string") out[key] = val.slice(0, MAX_TEXT);
    else if (typeof val === "number") out[key] = Number.isFinite(val) ? val : null;
    else if (typeof val === "boolean") out[key] = val;
    else if (Array.isArray(val)) out[key] = val.slice(0, 100).map((v) => String(v).slice(0, 200));
    else out[key] = null;
  }
  return out;
}

// PATCH /api/notepad/databases/:id/records/:recordId — تغییر values و/یا
// موقعیت (drag reorder)
export async function PATCH(req: NextRequest, { params }: { params: { id: string; recordId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 });

  const record = await prisma.notepadDatabaseRecord.findFirst({
    where: { id: params.recordId, databaseId: params.id, database: { block: { page: { userId } } } },
  });
  if (!record) return NextResponse.json({ error: "رکورد پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.values !== undefined) {
    const properties = await prisma.notepadDatabaseProperty.findMany({ where: { databaseId: params.id }, select: { id: true } });
    const validIds = new Set(properties.map((p) => p.id));
    data.values = { ...(record.values as Record<string, unknown>), ...sanitizeValues(body.values, validIds) };
  }
  if (typeof body.position === "number") data.position = body.position;

  const updated = await prisma.notepadDatabaseRecord.update({ where: { id: params.recordId }, data });
  return NextResponse.json({ record: updated });
}

// DELETE /api/notepad/databases/:id/records/:recordId
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; recordId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 });

  const record = await prisma.notepadDatabaseRecord.findFirst({
    where: { id: params.recordId, databaseId: params.id, database: { block: { page: { userId } } } },
  });
  if (!record) return NextResponse.json({ error: "رکورد پیدا نشد" }, { status: 404 });

  await prisma.notepadDatabaseRecord.delete({ where: { id: params.recordId } });
  return NextResponse.json({ ok: true });
}
