import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";

// PATCH /api/notepad/databases/:id/properties/:propertyId — تغییر نام/
// گزینه‌ها (select choices، فرمول، relation target)/موقعیت
export async function PATCH(req: NextRequest, { params }: { params: { id: string; propertyId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 });

  const property = await prisma.notepadDatabaseProperty.findFirst({
    where: { id: params.propertyId, databaseId: params.id, database: { block: { page: { userId } } } },
  });
  if (!property) return NextResponse.json({ error: "property پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = clampText(String(body.name), 60) || "بدون‌عنوان";
  if (body.options !== undefined) data.options = body.options;
  if (typeof body.position === "number") data.position = body.position;

  const updated = await prisma.notepadDatabaseProperty.update({ where: { id: params.propertyId }, data });
  return NextResponse.json({ property: updated });
}

// DELETE /api/notepad/databases/:id/properties/:propertyId — حذف property
// + پاک‌کردن ارجاع‌هاش از رکوردها (values JSON) و از filters/sorts/
// boardGroupPropertyId/calendarDatePropertyId خود دیتابیس
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; propertyId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 });

  const property = await prisma.notepadDatabaseProperty.findFirst({
    where: { id: params.propertyId, databaseId: params.id, database: { block: { page: { userId } } } },
  });
  if (!property) return NextResponse.json({ error: "property پیدا نشد" }, { status: 404 });

  const database = await prisma.notepadDatabase.findUnique({ where: { id: params.id } });
  const records = await prisma.notepadDatabaseRecord.findMany({ where: { databaseId: params.id } });

  await prisma.$transaction([
    ...records.map((r) => {
      const values = { ...(r.values as Record<string, unknown>) };
      delete values[params.propertyId];
      return prisma.notepadDatabaseRecord.update({ where: { id: r.id }, data: { values: values as any } });
    }),
    prisma.notepadDatabaseProperty.delete({ where: { id: params.propertyId } }),
    prisma.notepadDatabase.update({
      where: { id: params.id },
      data: {
        filters: ((database?.filters as any[]) || []).filter((f) => f?.propertyId !== params.propertyId),
        sorts: ((database?.sorts as any[]) || []).filter((s) => s?.propertyId !== params.propertyId),
        hiddenPropertyIds: ((database?.hiddenPropertyIds as string[]) || []).filter((id) => id !== params.propertyId),
        boardGroupPropertyId: database?.boardGroupPropertyId === params.propertyId ? null : database?.boardGroupPropertyId,
        calendarDatePropertyId: database?.calendarDatePropertyId === params.propertyId ? null : database?.calendarDatePropertyId,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
