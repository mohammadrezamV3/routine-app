// کلیدهای دسترسی ادمین و توابع خالص سبکشون — جدا از lib/adminPermissions.ts
// (برچسب‌ها، نقش‌های آماده، نگاشت مسیر) تا کد کلاینتی که فقط تشخیص «ادمین
// هست یا نه» لازم داره (lib/nameStyle.ts → GoldenName در همه‌ی صفحه‌ها) جدول
// بزرگ برچسب‌های پنل ادمین رو توی باندلش نکشه. منبع واحد کلیدها همین‌جاست؛
// lib/adminPermissions.ts دوباره صادرشون می‌کنه.

export const ADMIN_PERMISSIONS = [
  "users.view",
  "users.edit",
  "users.access",
  "users.delete",
  "admins.manage",
  "subscriptions",
  "finance",
  "discounts",
  "pricing",
  "support",
  "chat",
  "content",
  "mentors",
  "ai_usage",
  "analytics",
  "system",
  "settings",
  "audit",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export function isAdminPermission(v: unknown): v is AdminPermission {
  return typeof v === "string" && (ADMIN_PERMISSIONS as readonly string[]).includes(v);
}

export function sanitizePermissions(v: unknown): AdminPermission[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter(isAdminPermission)));
}

export function hasPermission(ctx: { isSuperAdmin: boolean; permissions: readonly string[] }, perm?: AdminPermission): boolean {
  if (ctx.isSuperAdmin) return true;
  if (ctx.permissions.length === 0) return false;
  return !perm || ctx.permissions.includes(perm);
}
