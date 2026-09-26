// لیبل فارسی اکشن‌های AuditLog — مشترک بین صفحه‌ی لاگ و تاریخچه‌ی کاربر
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.block": "مسدودکردن کاربر",
  "user.unblock": "رفع مسدودی",
  "user.profile_update": "ویرایش پروفایل",
  "user.module_access": "تغییر دسترسی ماژول‌ها",
  "user.soft_delete": "حذف حساب",
  "user.hard_delete": "حذف دائمی حساب",
  "user.restore": "بازگردانی حساب",
  "user.sessions_revoke": "خروج اجباری از دستگاه‌ها",
  "user.export": "خروجی CSV کاربران",
  "admin.grant": "ادمین‌کردن",
  "admin.update": "تغییر دسترسی ادمین",
  "admin.revoke": "گرفتن نقش ادمین",
  "setting.ai_cost_rate": "تغییر نرخ هزینه AI",
  "setting.feature_flags": "روشن/خاموش‌کردن قابلیت‌ها",
  "chat.warning": "اخطار چت",
  "chat.ban_72h": "بن موقت چت",
  "chat.disable_chat": "غیرفعال‌کردن چت",
  "chat.enable_chat": "رفع محدودیت چت",
};

export function auditLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] || action;
}
