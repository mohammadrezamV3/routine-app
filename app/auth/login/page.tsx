"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { AuthBackButton, AuthBrandMark, GoogleSignInButton } from "@/components/AuthChrome";
import { staggerFieldsIn, shakeFields } from "@/lib/uiAnim";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, []);

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

  async function submit(e: React.FormEvent) {
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
    router.push("/weekly");
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <AuthTabs active="login" />

        <form ref={formRef} onSubmit={submit} className="auth-box">
          <AuthBackButton side="right" />
          <AuthBrandMark subtitle="ورود به پنل کاربری" />

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
      </div>
    </section>
  );
}
