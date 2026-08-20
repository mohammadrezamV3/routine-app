import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/notepad/databases — ساختِ دیتابیس برای یه بلاکِ type="database"
// که تازه ساخته شده (هر بلاک حداکثر یک دیتابیس داره — blockId یکتاست). سه
// propertyِ پیش‌فرض (اسم/وضعیت/تاریخ) + یک رکوردِ خالی، تا کاربر بلافاصله
// یه جدولِ قابل‌استفاده ببینه، نه یه جدولِ کاملاً خالی.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتاً غیرفعال است" }, { status: 403 });

  if (!(session!.user as any).isSuperAdmin && !checkRateLimit(`notepad-db-create:${userId}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی صبر کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const blockId = String(body?.blockId || "");
  if (!blockId) return NextResponse.json({ error: "blockId لازمه" }, { status: 400 });

  const block = await prisma.notepadBlock.findFirst({
    where: { id: blockId, page: { userId } },
    include: { database: true },
  });
  if (!block) return NextResponse.json({ error: "بلاک پیدا نشد" }, { status: 404 });
  if (block.database) return NextResponse.json({ database: await loadFull(block.database.id) });

  const database = await prisma.notepadDatabase.create({
    data: {
      blockId,
      name: "دیتابیس بدون عنوان",
      properties: {
        create: [
          { name: "اسم", type: "text", position: 1000 },
          {
            name: "وضعیت", type: "select", position: 2000,
            options: { choices: [
              { id: "todo", label: "شروع‌نشده", color: "#B0B3BB" },
              { id: "doing", label: "درحالِ‌انجام", color: "#E0A339" },
              { id: "done", label: "انجام‌شده", color: "#3FB37F" },
            ] },
          },
          { name: "تاریخ", type: "date", position: 3000 },
        ],
      },
      records: { create: [{ values: {}, position: 1000 }] },
    },
  });

  return NextResponse.json({ database: await loadFull(database.id) });
}

async function loadFull(id: string) {
  const db = await prisma.notepadDatabase.findUnique({
    where: { id },
    include: {
      properties: { orderBy: { position: "asc" } },
      records: { orderBy: { position: "asc" } },
    },
  });
  return db;
}
