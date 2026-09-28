"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, ShieldCheck } from "lucide-react";
import { MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorSection } from "@/components/MentorUI";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { AccountSaveBar } from "@/components/AccountUI";
import { LoadingBlock } from "@/components/Spinner";
import { getCustomOccurrences, IMPORTANCE_LABELS, type CustomOccurrence, type Importance } from "@/lib/storage";
import type { PrivacyResponse, PrivacyScope, PrivacySettings } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";

const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

// دسترسیِ منتور به روتینِ شاگرد («برنامه‌های قابل مشاهده» + «جزئیات قابل مشاهده»)
// — قبلا زبانه‌ی «دسترسی‌ها» توی صفحه‌ی رابطه بود؛ طبقِ درخواستِ صریح به
// «تنظیمات» پنلِ کاربری (/account/general) منتقل شد. تنظیم همچنان به‌ازای هر
// رابطه است و API همون /api/mentorships/[id]/privacy.
// ───────────────────────── دسترسی‌ها ─────────────────────────

/** همان کلیدِ lib/mentorPrivacy.ts (routineScopeKey) — نسخه‌ی کلاینتیِ بی‌وابستگی به سرور */
function scopeKeyOf(o: { name: string; tag?: string }): string {
  const label = (o.tag && o.tag.trim()) || (o.name || "").trim();
  return "routine:" + label.slice(0, 120);
}

const DETAIL_TOGGLES: { key: keyof Omit<PrivacySettings, "shareAllPrograms" | "sharedPrograms">; title: string; desc: string }[] = [
  { key: "showSchedule", title: "زمان‌بندی", desc: "روزها و ساعت‌هایی که مشغولی؛ خاموش باشد، هیچ بخشی از روتین دیده نمی‌شود" },
  { key: "showProgramName", title: "نام برنامه", desc: "برچسب هر بازه‌ی زمانی، مثلاً «دانشگاه»" },
  { key: "showTaskName", title: "نام کار", desc: "عنوان هر کار؛ خاموش باشد، فقط «مشغول» دیده می‌شود" },
  { key: "showTaskDetails", title: "جزئیات کار", desc: "میزان اهمیت هر کار" },
  { key: "showProgress", title: "پیشرفت", desc: "انجام شدن یا نشدن هر کار در هر روز" },
];

