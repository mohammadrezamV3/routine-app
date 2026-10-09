import { pick, type Localized } from "@/lib/i18n";

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

type PermMeta = { readonly label: string; readonly hint: string; readonly group: string };

// group کلید ثابت (فارسی) می‌مونه؛ برای نمایش permissionGroupLabel رو بخون.
function permMeta(label: Localized, hint: Localized, group: string): PermMeta {
  return {
    get label() { return pick(label); },
    get hint() { return pick(hint); },
    group,
  };
}

export function permissionGroupLabel(group: string): string {
  return pick(GROUP_LABELS[group] ?? { fa: group, en: group });
}

const GROUP_LABELS: Record<string, Localized> = {
  "کاربران": { fa: "کاربران", en: "Users" },
  "مالی": { fa: "مالی", en: "Finance" },
  "پشتیبانی و محتوا": { fa: "پشتیبانی و محتوا", en: "Support and content" },
  "تحلیل و سیستم": { fa: "تحلیل و سیستم", en: "Analytics and system" },
};

export const PERMISSION_META: Record<AdminPermission, PermMeta> = {
  "users.view": permMeta({ fa: "مشاهده کاربران", en: "View users" }, { fa: "لیست و جزئیات کاربران", en: "Users list and details" }, "کاربران"),
  "users.edit": permMeta({ fa: "ویرایش کاربران", en: "Edit users" }, { fa: "ویرایش پروفایل، مسدودسازی، تعدیل چت", en: "Edit profile, block, chat moderation" }, "کاربران"),
  "users.access": permMeta({ fa: "تعیین دسترسی ماژول‌ها", en: "Set module access" }, { fa: "فعال/غیرفعال‌کردن ماژول‌ها و تاریخ انقضا", en: "Turn modules on/off and set expiry" }, "کاربران"),
  "users.delete": permMeta({ fa: "حذف کاربران", en: "Delete users" }, { fa: "حذف موقت و حذف دائمی حساب", en: "Soft and permanent account deletion" }, "کاربران"),
  "admins.manage": permMeta({ fa: "مدیریت ادمین‌ها", en: "Manage admins" }, { fa: "دادن/گرفتن نقش ادمین (فقط در حد دسترسی خودش)", en: "Grant/revoke admin role (within own access only)" }, "کاربران"),
  "subscriptions": permMeta({ fa: "اشتراک‌ها", en: "Subscriptions" }, { fa: "مشاهده اشتراک‌ها و تمدیدها", en: "View subscriptions and renewals" }, "مالی"),
  "finance": permMeta({ fa: "درآمد و تراکنش‌ها", en: "Revenue and transactions" }, { fa: "گزارش درآمد و پرداخت‌ها", en: "Revenue and payment reports" }, "مالی"),
  "discounts": permMeta({ fa: "کدهای تخفیف", en: "Discount codes" }, { fa: "ساخت/ویرایش/حذف کد تخفیف", en: "Create/edit/delete discount codes" }, "مالی"),
  "pricing": permMeta({ fa: "قیمت پلن‌ها", en: "Plan prices" }, { fa: "تغییر قیمت، مدت‌ها و تخفیف پلن‌های اشتراک", en: "Change plan prices, durations and discounts" }, "مالی"),
  "support": permMeta({ fa: "پشتیبانی", en: "Support" }, { fa: "پاسخ به تیکت‌ها", en: "Reply to tickets" }, "پشتیبانی و محتوا"),
  "chat": permMeta({ fa: "گزارش‌های چت", en: "Chat reports" }, { fa: "بررسی گزارش‌ها و حذف پیام", en: "Review reports and delete messages" }, "پشتیبانی و محتوا"),
  "mentors": permMeta({ fa: "مربی‌ها", en: "Mentors" }, { fa: "احراز هویت و مدارک مربی‌ها، نظرات و گزارش‌ها", en: "Mentor identity and documents, reviews and reports" }, "پشتیبانی و محتوا"),
  "content": permMeta({ fa: "محتوا", en: "Content" }, { fa: "اطلاعیه‌ها، تقویم اقتصادی و عکس حرکات ورزشی", en: "Announcements, economic calendar and exercise media" }, "پشتیبانی و محتوا"),
  "ai_usage": permMeta({ fa: "مصرف AI", en: "AI usage" }, { fa: "هزینه و مصرف توکن", en: "Cost and token usage" }, "تحلیل و سیستم"),
  "analytics": permMeta({ fa: "تحلیل‌ها", en: "Analytics" }, { fa: "Retention، Funnel، Churn، Cohort و محصولات", en: "Retention, funnel, churn, cohort and products" }, "تحلیل و سیستم"),
  "system": permMeta({ fa: "سیستم", en: "System" }, { fa: "وضعیت سرور، خطاها و ابزارهای تست", en: "Server status, errors and test tools" }, "تحلیل و سیستم"),
  "settings": permMeta({ fa: "تنظیمات", en: "Settings" }, { fa: "تنظیمات سراسری اپ و روشن/خاموش‌کردن قابلیت‌ها", en: "Global app settings and feature toggles" }, "تحلیل و سیستم"),
  "audit": permMeta({ fa: "لاگ فعالیت ادمین‌ها", en: "Admin activity log" }, { fa: "مشاهده تاریخچه اقدامات پنل", en: "View admin action history" }, "تحلیل و سیستم"),
};

export const PERMISSION_GROUPS: string[] = Array.from(new Set(ADMIN_PERMISSIONS.map((p) => PERMISSION_META[p].group)));

// نقش‌های آماده — فقط میان‌بر برای تیک‌زدن سریع؛ چیزی که ذخیره می‌شه همیشه
// خود لیست کلیدهاست، نه اسم نقش.
export const ROLE_PRESETS: { key: string; readonly label: string; permissions: AdminPermission[] }[] = [
  { key: "support", get label() { return pick({ fa: "پشتیبان", en: "Support" }); }, permissions: ["users.view", "support", "chat"] },
  { key: "moderator", get label() { return pick({ fa: "ناظر کاربران", en: "User moderator" }); }, permissions: ["users.view", "users.edit", "users.access", "chat", "support", "mentors"] },
  { key: "content", get label() { return pick({ fa: "مدیر محتوا", en: "Content manager" }); }, permissions: ["content", "analytics"] },
  { key: "finance", get label() { return pick({ fa: "مالی", en: "Finance" }); }, permissions: ["users.view", "subscriptions", "finance", "discounts"] },
  { key: "full", get label() { return pick({ fa: "ادمین کامل", en: "Full admin" }); }, permissions: [...ADMIN_PERMISSIONS] },
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
  ["/admin/pricing", "pricing"],
  ["/admin/support", "support"],
  ["/admin/chat-reports", "chat"],
  ["/admin/mentors", "mentors"],
  ["/admin/economic-calendar", "content"],
  ["/admin/announcements", "content"],
  ["/admin/broadcast", "content"],
  ["/admin/exercise-media", "content"],
  ["/admin/products", "analytics"],
  ["/admin/analytics", "analytics"],
  ["/admin/ai-usage", "ai_usage"],
  ["/admin/system", "system"],
  ["/admin/features", "settings"],
  ["/admin/event-themes", "settings"],
  ["/admin/team", "settings"],
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
