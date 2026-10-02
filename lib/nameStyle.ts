import { sanitizePermissions } from "@/lib/adminPermissions";

// سبک نام کاربر در کل اپ (components/GoldenName.tsx):
//  - "toxic": Owner (isSuperAdmin) یا ادمین (adminPermissions معتبر غیرخالی) —
//    همیشه، مستقل از اچیومنت‌ها، و بر طلایی مقدمه.
//  - "golden": همه‌ی اچیومنت‌ها باز شده (User.goldenSince).
//  - null: نام معمولی.
// staff فقط سمت سرور و از ردیف دیتابیس حساب می‌شه (نه JWT، نه ورودی کلاینت) و
// به کلاینت فقط یک بولین می‌رسه — هیچ جزئیاتی از دسترسی‌های ادمین لو نمی‌ره.

export type NameStyle = "golden" | "toxic" | null;

/** فیلدهایی که برای تصمیم سبک نام از جدول User لازمه — کنار بقیه‌ی select همون کوئری */
export const NAME_STYLE_SELECT = { goldenSince: true, isSuperAdmin: true, adminPermissions: true } as const;

export type NameStyleRow = {
  goldenSince?: Date | null;
  isSuperAdmin?: boolean | null;
  adminPermissions?: readonly string[] | null;
};

/** هم‌قاعده‌ی getAdminContext در lib/requireAdmin.ts: Owner یا حداقل یک دسترسی معتبر */
export function isStaffUser(u: NameStyleRow | null | undefined): boolean {
  if (!u) return false;
  return !!u.isSuperAdmin || sanitizePermissions(u.adminPermissions ?? []).length > 0;
}

/** دو بولین عمومی برای payload ها — فقط همین‌ها به کلاینت می‌رسن */
export function nameFlags(u: NameStyleRow | null | undefined): { golden: boolean; staff: boolean } {
  return { golden: !!u?.goldenSince, staff: isStaffUser(u) };
}

/** تصمیم نهایی سبک: staff بر golden مقدمه */
export function resolveNameStyle(f: { golden?: boolean | null; staff?: boolean | null }): NameStyle {
  if (f.staff) return "toxic";
  if (f.golden) return "golden";
  return null;
}
