"use client";

import { SpinnerCheck } from "@/components/SpinnerCheck";
import { TickButton } from "@/components/TickButton";
import { useRef, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, ShieldCheck } from "lucide-react";
import { AuthField, useAuthFieldsStagger } from "@/components/AuthField";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";
import { PasswordVisibilityToggle } from "@/components/PasswordVisibilityToggle";
import { setAuthHintCookie } from "@/lib/preload";
import { toEnDigits } from "@/lib/schedule";
import { resolveHomePath } from "@/lib/homePath";

// ورود فقط با یوزرنیم/شماره + رمز عبوره — روش کد ایمیل از اینجا حذف شد
// (تصمیم صریح کاربر: «ورود به پنل فقط با رمز عبور باشه نه کد ایمیل»).
// روت /api/auth/email-otp/* و پرووایدر next-auth دست‌نخورده باقی موندن —
// فقط دیگه از این صفحه صدا زده نمی‌شن — چون قبلا کاملا ساخته و تست شدن
// و ممکنه بعدا لازم بشن؛ حذف کامل‌شون یه تصمیم جدا و بزرگ‌تره.
export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // بعد از تاییدِ نشستِ واقعی، دایره‌ی لودینگ به تیک تبدیل می‌شه و بعد ناوبری.
  const [success, setSuccess] = useState(false);
  // مرحله‌ی دوم ورود (فقط وقتی کاربر ورود دومرحله‌ای پیامکی رو روشن کرده)
  const [twoFactor, setTwoFactor] = useState<{ phoneHint: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const identifierRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);

  // شل و تب‌ها در app/auth/layout.tsx (AuthFrame) پایدارن؛ این صفحه فقط خودِ فرم رو می‌سازه
  useAuthFieldsStagger(formRef);

  function clearError(key: "identifier" | "password") {
    setFieldErrors((f) => (f[key] ? { ...f, [key]: undefined } : f));
  }

  async function finalizeLogin(): Promise<boolean> {
    // هیچ‌وقت فقط به خروجیِ signIn اعتماد نکن — یک بار نشستِ واقعی را از
    // سرور بپرس و فقط اگر کاربرِ واقعی برگشت، ناوبری کن.
    //
    // چرا: خروجیِ signIn از روی *بدنه‌ی پاسخِ* /api/auth/callback ساخته
    // می‌شود، و مهاجم با یک پروکسی (مثل Burp) می‌تواند آن بدنه را به شکلِ
    // «موفق» بازنویسی کند حتی وقتی رمز غلط بوده و سرور هیچ کوکیِ نشستی
    // نساخته. آن‌وقت router.push کاربر را به /weekly می‌بُرد و *ظاهرِ*
    // ورود ساخته می‌شد (هرچند سرور همچنان همه‌چیز را ۴۰۱ می‌کرد و هیچ
    // داده‌ی واقعی‌ای در دسترس نبود). getSession یک رفت‌وبرگشتِ تازه به
    // سرور می‌زند که کوکیِ *واقعی* را می‌خواند، پس بازنویسیِ بدنه بی‌اثر
    // می‌شود: نشستِ جعلی هیچ‌وقت کاربر ندارد.
    const session = await getSession();
    if (!(session?.user as any)?.id) {
      setError("ورود ناموفق بود — دوباره امتحان کن");
      return false;
    }

    // رمزگذاریِ سرتاسریِ گفت‌وگوی منتور: از همین رمز، *روی دستگاه*، کلیدِ بسته‌بندی
    // مشتق می‌شود تا کلیدِ گفت‌وگو بی‌صدا باز شود (lib/e2ee/client.ts). رمز به هیچ
    // درخواستِ تازه‌ای نمی‌رود؛ در پس‌زمینه و بی‌اثر بر ورود.
    if (password) void import("@/lib/e2ee/client").then((m) => m.primeE2EEFromPassword((session!.user as any).id, password)).catch(() => {});

    // لایه‌ی داده تا اینجا وضعیت «مهمان» رو کش کرده (و از localStorage
    // می‌خونده)؛ بدون این پاک‌سازی، چون این‌جا ناوبری کلاینتیه (نه ریلود
    // کامل)، صفحه‌ی بعدی همچنان داده‌ی مهمان رو نشون می‌داد.
    invalidateStorageCache();
    // تا لود بعدی بتونه داده‌ها رو پیش‌درخواست کنه (lib/preload.ts)
    setAuthHintCookie();
    setSuccess(true);
    // مقصد (داشبورد یا روتین — lib/homePath.ts) هم‌زمان با انیمیشنِ تیک معلوم می‌شه
    const [home] = await Promise.all([resolveHomePath(), new Promise((r) => setTimeout(r, 650))]);
    router.push(home);
    return true;
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errs: typeof fieldErrors = {};
    if (!identifier.trim()) errs.identifier = "یوزرنیم یا شماره موبایل را وارد کن";
    if (!password) errs.password = "رمز عبور را وارد کن";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);

    // اگه این حساب ورود دومرحله‌ای داره، رمز همون‌جا بررسی و کد پیامک می‌شه؛
    // مسیر عادی «credentials» برای این حساب‌ها سمت سرور بسته‌ست.
    try {
      const pre = await fetch("/api/auth/2fa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const preData = await pre.json().catch(() => ({}));
      if (pre.ok && preData.required) {
        setLoading(false);
        setOtpCode("");
        setTwoFactor({ phoneHint: preData.phoneHint || "" });
        return;
      }
    } catch {
      // خطای این پیش‌بررسی نباید جلوی مسیر عادی ورود رو بگیره
    }

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
      // پیام عمدا کلیه (نه «یوزرنیم اشتباهه» / «رمز اشتباهه» جدا) تا کسی که
      // فقط رمز رو حدس می‌زنه نتونه بفهمه شناسه‌ی درست رو پیدا کرده یا نه.
      setError("یوزرنیم/شماره موبایل یا رمز عبور اشتباه است");
      return;
    }
    if (!res?.ok) {
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    setLoading(true);
    const ok = await finalizeLogin();
    if (!ok) setLoading(false);
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otpCode.trim().length < 4) { setError("کد پیامک‌شده رو کامل وارد کن"); return; }

    setLoading(true);
    let res;
    try {
      res = await signIn("sms-2fa", { redirect: false, identifier, code: otpCode.trim(), remember: remember ? "1" : "0" });
    } catch {
      setLoading(false);
      setError("مشکلی در اتصال به سرور پیش اومد — دوباره امتحان کن");
      return;
    }
    if (res?.error || !res?.ok) { setLoading(false); setError("کد وارد‌شده درست نیست یا منقضی شده"); return; }
    const ok = await finalizeLogin();
    if (!ok) setLoading(false);
  }

  if (twoFactor) {
    return (
      <form onSubmit={submitOtp} className="auth-box">
        <AuthBackButton />
        <AuthBrandMark subtitle={"ورود دومرحله‌ای"} />

        <div className="section-note" style={{ marginBottom: 12 }}>
          {`یک کد به شماره‌ی ثبت‌شده‌ی حسابت (…${toEnDigits(twoFactor.phoneHint)}) پیامک شد. کد رو وارد کن.`}
        </div>

        <AuthField id="otp" label={"کد پیامک‌شده"} icon={<ShieldCheck size={15} />}>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
            maxLength={6}
            className="wsearch-newform-name"
            placeholder="- - - - -"
            value={otpCode}
            onChange={(e) => setOtpCode(toEnDigits(e.target.value).replace(/\D/g, ""))}
          />
        </AuthField>

        {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

        <button type="submit" className={`auth-full-btn${loading || success ? " is-busy" : ""}`} disabled={loading || success}>
          {loading || success ? <SpinnerCheck done={success} /> : "تایید و ورود"}
        </button>
        <button
          type="button"
          className="auth-forgot-link"
          style={{ marginTop: 12, background: "none", display: "block", width: "100%" }}
          onClick={() => { setTwoFactor(null); setError(null); }}
        >
          {"بازگشت"}
        </button>
      </form>
    );
  }

  return (
    <form ref={formRef} onSubmit={submitPassword} className="auth-box">
      <AuthBackButton />
      <AuthBrandMark subtitle={"ورود به پنل کاربری"} />

      <AuthField id="identifier" label={"یوزرنیم یا شماره همراه"} error={fieldErrors.identifier} icon={<User size={15} />} ref={identifierRef}>
        <input
          id="identifier"
          type="text"
          name="username"
          autoComplete="username"
          // موبایل حرف اول یوزرنیم رو بزرگ نکنه (گزارش کاربر) و اصلاح خودکار نزنه
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="wsearch-newform-name"
          placeholder="09123456789"
          value={identifier}
          onChange={(e) => { setIdentifier(e.target.value); if (e.target.value.trim()) clearError("identifier"); }}
        />
      </AuthField>

      <div style={{ marginTop: 14 }}>
        <AuthField
          id="password" label={"رمز عبور"} error={fieldErrors.password} ref={passwordRef}
          icon={<Lock size={15} />}
          endAction={<PasswordVisibilityToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />}
        >
          <input
            id="password"
            type={passwordVisible ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="wsearch-newform-name"
            placeholder={"رمز عبورت رو وارد کن"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (e.target.value) clearError("password"); }}
          />
        </AuthField>
      </div>

      <div className="auth-remember-row" data-anim-field>
        <label className="auth-remember-label">
          <TickButton shape="square" size={22} checked={remember} onToggle={() => setRemember((v) => !v)} />
          {"منو به‌یاد داشته باش"}
        </label>
        <Link href="/auth/forgot-password" className="auth-forgot-link">{"فراموشی رمز عبور؟"}</Link>
      </div>

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

      <button type="submit" className={`auth-full-btn${loading || success ? " is-busy" : ""}`} disabled={loading || success} data-anim-field>
        {loading || success ? <SpinnerCheck done={success} /> : "ورود"}
      </button>
    </form>
  );
}
