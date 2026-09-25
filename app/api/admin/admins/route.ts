import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, findUserByIdentifier, setAdminRole } from "@/lib/adminUsers";

// GET — لیست Owner‌ها و ادمین‌ها + دسترسی‌های خود درخواست‌کننده
// GET ?lookup=<id|username|email|phone> — پیش‌نمایش کاربر قبل از ادمین‌کردن
export async function GET(req: NextRequest) {
  const guard = await requireAdmin("admins.manage");
  if (!guard.ok) return guard.response;

  const lookup = req.nextUrl.searchParams.get("lookup");
  if (lookup !== null) {
    const user = await findUserByIdentifier(lookup);
    if (!user || user.deletedAt) return NextResponse.json({ error: "کاربری با این شناسه پیدا نشد" }, { status: 404 });
    return NextResponse.json({ user });
  }

  const admins = await prisma.user.findMany({
    where: { deletedAt: null, OR: [{ isSuperAdmin: true }, { NOT: { adminPermissions: { isEmpty: true } } }] },
    orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, lastName: true, username: true, email: true, phone: true, avatarUrl: true, isSuperAdmin: true, adminPermissions: true, isBlocked: true, createdAt: true },
  });
  return NextResponse.json({ admins, me: { id: guard.userId, isSuperAdmin: guard.isSuperAdmin, permissions: guard.permissions } });
}

// POST { identifier, permissions, superAdmin? } — ادمین‌کردن با آیدی/یوزرنیم/ایمیل/شماره
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("admins.manage");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const user = identifier ? await findUserByIdentifier(identifier) : null;
  if (!user || user.deletedAt) return NextResponse.json({ error: "کاربری با این شناسه پیدا نشد" }, { status: 404 });
  if (!body?.superAdmin && (!Array.isArray(body?.permissions) || body.permissions.length === 0)) {
    return NextResponse.json({ error: "حداقل یک دسترسی انتخاب کن" }, { status: 400 });
  }
  try {
    const updated = await setAdminRole(guard, user.id, { permissions: body.permissions, superAdmin: body.superAdmin });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
