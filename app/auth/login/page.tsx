"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { AuthBackButton, AuthBrandMark, GoogleSignInButton } from "@/components/AuthChrome";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { staggerFieldsIn, shakeFields } from "@/lib/uiAnim";
import { setAuthHintCookie } from "@/lib/preload";
import { isValidEmail } from "@/lib/validate";

type LoginMode = "password" | "email-otp";
type OtpStep = "email" | "code";

export default function LoginPage() {
  const router = useRouter();

  // ── حالتِ رمز عبور (پیش‌فرض، بدون تغییر نسبت به قبل) ──────────────────
  const [mode, setMode] = useState<LoginMode>("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);

  // ── حالتِ ورود با کدِ ایمیل ────────────────────────────────────────────
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [noAccountEmail, setNoAccountEmail] = useState<string | null>(null);

  const emailRef = useRef<HTMLDivElement>(null);
  const otpRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, [mode, otpStep]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // اگه next-auth بعد از تلاش ورود با گوگل (مثلاً به‌خاطر رد کردن دسترسی یا
  // نبودن GOOGLE_CLIENT_ID/SECRET روی این دیپلوی) با ?error=... برگردونه،
  // به‌جای رها کردن کاربر توی فرم خالی، خطا رو نشونش می‌دیم. از
  // window.location مستقیم می‌خونیم تا نیازی به useSearchParams/Suspense نباشه.
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) setError("ورود با گوگل ناموفق بود — دوباره امتحان کن یا از روش دیگه‌ای وارد شو");
  }, []);

  function clearError(key: "identifier" | "password") {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
  }

  function switchMode(next: string) {
    setMode(next as LoginMode);
    setError(null);
    setEmailError(null);
    setOtpError(null);
    setNoAccountEmail(null);
  }

  async function finalizeLogin() {
    // لایه‌ی داده تا اینجا وضعیتِ «مهمان» رو کش کرده (و از localStorage
    // می‌خونده)؛ بدونِ این پاک‌سازی، چون این‌جا ناوبریِ کلاینتیه (نه ریلودِ
    // کامل)، صفحه‌ی بعدی همچنان داده‌ی مهمان رو نشون می‌داد.
    invalidateStorageCache();
    // تا لودِ بعدی بتونه داده‌ها رو پیش‌درخواست کنه (lib/preload.ts)
    setAuthHintCookie();
    router.push("/weekly");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errs: typeof fieldErrors = {};
    if (!identifier.trim()) errs.identifier = "یوزرنیم یا شماره موبایل را وارد کن";
    if (!password) errs.password = "رمز عبور را وارد کن";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      shakeFields([errs.identifier ? identifierRef.current : null, errs.password ? passwordRef.current : null]);
      return;
    }

    setLoading(true);
    let res;
    try {
      res = await signIn("credentials", { redirect: false, identifier, password, remember: remember ? "1" : "0" });
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    setLoading(false);

    if (res?.error) {
      // پیام عمداً کلیه (نه «یوزرنیم اشتباهه» / «رمز اشتباهه» جدا) تا کسی که
      // فقط رمز رو حدس می‌زنه نتونه بفهمه شناسه‌ی درست رو پیدا کرده یا نه.
      setError("یوزرنیم/شماره موبایل یا رمز عبور اشتباه است");
      shakeFields([identifierRef.current, passwordRef.current]);
      return;
    }
    if (!res?.ok) {
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    finalizeLogin();
  }

  async function requestOtp(): Promise<boolean> {
    setEmailLoading(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/auth/email-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setEmailLoading(false);
      if (!res.ok) {
        setEmailError(data.error || "خطایی پیش آمد");
        shakeFields([emailRef.current]);
        return false;
      }
      setOtpCode("");
      setOtpError(null);
      setNoAccountEmail(null);
      setResendCooldown(60);
      setOtpStep("code");
      return true;
    } catch {
      setEmailLoading(false);
      setEmailError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return false;
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("ایمیل را وارد کن");
      shakeFields([emailRef.current]);
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("ایمیل معتبر نیست");
      shakeFields([emailRef.current]);
      return;
    }
    requestOtp();
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otpCode.trim();
    if (!code) {
      setOtpError("کد ارسال‌شده را وارد کن");
      shakeFields([otpRef.current]);
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setNoAccountEmail(null);

    try {
      const verifyRes = await fetch("/api/auth/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        setOtpLoading(false);
        setOtpError(verifyData.error || "خطایی پیش آمد");
        shakeFields([otpRef.current]);
        return;
      }
      if (!verifyData.hasAccount) {
        setOtpLoading(false);
        setNoAccountEmail(email.trim());
        return;
      }

      let signInRes;
      try {
        signInRes = await signIn("email-otp", { redirect: false, email: email.trim(), code });
      } catch {
        setOtpLoading(false);
        setOtpError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
        return;
      }
      setOtpLoading(false);
      if (!signInRes?.ok) {
        setOtpError("کد نامعتبر یا منقضی‌شده است — یک کد جدید بگیر");
        shakeFields([otpRef.current]);
        return;
      }
      finalizeLogin();
    } catch {
      setOtpLoading(false);
      setOtpError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <AuthTabs active="login" />

        {mode === "password" && (
          <form ref={formRef} onSubmit={submitPassword} className="auth-box">
            <AuthBackButton />
            <AuthBrandMark subtitle="ورود به پنل کاربری" />

            <div style={{ marginBottom: 16 }} data-anim-field>
              <SegmentedTabs
                active={mode}
                onChange={switchMode}
                options={[{ value: "password", label: "رمز عبور" }, { value: "email-otp", label: "کد ایمیل" }]}
              />
            </div>

            <AuthField id="identifier" label="یوزرنیم یا شماره همراه" error={fieldErrors.identifier} ref={identifierRef}>
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
              <AuthField id="password" label="رمز عبور" error={fieldErrors.password} ref={passwordRef}>
                <input
                  id="password"
                  type="password"
                  className="wsearch-newform-name"
                  placeholder="رمز عبورت رو وارد کن"
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
                منو به‌یاد داشته باش
              </label>
              <Link href="/auth/forgot-password" className="auth-forgot-link">فراموشی رمز عبور؟</Link>
            </div>

            {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

            <button type="submit" className="auth-full-btn" disabled={loading} data-anim-field>
              {loading ? "در حال ورود…" : "ورود"}
            </button>

            <div className="auth-or-divider" data-anim-field>یا</div>
            <GoogleSignInButton />
          </form>
        )}

        {mode === "email-otp" && otpStep === "email" && (
          <form ref={formRef} onSubmit={submitEmail} className="auth-box">
            <AuthBackButton />
            <AuthBrandMark subtitle="ورود با کد یک‌بارمصرف ایمیل" />

            <div style={{ marginBottom: 16 }} data-anim-field>
              <SegmentedTabs
                active={mode}
                onChange={switchMode}
                options={[{ value: "password", label: "رمز عبور" }, { value: "email-otp", label: "کد ایمیل" }]}
              />
            </div>

            <AuthField id="email" label="ایمیل" error={emailError || undefined} ref={emailRef}>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="wsearch-newform-name"
                placeholder="you@example.com"
                dir="ltr"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (e.target.value.trim()) setEmailError(null); }}
              />
            </AuthField>

            <button type="submit" className="auth-full-btn" disabled={emailLoading} data-anim-field style={{ marginTop: 14 }}>
              {emailLoading ? "در حال ارسال…" : "ارسال کد"}
            </button>
          </form>
        )}

        {mode === "email-otp" && otpStep === "code" && (
          <form ref={formRef} onSubmit={submitOtp} className="auth-box">
            <AuthBackButton onClick={() => { setOtpStep("email"); setOtpError(null); setNoAccountEmail(null); }} />
            <AuthBrandMark subtitle={`کد ۶ رقمی به ${email.trim()} ارسال شد`} />

            <AuthField id="loginOtp" label="کد ۶ رقمی" error={otpError || undefined} ref={otpRef}>
              <input
                id="loginOtp"
                type="tel"
                inputMode="numeric"
                maxLength={6}
                className="wsearch-newform-name"
                value={otpCode}
                dir="ltr"
                autoComplete="one-time-code"
                onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); if (e.target.value.trim()) setOtpError(null); }}
              />
            </AuthField>

            {noAccountEmail && (
              <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>
                هنوز حسابی با این ایمیل ثبت نشده — <Link href="/auth/signup" style={{ textDecoration: "underline" }}>اول ثبت‌نام کن</Link>
              </div>
            )}

            <button type="submit" className="auth-full-btn" disabled={otpLoading} data-anim-field style={{ marginTop: 14 }}>
              {otpLoading ? "در حال بررسی…" : "تایید و ورود"}
            </button>

            <button
              type="button"
              className="auth-resend-btn"
              disabled={resendCooldown > 0 || emailLoading}
              onClick={requestOtp}
              data-anim-field
            >
              {resendCooldown > 0 ? `ارسال مجدد کد (${resendCooldown})` : "ارسال مجدد کد"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
