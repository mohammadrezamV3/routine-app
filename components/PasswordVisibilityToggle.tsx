"use client";

/**
 * دکمه‌ی نمایش/مخفی‌کردن رمز — چشمی که واقعاً باز و بسته می‌شود.
 *
 * سه چیزی که قبلاً غلط بود:
 *
 *   ۱. **پرشِ صفحه.** قبلاً دو آیکونِ جدا (`Eye` و `EyeOff`) با
 *      `AnimatePresence` جابه‌جا می‌شدند؛ یعنی در لحظه‌ی تعویض، عنصر از
 *      DOM درمی‌آمد و دوباره مونت می‌شد و چیدمان تکان می‌خورد. حالا یک SVGِ
 *      ثابت است و فقط `d`ِ مسیرها با CSS transition عوض می‌شود — هیچ
 *      مونت/آنمونتی در کار نیست، پس هیچ‌چیز جابه‌جا نمی‌شود.
 *
 *   ۲. **خط روی چشم.** حالتِ «مخفی» با خطِ اریب روی چشم نشان داده می‌شد.
 *      حالا خودِ پلک بسته می‌شود: کمانِ بالا پایین می‌آید، مردمک محو
 *      می‌شود، و سه مژه‌ی کوتاه زیرِ پلک درمی‌آید.
 *
 *   ۳. **اندازه و بک‌گراند.** بزرگ‌تر شد و هیچ بک‌گراندی ندارد
 *      (ریستِ سراسریِ `button{}` صراحتاً خنثی شده).
 */
export function PasswordVisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`field-toggle-visibility-btn${visible ? " is-open" : ""}`}
      tabIndex={-1}
      aria-label={visible ? "مخفی‌کردن رمز عبور" : "نمایش رمز عبور"}
      aria-pressed={visible}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="fx-eye">
        {/* پلکِ پایین — همیشه ثابت است */}
        <path className="fx-eye-lower" d="M2.6 12c2.6 3.9 5.8 5.9 9.4 5.9s6.8-2 9.4-5.9"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        {/* پلکِ بالا — بسته: روی همان کمانِ پایین می‌خوابد، باز: بالا می‌رود */}
        <path className="fx-eye-upper" d="M2.6 12c2.6-3.9 5.8-5.9 9.4-5.9s6.8 2 9.4 5.9"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        {/* مردمک — فقط در حالتِ باز دیده می‌شود */}
        <circle className="fx-eye-pupil" cx="12" cy="12" r="3.1"
                stroke="currentColor" strokeWidth="1.7" />
        {/* مژه‌ها — فقط در حالتِ بسته درمی‌آیند */}
        <g className="fx-eye-lashes" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M5.2 14.4 3.9 16.3" />
          <path d="M12 15.6V17.9" />
          <path d="M18.8 14.4l1.3 1.9" />
        </g>
      </svg>
    </button>
  );
}
