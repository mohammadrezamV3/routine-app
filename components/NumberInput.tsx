"use client";

import { forwardRef } from "react";
import { toEnDigits } from "@/lib/schedule";

/**
 * هر ورودیِ عددیِ اپ باید از این استفاده کنه، نه `<input type="number">`.
 *
 * دلیل: با `type="number"` مرورگر ارقامِ فارسی/عربی («۱۲۰») رو اصلاً قبول
 * نمی‌کنه — `e.target.value` خالی برمی‌گرده و کاربر فکر می‌کنه فیلد خرابه.
 * این کامپوننت یک `type="text"` با `inputMode="numeric"`ه (پس روی موبایل
 * همون کیبوردِ عددی بالا میاد) که هر رقمِ فارسی/عربی‌ای رو همون لحظه‌ی تایپ
 * به انگلیسی تبدیل می‌کنه و بقیه‌ی کاراکترها رو دور می‌ندازه. مقدارِ نهایی
 * که به `onChange` می‌ره همیشه ارقامِ لاتینِ خالصه، پس `+value` سمتِ ثبت
 * بدونِ هیچ تبدیلِ اضافه کار می‌کنه.
 *
 * `decimal` رو true بذار اگه فیلد اعشاری قبول می‌کنه (مثلاً وزن).
 */
export const NumberInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> & {
    value: string;
    onChange: (value: string) => void;
    decimal?: boolean;
  }
>(function NumberInput({ value, onChange, decimal = false, ...rest }, ref) {
  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      {...rest}
      ref={ref}
      value={value}
      onChange={(e) => onChange(sanitizeNumeric(e.target.value, decimal))}
    />
  );
});

/** ارقامِ فارسی/عربی → لاتین، و حذفِ هر کاراکترِ غیرعددی (به‌جز یک نقطه اگر اعشاری مجازه). */
export function sanitizeNumeric(raw: string, decimal = false): string {
  const en = toEnDigits(raw).replace(/[٫،]/g, ".");
  if (!decimal) return en.replace(/[^\d]/g, "");
  const cleaned = en.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
