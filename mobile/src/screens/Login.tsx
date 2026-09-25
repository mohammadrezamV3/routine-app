import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import { useSync } from "@/sync/SyncProvider";
import { ApiError } from "@/sync/apiClient";
import { formatLastSync } from "@/sync/format";
import { toEnglishDigits } from "@/lib/digits";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

// ورود به حسابِ وب (/api/mobile/auth/*) + نمایِ حساب بعد از ورود (وضعیتِ
// سینک و خروج). روی متنِ خطای سرور منطق نمی‌سازیم — فقط status code.

const inputStyle = {
  background: "var(--input-bg)",
  borderColor: "var(--surface-line)",
  color: "var(--text)",
  height: 48,
} as const;

function loginErrorMessage(err: unknown, step: "password" | "2fa", online: boolean): string {
  if (!online) return "اینترنت در دسترس نیست — بعد از اتصال دوباره امتحان کن";
  if (err instanceof ApiError) {
    if (err.kind === "network" || err.kind === "timeout") return "اتصال به سرور برقرار نشد — اینترنت رو چک کن و دوباره امتحان کن";
    if (err.kind === "not_configured") return "اتصال به سرور در این نسخه پیکربندی نشده";
    if (err.status === 401 || err.status === 400) return step === "2fa" ? "کد نادرست یا منقضی است" : "اطلاعات ورود نادرست است";
    if (err.status === 429) return "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن";
    if (err.status === 502) return "ارسال پیامک ناموفق بود — کمی بعد دوباره امتحان کن";
    if (err.status >= 500) return "سرور موقتا در دسترس نیست — کمی بعد دوباره امتحان کن";
  }
  return "ورود ناموفق بود — دوباره امتحان کن";
}

