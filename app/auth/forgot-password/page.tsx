"use client";

import { useEffect, useState } from "react";
import { faNum } from "@/lib/jalali";
import { useRouter } from "next/navigation";
import { User, Lock } from "lucide-react";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { AuthField } from "@/components/AuthField";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { isValidIranPhone, isValidEmail, digitsOnly } from "@/lib/validate";
import { passwordTier, PASSWORD_TIER_LABELS, PASSWORD_TIER_LABELS_EN, PASSWORD_TIER_ORDER, isPasswordAcceptable } from "@/lib/passwordStrength";
import { useT } from "@/components/LanguageProvider";

const RESEND_COOLDOWN_SECONDS = 120;

// شناسه یک باکس واحده — هم شماره‌همراه هم ایمیل (اگه کاربر ثبت کرده باشه)
// قبول می‌کنه؛ تشخیص نوعش سمت سرور هم دوباره انجام می‌شه (lib/validate).
function isValidIdentifier(v: string): boolean {
  return isValidIranPhone(v) || isValidEmail(v);
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const [tier, setTier] = useState<Awaited<ReturnType<typeof passwordTier>> | null>(null);
  useEffect(() => {
    if (!newPassword) { setTier(null); return; }
    let cancelled = false;
    passwordTier(newPassword, [identifier]).then((tr) => { if (!cancelled) setTier(tr); });
    return () => { cancelled = true; };
  }, [newPassword, identifier]);

  async function sendResetCode(value: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/auth/forgot-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: value }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !isValidIdentifier(identifier.trim())) {
      setError(t({ fa: "شماره همراه یا ایمیل معتبر نیست", en: "Invalid phone number or email" }));
      return;
    }
    setLoading(true);
    try {
      const result = await sendResetCode(identifier.trim());
      setLoading(false);
      if (!result.ok) { setError(result.error || t({ fa: "خطایی پیش آمد", en: "An error occurred" })); return; }
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep(2);
    } catch {
      setLoading(false);
      setError(t({ fa: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", en: "There was a problem connecting to the server — please try again" }));
    }
  }

  async function resendCode() {
    setError(null);
    setLoading(true);
    try {
      const result = await sendResetCode(identifier.trim());
      setLoading(false);
      if (!result.ok) { setError(result.error || t({ fa: "خطایی پیش آمد", en: "An error occurred" })); return; }
      setCode("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setLoading(false);
      setError(t({ fa: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", en: "There was a problem connecting to the server — please try again" }));
    }
  }

  async function verifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) { setError(t({ fa: "کد ارسال‌شده را وارد کن", en: "Enter the code you received" })); return; }
    if (!newPassword) { setError(t({ fa: "رمز جدید را وارد کن", en: "Enter a new password" })); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code: code.trim(), newPassword }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || t({ fa: "خطایی پیش آمد", en: "An error occurred" })); return; }
      setStep(3);
    } catch {
      setLoading(false);
      setError(t({ fa: "مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", en: "There was a problem connecting to the server — please try again" }));
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-box">
          <AuthBackButton onClick={step === 2 ? () => { setStep(1); setError(null); } : undefined} />
          <AuthBrandMark subtitle={t({ fa: "فراموشی رمز عبور", en: "Forgot password" })} />

          {step === 1 && (
            <form onSubmit={requestCode} className="auth-step" key="step1">
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
                {t({
                  fa: "شماره‌همراه یا ایمیلی که باهاش ثبت‌نام کردی رو وارد کن، یه کد ۵ رقمی برات ارسال می‌شه.",
                  en: "Enter the phone number or email you signed up with — a 5-digit code will be sent to you.",
                })}
              </div>
              <AuthField id="identifier" label={t({ fa: "شماره همراه یا ایمیل", en: "Phone number or email" })} icon={<User size={15} />}>
                <input
                  id="identifier" type="text" className="wsearch-newform-name" value={identifier} dir="ltr" style={{ textAlign: "right" }} placeholder="09123456789"
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </AuthField>
              {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}
              <button type="submit" className="auth-full-btn" disabled={loading}>
                {loading ? t({ fa: "در حال ارسال…", en: "Sending…" }) : t({ fa: "ارسال کد", en: "Send code" })}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyAndReset} className="auth-step" key="step2">
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
                {t({
                  fa: `کدی که به ${identifier} ارسال شد رو وارد کن، بعد رمز جدیدت رو انتخاب کن.`,
                  en: `Enter the code that was sent to ${identifier}, then choose your new password.`,
                })}
              </div>
              <AuthField id="code" label={t({ fa: "کد ۵ رقمی", en: "5-digit code" })}>
                <input
                  id="code" type="tel" inputMode="numeric" maxLength={5} className="wsearch-newform-name" value={code} dir="ltr" style={{ textAlign: "right" }}
                  onChange={(e) => setCode(digitsOnly(e.target.value))}
                />
              </AuthField>
              <button
                type="button"
                className="auth-resend-btn"
                disabled={resendCooldown > 0 || loading}
                onClick={resendCode}
              >
                {resendCooldown > 0
                  ? t({ fa: `ارسال مجدد کد ${faNum(resendCooldown)}`, en: `Resend code in ${resendCooldown}` })
                  : t({ fa: "ارسال مجدد کد", en: "Resend code" })}
              </button>
              <div style={{ marginTop: 14 }}>
                <AuthField
                  id="newPassword" label={t({ fa: "رمز عبور جدید", en: "New password" })}
                  icon={<Lock size={15} />}
                  endAction={<PasswordVisibilityToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />}
                >
                  <input
                    id="newPassword" type={passwordVisible ? "text" : "password"} className="wsearch-newform-name" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </AuthField>
                {tier && (
                  <div className={`pw-strength pw-strength-${tier}`}>
                    <div className="pw-strength-bars">
                      {PASSWORD_TIER_ORDER.map((tv, i) => (
                        <div key={tv} className={`pw-strength-bar${i <= PASSWORD_TIER_ORDER.indexOf(tier) ? " filled" : ""}`} />
                      ))}
                    </div>
                    <div className="pw-strength-label">
                      {t({ fa: `قدرت رمز: ${PASSWORD_TIER_LABELS[tier]}`, en: `Password strength: ${PASSWORD_TIER_LABELS_EN[tier]}` })}
                      {!isPasswordAcceptable(tier) && t({ fa: " — حداقل باید «خوب» باشه", en: " — must be at least \"Good\"" })}
                    </div>
                  </div>
                )}
              </div>
              {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}
              <button type="submit" className="auth-full-btn" disabled={loading}>
                {loading ? t({ fa: "در حال ثبت…", en: "Submitting…" }) : t({ fa: "تغییر رمز عبور", en: "Change password" })}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="auth-step" key="step3" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text)", marginTop: 10, lineHeight: 1.8 }}>
                {t({ fa: "رمزت با موفقیت عوض شد. حالا می‌تونی با رمز جدید وارد بشی.", en: "Your password was changed successfully. You can now sign in with your new password." })}
              </div>
              <button type="button" className="auth-full-btn" onClick={() => router.push("/auth/login")}>
                {t({ fa: "بازگشت به ورود", en: "Back to sign in" })}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
