"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, AtSign, Lock } from "lucide-react";
import { AuthTabs } from "@/components/AuthTabs";
import { AuthField } from "@/components/AuthField";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { staggerFieldsIn } from "@/lib/uiAnim";
import { isValidIranPhone, isValidUsername, validatePassword, isValidPersianName } from "@/lib/validate";
import { passwordTier, PASSWORD_TIER_LABELS, PASSWORD_TIER_ORDER, isPasswordAcceptable } from "@/lib/passwordStrength";

type FieldErrors = {
  phone?: string; name?: string; username?: string;
  password?: string; agreed?: string; otp?: string;
};

// یک باکس واحد «نام و نام‌خانوادگی» — سرور همچنان name/lastName جدا
// می‌خواد، پس این‌جا از روی فاصله‌ی بین کلمات جدا می‌شن: اولین کلمه نام،
// بقیه نام‌خانوادگی.
function splitFullName(v: string): { name: string; lastName: string } {
  const parts = v.trim().split(/\s+/).filter(Boolean);
  return { name: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

const RESEND_COOLDOWN_SECONDS = 120;

// فرم دیگه ویزارد چند-استپ نیست: اول اطلاعات اصلی (اسم/یوزرنیم/رمز)، بعد
// شماره‌همراه — همه توی یک صفحه. تاریخ تولد عمدا این‌جا نیست — بعدا از
// پنل کاربری (/account) خود کاربر وارد می‌کنه، نه موقع ثبت‌نام. دکمه‌ی
// «ارسال کد» داخل خود فیلد شماره‌ست؛ با زدنش کد پیامک می‌شه و بلافاصله
// زیر همون فیلد، فیلد کد ظاهر می‌شه (بدون رفتن به یه صفحه/استپ جدا).
// خود تایید کد هم موقع «ساخت حساب» نهایی، همراه با بقیه‌ی اطلاعات یک‌جا
// چک می‌شه.
export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const otpRef = useRef<HTMLDivElement>(null);
  const agreedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { staggerFieldsIn(formRef.current); }, []);

  const [tier, setTier] = useState<Awaited<ReturnType<typeof passwordTier>> | null>(null);
  useEffect(() => {
    if (!password) { setTier(null); return; }
    let cancelled = false;
    passwordTier(password, [username, fullName, phone]).then((t) => { if (!cancelled) setTier(t); });
    return () => { cancelled = true; };
  }, [password, username, fullName, phone]);

  function clearError(key: keyof FieldErrors) {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function requestOtp() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setFieldErrors((f) => ({ ...f, phone: "شماره همراه را وارد کن" }));
      return;
    }
    if (!isValidIranPhone(trimmed)) {
      setFieldErrors((f) => ({ ...f, phone: "فرمت شماره معتبر نیست (مثال: 09xxxxxxxxx)" }));
      return;
    }
    clearError("phone");
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/signup/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      setSendingCode(false);
      if (!res.ok) {
        setFieldErrors((f) => ({ ...f, phone: data.error || "خطایی پیش آمد" }));
        return;
      }
      setOtpCode("");
      setFieldErrors((f) => ({ ...f, otp: undefined }));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpSent(true);
    } catch {
      setSendingCode(false);
      setFieldErrors((f) => ({ ...f, phone: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن" }));
    }
  }

  function changePhone() {
    setOtpSent(false);
    setOtpCode("");
    setResendCooldown(0);
    setFieldErrors((f) => ({ ...f, otp: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errs: FieldErrors = {};
    const { name, lastName } = splitFullName(fullName);
    if (!name) errs.name = "نام و نام‌خانوادگی را وارد کن";
    else if (!lastName) errs.name = "نام و نام‌خانوادگی را کامل وارد کن";
    // فقط فارسی — همین بررسی سمت سرور هم تکرار می‌شود (قابل دور زدن است)
    else if (!isValidPersianName(name) || !isValidPersianName(lastName)) {
      errs.name = "نام و نام‌خانوادگی باید فقط با حروف فارسی نوشته شود";
    }
    if (!username.trim()) errs.username = "یوزرنیم را وارد کن";
    else if (!isValidUsername(username.trim())) errs.username = "یوزرنیم باید ۳ تا ۲۰ کاراکتر انگلیسی/عدد/آندرلاین باشد";
    if (!password) errs.password = "رمز عبور را وارد کن";
    else {
      const pwErr = await validatePassword(password, [username, fullName, phone]);
      if (pwErr) errs.password = pwErr;
    }
    if (!phone.trim()) errs.phone = "شماره همراه را وارد کن";
    else if (!isValidIranPhone(phone.trim())) errs.phone = "فرمت شماره معتبر نیست (مثال: 09xxxxxxxxx)";
    else if (!otpSent) errs.phone = "اول باید کد تایید رو ارسال کنی";
    if (otpSent && !otpCode.trim()) errs.otp = "کد ارسال‌شده را وارد کن";
    if (!agreed) errs.agreed = "برای ادامه باید قوانین سایت را بپذیری";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      return;
    }

    setLoading(true);

    let verifyRes: Response;
    let verifyData: { error?: string };
    try {
      verifyRes = await fetch("/api/auth/signup/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: otpCode.trim() }),
      });
      verifyData = await verifyRes.json().catch(() => ({}));
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    if (!verifyRes.ok) {
      setLoading(false);
      setFieldErrors((f) => ({ ...f, otp: verifyData.error || "کد وارد شده اشتباه است" }));
      return;
    }

    let res: Response;
    let data: { error?: string; userId?: string };
    try {
      res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lastName, phone, username, password }),
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

        <form ref={formRef} onSubmit={submit} className="auth-box">
          <AuthBackButton />
          <AuthBrandMark subtitle="به آریون خوش اومدی!" />

          <AuthField id="fullName" label="نام و نام‌خانوادگی" error={fieldErrors.name} icon={<User size={15} />} ref={nameRef}>
            <input
              id="fullName" type="text" className="wsearch-newform-name" value={fullName} placeholder="نام و نام‌خانوادگی خود را وارد کنید"
              onChange={(e) => { setFullName(e.target.value); if (e.target.value.trim()) clearError("name"); }}
            />
          </AuthField>

          <div style={{ marginTop: 14 }}>
            <AuthField id="username" label="یوزرنیم" error={fieldErrors.username} icon={<AtSign size={15} />} ref={usernameRef}>
              <input
                id="username" type="text" className="wsearch-newform-name" value={username} dir="ltr" style={{ textAlign: "right" }} placeholder="یوزرنیم خود را وارد کنید"
                onChange={(e) => { setUsername(e.target.value); if (e.target.value.trim()) clearError("username"); }}
              />
            </AuthField>
          </div>

          <div style={{ marginTop: 14 }}>
            <AuthField
              id="password" label="رمز عبور" error={fieldErrors.password} ref={passwordRef}
              icon={<Lock size={15} />}
              endAction={<PasswordVisibilityToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />}
            >
              <input
                id="password" type={passwordVisible ? "text" : "password"} className="wsearch-newform-name" value={password} placeholder="حداقل ۸ کاراکتر"
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

          <div style={{ marginTop: 14 }} ref={phoneRef}>
            <AuthField id="phone" label="شماره همراه" error={fieldErrors.phone}>
              <div className={`auth-phone-wrap${otpSent ? " sent" : ""}`}>
                <input
                  id="phone" type="tel" inputMode="numeric" className="wsearch-newform-name" value={phone} dir="ltr" style={{ textAlign: "right" }}
                  placeholder="09123456789" readOnly={otpSent}
                  onChange={(e) => { setPhone(e.target.value); if (e.target.value.trim()) clearError("phone"); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !otpSent) { e.preventDefault(); requestOtp(); } }}
                />
                <button
                  type="button"
                  className="auth-phone-send-btn"
                  disabled={sendingCode || (otpSent && resendCooldown > 0)}
                  onClick={otpSent ? changePhone : requestOtp}
                >
                  {sendingCode ? "در حال ارسال…" : otpSent ? "تغییر شماره" : "ارسال کد"}
                </button>
              </div>
            </AuthField>
          </div>

          {otpSent && (
            <div className="auth-otp-reveal" ref={otpRef}>
              <div className="auth-otp-hint">کدی که به {phone.trim()} پیامک شد رو وارد کن.</div>
              <AuthField id="signupOtp" label="کد ۵ رقمی" error={fieldErrors.otp}>
                <input
                  id="signupOtp" type="tel" inputMode="numeric" maxLength={5} className="wsearch-newform-name" value={otpCode} dir="ltr" style={{ textAlign: "right" }}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); if (e.target.value.trim()) clearError("otp"); }}
                />
              </AuthField>
              <button
                type="button"
                className="auth-resend-btn"
                disabled={resendCooldown > 0 || sendingCode}
                onClick={requestOtp}
              >
                {resendCooldown > 0 ? `ارسال مجدد کد (${resendCooldown})` : "ارسال مجدد کد"}
              </button>
            </div>
          )}

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
                قوانین و مقررات
              </Link>
              {" "}سایت را می‌پذیرم
            </div>
          </div>
          {fieldErrors.agreed && <div className="field-error-msg" style={{ display: "block", marginRight: 32 }}>{fieldErrors.agreed}</div>}

          {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

          <button type="submit" className="auth-full-btn" disabled={loading} data-anim-field style={{ marginTop: 16 }}>
            {loading ? "در حال ثبت‌نام…" : "ساخت حساب"}
          </button>
        </form>
      </div>
    </section>
  );
}
