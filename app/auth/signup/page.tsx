"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, lastName, phone, username, password, birthDate, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "خطایی پیش آمد");
      return;
    }

    const loginRes = await signIn("credentials", { redirect: false, identifier: username, password });
    setLoading(false);
    if (loginRes?.error) {
      router.push("/auth/login");
      return;
    }
    router.push("/");
  }

  return (
    <section>
      <h1>ثبت‌نام</h1>

      <form onSubmit={submit} className="wsearch-newform" style={{ position: "static", transform: "none", opacity: 1, pointerEvents: "auto", width: "100%", maxWidth: "none", marginTop: 16 }}>
        <label htmlFor="name">نام</label>
        <input id="name" type="text" className="wsearch-newform-name" value={name} onChange={(e) => setName(e.target.value)} required />

        <label htmlFor="lastName" style={{ marginTop: 14 }}>نام خانوادگی</label>
        <input id="lastName" type="text" className="wsearch-newform-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />

        <label htmlFor="phone" style={{ marginTop: 14 }}>شماره موبایل</label>
        <input id="phone" type="tel" inputMode="numeric" className="wsearch-newform-name" value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" placeholder="09xxxxxxxxx" />

        <label htmlFor="birthDate" style={{ marginTop: 14 }}>تاریخ تولد</label>
        <input id="birthDate" type="date" className="wsearch-newform-name" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} dir="ltr" />

        <label htmlFor="email" style={{ marginTop: 14 }}>جیمیل (اختیاری)</label>
        <input id="email" type="email" className="wsearch-newform-name" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="you@gmail.com" />

        <label htmlFor="username" style={{ marginTop: 14 }}>یوزرنیم</label>
        <input id="username" type="text" className="wsearch-newform-name" value={username} onChange={(e) => setUsername(e.target.value)} required dir="ltr" />

        <label htmlFor="password" style={{ marginTop: 14 }}>رمز عبور (حداقل ۸ کاراکتر)</label>
        <input id="password" type="password" className="wsearch-newform-name" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />

        {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

        <div className="wsearch-newform-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <button type="submit" disabled={loading} style={{ borderRadius: 8, padding: "9px 20px", borderColor: "var(--accent)", color: "var(--accent)" }}>
            {loading ? "در حال ثبت‌نام…" : "ثبت‌نام"}
          </button>
        </div>
      </form>
      <div style={{ marginTop: 16, fontSize: 13, color: "var(--muted)" }}>
        قبلاً ثبت‌نام کردی؟ <Link href="/auth/login" style={{ color: "var(--accent)" }}>وارد شو</Link>
      </div>
    </section>
  );
}
