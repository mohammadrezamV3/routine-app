"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { staggerFieldsIn, shakeFields } from "@/lib/uiAnim";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
    const res = await signIn("credentials", { redirect: false, identifier, password });
    setLoading(false);
    if (res?.error) {
      setError("یوزرنیم/شماره موبایل یا رمز عبور اشتباه است");
      shakeFields([identifierRef.current, passwordRef.current]);
      return;
    }
    router.push("/");
  }

  return (
    <section>
      <h1>ورود</h1>
      <div className="auth-shell">
        <AuthTabs active="login" />

        <form ref={formRef} onSubmit={submit} className="auth-box">
          <AuthField id="identifier" label="یوزرنیم یا شماره همراه" error={fieldErrors.identifier} ref={identifierRef}>
            <input
              id="identifier"
              type="text"
              className="wsearch-newform-name"
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
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (e.target.value) clearError("password"); }}
              />
            </AuthField>
          </div>

          {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

          <div className="wsearch-newform-actions" style={{ justifyContent: "flex-start", marginTop: 18 }} data-anim-field>
            <button type="submit" disabled={loading} style={{ borderRadius: 8, padding: "9px 20px", borderColor: "var(--accent)", color: "var(--accent)" }}>
              {loading ? "در حال ورود…" : "ورود"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
