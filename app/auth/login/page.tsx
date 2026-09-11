"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, ShieldCheck } from "lucide-react";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { staggerFieldsIn } from "@/lib/uiAnim";
import { setAuthHintCookie } from "@/lib/preload";
import { toEnDigits } from "@/lib/schedule";
import { useT } from "@/components/LanguageProvider";

// ورود فقط با یوزرنیم/شماره + رمز عبوره — روش کد ایمیل از اینجا حذف شد
// (تصمیم صریح کاربر: «ورود به پنل فقط با رمز عبور باشه نه کد ایمیل»).
// روت /api/auth/email-otp/* و پرووایدر next-auth دست‌نخورده باقی موندن —
// فقط دیگه از این صفحه صدا زده نمی‌شن — چون قبلا کاملا ساخته و تست شدن
// و ممکنه بعدا لازم بشن؛ حذف کامل‌شون یه تصمیم جدا و بزرگ‌تره.
export default function LoginPage() {
  const router = useRouter();
  const t = useT();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // مرحله‌ی دوم ورود (فقط وقتی کاربر ورود دومرحله‌ای پیامکی رو روشن کرده)
  const [twoFactor, setTwoFactor] = useState<{ phoneHint: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, []);

  function clearError(key: "identifier" | "password") {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
  }

  async function finalizeLogin(): Promise<boolean> {
    // هیچ‌وقت فقط به خروجیِ signIn اعتماد نکن — یک بار نشستِ واقعی را از
    // سرور بپرس و فقط اگر کاربرِ واقعی برگشت، ناوبری کن.
    //
    // چرا: خروجیِ signIn از روی *بدنه‌ی پاسخِ* /api/auth/callback ساخته
    // می‌شود، و مهاجم با یک پروکسی (مثل Burp) می‌تواند آن بدنه را به شکلِ
    // «موفق» بازنویسی کند حتی وقتی رمز غلط بوده و سرور هیچ کوکیِ نشستی
    // نساخته. آن‌وقت router.push کاربر را به /weekly می‌بُرد و *ظاهرِ*
    // ورود ساخته می‌شد (هرچند سرور همچنان همه‌چیز را ۴۰۱ می‌کرد و هیچ
    // داده‌ی واقعی‌ای در دسترس نبود). getSession یک رفت‌وبرگشتِ تازه به
    // سرور می‌زند که کوکیِ *واقعی* را می‌خواند، پس بازنویسیِ بدنه بی‌اثر
    // می‌شود: نشستِ جعلی هیچ‌وقت کاربر ندارد.
    const session = await getSession();
    if (!(session?.user as any)?.id) {
      setError(t({ fa: "ورود ناموفق بود — دوباره امتحان کن", en: "Login failed — please try again" }));
      return false;
    }

    // لایه‌ی داده تا اینجا وضعیت «مهمان» رو کش کرده (و از localStorage
    // می‌خونده)؛ بدون این پاک‌سازی، چون این‌جا ناوبری کلاینتیه (نه ریلود
    // کامل)، صفحه‌ی بعدی همچنان داده‌ی مهمان رو نشون می‌داد.
    invalidateStorageCache();
    // تا لود بعدی بتونه داده‌ها رو پیش‌درخواست کنه (lib/preload.ts)
    setAuthHintCookie();
    router.push("/weekly");
    return true;
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errs: typeof fieldErrors = {};
    if (!identifier.trim()) errs.identifier = t({ fa: "یوزرنیم یا شماره موبایل را وارد کن", en: "Enter your username or phone number" });
    if (!password) errs.password = t({ fa: "رمز عبور را وارد کن", en: "Enter your password" });
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);

    // اگه این حساب ورود دومرحله‌ای داره، رمز همون‌جا بررسی و کد پیامک می‌شه؛
    // مسیر عادی «credentials» برای این حساب‌ها سمت سرور بسته‌ست.
    try {
      const pre = await fetch("/api/auth/2fa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const preData = await pre.json().catch(() => ({}));
      if (pre.ok && preData.required) {
        setLoading(false);
        setOtpCode("");
        setTwoFactor({ phoneHint: preData.phoneHint || "" });
        return;
      }
    } catch {
      // خطای این پیش‌بررسی نباید جلوی مسیر عادی ورود رو بگیره
    }

    let res;
    try {
      res = await signIn("credentials", { redirect: false, identifier, password, remember: remember ? "1" : "0" });
    } catch {
      setLoading(false);
      setError(t({ fa: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", en: "There was a problem connecting to the server — please try again" }));
      return;
    }
    setLoading(false);

    if (res?.error) {
      // پیام عمدا کلیه (نه «یوزرنیم اشتباهه» / «رمز اشتباهه» جدا) تا کسی که
      // فقط رمز رو حدس می‌زنه نتونه بفهمه شناسه‌ی درست رو پیدا کرده یا نه.
      setError(t({ fa: "یوزرنیم/شماره موبایل یا رمز عبور اشتباه است", en: "Incorrect username/phone number or password" }));
      return;
    }
    if (!res?.ok) {
      setError(t({ fa: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", en: "There was a problem connecting to the server — please try again" }));
      return;
    }
    setLoading(true);
    const ok = await finalizeLogin();
    if (!ok) setLoading(false);
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otpCode.trim().length < 4) { setError(t({ fa: "کد پیامک‌شده رو کامل وارد کن", en: "Enter the full code you received by SMS" })); return; }

    setLoading(true);
    let res;
    try {
      res = await signIn("sms-2fa", { redirect: false, identifier, code: otpCode.trim(), remember: remember ? "1" : "0" });
    } catch {
      setLoading(false);
      setError(t({ fa: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", en: "There was a problem connecting to the server — please try again" }));
      return;
    }
    if (res?.error || !res?.ok) { setLoading(false); setError(t({ fa: "کد وارد‌شده درست نیست یا منقضی شده", en: "The code you entered is incorrect or has expired" })); return; }
    const ok = await finalizeLogin();
    if (!ok) setLoading(false);
  }

  if (twoFactor) {
    return (
      <section className="auth-page">
        <div className="auth-shell">
          <AuthTabs active="login" />
          <form onSubmit={submitOtp} className="auth-box">
            <AuthBackButton />
            <AuthBrandMark subtitle={t({ fa: "ورود دومرحله‌ای", en: "Two-factor login" })} />

            <div className="section-note" style={{ marginBottom: 12 }}>
              {t({
                fa: `یک کد به شماره‌ی ثبت‌شده‌ی حسابت (…${toEnDigits(twoFactor.phoneHint)}) پیامک شد. کد رو وارد کن.`,
                en: `A code was sent by SMS to your registered number (…${toEnDigits(twoFactor.phoneHint)}). Enter the code.`,
              })}
            </div>

            <AuthField id="otp" label={t({ fa: "کد پیامک‌شده", en: "SMS code" })} icon={<ShieldCheck size={15} />}>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                className="wsearch-newform-name"
                placeholder="- - - - -"
                value={otpCode}
                onChange={(e) => setOtpCode(toEnDigits(e.target.value).replace(/\D/g, ""))}
              />
            </AuthField>

            {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

            <button type="submit" className="auth-full-btn" disabled={loading}>
              {loading ? t({ fa: "در حال ورود…", en: "Signing in…" }) : t({ fa: "تایید و ورود", en: "Verify & sign in" })}
            </button>
            <button
              type="button"
              className="auth-forgot-link"
              style={{ marginTop: 12, background: "none", display: "block", width: "100%" }}
              onClick={() => { setTwoFactor(null); setError(null); }}
            >
              {t({ fa: "بازگشت", en: "Back" })}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <AuthTabs active="login" />

        <form ref={formRef} onSubmit={submitPassword} className="auth-box">
          <AuthBackButton />
          <AuthBrandMark subtitle={t({ fa: "ورود به پنل کاربری", en: "Sign in to your account" })} />

          <AuthField id="identifier" label={t({ fa: "یوزرنیم یا شماره همراه", en: "Username or phone number" })} error={fieldErrors.identifier} icon={<User size={15} />} ref={identifierRef}>
            <input
              id="identifier"
              type="text"
              className="wsearch-newform-name"
              placeholder="09123456789"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); if (e.target.value.trim()) clearError("identifier"); }}
            />
          </AuthField>

          <div style={{ marginTop: 14 }}>
            <AuthField
              id="password" label={t({ fa: "رمز عبور", en: "Password" })} error={fieldErrors.password} ref={passwordRef}
              icon={<Lock size={15} />}
              endAction={<PasswordVisibilityToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />}
            >
              <input
                id="password"
                type={passwordVisible ? "text" : "password"}
                className="wsearch-newform-name"
                placeholder={t({ fa: "رمز عبورت رو وارد کن", en: "Enter your password" })}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (e.target.value) clearError("password"); }}
              />
            </AuthField>
          </div>

          <div className="auth-remember-row" data-anim-field>
            <label className="auth-remember-label">
              <input
                type="checkbox"
                className="auth-checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t({ fa: "منو به‌یاد داشته باش", en: "Remember me" })}
            </label>
            <Link href="/auth/forgot-password" className="auth-forgot-link">{t({ fa: "فراموشی رمز عبور؟", en: "Forgot password?" })}</Link>
          </div>

          {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

          <button type="submit" className="auth-full-btn" disabled={loading} data-anim-field>
            {loading ? t({ fa: "در حال ورود…", en: "Signing in…" }) : t({ fa: "ورود", en: "Sign in" })}
          </button>
        </form>
      </div>
    </section>
  );
}
