"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, identifier, password });
    setLoading(false);
    if (res?.error) {
      setError("یوزرنیم/شماره موبایل یا رمز عبور اشتباه است");
      return;
    }
    router.push("/");
  }

  return (
    <section>
      <h1>ورود</h1>
      <form onSubmit={submit} className="wsearch-newform" style={{ position: "static", transform: "none", opacity: 1, pointerEvents: "auto", width: "100%", maxWidth: "none", marginTop: 16 }}>
        <label htmlFor="identifier">یوزرنیم یا شماره موبایل</label>
        <input
          id="identifier"
          type="text"
          className="wsearch-newform-name"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <label htmlFor="password" style={{ marginTop: 14 }}>رمز عبور</label>
        <input
          id="password"
          type="password"
          className="wsearch-newform-name"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>
        )}
        <div className="wsearch-newform-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <button type="submit" disabled={loading} style={{ borderRadius: 8, padding: "9px 20px", borderColor: "var(--accent)", color: "var(--accent)" }}>
            {loading ? "در حال ورود…" : "ورود"}
          </button>
        </div>
      </form>
      <div style={{ marginTop: 16, fontSize: 13, color: "var(--muted)" }}>
        حساب نداری؟ <Link href="/auth/signup" style={{ color: "var(--accent)" }}>ثبت‌نام کن</Link>
      </div>
    </section>
  );
}
