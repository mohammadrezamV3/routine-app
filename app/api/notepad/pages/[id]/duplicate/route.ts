import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/notepad/pages/:id/duplicate — کپیِ صفحه (عنوان+آیکون+بلاک‌ها) به
// عنوانِ یه خواهر/برادرِ جدید، بلافاصله بعدِ خودِ صفحه. زیرصفحه‌ها کپی نمی‌شن
// (دامنه‌ی Phase 1، مثلِ خیلی از پیاده‌سازی‌های ساده‌ترِ duplicate)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(session!.user as any).isSuperAdmin && !checkRateLimit(`notepad-page-duplicate:${userId}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی صبر کن" }, { status: 429 });
  }

  const original = await prisma.notepadPage.findFirst({ where: { id: params.id, userId } });
  if (!original) return NextResponse.json({ error: "صفحه پیدا نشد" }, { status: 404 });

  const [blocks, nextSibling] = await Promise.all([
    prisma.notepadBlock.findMany({ where: { pageId: original.id }, orderBy: { position: "asc" } }),
    prisma.notepadPage.findFirst({
      where: { userId, parentId: original.parentId, position: { gt: original.position } },
      orderBy: { position: "asc" },
    }),
  ]);

  const nextPosition = nextSibling ? (original.position + nextSibling.position) / 2 : original.position + 1000;

  const page = await prisma.$transaction(async (tx) => {
    const created = await tx.notepadPage.create({
      data: {
        userId,
        parentId: original.parentId,
        title: original.title ? `${original.title} (کپی)` : "",
        icon: original.icon,
        position: nextPosition,
        lastOpenedAt: new Date(),
      },
    });
    if (blocks.length) {
      // نگاشتِ id قدیمی -> جدید، تا parentBlockId (بچه‌های Toggle) هم درست بمونه
      const idMap = new Map<string, string>();
      blocks.forEach((b) => idMap.set(b.id, `nb_${created.id}_${b.id}`));
      await tx.notepadBlock.createMany({
        data: blocks.map((b) => ({
          id: idMap.get(b.id)!,
          pageId: created.id,
          parentBlockId: b.parentBlockId ? idMap.get(b.parentBlockId) ?? null : null,
          type: b.type,
          content: b.content as any,
          checked: b.checked,
          collapsed: b.collapsed,
          imageUrl: b.imageUrl,
          position: b.position,
        })),
      });
    }
    return created;
  });

  return NextResponse.json({ page });
}
