"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2, CalendarDays, Dumbbell, IdCard, Gift, Copy, Check, Share2 } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AuthField } from "@/components/AuthField";
import { NumberInput } from "@/components/NumberInput";
import { readTyped } from "@/lib/numberLimits";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { AccountPageHead, AccountBlock, AccountActionBar, AccountSkeleton } from "@/components/AccountUI";
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
import { GoldenName } from "@/components/GoldenName";
import { useSection } from "@/components/SectionProvider";
import { tr } from "@/lib/i18n";

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
  phoneVerifiedAt?: string | null;
  golden?: boolean;
  staff?: boolean;
};

const BIO_MAX = 200;

type Gender = "male" | "female" | "unset";

/** همه‌ی مقدارهای قابل‌ویرایش فرم — برای مقایسه‌ی «تغییر کرده؟» و برگرداندن با «لغو» */
type Draft = {
  firstName: string; lastName: string; username: string; bio: string;
  birthDate: JalaliDate | null; gender: Gender;
  ageYears: string; heightCm: string; weightKg: string; refCode: string;
};
const EMPTY_DRAFT: Draft = {
  firstName: "", lastName: "", username: "", bio: "", birthDate: null, gender: "unset",
  ageYears: "", heightCm: "", weightKg: "", refCode: "",
};
const draftKey = (d: Draft) => JSON.stringify([
  d.firstName, d.lastName, d.username, d.bio, d.birthDate ? d.birthDate.join("-") : "", d.gender,
  d.ageYears, d.heightCm, d.weightKg, d.refCode,
]);

/**
 * صفحه‌ی پروفایل (طرح «پنل کاربری، پروفایل»):
 *   کارت بنر + آواتار (دکمه‌ی خطی «تغییر بنر» روی بنر، دکمه‌ی آیکونی اصلی دوربین روی آواتار)
 *   ← «اطلاعات حساب» (دو ستون): نام | نام خانوادگی · شماره (تایید شده) | یوزرنیم ·
 *       تاریخ تولد | جنسیت (SegmentedTabs) · بیوگرافی
 *   ← «پروفایل ورزشی»: سن | قد | وزن با واحد داخل فیلد
 *   ← «کد دعوت»: فیلد + کپی آیکونی + فرستادن لینک (تونال)
 *   ← پاورقی چسبان «تغییرات ذخیره نشده داری» فقط وقتی فرم تغییر کرده:
 *       «لغو» (بی‌زمینه، برمی‌گردونه به آخرین مقدار ذخیره‌شده) + «ذخیره تغییرات» (اصلی)
 *
 * طبق درخواست صریح کاربر:
 *   • ایمیل اصلا این‌جا نیست (نه نمایش، نه فلوی تغییر).
 *   • یوزرنیم دکمه‌ی «تغییر» ندارد — خود فیلد ویرایش‌پذیر است و با همان
 *     دکمه‌ی ذخیره ثبت می‌شود (روت اختصاصی‌اش داخل saveAll صدا زده
 *     می‌شود، چون یکتایی‌اش سمت سرور چک می‌شود).
 *   • اسکیپ هیچ‌وقت فرم را دور نمی‌ریزد: بستن پنجره‌ی تاریخ/عکس فقط همان
 *     پنجره را می‌بندد؛ تنها راه دورریختن تغییرها دکمه‌ی «لغو» است.
 */
