import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/account/login-events → ۵ ورود موفق اخیر (پنل کاربری › امنیت).
// این یک سابقه‌ی append-only است، نه لیست نشست‌های قابل‌ابطال — اون کار رو
// /api/account/sessions انجام می‌ده (مدل Session، با sid داخل JWT).
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const events = await prisma.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, provider: true, ip: true, userAgent: true, createdAt: true },
  });

  return NextResponse.json({ events });
}
