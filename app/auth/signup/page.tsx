"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { staggerFieldsIn, shakeFields } from "@/lib/uiAnim";
import { isValidIranPhone, isValidUsername, validatePassword } from "@/lib/validate";
import { passwordTier, PASSWORD_TIER_LABELS, PASSWORD_TIER_ORDER, isPasswordAcceptable } from "@/lib/passwordStrength";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { JalaliDate, formatJalali, jalaliToGregorianApprox } from "@/lib/jalali";

type FieldErrors = { phone?: string; name?: string; username?: string; birthDate?: string; password?: string; agreed?: string };

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState<JalaliDate | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef<HTMLDivElement>(null);
  const birthDateRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const agreedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, [step]);

  const [tier, setTier] = useState<Awaited<ReturnType<typeof passwordTier>> | null>(null);
  useEffect(() => {
    if (!password) { setTier(null); return; }
    let cancelled = false;
    passwordTier(password, [username, name, phone]).then((t) => { if (!cancelled) setTier(t); });
    return () => { cancelled = true; };
  }, [password, username, name, phone]);

  function clearError(key: keyof FieldErrors) {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
  }

  function goNext() {
    if (!phone.trim()) {
      setFieldErrors({ phone: "شماره همراه را وارد کن" });
      shakeFields([phoneRef.current]);
      return;
    }
    if (!isValidIranPhone(phone.trim())) {
      setFieldErrors({ phone: "فرمت شماره معتبر نیست (مثال: 09xxxxxxxxx)" });
      shakeFields([phoneRef.current]);
      return;
    }
    setFieldErrors({});
    setStep(2);
  }

  async function validateStep2(): Promise<boolean> {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "نام و نام خانوادگی را وارد کن";
    if (!username.trim()) errs.username = "یوزرنیم را وارد کن";
    else if (!isValidUsername(username.trim())) errs.username = "یوزرنیم باید ۳ تا ۲۰ کاراکتر انگلیسی/عدد/آندرلاین باشد";
    if (!birthDate) errs.birthDate = "تاریخ تولد را انتخاب کن";
    if (!password) errs.password = "رمز عبور را وارد کن";
    else {
      const pwErr = await validatePassword(password, [username, name, phone]);
      if (pwErr) errs.password = pwErr;
    }
    if (!agreed) errs.agreed = "برای ادامه باید قوانین سایت را بپذیری";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      shakeFields([
        errs.name ? nameRef.current : null,
        errs.username ? usernameRef.current : null,
        errs.birthDate ? birthDateRef.current : null,
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
    if (!(await validateStep2())) return;

    setLoading(true);
    let res: Response;
    let data: { error?: string; userId?: string };
    try {
      res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, username, password,
          birthDate: jalaliToGregorianApprox(birthDate![0], birthDate![1], birthDate![2]).toISOString(),
        }),
      });
      data = await res.json();
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "خطایی پیش آمد — دوباره امتحان کن");
      return;
    }

    let loginRes;
    try {
      loginRes = await signIn("credentials", { redirect: false, identifier: username, password });
    } catch {
      setLoading(false);
      router.push("/auth/login");
      return;
    }
    setLoading(false);
    if (loginRes?.error) {
      router.push("/auth/login");
      return;
    }
    router.push("/weekly");
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <AuthTabs active="signup" />

        {step === 1 ? (
          <div className="auth-box">
            <AuthBackButton />
            <AuthBrandMark />
            <div className="auth-step" key="step1">
              <AuthField id="phone" label="شماره همراه" error={fieldErrors.phone} ref={phoneRef}>
                <input
                  id="phone" type="tel" inputMode="numeric" className="wsearch-newform-name" value={phone} dir="ltr" placeholder="09xxxxxxxxx"
                  onChange={(e) => { setPhone(e.target.value); if (e.target.value.trim()) clearError("phone"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); goNext(); } }}
                />
              </AuthField>
              <button type="button" className="auth-full-btn" onClick={goNext}>ادامه</button>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={submit} className="auth-box">
            <AuthBackButton />
            <button type="button" className="auth-step-back-btn" aria-label="گام قبل" onClick={() => setStep(1)}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <AuthBrandMark />

            <div className="auth-step" key="step2">
              <AuthField id="name" label="نام و نام خانوادگی" error={fieldErrors.name} ref={nameRef}>
                <input
                  id="name" type="text" className="wsearch-newform-name" value={name} placeholder="علی محمدی"
                  onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) clearError("name"); }}
                />
              </AuthField>

              <div style={{ marginTop: 14 }}>
                <AuthField id="username" label="یوزرنیم" error={fieldErrors.username} ref={usernameRef}>
                  <input
                    id="username" type="text" className="wsearch-newform-name" value={username} dir="ltr" placeholder="ali_2024"
                    onChange={(e) => { setUsername(e.target.value); if (e.target.value.trim()) clearError("username"); }}
                  />
                </AuthField>
              </div>

              <div style={{ marginTop: 14 }} ref={birthDateRef} data-anim-field>
                <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>تاریخ تولد</label>
                <button
                  type="button"
                  className={`jdate-btn${birthDate ? "" : " placeholder"}`}
                  onClick={() => setDobOpen(true)}
                >
                  {birthDate ? formatJalali(birthDate) : "انتخاب تاریخ تولد"}
                </button>
                {fieldErrors.birthDate && <div className="field-error-msg" style={{ display: "block" }}>{fieldErrors.birthDate}</div>}
              </div>

              <div style={{ marginTop: 14 }}>
                <AuthField id="password" label="رمز عبور" error={fieldErrors.password} ref={passwordRef}>
                  <input
                    id="password" type="password" className="wsearch-newform-name" value={password} placeholder="حداقل ۸ کاراکتر"
                    onChange={(e) => { setPassword(e.target.value); if (e.target.value) clearError("password"); }}
                  />
                </AuthField>
                {tier && (
                  <div className={`pw-strength pw-strength-${tier}`}>
                    <div className="pw-strength-bars">
                      {PASSWORD_TIER_ORDER.map((t, i) => (
                        <div key={t} className={`pw-strength-bar${i <= PASSWORD_TIER_ORDER.indexOf(tier) ? " filled" : ""}`} />
                      ))}
                    </div>
                    <div className="pw-strength-label">
                      قدرت رمز: {PASSWORD_TIER_LABELS[tier]}
                      {!isPasswordAcceptable(tier) && " — حداقل باید «خوب» باشه"}
                    </div>
                  </div>
                )}
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

              <button type="submit" className="auth-full-btn" disabled={loading}>
                {loading ? "در حال ثبت‌نام…" : "ساخت حساب"}
              </button>
            </div>
          </form>
        )}
      </div>

      {dobOpen && (
        <JalaliDatePicker
          initial={birthDate}
          onPick={(d) => { setBirthDate(d); clearError("birthDate"); setDobOpen(false); }}
          onClose={() => setDobOpen(false)}
        />
      )}
    </section>
  );
}
