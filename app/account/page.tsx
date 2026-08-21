"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Trash2, Pencil } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AuthField } from "@/components/AuthField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { JalaliDate, formatJalali, jalaliToGregorianApprox, toJalali, isoLocal } from "@/lib/jalali";
import { resizeImageToDataUrl } from "@/lib/avatarUpload";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { clampText } from "@/lib/validate";

type ProfileUser = {
  email: string | null;
  username: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: string | null;
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

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "unset">("unset");
  const [birthDate, setBirthDate] = useState<JalaliDate | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as ProfileUser | undefined;
      if (u) setData(u);
    });
    fetch("/api/account/avatar").then((r) => (r.ok ? r.json() : null)).then((res) => { if (res?.avatarUrl) setAvatarUrl(res.avatarUrl); });
  }, []);

  function startEdit() {
    if (!data) return;
    setFirstName(data.firstName || "");
    setLastName(data.lastName || "");
    setGender(data.gender === "male" || data.gender === "female" ? data.gender : "unset");
    setBirthDate(data.birthDate ? (() => { const d = new Date(data.birthDate as string); return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); })() : null);
    setSaveError(null);
    setEditing(true);
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
    setAvatarSaving(false);
    window.dispatchEvent(new Event("avatar-updated"));
  }

  async function saveProfile() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clampText(firstName.trim(), 60),
          lastName: clampText(lastName.trim(), 60),
          gender: gender === "unset" ? null : gender,
          birthDate: birthDate ? isoLocal(jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2])) : null,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setSaveError(resData.error || "خطایی پیش اومد"); return; }
      invalidateAccountCache();
      setData((d) => (d ? { ...d, firstName, lastName, gender: gender === "unset" ? null : gender, birthDate: birthDate ? jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2]).toISOString() : null } : d));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaveError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setSaving(false);
    }
  }

  if (!data) return null;

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ") || "کاربر آریون";
  const currentSub = data.subscriptions?.[0];

  return (
    <section>
      <h1>پروفایل</h1>
      <div className="account-content-hint">اطلاعاتِ حساب و مشخصاتِ شخصی‌ت</div>

      <div className="account-profile-head">
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

        <button type="button" className="account-edit-btn" onClick={startEdit}>
          <Pencil size={13} />
          ویرایش اطلاعات
        </button>
        {saved && <div className="account-save-toast">اطلاعات با موفقیت ذخیره شد.</div>}
      </div>

      {editing ? (
        <div className="tm-extra">
          <div className="domain-sub">ویرایشِ اطلاعات</div>
          <div className="auth-field-grid">
            <AuthField id="pf-name" label="نام">
              <input id="pf-name" type="text" className="wsearch-newform-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </AuthField>
            <AuthField id="pf-lastName" label="نام خانوادگی">
              <input id="pf-lastName" type="text" className="wsearch-newform-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </AuthField>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>تاریخ تولد</label>
            <button type="button" className={`jdate-btn${birthDate ? "" : " placeholder"}`} onClick={() => setDobOpen(true)}>
              {birthDate ? formatJalali(birthDate) : "انتخاب تاریخ تولد"}
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>جنسیت</label>
            <SegmentedTabs options={GENDER_OPTIONS} active={gender} onChange={setGender} />
          </div>

          {saveError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{saveError}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" onClick={saveProfile} disabled={saving} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              {saving ? "در حال ذخیره…" : "ذخیره"}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving}>انصراف</button>
          </div>
        </div>
      ) : (
        <div className="about-list">
          <div className="about-row">
            <span className="about-label">ایمیل</span>
            {data.email ? <span className="mono" dir="ltr">{data.email}</span> : <span className="item-line empty">ثبت نشده</span>}
          </div>
          <div className="about-row">
            <span className="about-label">شماره موبایل</span>
            {data.phone ? <span className="mono" dir="ltr">{data.phone}</span> : <span className="item-line empty">ثبت نشده</span>}
          </div>
          <div className="about-row">
            <span className="about-label">تاریخ تولد</span>
            <span>{data.birthDate ? formatJalali(toJalaliFromIso(data.birthDate)) : "ثبت نشده"}</span>
          </div>
          <div className="about-row">
            <span className="about-label">جنسیت</span>
            <span>{data.gender === "male" ? "مرد" : data.gender === "female" ? "زن" : "ثبت نشده"}</span>
          </div>
        </div>
      )}
      <div className="section-note" style={{ marginTop: 10 }}>
        تغییرِ ایمیل/شماره موبایل فعلاً از همین‌جا ممکن نیست — از بخشِ «پشتیبانی» با ما در تماس باش.
      </div>

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

function toJalaliFromIso(iso: string): JalaliDate {
  const d = new Date(iso);
  return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
