import { useState } from "react";
import AppHeader from "@/components/AppHeader";

// فقط UI — بدون هیچ فراخوانی شبکه‌ای. اتصال واقعی به /api/auth بک‌اند
// Next.js در فاز بعدی (لاگین/سینک) اضافه می‌شه.
export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <AppHeader title="ورود" showBack />
      <main className="px-5 pt-6">
        <div className="mb-6 text-center">
          <img src="/images/logo-icon-dark-theme.png" alt="آریون" className="mx-auto h-14 w-14" />
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              شماره موبایل یا نام کاربری
            </span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              inputMode="text"
              autoComplete="username"
              className="rounded-card border px-4 font-vazir text-[14px]"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--surface-line)",
                color: "var(--text)",
                height: 48,
              }}
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
              className="rounded-card border px-4 font-vazir text-[14px]"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--surface-line)",
                color: "var(--text)",
                height: 48,
              }}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-card font-vazir text-[14.5px] font-semibold"
            style={{ background: "var(--accent)", color: "#fff", height: 48 }}
          >
            ورود
          </button>

          <p className="text-center font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
            اتصال به حساب وب — به‌زودی فعال می‌شه.
          </p>
        </form>
      </main>
    </div>
  );
}
