// تبدیل ارقام فارسی/عربی <-> لاتین — پورت از lib/validate.ts (فقط بخش
// خالص، بدون بقیه‌ی اعتبارسنجی‌های سمت سرور که اینجا لازم نیست).

export function toEnglishDigits(v: string): string {
  return String(v)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function digitsOnly(v: string): string {
  return toEnglishDigits(v).replace(/\D/g, "");
}
