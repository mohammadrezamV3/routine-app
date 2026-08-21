import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/account/login-events → ۱۰ ورودِ موفقِ اخیر (پنل کاربری › امنیت).
// این یک سابقه‌ی append-only است، نه لیستِ سشن‌های قابل‌ابطال — طبقِ توضیحِ
// مدلِ LoginEvent در schema.prisma، این اپ session استراتژیِ JWTِ stateless
// داره، پس چیزی به‌عنوانِ «خروج از یک دستگاهِ خاص» سمتِ سرور وجود نداره.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const events = await prisma.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, provider: true, ip: true, userAgent: true, createdAt: true },
  });

  return NextResponse.json({ events });
}
