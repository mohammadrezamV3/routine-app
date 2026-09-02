"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, MonitorSmartphone, History, Lock } from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { AccountSectionCard } from "@/components/AccountSectionCard";
import { AccountBackButton } from "@/components/AccountBackButton";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { toJalali, J_MONTHS } from "@/lib/jalali";

type LoginEvent = { id: string; provider: string; ip: string | null; userAgent: string | null; createdAt: string };
type DeviceSession = {
  id: string; provider: string | null; ip: string | null; userAgent: string | null;
  createdAt: string; lastSeenAt: string; current: boolean;
};

const PROVIDER_FA: Record<string, string> = {
  credentials: "ورود با رمز عبور",
  google: "ورود با گوگل",
  "email-otp": "ورود با کد ایمیل",
  "sms-2fa": "ورود دومرحله‌ای",
};

// یه حدس خیلی سبک از روی User-Agent — فقط برای نمایش خوانا، نه parsing دقیق
function guessDevice(ua: string | null): string {
  if (!ua) return "دستگاه نامشخص";
  const isMobile = /Android|iPhone|iPad/i.test(ua);
  let browser = "مرورگر";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  const os = /Android/i.test(ua) ? "اندروید" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "ویندوز" : /Mac OS/i.test(ua) ? "مک" : /Linux/i.test(ua) ? "لینوکس" : "";
  return `${browser}${os ? " · " + os : ""}${isMobile ? " · موبایل" : ""}`;
}

