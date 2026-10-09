"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera, Trash2, Phone, Cake, AtSign, User as UserIcon,
  Dumbbell, IdCard, Ruler, Weight, VenetianMask, ChevronDown, NotebookPen, Gift,
} from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AuthField } from "@/components/AuthField";
import { NumberInput } from "@/components/NumberInput";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { AccountPageHead, AccountBlock, AccountSaveBar } from "@/components/AccountUI";
import { JalaliDate, formatJalali, jalaliToGregorianApprox, toJalali, isoLocal } from "@/lib/jalali";
import { getAccount, getAvatarUrl, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { getBodyMetrics, saveBodyMetrics } from "@/lib/bodyMetrics";
import { isValidUsername, isValidPersianName } from "@/lib/validate";
import { ImageCropModal } from "@/components/ImageCropModal";
import { AvatarSheet } from "@/components/AvatarSheet";
import { CUSTOM_REFERRAL_CODE_RE, REFERRAL_DISCOUNT_PERCENT, normalizeReferralCode } from "@/lib/referral";
import { priceText as formatPriceAmount } from "@/lib/subscriptionI18n";
import { faNum } from "@/lib/jalali";
import { Spinner } from "@/components/Spinner";
import { tr, isEn } from "@/lib/i18n";

type ProfileUser = {
  username: string | null;
  phone: string | null;
  /** توجه: /api/account در `name` نام *کامل* (نام + نام خانوادگی) را
   *  می‌دهد و نام کوچک را در `firstName`. باگ «فامیل می‌پره توی اسم»
   *  دقیقا از همین بود: فیلد نام با `name` پر می‌شد، یعنی بعد از هر
   *  ذخیره نام خانوادگی به ته نام اضافه می‌شد. */
  name: string | null;
  firstName?: string | null;
  lastName: string | null;
  bio: string | null;
  birthDate: string | null;
};

const BIO_MAX = 200;

/**
 * صفحه‌ی پروفایل:
 *   بنر (کلیک‌پذیر برای آپلود) با آواتار کلیک‌پذیر نشسته روی لبه‌اش
 *   ← «پروفایل عمومی»: نام | نام خانوادگی · شماره · یوزرنیم · تاریخ تولد · بیوگرافی
 *   ← «پروفایل ورزشی»: سن | قد · وزن | جنسیت
 *   ← یک دکمه‌ی «ذخیره تغییرات» برای همه‌چیز
 *
 * طبق درخواست صریح کاربر:
 *   • ایمیل اصلا این‌جا نیست (نه نمایش، نه فلوی تغییر).
 *   • یوزرنیم دکمه‌ی «تغییر» ندارد — خود فیلد ویرایش‌پذیر است و با همان
 *     دکمه‌ی ذخیره‌ی پایین ثبت می‌شود (روت اختصاصی‌اش داخل saveAll صدا زده
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


  // ── فیلدهای قابل ویرایش ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  // کد دعوت — اسمش رو خود کاربر انتخاب می‌کنه (/api/account/referral، lib/referral.ts)
  const [refCode, setRefCode] = useState("");
  const [savedRefCode, setSavedRefCode] = useState<string | null>(null);
  const [refStats, setRefStats] = useState<{ invitedPaid: number; walletBalance: number } | null>(null);
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
      // ذخیره‌های قبلی (با همون باگ) ممکنه نام خانوادگی رو یک یا چند بار
      // به ته نام چسبونده باشن — این‌جا پاکش می‌کنیم تا ذخیره‌ی بعدی درستش کنه.
      let first = (u.firstName ?? "").trim();
      const last = (u.lastName ?? "").trim();
      while (last && first !== last && first.endsWith(" " + last)) first = first.slice(0, -(last.length + 1)).trim();
      setFirstName(first);
      setLastName(u.lastName ?? "");
      setBio(u.bio ?? "");
      if (u.birthDate) {
        const d = new Date(u.birthDate);
        setBirthDate(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()));
      }
    });
    fetch("/api/account/referral")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRefCode(d.code ?? "");
        setSavedRefCode(d.code ?? null);
        setRefStats({ invitedPaid: d.invitedPaid ?? 0, walletBalance: d.walletBalance ?? 0 });
      })
      .catch(() => {});
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

  // ورودی هر دو تابع خود File نیست، dataURL کراپ‌شده از ImageCropModal‌ه
  // (آواتار 256×256 با قاب دایره‌ای، بنر 1024×320).
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
      if (!res.ok) { setMediaError(resData.error || tr("خطایی پیش اومد", "Something went wrong")); return; }
      setAvatarUrl(resData.avatarUrl);
      // بدون این، آواتار منوی همبرگری همچنان عکس کهنه را نشان می‌داد:
      // lib/preload اسنپ‌شات bootstrap را کش می‌کند و رویداد avatar-updated
      // به‌تنهایی آن کش را باطل نمی‌کند.
      invalidateAccountCache();
      window.dispatchEvent(new Event("avatar-updated"));
    } catch {
      setMediaError(tr("خطا در پردازش عکس", "Could not process the photo"));
    } finally {
      setAvatarSaving(false);
    }
  }

  async function removeAvatar() {
    setAvatarSaving(true);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) { setMediaError(tr("حذف عکس ناموفق بود", "Could not remove the photo")); return; }
      setAvatarUrl(null);
      setAvatarSheet(false);
      invalidateAccountCache();
      window.dispatchEvent(new Event("avatar-updated"));
    } catch {
      setMediaError(tr("حذف عکس ناموفق بود", "Could not remove the photo"));
    } finally {
      setAvatarSaving(false);
    }
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
      if (!res.ok) { setMediaError(resData.error || tr("خطایی پیش اومد", "Something went wrong")); return; }
      setBannerUrl(resData.bannerUrl);
    } catch {
      setMediaError(tr("خطا در پردازش عکس", "Could not process the photo"));
    } finally {
      setBannerSaving(false);
    }
  }

  // بنر و عکس پروفایل هر دو از ImageCropModal (زوم/جابه‌جایی فقط لمسی) رد می‌شن.
  const [cropping, setCropping] = useState<{ file: File; kind: "banner" | "avatar" } | null>(null);
  const [avatarSheet, setAvatarSheet] = useState(false);

  // زدن آواتار: اگه عکس داره پنجره‌ی عکس (پیش‌نمایش/عکس جدید/حذف)، وگرنه مستقیم انتخاب فایل
  function onAvatarTap() {
    if (avatarUrl) setAvatarSheet(true);
    else avatarInputRef.current?.click();
  }

  function pickAvatarFile(file: File) {
    setMediaError(null);
    if (!file.type.startsWith("image/")) { setMediaError(tr("فایل انتخاب‌شده عکس نیست", "The selected file is not an image")); return; }
    setAvatarSheet(false);
    setCropping({ file, kind: "avatar" });
  }

  function pickBannerFile(file: File) {
    setMediaError(null);
    if (!file.type.startsWith("image/")) { setMediaError(tr("فایل انتخاب‌شده عکس نیست", "The selected file is not an image")); return; }
    setCropping({ file, kind: "banner" });
  }

  async function removeBanner() {
    setBannerSaving(true);
    await fetch("/api/account/banner", { method: "DELETE" });
    setBannerUrl(null);
    setBannerSaving(false);
  }

  /** یک دکمه برای همه‌چیز: عمومی روی /api/account، یوزرنیم روی روت خودش، ورزشی روی bodyMetrics */
  async function saveAll() {
    setSaveError(null);
    setSaved(false);
    const name = firstName.trim();
    const family = lastName.trim();
    const uname = username.trim().replace(/^@/, "");
    if (name && !isValidPersianName(name)) { setSaveError(tr("نام باید فقط با حروف فارسی نوشته شود", "First name must use Persian letters only")); return; }
    if (family && !isValidPersianName(family)) { setSaveError(tr("نام خانوادگی باید فقط با حروف فارسی نوشته شود", "Last name must use Persian letters only")); return; }
    if (uname && !isValidUsername(uname)) { setSaveError(tr("یوزرنیم باید 3 تا 20 کاراکتر انگلیسی/عدد/آندرلاین باشد", "Username must be 3 to 20 characters: English letters, digits or underscores")); return; }
    const code = normalizeReferralCode(refCode);
    if (code && code !== savedRefCode && !CUSTOM_REFERRAL_CODE_RE.test(code)) { setSaveError(tr("کد دعوت باید 4 تا 16 حرف انگلیسی یا عدد باشه", "The invite code must be 4 to 16 English letters or digits")); return; }

    const height = heightCm.trim() ? Number(heightCm) : undefined;
    const weight = weightKg.trim() ? Number(weightKg) : undefined;
    const age = ageYears.trim() ? Number(ageYears) : undefined;
    if (height != null && (!Number.isFinite(height) || height < 100 || height > 250)) { setSaveError(tr("قد باید بین 100 تا 250 سانتی‌متر باشه", "Height must be between 100 and 250 cm")); return; }
    if (weight != null && (!Number.isFinite(weight) || weight < 20 || weight > 300)) { setSaveError(tr("وزن باید بین 20 تا 300 کیلوگرم باشه", "Weight must be between 20 and 300 kg")); return; }
    if (age != null && (!Number.isFinite(age) || age < 10 || age > 100)) { setSaveError(tr("سن باید بین 10 تا 100 سال باشه", "Age must be between 10 and 100")); return; }

    setSaving(true);
    try {
      // یوزرنیم اول: روت خودش را دارد (یکتایی) و اگر تکراری بود نباید
      // بقیه‌ی فیلدها هم بی‌سروصدا ذخیره شده باشند.
      if (uname && uname !== savedUsername) {
        const uRes = await fetch("/api/account/username", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: uname }),
        });
        const uData = await uRes.json().catch(() => ({}));
        if (!uRes.ok) { setSaveError(uData.error || tr("تغییر یوزرنیم ناموفق بود", "Could not change the username")); return; }
        setSavedUsername(uname);
      }

      // کد دعوت هم روت خودش رو داره (یکتایی سمت سرور)
      if (code && code !== savedRefCode) {
        const cRes = await fetch("/api/account/referral", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const cData = await cRes.json().catch(() => ({}));
        if (!cRes.ok) { setSaveError(cData.error || tr("تغییر کد دعوت ناموفق بود", "Could not change the invite code")); return; }
        setSavedRefCode(code);
        setRefCode(code);
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
      if (!res.ok) { setSaveError(resData.error || tr("خطایی پیش اومد", "Something went wrong")); return; }

      // قد/وزن/سن روی همان منبع مشترکی می‌روند که فرم‌های بدنسازی و کالری
      // می‌خوانند — وگرنه کاربر باید همان عدد را دو جا وارد می‌کرد.
      await saveBodyMetrics({
        heightCm: height, weightKg: weight, ageYears: age,
        gender: gender === "unset" ? undefined : gender,
      });

      invalidateAccountCache();
      setData((d) => (d ? {
        ...d, firstName: name, name: [name, family].filter(Boolean).join(" ") || null, lastName: family, bio: bio.trim() || null, username: uname || null,
        birthDate: birthDate ? jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2]).toISOString() : null,
      } : d));
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } catch {
      setSaveError(tr("مشکلی در اتصال به سرور پیش اومد", "Could not reach the server"));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return null;

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || tr("کاربر آریون", "Arion user");

  return (
    <section>
      <AccountPageHead title={tr("پروفایل", "Profile")} hint={tr("بنر و عکس پروفایل، مشخصات حساب و پروفایل ورزشی", "Banner and photo, account details and sports profile")} />

      {/* ── بنر + آواتار ── */}
      <motion.div className="profile-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
        <div className="profile-banner">
          {/* طبق درخواست صریح، دیگر دکمه‌ی جدای «افزودن/تغییر بنر» نیست —
              خود بنر مثل عکس پروفایل کلیک‌پذیر است؛ یک لایه‌ی نیمه‌شفاف
              دوربین فقط موقع هاور/فوکوس راهنمایی بصری می‌دهد. */}
          <button
            type="button" className="profile-banner-hit" onClick={() => bannerInputRef.current?.click()}
            disabled={bannerSaving} aria-label={bannerUrl ? tr("تغییر بنر", "Change banner") : tr("افزودن بنر", "Add banner")}
          >
            {bannerUrl && <img src={bannerUrl} alt="" className="profile-banner-img" />}
            <span className="profile-banner-hint" aria-hidden="true">
              {bannerSaving ? <Spinner size={15} /> : <Camera size={16} />}
            </span>
          </button>

          {bannerUrl && (
            <div className="profile-banner-actions">
              <button type="button" className="profile-banner-btn" onClick={removeBanner} disabled={bannerSaving} aria-label={tr("حذف بنر", "Remove banner")}>
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <input
            ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickBannerFile(f); e.target.value = ""; }}
          />

          {/* طبق درخواست صریح دکمه‌ی جدا ندارد — خود عکس کلیک‌پذیر است.
              آیکون دوربین فقط یک نشانه‌ی بصری است (pointer-events ندارد). */}
          <button
            type="button" className="profile-hero-avatar-wrap" onClick={onAvatarTap}
            disabled={avatarSaving} aria-label={tr("تغییر عکس پروفایل", "Change profile photo")}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={tr("عکس پروفایل", "Profile photo")} className="profile-hero-avatar-img" />
            ) : (
              <AgentAvatar seed={fullName || username || "؟"} size={92} className="profile-hero-avatar-img" />
            )}
            <span className="profile-hero-avatar-hint" aria-hidden="true">
              {avatarSaving ? <Spinner size={14} /> : <Camera size={15} />}
            </span>
          </button>
          <input
            ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAvatarFile(f); e.target.value = ""; }}
          />
        </div>

        {mediaError && <div className="field-error-msg" style={{ display: "block", padding: "0 16px 12px" }}>{mediaError}</div>}
      </motion.div>

      {avatarSheet && avatarUrl && (
        <AvatarSheet
          avatarUrl={avatarUrl}
          busy={avatarSaving}
          onPickNew={() => avatarInputRef.current?.click()}
          onDelete={removeAvatar}
          onClose={() => setAvatarSheet(false)}
        />
      )}

      {cropping && (
        <ImageCropModal
          key={cropping.kind}
          file={cropping.file}
          outputW={cropping.kind === "avatar" ? 256 : 1024}
          outputH={cropping.kind === "avatar" ? 256 : 320}
          shape={cropping.kind === "avatar" ? "circle" : "rect"}
          title={cropping.kind === "avatar" ? tr("عکس پروفایل", "Profile photo") : tr("بنر", "Banner")}
          onCancel={() => setCropping(null)}
          onConfirm={(dataUrl) => {
            const kind = cropping.kind;
            setCropping(null);
            if (kind === "avatar") uploadAvatar(dataUrl);
            else uploadBanner(dataUrl);
          }}
        />
      )}

      {/* ── پروفایل عمومی ── */}
      <AccountBlock title={tr("پروفایل عمومی", "Public profile")} icon={<IdCard size={15} />} index={0}>
        {/* طبق درخواست صریح: فقط نام و نام‌خانوادگی هم‌ردیف‌اند، بقیه
            هرکدام یک خط کامل می‌گیرند. */}
        <div className="auth-field-grid">
          <AuthField id="pf-name" label={tr("نام", "First name")} icon={<UserIcon size={16} />}>
            <input id="pf-name" type="text" className="wsearch-newform-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </AuthField>
          <AuthField id="pf-lastname" label={tr("نام خانوادگی", "Last name")} icon={<UserIcon size={16} />}>
            <input id="pf-lastname" type="text" className="wsearch-newform-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </AuthField>
        </div>

        <div className="acc-field-stack">
          {/* شماره همراه عمدا فقط‌خواندنی است: تغییرش یعنی تغییر شناسه‌ی ورود
              و باید با تایید پیامکی انجام شود، نه با یک ذخیره‌ی ساده. */}
          <AuthField id="pf-phone" label={tr("شماره همراه", "Phone number")} icon={<Phone size={16} />}>
            <input id="pf-phone" type="text" className="wsearch-newform-name mono" dir="ltr" style={{ textAlign: isEn() ? "left" : "right" }} value={data.phone || tr("ثبت نشده", "Not set")} readOnly disabled />
          </AuthField>

          <AuthField id="pf-username" label={tr("یوزرنیم", "Username")} icon={<AtSign size={16} />}>
            <input
              id="pf-username" type="text" className="wsearch-newform-name mono" dir="ltr" style={{ textAlign: isEn() ? "left" : "right" }}
              value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username"
            />
          </AuthField>

          <AuthField id="pf-dob" label={tr("تاریخ تولد", "Birth date")} icon={<Cake size={16} />}>
            <button type="button" id="pf-dob" className={`jdate-btn${birthDate ? "" : " placeholder"}`} onClick={() => setDobOpen(true)}>
              {birthDate ? formatJalali(birthDate) : tr("انتخاب تاریخ تولد", "Select birth date")}
            </button>
          </AuthField>

          <AuthField id="pf-bio" label={tr("بیوگرافی", "Bio")} icon={<NotebookPen size={16} />}>
            <textarea
              id="pf-bio" className="wsearch-newform-name acc-textarea" rows={3} maxLength={BIO_MAX}
              value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder={tr("یک توضیح کوتاه درباره‌ی خودت — توی پروفایلی که دوستانت می‌بینن نشون داده می‌شه", "A short description about yourself, shown in the profile your friends see")}
            />
            <span className="acc-field-counter mono" dir="ltr">{bio.length}/{BIO_MAX}</span>
          </AuthField>
        </div>
      </AccountBlock>

      {/* ── کد دعوت ── */}
      <AccountBlock
        title={tr("کد دعوت", "Invite code")}
        icon={<Gift size={15} />}
        desc={tr(`دوستت با کدت روی اولین خریدش ${faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف می‌گیره (هر نفر فقط یک بار)، و تو به‌ازای هر دوستی که با پول واقعی خرید کنه ۱۰٪ از همون مبلغ به‌صورت اعتبار داخلِ کیفِ خودت واریز می‌شه — فقط برای کم‌کردنِ قیمتِ خریدِ پلن بعدی، نه قابل‌برداشت.`, `Your friend gets ${faNum(REFERRAL_DISCOUNT_PERCENT)}% off their first purchase with your code (once per person), and for every friend who buys with real money, 10% of that amount is added to your wallet as credit. It can only reduce the price of your next plan and cannot be withdrawn.`)}
        index={1}
      >
        <div className="acc-field-stack">
          <AuthField id="pf-refcode" label={tr("اسم کد (4 تا 16 حرف انگلیسی یا عدد)", "Code name (4 to 16 English letters or digits)")} icon={<Gift size={16} />}>
            <input
              id="pf-refcode" type="text" className="wsearch-newform-name mono" dir="ltr" style={{ textAlign: isEn() ? "left" : "right" }}
              value={refCode} maxLength={16} autoCapitalize="characters" spellCheck={false}
              onChange={(e) => setRefCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="MYCODE"
            />
          </AuthField>
          {refStats && (
            <p className="acc-option-desc">
              {tr(`${faNum(refStats.invitedPaid)} دوست با کدت خرید کردن · موجودیِ کیف: ${formatPriceAmount(refStats.walletBalance)}`, `${faNum(refStats.invitedPaid)} ${refStats.invitedPaid === 1 ? "friend has" : "friends have"} purchased with your code · Wallet balance: ${formatPriceAmount(refStats.walletBalance)}`)}
            </p>
          )}
        </div>
      </AccountBlock>

      {/* ── پروفایل ورزشی ── */}
      <AccountBlock
        title={tr("پروفایل ورزشی", "Sports profile")}
        icon={<Dumbbell size={15} />}
        desc={tr("برای استفاده از بخش ورزش و کالری الزامی است — همین اطلاعات توی فرم‌های بدنسازی و کالری هم پر می‌شود.", "Required to use the workout and calorie sections. The same details are filled in the workout and calorie forms.")}
        index={2}
      >
        <div className="auth-field-grid">
          <AuthField id="pf-age" label={tr("سن", "Age")} icon={<Cake size={16} />}>
            <NumberInput id="pf-age" dir="ltr" style={{ textAlign: isEn() ? "left" : "right" }} className="wsearch-newform-name" value={ageYears} onChange={setAgeYears} />
          </AuthField>
          <AuthField id="pf-height" label={tr("قد (سانتی‌متر)", "Height (cm)")} icon={<Ruler size={16} />}>
            <NumberInput id="pf-height" dir="ltr" style={{ textAlign: isEn() ? "left" : "right" }} className="wsearch-newform-name" value={heightCm} onChange={setHeightCm} />
          </AuthField>
          <AuthField id="pf-weight" label={tr("وزن (کیلوگرم)", "Weight (kg)")} icon={<Weight size={16} />}>
            <NumberInput decimal id="pf-weight" dir="ltr" style={{ textAlign: isEn() ? "left" : "right" }} className="wsearch-newform-name" value={weightKg} onChange={setWeightKg} />
          </AuthField>
          <AuthField id="pf-gender" label={tr("جنسیت", "Gender")} icon={<VenetianMask size={16} />}>
            <span className="acc-select-wrap">
              <select
                id="pf-gender" className="wsearch-newform-name acc-select"
                value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "unset")}
              >
                <option value="unset">{tr("نامشخص", "Unspecified")}</option>
                <option value="male">{tr("مرد", "Male")}</option>
                <option value="female">{tr("زن", "Female")}</option>
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

    </section>
  );
}
