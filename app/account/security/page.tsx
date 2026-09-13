"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, MonitorSmartphone, Lock, UserX, Loader2, Check, AlertTriangle } from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";

import { AccountPageHead, AccountBlock } from "@/components/AccountUI";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { toJalali, J_MONTHS } from "@/lib/jalali";

type BlockedUser = { id: string; name: string | null; username: string | null; avatarUrl: string | null };
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

  // افرادی که بلاک کرده — طبق درخواست صریح، از همین‌جا قابل آنبلاک
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    getAccount().then((res: AccountData) => {
      const u = res?.user as { discoverable?: boolean; twoFactorEnabled?: boolean } | undefined;
      setDiscoverable(u?.discoverable ?? true);
      setTwoFactor(u?.twoFactorEnabled ?? false);
    });
    loadBlocked();
  }, []);

  function loadBlocked() {
    fetch("/api/users/blocked").then((r) => (r.ok ? r.json() : { users: [] })).then((res) => setBlocked(res.users || []));
  }

  async function unblock(id: string) {
    setUnblocking(id);
    setBlocked((prev) => prev && prev.filter((u) => u.id !== id));
    await fetch(`/api/users/${id}/block`, { method: "DELETE" }).catch(() => {});
    setUnblocking(null);
  }

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
    // طبقِ درخواستِ صریح این صفحه جمع‌تر شد (acc-compact): فاصله‌ها کمتر و
    // توضیح‌ها یک‌خطی — قبلا بینِ چهار بخش فضای خالیِ زیادی می‌افتاد.
    <section className="acc-compact">
      {/* تغییر یوزرنیم طبق درخواست کاربر فقط از «پروفایل» انجام می‌شه، نه این‌جا */}
      <AccountPageHead title="امنیت" hint="رمز عبور، ورود دومرحله‌ای، دستگاه‌های فعال و حریم خصوصی" />

      <AccountBlock icon={<KeyRound size={15} />} title="تغییر رمز عبور" index={0}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="password" placeholder="رمز عبور فعلی" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder="رمز عبور جدید" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder="تکرار رمز عبور جدید" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          {pwError && <div className="field-error-msg" style={{ display: "block" }}>{pwError}</div>}
          {/* مثل دکمه‌ی ذخیره‌ی بقیه‌ی پنل: سمت چپ، موقعِ ذخیره فقط دایره‌ی
              لودینگ، بعدش تیک — بدونِ هیچ متنِ «ذخیره شد». */}
          <button
            className={`account-outline-btn acc-save-btn is-${pwSaving ? "saving" : pwSuccess ? "ok" : pwError ? "bad" : "idle"}`}
            onClick={changePassword}
            disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
            style={{ alignSelf: "flex-end" }}
            aria-label="ذخیره رمز جدید"
          >
            {pwSaving ? <Loader2 size={16} className="trade-spin" />
              : pwSuccess ? <Check size={16} />
              : pwError ? <AlertTriangle size={16} />
              : "ذخیره رمز جدید"}
          </button>
        </div>
      </AccountBlock>

      <AccountBlock icon={<ShieldCheck size={15} />} title="ورود دومرحله‌ای" index={1}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>تایید ورود با پیامک</div>
            <div className="item-line" style={{ marginTop: 2 }}>
              بعد از رمزِ درست، یک کد به شماره‌ی حسابت پیامک می‌شه.
            </div>
          </div>
          {twoFactor !== null && (
            <ToggleSwitch checked={twoFactor} onChange={toggleTwoFactor} label="ورود دومرحله‌ای" />
          )}
        </div>
        {twoFactorError && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{twoFactorError}</div>}
      </AccountBlock>

      <AccountBlock icon={<MonitorSmartphone size={15} />} title="دستگاه‌های فعال" index={2}>
        {!sessions ? (
          <div className="item-line is-loading">در حال بارگذاری…</div>
        ) : sessions.length === 0 ? (
          <div className="item-line empty">نشست فعالی پیدا نشد.</div>
        ) : (
          <>
          <div className="acc-scroll-box">
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
          </div>
          {otherSessionCount > 0 && (
            <button className="account-outline-btn" onClick={revokeOthers} disabled={sessionBusy === "others"} style={{ marginTop: 10, display: "block", marginInlineStart: "auto" }}>
              {sessionBusy === "others" ? "در حال انجام…" : `خروج از دستگاه‌های دیگر (${otherSessionCount})`}
            </button>
          )}
          </>
        )}
        {sessionError && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{sessionError}</div>}
      </AccountBlock>

      <AccountBlock icon={<Lock size={15} />} title="حریم خصوصی" index={3}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>قابل‌جست‌وجو بودن با یوزرنیم</div>
            <div className="item-line" style={{ marginTop: 2 }}>خاموش یعنی توی جست‌وجوی دوستان دیده نمی‌شی</div>
          </div>
          {discoverable !== null && (
            <ToggleSwitch checked={discoverable} onChange={toggleDiscoverable} label="قابل‌جست‌وجو بودن" />
          )}
        </div>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            <UserX size={15} /> افراد بلاک‌شده
          </div>
          {!blocked?.length ? (
            <div className="item-line" style={{ marginTop: 6 }}>
              {blocked === null ? "در حال بارگذاری…" : "کسی رو بلاک نکردی"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {blocked.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: "var(--text)" }}>{u.name || u.username || "کاربر"}</span>
                  <button
                    type="button"
                    className="account-outline-btn"
                    style={{ padding: "5px 12px", fontSize: 11.5 }}
                    onClick={() => unblock(u.id)}
                    disabled={unblocking === u.id}
                  >
                    آنبلاک
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccountBlock>
    </section>
  );
}
