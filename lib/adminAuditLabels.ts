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
  "mentor.verify_identity": "بررسی احراز هویت منتور",
  "mentor.verify_certificate": "بررسی مدرک منتور",
  "mentor.suspend": "تعلیق منتور",
  "mentor.unsuspend": "رفع تعلیق منتور",
  "mentor.review_hide": "پنهان‌کردن نظر منتور",
  "mentor.review_restore": "بازگردانی نظر منتور",
  "mentor.report_resolve": "رسیدگی به گزارش منتورها",
  "mentor.document_view": "مشاهده مدرک منتور",
  "demo.seed": "ساخت داده‌ی آزمایشی",
  "demo.clear": "حذف داده‌ی آزمایشی",
};

export function auditLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] || action;
}
