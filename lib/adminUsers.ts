import { ModuleKey } from "@prisma/client";
import { tr } from "@/lib/i18n";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminContext } from "@/lib/requireAdmin";
import { AdminPermission, sanitizePermissions } from "@/lib/adminPermissions";
import { invalidateAdminAnalyticsCache, writeAuditLog } from "@/lib/adminAnalytics";
import { revokeOtherDeviceSessions } from "@/lib/deviceSessions";
import { invalidateAdminFlagCache } from "@/lib/adminFlag";
import { notifyUser } from "@/lib/inAppNotify";
import { MAX_NOTE_LEN, normalizeTag } from "@/lib/adminUsersView";

// عملیات نوشتنی پنل ادمین روی کاربران. همه‌ی قوانین «کی روی کی» این‌جا
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
  if (!target) throw new AdminActionError(tr("کاربر پیدا نشد", "User not found"), 404);
  if (opts.destructive && target.id === ctx.userId) throw new AdminActionError(tr("این اقدام روی حساب خودت مجاز نیست", "This action isn't allowed on your own account"));
  if (target.id !== ctx.userId && !ctx.isSuperAdmin) {
    if (target.isSuperAdmin) throw new AdminActionError(tr("روی حساب Owner اقدامی نمی‌تونی بکنی", "You can't take action on the Owner account"), 403);
    if (target.adminPermissions.length > 0 && !ctx.permissions.includes("admins.manage")) {
      throw new AdminActionError(tr("برای اقدام روی یک ادمین دیگه، دسترسی «مدیریت ادمین‌ها» لازمه", "Acting on another admin requires the «Manage admins» permission"), 403);
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
    if (raw !== null && typeof raw !== "string") throw new AdminActionError(tr("ورودی نامعتبر است", "Invalid input"));
    let v = typeof raw === "string" ? raw.trim().slice(0, f === "bio" ? 300 : 120) : null;
    if (v === "") v = null;
    if (v && f === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new AdminActionError(tr("ایمیل نامعتبر است", "Invalid email"));
    if (v && f === "email") v = v.toLowerCase();
    if (v && f === "username" && !/^[a-zA-Z0-9_.]{3,30}$/.test(v)) throw new AdminActionError(tr("یوزرنیم نامعتبر است", "Invalid username"));
    if (v && f === "phone" && !/^\+?[0-9]{8,15}$/.test(v)) throw new AdminActionError(tr("شماره نامعتبر است", "Invalid phone number"));
    data[f] = v;
  }
  if (Object.keys(data).length === 0) throw new AdminActionError(tr("تغییری فرستاده نشد", "No changes were submitted"));
  try {
    const user = await prisma.user.update({ where: { id: targetId }, data, select: { id: true, name: true, lastName: true, email: true, phone: true, username: true, bio: true } });
    // مقدار قبلی/بعدی ایمیل/شماره عمدا لاگ نمی‌شه — فقط اسم فیلدها
    await writeAuditLog(ctx.userId, "user.profile_update", "User", targetId, { fields: Object.keys(data) });
    done();
    return user;
  } catch (e: any) {
    if (e?.code === "P2002") throw new AdminActionError(tr("این ایمیل/شماره/یوزرنیم قبلا برای حساب دیگه‌ای ثبت شده", "This email, phone or username is already used by another account"));
    throw e;
  }
}

// ---------------------------------------------------------------- مسدودسازی / نشست‌ها

export async function setBlocked(ctx: AdminContext, targetId: string, blocked: boolean) {
  const target = await loadTarget(ctx, targetId, { destructive: blocked });
  // حساب حذف‌شده فقط با «بازگردانی» برمی‌گرده، نه رفع مسدودی (وگرنه با deletedAt ست‌شده دوباره لاگین می‌شد)
  if (!blocked && target.deletedAt) throw new AdminActionError(tr("این حساب حذف شده؛ برای برگردوندنش از «بازگردانی» استفاده کن", "This account is deleted; use «Restore» to bring it back"));
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
    if (exp && isNaN(exp.getTime())) throw new AdminActionError(tr("تاریخ انقضا نامعتبر است", "Invalid expiry date"));
    return { module: i.module as ModuleKey, active: !!i.active, expiresAt: exp };
  });
  if (clean.length === 0) throw new AdminActionError(tr("ماژولی فرستاده نشد", "No modules were submitted"));
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

// ---------------------------------------------------------------- پیام، برچسب، یادداشت، تمدید
// همه از loadTarget رد می‌شن (قوانین کی روی کی) و در AuditLog ثبت می‌شن. متن
// پیام/یادداشت هیچ‌وقت داخل AuditLog نمی‌ره.

