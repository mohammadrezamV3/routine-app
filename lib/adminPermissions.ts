// دسترسی‌های پنل ادمین — منبع واحد، هم سمت سرور (lib/requireAdmin.ts) هم
// کلاینت (AdminShell برای فیلتر منو). هیچ import سروری این‌جا نیست تا توی
// باندل کلاینت هم امن باشه.
//
// قرارداد: isSuperAdmin (Owner) همیشه همه‌ی کلیدها رو داره. ادمین محدود
// فقط کلیدهای User.adminPermissions خودش رو. آرایه‌ی خالی = ادمین نیست.

export const ADMIN_PERMISSIONS = [
  "users.view",
  "users.edit",
  "users.access",
  "users.delete",
  "admins.manage",
  "subscriptions",
  "finance",
  "discounts",
  "support",
  "chat",
  "content",
  "ai_usage",
  "analytics",
  "system",
  "settings",
  "audit",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const PERMISSION_META: Record<AdminPermission, { label: string; hint: string; group: string }> = {
  "users.view": { label: "مشاهده کاربران", hint: "لیست و جزئیات کاربران", group: "کاربران" },
  "users.edit": { label: "ویرایش کاربران", hint: "ویرایش پروفایل، مسدودسازی، تعدیل چت", group: "کاربران" },
  "users.access": { label: "تعیین دسترسی ماژول‌ها", hint: "فعال/غیرفعال‌کردن ماژول‌ها و تاریخ انقضا", group: "کاربران" },
  "users.delete": { label: "حذف کاربران", hint: "حذف موقت و حذف دائمی حساب", group: "کاربران" },
  "admins.manage": { label: "مدیریت ادمین‌ها", hint: "دادن/گرفتن نقش ادمین (فقط در حد دسترسی خودش)", group: "کاربران" },
  subscriptions: { label: "اشتراک‌ها", hint: "مشاهده اشتراک‌ها و تمدیدها", group: "مالی" },
  finance: { label: "درآمد و تراکنش‌ها", hint: "گزارش درآمد و پرداخت‌ها", group: "مالی" },
  discounts: { label: "کدهای تخفیف", hint: "ساخت/ویرایش/حذف کد تخفیف", group: "مالی" },
  support: { label: "پشتیبانی", hint: "پاسخ به تیکت‌ها", group: "پشتیبانی و محتوا" },
  chat: { label: "گزارش‌های چت", hint: "بررسی گزارش‌ها و حذف پیام", group: "پشتیبانی و محتوا" },
  content: { label: "محتوا", hint: "تقویم اقتصادی و عکس حرکات ورزشی", group: "پشتیبانی و محتوا" },
  ai_usage: { label: "مصرف AI", hint: "هزینه و مصرف توکن", group: "تحلیل و سیستم" },
  analytics: { label: "تحلیل‌ها", hint: "Retention، Funnel، Churn، Cohort و محصولات", group: "تحلیل و سیستم" },
  system: { label: "سیستم", hint: "وضعیت سرور، خطاها و ابزارهای تست", group: "تحلیل و سیستم" },
  settings: { label: "تنظیمات", hint: "تنظیمات سراسری اپ و روشن/خاموش‌کردن قابلیت‌ها", group: "تحلیل و سیستم" },
  audit: { label: "لاگ فعالیت ادمین‌ها", hint: "مشاهده تاریخچه اقدامات پنل", group: "تحلیل و سیستم" },
};

export const PERMISSION_GROUPS: string[] = Array.from(new Set(ADMIN_PERMISSIONS.map((p) => PERMISSION_META[p].group)));

// نقش‌های آماده — فقط میان‌بر برای تیک‌زدن سریع؛ چیزی که ذخیره می‌شه همیشه
// خود لیست کلیدهاست، نه اسم نقش.
export const ROLE_PRESETS: { key: string; label: string; permissions: AdminPermission[] }[] = [
  { key: "support", label: "پشتیبان", permissions: ["users.view", "support", "chat"] },
  { key: "moderator", label: "ناظر کاربران", permissions: ["users.view", "users.edit", "users.access", "chat", "support"] },
  { key: "content", label: "مدیر محتوا", permissions: ["content", "analytics"] },
  { key: "finance", label: "مالی", permissions: ["users.view", "subscriptions", "finance", "discounts"] },
  { key: "full", label: "ادمین کامل", permissions: [...ADMIN_PERMISSIONS] },
];

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

// هر مسیر پنل به کدوم دسترسی نیاز داره — ترتیب مهمه (خاص‌تر اول).
// null = هر ادمینی (داشبورد).
const ROUTE_PERMISSIONS: [string, AdminPermission | null][] = [
  ["/admin/admins", "admins.manage"],
  ["/admin/users", "users.view"],
  ["/admin/subscriptions", "subscriptions"],
  ["/admin/revenue", "finance"],
  ["/admin/transactions", "finance"],
  ["/admin/discount-codes", "discounts"],
  ["/admin/support", "support"],
  ["/admin/chat-reports", "chat"],
  ["/admin/economic-calendar", "content"],
  ["/admin/exercise-media", "content"],
  ["/admin/products", "analytics"],
  ["/admin/analytics", "analytics"],
  ["/admin/ai-usage", "ai_usage"],
  ["/admin/system", "system"],
  ["/admin/features", "settings"],
  ["/admin/settings", "settings"],
  ["/admin/audit", "audit"],
];

export function permissionForPath(pathname: string): AdminPermission | null {
  const path = pathname.split("?")[0];
  for (const [prefix, perm] of ROUTE_PERMISSIONS) {
    if (path === prefix || path.startsWith(prefix + "/")) return perm;
  }
  return null;
}
