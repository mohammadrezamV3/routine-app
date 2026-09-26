"use client";

import { useState } from "react";
import { Eye, IdCard, NotebookPen, Plus, Sparkles, Tag, UserCheck, X } from "lucide-react";
import { AccountBlock, AccountOption, AccountSaveBar } from "./AccountUI";
import { AuthField } from "./AuthField";
import { ToggleSwitch } from "./ToggleSwitch";
import { MentorDashNotice, fa, mentorApi } from "./MentorDashKit";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META, type MentorCategory } from "@/lib/mentorCategories";
import type { MentorSelf } from "@/lib/mentorTypes";

export const HEADLINE_MAX = 120;
export const BIO_MAX = 2000;
export const SPECIALTY_MAX = 40;
export const SPECIALTIES_MAX = 10;

/**
 * فرمِ پروفایلِ منتوری — PUT /api/mentors/me. اولین ذخیره خودِ پروفایل رو
 * می‌سازه. انتشار فقط با حداقل یک دسته و بیوگرافی مجازه (سرور هم چک می‌کنه؛
 * این‌جا فقط راهنمایی و جلوگیری از رفت‌وبرگشتِ بی‌فایده‌ست).
 */
export function MentorProfileForm({ profile, onSaved }: { profile: MentorSelf | null; onSaved: (p: MentorSelf) => void }) {
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [specialties, setSpecialties] = useState<string[]>(profile?.specialties ?? []);
  const [specInput, setSpecInput] = useState("");
  const [categories, setCategories] = useState<MentorCategory[]>(
    (profile?.categories ?? []).filter((c): c is MentorCategory => (MENTOR_CATEGORIES as readonly string[]).includes(c)),
  );
  const [published, setPublished] = useState(profile?.published ?? false);
  const [accepting, setAccepting] = useState(profile?.acceptingStudents ?? true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ bio?: string; categories?: string; headline?: string; spec?: string }>({});

  const isNew = !profile;
  const canPublish = categories.length > 0 && bio.trim().length > 0;

  function addSpecialty() {
    const v = specInput.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (v.length > SPECIALTY_MAX) { setFieldErr((e) => ({ ...e, spec: `هر تخصص حداکثر ${fa(SPECIALTY_MAX)} کاراکتر` })); return; }
    if (specialties.length >= SPECIALTIES_MAX) { setFieldErr((e) => ({ ...e, spec: `حداکثر ${fa(SPECIALTIES_MAX)} تخصص` })); return; }
    if (specialties.some((s) => s === v)) { setSpecInput(""); return; }
    setSpecialties((s) => [...s, v]);
    setSpecInput("");
    setFieldErr((e) => ({ ...e, spec: undefined }));
  }

  function toggleCategory(c: MentorCategory, on: boolean) {
    setCategories((cs) => (on ? Array.from(new Set([...cs, c])) : cs.filter((x) => x !== c)));
    setFieldErr((e) => ({ ...e, categories: undefined }));
  }

  async function save() {
    setError(null);
    setSaved(false);
    const errs: typeof fieldErr = {};
    if (headline.trim().length > HEADLINE_MAX) errs.headline = `حداکثر ${fa(HEADLINE_MAX)} کاراکتر`;
    if (bio.trim().length > BIO_MAX) errs.bio = `حداکثر ${fa(BIO_MAX)} کاراکتر`;
    if (published && !bio.trim()) errs.bio = "برای انتشار، بیوگرافی لازمه";
    if (published && categories.length === 0) errs.categories = "برای انتشار، حداقل یک دسته انتخاب کن";
    setFieldErr(errs);
    if (Object.keys(errs).length) { setError("چند مورد نیاز به اصلاح داره"); return; }

    // تخصصِ تایپ‌شده‌ای که هنوز «افزودن» نخورده هم ذخیره بشه
    const pending = specInput.trim();
    const specs = pending && !specialties.includes(pending) && pending.length <= SPECIALTY_MAX && specialties.length < SPECIALTIES_MAX
      ? [...specialties, pending] : specialties;

    setSaving(true);
    const r = await mentorApi<{ profile: MentorSelf }>("/api/mentors/me", {
      method: "PUT",
      body: {
        headline: headline.trim(),
        bio: bio.trim(),
        specialties: specs,
        categories,
        published,
        acceptingStudents: accepting,
      },
    });
    setSaving(false);
    if (!r.ok) { setError(r.error); return; }
    setSpecialties(specs);
    setSpecInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
    onSaved(r.data.profile);
  }

  return (
    <>
      {isNew && (
        <MentorDashNotice tone="info" icon={<Sparkles size={16} />} title="ساخت پروفایل منتوری">
          با اولین ذخیره پروفایلت ساخته می‌شه. تا وقتی «انتشار» رو روشن نکنی، کسی نمی‌بیندش.
          یادت باشه آریون فقط پلتفرمه و مسئولیت محتوای برنامه‌ها با خودته.
        </MentorDashNotice>
      )}
      {profile?.suspendedAt && (
        <MentorDashNotice tone="danger" title="حساب منتوری‌ات معلق شده">
          {profile.suspendedReason ? `دلیل: ${profile.suspendedReason}. ` : ""}تا رفع تعلیق پروفایلت در فهرست منتورها دیده نمی‌شه.
        </MentorDashNotice>
      )}

      <AccountBlock title="معرفی" icon={<IdCard size={15} />} index={0}>
        <div className="acc-field-stack">
          <AuthField id="mp-headline" label="عنوان کوتاه" icon={<UserCheck size={16} />} error={fieldErr.headline}>
            <input
              id="mp-headline" type="text" className="wsearch-newform-name" maxLength={HEADLINE_MAX}
              value={headline} onChange={(e) => setHeadline(e.target.value)}
              placeholder="مثلا: مربی بدنسازی با ۸ سال سابقه"
            />
          </AuthField>
          <AuthField id="mp-bio" label="بیوگرافی" icon={<NotebookPen size={16} />} error={fieldErr.bio}>
            <textarea
              id="mp-bio" className="wsearch-newform-name acc-textarea" rows={5} maxLength={BIO_MAX}
              value={bio} onChange={(e) => { setBio(e.target.value); setFieldErr((x) => ({ ...x, bio: undefined })); }}
              placeholder="سابقه، روش کار و این‌که به چه کسانی می‌تونی کمک کنی"
            />
            <span className="acc-field-counter mono" dir="ltr">{bio.length}/{BIO_MAX}</span>
          </AuthField>
        </div>
      </AccountBlock>

      <AccountBlock title="تخصص‌ها و دسته‌ها" icon={<Tag size={15} />} index={1}>
        <AccountOption label="دسته‌ها" desc="هر دسته‌ای که انتخاب کنی یک کارت مدرک جدا در بخش احراز هویت می‌گیره.">
          <div className="flex flex-col gap-2.5">
            {MENTOR_CATEGORIES.map((c) => (
              <label key={c} className="auth-remember-label" style={{ margin: 0 }}>
                <input type="checkbox" className="auth-checkbox" checked={categories.includes(c)} onChange={(e) => toggleCategory(c, e.target.checked)} />
                {MENTOR_CATEGORY_META[c].label}
              </label>
            ))}
          </div>
          {fieldErr.categories && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{fieldErr.categories}</div>}
        </AccountOption>

        <AccountOption label="تخصص‌ها" desc={`تا ${fa(SPECIALTIES_MAX)} مورد — مثلا «کاهش وزن»، «حجم»، «رژیم گیاهی».`}>
          {specialties.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {specialties.map((s) => (
                <button
                  key={s} type="button" className="account-outline-btn muted"
                  style={{ padding: "4px 10px", fontSize: 11.5, borderRadius: 999 }}
                  onClick={() => setSpecialties((xs) => xs.filter((x) => x !== s))}
                  aria-label={`حذف ${s}`}
                >
                  {s} <X size={12} />
                </button>
              ))}
            </div>
          )}
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <AuthField id="mp-spec" label="تخصص جدید" error={fieldErr.spec}>
                <input
                  id="mp-spec" type="text" className="wsearch-newform-name" maxLength={SPECIALTY_MAX}
                  value={specInput} placeholder="مثلا: کاهش وزن"
                  onChange={(e) => { setSpecInput(e.target.value); setFieldErr((x) => ({ ...x, spec: undefined })); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialty(); } }}
                />
              </AuthField>
            </div>
            <button type="button" className="account-outline-btn self-end" style={{ minHeight: 40 }} onClick={addSpecialty} disabled={!specInput.trim() || specialties.length >= SPECIALTIES_MAX}>
              <Plus size={14} /> افزودن
            </button>
          </div>
        </AccountOption>
      </AccountBlock>

      <AccountBlock title="نمایش پروفایل" icon={<Eye size={15} />} index={2}>
        <AccountOption label="انتشار پروفایل" desc="وقتی روشن باشه، پروفایلت در فهرست منتورها دیده می‌شه.">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-dash-muted">{published ? "منتشرشده" : "پنهان"}</span>
            <ToggleSwitch checked={published} onChange={(v) => { setPublished(v); setFieldErr((x) => ({ ...x, bio: undefined, categories: undefined })); }} label="انتشار پروفایل" />
          </div>
          {!canPublish && (
            <ul className="mb-0 mt-2 list-inside list-disc ps-0 text-[11.5px] leading-6" style={{ color: "#e0a636" }}>
              {categories.length === 0 && <li>حداقل یک دسته انتخاب کن</li>}
              {!bio.trim() && <li>بیوگرافی رو بنویس</li>}
            </ul>
          )}
        </AccountOption>
        <AccountOption label="پذیرش شاگرد جدید" desc="اگه ظرفیتت پره خاموشش کن؛ شاگردهای فعلی دست نمی‌خورن.">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-dash-muted">{accepting ? "درخواست می‌پذیرم" : "فعلا نمی‌پذیرم"}</span>
            <ToggleSwitch checked={accepting} onChange={setAccepting} label="پذیرش شاگرد جدید" />
          </div>
        </AccountOption>
      </AccountBlock>

      <AccountSaveBar onSave={save} saving={saving} saved={saved} error={error} label={isNew ? "ساخت پروفایل" : "ذخیره تغییرات"} />
    </>
  );
}
