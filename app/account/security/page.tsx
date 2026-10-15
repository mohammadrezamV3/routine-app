"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, MonitorSmartphone, Lock, UserX, Check, AlertTriangle } from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";

import { AccountPageHead, AccountBlock } from "@/components/AccountUI";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { formatTehranDateTime } from "@/lib/tehranTime";
import { GoldenName } from "@/components/GoldenName";
import { Spinner } from "@/components/Spinner";
import { tr } from "@/lib/i18n";

type BlockedUser = { id: string; name: string | null; username: string | null; avatarUrl: string | null; golden?: boolean; staff?: boolean };
type DeviceSession = {
  id: string; provider: string | null; ip: string | null; userAgent: string | null;
  createdAt: string; lastSeenAt: string; current: boolean;
};

const providerLabels = (): Record<string, string> => ({
  credentials: tr(tr("ورود با رمز عبور", "Password login"), "Password login"),
  google: tr(tr("ورود با گوگل", "Google login"), "Google login"),
  "email-otp": tr(tr("ورود با کد ایمیل", "Email code login"), "Email code login"),
  "sms-2fa": tr(tr("ورود دومرحله‌ای", "Two-step login"), "Two-step login"),
});

// یه حدس خیلی سبک از روی User-Agent — فقط برای نمایش خوانا، نه parsing دقیق
function guessDevice(ua: string | null): string {
  if (!ua) return tr("دستگاه نامشخص", "Unknown device");
  const isMobile = /Android|iPhone|iPad/i.test(ua);
  let browser = tr("مرورگر", "Browser");
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  const os = /Android/i.test(ua) ? tr("اندروید", "Android") : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? tr("ویندوز", "Windows") : /Mac OS/i.test(ua) ? tr("مک", "Mac") : /Linux/i.test(ua) ? tr("لینوکس", "Linux") : "";
  return `${browser}${os ? " · " + os : ""}${isMobile ? tr(" · موبایل", " · Mobile") : ""}`;
}