export default function AccountProfilePage() {
  // پروفایل ورزشی فقط روی ورزش و دامنه‌ی اصلی (جداسازی بخش‌ها، docs/sections.md)
  const section = useSection();
  const showSports = !section || section === "workout";
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // آخرین مقدار ذخیره‌شده (یا بارگذاری‌شده از سرور). «تغییر کرده؟» و «لغو» روی همین حساب می‌شن.
  const [base, setBase] = useState<Draft>(EMPTY_DRAFT);
  const draft: Draft = { firstName, lastName, username: username.replace(/^@+/, ""), bio, birthDate, gender, ageYears, heightCm, weightKg, refCode };
  const dirty = draftKey(draft) !== draftKey(base);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as ProfileUser | undefined;
      if (!u) { setLoadFailed(true); return; }
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
      let dob: JalaliDate | null = null;
      if (u.birthDate) {
        const d = new Date(u.birthDate);
        dob = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        setBirthDate(dob);
      }
      setBase((b) => ({ ...b, firstName: first, lastName: u.lastName ?? "", username: u.username ?? "", bio: u.bio ?? "", birthDate: dob }));
    });
    fetch("/api/account/referral")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRefCode(d.code ?? "");
        setBase((b) => ({ ...b, refCode: d.code ?? "" }));
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
      const g: Gender = m.gender ?? "unset";
      const age = m.ageYears != null ? String(m.ageYears) : "";
      const h = m.heightCm != null ? String(m.heightCm) : "";
      const w = m.weightKg != null ? String(m.weightKg) : "";
      setGender(g);
      setAgeYears(age);
      setHeightCm(h);
      setWeightKg(w);
      setBase((b) => ({ ...b, gender: g, ageYears: age, heightCm: h, weightKg: w }));
    });
  }, []);

  // تغییر ذخیره‌نشده هنگام بستن/رفرش تب هشدار می‌گیره (ناوبری داخلی اپ مثل قبل آزاده)
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

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
    // قد/وزن/سن با جدول مشترک (lib/numberLimits.ts) سنجیده می‌شن؛ سرور هم دوباره می‌سنجه
    for (const [text, key] of [[heightCm, "heightCm"], [weightKg, "weightKg"], [ageYears, "ageYears"]] as const) {
      const r = readTyped(text, key);
      if (!r.ok) { setSaveError(r.error); return; }
    }

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
      window.dispatchEvent(new Event("account-updated"));
      setData((d) => (d ? {
        ...d, firstName: name, name: [name, family].filter(Boolean).join(" ") || null, lastName: family, bio: bio.trim() || null, username: uname || null,
        birthDate: birthDate ? jalaliToGregorianApprox(birthDate[0], birthDate[1], birthDate[2]).toISOString() : null,
      } : d));
      // مقدارهای نرمال‌شده (بدون فاصله‌ی اضافه، بدون @) به فرم برمی‌گردن و می‌شن
      // «آخرین مقدار ذخیره‌شده»؛ پس پاورقی تغییرات همین‌جا خودش می‌بنده.
      const finalCode = code || savedRefCode || "";
      setFirstName(name); setLastName(family); setBio(bio.trim()); setUsername(uname); setRefCode(finalCode);
      setBase({
        firstName: name, lastName: family, username: uname, bio: bio.trim(), birthDate, gender,
        ageYears, heightCm, weightKg, refCode: finalCode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch {
      setSaveError(tr("مشکلی در اتصال به سرور پیش اومد", "Could not reach the server"));
    } finally {
      setSaving(false);
    }
  }

  /** «لغو»: همه‌ی فیلدها به آخرین مقدار ذخیره‌شده برمی‌گردن */
  function cancelChanges() {
    setFirstName(base.firstName); setLastName(base.lastName); setUsername(base.username); setBio(base.bio);
    setBirthDate(base.birthDate); setGender(base.gender);
    setAgeYears(base.ageYears); setHeightCm(base.heightCm); setWeightKg(base.weightKg); setRefCode(base.refCode);
    setSaveError(null);
  }

  // کپی/اشتراک فقط برای کدی که ذخیره شده (ویرایش‌نشده)
  const inviteReady = !!savedRefCode && refCode === savedRefCode;
  async function copyInviteCode() {
    if (!savedRefCode) return;
    try {
      await navigator.clipboard.writeText(savedRefCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch { /* کلیپ‌بورد ممکنه رد کنه — دکمه همون‌طور می‌مونه */ }
  }
  async function shareInvite() {
    if (!savedRefCode) return;
    const url = `${window.location.origin}/subscription?ref=${savedRefCode}`;
    try {
      if (typeof (navigator as any).share === "function") await (navigator as any).share({ title: tr("کد دعوت", "Invite code"), url });
      else {
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 1500);
      }
    } catch { /* کاربر شیت اشتراک رو بست */ }
  }

  if (!data) {
    return (
      <section>
        <AccountPageHead title={tr("پروفایل", "Profile")} />
        {loadFailed ? (
          <div className="ap-card account-card">
            <div className="ap-empty">
              <div>{tr("اطلاعات پروفایل باز نشد", "Could not load your profile")}</div>
              <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>{tr("تلاش دوباره", "Try again")}</button>
            </div>
          </div>
        ) : <AccountSkeleton blocks={3} />}
      </section>
    );
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || tr("کاربر آریون", "Arion user");
  const genderOptions: { value: Gender; label: string }[] = [
    { value: "male", label: tr("مرد", "Male") },
    { value: "female", label: tr("زن", "Female") },
    { value: "unset", label: tr("نمی‌گم", "Prefer not to say") },
  ];

  return (
    <section className="ap-profile">
      <AccountPageHead title={tr("پروفایل", "Profile")} />

      {/* ── بنر + آواتار ── */}
      <div className="ap-cover account-card ap-card m-rise">
        <div className={`ap-cover-banner${bannerUrl ? "" : " is-empty"}`}>
          {bannerUrl && <img src={bannerUrl} alt="" className="ap-cover-img" />}
          <div className="ap-cover-actions">
            {bannerUrl && (
              <button type="button" className="btn btn-icon btn-sm btn-danger btn-on-media" onClick={removeBanner} disabled={bannerSaving} aria-label={tr("حذف بنر", "Remove banner")}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
            <button
              type="button" className={`btn btn-outline btn-sm btn-on-media${bannerSaving ? " is-loading" : ""}`}
              onClick={() => bannerInputRef.current?.click()} disabled={bannerSaving} aria-busy={bannerSaving || undefined}
            >
              {bannerSaving && <Spinner className="btn-spinner" size={15} label={null} />}
              <Camera size={16} aria-hidden="true" />
              {bannerUrl ? tr("تغییر بنر", "Change banner") : tr("افزودن بنر", "Add banner")}
            </button>
          </div>
          <input
            ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickBannerFile(f); e.target.value = ""; }}
          />
        </div>

        <div className="ap-cover-row">
          <div className="ap-cover-avatar-wrap">
            {/* خود عکس هم قابل‌لمسه ولی کنترل اصلی (قابل‌دسترس با کیبورد) دکمه‌ی دوربینه */}
            <button type="button" className="ap-cover-avatar" onClick={onAvatarTap} disabled={avatarSaving} tabIndex={-1} aria-hidden="true">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="ap-cover-avatar-img" />
              ) : (
                <AgentAvatar seed={fullName || username || "؟"} size={96} className="ap-cover-avatar-img" />
              )}
            </button>
            <button
              type="button" className={`btn btn-primary btn-icon btn-round ap-cover-cam${avatarSaving ? " is-loading" : ""}`}
              onClick={onAvatarTap} disabled={avatarSaving} aria-busy={avatarSaving || undefined} aria-label={tr("تغییر عکس پروفایل", "Change profile photo")}
            >
              {avatarSaving && <Spinner className="btn-spinner" size={14} label={null} />}
              <Camera size={15} aria-hidden="true" />
            </button>
          </div>
          <input
            ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAvatarFile(f); e.target.value = ""; }}
          />
          <div className="ap-cover-meta">
            <div className="ap-cover-name"><GoldenName golden={data.golden} staff={data.staff}>{fullName}</GoldenName></div>
            {savedUsername && <div className="ap-cover-user mono" dir="ltr">@{savedUsername}</div>}
          </div>
        </div>

        {mediaError && <div className="field-error-msg ap-cover-error" role="alert" style={{ display: "block" }}>{mediaError}</div>}
      </div>

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

      {/* همه‌ی کارت‌های فرم زیر یک <form> تا Enter هم ذخیره کنه؛ دکمه‌های داخلش همه type=button‌اند. */}
      <form onSubmit={(e) => { e.preventDefault(); if (dirty && !saving) saveAll(); }} noValidate>

        {/* ── اطلاعات حساب ── */}
        <AccountBlock
          title={tr("اطلاعات حساب", "Account details")} icon={<IdCard />} index={0}
          desc={tr("چیزهایی که دوستان و مربی‌هات می‌بینن", "What your friends and mentors see")}
        >
          <div className="ap-field-grid">
            <AuthField id="pf-name" label={tr("نام", "First name")}>
              <input id="pf-name" type="text" className="wsearch-newform-name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </AuthField>
            <AuthField id="pf-lastname" label={tr("نام خانوادگی", "Last name")}>
              <input id="pf-lastname" type="text" className="wsearch-newform-name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </AuthField>

            {/* شماره همراه عمدا فقط‌خواندنی است: تغییرش یعنی تغییر شناسه‌ی ورود
                و باید با تایید پیامکی انجام شود، نه با یک ذخیره‌ی ساده. */}
            <AuthField id="pf-phone" label={tr("شماره همراه", "Phone number")}>
              <input id="pf-phone" type="text" className={`wsearch-newform-name mono ap-ltr${data.phone && data.phoneVerifiedAt ? " ap-pe-chip" : ""}`} dir="ltr" value={data.phone || tr("ثبت نشده", "Not set")} readOnly disabled />
              {data.phone && data.phoneVerifiedAt && <span className="ap-affix is-ok">{tr("تایید شده", "Verified")}</span>}
            </AuthField>

            {/* یوزرنیم با @ جلوش نشون داده می‌شه (جزو متن فیلده، پس چسبیده به یوزرنیم می‌شینه)؛
                در state بدون @ نگه داشته می‌شه. */}
            <AuthField id="pf-username" label={tr("یوزرنیم", "Username")}>
              <input
                id="pf-username" type="text" className="wsearch-newform-name mono ap-ltr" dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false}
                value={username ? `@${username.replace(/^@+/, "")}` : ""} onChange={(e) => setUsername(e.target.value.replace(/^@+/, ""))} placeholder="@username"
              />
            </AuthField>

            <AuthField id="pf-dob" label={tr("تاریخ تولد", "Birth date")}>
              <button type="button" id="pf-dob" className={`jdate-btn ap-pe-icon${birthDate ? "" : " placeholder"}`} onClick={() => setDobOpen(true)}>
                {birthDate ? formatJalali(birthDate) : tr("انتخاب تاریخ", "Select date")}
              </button>
              <span className="ap-affix is-icon" aria-hidden="true"><CalendarDays size={16} /></span>
            </AuthField>

            <div className="name-field-wrap" data-anim-field>
              <span className="ap-field-label">{tr("جنسیت", "Gender")}</span>
              <SegmentedTabs<Gender> className="seg-flush ap-seg" ariaLabel={tr("جنسیت", "Gender")} options={genderOptions} active={gender} onChange={setGender} />
            </div>

            <div className="ap-span-2">
              <AuthField id="pf-bio" label={tr("بیوگرافی", "Bio")}>
                <textarea
                  id="pf-bio" className="wsearch-newform-name ap-textarea" rows={3} maxLength={BIO_MAX}
                  value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder={tr("یه توضیح کوتاه درباره‌ی خودت", "A short description about yourself")}
                />
                <span className="ap-counter mono" dir="ltr">{bio.length}/{BIO_MAX}</span>
              </AuthField>
            </div>
          </div>
        </AccountBlock>

        {/* ── پروفایل ورزشی ── */}
        {showSports && (
          <AccountBlock
            title={tr("پروفایل ورزشی", "Sports profile")} icon={<Dumbbell />} index={1}
            desc={tr("برای بخش ورزش و کالری لازمه؛ توی فرم‌های اون بخش‌ها هم پر می‌شه", "Needed for the workout and calorie sections; it also fills their forms")}
          >
            <div className="ap-field-grid is-3">
              <AuthField id="pf-age" label={tr("سن", "Age")}>
                <NumberInput id="pf-age" limit="ageYears" dir="ltr" className="wsearch-newform-name ap-ltr ap-pe-unit" value={ageYears} onChange={setAgeYears} />
                <span className="ap-affix">{tr("سال", "yr")}</span>
              </AuthField>
              <AuthField id="pf-height" label={tr("قد", "Height")}>
                <NumberInput id="pf-height" limit="heightCm" dir="ltr" className="wsearch-newform-name ap-ltr ap-pe-unit" value={heightCm} onChange={setHeightCm} />
                <span className="ap-affix">{tr("سانتی‌متر", "cm")}</span>
              </AuthField>
              <AuthField id="pf-weight" label={tr("وزن", "Weight")}>
                <NumberInput id="pf-weight" limit="weightKg" dir="ltr" className="wsearch-newform-name ap-ltr ap-pe-unit" value={weightKg} onChange={setWeightKg} />
                <span className="ap-affix">{tr("کیلوگرم", "kg")}</span>
              </AuthField>
            </div>
          </AccountBlock>
        )}

        {/* ── کد دعوت ── */}
        <AccountBlock
          title={tr("کد دعوت", "Invite code")} icon={<Gift />} index={2}
          desc={tr(`دوستت ${faNum(REFERRAL_DISCOUNT_PERCENT)}٪ روی اولین خرید تخفیف می‌گیره، تو ${faNum(10)}٪ اعتبار کیف`, `Your friend gets ${faNum(REFERRAL_DISCOUNT_PERCENT)}% off their first purchase, you get ${faNum(10)}% as wallet credit`)}
        >
          <div className="ap-invite-row">
            <AuthField id="pf-refcode" label={tr("اسم کد (4 تا 16 حرف انگلیسی یا عدد)", "Code name (4 to 16 English letters or digits)")}>
              <input
                id="pf-refcode" type="text" className="wsearch-newform-name mono ap-ltr ap-code-input" dir="ltr"
                value={refCode} maxLength={16} autoCapitalize="characters" spellCheck={false}
                onChange={(e) => setRefCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="MYCODE"
              />
            </AuthField>
            <button
              type="button" className="btn btn-outline btn-icon btn-lg btn-round" onClick={copyInviteCode} disabled={!inviteReady}
              aria-label={codeCopied ? tr("کپی شد", "Copied") : tr("کپی کد", "Copy code")} title={codeCopied ? tr("کپی شد", "Copied") : tr("کپی کد", "Copy code")}
            >
              {codeCopied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
            </button>
            <button type="button" className="btn btn-tonal ap-h46" onClick={shareInvite} disabled={!inviteReady}>
              {linkCopied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
              {linkCopied ? tr("لینک کپی شد", "Link copied") : tr("فرستادن لینک دعوت", "Send invite link")}
            </button>
          </div>
          {refStats && (
            <div className="ap-invite-stats">
              <span>
                <b>{faNum(refStats.invitedPaid)}</b>{" "}
                {tr("دوست با کدت خرید کردن", refStats.invitedPaid === 1 ? "friend has purchased with your code" : "friends have purchased with your code")}
              </span>
              <span>{tr("موجودی کیف", "Wallet balance")} <b>{formatPriceAmount(refStats.walletBalance)}</b></span>
            </div>
          )}
          <p className="ap-field-note">
            {tr(`به‌ازای هر دوستی که با پول واقعی خرید کنه 10٪ از همون مبلغ به‌صورت اعتبار داخل کیف خودت واریز می‌شه و هر دوست فقط یک بار از تخفیف کدت استفاده می‌کنه. اعتبار فقط برای کم‌کردن قیمت خرید پلن بعدیه و قابل‌برداشت نیست.`, `For every friend who buys with real money, 10% of that amount is added to your wallet as credit, and each friend can use your code's discount only once. The credit can only reduce the price of your next plan and cannot be withdrawn.`)}
          </p>
        </AccountBlock>

        <AccountActionBar visible={dirty || saved} saved={saved && !dirty} saving={saving} error={saveError} onCancel={cancelChanges} />
      </form>

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
