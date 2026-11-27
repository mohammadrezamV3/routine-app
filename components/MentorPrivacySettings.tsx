"use client";

import "./coach.css";
import "./coach-access.css";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, CalendarClock, Eye, EyeOff, Lock, Moon, Tag, TrendingUp, Layers, FileText } from "lucide-react";
import { MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty } from "@/components/MentorUI";
import { TickOption } from "@/components/TickOption";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { getCustomOccurrences, IMPORTANCE_LABELS, type CustomOccurrence, type Importance } from "@/lib/storage";
import type { PrivacyResponse, PrivacyScope, PrivacySettings } from "@/lib/mentorTypes";
import { buildAccessPreview, programVisible, type AccessExample, type AccessKey, type AccessLine, type CoachPart } from "@/lib/mentorAccessPreview";
import { networkError, readApiError } from "@/lib/mentorFormat";
import { useSection } from "@/components/SectionProvider";
import { tr, iso } from "@/lib/i18n";
import { toEnDigits } from "@/lib/schedule";

const ICO = { size: 18, strokeWidth: 1.9, "aria-hidden": true } as const;

type DetailKey = "showSchedule" | "showProgramName" | "showTaskName" | "showTaskDetails" | "showProgress" | "shareSleep";
type Row = { key: DetailKey; line: AccessKey; icon: ReactNode; title: string; desc: string };

const rows = (): Row[] => [
  { key: "showSchedule", line: "schedule", icon: <CalendarClock {...ICO} />, title: tr("زمان‌بندی", "Schedule"), desc: tr("روزها و ساعت‌هایی که مشغولی. خاموش باشه، هیچ بخشی از روتینت دیده نمی‌شه", "The days and times you are busy. If off, no part of your routine is visible") },
  { key: "showProgramName", line: "programName", icon: <Tag {...ICO} />, title: tr("نام برنامه", "Program name"), desc: tr("برچسب هر بازه، مثلا «دانشگاه»", "The label of each slot, for example \"University\"") },
  { key: "showTaskName", line: "taskName", icon: <FileText {...ICO} />, title: tr("عنوان کار", "Task title"), desc: tr("خاموش باشه فقط «مشغول» دیده می‌شه", "If off, only \"Busy\" is shown") },
  { key: "showTaskDetails", line: "taskDetails", icon: <Layers {...ICO} />, title: tr("جزئیات کار", "Task details"), desc: tr("میزان اهمیت هر کار", "How important each task is") },
  { key: "showProgress", line: "progress", icon: <TrendingUp {...ICO} />, title: tr("پیشرفت", "Progress"), desc: tr("انجام شدن یا نشدن هر کار در هر روز", "Whether each task was done each day") },
  { key: "shareSleep", line: "sleep", icon: <Moon {...ICO} />, title: tr("خواب", "Sleep"), desc: tr("میانگین خواب هفته در گزارش هفته", "Your weekly sleep average in the weekly report") },
];

const impText = (v: string) => (v in IMPORTANCE_LABELS ? IMPORTANCE_LABELS[v as Importance] : v);

function blockedText(b: AccessLine["blockedBy"]): string {
  if (b === "programs") return tr("برنامه‌ای انتخاب نشده", "No program selected");
  if (b === "schedule") return tr("با زمان‌بندی خاموش دیده نمی‌شه", "Hidden while Schedule is off");
  if (b === "name") return tr("بدون برچسب، اسم برنامه همون عنوان کاره", "Without a label, the name is the task title");
  if (b === "importance") return tr("این برنامه اهمیتی نداره", "This program has no importance set");
  return "";
}

/**
 * تنظیم سطح دسترسی مربی (برای هر همکاری): برنامه‌های قابل مشاهده + جزئیات + خواب،
 * با پیش‌نمای زنده‌ی چیزی که مربی می‌بینه. فقط شاگرد؛ API: /api/mentorships/[id]/privacy.
 */
