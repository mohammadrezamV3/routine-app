"use client";

import { usePathname } from "next/navigation";
import { AuthShell } from "./AuthShell";
import { AuthTabs } from "./AuthTabs";
import { AuthBackButton, AuthBrandMark } from "./AuthChrome";
import { AuthShowcase } from "./AuthShowcase";
import { tr } from "@/lib/i18n";

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
    // ورود دو ستونه: فرم (inline-start در فارسی، یعنی راست) + گالری تصویر چپ.
    // در ltr با row-reverse همون طرف‌های فیزیکی حفظ می‌شن (درخواست صریح:
    // تصویر چپ، ورود راست). زیر 1024px نوار تصویری بالا و فرم زیرش.
    <section className="auth-page auth-split">
      <div className="auth-split-form">
        {/* با ظاهر/پنهان‌شدن تب‌ها (مثلا رفتن به فراموشی رمز) گروه یک‌بار دوباره
            وسط‌چین می‌شه؛ بین ورود↔ثبت‌نام عمدا نه، تا تب‌ها سرجاشون بمونن. */}
        <AuthShell repinKey={tab ? "tabs" : "plain"}>
          {tab && (
            <div className="auth-split-head">
              <AuthBackButton />
              <AuthBrandMark
                title={tab === "login" ? tr("وارد آریون شو", "Log in to Arion") : tr("حساب آریونت رو بساز", "Create your Arion account")}
                subtitle={tab === "login"
                  ? tr("یک حساب برای روتین، ترید و تمرین", "One account for routine, trading and training")
                  : tr("ثبت‌نام فقط چند لحظه طول می‌کشه", "Sign-up only takes a moment")}
              />
            </div>
          )}
          {tab && <AuthTabs active={tab} />}
          {children}
        </AuthShell>
      </div>
      <div className="auth-split-media" aria-hidden="true"><AuthShowcase variant="panel" /></div>
      <div className="auth-split-strip" aria-hidden="true"><AuthShowcase variant="strip" /></div>
    </section>
  );
}
