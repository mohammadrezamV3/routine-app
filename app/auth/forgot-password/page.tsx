"use client";

import { useEffect, useState } from "react";
import { faNum } from "@/lib/jalali";
import { useRouter } from "next/navigation";
import { User, Lock } from "lucide-react";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { AuthField } from "@/components/AuthField";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { isValidIranPhone, isValidEmail, digitsOnly } from "@/lib/validate";
import { passwordTier, PASSWORD_TIER_LABELS, PASSWORD_TIER_ORDER, isPasswordAcceptable } from "@/lib/passwordStrength";

const RESEND_COOLDOWN_SECONDS = 120;

// شناسه یک باکس واحده — هم شماره‌همراه هم ایمیل (اگه کاربر ثبت کرده باشه)
// قبول می‌کنه؛ تشخیص نوعش سمت سرور هم دوباره انجام می‌شه (lib/validate).
function isValidIdentifier(v: string): boolean {
  return isValidIranPhone(v) || isValidEmail(v);
}

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
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
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
    if (!identifier.trim() || !isValidIdentifier(identifier.trim())) {
      setError("شماره همراه یا ایمیل معتبر نیست");
      return;
    }
    setLoading(true);
    try {
      const result = await sendResetCode(identifier.trim());
      setLoading(false);
      if (!result.ok) { setError(result.error || "خطایی پیش آمد"); return; }
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep(2);
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
    }
  }

  async function resendCode() {
    setError(null);
    setLoading(true);
    try {
      const result = await sendResetCode(identifier.trim());
      setLoading(false);
      if (!result.ok) { setError(result.error || "خطایی پیش آمد"); return; }
      setCode("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
    }
  }

  async function verifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) { setError("کد ارسال‌شده را وارد کن"); return; }
    if (!newPassword) { setError("رمز جدید را وارد کن"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code: code.trim(), newPassword }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error || "خطایی پیش آمد"); return; }
      setStep(3);
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-box">
          <AuthBackButton onClick={step === 2 ? () => { setStep(1); setError(null); } : undefined} />
          <AuthBrandMark subtitle="فراموشی رمز عبور" />

          {step === 1 && (
            <form onSubmit={requestCode} className="auth-step" key="step1">
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
                شماره‌همراه یا ایمیلی که باهاش ثبت‌نام کردی رو وارد کن، یه کد ۵ رقمی برات ارسال می‌شه.
              </div>
              <AuthField id="identifier" label="شماره همراه یا ایمیل" icon={<User size={15} />}>
                <input
                  id="identifier" type="text" className="wsearch-newform-name" value={identifier} dir="ltr" style={{ textAlign: "right" }} placeholder="09123456789"
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </AuthField>
              {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}
              <button type="submit" className="auth-full-btn" disabled={loading}>
                {loading ? "در حال ارسال…" : "ارسال کد"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyAndReset} className="auth-step" key="step2">
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
                کدی که به {identifier} ارسال شد رو وارد کن، بعد رمز جدیدت رو انتخاب کن.
              </div>
              <AuthField id="code" label="کد ۵ رقمی">
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
                {resendCooldown > 0 ? `ارسال مجدد کد ${faNum(resendCooldown)}` : "ارسال مجدد کد"}
              </button>
              <div style={{ marginTop: 14 }}>
                <AuthField
                  id="newPassword" label="رمز عبور جدید"
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
              {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}
              <button type="submit" className="auth-full-btn" disabled={loading}>
                {loading ? "در حال ثبت…" : "تغییر رمز عبور"}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="auth-step" key="step3" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text)", marginTop: 10, lineHeight: 1.8 }}>
                رمزت با موفقیت عوض شد. حالا می‌تونی با رمز جدید وارد بشی.
              </div>
              <button type="button" className="auth-full-btn" onClick={() => router.push("/auth/login")}>
                بازگشت به ورود
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
