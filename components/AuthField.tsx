"use client";

import { forwardRef, useLayoutEffect } from "react";
import { staggerFieldsIn } from "@/lib/uiAnim";

/**
 * ورود مرحله‌ای فیلدهای فرم auth — بدون «فلش».
 *
 * باگ: قبلا صفحه‌ها `staggerFieldsIn` رو داخل useEffect صدا می‌زدن، یعنی
 * *بعد* از اولین paint. پس با هر سوییچ ورود↔ثبت‌نام اول کل فرم کامل دیده
 * می‌شد، بعد anime.js فیلدها رو یک‌دفعه opacity:0 می‌کرد و دوباره یکی‌یکی
 * می‌آورد (چشمک/پرش). این‌جا قبل از paint (useLayoutEffect) فیلدها inline
 * مخفی می‌شن و بعد استگر شروع می‌شه. یک تایمر ایمنی هم هست که اگه به هر
 * دلیلی انیمیشن اجرا نشد، فیلدی برای همیشه نامرئی نمونه.
 */
export function useAuthFieldsStagger(ref: React.RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fields = Array.from(el.querySelectorAll<HTMLElement>("[data-anim-field]"));
    fields.forEach((f) => { f.style.opacity = "0"; });
    staggerFieldsIn(el);
    const safety = window.setTimeout(() => {
      fields.forEach((f) => { if (f.style.opacity === "0") f.style.opacity = ""; });
    }, 1500);
    return () => window.clearTimeout(safety);
  }, [ref]);
}

export const AuthField = forwardRef<
  HTMLDivElement,
  { id: string; label: string; error?: string; icon?: React.ReactNode; endAction?: React.ReactNode; children: React.ReactNode }
>(function AuthField({ id, label, error, icon, endAction, children }, ref) {
  return (
    <div ref={ref} className={`name-field-wrap${error ? " field-error" : ""}`} data-anim-field>
      <label htmlFor={id}>{label}</label>
      <div className={`field-error-wrap${icon ? " has-icon" : ""}${endAction ? " has-end-action" : ""}`}>
        {children}
        {icon && <span className="field-icon" aria-hidden="true">{icon}</span>}
        {endAction}
        <span className="field-error-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#E05252" strokeWidth="1.6" />
            <path d="M12 7.2v6.2M12 16.4v.1" stroke="#E05252" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      {error && <div className="field-error-msg">{error}</div>}
    </div>
  );
});
