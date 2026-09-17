import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { clampText } from "@/lib/validate";
import { checkMediaDataUrl, mediaKey } from "@/lib/exerciseMedia";

// مدیریتِ دستیِ عکسِ حرکاتِ ورزشی (پنلِ ادمین).
//
// کاتالوگِ حرکات خودش کدِ ثابت است (`lib/exerciseCatalog.ts`) و این‌جا
// تغییری نمی‌کند؛ فقط عکسِ هر حرکت — که به‌مرور و دستی اضافه می‌شود —
// این‌جا می‌نشیند. کلید همیشه نامِ نرمال‌شده است تا «ي/ی» و نیم‌فاصله
// باعثِ دو ردیف برای یک حرکت نشود.

/** فهرست *بدونِ* dataUrl برمی‌گردد — چند صد عکسِ base64 در یک پاسخ یعنی چند ده مگابایت. */
export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const name = req.nextUrl.searchParams.get("name");
  if (name) {
    const row = await prisma.exerciseMedia.findUnique({ where: { nameKey: mediaKey(name) } });
    return NextResponse.json({ media: row ? { name: row.name, dataUrl: row.dataUrl } : null });
  }

  const rows = await prisma.exerciseMedia.findMany({
    orderBy: { updatedAt: "desc" },
    select: { nameKey: true, name: true, updatedAt: true },
  });
  return NextResponse.json({
    items: rows.map((r) => ({ nameKey: r.nameKey, name: r.name, updatedAt: r.updatedAt.toISOString() })),
  });
}

/** ثبت/جایگزینیِ عکسِ یک حرکت — upsert، چون «اضافه» و «عوض‌کردن» از نگاهِ ادمین یک کارند. */
export async function PUT(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const name = clampText(String((body as any)?.name || "").trim(), 160);
  if (!name) return NextResponse.json({ error: "نام حرکت الزامی است" }, { status: 400 });

  const dataUrl = (body as any)?.dataUrl;
  const check = checkMediaDataUrl(dataUrl);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const nameKey = mediaKey(name);
  const row = await prisma.exerciseMedia.upsert({
    where: { nameKey },
    update: { name, dataUrl },
    create: { nameKey, name, dataUrl },
    select: { nameKey: true, name: true, updatedAt: true },
  });
  return NextResponse.json({ ok: true, item: { ...row, updatedAt: row.updatedAt.toISOString() } });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "نام حرکت الزامی است" }, { status: 400 });

  await prisma.exerciseMedia.deleteMany({ where: { nameKey: mediaKey(name) } });
  return NextResponse.json({ ok: true });
}
