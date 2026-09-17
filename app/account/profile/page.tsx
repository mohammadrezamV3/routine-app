"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera, Trash2, Phone, Cake, AtSign, User as UserIcon,
  Dumbbell, IdCard, Ruler, Weight, VenetianMask, ChevronDown, Loader2, NotebookPen,
} from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AuthField } from "@/components/AuthField";
import { NumberInput } from "@/components/NumberInput";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { ImageCropModal } from "@/components/ImageCropModal";
import { AccountPageHead, AccountBlock, AccountSaveBar } from "@/components/AccountUI";
import { JalaliDate, formatJalali, jalaliToGregorianApprox, toJalali, isoLocal } from "@/lib/jalali";
import { getAccount, getAvatarUrl, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { getBodyMetrics, saveBodyMetrics } from "@/lib/bodyMetrics";
import { isValidUsername, isValidPersianName } from "@/lib/validate";

type ProfileUser = {
  username: string | null;
  phone: string | null;
  /** توجه: /api/account این فیلد را `name` می‌دهد، نه `firstName`. */
  name: string | null;
  lastName: string | null;
  bio: string | null;
  birthDate: string | null;
};

const BIO_MAX = 200;

/**
 * صفحه‌ی پروفایل:
 *   بنر (کلیک‌پذیر برای آپلود) با آواتارِ کلیک‌پذیرِ نشسته روی لبه‌اش
 *   ← «پروفایل عمومی»: نام | نام خانوادگی · شماره · یوزرنیم · تاریخ تولد · بیوگرافی
 *   ← «پروفایل ورزشی»: سن | قد · وزن | جنسیت
 *   ← یک دکمه‌ی «ذخیره تغییرات» برای همه‌چیز
 *
 * طبقِ درخواستِ صریحِ کاربر:
 *   • ایمیل اصلا این‌جا نیست (نه نمایش، نه فلوی تغییر).
 *   • یوزرنیم دکمه‌ی «تغییر» ندارد — خودِ فیلد ویرایش‌پذیر است و با همان
 *     دکمه‌ی ذخیره‌ی پایین ثبت می‌شود (روتِ اختصاصی‌اش داخلِ saveAll صدا زده
 *     می‌شود، چون یکتایی‌اش سمت سرور چک می‌شود).
 */
export default function AccountProfilePage() {
  const [data, setData] = useState<ProfileUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerSaving, setBannerSaving] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // پاپ‌آپِ انتخابِ محلِ کراپ (طبقِ درخواستِ صریح) — قبل از آپلودِ واقعی،
  // فایلِ انتخاب‌شده این‌جا می‌نشیند تا کاربر جابه‌جا/زوم کند؛ تاییدش
  // مستقیم dataURL نهایی را می‌دهد که با همان روتِ همیشگی آپلود می‌شود.
  const [cropTarget, setCropTarget] = useState<{ kind: "avatar" | "banner"; file: File } | null>(null);

  // ── فیلدهای قابل ویرایش ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState<JalaliDate | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | "unset">("unset");
  const [ageYears, setAgeYears] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as ProfileUser | undefined;
      if (!u) return;
      setData(u);
      setUsername(u.username ?? "");
      setSavedUsername(u.username ?? null);
      setFirstName(u.name ?? "");
      setLastName(u.lastName ?? "");
      setBio(u.bio ?? "");
      if (u.birthDate) {
        const d = new Date(u.birthDate);
        setBirthDate(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()));
      }
    });
    getAvatarUrl().then(setAvatarUrl);
    fetch("/api/account/banner")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBannerUrl(d?.bannerUrl ?? null))
      .catch(() => {});
    getBodyMetrics().then(({ data: m }) => {
      if (!m) return;
      setGender(m.gender ?? "unset");
      setAgeYears(m.ageYears != null ? String(m.ageYears) : "");
      setHeightCm(m.heightCm != null ? String(m.heightCm) : "");
      setWeightKg(m.weightKg != null ? String(m.weightKg) : "");
    });
  }, []);

  // ورودیِ هر دو تابع دیگر خودِ File نیست — همان dataURLِ از قبل کراپ‌شده‌ای
  // که ImageCropModal (بعد از تاییدِ کاربر) تحویل می‌دهد.
  async function uploadAvatar(dataUrl: string) {
    setMediaError(null);
    setAvatarSaving(true);
    try {
      const res = await fetch("/api/account/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setMediaError(resData.error || "خطایی پیش اومد"); return; }
      setAvatarUrl(resData.avatarUrl);
      // بدون این، آواتار منوی همبرگری همچنان عکس کهنه را نشان می‌داد:
      // lib/preload اسنپ‌شات bootstrap را کش می‌کند و رویداد avatar-updated
      // به‌تنهایی آن کش را باطل نمی‌کند.
      invalidateAccountCache();
      window.dispatchEvent(new Event("avatar-updated"));
    } catch {
      setMediaError("خطا در پردازش عکس");
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

  async function uploadBanner(dataUrl: string) {
    setMediaError(null);
    setBannerSaving(true);
    try {
      const res = await fetch("/api/account/banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setMediaError(resData.error || "خطایی پیش اومد"); return; }
      setBannerUrl(resData.bannerUrl);
    } catch {
      setMediaError("خطا در پردازش عکس");
    } finally {
      setBannerSaving(false);
    }
  }

  function confirmCrop(dataUrl: string) {
    if (!cropTarget) return;
    if (cropTarget.kind === "avatar") uploadAvatar(dataUrl);
    else uploadBanner(dataUrl);
    setCropTarget(null);
  }

  async function removeBanner() {
    setBannerSaving(true);
    await fetch("/api/account/banner", { method: "DELETE" });
    setBannerUrl(null);
    setBannerSaving(false);
  }

  /** یک دکمه برای همه‌چیز: عمومی روی /api/account، یوزرنیم روی روتِ خودش، ورزشی روی bodyMetrics */
  async function saveAll() {
    setSaveError(null);
    setSaved(false);
    const name = firstName.trim();
    const family = lastName.trim();
    const uname = username.trim().replace(/^@/, "");
    if (name && !isValidPersianName(name)) { setSaveError("نام باید فقط با حروف فارسی نوشته شود"); return; }
    if (family && !isValidPersianName(family)) { setSaveError("نام خانوادگی باید فقط با حروف فارسی نوشته شود"); return; }
    if (uname && !isValidUsername(uname)) { setSaveError("یوزرنیم باید ۳ تا ۲۰ کاراکتر انگلیسی/عدد/آندرلاین باشد"); return; }

    const height = heightCm.trim() ? Number(heightCm) : undefined;
    const weight = weightKg.trim() ? Number(weightKg) : undefined;
    const age = ageYears.trim() ? Number(ageYears) : undefined;
    if (height != null && (!Number.isFinite(height) || height < 100 || height > 250)) { setSaveError("قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشه"); return; }
    if (weight != null && (!Number.isFinite(weight) || weight < 20 || weight > 300)) { setSaveError("وزن باید بین ۲۰ تا ۳۰۰ کیلوگرم باشه"); return; }
    if (age != null && (!Number.isFinite(age) || age < 10 || age > 100)) { setSaveError("سن باید بین ۱۰ تا ۱۰۰ سال باشه"); return; }

    setSaving(true);
    try {
      // یوزرنیم اول: روتِ خودش را دارد (یکتایی) و اگر تکراری بود نباید
      // بقیه‌ی فیلدها هم بی‌سروصدا ذخیره شده باشند.
      if (uname && uname !== savedUsername) {
        const uRes = await fetch("/api/account/username", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: uname }),
        });
        const uData = await uRes.json().catch(() => ({}));
        if (!uRes.ok) { setSaveError(uData.error || "تغییر یوزرنیم ناموفق بود"); return; }
        setSavedUsername(uname);
      }

      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, lastName: family, bio: bio.trim(),
          gender: gender === "unset" ? null : gender,
          birthDate: birthDate ? isoLocal(jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2])) : null,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setSaveError(resData.error || "خطایی پیش اومد"); return; }

      // قد/وزن/سن روی همان منبع مشترکی می‌روند که فرم‌های بدنسازی و کالری
      // می‌خوانند — وگرنه کاربر باید همان عدد را دو جا وارد می‌کرد.
      await saveBodyMetrics({
        heightCm: height, weightKg: weight, ageYears: age,
        gender: gender === "unset" ? undefined : gender,
      });

      invalidateAccountCache();
      setData((d) => (d ? {
        ...d, name, lastName: family, bio: bio.trim() || null, username: uname || null,
        birthDate: birthDate ? jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2]).toISOString() : null,
      } : d));
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } catch {
      setSaveError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setSaving(false);
    }
  }

  if (!data) return null;

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "کاربر آریون";

  return (
    <section>
      <AccountPageHead title="پروفایل" hint="بنر و عکس پروفایل، مشخصات حساب و پروفایل ورزشی" />

      {/* ── بنر + آواتار ── */}
      <motion.div className="profile-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
        <div className="profile-banner">
          {/* طبقِ درخواستِ صریح، دیگر دکمه‌ی جدای «افزودن/تغییر بنر» نیست —
              خودِ بنر مثلِ عکسِ پروفایل کلیک‌پذیر است؛ یک لایه‌ی نیمه‌شفافِ
              دوربین فقط موقعِ هاور/فوکوس راهنماییِ بصری می‌دهد. */}
          <button
            type="button" className="profile-banner-hit" onClick={() => bannerInputRef.current?.click()}
            disabled={bannerSaving} aria-label={bannerUrl ? "تغییر بنر" : "افزودن بنر"}
          >
            {bannerUrl && <img src={bannerUrl} alt="" className="profile-banner-img" />}
            <span className="profile-banner-hint" aria-hidden="true">
              {bannerSaving ? <Loader2 size={16} className="trade-spin" /> : <Camera size={16} />}
            </span>
          </button>

          {bannerUrl && (
            <div className="profile-banner-actions">
              <button type="button" className="profile-banner-btn" onClick={removeBanner} disabled={bannerSaving} aria-label="حذف بنر">
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <input
            ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropTarget({ kind: "banner", file: f }); e.target.value = ""; }}
          />

          {/* طبقِ درخواستِ صریح دکمه‌ی جدا ندارد — خودِ عکس کلیک‌پذیر است.
              آیکونِ دوربین فقط یک نشانه‌ی بصری است (pointer-events ندارد). */}
          <button
            type="button" className="profile-hero-avatar-wrap" onClick={() => avatarInputRef.current?.click()}
            disabled={avatarSaving} aria-label="تغییر عکس پروفایل"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="عکس پروفایل" className="profile-hero-avatar-img" />
            ) : (
              <AgentAvatar seed={fullName || username || "؟"} size={92} className="profile-hero-avatar-img" />
            )}
            <span className="profile-hero-avatar-hint" aria-hidden="true">
              {avatarSaving ? <Loader2 size={15} className="trade-spin" /> : <Camera size={15} />}
            </span>
          </button>
          <input
            ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropTarget({ kind: "avatar", file: f }); e.target.value = ""; }}
          />
        </div>

        {/* طبقِ درخواستِ صریح، نام و آیدی زیرِ بنر نوشته نمی‌شوند — همان‌ها
            پایین‌تر توی فیلدهای «پروفایل عمومی» هستند. این ردیف فقط جای
            دکمه‌ی حذفِ عکس است و اگر عکسی نباشد اصلا رندر نمی‌شود. */}
        {avatarUrl && (
          <div className="profile-hero-meta">
            <button type="button" className="account-avatar-remove-btn" onClick={removeAvatar} disabled={avatarSaving}>
              <Trash2 size={13} /> حذف عکس پروفایل
            </button>
          </div>
        )}

        {mediaError && <div className="field-error-msg" style={{ display: "block", padding: "0 16px 12px" }}>{mediaError}</div>}
      </motion.div>

      {/* ── پروفایل عمومی ── */}
      <AccountBlock title="پروفایل عمومی" icon={<IdCard size={15} />} index={0}>
        {/* طبقِ درخواستِ صریح: فقط نام و نام‌خانوادگی هم‌ردیف‌اند، بقیه
            هرکدام یک خطِ کامل می‌گیرند. */}
        <div className="auth-field-grid">
          <AuthField id="pf-name" label="نام" icon={<UserIcon size={16} />}>
            <input id="pf-name" type="text" className="wsearch-newform-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </AuthField>
          <AuthField id="pf-lastname" label="نام خانوادگی" icon={<UserIcon size={16} />}>
            <input id="pf-lastname" type="text" className="wsearch-newform-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </AuthField>
        </div>

        <div className="acc-field-stack">
          {/* شماره همراه عمدا فقط‌خواندنی است: تغییرش یعنی تغییر شناسه‌ی ورود
              و باید با تأیید پیامکی انجام شود، نه با یک ذخیره‌ی ساده. */}
          <AuthField id="pf-phone" label="شماره همراه" icon={<Phone size={16} />}>
            <input id="pf-phone" type="text" className="wsearch-newform-name mono" dir="ltr" style={{ textAlign: "right" }} value={data.phone || "ثبت نشده"} readOnly disabled />
          </AuthField>

          <AuthField id="pf-username" label="یوزرنیم" icon={<AtSign size={16} />}>
            <input
              id="pf-username" type="text" className="wsearch-newform-name mono" dir="ltr" style={{ textAlign: "right" }}
              value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username"
            />
          </AuthField>

          <AuthField id="pf-dob" label="تاریخ تولد" icon={<Cake size={16} />}>
            <button type="button" id="pf-dob" className={`jdate-btn${birthDate ? "" : " placeholder"}`} onClick={() => setDobOpen(true)}>
              {birthDate ? formatJalali(birthDate) : "انتخاب تاریخ تولد"}
            </button>
          </AuthField>

          <AuthField id="pf-bio" label="بیوگرافی" icon={<NotebookPen size={16} />}>
            <textarea
              id="pf-bio" className="wsearch-newform-name acc-textarea" rows={3} maxLength={BIO_MAX}
              value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="یک توضیح کوتاه درباره‌ی خودت — توی پروفایلی که دوستانت می‌بینن نشون داده می‌شه"
            />
            <span className="acc-field-counter mono" dir="ltr">{bio.length}/{BIO_MAX}</span>
          </AuthField>
        </div>
      </AccountBlock>

      {/* ── پروفایل ورزشی ── */}
      <AccountBlock
        title="پروفایل ورزشی"
        icon={<Dumbbell size={15} />}
        desc="برای استفاده از بخش ورزش و کالری الزامی است — همین اطلاعات توی فرم‌های بدنسازی و کالری هم پر می‌شود."
        index={1}
      >
        <div className="auth-field-grid">
          <AuthField id="pf-age" label="سن" icon={<Cake size={16} />}>
            <NumberInput id="pf-age" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={ageYears} onChange={setAgeYears} />
          </AuthField>
          <AuthField id="pf-height" label="قد (سانتی‌متر)" icon={<Ruler size={16} />}>
            <NumberInput id="pf-height" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={heightCm} onChange={setHeightCm} />
          </AuthField>
          <AuthField id="pf-weight" label="وزن (کیلوگرم)" icon={<Weight size={16} />}>
            <NumberInput decimal id="pf-weight" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={weightKg} onChange={setWeightKg} />
          </AuthField>
          <AuthField id="pf-gender" label="جنسیت" icon={<VenetianMask size={16} />}>
            <span className="acc-select-wrap">
              <select
                id="pf-gender" className="wsearch-newform-name acc-select"
                value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "unset")}
              >
                <option value="unset">نامشخص</option>
                <option value="male">مرد</option>
                <option value="female">زن</option>
              </select>
              <ChevronDown size={15} />
            </span>
          </AuthField>
        </div>
      </AccountBlock>

      <AccountSaveBar onSave={saveAll} saving={saving} saved={saved} error={saveError} />

      {dobOpen && (
        <JalaliDatePicker
          initial={birthDate}
          onPick={(d) => { setBirthDate(d); setDobOpen(false); }}
          onClose={() => setDobOpen(false)}
        />
      )}

      {cropTarget && cropTarget.kind === "avatar" && (
        <ImageCropModal
          file={cropTarget.file}
          aspect={1}
          shape="circle"
          outputW={256}
          outputH={256}
          onCancel={() => setCropTarget(null)}
          onConfirm={confirmCrop}
        />
      )}
      {cropTarget && cropTarget.kind === "banner" && (
        <ImageCropModal
          file={cropTarget.file}
          aspect={1024 / 320}
          shape="rect"
          outputW={1024}
          outputH={320}
          onCancel={() => setCropTarget(null)}
          onConfirm={confirmCrop}
        />
      )}
    </section>
  );
}
