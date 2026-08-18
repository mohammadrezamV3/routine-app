import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";

const VALID_VIEWS = new Set(["table", "board", "calendar", "gallery", "list"]);

// GET /api/notepad/databases/:id — دیتابیس کامل (پراپرتی‌ها + همه‌ی
// رکوردها، خام و بدون فیلتر/سورت — کلاینت با توابعِ lib/notepadDb خودش
// فیلتر/سورت می‌کنه چون filters/sorts هم توی همین پاسخ برمی‌گردن)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const database = await prisma.notepadDatabase.findFirst({
    where: { id: params.id, block: { page: { userId } } },
    include: {
      properties: { orderBy: { position: "asc" } },
      records: { orderBy: { position: "asc" } },
    },
  });
  if (!database) return NextResponse.json({ error: "دیتابیس پیدا نشد" }, { status: 404 });
  return NextResponse.json({ database });
}

// PATCH /api/notepad/databases/:id — تغییرِ متادیتا: اسم/ویوِ فعال/
// فیلتر/سورت/propertyهای مخفی/propertyِ گروه‌بندیِ بورد/propertyِ تاریخِ تقویم
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const database = await prisma.notepadDatabase.findFirst({ where: { id: params.id, block: { page: { userId } } } });
  if (!database) return NextResponse.json({ error: "دیتابیس پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = clampText(String(body.name), 120) || "دیتابیس بدون عنوان";
  if (body.activeView !== undefined && VALID_VIEWS.has(body.activeView)) data.activeView = body.activeView;
  if (Array.isArray(body.filters)) data.filters = body.filters.slice(0, 30);
  if (Array.isArray(body.sorts)) data.sorts = body.sorts.slice(0, 10);
  if (Array.isArray(body.hiddenPropertyIds)) data.hiddenPropertyIds = body.hiddenPropertyIds.slice(0, 100).map(String);
  if (body.boardGroupPropertyId !== undefined) data.boardGroupPropertyId = body.boardGroupPropertyId ? String(body.boardGroupPropertyId) : null;
  if (body.calendarDatePropertyId !== undefined) data.calendarDatePropertyId = body.calendarDatePropertyId ? String(body.calendarDatePropertyId) : null;

  const updated = await prisma.notepadDatabase.update({ where: { id: params.id }, data });
  return NextResponse.json({ database: updated });
}