// تاریخ/ساعت با ارقام **انگلیسی** — `toLocaleString("fa-IR")` ارقام فارسی
// می‌داد که کاربر صریحا نخواسته. ماه جلالی به حروف نوشته می‌شه تا با بقیه‌ی
// تاریخ‌های اپ هم‌شکل بمونه.
function formatDateTimeEn(iso: string): string {
  const d = new Date(iso);
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${jd} ${J_MONTHS[jm - 1]} · ${hh}:${mm}`;
}

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [events, setEvents] = useState<LoginEvent[] | null>(null);
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [sessionBusy, setSessionBusy] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [twoFactor, setTwoFactor] = useState<boolean | null>(null);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // «قابل‌جست‌وجو بودن با یوزرنیم» — از تنظیمات به این‌جا منتقل شد؛ یک
  // تنظیم حریم خصوصیه، نه یک تنظیم عمومی نمایش.
  const [discoverable, setDiscoverable] = useState<boolean | null>(null);
  const [discoverableSaving, setDiscoverableSaving] = useState(false);

  useEffect(() => {
    fetch("/api/account/login-events").then((r) => (r.ok ? r.json() : { events: [] })).then((res) => setEvents(res.events || []));
    loadSessions();
    getAccount().then((res: AccountData) => {
      const u = res?.user as { discoverable?: boolean; twoFactorEnabled?: boolean } | undefined;
      setDiscoverable(u?.discoverable ?? true);
      setTwoFactor(u?.twoFactorEnabled ?? false);
    });
  }, []);

  function loadSessions() {
    fetch("/api/account/sessions")
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((res) => setSessions(res.sessions || []))
      .catch(() => setSessions([]));
  }

  async function revokeSession(id: string) {
    setSessionBusy(id);
    setSessionError(null);
    try {
      const res = await fetch(`/api/account/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { setSessionError("بیرون‌انداختن این دستگاه ناموفق بود"); return; }
      setSessions((prev) => prev && prev.filter((s) => s.id !== id));
    } finally {
      setSessionBusy(null);
    }
  }

  async function revokeOthers() {
    setSessionBusy("others");
    setSessionError(null);
    try {
      const res = await fetch("/api/account/sessions?others=1", { method: "DELETE" });
      if (!res.ok) { setSessionError("بیرون‌انداختن دستگاه‌های دیگر ناموفق بود"); return; }
      setSessions((prev) => prev && prev.filter((s) => s.current));
    } finally {
      setSessionBusy(null);
    }
  }

  async function toggleTwoFactor(next: boolean) {
    if (twoFactorSaving) return;
    setTwoFactorSaving(true);
    setTwoFactorError(null);
    try {
      const res = await fetch("/api/account/two-factor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setTwoFactorError(data.error || "خطایی پیش اومد"); return; }
      setTwoFactor(next);
      invalidateAccountCache();
    } catch {
      setTwoFactorError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setTwoFactorSaving(false);
    }
  }

  async function toggleDiscoverable(next: boolean) {
    if (discoverableSaving) return;
    setDiscoverableSaving(true);
    setDiscoverable(next);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoverable: next }),
      });
      if (!res.ok) setDiscoverable(!next);
      else invalidateAccountCache();
    } catch {
      setDiscoverable(!next);
    } finally {
      setDiscoverableSaving(false);
    }
  }

  async function changePassword() {
    setPwError(null);
    if (newPassword !== confirmPassword) { setPwError("رمز جدید با تکرارش یکی نیست"); return; }
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

  const otherSessionCount = sessions ? sessions.filter((s) => !s.current).length : 0;

  return (
    <section>
      <AccountBackButton />
      <h1>امنیت</h1>
      {/* تغییر یوزرنیم طبق درخواست کاربر فقط از «پروفایل» انجام می‌شه، نه این‌جا */}
      <div className="account-content-hint">رمز عبور، ورود دومرحله‌ای، دستگاه‌های فعال و حریم خصوصی</div>

      <AccountSectionCard icon={<KeyRound size={16} />} title="تغییر رمز عبور" index={0}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="password" placeholder="رمز عبور فعلی" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder="رمز عبور جدید" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder="تکرار رمز عبور جدید" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          {pwError && <div className="field-error-msg" style={{ display: "block" }}>{pwError}</div>}
          {pwSuccess && <div className="account-save-toast" style={{ marginTop: 0 }}>رمز عبور با موفقیت تغییر کرد.</div>}
          <button
            className="account-outline-btn"
            onClick={changePassword}
            disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
            style={{ alignSelf: "flex-start" }}
          >
            {pwSaving ? "در حال ذخیره…" : "ذخیره رمز جدید"}
          </button>
        </div>
      </AccountSectionCard>

      <AccountSectionCard icon={<ShieldCheck size={16} />} title="ورود دومرحله‌ای" index={1}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>تایید ورود با پیامک</div>
            <div className="item-line" style={{ marginTop: 2 }}>
              با روشن‌بودنش، هر بار بعد از رمز درست یک کد به شماره‌ی حسابت پیامک می‌شه و بدون اون کد ورود انجام نمی‌شه.
            </div>
          </div>
          {twoFactor !== null && (
            <ToggleSwitch checked={twoFactor} onChange={toggleTwoFactor} label="ورود دومرحله‌ای" />
          )}
        </div>
        {twoFactorError && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{twoFactorError}</div>}
      </AccountSectionCard>

      <AccountSectionCard icon={<MonitorSmartphone size={16} />} title="دستگاه‌های فعال" index={2}>
        {!sessions ? (
          <div className="item-line">در حال بارگذاری…</div>
        ) : sessions.length === 0 ? (
          <div className="item-line empty">نشست فعالی پیدا نشد.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600 }}>
                    {guessDevice(s.userAgent)}
                    {s.current && <span style={{ color: "var(--accent)", fontWeight: 700 }}> · همین دستگاه</span>}
                  </div>
                  <div className="item-line" style={{ marginTop: 2 }}>
                    {PROVIDER_FA[s.provider || ""] || "ورود"} · آخرین فعالیت{" "}
                    <span className="mono" dir="ltr">{formatDateTimeEn(s.lastSeenAt)}</span>
                  </div>
                </div>
                {!s.current && (
                  <button className="account-outline-btn muted" onClick={() => revokeSession(s.id)} disabled={sessionBusy === s.id}>
                    {sessionBusy === s.id ? "…" : "بیرون انداختن"}
                  </button>
                )}
              </div>
            ))}
            {otherSessionCount > 0 && (
              <button className="account-outline-btn" onClick={revokeOthers} disabled={sessionBusy === "others"} style={{ alignSelf: "flex-start" }}>
                {sessionBusy === "others" ? "در حال انجام…" : `خروج از همه‌ی دستگاه‌های دیگر (${otherSessionCount})`}
              </button>
            )}
          </div>
        )}
        {sessionError && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{sessionError}</div>}
      </AccountSectionCard>

      <AccountSectionCard icon={<History size={16} />} title="ورودهای اخیر" index={3}>
        {!events ? (
          <div className="item-line">در حال بارگذاری…</div>
        ) : events.length === 0 ? (
          <div className="item-line empty">هنوز ورودی ثبت نشده.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map((ev) => (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text)" }}>{PROVIDER_FA[ev.provider] || ev.provider} · {guessDevice(ev.userAgent)}</span>
                <span className="mono" dir="ltr" style={{ color: "var(--muted2)", fontSize: 11 }}>
                  {formatDateTimeEn(ev.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </AccountSectionCard>

      <AccountSectionCard icon={<Lock size={16} />} title="حریم خصوصی" index={4}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>قابل‌جست‌وجو بودن با یوزرنیم</div>
            <div className="item-line" style={{ marginTop: 2 }}>خاموش‌کردنش یعنی توی جست‌وجوی دوستان دیده نمی‌شی</div>
          </div>
          {discoverable !== null && (
            <ToggleSwitch checked={discoverable} onChange={toggleDiscoverable} label="قابل‌جست‌وجو بودن" />
          )}
        </div>
      </AccountSectionCard>
    </section>
  );
}
