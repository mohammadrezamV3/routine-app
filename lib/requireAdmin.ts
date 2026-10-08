import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPermission, hasPermission, sanitizePermissions } from "@/lib/adminPermissions";

// گیت سمت سرور پنل ادمین. برخلاف requireSuperAdmin (که به فلگ داخل JWT
// تکیه می‌کنه)، این‌جا وضعیت ادمین *همیشه* از دیتابیس خونده می‌شه — تا
// گرفتن دسترسی از یک ادمین فوری اثر کنه، نه بعد از انقضای توکنش.
export type AdminContext = { userId: string; isSuperAdmin: boolean; permissions: AdminPermission[] };

export type AdminGuardResult = ({ ok: true } & AdminContext) | { ok: false; response: NextResponse };

export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, adminPermissions: true, isBlocked: true, deletedAt: true },
  });
  if (!user || user.isBlocked || user.deletedAt) return null;
  const permissions = sanitizePermissions(user.adminPermissions);
  if (!user.isSuperAdmin && permissions.length === 0) return null;
  return { userId, isSuperAdmin: user.isSuperAdmin, permissions };
}

export async function requireAdmin(perm?: AdminPermission): Promise<AdminGuardResult> {
  const ctx = await getAdminContext();
  if (!ctx) return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!hasPermission(ctx, perm)) {
    return { ok: false, response: NextResponse.json({ error: "به این بخش دسترسی نداری" }, { status: 403 }) };
  }
  return { ok: true, ...ctx };
}
