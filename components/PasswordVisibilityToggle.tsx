"use client";

import { Eye, EyeOff } from "lucide-react";

/**
 * دکمه‌ی نمایش/مخفی‌کردن رمز.
 *
 * قبلا یک SVGِ دست‌ساز بود که پلک واقعی باز/بسته می‌شد (مسیرها با
 * transition:d انیمیت می‌شدن، مردمک/مژه‌ها فید می‌شدن) — طبقِ درخواستِ
 * صریح («چشمک چشم» را با چیز خیلی ساده‌تری جایگزین کن) حالا فقط یک
 * آیکونِ ثابت (Eye/EyeOff) بدونِ هیچ انیمیشنی سوییچ می‌شه.
 */
export function PasswordVisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="field-toggle-visibility-btn"
      tabIndex={-1}
      aria-label={visible ? "مخفی‌کردن رمز عبور" : "نمایش رمز عبور"}
      aria-pressed={visible}
      onClick={onToggle}
    >
      {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
    </button>
  );
}
