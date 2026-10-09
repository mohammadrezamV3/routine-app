"use client";

import { useEffect, useState } from "react";
import { faNum } from "@/lib/jalali";
import { useRouter } from "next/navigation";
import { Phone, Lock } from "lucide-react";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { AuthField } from "@/components/AuthField";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { isValidIranPhone, digitsOnly } from "@/lib/validate";
import { passwordTierLabel } from "@/lib/passwordTierLabel";
import { passwordTier, PASSWORD_TIER_LABELS, PASSWORD_TIER_ORDER, isPasswordAcceptable } from "@/lib/passwordStrength";
import { tr, isEn } from "@/lib/i18n";

const RESEND_COOLDOWN_SECONDS = 120;

export default function ForgotPasswordPage() {
  const router = useRouter();
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
    passwordTier(newPassword, [identifier]).then((t) => { if (!cancelled) setTier(t); });
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
    if (!identifier.trim() || !isValidIranPhone(identifier.trim())) {
      setError(tr("شماره همراه معتبر نیست", "Invalid phone number"));
      return;
    }
    setLoading(true);
    try {
      const result = await sendResetCode(identifier.trim());
      setLoading(false);
      if (!result.ok) { setError(result.error || tr("خطایی پیش آمد", "Something went wrong")); return; }
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep(2);
    } catch {
      setLoading(false);
      setError(tr("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", "Could not reach the server. Please try again"));
    }
  }

  async function resendCode() {
    setError(null);
    setLoading(true);
    try {
      const result = await sendResetCode(identifier.trim());
      setLoading(false);
      if (!result.ok) { setError(result.error || tr("خطایی پیش آمد", "Something went wrong")); return; }
      setCode("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setLoading(false);
      setError(tr("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", "Could not reach the server. Please try again"));
    }
  }

  async function verifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) { setError(tr("کد ارسال‌شده را وارد کن", "Enter the code we sent you")); return; }
    if (!newPassword) { setError(tr("رمز جدید را وارد کن", "Enter your new password")); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code: code.trim(), newPassword }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || tr("خطایی پیش آمد", "Something went wrong")); return; }
      setStep(3);
    } catch {
      setLoading(false);
      setError(tr("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن", "Could not reach the server. Please try again"));
    }
  }

  return (
    <div className="auth-box">
      <AuthBackButton onClick={step === 2 ? () => { setStep(1); setError(null); } : undefined} />
      <AuthBrandMark subtitle={tr("فراموشی رمز عبور", "Forgot password")} />

      {step === 1 && (
        <form onSubmit={requestCode} className="auth-step" key="step1">
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
            {tr("شماره‌همراهی که باهاش ثبت‌نام کردی رو وارد کن، یه کد 5 رقمی برات ارسال می‌شه.", "Enter the phone number you signed up with and we will send you a 5-digit code.")}
          </div>
          <AuthField id="identifier" label={tr("شماره همراه", "Phone number")} icon={<Phone size={15} />}>
            <input
              id="identifier" type="tel" inputMode="numeric" autoComplete="tel-national" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="wsearch-newform-name" value={identifier} dir="ltr" placeholder="09123456789"
              onChange={(e) => setIdentifier(digitsOnly(e.target.value))}
            />
          </AuthField>
          {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}
          <button type="submit" className="auth-full-btn" disabled={loading}>
            {loading ? tr("در حال ارسال…", "Sending…") : tr("ارسال کد", "Send code")}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyAndReset} className="auth-step" key="step2">
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
            {tr(`کدی که به ${identifier} ارسال شد رو وارد کن، بعد رمز جدیدت رو انتخاب کن.`, `Enter the code sent to ${identifier}, then choose your new password.`)}
          </div>
          <AuthField id="code" label={tr("کد 5 رقمی", "5-digit code")}>
            <input
              id="code" type="tel" inputMode="numeric" autoComplete="one-time-code" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={5} className="wsearch-newform-name" value={code} dir="ltr" style={{ textAlign: isEn() ? "left" : "right" }}
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
              ? tr(`ارسال مجدد کد ${faNum(resendCooldown)}`, `Resend code ${faNum(resendCooldown)}`)
              : tr("ارسال مجدد کد", "Resend code")}
          </button>
          <div style={{ marginTop: 14 }}>
            <AuthField
              id="newPassword" label={tr("رمز عبور جدید", "New password")}
              icon={<Lock size={15} />}
              endAction={<PasswordVisibilityToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />}
            >
              <input
                id="newPassword" type={passwordVisible ? "text" : "password"} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="wsearch-newform-name" value={newPassword}
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
                  {tr(`قدرت رمز: ${PASSWORD_TIER_LABELS[tier]}`, `Password strength: ${passwordTierLabel(tier)}`)}
                  {!isPasswordAcceptable(tier) && tr(" — حداقل باید «خوب» باشه", " — must be at least \u201cGood\u201d")}
                </div>
              </div>
            )}
          </div>
          {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}
          <button type="submit" className="auth-full-btn" disabled={loading}>
            {loading ? tr("در حال ثبت…", "Saving…") : tr("تغییر رمز عبور", "Change password")}
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="auth-step" key="step3" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--text)", marginTop: 10, lineHeight: 1.8 }}>
            {tr("رمزت با موفقیت عوض شد. حالا می‌تونی با رمز جدید وارد بشی.", "Your password was changed. You can now log in with the new password.")}
          </div>
          <button type="button" className="auth-full-btn" onClick={() => router.push("/auth/login")}>
            {tr("بازگشت به ورود", "Back to login")}
          </button>
        </div>
      )}
    </div>
  );
}
