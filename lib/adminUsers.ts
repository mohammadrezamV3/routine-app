import { ModuleKey } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminContext } from "@/lib/requireAdmin";
import { AdminPermission, sanitizePermissions } from "@/lib/adminPermissions";
import { invalidateAdminAnalyticsCache, writeAuditLog } from "@/lib/adminAnalytics";
import { revokeOtherDeviceSessions } from "@/lib/deviceSessions";
import { invalidateAdminFlagCache } from "@/lib/adminFlag";

// عملیات نوشتنیِ پنل ادمین روی کاربران. همه‌ی قوانینِ «کی روی کی» این‌جا
// متمرکزه تا هیچ روتی یادش نره:
//  - هیچ‌کس روی حساب خودش اقدام مخرب (مسدود/حذف/گرفتن ادمینی) نمی‌کنه
//  - ادمین محدود هیچ اقدامی روی Owner (سوپرادمین) نمی‌تونه بکنه
//  - اقدام روی یک ادمین دیگه فقط با admins.manage
//  - ادمین محدود فقط دسترسی‌هایی رو می‌تونه بده که خودش داره؛ Owner‌سازی فقط با Owner

export type TargetUser = { id: string; isSuperAdmin: boolean; adminPermissions: string[]; deletedAt: Date | null; isBlocked: boolean };

export class AdminActionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function loadTarget(ctx: AdminContext, targetId: string, opts: { destructive?: boolean } = {}): Promise<TargetUser> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, isSuperAdmin: true, adminPermissions: true, deletedAt: true, isBlocked: true },
  });
  if (!target) throw new AdminActionError("کاربر پیدا نشد", 404);
  if (opts.destructive && target.id === ctx.userId) throw new AdminActionError("این اقدام روی حساب خودت مجاز نیست");
  if (target.id !== ctx.userId && !ctx.isSuperAdmin) {
    if (target.isSuperAdmin) throw new AdminActionError("روی حساب Owner اقدامی نمی‌تونی بکنی", 403);
    if (target.adminPermissions.length > 0 && !ctx.permissions.includes("admins.manage")) {
      throw new AdminActionError("برای اقدام روی یک ادمین دیگه، دسترسی «مدیریت ادمین‌ها» لازمه", 403);
    }
  }
  return target;
}

function done() {
  invalidateAdminAnalyticsCache();
}

// ---------------------------------------------------------------- پروفایل

const PROFILE_FIELDS = ["name", "lastName", "email", "phone", "username", "bio"] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

export async function updateProfile(ctx: AdminContext, targetId: string, input: Record<string, unknown>) {
  await loadTarget(ctx, targetId);
  const data: Partial<Record<ProfileField, string | null>> = {};
  for (const f of PROFILE_FIELDS) {
    if (!(f in input)) continue;
    const raw = input[f];
    if (raw !== null && typeof raw !== "string") throw new AdminActionError("ورودی نامعتبر است");
    let v = typeof raw === "string" ? raw.trim().slice(0, f === "bio" ? 300 : 120) : null;
    if (v === "") v = null;
    if (v && f === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new AdminActionError("ایمیل نامعتبر است");
    if (v && f === "email") v = v.toLowerCase();
    if (v && f === "username" && !/^[a-zA-Z0-9_.]{3,30}$/.test(v)) throw new AdminActionError("یوزرنیم نامعتبر است");
    if (v && f === "phone" && !/^\+?[0-9]{8,15}$/.test(v)) throw new AdminActionError("شماره نامعتبر است");
    data[f] = v;
  }
  if (Object.keys(data).length === 0) throw new AdminActionError("تغییری فرستاده نشد");
  try {
    const user = await prisma.user.update({ where: { id: targetId }, data, select: { id: true, name: true, lastName: true, email: true, phone: true, username: true, bio: true } });
    // مقدار قبلی/بعدی ایمیل/شماره عمدا لاگ نمی‌شه — فقط اسم فیلدها
    await writeAuditLog(ctx.userId, "user.profile_update", "User", targetId, { fields: Object.keys(data) });
    done();
    return user;
  } catch (e: any) {
    if (e?.code === "P2002") throw new AdminActionError("این ایمیل/شماره/یوزرنیم قبلا برای حساب دیگه‌ای ثبت شده");
    throw e;
  }
}

// ---------------------------------------------------------------- مسدودسازی / نشست‌ها

export async function setBlocked(ctx: AdminContext, targetId: string, blocked: boolean) {
  const target = await loadTarget(ctx, targetId, { destructive: blocked });
  // حساب حذف‌شده فقط با «بازگردانی» برمی‌گرده، نه رفع مسدودی (وگرنه با deletedAt ست‌شده دوباره لاگین می‌شد)
  if (!blocked && target.deletedAt) throw new AdminActionError("این حساب حذف شده؛ برای برگردوندنش از «بازگردانی» استفاده کن");
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { isBlocked: blocked, blockedAt: blocked ? new Date() : null },
    select: { id: true, isBlocked: true },
  });
  if (blocked) await revokeOtherDeviceSessions(targetId, "").catch(() => 0);
  await writeAuditLog(ctx.userId, blocked ? "user.block" : "user.unblock", "User", targetId);
  invalidateAdminFlagCache(targetId);
  done();
  return user;
}