export function MentorPrivacySettings({ mentorshipId, mentorName, active, onSaved }: { mentorshipId: string; mentorName: string; active: boolean; onSaved?: (p: PrivacySettings) => void }) {
  const section = useSection();
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
      if (!res.ok) { setError(await readApiError(res, tr("تنظیمات دسترسی دریافت نشد؛ دوباره تلاش کن", "Couldn't load access settings. Try again"))); return; }
      const d: PrivacyResponse = await res.json();
      setData(d);
      setDraft({ ...d.privacy, shareSleep: !!d.privacy.shareSleep });
    } catch {
      setError(networkError());
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
      !!a.shareSleep !== !!b.shareSleep ||
      a.sharedPrograms.length !== b.sharedPrograms.length || a.sharedPrograms.some((k) => !b.sharedPrograms.includes(k))
    );
  }, [data, draft]);

  // مثال پیش‌نما: اولین برنامه‌ی واقعی که مربی می‌بینه؛ وگرنه اولین برنامه‌ی خود کاربر؛ وگرنه نمونه‌ی ساختگی
  const example = useMemo<AccessExample>(() => {
    const pick = (draft ? occs.find((o) => programVisible(draft, o)) : undefined) ?? occs[0];
    if (pick) return { name: toEnDigits(pick.name), tag: pick.tag ? toEnDigits(pick.tag) : undefined, time: pick.time, importance: pick.importance, sample: false };
    return { name: tr("مطالعه‌ی فصل 3", "Study chapter 3"), tag: tr("دانشگاه", "University"), time: "18:00 - 19:00", importance: "high", sample: true };
  }, [occs, draft]);
  const preview = useMemo(() => (draft ? buildAccessPreview(draft, example, occs.length > 0) : null), [draft, example, occs.length]);

  if (error) return <MentorErrorState message={error} onRetry={load} />;
  if (!data || !draft || !preview) return <LoadingBlock />;

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
    if (!draft || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/privacy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) { setSaveError(await readApiError(res, tr("ذخیره نشد؛ دوباره امتحان کن", "Couldn't save. Try again"))); return; }
      const d: { privacy: PrivacySettings } = await res.json();
      setData((prev) => (prev ? { ...prev, privacy: d.privacy } : prev));
      setDraft({ ...d.privacy, shareSleep: !!d.privacy.shareSleep });
      setSaved(true);
      onSaved?.(d.privacy);
    } catch {
      setSaveError(networkError());
    } finally {
      setSaving(false);
    }
  }

  const allOn = draft.shareAllPrograms;
  // روی زیردامنه‌ی یک بخش فقط برنامه‌های همون بخش
  const routineScopes = section && section !== "routine" ? [] : data.scopes.filter((s) => s.kind === "routine");
  const moduleScopes = section && section !== "workout" ? [] : data.scopes.filter((s) => s.kind === "module");
  const scopeList = [...routineScopes, ...moduleScopes];
  const scopeChecked = (k: string) => allOn || draft.sharedPrograms.includes(k);
  const lineOf = (k: AccessKey) => preview.lines.find((l) => l.key === k)!;
  const showSleep = section !== "trade";
  const visibleRows = rows().filter((r) => showSleep || r.key !== "shareSleep");
  const shownCount = preview.lines.filter((l) => l.visible && (showSleep || l.key !== "sleep")).length;
  const totalCount = preview.lines.filter((l) => showSleep || l.key !== "sleep").length;
  const name = iso(mentorName);

  return (
    <div className="ca-wrap"><div className="ca-root">
      <div role="group" className="ca-group" aria-label={tr("برنامه‌های قابل مشاهده", "Visible programs")}>
        <h3 className="ca-h">{tr("برنامه‌های قابل مشاهده", "Visible programs")}</h3>
        <div className="ca-list">
          <div className="ca-item">
            <TickOption checked={allOn} onChange={(v) => patch({ shareAllPrograms: v })}>
              <span className="ca-t">{tr("همه‌ی برنامه‌ها", "All programs")}</span>
              <span className="ca-d">{tr("برنامه‌هایی که بعدا بسازی هم خودکار دیده می‌شن", "Programs you create later are shared automatically too")}</span>
            </TickOption>
          </div>
          {scopeList.length === 0 && <MentorEmpty>{tr("هنوز برنامه‌ای در روتینت نیست", "You have no programs in your routine yet")}</MentorEmpty>}
          {scopeList.map((s) => (
            <div key={s.key} className="ca-item">
              <TickOption checked={scopeChecked(s.key)} disabled={allOn} onChange={() => toggleScope(s.key)}>
                <span className="ca-t">{s.label}</span>
                <span className="ca-d">{s.kind === "module" ? tr("بخش", "Section") : tr("برنامه‌ی روتین", "Routine program")}</span>
              </TickOption>
            </div>
          ))}
        </div>
      </div>

      <div role="group" className="ca-group" aria-label={tr("جزئیات قابل مشاهده", "Visible details")}>
        <h3 className="ca-h">{tr("جزئیات قابل مشاهده", "Visible details")}</h3>
        <div className="ca-list">
          {visibleRows.map((r) => {
            const l = lineOf(r.line);
            const own = !!draft[r.key];
            const dep = r.key !== "showSchedule" && r.key !== "shareSleep";
            const disabled = dep && !draft.showSchedule;
            return (
              <div key={r.key} className={`ca-item${disabled ? " is-off" : ""}`}>
                <span className="ca-ico">{r.icon}</span>
                <TickOption checked={own} disabled={disabled} onChange={(v) => patch({ [r.key]: v } as Partial<PrivacySettings>)} className="ca-tick">
                  <span className="ca-t">{r.title}</span>
                  <span className="ca-d">{r.desc}</span>
                </TickOption>
                <span className={`ca-chip ${l.visible ? "is-on" : "is-off"}`}>
                  {l.visible ? <Eye size={13} strokeWidth={2} aria-hidden /> : <EyeOff size={13} strokeWidth={2} aria-hidden />}
                  {l.visible ? tr("دیده می‌شه", "Visible") : tr("خصوصی", "Private")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div role="region" className="ca-preview" aria-live="polite" aria-label={tr("پیش‌نمایش", "Preview")}>
        <div className="ca-preview-head">
          <h3 className="ca-h">{tr(`${mentorName} این رو می‌بینه`, `What ${name} sees`)}</h3>
          <span className="ca-count">{`${shownCount}/${totalCount}`}</span>
        </div>
        {preview.coachParts ? (
          <div className="ca-coachrow">
            <bdi dir="ltr" className="ca-time">{example.time.replace(/\s*[-–—]\s*/, " – ")}</bdi>
            <span className="ca-parts">{preview.coachParts.map((p, i) => <PartChip key={i} part={p} />)}</span>
          </div>
        ) : (
          <div className="ca-coachrow is-hidden"><Lock size={15} strokeWidth={2} aria-hidden />{!draft.showSchedule ? tr("هیچ زمان‌بندی‌ای دیده نمی‌شه", "No schedule is visible") : tr("هیچ برنامه‌ای انتخاب نشده؛ چیزی دیده نمی‌شه", "No program is selected, so nothing is visible")}</div>
        )}
        <p className="ca-sample">{example.sample ? tr("نمونه‌ی ساختگی", "Sample data") : tr(`از برنامه‌ی خودت: ${example.name}`, `From your program: ${example.name}`)}</p>
        <ul className="ca-lines">
          {preview.lines.filter((l) => showSleep || l.key !== "sleep").map((l) => (
            <li key={l.key} className={l.visible ? "is-on" : "is-off"}>
              <span className="ca-line-mark">{l.visible ? <Check size={14} strokeWidth={2.4} aria-hidden /> : <Lock size={13} strokeWidth={2} aria-hidden />}</span>
              <span className="ca-line-name">{lineName(l.key)}</span>
              <span className="ca-line-val">{lineValue(l)}</span>
            </li>
          ))}
        </ul>
        {!active && <p className="ca-sample">{tr(`تا همکاری شروع نشه ${mentorName} چیزی نمی‌بینه`, `${name} won't see anything until the mentorship starts`)}</p>}
      </div>

      <div className="ca-foot">
        {saveError && <div className="form-inline-error" role="alert">{saveError}</div>}
        {saved && !dirty && <span className="ca-saved"><Check size={15} strokeWidth={2.4} aria-hidden /> {tr("ذخیره شد", "Saved")}</span>}
        <button type="button" className={`btn btn-primary${saving ? " is-loading" : ""}`} onClick={save} disabled={!dirty || saving}>
          {saving ? <Spinner size={16} /> : null}{tr("ذخیره", "Save")}
        </button>
      </div>
    </div></div>
  );
}

function lineName(k: AccessKey): string {
  switch (k) {
    case "programs": return tr("برنامه‌ها", "Programs");
    case "schedule": return tr("زمان‌بندی", "Schedule");
    case "programName": return tr("نام برنامه", "Program name");
    case "taskName": return tr("عنوان کار", "Task title");
    case "taskDetails": return tr("جزئیات کار", "Task details");
    case "progress": return tr("پیشرفت", "Progress");
    case "sleep": return tr("خواب", "Sleep");
  }
}

function lineValue(l: AccessLine): ReactNode {
  if (!l.visible) return <span className="ca-muted">{l.blockedBy ? blockedText(l.blockedBy) : tr("خصوصی", "Private")}</span>;
  switch (l.key) {
    case "programs": return tr("انتخاب‌شده‌ها", "The selected ones");
    case "schedule": return <bdi dir="ltr">{l.value?.replace(/\s*[-–—]\s*/, " – ")}</bdi>;
    case "programName": case "taskName": return <bdi>{l.value}</bdi>;
    case "taskDetails": return tr(`اهمیت ${impText(l.value!)}`, `${impText(l.value!)} importance`);
    case "progress": return tr("انجام شد / نشد", "Done / not done");
    case "sleep": return tr("میانگین خواب هفته", "Weekly sleep average");
  }
}

function PartChip({ part }: { part: CoachPart }) {
  const text =
    part.t === "busy" ? tr("مشغول", "Busy")
    : part.t === "importance" ? tr(`اهمیت ${impText(part.v!)}`, `${impText(part.v!)} importance`)
    : part.t === "done" ? tr("وضعیت انجام", "Done status")
    : part.v;
  return <span className={`ca-part is-${part.t}`}><bdi>{text}</bdi></span>;
}