// تاریخ/ساعت با ارقام **انگلیسی** — `toLocaleString("fa-IR")` ارقام فارسی
// می‌داد که کاربر صریحا نخواسته. ماه جلالی به حروف نوشته می‌شه تا با بقیه‌ی
// تاریخ‌های اپ هم‌شکل بمونه.
function formatDateTimeEn(iso: string): string {
  return formatTehranDateTime(iso); // همیشه به وقت تهران، نه ساعت مرورگر
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

  // اشتراک‌گذاری شماره با دوستان — طبق درخواست صریح، توی همین بخش
  // حریم خصوصی. بدون شماره‌ی ثبت‌شده معنا ندارد، پس سوییچش غیرفعال می‌ماند.
  const [hasPhone, setHasPhone] = useState(false);
  const [sharePhone, setSharePhone] = useState<boolean | null>(null);
  const [sharePhoneSaving, setSharePhoneSaving] = useState(false);

  // افرادی که بلاک کرده — طبق درخواست صریح، از همین‌جا قابل آنبلاک
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    getAccount().then((res: AccountData) => {
      const u = res?.user as { discoverable?: boolean; twoFactorEnabled?: boolean; sharePhone?: boolean; phone?: string | null } | undefined;
      setDiscoverable(u?.discoverable ?? true);
      setTwoFactor(u?.twoFactorEnabled ?? false);
      setHasPhone(!!u?.phone);
      setSharePhone(u?.sharePhone ?? false);
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
      if (!res.ok) { setSessionError(tr("بیرون‌انداختن این دستگاه ناموفق بود", "Could not sign this device out")); return; }
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
      if (!res.ok) { setSessionError(tr("بیرون‌انداختن دستگاه‌های دیگر ناموفق بود", "Could not sign the other devices out")); return; }
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
      if (!res.ok) { setTwoFactorError(data.error || tr("خطایی پیش اومد", "Something went wrong")); return; }
      setTwoFactor(next);
      invalidateAccountCache();
    } catch {
      setTwoFactorError(tr("مشکلی در اتصال به سرور پیش اومد", "Could not reach the server"));
    } finally {
      setTwoFactorSaving(false);
    }
  }

  async function toggleSharePhone(next: boolean) {
    if (sharePhoneSaving || !hasPhone) return;
    setSharePhoneSaving(true);
    setSharePhone(next);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharePhone: next }),
      });
      if (!res.ok) setSharePhone(!next);
      else invalidateAccountCache();
    } catch {
      setSharePhone(!next);
    } finally {
      setSharePhoneSaving(false);
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
    if (newPassword !== confirmPassword) { setPwError(tr("رمز جدید با تکرارش یکی نیست", "The new password and its confirmation do not match")); return; }
    setPwSaving(true);
    try {
      // کلید رمزگذاری سرتاسری با رمز تازه دوباره بسته‌بندی می‌شود (روی دستگاه؛ lib/e2ee/client.ts)
      const commitE2EE = await import("@/lib/e2ee/client").then((m) => m.prepareE2EEPasswordChange(currentPassword, newPassword)).catch(() => null);
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPwError(data.error || tr("خطایی پیش اومد", "Something went wrong")); return; }
      if (commitE2EE) await commitE2EE().catch(() => {});
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 2500);
    } catch {
      setPwError(tr("مشکلی در اتصال به سرور پیش اومد", "Could not reach the server"));
    } finally {
      setPwSaving(false);
    }
  }

  const otherSessionCount = sessions ? sessions.filter((s) => !s.current).length : 0;

  return (
    // طبق درخواست صریح این صفحه جمع‌تر شد (acc-compact): فاصله‌ها کمتر و
    // توضیح‌ها یک‌خطی — قبلا بین چهار بخش فضای خالی زیادی می‌افتاد.
    <section className="acc-compact">
      {/* تغییر یوزرنیم طبق درخواست کاربر فقط از «پروفایل» انجام می‌شه، نه این‌جا */}
      <AccountPageHead title={tr("امنیت", "Security")} hint={tr("رمز عبور، ورود دومرحله‌ای، دستگاه‌های فعال و حریم خصوصی", "Password, two-step login, active devices and privacy")} />

      <AccountBlock icon={<KeyRound size={15} />} title={tr("تغییر رمز عبور", "Change password")} index={0}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="password" placeholder={tr("رمز عبور فعلی", "Current password")} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder={tr("رمز عبور جدید", "New password")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          <input type="password" placeholder={tr("تکرار رمز عبور جدید", "Repeat the new password")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
          {pwError && <div className="field-error-msg" style={{ display: "block" }}>{pwError}</div>}
          {/* مثل دکمه‌ی ذخیره‌ی بقیه‌ی پنل: سمت چپ، موقع ذخیره فقط دایره‌ی
              لودینگ، بعدش تیک — بدون هیچ متن «ذخیره شد». */}
          <button
            className={`account-outline-btn acc-save-btn is-${pwSaving ? "saving" : pwSuccess ? "ok" : pwError ? "bad" : "idle"}`}
            onClick={changePassword}
            disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
            style={{ alignSelf: "flex-end" }}
            aria-label={tr("ذخیره رمز جدید", "Save new password")}
          >
            {pwSaving ? <Spinner size={15} />
              : pwSuccess ? <Check size={16} />
              : pwError ? <AlertTriangle size={16} />
              : tr("ذخیره رمز جدید", "Save new password")}
          </button>
        </div>
      </AccountBlock>

      <AccountBlock icon={<ShieldCheck size={15} />} title={tr("ورود دومرحله‌ای", "Two-step login")} index={1}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{tr("تایید ورود با پیامک", "Confirm login by SMS")}</div>
            <div className="item-line" style={{ marginTop: 2 }}>
              {tr("بعد از رمز درست، یک کد به شماره‌ی حسابت پیامک می‌شه.", "After the correct password, a code is sent by SMS to your account number.")}
            </div>
          </div>
          {twoFactor !== null && (
            <ToggleSwitch checked={twoFactor} onChange={toggleTwoFactor} label={tr("ورود دومرحله‌ای", "Two-step login")} />
          )}
        </div>
        {twoFactorError && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{twoFactorError}</div>}
      </AccountBlock>

      <AccountBlock icon={<MonitorSmartphone size={15} />} title={tr("دستگاه‌های فعال", "Active devices")} index={2}>
        {!sessions ? (
          <div className="item-line is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
        ) : sessions.length === 0 ? (
          <div className="item-line empty">{tr("نشست فعالی پیدا نشد.", "No active sessions found.")}</div>
        ) : (
          <>
          <div className="acc-scroll-box">
            {sessions.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600 }}>
                    {guessDevice(s.userAgent)}
                    {s.current && <span style={{ color: "var(--accent)", fontWeight: 700 }}>{tr(" · همین دستگاه", " · This device")}</span>}
                  </div>
                  <div className="item-line" style={{ marginTop: 2 }}>
                    {providerLabels()[s.provider || ""] || tr("ورود", "Login")} · {tr("آخرین فعالیت", "Last active")}{" "}
                    <span className="mono" dir="ltr">{formatDateTimeEn(s.lastSeenAt)}</span>
                  </div>
                </div>
                {!s.current && (
                  <button className="account-outline-btn muted" onClick={() => revokeSession(s.id)} disabled={sessionBusy === s.id}>
                    {sessionBusy === s.id ? "…" : tr("بیرون انداختن", "Sign out")}
                  </button>
                )}
              </div>
            ))}
          </div>
          {otherSessionCount > 0 && (
            <button className="account-outline-btn" onClick={revokeOthers} disabled={sessionBusy === "others"} style={{ marginTop: 10, display: "block", marginInlineStart: "auto" }}>
              {sessionBusy === "others" ? tr("در حال انجام…", "Working…") : tr(`خروج از دستگاه‌های دیگر (${otherSessionCount})`, `Sign out other devices (${otherSessionCount})`)}
            </button>
          )}
          </>
        )}
        {sessionError && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{sessionError}</div>}
      </AccountBlock>

      <AccountBlock icon={<Lock size={15} />} title={tr("حریم خصوصی", "Privacy")} index={3}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{tr("قابل‌جست‌وجو بودن با یوزرنیم", "Discoverable by username")}</div>
            <div className="item-line" style={{ marginTop: 2 }}>{tr("خاموش یعنی توی جست‌وجوی دوستان دیده نمی‌شی", "When off, you do not appear in friend search")}</div>
          </div>
          {discoverable !== null && (
            <ToggleSwitch checked={discoverable} onChange={toggleDiscoverable} label={tr("قابل‌جست‌وجو بودن", "Discoverable")} />
          )}
        </div>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{tr("اشتراک‌گذاری شماره با دوستان", "Share phone number with friends")}</div>
            <div className="item-line" style={{ marginTop: 2 }}>
              {hasPhone ? tr("روشن یعنی شماره‌ات توی پاپ‌آپ پروفایل برای دوستانت دیده می‌شه", "When on, your number is visible to friends in your profile popup") : tr("اول باید شماره‌ای روی حسابت ثبت باشه", "Add a phone number to your account first")}
            </div>
          </div>
          {sharePhone !== null && (
            <ToggleSwitch checked={sharePhone} onChange={toggleSharePhone} disabled={!hasPhone} label={tr("اشتراک‌گذاری شماره", "Share phone number")} />
          )}
        </div>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            <UserX size={15} /> {tr("افراد بلاک‌شده", "Blocked people")}
          </div>
          {!blocked?.length ? (
            <div className="item-line" style={{ marginTop: 6 }}>
              {blocked === null ? tr("در حال بارگذاری…", "Loading…") : tr("کسی رو بلاک نکردی", "You have not blocked anyone")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {blocked.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: "var(--text)" }}><GoldenName golden={u.golden} staff={u.staff}>{u.name || u.username || tr("کاربر", "User")}</GoldenName></span>
                  <button
                    type="button"
                    className="account-outline-btn"
                    style={{ padding: "5px 12px", fontSize: 11.5 }}
                    onClick={() => unblock(u.id)}
                    disabled={unblocking === u.id}
                  >
                    {tr("آنبلاک", "Unblock")}
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
