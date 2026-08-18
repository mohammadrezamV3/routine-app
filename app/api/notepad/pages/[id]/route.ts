import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";
import { NOTEPAD_TITLE_MAX } from "@/lib/notepad";

// همه‌ی id هایِ زیرمجموعه‌ی یک صفحه (بازگشتی) — برای cascade کردنِ Trash روی
// کلِ زیردرخت، چون UPDATE (بر خلافِ DELETE) خودکار cascade نمی‌شه
async function collectDescendantIds(userId: string, rootId: string): Promise<string[]> {
  const all: string[] = [];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await prisma.notepadPage.findMany({
      where: { userId, parentId: { in: frontier } },
      select: { id: true },
    });
    if (!children.length) break;
    const ids = children.map((c) => c.id);
    all.push(...ids);
    frontier = ids;
  }
  return all;
}

// GET /api/notepad/pages/:id — صفحه + بلاک‌هاش (مرتب‌شده). یه side-effectِ
// عمدی داره: lastOpenedAt رو آپدیت می‌کنه تا بخشِ «اخیر»ِ سایدبار درست باشه.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const page = await prisma.notepadPage.findFirst({ where: { id: params.id, userId } });
  if (!page) return NextResponse.json({ error: "صفحه پیدا نشد" }, { status: 404 });

  const [rawBlocks] = await Promise.all([
    prisma.notepadBlock.findMany({
      where: { pageId: page.id },
      orderBy: { position: "asc" },
      include: { database: { select: { id: true } } },
    }),
    prisma.notepadPage.update({ where: { id: page.id }, data: { lastOpenedAt: new Date() } }),
  ]);
  const blocks = rawBlocks.map(({ database, ...b }) => ({ ...b, databaseId: database?.id ?? null }));

  return NextResponse.json({ page: { ...page, lastOpenedAt: new Date(), blocks } });
}

// PATCH /api/notepad/pages/:id — ویرایشِ جزئی: عنوان/آیکون/کاور/جابه‌جایی
// (parentId+position)/سنجاق/آرشیو(Trash)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await prisma.notepadPage.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "صفحه پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = clampText(String(body.title), NOTEPAD_TITLE_MAX);
  if (body.icon !== undefined) data.icon = body.icon === null ? null : String(body.icon).slice(0, 8);
  if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl === null ? null : String(body.coverUrl).slice(0, 1_000_000);
  if (body.isFavorite !== undefined) data.isFavorite = !!body.isFavorite;
  if (body.isLocked !== undefined) data.isLocked = !!body.isLocked;
  if (body.lastOpenedAt !== undefined) data.lastOpenedAt = new Date();
  if (body.position !== undefined && typeof body.position === "number") data.position = body.position;

  // جابه‌جاییِ صفحه زیرِ یه والدِ جدید — نباید بشه زیرِ خودش یا زیرِ یکی از
  // فرزندهای خودش (چرخه می‌سازه)
  if (body.parentId !== undefined) {
    const newParentId = body.parentId === null ? null : String(body.parentId);
    if (newParentId === params.id) {
      return NextResponse.json({ error: "صفحه نمی‌تونه زیرِ خودش باشه" }, { status: 400 });
    }
    if (newParentId) {
      const parent = await prisma.notepadPage.findFirst({ where: { id: newParentId, userId } });
      if (!parent) return NextResponse.json({ error: "صفحه‌ی والد پیدا نشد" }, { status: 404 });
      const descendants = await collectDescendantIds(userId, params.id);
      if (descendants.includes(newParentId)) {
        return NextResponse.json({ error: "نمی‌شه صفحه رو زیرِ یکی از زیرمجموعه‌های خودش برد" }, { status: 400 });
      }
    }
    data.parentId = newParentId;
  }

  // آرشیو/بازگردانی — روی کلِ زیردرخت هم اعمال می‌شه، وگرنه یه صفحه‌ی
  // آرشیوشده می‌تونست فرزندهای هنوز-فعال داشته باشه
  if (body.isArchived !== undefined) {
    const isArchived = !!body.isArchived;
    data.isArchived = isArchived;
    data.archivedAt = isArchived ? new Date() : null;
    const descendants = await collectDescendantIds(userId, params.id);
    if (descendants.length) {
      await prisma.notepadPage.updateMany({
        where: { userId, id: { in: descendants } },
        data: { isArchived, archivedAt: isArchived ? new Date() : null },
      });
    }
  }

  const page = await prisma.notepadPage.update({ where: { id: params.id }, data });
  return NextResponse.json({ page });
}

// DELETE /api/notepad/pages/:id — پیش‌فرض: انتقال به Trash (isArchived=true,
// روی کلِ زیردرخت). با ?permanent=1: حذفِ واقعی و همیشگی (cascade خودکارِ
// دیتابیس هم بلاک‌ها هم زیرصفحه‌ها رو پاک می‌کنه)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await prisma.notepadPage.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "صفحه پیدا نشد" }, { status: 404 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";

  if (permanent) {
    await prisma.notepadPage.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }

  const descendants = await collectDescendantIds(userId, params.id);
  await prisma.notepadPage.updateMany({
    where: { userId, id: { in: [params.id, ...descendants] } },
    data: { isArchived: true, archivedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
