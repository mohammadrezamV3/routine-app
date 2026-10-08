"use client";

import { usePathname } from "next/navigation";
import { AuthShell } from "./AuthShell";
import { AuthTabs } from "./AuthTabs";
import { LanguageSwitch } from "./LanguageSwitch";

/**
 * قاب مشترک و *پایدار* صفحه‌های auth — از `app/auth/layout.tsx` رندر می‌شه.
 *
 * باگ گزارش‌شده («سوییچ بین ورود و ثبت‌نام با انیمیشن باگی لود می‌شه»):
 * قبلا هر صفحه (login/signup) خودش `section.auth-page` + `AuthShell` +
 * `AuthTabs` رو رندر می‌کرد، پس هر سوییچ کل این‌ها رو unmount/mount می‌کرد:
 *   ۱) نشانگر تب از نو mount می‌شد و بی‌انیمیشن (no-anim) سر تب جدید
 *      ظاهر می‌شد — تا وقتی صفحه‌ی بعد لود نشده بود روی تب قبلی گیر بود،
 *      بعد یک‌دفعه می‌پرید؛ هیچ‌وقت نمی‌لغزید.
 *   ۲) `AuthShell` قفل `padding-top`ـش رو از دست می‌داد و دوباره وسط‌چین
 *      می‌شد؛ چون ارتفاع باکس ورود و ثبت‌نام خیلی فرق داره، کل گروه
 *      تب‌ها+باکس عمودی جابه‌جا می‌شد (پرش layout).
 * حالا تب‌ها و شل این‌جا، بیرون از صفحه‌ها، زنده می‌مونن؛ فقط خود فرم
 * (`.auth-box`) عوض می‌شه و با فید/استگر وارد می‌شه.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const tab: "login" | "signup" | null =
    pathname.startsWith("/auth/login") ? "login" : pathname.startsWith("/auth/signup") ? "signup" : null;

  return (
    <section className="auth-page">
      {/* با ظاهر/پنهان‌شدن تب‌ها (مثلا رفتن به فراموشی رمز) گروه یک‌بار دوباره
          وسط‌چین می‌شه؛ بین ورود↔ثبت‌نام عمدا نه، تا تب‌ها سرجاشون بمونن. */}
      <AuthShell repinKey={tab ? "tabs" : "plain"}>
        {tab && <AuthTabs active={tab} />}
        {children}
      </AuthShell>
      {/* انتخاب زبان برای مهمان: ثابت پایین صفحه تا چیدمان وسط‌چین فرم‌ها دست نخوره */}
      <div style={{ position: "fixed", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}>
        <div style={{ width: 168, pointerEvents: "auto" }}>
          <LanguageSwitch />
        </div>
      </div>
    </section>
  );
}
