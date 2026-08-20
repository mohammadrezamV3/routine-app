import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { NOTEPAD_TITLE_MAX } from "@/lib/notepad";

// GET /api/notepad/pages — همه‌ی صفحاتِ کاربر (شاملِ آرشیوشده‌ها؛ کلاینت خودش
// بر اساسِ isArchived/isFavorite فیلتر می‌کنه تا درخت/Favorites/Trash رو یکجا
// از همین یک لیست بسازه، بدونِ چند درخواستِ جدا)
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتاً غیرفعال است" }, { status: 403 });

  const pages = await prisma.notepadPage.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }],
  });
  return NextResponse.json({ pages });
}

// POST /api/notepad/pages — ساختِ صفحه‌ی جدید (خالی یا زیرِ یه صفحه‌ی دیگه)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتاً غیرفعال است" }, { status: 403 });

  if (!(session!.user as any).isSuperAdmin && !checkRateLimit(`notepad-page-create:${userId}`, 100, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد صفحاتِ ساخته‌شده در این ساعت زیاده — کمی صبر کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const parentId = body.parentId ? String(body.parentId) : null;

  if (parentId) {
    const parent = await prisma.notepadPage.findFirst({ where: { id: parentId, userId } });
    if (!parent) return NextResponse.json({ error: "صفحه‌ی والد پیدا نشد" }, { status: 404 });
  }

  const lastSibling = await prisma.notepadPage.findFirst({
    where: { userId, parentId },
    orderBy: { position: "desc" },
  });

  const page = await prisma.notepadPage.create({
    data: {
      userId,
      parentId,
      title: clampText(String(body.title ?? "").trim(), NOTEPAD_TITLE_MAX),
      icon: typeof body.icon === "string" ? body.icon.slice(0, 8) : null,
      position: (lastSibling?.position ?? 0) + 1000,
      lastOpenedAt: new Date(),
    },
  });
  return NextResponse.json({ page });
}
