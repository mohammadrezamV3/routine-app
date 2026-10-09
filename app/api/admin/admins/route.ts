import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, findUserByIdentifier, setAdminRole } from "@/lib/adminUsers";
import { sanitizePermissions } from "@/lib/adminPermissions";
import { tr } from "@/lib/i18n";

// GET — لیست Owner‌ها و ادمین‌ها + دسترسی‌های خود درخواست‌کننده
// GET ?lookup=<id|username|email|phone> — پیش‌نمایش کاربر قبل از ادمین‌کردن
export async function GET(req: NextRequest) {
  const guard = await requireAdmin("admins.manage");
  if (!guard.ok) return guard.response;

  const lookup = req.nextUrl.searchParams.get("lookup");
  if (lookup !== null) {
    const user = await findUserByIdentifier(lookup);
    if (!user || user.deletedAt) return NextResponse.json({ error: tr("کاربری با این شناسه پیدا نشد", "No user found with this ID") }, { status: 404 });
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
  if (!user || user.deletedAt) return NextResponse.json({ error: tr("کاربری با این شناسه پیدا نشد", "No user found with this ID") }, { status: 404 });
  // کلیدهای نامعتبر قبل از چک «خالی‌نبودن» حذف می‌شن — وگرنه ["x"] رد می‌شد
  // و یه «admin.grant» با دسترسی خالی ثبت می‌شد
  const permissions = sanitizePermissions(body?.permissions);
  const superAdmin = typeof body?.superAdmin === "boolean" ? body.superAdmin : undefined;
  if (superAdmin !== true && permissions.length === 0) {
    return NextResponse.json({ error: tr("حداقل یک دسترسی انتخاب کن", "Select at least one permission") }, { status: 400 });
  }
  try {
    const updated = await setAdminRole(guard, user.id, { permissions, superAdmin });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    return adminErrorResponse(e);
  }
}
