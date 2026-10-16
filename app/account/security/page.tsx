"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, MonitorSmartphone, Lock, UserX, Smartphone, Monitor, Search, Phone } from "lucide-react";
import { AuthField } from "@/components/AuthField";
import { AccountToggleRow } from "@/components/AccountRow";

import { AccountPageHead, AccountBlock, AccountSaveBar } from "@/components/AccountUI";
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
  const canSavePassword = !!currentPassword && !!newPassword && !!confirmPassword;

  return (
    <section>
      {/* تغییر یوزرنیم طبق درخواست کاربر فقط از «پروفایل» انجام می‌شه، نه این‌جا */}
      <AccountPageHead title={tr("امنیت", "Security")} hint={tr("رمز عبور، ورود دومرحله‌ای، دستگاه‌های فعال و حریم خصوصی", "Password, two-step login, active devices and privacy")} />

      <AccountBlock icon={<KeyRound />} title={tr("تغییر رمز عبور", "Change password")} index={0}>
        <form onSubmit={(e) => { e.preventDefault(); if (canSavePassword && !pwSaving) changePassword(); }} noValidate>
          <div className="ap-field-stack">
            <AuthField id="sec-pw-current" label={tr("رمز عبور فعلی", "Current password")} icon={<Lock size={16} />}>
              <input id="sec-pw-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
            </AuthField>
            <AuthField id="sec-pw-new" label={tr("رمز عبور جدید", "New password")} icon={<KeyRound size={16} />}>
              <input id="sec-pw-new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
            </AuthField>
            <AuthField id="sec-pw-confirm" label={tr("تکرار رمز عبور جدید", "Repeat the new password")} icon={<KeyRound size={16} />}>
              <input id="sec-pw-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="wsearch-newform-name" dir="ltr" />
            </AuthField>
          </div>
          {/* مثل دکمه‌ی ذخیره‌ی بقیه‌ی پنل: موقع ذخیره فقط دایره‌ی لودینگ،
              بعدش تیک — بدون هیچ متن «ذخیره شد». */}
          <AccountSaveBar submit saving={pwSaving} saved={pwSuccess} error={pwError} disabled={!canSavePassword} label={tr("ذخیره رمز جدید", "Save new password")} />
        </form>
      </AccountBlock>

      <AccountBlock icon={<ShieldCheck />} title={tr("ورود دومرحله‌ای", "Two-step login")} flush index={1}>
        <AccountToggleRow
          icon={<ShieldCheck size={17} />}
          label={tr("تایید ورود با پیامک", "Confirm login by SMS")}
          desc={tr("بعد از رمز درست، یک کد به شماره‌ی حسابت پیامک می‌شه.", "After the correct password, a code is sent by SMS to your account number.")}
          checked={!!twoFactor}
          onChange={toggleTwoFactor}
          disabled={twoFactor === null || twoFactorSaving}
        />
        {twoFactorError && <div className="field-error-msg ap-note" role="alert" style={{ display: "block" }}>{twoFactorError}</div>}
      </AccountBlock>

      <AccountBlock icon={<MonitorSmartphone />} title={tr("دستگاه‌های فعال", "Active devices")} flush index={2}>
        {!sessions ? (
          <div className="ap-empty is-loading"><Spinner size={16} /></div>
        ) : sessions.length === 0 ? (
          <div className="ap-empty">{tr("نشست فعالی پیدا نشد.", "No active sessions found.")}</div>
        ) : (
          <>
            <div className="ap-scroll">
              {sessions.map((s, i) => {
                const mobile = /Android|iPhone|iPad|Mobile/i.test(s.userAgent || "");
                return (
                  <div key={s.id} className="ap-row-wrap">
                    <div className="ap-row">
                      <span className="ap-row-icon" aria-hidden="true">{mobile ? <Smartphone size={17} /> : <Monitor size={17} />}</span>
                      <span className="ap-row-body">
                        <span className="ap-row-label">
                          {guessDevice(s.userAgent)}
                          {s.current && <span className="ap-chip is-accent" style={{ marginInlineStart: 8 }}>{tr("همین دستگاه", "This device")}</span>}
                        </span>
                        <span className="ap-row-desc">
                          {providerLabels()[s.provider || ""] || tr("ورود", "Login")} · {tr("آخرین فعالیت", "Last active")}{" "}
                          <span className="mono" dir="ltr">{formatDateTimeEn(s.lastSeenAt)}</span>
                        </span>
                      </span>
                      {!s.current && (
                        <span className="ap-row-end">
                          <button
                            type="button" className={`btn btn-danger btn-sm${sessionBusy === s.id ? " is-loading" : ""}`}
                            onClick={() => revokeSession(s.id)} disabled={sessionBusy === s.id} aria-busy={sessionBusy === s.id || undefined}
                          >
                            {sessionBusy === s.id && <Spinner className="btn-spinner" size={14} label={null} />}
                            {tr("بیرون انداختن", "Sign out")}
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {otherSessionCount > 0 && (
              <div className="ap-block-foot">
                <button
                  type="button" className={`btn btn-danger btn-sm${sessionBusy === "others" ? " is-loading" : ""}`}
                  onClick={revokeOthers} disabled={sessionBusy === "others"} aria-busy={sessionBusy === "others" || undefined}
                >
                  {sessionBusy === "others" && <Spinner className="btn-spinner" size={14} label={null} />}
                  {tr(`خروج از دستگاه‌های دیگر (${otherSessionCount})`, `Sign out other devices (${otherSessionCount})`)}
                </button>
              </div>
            )}
          </>
        )}
        {sessionError && <div className="field-error-msg ap-note" role="alert" style={{ display: "block" }}>{sessionError}</div>}
      </AccountBlock>

      <AccountBlock icon={<Lock />} title={tr("حریم خصوصی", "Privacy")} flush index={3}>
        <AccountToggleRow
          icon={<Search size={17} />}
          label={tr("قابل‌جست‌وجو بودن با یوزرنیم", "Discoverable by username")}
          desc={tr("خاموش یعنی توی جست‌وجوی دوستان دیده نمی‌شی", "When off, you do not appear in friend search")}
          checked={!!discoverable}
          onChange={toggleDiscoverable}
          disabled={discoverable === null}
        />
        <AccountToggleRow
          icon={<Phone size={17} />}
          label={tr("اشتراک‌گذاری شماره با دوستان", "Share phone number with friends")}
          desc={hasPhone ? tr("روشن یعنی شماره‌ات توی پاپ‌آپ پروفایل برای دوستانت دیده می‌شه", "When on, your number is visible to friends in your profile popup") : tr("اول باید شماره‌ای روی حسابت ثبت باشه", "Add a phone number to your account first")}
          checked={!!sharePhone}
          onChange={toggleSharePhone}
          disabled={sharePhone === null || !hasPhone}
          index={1}
        />

        <div className="ap-subhead">
          <UserX size={15} aria-hidden="true" /> {tr("افراد بلاک‌شده", "Blocked people")}
          {!!blocked?.length && <span className="ap-count mono" dir="ltr">{blocked.length}</span>}
        </div>
        {!blocked?.length ? (
          <div className="ap-note">
            {blocked === null ? tr("در حال بارگذاری…", "Loading…") : tr("کسی رو بلاک نکردی", "You have not blocked anyone")}
          </div>
        ) : (
          <div className="ap-scroll">
            {blocked.map((u) => (
              <div key={u.id} className="ap-person">
                <span className="ap-person-name"><GoldenName golden={u.golden} staff={u.staff}>{u.name || u.username || tr("کاربر", "User")}</GoldenName></span>
                <button
                  type="button" className={`btn btn-outline btn-sm${unblocking === u.id ? " is-loading" : ""}`}
                  onClick={() => unblock(u.id)} disabled={unblocking === u.id} aria-busy={unblocking === u.id || undefined}
                >
                  {unblocking === u.id && <Spinner className="btn-spinner" size={14} label={null} />}
                  {tr("آنبلاک", "Unblock")}
                </button>
              </div>
            ))}
          </div>
        )}
      </AccountBlock>
    </section>
  );
}
