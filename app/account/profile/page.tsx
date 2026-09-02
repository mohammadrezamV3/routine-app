"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Trash2, Mail, Phone, Cake, VenetianMask, Ruler, Weight, User as UserIcon } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AuthField } from "@/components/AuthField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { JalaliDate, formatJalali, jalaliToGregorianApprox, toJalali, isoLocal } from "@/lib/jalali";
import { resizeImageToDataUrl } from "@/lib/avatarUpload";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { isValidEmail } from "@/lib/validate";
import { NumberInput } from "@/components/NumberInput";

type ProfileUser = {
  email: string | null;
  username: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  subscriptions: { status: string; currentPeriodEnd: string; plan: { nameFa: string; key: string } }[];
};

const GENDER_OPTIONS: { value: "male" | "female" | "unset"; label: string }[] = [
  { value: "male", label: "مرد" },
  { value: "female", label: "زن" },
  { value: "unset", label: "نامشخص" },
];

const SUB_STATUS_FA: Record<string, string> = {
  TRIAL: "دوره آزمایشی",
  ACTIVE: "فعال",
  PAST_DUE: "پرداخت معوق",
  CANCELED: "لغوشده",
  EXPIRED: "منقضی",
};

export default function AccountProfilePage() {
  const [data, setData] = useState<ProfileUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // فیلدهای «باز» — همیشه قابل‌ویرایش‌ن (نه پشتِ یه حالتِ ویرایشِ جدا)، فقط
  // با یه دکمه‌ی «ذخیره»ی مشترک ثبت می‌شن. نام/نام‌خانوادگی/شماره موبایل
  // این‌جا نیستن — همیشه قفل/فقط‌نمایشی‌ن.
  const [gender, setGender] = useState<"male" | "female" | "unset">("unset");
  const [birthDate, setBirthDate] = useState<JalaliDate | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // فلوی تغییرِ ایمیل — کد به ایمیلِ جدید فرستاده می‌شه، تا وارد‌نکردنِ کدِ
  // درست، ایمیلِ حساب عوض نمی‌شه (جلوگیری از قبضه‌کردنِ حساب با یه سشنِ سرقتی).
  const [emailChanging, setEmailChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as ProfileUser | undefined;
      if (u) applyUser(u);
    });
    fetch("/api/account/avatar").then((r) => (r.ok ? r.json() : null)).then((res) => { if (res?.avatarUrl) setAvatarUrl(res.avatarUrl); });
  }, []);

  function applyUser(u: ProfileUser) {
    setData(u);
    setGender(u.gender === "male" || u.gender === "female" ? u.gender : "unset");
    setBirthDate(u.birthDate ? (() => { const d = new Date(u.birthDate as string); return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); })() : null);
    setHeightCm(u.heightCm != null ? String(u.heightCm) : "");
    setWeightKg(u.weightKg != null ? String(u.weightKg) : "");
  }

  async function uploadAvatar(file: File) {
    setAvatarError(null);
    setAvatarSaving(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const res = await fetch("/api/account/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setAvatarError(resData.error || "خطایی پیش اومد"); return; }
      setAvatarUrl(resData.avatarUrl);
      // بدونِ این خط، بقیه‌ی اپ (مثلاً آواتارِ منوی همبرگری) همچنان
      // عکسِ کهنه رو نشون می‌داد — چون /lib/preload.ts یه اسنپ‌شاتِ
      // bootstrapی که موقعِ لودِ صفحه گرفته شده رو کش می‌کنه و avatar-updated
      // به‌تنهایی این کش رو باطل نمی‌کنه.
      invalidateAccountCache();
      window.dispatchEvent(new Event("avatar-updated"));
    } catch {
      setAvatarError("خطا در پردازش عکس");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function removeAvatar() {
    setAvatarSaving(true);
    await fetch("/api/account/avatar", { method: "DELETE" });
    setAvatarUrl(null);
    invalidateAccountCache();
    setAvatarSaving(false);
    window.dispatchEvent(new Event("avatar-updated"));
  }

  async function saveProfile() {
    setSaving(true);
    setSaveError(null);
    try {
      const height = heightCm.trim() ? Number(heightCm) : null;
      const weight = weightKg.trim() ? Number(weightKg) : null;
      if (height != null && (!Number.isFinite(height) || height < 100 || height > 250)) {
        setSaveError("قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشه"); return;
      }
      if (weight != null && (!Number.isFinite(weight) || weight < 20 || weight > 300)) {
        setSaveError("وزن باید بین ۲۰ تا ۳۰۰ کیلوگرم باشه"); return;
      }
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: gender === "unset" ? null : gender,
          birthDate: birthDate ? isoLocal(jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2])) : null,
          heightCm: height,
          weightKg: weight,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setSaveError(resData.error || "خطایی پیش اومد"); return; }
      invalidateAccountCache();
      setData((d) => (d ? {
        ...d,
        gender: gender === "unset" ? null : gender,
        birthDate: birthDate ? jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2]).toISOString() : null,
        heightCm: height, weightKg: weight,
      } : d));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaveError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setSaving(false);
    }
  }

  async function sendEmailCode() {
    if (emailBusy || !newEmail.trim()) return;
    if (!isValidEmail(newEmail.trim())) { setEmailError("ایمیل معتبر نیست"); return; }
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/account/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setEmailError(resData.error || "خطایی پیش اومد"); return; }
      setEmailCodeSent(true);
    } catch {
      setEmailError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setEmailBusy(false);
    }
  }

  async function verifyEmailCode() {
    if (emailBusy || !emailCode.trim()) return;
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/account/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim(), code: emailCode.trim() }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setEmailError(resData.error || "خطایی پیش اومد"); return; }
      invalidateAccountCache();
      setData((d) => (d ? { ...d, email: resData.email } : d));
      setEmailChanging(false);
      setEmailCodeSent(false);
      setNewEmail("");
      setEmailCode("");
    } catch {
      setEmailError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setEmailBusy(false);
    }
  }

  if (!data) return null;

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ") || "کاربر آریون";
  const currentSub = data.subscriptions?.[0];

  return (
    <section>
      <h1>پروفایل</h1>
      <div className="account-content-hint">اطلاعاتِ حساب و مشخصاتِ شخصی‌ت</div>

      <motion.div className="account-profile-head" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <div className="account-avatar-row">
          <div className="account-avatar-wrap">
            {avatarUrl ? (
              <img src={avatarUrl} alt="عکس پروفایل" className="account-avatar-img" />
            ) : (
              <AgentAvatar seed={fullName || data.username || data.email || "؟"} size={76} className="account-avatar-fallback" />
            )}
            <button type="button" className="account-avatar-edit-btn" onClick={() => avatarInputRef.current?.click()} aria-label="تغییر عکس پروفایل" disabled={avatarSaving}>
              <Camera size={13} />
            </button>
            <input
              ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
            />
          </div>
          {avatarUrl && (
            <button type="button" className="account-avatar-remove-btn" onClick={removeAvatar} disabled={avatarSaving}>
              <Trash2 size={13} />
              حذف عکس
            </button>
          )}
        </div>
        {avatarError && <div className="field-error-msg" style={{ display: "block", marginBottom: 10 }}>{avatarError}</div>}

        <div className="account-profile-name">{fullName}</div>
        {data.username && <div className="account-profile-username mono" dir="ltr">@{data.username}</div>}
        {saved && <div className="account-save-toast">اطلاعات با موفقیت ذخیره شد.</div>}
      </motion.div>

      {/* فیلدهای قفل — همیشه فقط‌نمایشی، هیچ‌وقت از همین‌جا قابل‌تغییر نیستن */}
      <div className="account-card">
        <div className="account-row2">
          <span className="account-row2-icon"><UserIcon size={16} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">نام و نام خانوادگی</span>
            <span className="account-row2-desc">{fullName}</span>
          </span>
        </div>
        <div className="account-row2">
          <span className="account-row2-icon"><Phone size={16} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">شماره موبایل</span>
            <span className="account-row2-desc mono" dir="ltr">{data.phone || "ثبت نشده"}</span>
          </span>
        </div>
      </div>

      {/* ایمیل — قفل نیست، ولی تغییرش فقط با تاییدِ کدِ ارسال‌شده به ایمیلِ جدید */}
      <div className="account-card" style={{ padding: 16 }}>
        <div className="account-field-label-row">
          <span className="account-row2-icon"><Mail size={16} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">ایمیل</span>
            <span className="account-row2-desc mono" dir="ltr">{data.email || "ثبت نشده"}</span>
          </span>
          {!emailChanging && (
            <button type="button" className="account-outline-btn muted" style={{ flexShrink: 0 }} onClick={() => setEmailChanging(true)}>تغییر</button>
          )}
        </div>

        {emailChanging && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} style={{ marginTop: 12 }}>
            {!emailCodeSent ? (
              <>
                <AuthField id="pf-new-email" label="ایمیل جدید">
                  <input
                    id="pf-new-email" type="email" dir="ltr" className="wsearch-newform-name" style={{ textAlign: "right" }}
                    value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setEmailError(null); }}
                  />
                </AuthField>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" className="account-outline-btn" onClick={sendEmailCode} disabled={emailBusy || !newEmail.trim()}>
                    {emailBusy ? "در حال ارسال…" : "ارسال کد"}
                  </button>
                  <button type="button" className="account-outline-btn muted" onClick={() => { setEmailChanging(false); setEmailError(null); }} disabled={emailBusy}>انصراف</button>
                </div>
              </>
            ) : (
              <>
                <div className="section-note" style={{ marginBottom: 10 }}>کد تایید به {newEmail} فرستاده شد.</div>
                <AuthField id="pf-email-code" label="کد تایید">
                  <input
                    id="pf-email-code" type="text" dir="ltr" className="wsearch-newform-name mono" style={{ textAlign: "right" }}
                    value={emailCode} onChange={(e) => { setEmailCode(e.target.value); setEmailError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verifyEmailCode(); } }}
                  />
                </AuthField>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" className="account-outline-btn" onClick={verifyEmailCode} disabled={emailBusy || !emailCode.trim()}>
                    {emailBusy ? "در حال تایید…" : "تایید کد"}
                  </button>
                  <button type="button" className="account-outline-btn muted" onClick={() => { setEmailChanging(false); setEmailCodeSent(false); setEmailError(null); }} disabled={emailBusy}>انصراف</button>
                </div>
              </>
            )}
            {emailError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{emailError}</div>}
          </motion.div>
        )}
      </div>

      {/* بقیه‌ی فیلدها — باز، مستقیم قابل‌ویرایش، با یه دکمه‌ی ذخیره‌ی مشترک */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="account-card" style={{ padding: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}><Cake size={13} style={{ verticalAlign: "-2px", marginLeft: 5 }} />تاریخ تولد</label>
          <button type="button" className={`jdate-btn${birthDate ? "" : " placeholder"}`} onClick={() => setDobOpen(true)}>
            {birthDate ? formatJalali(birthDate) : "انتخاب تاریخ تولد"}
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}><VenetianMask size={13} style={{ verticalAlign: "-2px", marginLeft: 5 }} />جنسیت</label>
          <SegmentedTabs options={GENDER_OPTIONS} active={gender} onChange={setGender} />
        </div>

        <div className="auth-field-grid">
          <AuthField id="pf-height" label="قد (سانتی‌متر)" icon={<Ruler size={16} />}>
            <NumberInput id="pf-height" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={heightCm} onChange={(v) => setHeightCm(v)} />
          </AuthField>
          <AuthField id="pf-weight" label="وزن (کیلوگرم)" icon={<Weight size={16} />}>
            <NumberInput decimal id="pf-weight" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={weightKg} onChange={(v) => setWeightKg(v)} />
          </AuthField>
        </div>

        {saveError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{saveError}</div>}

        <button type="button" className="account-outline-btn" style={{ marginTop: 16 }} onClick={saveProfile} disabled={saving}>
          {saving ? "در حال ذخیره…" : "ذخیره"}
        </button>
      </motion.div>

      <div className="tm-extra">
        <div className="domain-sub">اشتراک</div>
        <div className="account-sub-mini-card">
          <div>
            <div className="account-sub-mini-name">{currentSub ? currentSub.plan.nameFa : "بدون اشتراک فعال"}</div>
            <div className="item-line">{currentSub ? SUB_STATUS_FA[currentSub.status] || currentSub.status : "فقط ماژول‌های دوره‌ی آزمایشی در دسترسه"}</div>
          </div>
          <Link href="/account/subscription" className="account-sub-mini-link">جزئیات</Link>
        </div>
      </div>

      {dobOpen && (
        <JalaliDatePicker
          initial={birthDate}
          onPick={(d) => { setBirthDate(d); setDobOpen(false); }}
          onClose={() => setDobOpen(false)}
        />
      )}
    </section>
  );
}