export async function sendUserMessage(ctx: AdminContext, targetId: string, input: { title: unknown; body: unknown; url?: unknown }) {
  const target = await loadTarget(ctx, targetId);
  if (target.deletedAt) throw new AdminActionError(tr("این حساب حذف شده است", "This account has been deleted"));
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 500) : "";
  if (!title || !body) throw new AdminActionError(tr("عنوان و متن پیام لازمه", "A title and message are required"));
  let url: string | undefined;
  if (typeof input.url === "string" && input.url.trim()) {
    url = input.url.trim();
    if (!/^\/(?!\/)[^\s]*$/.test(url)) throw new AdminActionError(tr("لینک باید یک مسیر داخلی (/...) باشه", "The link must be an internal path (/...)"));
  }
  await notifyUser(targetId, { type: "admin.message", title, body, url });
  await writeAuditLog(ctx.userId, "user.message", "User", targetId, { titleLength: title.length });
}

export async function addUserTag(ctx: AdminContext, targetId: string, rawTag: unknown) {
  await loadTarget(ctx, targetId);
  const tag = normalizeTag(typeof rawTag === "string" ? rawTag : "");
  if (!tag) throw new AdminActionError(tr("برچسب نامعتبر است", "Invalid tag"));
  await prisma.userTag.upsert({ where: { userId_tag: { userId: targetId, tag } }, create: { userId: targetId, tag }, update: {} });
  await writeAuditLog(ctx.userId, "user.tag_add", "User", targetId, { tag });
  return tag;
}

export async function removeUserTag(ctx: AdminContext, targetId: string, rawTag: unknown) {
  await loadTarget(ctx, targetId);
  const tag = normalizeTag(typeof rawTag === "string" ? rawTag : "");
  if (!tag) throw new AdminActionError(tr("برچسب نامعتبر است", "Invalid tag"));
  await prisma.userTag.deleteMany({ where: { userId: targetId, tag } });
  await writeAuditLog(ctx.userId, "user.tag_remove", "User", targetId, { tag });
}

export async function addUserNote(ctx: AdminContext, targetId: string, rawBody: unknown) {
  await loadTarget(ctx, targetId);
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body) throw new AdminActionError(tr("متن یادداشت خالیه", "The note is empty"));
  if (body.length > MAX_NOTE_LEN) throw new AdminActionError(tr(`یادداشت حداکثر ${MAX_NOTE_LEN} حرف`, `Note can be at most ${MAX_NOTE_LEN} characters`));
  const note = await prisma.adminUserNote.create({
    data: { userId: targetId, authorId: ctx.userId, body },
    select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, lastName: true, username: true } } },
  });
  await writeAuditLog(ctx.userId, "user.note_add", "User", targetId, { noteId: note.id });
  return note;
}

// حذف: نویسنده‌ی یادداشت یا Owner
export async function deleteUserNote(ctx: AdminContext, targetId: string, noteId: string) {
  await loadTarget(ctx, targetId);
  const note = await prisma.adminUserNote.findFirst({ where: { id: noteId, userId: targetId }, select: { id: true, authorId: true } });
  if (!note) throw new AdminActionError(tr("یادداشت پیدا نشد", "Note not found"), 404);
  if (note.authorId !== ctx.userId && !ctx.isSuperAdmin) throw new AdminActionError(tr("فقط نویسنده یا Owner می‌تونه یادداشت رو حذف کنه", "Only the author or the Owner can delete this note"), 403);
  await prisma.adminUserNote.delete({ where: { id: note.id } });
  await writeAuditLog(ctx.userId, "user.note_delete", "User", targetId, { noteId });
}

function cleanDays(days: unknown): number {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1 || n > 3650) throw new AdminActionError(tr("تعداد روز باید بین 1 و 3650 باشه", "The number of days must be between 1 and 3650"));
  return n;
}

// اعطا/تمدید ماژول: از دیرترین بین «الان» و انقضای فعلی (اگه فعاله) N روز جلوتر
export async function grantModuleDays(ctx: AdminContext, targetId: string, modules: unknown, daysRaw: unknown) {
  await loadTarget(ctx, targetId);
  const days = cleanDays(daysRaw);
  const valid = Object.values(ModuleKey) as string[];
  const list = Array.isArray(modules) ? Array.from(new Set(modules.filter((m): m is string => typeof m === "string" && valid.includes(m)))) : [];
  if (!list.length) throw new AdminActionError(tr("ماژولی انتخاب نشده", "No module selected"));
  const now = new Date();
  const existing = await prisma.moduleAccess.findMany({ where: { userId: targetId, module: { in: list as ModuleKey[] } }, select: { module: true, active: true, expiresAt: true } });
  const cur = new Map(existing.map((e) => [e.module as string, e]));
  await prisma.$transaction(list.map((m) => {
    const e = cur.get(m);
    const from = e?.active && e.expiresAt && e.expiresAt > now ? e.expiresAt : now;
    const expiresAt = new Date(from.getTime() + days * 86400000);
    return prisma.moduleAccess.upsert({
      where: { userId_module: { userId: targetId, module: m as ModuleKey } },
      create: { userId: targetId, module: m as ModuleKey, active: true, expiresAt },
      update: { active: true, expiresAt },
    });
  }));
  await writeAuditLog(ctx.userId, "user.module_grant", "User", targetId, { modules: list, days });
  done();
}

