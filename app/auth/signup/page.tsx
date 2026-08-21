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

type FieldErrors = { phone?: string; name?: string; lastName?: string; username?: string; birthDate?: string; password?: string; agreed?: string };

export default function SignupPage() {
  const router = useRouter();
  // ۱: شماره موبایل · ۲: کد تاییدِ پیامکی · ۳: بقیه‌ی اطلاعات + رمز
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState<JalaliDate | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const lastNameRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef<HTMLDivElement>(null);
  const birthDateRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const agreedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, [step]);

  const [tier, setTier] = useState<Awaited<ReturnType<typeof passwordTier>> | null>(null);
  useEffect(() => {
    if (!password) { setTier(null); return; }
    let cancelled = false;
    passwordTier(password, [username, name, lastName, phone]).then((t) => { if (!cancelled) setTier(t); });
    return () => { cancelled = true; };
  }, [password, username, name, lastName, phone]);

  function clearError(key: keyof FieldErrors) {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function requestOtp() {
    setLoading(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/auth/signup/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setFieldErrors({ phone: data.error || "خطایی پیش آمد" });
        shakeFields([phoneRef.current]);
        return false;
      }
      setOtpCode("");
      setResendCooldown(60);
      setStep(2);
      return true;
    } catch {
      setLoading(false);
      setFieldErrors({ phone: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن" });
      return false;
    }
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
    requestOtp();
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) { setOtpError("کد ارسال‌شده را وارد کن"); return; }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/auth/signup/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: otpCode.trim() }),
      });
      const data = await res.json();
      setOtpLoading(false);
      if (!res.ok) { setOtpError(data.error || "خطایی پیش آمد"); return; }
      setStep(3);
    } catch {
      setOtpLoading(false);
      setOtpError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
    }
  }

  async function validateStep2(): Promise<boolean> {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "نام را وارد کن";
    if (!lastName.trim()) errs.lastName = "نام خانوادگی را وارد کن";
    if (!username.trim()) errs.username = "یوزرنیم را وارد کن";
    else if (!isValidUsername(username.trim())) errs.username = "یوزرنیم باید ۳ تا ۲۰ کاراکتر انگلیسی/عدد/آندرلاین باشد";
    if (!birthDate) errs.birthDate = "تاریخ تولد را انتخاب کن";
    if (!password) errs.password = "رمز عبور را وارد کن";
    else {
      const pwErr = await validatePassword(password, [username, name, lastName, phone]);
      if (pwErr) errs.password = pwErr;
    }
    if (!agreed) errs.agreed = "برای ادامه باید قوانین سایت را بپذیری";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      shakeFields([
        errs.name ? nameRef.current : null,
        errs.lastName ? lastNameRef.current : null,
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
          name, lastName, phone, username, password,
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
            <AuthBrandMark subtitle="به آریون خوش اومدی!" />
            <div className="auth-step" key="step1">
              <AuthField id="phone" label="شماره همراه" error={fieldErrors.phone} ref={phoneRef}>
                <input
                  id="phone" type="tel" inputMode="numeric" className="wsearch-newform-name" value={phone} dir="ltr" placeholder="09123456789"
                  onChange={(e) => { setPhone(e.target.value); if (e.target.value.trim()) clearError("phone"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); goNext(); } }}
                />
              </AuthField>
              <button type="button" className="auth-full-btn" onClick={goNext} disabled={loading}>
                {loading ? "در حال ارسال کد…" : "ادامه"}
              </button>
            </div>
          </div>
        ) : step === 2 ? (
          <form onSubmit={verifyOtp} className="auth-box">
            <AuthBackButton onClick={() => { setStep(1); setOtpError(null); }} />
            <AuthBrandMark subtitle="به آریون خوش اومدی!" />
            <div className="auth-step" key="step2">
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
                کدی که به {phone.trim()} پیامک شد رو وارد کن.
              </div>
              <AuthField id="signupOtp" label="کد ۵ رقمی">
                <input
                  id="signupOtp" type="tel" inputMode="numeric" maxLength={5} className="wsearch-newform-name" value={otpCode} dir="ltr"
                  onChange={(e) => { setOtpCode(e.target.value); if (e.target.value.trim()) setOtpError(null); }}
                />
              </AuthField>
              {otpError && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{otpError}</div>}
              <button type="submit" className="auth-full-btn" disabled={otpLoading}>
                {otpLoading ? "در حال بررسی…" : "تایید کد"}
              </button>
              <button
                type="button"
                className="auth-resend-btn"
                disabled={resendCooldown > 0 || loading}
                onClick={requestOtp}
              >
                {resendCooldown > 0 ? `ارسال مجدد کد (${resendCooldown})` : "ارسال مجدد کد"}
              </button>
            </div>
          </form>
        ) : (
          <form ref={formRef} onSubmit={submit} className="auth-box">
            <AuthBackButton onClick={() => setStep(2)} />
            <AuthBrandMark subtitle="به آریون خوش اومدی!" />

            <div className="auth-step" key="step3">
              <div className="auth-field-grid">
                <AuthField id="name" label="نام" error={fieldErrors.name} ref={nameRef}>
                  <input
                    id="name" type="text" className="wsearch-newform-name" value={name} placeholder="علی"
                    onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) clearError("name"); }}
                  />
                </AuthField>
                <AuthField id="lastName" label="نام خانوادگی" error={fieldErrors.lastName} ref={lastNameRef}>
                  <input
                    id="lastName" type="text" className="wsearch-newform-name" value={lastName} placeholder="محمدی"
                    onChange={(e) => { setLastName(e.target.value); if (e.target.value.trim()) clearError("lastName"); }}
                  />
                </AuthField>
              </div>

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
