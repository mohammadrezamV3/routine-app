"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, MonitorSmartphone, History } from "lucide-react";

type LoginEvent = { id: string; provider: string; ip: string | null; userAgent: string | null; createdAt: string };

const PROVIDER_FA: Record<string, string> = { credentials: "ورود با رمز عبور", google: "ورود با گوگل" };

// یه حدسِ خیلی سبک از روی User-Agent — فقط برای نمایشِ خوانا، نه parsing دقیق
function guessDevice(ua: string | null): string {
  if (!ua) return "نامشخص";
  const isMobile = /Android|iPhone|iPad/i.test(ua);
  let browser = "مرورگر";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  const os = /Android/i.test(ua) ? "اندروید" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "ویندوز" : /Mac OS/i.test(ua) ? "مک" : /Linux/i.test(ua) ? "لینوکس" : "";
  return `${browser}${os ? " · " + os : ""}${isMobile ? " · موبایل" : ""}`;
}

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [events, setEvents] = useState<LoginEvent[] | null>(null);

  useEffect(() => {
    fetch("/api/account/login-events").then((r) => (r.ok ? r.json() : { events: [] })).then((res) => setEvents(res.events || []));
  }, []);

  async function changePassword() {
    setPwError(null);
    if (newPassword !== confirmPassword) { setPwError("رمزِ جدید با تکرارش یکی نیست"); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPwError(data.error || "خطایی پیش اومد"); return; }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 2500);
    } catch {
      setPwError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <section>
      <h1>امنیت</h1>
      <div className="account-content-hint">مدیریتِ رمز عبور و سابقه‌ی ورودهای حساب</div>

      <div className="tm-extra" style={{ marginTop: 0 }}>
        <div className="domain-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <KeyRound size={13} />
          تغییر رمز عبور
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <input type="password" placeholder="رمز عبور فعلی" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder="رمز عبور جدید" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder="تکرار رمز عبور جدید" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          {pwError && <div className="field-error-msg" style={{ display: "block" }}>{pwError}</div>}
          {pwSuccess && <div className="account-save-toast">رمز عبور با موفقیت تغییر کرد.</div>}
          <button
            onClick={changePassword}
            disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
            style={{ alignSelf: "flex-start", borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            {pwSaving ? "در حال ذخیره…" : "ذخیره رمز جدید"}
          </button>
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MonitorSmartphone size={13} />
          دستگاه‌های فعال
        </div>
        <div className="item-line">همین دستگاهی که الان باهاش وارد شدی — فعلاً امکانِ دیدن/خروج از دستگاه‌های دیگه از راه دور در دسترس نیست.</div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <History size={13} />
          ورودهای اخیر
        </div>
        {!events ? (
          <div className="item-line">در حال بارگذاری…</div>
        ) : events.length === 0 ? (
          <div className="item-line empty">هنوز ورودی ثبت نشده.</div>
        ) : (
          <div className="about-list" style={{ marginTop: 4 }}>
            {events.map((ev) => (
              <div key={ev.id} className="about-row">
                <span className="about-label">{PROVIDER_FA[ev.provider] || ev.provider} · {guessDevice(ev.userAgent)}</span>
                <span className="mono" dir="ltr" style={{ color: "var(--muted2)", fontSize: 11 }}>
                  {new Date(ev.createdAt).toLocaleString("fa-IR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tm-extra">
        <div className="domain-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={13} />
          ورود دومرحله‌ای
        </div>
        <div className="task" style={{ opacity: .55 }}>
          <div className="check" />
          <div>
            <div className="task-name">فعال‌سازیِ ورودِ دومرحله‌ای</div>
            <div className="item-line" style={{ marginTop: 2 }}>به‌زودی</div>
          </div>
        </div>
      </div>
    </section>
  );
}
