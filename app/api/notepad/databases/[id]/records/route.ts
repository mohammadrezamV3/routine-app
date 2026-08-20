import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/notepad/databases/:id/records — افزودنِ رکوردِ خالیِ جدید
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتاً غیرفعال است" }, { status: 403 });

  if (!(session!.user as any).isSuperAdmin && !checkRateLimit(`notepad-record-create:${userId}`, 600, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی صبر کن" }, { status: 429 });
  }

  const database = await prisma.notepadDatabase.findFirst({ where: { id: params.id, block: { page: { userId } } } });
  if (!database) return NextResponse.json({ error: "دیتابیس پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const position = typeof body?.position === "number" ? body.position : Date.now();

  const record = await prisma.notepadDatabaseRecord.create({
    data: { databaseId: database.id, values: {}, position },
  });
  return NextResponse.json({ record });
}
