"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { staggerFieldsIn, shakeFields } from "@/lib/uiAnim";
import { isValidIranPhone, isValidUsername, validatePassword } from "@/lib/validate";

type FieldErrors = { name?: string; phone?: string; username?: string; password?: string; agreed?: string };

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const agreedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, []);

  function clearError(key: keyof FieldErrors) {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
  }

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "نام را وارد کن";
    if (!username.trim()) errs.username = "یوزرنیم را وارد کن";
    else if (!isValidUsername(username.trim())) errs.username = "یوزرنیم باید ۳ تا ۲۰ کاراکتر انگلیسی/عدد/آندرلاین باشد";
    if (!phone.trim()) errs.phone = "شماره همراه را وارد کن";
    else if (!isValidIranPhone(phone.trim())) errs.phone = "فرمت شماره معتبر نیست (مثال: 09xxxxxxxxx)";
    if (!password) errs.password = "رمز عبور را وارد کن";
    else {
      const pwErr = validatePassword(password);
      if (pwErr) errs.password = pwErr;
    }
    if (!agreed) errs.agreed = "برای ادامه باید قوانین سایت را بپذیری";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      shakeFields([
        errs.name ? nameRef.current : null,
        errs.username ? usernameRef.current : null,
        errs.phone ? phoneRef.current : null,
        errs.password ? passwordRef.current : null,
        errs.agreed ? agreedRef.current : null,
      ]);
      return false;
    }
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "خطایی پیش آمد");
      return;
    }

    const loginRes = await signIn("credentials", { redirect: false, identifier: username, password });
    setLoading(false);
    if (loginRes?.error) {
      router.push("/auth/login");
      return;
    }
    router.push("/");
  }

  return (
    <section>
      <h1>ثبت‌نام</h1>
      <AuthTabs active="signup" />

      <form
        ref={formRef}
        onSubmit={submit}
        className="wsearch-newform"
        style={{ position: "static", transform: "none", opacity: 1, pointerEvents: "auto", width: "100%", maxWidth: "none", marginTop: 0 }}
      >
        <AuthField id="name" label="نام" error={fieldErrors.name} ref={nameRef}>
          <input
            id="name" type="text" className="wsearch-newform-name" value={name}
            onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) clearError("name"); }}
          />
        </AuthField>

        <div style={{ marginTop: 14 }}>
          <AuthField id="username" label="یوزرنیم" error={fieldErrors.username} ref={usernameRef}>
            <input
              id="username" type="text" className="wsearch-newform-name" value={username} dir="ltr"
              onChange={(e) => { setUsername(e.target.value); if (e.target.value.trim()) clearError("username"); }}
            />
          </AuthField>
        </div>

        <div style={{ marginTop: 14 }}>
          <AuthField id="phone" label="شماره همراه" error={fieldErrors.phone} ref={phoneRef}>
            <input
              id="phone" type="tel" inputMode="numeric" className="wsearch-newform-name" value={phone} dir="ltr" placeholder="09xxxxxxxxx"
              onChange={(e) => { setPhone(e.target.value); if (e.target.value.trim()) clearError("phone"); }}
            />
          </AuthField>
        </div>

        <div style={{ marginTop: 14 }}>
          <AuthField id="password" label="رمز عبور (حداقل ۸ کاراکتر)" error={fieldErrors.password} ref={passwordRef}>
            <input
              id="password" type="password" className="wsearch-newform-name" value={password}
              onChange={(e) => { setPassword(e.target.value); if (e.target.value) clearError("password"); }}
            />
          </AuthField>
        </div>

        <div
          className="task auth-terms-row"
          style={{ marginTop: 16 }}
          ref={agreedRef}
          data-anim-field
          onClick={() => { setAgreed((v) => !v); clearError("agreed"); }}
        >
          <div className={`check${agreed ? " on" : ""}`}>
            <svg className="c-check" viewBox="0 0 24 24" fill="none">
              <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="task-name">
            <Link href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)" }}>
              قوانین و مقررات سایت
            </Link>
            {" "}را می‌پذیرم
          </div>
        </div>
        {fieldErrors.agreed && <div className="field-error-msg" style={{ display: "block", marginRight: 32 }}>{fieldErrors.agreed}</div>}

        {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

        <div className="wsearch-newform-actions" style={{ justifyContent: "flex-start", marginTop: 18 }} data-anim-field>
          <button type="submit" disabled={loading} style={{ borderRadius: 8, padding: "9px 20px", borderColor: "var(--accent)", color: "var(--accent)" }}>
            {loading ? "در حال ثبت‌نام…" : "ساخت اکانت"}
          </button>
        </div>
      </form>
    </section>
  );
}