export async function revokeSessions(ctx: AdminContext, targetId: string) {
  await loadTarget(ctx, targetId, { destructive: true });
  const count = await revokeOtherDeviceSessions(targetId, "");
  await writeAuditLog(ctx.userId, "user.sessions_revoke", "User", targetId, { count });
  return count;
}

// ---------------------------------------------------------------- دسترسی ماژول‌ها

export async function setModuleAccess(
  ctx: AdminContext, targetId: string,
  items: { module: string; active: boolean; expiresAt: string | null }[],
) {
  await loadTarget(ctx, targetId);
  const valid = Object.values(ModuleKey) as string[];
  const clean = items.filter((i) => valid.includes(i.module)).map((i) => {
    const exp = i.expiresAt ? new Date(i.expiresAt) : null;
    if (exp && isNaN(exp.getTime())) throw new AdminActionError("تاریخ انقضا نامعتبر است");
    return { module: i.module as ModuleKey, active: !!i.active, expiresAt: exp };
  });
  if (clean.length === 0) throw new AdminActionError("ماژولی فرستاده نشد");
  await prisma.$transaction(
    clean.map((c) =>
      prisma.moduleAccess.upsert({
        where: { userId_module: { userId: targetId, module: c.module } },
        create: { userId: targetId, module: c.module, active: c.active, expiresAt: c.expiresAt },
        update: { active: c.active, expiresAt: c.expiresAt },
      }),
    ),
  );
  await writeAuditLog(ctx.userId, "user.module_access", "User", targetId, {
    modules: clean.map((c) => ({ module: c.module, active: c.active, expiresAt: c.expiresAt?.toISOString() || null })),
  });
  done();
  return prisma.moduleAccess.findMany({ where: { userId: targetId }, select: { module: true, active: true, expiresAt: true } });
}

// ---------------------------------------------------------------- حذف

// حذف موقت: deletedAt + مسدود + ابطال نشست‌ها. داده‌ها (مالی/رفرال) می‌مونن
// و قابل برگشته.
export async function softDelete(ctx: AdminContext, targetId: string) {
  await loadTarget(ctx, targetId, { destructive: true });
  await prisma.user.update({ where: { id: targetId }, data: { deletedAt: new Date(), isBlocked: true, blockedAt: new Date() } });
  await revokeOtherDeviceSessions(targetId, "").catch(() => 0);
  await writeAuditLog(ctx.userId, "user.soft_delete", "User", targetId);
  invalidateAdminFlagCache(targetId);
  done();
}

export async function restoreUser(ctx: AdminContext, targetId: string) {
  await loadTarget(ctx, targetId);
  await prisma.user.update({ where: { id: targetId }, data: { deletedAt: null, isBlocked: false, blockedAt: null } });
  await writeAuditLog(ctx.userId, "user.restore", "User", targetId);
  invalidateAdminFlagCache(targetId);
  done();
}

