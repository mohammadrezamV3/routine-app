import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/theme  →  { value: ... }  (یا null اگه ذخیره نشده)
export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: params.key } },
  });
  return NextResponse.json({ value: row?.value ?? null });
}

// POST /api/settings/theme  { value }
export async function POST(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const value = body?.value ?? null;

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: params.key } },
    create: { userId, key: params.key, value },
    update: { value },
  });

  return NextResponse.json({ ok: true });
}