// تمدید دستی اشتراک: پایان دوره‌ی آخرین اشتراک فعال/آزمایشی N روز جلوتر
export async function extendSubscriptionDays(ctx: AdminContext, targetId: string, daysRaw: unknown) {
  await loadTarget(ctx, targetId);
  const days = cleanDays(daysRaw);
  const sub = await prisma.subscription.findFirst({ where: { userId: targetId, status: { in: ["ACTIVE", "TRIAL"] } }, orderBy: { createdAt: "desc" }, select: { id: true, currentPeriodEnd: true } });
  if (!sub) throw new AdminActionError(tr("این کاربر اشتراک فعالی نداره؛ از «اعطای ماژول» استفاده کن", "This user has no active subscription; use «Grant module» instead"));
  const now = new Date();
  const from = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  const end = new Date(from.getTime() + days * 86400000);
  await prisma.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: end } });
  await writeAuditLog(ctx.userId, "user.subscription_extend", "User", targetId, { subscriptionId: sub.id, days, newEnd: end.toISOString() });
  done();
  return end;
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
  if (target.isSuperAdmin && !ctx.isSuperAdmin) throw new AdminActionError(tr("حذف Owner مجاز نیست", "Deleting the Owner isn't allowed"), 403);
  const snapshot = await prisma.user.findUnique({ where: { id: targetId }, select: { username: true, createdAt: true } });
  try {
    await prisma.$transaction([
      prisma.referralUsage.deleteMany({ where: { inviteeUserId: targetId } }),
      prisma.session.deleteMany({ where: { userId: targetId } }),
      prisma.user.delete({ where: { id: targetId } }),
    ]);
  } catch (e: any) {
    if (e?.code === "P2003") throw new AdminActionError(tr("به‌خاطر داده‌های وابسته، حذف دائمی ممکن نیست — از حذف موقت استفاده کن", "Permanent deletion isn't possible because of linked data; use a temporary delete instead"), 409);
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
  if (!ctx.isSuperAdmin && !ctx.permissions.includes("admins.manage")) throw new AdminActionError(tr("به مدیریت ادمین‌ها دسترسی نداری", "You don't have access to manage admins"), 403);
  const target = await loadTarget(ctx, targetId);
  if (target.deletedAt) throw new AdminActionError(tr("این حساب حذف شده است", "This account has been deleted"));

  const wantSuper = typeof input.superAdmin === "boolean" ? input.superAdmin : target.isSuperAdmin;
  let perms: AdminPermission[] = input.permissions === undefined ? sanitizePermissions(target.adminPermissions) : sanitizePermissions(input.permissions);

  if (wantSuper !== target.isSuperAdmin) {
    if (!ctx.isSuperAdmin) throw new AdminActionError(tr("فقط Owner می‌تونه نقش Owner بده یا بگیره", "Only the Owner can grant or remove the Owner role"), 403);
    if (target.id === ctx.userId && !wantSuper) throw new AdminActionError(tr("نمی‌تونی نقش Owner رو از خودت بگیری", "You can't remove the Owner role from yourself"));
  }
  if (target.id === ctx.userId && !ctx.isSuperAdmin) throw new AdminActionError(tr("دسترسی‌های خودت رو نمی‌تونی تغییر بدی", "You can't change your own permissions"));

  if (!ctx.isSuperAdmin) {
    // ادمین محدود: دسترسی‌هایی که خودش نداره نه اضافه می‌کنه نه حذف
    const own = new Set<string>(ctx.permissions);
    const current = sanitizePermissions(target.adminPermissions);
    const outside = current.filter((p) => !own.has(p));
    const requested = perms.filter((p) => own.has(p));
    if (perms.some((p) => !own.has(p) && !current.includes(p))) throw new AdminActionError(tr("فقط دسترسی‌هایی رو می‌تونی بدی که خودت داری", "You can only grant permissions you have yourself"), 403);
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
  return NextResponse.json({ error: tr("خطای سرور", "Server error") }, { status: 500 });
}
