"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock } from "lucide-react";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { staggerFieldsIn, shakeFields } from "@/lib/uiAnim";
import { setAuthHintCookie } from "@/lib/preload";

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
