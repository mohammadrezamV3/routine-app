import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModuleKey } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
      phone: true,
      name: true,
      lastName: true,
      market: true,
      createdAt: true,
      isSuperAdmin: true,
      referralCode: { select: { code: true } },
      moduleAccess: { select: { module: true, active: true, expiresAt: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, key: true } } },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  // سوپریوزر همیشه به همه ماژول‌ها دسترسی نامحدود داره — صرف‌نظر از این‌که
  // جدول ModuleAccess چی می‌گه (که معمولاً seed هم شده، ولی این تضمین اضافه‌ست)
  const moduleAccess = user.isSuperAdmin
    ? Object.values(ModuleKey).map((m) => ({ module: m, active: true, expiresAt: null }))
    : user.moduleAccess;

  const fullName = [user.name, user.lastName].filter(Boolean).join(" ") || null;

  return NextResponse.json({ user: { ...user, name: fullName, moduleAccess } });
}
