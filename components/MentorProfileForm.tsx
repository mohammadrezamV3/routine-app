"use client";

import { useState } from "react";
import { Ban, Check, Plus, Tag, X } from "lucide-react";
import { TickOption } from "./TickOption";
import { Spinner } from "./Spinner";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorField, MentorNotice } from "./MentorUI";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META, type MentorCategory } from "@/lib/mentorCategories";
import type { MentorSelf } from "@/lib/mentorTypes";
import { MENTOR_TERMS_REQUIRED_MESSAGE, MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";
import { MentorTermsAcceptance, mentorTermsPayload } from "./MentorTermsAcceptance";

// همان سقف‌های سرور (app/api/mentors/me و lib/mentorValidate.ts)
export const HEADLINE_MAX = 120;
export const BIO_MAX = 2000;
export const SPECIALTY_MAX = 40;
export const SPECIALTIES_MAX = 10;
export const ROUTINE_ROLE_MAX = 60;

const ic = (Icon: typeof Tag, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * فرم پروفایل منتوری؛ PUT /api/mentors/me. اولین ذخیره پروفایل را می‌سازد.
 * انتشار فقط با حداقل یک حوزه و بیوگرافی ممکن است (سرور هم بررسی می‌کند).
 * نقش روتین فقط وقتی حوزه‌ی ROUTINE انتخاب شده ارسال می‌شود؛ بدون آن null.
 * پذیرش شاگرد، ظرفیت و عدم حضور در /mentor/settings است و این فرم آن‌ها را نمی‌فرستد.
 */
export function MentorProfileForm({ profile, onSaved }: { profile: MentorSelf | null; onSaved: (p: MentorSelf) => void }) {
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [specialties, setSpecialties] = useState<string[]>(profile?.specialties ?? []);
  const [specInput, setSpecInput] = useState("");
  const [categories, setCategories] = useState<MentorCategory[]>(
    (profile?.categories ?? []).filter((c): c is MentorCategory => (MENTOR_CATEGORIES as readonly string[]).includes(c)),
  );
  const [routineRole, setRoutineRole] = useState(profile?.routineRole ?? "");
  const [published, setPublished] = useState(profile?.published ?? false);
  // پذیرش نسخه‌ی جاری «شرایط منتوری» (lib/mentorTerms.ts)؛ بدون آن سرور 400 می‌دهد
  const needsTerms = profile?.mentorTermsVersion !== MENTOR_TERMS_VERSION;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsErr, setTermsErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ bio?: string; categories?: string; headline?: string; spec?: string; role?: string }>({});

  const isNew = !profile;
  const hasRoutine = categories.includes("ROUTINE");
  const missing = [categories.length === 0 && "حداقل یک حوزه", !bio.trim() && "بیوگرافی"].filter(Boolean) as string[];

  function touched() { setSaved(false); setError(null); }

  function addSpecialty() {
    const v = specInput.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (v.length > SPECIALTY_MAX) { setFieldErr((e) => ({ ...e, spec: `هر تخصص حداکثر ${fa(SPECIALTY_MAX)} حرف است` })); return; }
    if (specialties.length >= SPECIALTIES_MAX) { setFieldErr((e) => ({ ...e, spec: `حداکثر ${fa(SPECIALTIES_MAX)} تخصص` })); return; }
    if (!specialties.includes(v)) setSpecialties((s) => [...s, v]);
    setSpecInput("");
    setFieldErr((e) => ({ ...e, spec: undefined }));
    touched();
  }

  function toggleCategory(c: MentorCategory, on: boolean) {
    setCategories((cs) => (on ? Array.from(new Set([...cs, c])) : cs.filter((x) => x !== c)));
    setFieldErr((e) => ({ ...e, categories: undefined, role: c === "ROUTINE" ? undefined : e.role }));
    touched();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaved(false);
    const role = routineRole.replace(/\s+/g, " ").trim();
    const errs: typeof fieldErr = {};
    if (headline.trim().length > HEADLINE_MAX) errs.headline = `حداکثر ${fa(HEADLINE_MAX)} حرف`;
    if (bio.trim().length > BIO_MAX) errs.bio = `حداکثر ${fa(BIO_MAX)} حرف`;
    if (published && !bio.trim()) errs.bio = "برای انتشار، بیوگرافی لازم است";
    if (published && categories.length === 0) errs.categories = "برای انتشار، حداقل یک حوزه انتخاب کن";
    if (hasRoutine && role.length > ROUTINE_ROLE_MAX) errs.role = `حداکثر ${fa(ROUTINE_ROLE_MAX)} حرف`;
    setFieldErr(errs);
    const termsMissing = needsTerms && !termsAccepted;
    setTermsErr(termsMissing ? MENTOR_TERMS_REQUIRED_MESSAGE.mentor : null);
    if (Object.keys(errs).length || termsMissing) { setError(termsMissing && !Object.keys(errs).length ? null : "چند مورد نیاز به اصلاح دارد"); return; }

    // تخصص تایپ‌شده‌ای که هنوز «افزودن» نخورده هم ذخیره شود
    const pending = specInput.trim().replace(/\s+/g, " ");
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
        routineRole: hasRoutine ? role || null : null,
        published,
        ...mentorTermsPayload(needsTerms && termsAccepted),
      },
    });
    setSaving(false);
    if (!r.ok) { setError(r.error); return; }
    setTermsAccepted(false);
    setSpecialties(specs);
    setSpecInput("");
    setRoutineRole(r.data.profile.routineRole ?? "");
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
    onSaved(r.data.profile);
  }

  return (
    <form onSubmit={save} noValidate className="mv2-set-profile">
      {profile?.suspendedAt && (
        <MentorNotice tone="danger" icon={ic(Ban, MI.row)} title="حساب مربی‌گری‌ت موقتا بسته شده">
          {profile.suspendedReason || "تا باز شدن حساب، پروفایلت توی فهرست مربی‌ها دیده نمی‌شه"}
        </MentorNotice>
      )}

      <div className="mentor-form">
        <MentorField label="عنوان کوتاه" htmlFor="mp-headline" optional error={fieldErr.headline} hint={`حداکثر ${fa(HEADLINE_MAX)} حرف`}>
          <input
            id="mp-headline" type="text" className="wsearch-newform-name trade-glass-field" maxLength={HEADLINE_MAX}
            value={headline} placeholder="مثلا مربی بدنسازی با 8 سال سابقه"
            onChange={(e) => { setHeadline(e.target.value); setFieldErr((x) => ({ ...x, headline: undefined })); touched(); }}
          />
        </MentorField>
        <MentorField label="بیوگرافی" htmlFor="mp-bio" error={fieldErr.bio} hint={`${fa(bio.length)} از ${fa(BIO_MAX)} حرف`}>
          <textarea
            id="mp-bio" className="wsearch-newform-name trade-glass-field" rows={5} maxLength={BIO_MAX}
            value={bio} placeholder="مثلا سابقه، روش کار و اینکه به چه کسایی کمک می‌کنی"
            onChange={(e) => { setBio(e.target.value); setFieldErr((x) => ({ ...x, bio: undefined })); touched(); }}
          />
        </MentorField>

        <MentorField label="حوزه‌ها" error={fieldErr.categories} hint="برای هر حوزه، یه بخش مدرک جدا توی تایید هویت اضافه می‌شه">
          <div role="group" aria-label="حوزه‌ها" className="mv2-set-cats">
            {MENTOR_CATEGORIES.map((c) => (
              <TickOption key={c} checked={categories.includes(c)} onChange={(v) => toggleCategory(c, v)}>
                {MENTOR_CATEGORY_META[c].label}
              </TickOption>
            ))}
          </div>
        </MentorField>

        {hasRoutine && (
          <MentorField
            label="نقش تو در این حوزه" htmlFor="mp-role" optional error={fieldErr.role}
            hint={`کنار حوزه‌ی «${MENTOR_CATEGORY_META.ROUTINE.label}» روی پروفایلت نشون داده می‌شه؛ حداکثر ${fa(ROUTINE_ROLE_MAX)} حرف`}
          >
            <input
              id="mp-role" type="text" className="wsearch-newform-name trade-glass-field" maxLength={ROUTINE_ROLE_MAX}
              value={routineRole} placeholder="مثلا استاد ریاضی، مشاور کنکور"
              onChange={(e) => { setRoutineRole(e.target.value); setFieldErr((x) => ({ ...x, role: undefined })); touched(); }}
            />
          </MentorField>
        )}

        <MentorField label="تخصص‌ها" htmlFor="mp-spec" optional error={fieldErr.spec} hint={`حداکثر ${fa(SPECIALTIES_MAX)} مورد`}>
          {specialties.length > 0 && (
            <div className="mentor-chips">
              {specialties.map((sp) => (
                <span key={sp} className="mentor-chip is-cat mv2-set-spec">
                  <span>{sp}</span>
                  <button
                    type="button" className="mentor-text-btn mv2-set-spec-x"
                    onClick={() => { setSpecialties((xs) => xs.filter((x) => x !== sp)); touched(); }}
                    aria-label={`حذف تخصص ${sp}`}
                  >
                    {ic(X, MI.chip)}
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-stretch gap-2">
            <input
              id="mp-spec" type="text" className="wsearch-newform-name trade-glass-field min-w-0 flex-1" maxLength={SPECIALTY_MAX}
              value={specInput} placeholder="مثلا کاهش وزن"
              onChange={(e) => { setSpecInput(e.target.value); setFieldErr((x) => ({ ...x, spec: undefined })); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialty(); } }}
            />
            <button
              type="button" className="account-outline-btn mentor-btn" onClick={addSpecialty}
              disabled={!specInput.trim() || specialties.length >= SPECIALTIES_MAX}
            >
              {ic(Plus, MI.btn)} افزودن
            </button>
          </div>
        </MentorField>

        <div className="mv2-set-publish">
          <TickOption
            checked={published}
            onChange={(v) => { setPublished(v); setFieldErr((x) => ({ ...x, bio: undefined, categories: undefined })); touched(); }}
          >
            نمایش در فهرست مربی‌ها
          </TickOption>
          <p className="mentor-field-hint">
            {missing.length > 0 && !published
              ? `برای نمایش، ${missing.join(" و ")} لازمه`
              : profile?.identityStatus === "VERIFIED"
                ? "پروفایلت توی فهرست مربی‌ها دیده می‌شه"
                : "بعد از تایید مدرک شناسایی توی فهرست مربی‌ها دیده می‌شه"}
          </p>
        </div>
      </div>

      {needsTerms && (
        <div className="mentor-terms-row">
          <MentorTermsAcceptance
            role="mentor" checked={termsAccepted} error={termsErr}
            onChange={(v) => { setTermsAccepted(v); setTermsErr(null); touched(); }}
          />
        </div>
      )}
      {error && <div className="form-inline-error" role="alert">{error}</div>}
      <div className="mentor-form-actions" style={{ marginTop: error ? undefined : 0 }}>
        <button type="submit" className="trade-primary-btn mentor-btn" disabled={saving}>
          {saving ? <Spinner size={14} /> : saved ? <>{ic(Check, MI.btn)} ذخیره شد</> : isNew ? "ساخت پروفایل" : "ذخیره"}
        </button>
      </div>
    </form>
  );
}
