"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { toEnDigits } from "@/lib/schedule";
import { constrainTyped, limitError, limitOf, maxInputChars, typedStatus, type LimitSpec } from "@/lib/numberLimits";

/**
 * هر ورودی عددی اپ باید از این استفاده کنه، نه `<input type="number">`.
 *
 * دلیل: با `type="number"` مرورگر ارقام فارسی و عربی رو اصلا قبول
 * نمی‌کنه — `e.target.value` خالی برمی‌گرده و کاربر فکر می‌کنه فیلد خرابه.
 * این کامپوننت یک `type="text"` با `inputMode="numeric"`ه (پس روی موبایل
 * همون کیبورد عددی بالا میاد) که هر رقم فارسی/عربی‌ای رو همون لحظه‌ی تایپ
 * به انگلیسی تبدیل می‌کنه و بقیه‌ی کاراکترها رو دور می‌ندازه. مقدار نهایی
 * که به `onChange` می‌ره همیشه ارقام لاتین خالصه، پس `+value` سمت ثبت
 * بدون هیچ تبدیل اضافه کار می‌کنه.
 *
 * `decimal` رو true بذار اگه فیلد اعشاری قبول می‌کنه (مثلا وزن).
 *
 * سقف و کف (lib/numberLimits.ts): با `limit` (کلید جدول یا خود شیء) فیلد
 *  - تعداد نویسه رو محدود می‌کنه (`maxLength`)،
 *  - رقم اعشار اضافه رو می‌بره و اعشاری‌بودن رو از جدول می‌گیره،
 *  - مقدار بالاتر از سقف رو همون لحظه روی سقف می‌ذاره (و چند ثانیه حاشیه‌ی
 *    فیلد قرمز می‌شه، با همون رنگ خطای فرم‌های سایت)،
 *  - بعد از blur اگه مقدار پایین‌تر از کفه حاشیه قرمز می‌مونه تا کاربر اصلاحش کنه.
 * `min`/`max` (ویژگی‌های معمول input) اینجا عدد جایگزین جدولن، نه ویژگی DOM —
 * برای سقف پویا (مثلا مقدار غذا بر حسب پیمانه).
 */
export const NumberInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value" | "min" | "max"> & {
    value: string;
    onChange: (value: string) => void;
    decimal?: boolean;
    limit?: LimitSpec;
    min?: number;
    max?: number;
  }
>(function NumberInput({ value, onChange, decimal, limit, min, max, style, onBlur, title, ...rest }, ref) {
  const l = limit ? limitOf(limit) : null;
  const isDecimal = decimal ?? (l ? l.decimals > 0 : false);
  const [flash, setFlash] = useState(false);
  const [low, setLow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const bounds = { min, max };
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let next = sanitizeNumeric(e.target.value, isDecimal);
      if (l && limit) {
        const r = constrainTyped(next, limit, { max });
        next = r.text;
        if (r.clamped) {
          setFlash(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setFlash(false), 2200);
        }
      }
      if (low) setLow(false);
      onChange(next);
    },
    [l, limit, max, isDecimal, low, onChange]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (limit) setLow(typedStatus(value, limit, bounds) === "low");
      onBlur?.(e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit, value, min, max, onBlur]
  );

  const invalid = !!limit && (flash || low || typedStatus(value, limit, bounds) === "high");
  const hint = limit ? limitError(l ? { ...l, min: min ?? l.min, max: max ?? l.max } : limit) : undefined;

  return (
    <input
      type="text"
      inputMode={isDecimal ? "decimal" : "numeric"}
      autoComplete="off"
      {...(limit ? { maxLength: maxInputChars(limit) } : {})}
      {...rest}
      ref={ref}
      value={value}
      title={title ?? (invalid ? hint : undefined)}
      aria-invalid={invalid || undefined}
      style={invalid ? { ...style, borderColor: "#E05252" } : style}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});

/** ارقام فارسی/عربی → لاتین، و حذف هر کاراکتر غیرعددی (به‌جز یک نقطه اگر اعشاری مجازه). */
export function sanitizeNumeric(raw: string, decimal = false): string {
  const en = toEnDigits(raw).replace(/[٫،]/g, ".");
  if (!decimal) return en.replace(/[^\d]/g, "");
  const cleaned = en.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
