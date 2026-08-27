"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { AuthField } from "@/components/AuthField";
import { isValidIranPhone } from "@/lib/validate";
import { passwordTier, PASSWORD_TIER_LABELS, PASSWORD_TIER_ORDER, isPasswordAcceptable } from "@/lib/passwordStrength";

const RESEND_COOLDOWN_SECONDS = 120;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
    passwordTier(newPassword, [phone]).then((t) => { if (!cancelled) setTier(t); });
    return () => { cancelled = true; };
  }, [newPassword, phone]);

  async function sendResetCode(phoneNumber: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/auth/forgot-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !isValidIranPhone(phone.trim())) {
      setError("فرمت شماره معتبر نیست (مثال: 09xxxxxxxxx)");
      return;
    }
    setLoading(true);
    try {
      const result = await sendResetCode(phone.trim());
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
      const result = await sendResetCode(phone.trim());
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
        body: JSON.stringify({ phone: phone.trim(), code: code.trim(), newPassword }),
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
          <AuthBrandMark />
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>فراموشی رمز عبور</div>
          </div>

          {step === 1 && (
            <form onSubmit={requestCode} className="auth-step" key="step1">
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, marginBottom: 16, lineHeight: 1.8, textAlign: "center" }}>
                شماره همراهی که باهاش ثبت‌نام کردی رو وارد کن، یه کد ۵ رقمی برات پیامک می‌شه.
              </div>
              <AuthField id="phone" label="شماره همراه">
                <input
                  id="phone" type="tel" inputMode="numeric" className="wsearch-newform-name" value={phone} dir="ltr" placeholder="09123456789"
                  onChange={(e) => setPhone(e.target.value)}
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
                کدی که به {phone} پیامک شد رو وارد کن، بعد رمز جدیدت رو انتخاب کن.
              </div>
              <AuthField id="code" label="کد ۵ رقمی">
                <input
                  id="code" type="tel" inputMode="numeric" maxLength={5} className="wsearch-newform-name" value={code} dir="ltr"
                  onChange={(e) => setCode(e.target.value)}
                />
              </AuthField>
              <button
                type="button"
                className="auth-resend-btn"
                disabled={resendCooldown > 0 || loading}
                onClick={resendCode}
              >
                {resendCooldown > 0 ? `ارسال مجدد کد (${resendCooldown})` : "ارسال مجدد کد"}
              </button>
              <div style={{ marginTop: 14 }}>
                <AuthField id="newPassword" label="رمز عبور جدید">
                  <input
                    id="newPassword" type="password" className="wsearch-newform-name" value={newPassword}
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