// حذف دائمی: ردیف کاربر و هرچی با Cascade بهش وصله پاک می‌شه. تنها رابطه‌ی
// بدون Cascade (ReferralUsage به‌عنوان دعوت‌شده) قبلش دستی پاک می‌شه.
export async function hardDelete(ctx: AdminContext, targetId: string) {
  const target = await loadTarget(ctx, targetId, { destructive: true });
  if (target.isSuperAdmin && !ctx.isSuperAdmin) throw new AdminActionError("حذف Owner مجاز نیست", 403);
  const snapshot = await prisma.user.findUnique({ where: { id: targetId }, select: { username: true, createdAt: true } });
  try {
    await prisma.$transaction([
      prisma.referralUsage.deleteMany({ where: { inviteeUserId: targetId } }),
      prisma.session.deleteMany({ where: { userId: targetId } }),
      prisma.user.delete({ where: { id: targetId } }),
    ]);
  } catch (e: any) {
    if (e?.code === "P2003") throw new AdminActionError("به‌خاطر داده‌های وابسته، حذف دائمی ممکن نیست — از حذف موقت استفاده کن", 409);
    throw e;
  }
  await writeAuditLog(ctx.userId, "user.hard_delete", "User", targetId, { username: snapshot?.username || null, createdAt: snapshot?.createdAt?.toISOString() });
  invalidateAdminFlagCache(targetId);
  done();
}

// ---------------------------------------------------------------- نقش ادمین

export async function findUserByIdentifier(identifier: string) {
  const q = identifier.trim().replace(/^@/, "");
  if (!q) return null;
  return prisma.user.findFirst({
    where: { OR: [{ id: q }, { username: { equals: q, mode: "insensitive" } }, { email: q.toLowerCase() }, { phone: q }] },
    select: { id: true, name: true, lastName: true, username: true, email: true, phone: true, avatarUrl: true, isSuperAdmin: true, adminPermissions: true, deletedAt: true, isBlocked: true },
  });
}

export async function setAdminRole(
  ctx: AdminContext, targetId: string,
  input: { permissions?: unknown; superAdmin?: unknown },
) {
  if (!ctx.isSuperAdmin && !ctx.permissions.includes("admins.manage")) throw new AdminActionError("به مدیریت ادمین‌ها دسترسی نداری", 403);
  const target = await loadTarget(ctx, targetId);
  if (target.deletedAt) throw new AdminActionError("این حساب حذف شده است");

  const wantSuper = typeof input.superAdmin === "boolean" ? input.superAdmin : target.isSuperAdmin;
  let perms: AdminPermission[] = input.permissions === undefined ? sanitizePermissions(target.adminPermissions) : sanitizePermissions(input.permissions);

  if (wantSuper !== target.isSuperAdmin) {
    if (!ctx.isSuperAdmin) throw new AdminActionError("فقط Owner می‌تونه نقش Owner بده یا بگیره", 403);
    if (target.id === ctx.userId && !wantSuper) throw new AdminActionError("نمی‌تونی نقش Owner رو از خودت بگیری");
  }
  if (target.id === ctx.userId && !ctx.isSuperAdmin) throw new AdminActionError("دسترسی‌های خودت رو نمی‌تونی تغییر بدی");

  if (!ctx.isSuperAdmin) {
    // ادمین محدود: دسترسی‌هایی که خودش نداره نه اضافه می‌کنه نه حذف
    const own = new Set<string>(ctx.permissions);
    const current = sanitizePermissions(target.adminPermissions);
    const outside = current.filter((p) => !own.has(p));
    const requested = perms.filter((p) => own.has(p));
    if (perms.some((p) => !own.has(p) && !current.includes(p))) throw new AdminActionError("فقط دسترسی‌هایی رو می‌تونی بدی که خودت داری", 403);
    perms = Array.from(new Set([...outside, ...requested]));
  }

  const before = { superAdmin: target.isSuperAdmin, permissions: target.adminPermissions };
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { isSuperAdmin: wantSuper, adminPermissions: perms },
    select: { id: true, isSuperAdmin: true, adminPermissions: true },
  });
  const action = !before.superAdmin && before.permissions.length === 0 ? "admin.grant"
    : !wantSuper && perms.length === 0 ? "admin.revoke" : "admin.update";
  await writeAuditLog(ctx.userId, action, "User", targetId, { before, after: { superAdmin: wantSuper, permissions: perms } });
  invalidateAdminFlagCache(targetId);
  done();
  return user;
}

// خطای AdminActionError → پاسخ JSON با همون status؛ بقیه‌ی خطاها ۵۰۰ عمومی
export function adminErrorResponse(e: unknown) {
  if (e instanceof AdminActionError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[admin]", e);
  return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
}
