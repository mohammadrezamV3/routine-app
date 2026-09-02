"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
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

// ورود فقط با یوزرنیم/شماره + رمز عبوره — روشِ کدِ ایمیل از اینجا حذف شد
// (تصمیمِ صریحِ کاربر: «ورود به پنل فقط با رمز عبور باشه نه کد ایمیل»).
// روتِ /api/auth/email-otp/* و پرووایدرِ next-auth دست‌نخورده باقی موندن —
// فقط دیگه از این صفحه صدا زده نمی‌شن — چون قبلاً کاملاً ساخته و تست شدن
// و ممکنه بعداً لازم بشن؛ حذفِ کامل‌شون یه تصمیمِ جدا و بزرگ‌تره.
export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // مرحله‌ی دومِ ورود (فقط وقتی کاربر ورودِ دومرحله‌ایِ پیامکی رو روشن کرده)
  const [twoFactor, setTwoFactor] = useState<{ phoneHint: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, []);

  function clearError(key: "identifier" | "password") {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
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
      return;
    }

    setLoading(true);

    // اگه این حساب ورودِ دومرحله‌ای داره، رمز همون‌جا بررسی و کد پیامک می‌شه؛
    // مسیرِ عادیِ «credentials» برای این حساب‌ها سمتِ سرور بسته‌ست.
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
      // خطای این پیش‌بررسی نباید جلوی مسیرِ عادیِ ورود رو بگیره
    }

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
      return;
    }
    if (!res?.ok) {
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    finalizeLogin();
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otpCode.trim().length < 4) { setError("کدِ پیامک‌شده رو کامل وارد کن"); return; }

    setLoading(true);
    let res;
    try {
      res = await signIn("sms-2fa", { redirect: false, identifier, code: otpCode.trim(), remember: remember ? "1" : "0" });
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    setLoading(false);
    if (res?.error || !res?.ok) { setError("کد وارد‌شده درست نیست یا منقضی شده"); return; }
    finalizeLogin();
  }

  if (twoFactor) {
    return (
      <section className="auth-page">
        <div className="auth-shell">
          <AuthTabs active="login" />
          <form onSubmit={submitOtp} className="auth-box">
            <AuthBackButton />
            <AuthBrandMark subtitle="ورود دومرحله‌ای" />

            <div className="section-note" style={{ marginBottom: 12 }}>
              یک کد به شماره‌ی ثبت‌شده‌ی حسابت (…{toEnDigits(twoFactor.phoneHint)}) پیامک شد. کد رو وارد کن.
            </div>

            <AuthField id="otp" label="کد پیامک‌شده" icon={<ShieldCheck size={15} />}>
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
              {loading ? "در حال ورود…" : "تایید و ورود"}
            </button>
            <button
              type="button"
              className="auth-forgot-link"
              style={{ marginTop: 12, background: "none", display: "block", width: "100%" }}
              onClick={() => { setTwoFactor(null); setError(null); }}
            >
              بازگشت
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
          <AuthBrandMark subtitle="ورود به پنل کاربری" />

          <AuthField id="identifier" label="یوزرنیم یا شماره همراه" error={fieldErrors.identifier} icon={<User size={15} />} ref={identifierRef}>
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
              id="password" label="رمز عبور" error={fieldErrors.password} ref={passwordRef}
              icon={<Lock size={15} />}
              endAction={<PasswordVisibilityToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />}
            >
              <input
                id="password"
                type={passwordVisible ? "text" : "password"}
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
        </form>
      </div>
    </section>
  );
}