export function MentorPrivacySettings({ mentorshipId, mentorName, active }: { mentorshipId: string; mentorName: string; active: boolean }) {
  const [data, setData] = useState<{ privacy: PrivacySettings; scopes: PrivacyScope[] } | null>(null);
  const [draft, setDraft] = useState<PrivacySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [occs, setOccs] = useState<CustomOccurrence[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/privacy`, { cache: "no-store" });
      if (!res.ok) { setError(await readApiError(res, "تنظیمات دسترسی دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: PrivacyResponse = await res.json();
      setData(d);
      setDraft(d.privacy);
    } catch {
      setError(NETWORK_ERROR);
    }
  }, [mentorshipId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getCustomOccurrences().then((arr) => setOccs(arr.filter((o) => !(o as { mentorProgramId?: string }).mentorProgramId))).catch(() => setOccs([]));
  }, []);

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    const a = data.privacy, b = draft;
    return (
      a.shareAllPrograms !== b.shareAllPrograms || a.showSchedule !== b.showSchedule || a.showProgramName !== b.showProgramName ||
      a.showTaskName !== b.showTaskName || a.showTaskDetails !== b.showTaskDetails || a.showProgress !== b.showProgress ||
      a.sharedPrograms.length !== b.sharedPrograms.length || a.sharedPrograms.some((k) => !b.sharedPrograms.includes(k))
    );
  }, [data, draft]);

  if (error) return <MentorErrorState message={error} onRetry={load} />;
  if (!data || !draft) return <LoadingBlock />;

  function patch(p: Partial<PrivacySettings>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setSaved(false);
    setSaveError(null);
  }
  function toggleScope(key: string) {
    if (!draft) return;
    const has = draft.sharedPrograms.includes(key);
    patch({ sharedPrograms: has ? draft.sharedPrograms.filter((k) => k !== key) : [...draft.sharedPrograms, key] });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/privacy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) { setSaveError(await readApiError(res, "دسترسی‌ها ذخیره نشد؛ دوباره تلاش کن")); return; }
      const d: { privacy: PrivacySettings } = await res.json();
      setData((prev) => (prev ? { ...prev, privacy: d.privacy } : prev));
      setDraft(d.privacy);
      setSaved(true);
    } catch {
      setSaveError(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  }

  const allOn = draft.shareAllPrograms;
  const routineScopes = data.scopes.filter((s) => s.kind === "routine");
  const moduleScopes = data.scopes.filter((s) => s.kind === "module");
  const scopeChecked = (k: string) => allOn || draft.sharedPrograms.includes(k);

  return (
    <>
      <MentorSection
        title="برنامه‌های قابل مشاهده"
        icon={<ShieldCheck {...SECTION} />}
        desc={`فقط برای ${mentorName}؛ آنچه اجازه ندهی برایش فرستاده نمی‌شود.${active ? "" : " تا رابطه فعال نشود چیزی نمی‌بیند."}`}
      >
        <label className="mentor-check">
          <input type="checkbox" checked={allOn} onChange={(e) => patch({ shareAllPrograms: e.target.checked })} />
          <span className="mentor-check-label">
            <b>همه‌ی برنامه‌ها</b>
            <div className="mentor-check-kind">برنامه‌هایی که بعداً بسازی هم خودکار دیده می‌شوند</div>
          </span>
        </label>
        {routineScopes.length === 0 && <MentorEmpty>هنوز برنامه‌ای در روتینت نیست</MentorEmpty>}
        {[...routineScopes, ...moduleScopes].map((s) => (
          <label key={s.key} className={`mentor-check${allOn ? " is-disabled" : ""}`}>
            <input type="checkbox" checked={scopeChecked(s.key)} disabled={allOn} onChange={() => toggleScope(s.key)} />
            <span className="mentor-check-label">
              {s.label}
              <div className="mentor-check-kind">{s.kind === "module" ? "ماژول" : "برنامه‌ی روتین"}</div>
            </span>
          </label>
        ))}
      </MentorSection>

      <MentorSection title="جزئیات قابل مشاهده" icon={<Eye {...SECTION} />}>
        {DETAIL_TOGGLES.map((t) => {
          const disabled = t.key !== "showSchedule" && !draft.showSchedule;
          return (
            <div key={t.key} className="mentor-toggle-row" style={disabled ? { opacity: 0.55 } : undefined}>
              <div className="mentor-toggle-text">
                <div className="mentor-toggle-title">{t.title}</div>
                <div className="mentor-toggle-desc">{t.desc}</div>
              </div>
              <ToggleSwitch checked={draft[t.key]} onChange={(v) => patch({ [t.key]: v } as Partial<PrivacySettings>)} label={t.title} disabled={disabled} />
            </div>
          );
        })}

        <div className="mentor-field" style={{ marginTop: 16 }}>
          <span className="mentor-field-label">پیش‌نمایش</span>
          <PrivacyPreview draft={draft} occs={occs} />
        </div>

        <AccountSaveBar onSave={save} saving={saving} saved={saved && !dirty} error={saveError} disabled={!dirty} label="ذخیره‌ی دسترسی‌ها" />
      </MentorSection>
    </>
  );
}

function prettyTime(t: string): string {
  return t.replace(/\s*[-–—]\s*/, " – ");
}

/** پیش‌نمایشِ زنده — همان منطقِ projectRoutineForMentor سمتِ سرور، روی یکی از برنامه‌های خودِ کاربر */
function PrivacyPreview({ draft, occs }: { draft: PrivacySettings; occs: CustomOccurrence[] }) {
  const visible = (o: CustomOccurrence) => draft.shareAllPrograms || draft.sharedPrograms.includes(scopeKeyOf(o));
  const real = occs.find(visible) ?? occs[0];
  const sample = !real;
  const ex: { name: string; tag?: string; time: string; importance?: Importance } =
    real ?? { name: "مطالعه‌ی فصل ۳", tag: "دانشگاه", time: "18:00 - 19:00", importance: "high" };

  const actualParts = [ex.tag?.trim() || null, ex.name, ex.importance ? `اهمیت ${IMPORTANCE_LABELS[ex.importance]}` : null].filter((x): x is string => !!x);

  let hiddenLine: string | null = null;
  let mentorParts: string[] | null = null;
  if (!draft.showSchedule) hiddenLine = "هیچ زمان‌بندی‌ای دیده نمی‌شود";
  else if (!sample && !visible(real!)) hiddenLine = "این برنامه برای منتور دیده نمی‌شود";
  else if (sample && !draft.shareAllPrograms && draft.sharedPrograms.length === 0) hiddenLine = "هیچ برنامه‌ای انتخاب نشده؛ چیزی دیده نمی‌شود";
  else {
    const hasTag = !!ex.tag?.trim();
    const program = draft.showProgramName && (hasTag || draft.showTaskName) ? (ex.tag?.trim() || ex.name) : null;
    const parts: string[] = [];
    if (program) parts.push(program);
    parts.push(draft.showTaskName ? ex.name : "مشغول");
    if (draft.showTaskDetails && ex.importance) parts.push(`اهمیت ${IMPORTANCE_LABELS[ex.importance]}`);
    if (draft.showProgress) parts.push("وضعیت انجام");
    mentorParts = parts;
  }

  return (
    <div className="mentor-preview" aria-live="polite">
      <div className="mentor-preview-row">
        <span className="mentor-preview-tag">{sample ? "نمونه" : "برنامه‌ی تو"}</span>
        <span className="mentor-preview-line"><PreviewParts time={ex.time} parts={actualParts} /></span>
      </div>
      <div className="mentor-preview-row">
        <span className="mentor-preview-tag">منتور می‌بیند</span>
        {mentorParts ? (
          <span className="mentor-preview-line is-mentor"><PreviewParts time={ex.time} parts={mentorParts} /></span>
        ) : (
          <span className="mentor-preview-line"><span className="mentor-muted">{hiddenLine}</span></span>
        )}
      </div>
    </div>
  );
}

/**
 * هر بخش جدا ایزوله می‌شود تا ترتیبِ راست‌به‌چپ حفظ شود — بدونِ این، متنی که
 * با ساعت و برچسبِ لاتین (مثلا «Workout») شروع می‌شد کلِ خط را چپ‌به‌راست
 * و ترتیبِ بخش‌ها را برعکس نشان می‌داد. بازه‌ی ساعت خودش چپ‌به‌راست می‌ماند.
 */
function PreviewParts({ time, parts }: { time: string; parts: string[] }) {
  return (
    <>
      <bdi dir="ltr">{prettyTime(time)}</bdi>
      {parts.map((p, i) => (
        <span key={i}>{" · "}<bdi>{p}</bdi></span>
      ))}
    </>
  );
}
