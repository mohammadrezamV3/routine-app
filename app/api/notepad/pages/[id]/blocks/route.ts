import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { isValidBlockType, NOTEPAD_MAX_BLOCKS_PER_SAVE, sanitizeLeaves } from "@/lib/notepad";

// PUT /api/notepad/pages/:id/blocks — جایگزینی کامل بلاک‌های یک صفحه با
// آرایه‌ی ارسالی از کلاینت (اتوسیو همیشه کل لیست فعلی صفحه رو می‌فرسته،
// نه یک بلاک تکی — برای Phase 1 خیلی ساده‌تر و مطمئن‌تر از sync
// per-operation‌ه، و چون تعداد بلاک هر صفحه معمولا کوچیکه هزینه‌ی واقعی
// نداره). idهایی که توی آرایه‌ی جدید نیستن حذف می‌شن؛ بقیه‌ی idهای موجود
// همین صفحه آپدیت می‌شن و idهای تازه create — یعنی id مستقل هر بلاک از
// سمت کلاینت حفظ می‌مونه (به‌جز مورد نادر collision، پایین توضیح داده شده).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(session!.user as any).isSuperAdmin) return NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 });

  if (!(session!.user as any).isSuperAdmin && !checkRateLimit(`notepad-blocks-save:${userId}`, 600, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "ذخیره‌سازی زیاد در این ساعت — کمی صبر کن" }, { status: 429 });
  }

  const page = await prisma.notepadPage.findFirst({ where: { id: params.id, userId } });
  if (!page) return NextResponse.json({ error: "صفحه پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const incoming = Array.isArray(body.blocks) ? body.blocks.slice(0, NOTEPAD_MAX_BLOCKS_PER_SAVE) : [];

  const clean = incoming
    .filter((b: any) => b && typeof b.id === "string" && isValidBlockType(b.type) && typeof b.position === "number")
    .map((b: any) => ({
      id: String(b.id).slice(0, 100),
      parentBlockId: typeof b.parentBlockId === "string" ? b.parentBlockId : null,
      type: b.type,
      content: sanitizeLeaves(b.content) as any,
      checked: !!b.checked,
      collapsed: !!b.collapsed,
      imageUrl: typeof b.imageUrl === "string" ? b.imageUrl.slice(0, 1_000_000) : null,
      language: typeof b.language === "string" ? b.language.slice(0, 40) : null,
      position: b.position,
    }));

  const incomingIds = new Set(clean.map((b: { id: string }) => b.id));
  const existing = await prisma.notepadBlock.findMany({ where: { pageId: page.id }, select: { id: true } });
  const existingIdsForPage = new Set(existing.map((b) => b.id));
  const toDelete = existing.filter((b) => !incomingIds.has(b.id)).map((b) => b.id);

  // یه id که توی این صفحه قبلا نبوده ممکنه (در عمل تقریبا غیرممکن چون
  // idها سمت کلاینت با آنتروپی بالا ساخته می‌شن، ولی بازم چک می‌کنیم — طبق
  // قاعده‌ی IDOR-safe پروژه) قبلا متعلق به یه صفحه‌ی دیگه (حتی یه کاربر
  // دیگه) باشه؛ چنین idـی رو نباید upsert کنیم چون ممکنه رکورد اون صفحه رو
  // بازنویسی کنه — به‌جاش می‌ذاریم دیتابیس خودش id تازه بسازه
  const newIds = clean.map((b: { id: string }) => b.id).filter((id: string) => !existingIdsForPage.has(id));
  let foreignIds = new Set<string>();
  if (newIds.length) {
    const collisions = await prisma.notepadBlock.findMany({ where: { id: { in: newIds } }, select: { id: true } });
    foreignIds = new Set(collisions.map((c) => c.id));
  }

  // توجه: دو درخواست اتوسیو هم‌پوشان (مثلا debounce کلاینت با تایپ سریع
  // پشت‌سرهم چندبار پشت‌هم فایر بشه) می‌تونن هم‌زمان به این روت برسن؛ اگه
  // اینجا create/update رو جدا شرط‌بندی کنیم، هر دو درخواست ممکنه همزمان
  // ببینن یه id هنوز وجود نداره و هر دو create بزنن → خطای unique constraint.
  // upsert این race رو در سطح دیتابیس اتمیک حل می‌کنه (ON CONFLICT). فقط
  // مورد نادر collision id با صفحه‌ی یه کاربر دیگه از این قاعده مستثناست —
  // اونجا عمدا upsert نمی‌کنیم چون ممکنه رکورد غریبه رو بازنویسی کنه.
  const ops = clean.map((b: typeof clean[number]) => {
    const { id, ...rest } = b;
    if (!existingIdsForPage.has(id) && foreignIds.has(id)) {
      return prisma.notepadBlock.create({ data: { ...rest, pageId: page.id } });
    }
    return prisma.notepadBlock.upsert({
      where: { id },
      create: { id, ...rest, pageId: page.id },
      update: rest,
    });
  });

  await prisma.$transaction([
    ...(toDelete.length ? [prisma.notepadBlock.deleteMany({ where: { id: { in: toDelete }, pageId: page.id } })] : []),
    ...ops,
    prisma.notepadPage.update({ where: { id: page.id }, data: { updatedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
