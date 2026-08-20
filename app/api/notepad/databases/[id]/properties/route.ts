import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";
import { PROPERTY_TYPE_ORDER } from "@/lib/notepadDb";

const VALID_TYPES = new Set(PROPERTY_TYPE_ORDER);

// POST /api/notepad/databases/:id/properties — افزودنِ propertyِ جدید
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتاً غیرفعال است" }, { status: 403 });

  const database = await prisma.notepadDatabase.findFirst({ where: { id: params.id, block: { page: { userId } } } });
  if (!database) return NextResponse.json({ error: "دیتابیس پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = clampText(String(body?.name || ""), 60) || "بدون‌عنوان";
  const type = String(body?.type || "");
  if (!VALID_TYPES.has(type as any)) return NextResponse.json({ error: "نوعِ property نامعتبره" }, { status: 400 });

  const lastProp = await prisma.notepadDatabaseProperty.findFirst({ where: { databaseId: database.id }, orderBy: { position: "desc" } });
  const position = typeof body?.position === "number" ? body.position : (lastProp?.position ?? 0) + 1000;

  const options = (type === "select" || type === "multi_select") ? { choices: [] } : type === "formula" ? { expression: "" } : type === "relation" ? { targetDatabaseId: null } : null;

  const property = await prisma.notepadDatabaseProperty.create({
    data: { databaseId: database.id, name, type, position, options: options as any },
  });
  return NextResponse.json({ property });
}