export default function Login() {
  const sync = useSync();
  return (
    <div>
      <AppHeader title={sync.loggedIn ? "حساب کاربری" : "ورود"} showBack />
      <main className="px-5 pt-6">{sync.loggedIn ? <AccountView /> : <LoginForm />}</main>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { enabled, login, verify2fa, sessionExpired } = useSync();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"password" | "2fa">("password");
  const [phoneHint, setPhoneHint] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setError(null);
    if (!enabled) {
      setError("اتصال به سرور در این نسخه پیکربندی نشده");
      return;
    }
    if (step === "password" && (!identifier.trim() || !password)) {
      setError("شماره/نام کاربری و رمز عبور رو وارد کن");
      return;
    }
    const cleanCode = toEnglishDigits(code).replace(/\D/g, "");
    if (step === "2fa" && !/^\d{4,8}$/.test(cleanCode)) {
      setError("کد پیامک‌شده رو کامل وارد کن");
      return;
    }
    setBusy(true);
    try {
      if (step === "password") {
        const r = await login(toEnglishDigits(identifier), password);
        if (r.status === "2fa") {
          setPhoneHint(r.phoneHint);
          setStep("2fa");
          setPassword("");
          return;
        }
      } else {
        await verify2fa(toEnglishDigits(identifier), cleanCode);
      }
      navigate("/more", { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err, step, online));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <img src="/images/logo-icon-dark-theme.png" alt="آریون" className="mx-auto h-14 w-14" />
      </div>

      {sessionExpired && (
        <p className="mb-4 text-center font-vazir text-[13px] leading-6" style={{ color: "var(--accent-soft)" }}>
          نشستت منقضی شد — دوباره وارد شو. داده‌های این دستگاه سر جاشه.
        </p>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {step === "password" ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
                شماره موبایل، ایمیل یا نام کاربری
              </span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                inputMode="text"
                autoComplete="username"
                autoCapitalize="none"
                dir="ltr"
                className="rounded-card border px-4 font-vazir text-[14px]"
                style={inputStyle}
                placeholder="مثلا 0912xxxxxxx"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
                رمز عبور
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                dir="ltr"
                className="rounded-card border px-4 font-vazir text-[14px]"
                style={inputStyle}
                placeholder="••••••••"
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="font-vazir text-[13px] leading-6" style={{ color: "var(--muted)" }}>
              کدِ تأییدِ پیامک‌شده به <span dir="ltr">{phoneHint}</span>
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={8}
              className="rounded-card border px-4 text-center font-vazir text-[18px] tracking-[0.3em]"
              style={inputStyle}
              placeholder="------"
              autoFocus
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-center font-vazir text-[13px] leading-6" style={{ color: "var(--pnl-loss)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-card font-vazir text-[14.5px] font-semibold"
          style={{ background: "var(--accent)", color: "#fff", height: 48, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "در حال ورود…" : step === "2fa" ? "تأیید کد" : "ورود"}
        </button>

        {step === "2fa" && (
          <button
            type="button"
            onClick={() => {
              setStep("password");
              setCode("");
              setError(null);
            }}
            className="font-vazir text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            بازگشت و ورودِ دوباره
          </button>
        )}

        <p className="text-center font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
          {enabled
            ? "با ورود، داده‌های همین دستگاه با حسابت همگام می‌شه — چیزی پاک نمی‌شه."
            : "اتصال به حساب وب در این نسخه فعال نیست؛ اپ به‌صورت محلی کار می‌کنه."}
        </p>
      </form>
    </>
  );
}

function AccountView() {
  const navigate = useNavigate();
  const { user, status, lastSyncAt, error, rejectedCount, syncNow, logout } = useSync();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [wipeLocal, setWipeLocal] = useState(false);
  const [busy, setBusy] = useState(false);

  const statusText =
    status === "syncing"
      ? "در حال همگام‌سازی…"
      : status === "offline"
        ? "آفلاین — بعد از اتصال همگام می‌شه"
        : status === "error"
          ? error || "همگام‌سازی ناموفق بود"
          : `آخرین همگام‌سازی: ${formatLastSync(lastSyncAt)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="font-vazir text-[16px] font-semibold" style={{ color: "var(--text)" }}>
          {user?.name || "کاربر آریون"}
        </p>
        <p className="mt-1 font-vazir text-[13px]" style={{ color: status === "error" ? "var(--pnl-loss)" : "var(--muted)" }}>
          {statusText}
        </p>
        {rejectedCount > 0 && (
          <p className="mt-1 font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            {rejectedCount.toLocaleString("fa-IR")} تغییر توسطِ سرور پذیرفته نشد
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={status === "syncing"}
        className="rounded-card border font-vazir text-[14px]"
        style={{ borderColor: "var(--surface-line)", color: "var(--text)", height: 48 }}
      >
        همگام‌سازی الان
      </button>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="rounded-card border font-vazir text-[14px]"
        style={{ borderColor: "var(--surface-line)", color: "var(--pnl-loss)", height: 48 }}
      >
        خروج از حساب
      </button>

      <BottomSheet open={confirmOpen} onClose={() => !busy && setConfirmOpen(false)} title="خروج از حساب">
        <label className="flex items-start gap-3 py-2">
          <input
            type="checkbox"
            checked={wipeLocal}
            onChange={(e) => setWipeLocal(e.target.checked)}
            className="mt-1"
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="font-vazir text-[13.5px] leading-6" style={{ color: "var(--text)" }}>
            داده‌های این دستگاه هم پاک بشه
            <span className="block text-[12px]" style={{ color: "var(--muted)" }}>
              اگه تیک نزنی، روتین و تسک‌ها روی گوشی می‌مونن و دفعه‌ی بعد که وارد بشی دوباره همگام می‌شن.
            </span>
          </span>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await logout({ wipeLocal });
            } finally {
              setBusy(false);
              setConfirmOpen(false);
              navigate("/more", { replace: true });
            }
          }}
          className="mt-3 w-full rounded-card border font-vazir text-[14px] font-semibold"
          style={{ borderColor: "var(--pnl-loss)", color: "var(--pnl-loss)", height: 48, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "در حال خروج…" : "خروج"}
        </button>
      </BottomSheet>
    </div>
  );
}
