"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, GripVertical, LayoutTemplate, MessageSquareText, Plus, Trash2, X } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { TimeInput } from "./TimeInput";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { MentorCollapse } from "./MentorMotion";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorTemplateSaveDialog } from "./MentorTemplateSaveDialog";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorField, MentorNotice } from "./MentorUI";
import { WEEK_ORDER, toEnDigits } from "@/lib/schedule";
import { FA_WEEKDAY, JalaliDate, formatJalali, jalaliToIso, toJalali } from "@/lib/jalali";
import { publicUserName } from "@/lib/mentorTypes";
import type { Item, ItemInput, Program, ProgramType, PublicUser } from "@/lib/mentorTypes";

// همان سقف‌های lib/mentorValidate.ts؛ اعتبارسنجی کلاینت آینه‌ی سرور است.
const MAX_ITEMS = 100;
const TITLE_MAX = 120;
const DESC_MAX = 2000;
const NOTE_MAX = 1000;
const ITEM_TITLE_MAX = 120;
const ITEM_DETAILS_MAX = 1000;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const REPS_RE = /^\d{1,3}(-\d{1,3})?$/;

const ic = (Icon: typeof X, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type Draft = {
  key: string;
  title: string;
  details: string;
  repeat: "DAILY" | "WEEKLY";
  days: number[];
  startTime: string;
  durationMin: string;
  sets: string;
  reps: string;
  weightKg: string;
  restSec: string;
};

type ItemErrors = Partial<Record<"title" | "details" | "days" | "startTime" | "durationMin" | "sets" | "reps" | "weightKg" | "restSec", string>>;

let keySeq = 0;
const newKey = () => `it-${Date.now().toString(36)}-${(keySeq++).toString(36)}`;

function emptyDraft(): Draft {
  return { key: newKey(), title: "", details: "", repeat: "WEEKLY", days: [], startTime: "", durationMin: "", sets: "", reps: "", weightKg: "", restSec: "" };
}

function fromItem(i: Item): Draft {
  return {
    key: i.id || newKey(),
    title: i.title,
    details: i.details ?? "",
    repeat: i.repeat === "DAILY" ? "DAILY" : "WEEKLY",
    days: i.repeat === "DAILY" ? [] : [...i.days],
    startTime: i.startTime ?? "",
    durationMin: i.durationMin != null ? String(i.durationMin) : "",
    sets: i.sets != null ? String(i.sets) : "",
    reps: i.reps ?? "",
    weightKg: i.weightKg != null ? String(i.weightKg) : "",
    restSec: i.restSec != null ? String(i.restSec) : "",
  };
}

function isoToJalali(iso: string | null | undefined): JalaliDate | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? toJalali(+m[1], +m[2], +m[3]) : null;
}

function intIn(v: string, min: number, max: number): number | null | "bad" {
  const t = toEnDigits(v).trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= min && n <= max ? n : "bad";
}

/** اعتبارسنجی یک آیتم + ساخت بدنه‌ی ItemInput؛ آینه‌ی validateItem سرور */
function validateDraft(d: Draft, type: ProgramType): { errors: ItemErrors; input: ItemInput | null } {
  const errors: ItemErrors = {};
  const title = d.title.trim();
  if (!title) errors.title = "عنوان لازم است";
  else if (title.length > ITEM_TITLE_MAX) errors.title = `حداکثر ${fa(ITEM_TITLE_MAX)} حرف`;
  if (d.details.trim().length > ITEM_DETAILS_MAX) errors.details = `حداکثر ${fa(ITEM_DETAILS_MAX)} حرف`;
  if (d.repeat === "WEEKLY" && d.days.length === 0) errors.days = "حداقل یک روز رو انتخاب کن";
  const time = toEnDigits(d.startTime).trim();
  if (time && !HHMM_RE.test(time)) errors.startTime = "ساعت باید به شکل 08:30 باشد";
  const dur = intIn(d.durationMin, 1, 1440);
  if (dur === "bad") errors.durationMin = "بین 1 تا 1440 دقیقه";

  let sets: number | null = null, reps: string | null = null, weight: number | null = null, rest: number | null = null;
  if (type === "WORKOUT") {
    const s = intIn(d.sets, 1, 100);
    if (s === "bad") errors.sets = "بین 1 تا 100"; else sets = s;
    const r = toEnDigits(d.reps).trim();
    if (r && !REPS_RE.test(r)) errors.reps = "عدد یا بازه، مثل 8-12"; else reps = r || null;
    const w = toEnDigits(d.weightKg).trim();
    if (w) {
      const n = Number(w);
      if (!Number.isFinite(n) || n < 0 || n > 1000) errors.weightKg = "بین 0 تا 1000 کیلوگرم"; else weight = Math.round(n * 10) / 10;
    }
    const rs = intIn(d.restSec, 0, 3600);
    if (rs === "bad") errors.restSec = "بین 0 تا 3600 ثانیه"; else rest = rs;
  }
  if (Object.keys(errors).length) return { errors, input: null };

  const input: ItemInput = { title, repeat: d.repeat, days: d.repeat === "DAILY" ? [0, 1, 2, 3, 4, 5, 6] : [...d.days].sort((a, b) => a - b) };
  if (d.details.trim()) input.details = d.details.trim();
  if (time) input.startTime = time;
  if (typeof dur === "number") input.durationMin = dur;
  if (type === "WORKOUT") {
    if (sets != null) input.sets = sets;
    if (reps) input.reps = reps;
    if (weight != null) input.weightKg = weight;
    if (rest != null) input.restSec = rest;
  }
  return { errors: {}, input };
}

/** پیش‌پرکردن «برنامه‌ی جدید» از قالب یا کپی برنامه‌ی قبلی (تاریخ‌ها از پیش جابه‌جا شده) */
export type ProgramPrefill = {
  type: ProgramType;
  title: string;
  description: string | null;
  note: string | null;
  startDate: string | null;
  endDate: string | null;
  items: Item[];
  /** وقتی از قالب آمده؛ با ذخیره آمار استفاده‌ی قالب بالا می‌رود */
  templateId?: string;
};

export type MentorProgramEditorProps =
  | {
      mode: "new";
      /** شاگرد انتخاب‌شده (null تا وقتی انتخاب نشده) */
      mentorshipId: string | null;
      student: PublicUser | null;
      allowedTypes: ProgramType[];
      initial?: ProgramPrefill | null;
      /** با عوض‌شدنش فرم از initial دوباره پر می‌شود (انتخاب قالب/کپی) */
      prefillKey?: string;
      /** بخش «برای کی؟» (انتخاب شاگرد و نقطه‌ی شروع) */
      startSlot: React.ReactNode;
      /** تا وقتی شاگرد/نقطه‌ی شروع آماده نیست فقط بخش اول دیده می‌شود */
      locked: boolean;
    }
  | { mode: "edit"; program: Program; items: Item[]; student: PublicUser | null; initiallySaved?: boolean };

type ProgramBody = {
  type: ProgramType;
  title: string;
  description?: string;
  note: string | null;
  startDate?: string;
  endDate?: string;
  items: ItemInput[];
};

function weeksBetween(a: JalaliDate | null, b: JalaliDate | null): number | null {
  const x = a ? jalaliToIso(...a) : null;
  const y = b ? jalaliToIso(...b) : null;
  if (!x || !y || y < x) return null;
  const days = Math.round((new Date(y + "T00:00:00").getTime() - new Date(x + "T00:00:00").getTime()) / 86400000) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

function itemSummary(d: Draft): string {
  const parts: string[] = [];
  if (d.repeat === "DAILY" || d.days.length === 7) parts.push("هر روز");
  else if (d.days.length) parts.push(WEEK_ORDER.filter((o) => d.days.includes(o.jsDay)).map((o) => FA_WEEKDAY[o.jsDay]).join("، "));
  if (d.startTime) parts.push(toEnDigits(d.startTime));
  if (d.durationMin) parts.push(`${toEnDigits(d.durationMin)} دقیقه`);
  return parts.join(" · ");
}

/**
 * سازنده‌ی برنامه (ساخت و ویرایش) در یک صفحه با سه بخش: برای کی؟ / چی؟ / کارها.
 * «ذخیره» = POST/PUT؛ «فرستادن» = اول ذخیره، بعد transition `send`.
 */
export function MentorProgramEditor(props: MentorProgramEditorProps) {
  const router = useRouter();
  const initialProgram = props.mode === "edit" ? props.program : null;
  const prefill = props.mode === "new" ? props.initial ?? null : null;
  const seed = initialProgram ?? prefill;
  const student = props.student;
  const allowed: ProgramType[] = props.mode === "new" ? props.allowedTypes : [initialProgram!.type];
  const typeOptions = allowed.map((v) => ({ value: v, label: v === "ROUTINE" ? "روتین" : "تمرین ورزشی" }));
  const locked = props.mode === "new" ? props.locked : false;

  const [programId, setProgramId] = useState<string | null>(initialProgram?.id ?? null);
  const [type, setType] = useState<ProgramType>(seed && allowed.includes(seed.type) ? seed.type : allowed[0] ?? "ROUTINE");
  const [title, setTitle] = useState(seed?.title ?? "");
  const [description, setDescription] = useState(seed?.description ?? "");
  const [note, setNote] = useState(seed?.note ?? "");
  const [startDate, setStartDate] = useState<JalaliDate | null>(isoToJalali(seed?.startDate));
  const [endDate, setEndDate] = useState<JalaliDate | null>(isoToJalali(seed?.endDate));
  const [picker, setPicker] = useState<"start" | "end" | null>(null);
  const [items, setItems] = useState<Draft[]>(() => {
    const src = props.mode === "edit" ? props.items : prefill?.items ?? [];
    return src.length ? [...src].sort((a, b) => a.order - b.order).map(fromItem) : [emptyDraft()];
  });
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(items.length === 1 && !items[0].title ? [items[0].key] : []));
  const [templateBody, setTemplateBody] = useState<ProgramBody | null>(null);

  const [itemErrors, setItemErrors] = useState<Record<string, ItemErrors>>({});
  const [formErr, setFormErr] = useState<{ title?: string; description?: string; note?: string; dates?: string; items?: string }>({});
  const [busy, setBusy] = useState<"save" | "send" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(props.mode === "edit" && !!props.initiallySaved);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const neverSent = !initialProgram?.sentAt;
  const studentFirst = (student?.name || "").trim().split(/\s+/)[0] || (student ? publicUserName(student) : "شاگرد");

  // پر کردن دوباره‌ی فرم وقتی قالب/کپی تازه‌ای انتخاب شد (یا پاک شد)
  const prefillKey = props.mode === "new" ? props.prefillKey ?? "" : "";
  const lastPrefillKey = useRef(prefillKey);
  useEffect(() => {
    if (props.mode !== "new" || lastPrefillKey.current === prefillKey) return;
    lastPrefillKey.current = prefillKey;
    const p = props.initial ?? null;
    const t: ProgramType = p && props.allowedTypes.includes(p.type) ? p.type : props.allowedTypes[0] ?? "ROUTINE";
    setType(t);
    setTitle(p?.title ?? "");
    setDescription(p?.description ?? "");
    setNote(p?.note ?? "");
    setStartDate(isoToJalali(p?.startDate));
    setEndDate(isoToJalali(p?.endDate));
    const next = p?.items.length ? [...p.items].sort((a, b) => a.order - b.order).map(fromItem) : [emptyDraft()];
    setItems(next);
    setOpenKeys(new Set());
    setItemErrors({});
    setFormErr({});
    setError(null);
    setProgramId(null);
  }, [prefillKey, props]);

  // نوع مجاز با عوض‌شدن شاگرد
  const allowedKey = allowed.join(",");
  useEffect(() => {
    if (!allowed.includes(type) && allowed[0]) setType(allowed[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKey]);

  // پیشنهاد اسم حرکات (datalist) — فقط برای برنامه‌ی تمرینی و با import پویا
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  useEffect(() => {
    if (type !== "WORKOUT" || exerciseNames.length) return;
    let alive = true;
    import("@/lib/exerciseCatalog")
      .then((m) => { if (alive) setExerciseNames(Array.from(new Set(m.EXERCISE_CATALOG.map((e) => e.name)))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [type, exerciseNames.length]);
  const itemWord = type === "WORKOUT" ? "حرکت" : "کار";

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2400);
    return () => clearTimeout(t);
  }, [saved]);

  useEffect(() => {
    if (!focusKey) return;
    const raf = requestAnimationFrame(() => {
      document.getElementById(`pe-${focusKey}-title`)?.focus();
      setFocusKey(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [focusKey]);

  function dirty() { setSaved(false); }

  function toggleOpen(key: string) {
    setOpenKeys((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }

  function patchItem(key: string, patch: Partial<Draft>) {
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    setItemErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e[key] };
      for (const k of Object.keys(patch)) delete next[k as keyof ItemErrors];
      return { ...e, [key]: next };
    });
    dirty();
  }

  function move(idx: number, dir: -1 | 1) {
    setItems((xs) => {
      const j = idx + dir;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
    dirty();
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) { setFormErr((f) => ({ ...f, items: `حداکثر ${fa(MAX_ITEMS)} ${itemWord}` })); return; }
    const d = emptyDraft();
    setItems((xs) => [...xs, d]);
    setOpenKeys((s) => new Set(s).add(d.key));
    setFocusKey(d.key);
    setFormErr((f) => ({ ...f, items: undefined }));
    dirty();
  }

  /** اعتبارسنجی کل فرم؛ null یعنی خطا دارد */
  function buildBody(forSend: boolean): ProgramBody | null {
    const f: typeof formErr = {};
    const t = title.trim();
    if (!t) f.title = "اسم برنامه لازمه";
    else if (t.length > TITLE_MAX) f.title = `حداکثر ${fa(TITLE_MAX)} حرف`;
    if (description.trim().length > DESC_MAX) f.description = `حداکثر ${fa(DESC_MAX)} حرف`;
    if (note.trim().length > NOTE_MAX) f.note = `حداکثر ${fa(NOTE_MAX)} حرف`;
    const sIso = startDate ? jalaliToIso(...startDate) : null;
    const eIso = endDate ? jalaliToIso(...endDate) : null;
    if ((startDate && !sIso) || (endDate && !eIso)) f.dates = "تاریخ معتبر نیست";
    else if (sIso && eIso && eIso < sIso) f.dates = "تاریخ پایان باید بعد از تاریخ شروع باشه";
    if (items.length > MAX_ITEMS) f.items = `حداکثر ${fa(MAX_ITEMS)} ${itemWord}`;

    const errs: Record<string, ItemErrors> = {};
    const inputs: ItemInput[] = [];
    // کار کاملا خالی نادیده گرفته می‌شود
    const meaningful = items.filter((d) => d.title.trim() || d.details.trim() || d.days.length || d.startTime || d.sets || d.reps);
    for (const d of meaningful) {
      const r = validateDraft(d, type);
      if (r.input) inputs.push(r.input); else errs[d.key] = r.errors;
    }
    if (forSend && meaningful.length === 0) f.items = `برای فرستادن، حداقل یک ${itemWord} اضافه کن`;

    setFormErr(f);
    setItemErrors(errs);
    const bad = Object.keys(errs);
    if (bad.length) setOpenKeys((s) => { const n = new Set(s); bad.forEach((k) => n.add(k)); return n; });
    if (Object.keys(f).length || bad.length) {
      setError(bad.length ? `چند مورد نیاز به اصلاح داره؛ ${fa(bad.length)} ${itemWord} مشکل داره` : "چند مورد نیاز به اصلاح داره");
      return null;
    }
    const body: ProgramBody = { type, title: t, note: note.trim() || null, items: inputs };
    if (description.trim()) body.description = description.trim();
    if (sIso) body.startDate = sIso;
    if (eIso) body.endDate = eIso;
    return body;
  }

  async function persist(body: ProgramBody): Promise<string | null> {
    if (programId) {
      const r = await mentorApi<{ program: Program }>(`/api/mentor-programs/${programId}`, { method: "PUT", body });
      if (!r.ok) { setError(r.status === 409 ? "این برنامه فرستاده شده و دیگه ویرایش نمی‌شه" : r.error); return null; }
      return programId;
    }
    const mentorshipId = props.mode === "new" ? props.mentorshipId : initialProgram?.mentorshipId;
    if (!mentorshipId) { setError("اول شاگرد رو انتخاب کن"); return null; }
    const templateId = prefill?.templateId;
    const r = await mentorApi<{ program: Program }>("/api/mentor-programs", { method: "POST", body: { mentorshipId, ...body, ...(templateId ? { templateId } : {}) } });
    if (!r.ok) { setError(r.error); return null; }
    setProgramId(r.data.program.id);
    return r.data.program.id;
  }

  async function saveDraft() {
    if (busy) return;
    setError(null);
    const body = buildBody(false);
    if (!body) return;
    setBusy("save");
    const id = await persist(body);
    setBusy(null);
    if (!id) return;
    if (props.mode === "new") { router.replace(`/mentor/programs/${id}/edit?saved=1`); return; }
    setSaved(true);
  }

  // عمدا فرم (onSubmit) نیست: Enter در یک فیلد نباید برنامه را برای شاگرد بفرستد
  async function send() {
    if (busy) return;
    setError(null);
    const body = buildBody(true);
    if (!body) return;
    setBusy("send");
    const id = await persist(body);
    if (!id) { setBusy(null); return; }
    const r = await mentorApi<{ program: Program }>(`/api/mentor-programs/${id}/transition`, { method: "POST", body: { action: "send" } });
    if (!r.ok) {
      setBusy(null);
      setError(`برنامه ذخیره شد ولی فرستاده نشد؛ ${r.error}`);
      if (props.mode === "new") window.history.replaceState(null, "", `/mentor/programs/${id}/edit`);
      return;
    }
    router.push(`/mentor-programs/${id}`);
  }

  /** «ذخیره به‌عنوان قالب» از محتوای فعلی فرم، بدون ذخیره‌ی خود برنامه */
  function saveAsTemplate() {
    if (busy) return;
    setError(null);
    const body = buildBody(true);
    if (body) setTemplateBody(body);
  }

  async function remove() {
    if (busy || !programId) return;
    setDeleteError(null);
    setBusy("delete");
    const r = await mentorApi<unknown>(`/api/mentor-programs/${programId}`, { method: "DELETE" });
    setBusy(null);
    if (!r.ok) { setDeleteError(r.error); return; }
    setConfirmDelete(false);
    router.replace(student ? `/mentor/students/${student.id}` : "/mentor/templates");
  }

  const weeks = weeksBetween(startDate, endDate);
  const countable = items.filter((d) => d.title.trim()).length;
  const edited = !!initialProgram?.sentAt;

  const sec = (n: number, label: string, extra?: React.ReactNode) => (
    <h2 className="mv2-pg-sec"><span className="mv2-pg-num" aria-hidden>{n}</span>{label}{extra}</h2>
  );

  return (
    <div className="mv2-pg-editor">
      {initialProgram?.changeRequestNote && (
        <MentorNotice tone="warn" icon={ic(MessageSquareText, MI.row)} title={`${studentFirst} تغییر خواسته`}>
          {initialProgram.changeRequestNote}
        </MentorNotice>
      )}

      <section className="mv2-pg-block" aria-labelledby="pe-sec1">
        <div id="pe-sec1">{sec(1, "برای کی؟")}</div>
        {props.mode === "new" ? props.startSlot : student && (
          <div className="mv2-pg-who">
            <MentorUserAvatar avatarUrl={student.avatarUrl} name={publicUserName(student)} size={40} />
            <span className="mentor-row-title">{publicUserName(student)}</span>
          </div>
        )}
      </section>

      {!locked && (
        <>
          <section className="mv2-pg-block" aria-labelledby="pe-sec2">
            <div id="pe-sec2">{sec(2, "چی؟")}</div>
            <div className="mentor-form">
              {typeOptions.length > 1 && (
                <SegmentedTabs<ProgramType>
                  active={type}
                  onChange={(v) => { setType(v); setItemErrors({}); dirty(); }}
                  options={typeOptions}
                />
              )}

              <MentorField label="اسم برنامه" htmlFor="pe-title" error={formErr.title}>
                <input
                  id="pe-title" type="text" className="wsearch-newform-name trade-glass-field" maxLength={TITLE_MAX} value={title}
                  placeholder={type === "WORKOUT" ? "مثلا برنامه‌ی حجم 8 هفته‌ای" : "مثلا روتین صبحگاهی"}
                  onChange={(e) => { setTitle(e.target.value); setFormErr((f) => ({ ...f, title: undefined })); dirty(); }}
                />
              </MentorField>

              <MentorField label="توضیح برای شاگرد" htmlFor="pe-desc" optional error={formErr.description}>
                <textarea
                  id="pe-desc" className="wsearch-newform-name trade-glass-field" rows={3} maxLength={DESC_MAX} value={description}
                  placeholder="مثلا هدف برنامه و نکات کلی"
                  onChange={(e) => { setDescription(e.target.value); setFormErr((f) => ({ ...f, description: undefined })); dirty(); }}
                />
              </MentorField>

              <MentorField
                label="بازه‌ی زمانی" optional error={formErr.dates}
                hint="بدون تاریخ شروع، برنامه از روزی که شاگرد قبول کنه شروع می‌شه؛ با تاریخ شروع در آینده، همون روز خودکار فعال می‌شه"
              >
                <div className={`wsearch-date-row${formErr.dates ? " field-error" : ""}`} style={{ marginTop: 0 }}>
                  <div className="time-field">
                    <span className="time-field-label">شروع</span>
                    <button type="button" className={`jdate-btn${startDate ? "" : " placeholder"}`} onClick={() => setPicker("start")}>
                      {startDate ? formatJalali(startDate) : "روز / ماه / سال"}
                    </button>
                  </div>
                  <div className="time-field">
                    <span className="time-field-label">پایان</span>
                    <button type="button" className={`jdate-btn${endDate ? "" : " placeholder"}`} onClick={() => setPicker("end")}>
                      {endDate ? formatJalali(endDate) : "روز / ماه / سال"}
                    </button>
                  </div>
                </div>
                {(startDate || endDate) && (
                  <div>
                    <button
                      type="button" className="mentor-text-btn"
                      onClick={() => { setStartDate(null); setEndDate(null); setFormErr((f) => ({ ...f, dates: undefined })); dirty(); }}
                    >
                      {ic(X, MI.btnSm)} پاک کردن تاریخ‌ها
                    </button>
                  </div>
                )}
              </MentorField>

              <MentorField
                label="یادداشت برای شاگرد" htmlFor="pe-note" optional error={formErr.note}
                hint={`${fa(note.length)} از ${fa(NOTE_MAX)} حرف`}
              >
                <textarea
                  id="pe-note" className="wsearch-newform-name trade-glass-field" rows={3} maxLength={NOTE_MAX} value={note}
                  placeholder="مثلا هفته‌ی اول وزنه‌ها رو سبک‌تر بردار و روی فرم حرکت کار کن"
                  onChange={(e) => { setNote(e.target.value); setFormErr((f) => ({ ...f, note: undefined })); dirty(); }}
                />
              </MentorField>
            </div>
          </section>

          <section className="mv2-pg-block" aria-labelledby="pe-sec3">
            <div id="pe-sec3">
              {sec(3, type === "WORKOUT" ? "حرکت‌ها" : "کارها", <span className="mv2-pg-count">{fa(items.length)}</span>)}
            </div>
            {type === "WORKOUT" && (
              <datalist id="pe-exercise-names">
                {exerciseNames.map((n) => <option key={n} value={n} />)}
              </datalist>
            )}
            <div ref={listRef}>
              <Reorder.Group axis="y" as="div" values={items} onReorder={(xs) => { setItems(xs); dirty(); }} className="mv2-pg-items">
                {items.map((d, idx) => (
                  <MentorProgramEditorItem
                    key={d.key}
                    draft={d} index={idx} count={items.length} type={type}
                    open={openKeys.has(d.key)}
                    errors={itemErrors[d.key] || {}}
                    onToggle={() => toggleOpen(d.key)}
                    onPatch={(p) => patchItem(d.key, p)}
                    onMove={(dir) => move(idx, dir)}
                    onRemove={() => {
                      setItems((xs) => xs.filter((x) => x.key !== d.key));
                      setItemErrors((e) => { const n = { ...e }; delete n[d.key]; return n; });
                      dirty();
                    }}
                  />
                ))}
              </Reorder.Group>
            </div>
            {formErr.items && <p className="mentor-field-error" role="alert">{formErr.items}</p>}
            <div className="mv2-pg-addrow">
              <button type="button" className="trade-icon-btn mv2-pg-add" onClick={addItem} disabled={items.length >= MAX_ITEMS} aria-label={type === "WORKOUT" ? "افزودن حرکت" : "افزودن کار"}>
                <Plus size={20} strokeWidth={2} aria-hidden />
              </button>
              <button type="button" className="mentor-text-btn" onClick={saveAsTemplate} disabled={!!busy}>
                {ic(LayoutTemplate, MI.btnSm)} ذخیره به‌عنوان قالب
              </button>
            </div>
          </section>

          {programId && neverSent && props.mode === "edit" && (
            <div className="mv2-pg-danger">
              <button type="button" className="trade-danger-btn mentor-btn is-sm" disabled={!!busy} onClick={() => { setDeleteError(null); setConfirmDelete(true); }}>
                {ic(Trash2, MI.btnSm)} حذف این برنامه
              </button>
            </div>
          )}

          {error && <div className="form-inline-error" role="alert">{error}</div>}

          <div className="mv2-pg-foot">
            <div className="mv2-pg-foot-sum">
              <b>{fa(countable)} {itemWord}</b>{weeks != null ? ` · ${fa(weeks)} هفته` : ""}
              {edited && <MentorChip tone="neutral">ویرایش‌شده</MentorChip>}
            </div>
            <div className="mv2-pg-foot-btns">
              <button type="button" className="account-outline-btn mentor-btn" disabled={!!busy} onClick={saveDraft}>
                {busy === "save" ? <Spinner size={14} /> : saved ? "ذخیره شد" : "ذخیره"}
              </button>
              <button type="button" className="trade-primary-btn mentor-btn" disabled={!!busy} onClick={send}>
                {busy === "send" ? <Spinner size={14} /> : `فرستادن برای ${studentFirst}`}
              </button>
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <MentorConfirmDialog
          message={title.trim() ? `برنامه‌ی «${title.trim()}» حذف بشه؟` : "این برنامه حذف بشه؟"}
          hint="برنامه‌ی حذف‌شده برنمی‌گرده"
          confirmLabel="حذف برنامه"
          busy={busy === "delete"}
          error={deleteError}
          onConfirm={remove}
          onCancel={() => { setConfirmDelete(false); setDeleteError(null); }}
        />
      )}

      {templateBody && (
        <MentorTemplateSaveDialog
          defaultName={templateBody.title}
          program={templateBody}
          onClose={() => setTemplateBody(null)}
        />
      )}

      {picker && (
        <JalaliDatePicker
          initial={picker === "start" ? startDate : endDate}
          title={picker === "start" ? "تاریخ شروع برنامه" : "تاریخ پایان برنامه"}
          disablePast
          onClose={() => setPicker(null)}
          onPick={(v) => {
            setFormErr((f) => ({ ...f, dates: undefined }));
            dirty();
            if (picker === "start") { setStartDate(v); setPicker(endDate ? null : "end"); }
            else { setEndDate(v); setPicker(null); }
          }}
        />
      )}
    </div>
  );
}

/** یک کار: کارت جمع‌شونده با دستگیره‌ی درگ (و ArrowUp/ArrowDown روی دستگیره) */
function MentorProgramEditorItem({
  draft: d, index, count, type, open, errors, onToggle, onPatch, onMove, onRemove,
}: {
  draft: Draft;
  index: number;
  count: number;
  type: ProgramType;
  open: boolean;
  errors: ItemErrors;
  onToggle: () => void;
  onPatch: (p: Partial<Draft>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const id = (f: string) => `pe-${d.key}-${f}`;
  const word = type === "WORKOUT" ? "حرکت" : "کار";
  const name = d.title.trim() || `${word} ${fa(index + 1)}`;
  const summary = itemSummary(d);
  const hasErr = Object.keys(errors).length > 0;
  const toggleDay = (js: number) => onPatch({ days: d.days.includes(js) ? d.days.filter((x) => x !== js) : [...d.days, js] });
  return (
    <Reorder.Item
      value={d} as="div" className={`mv2-pg-item${hasErr ? " has-error" : ""}`}
      dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02, zIndex: 5 }}
    >
      <div className="mv2-pg-item-head">
        <button
          type="button" className="mv2-pg-grip" aria-label={`جابه‌جایی ${name}`}
          onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && index > 0) { e.preventDefault(); e.stopPropagation(); onMove(-1); }
            else if (e.key === "ArrowDown" && index < count - 1) { e.preventDefault(); e.stopPropagation(); onMove(1); }
          }}
        >
          <GripVertical size={18} strokeWidth={MI_STROKE} aria-hidden />
        </button>
        <button type="button" className="mv2-pg-item-main" onClick={onToggle} aria-expanded={open} aria-controls={id("body")}>
          <span className="mv2-pg-item-title">{name}</span>
          {summary && <span className="mv2-pg-item-sum">{summary}</span>}
          {hasErr && !open && <span className="mv2-pg-item-err">نیاز به اصلاح داره</span>}
          <ChevronDown size={18} strokeWidth={MI_STROKE} className={`mv2-pg-chev${open ? " is-open" : ""}`} aria-hidden />
        </button>
        <button type="button" className="trade-icon-btn danger" onClick={onRemove} aria-label={`حذف ${name}`}>
          <X size={16} strokeWidth={MI_STROKE} aria-hidden />
        </button>
      </div>

      <MentorCollapse open={open} id={id("body")}>
        <div className="mentor-form mv2-pg-item-body">
          <MentorField label={type === "WORKOUT" ? "اسم حرکت" : "اسم کار"} htmlFor={id("title")} error={errors.title}>
            <input
              id={id("title")} type="text" className="wsearch-newform-name trade-glass-field" maxLength={ITEM_TITLE_MAX} value={d.title}
              list={type === "WORKOUT" ? "pe-exercise-names" : undefined}
              placeholder={type === "WORKOUT" ? "مثلا اسکوات با هالتر" : "مثلا پیاده‌روی 30 دقیقه"}
              onChange={(e) => onPatch({ title: e.target.value })}
            />
          </MentorField>

          <MentorField label="چه روزهایی؟" error={errors.days}>
            <SegmentedTabs<"DAILY" | "WEEKLY">
              active={d.repeat}
              onChange={(v) => onPatch({ repeat: v, days: v === "DAILY" ? [] : d.days })}
              options={[{ value: "WEEKLY", label: "روزهای مشخص" }, { value: "DAILY", label: "هر روز" }]}
            />
            {d.repeat === "WEEKLY" && (
              <div className={`add-program-glass mv2-pg-days${errors.days ? " field-error" : ""}`} role="group" aria-label="روزهای هفته">
                {WEEK_ORDER.map((o) => {
                  const on = d.days.includes(o.jsDay);
                  return (
                    <button
                      key={o.jsDay} type="button" aria-pressed={on} aria-label={FA_WEEKDAY[o.jsDay]}
                      className={`day-pill${on ? " on" : ""}`} onClick={() => toggleDay(o.jsDay)}
                    >
                      {o.short}
                    </button>
                  );
                })}
              </div>
            )}
          </MentorField>

          <div className="mentor-field-row">
            <MentorField label="ساعت" optional error={errors.startTime}>
              <span dir="ltr" className="block">
                <TimeInput value={d.startTime} onChange={(v) => onPatch({ startTime: v })} className="wsearch-newform-name trade-glass-field mono" placeholder="--:--" />
              </span>
            </MentorField>
            <MentorField label="مدت (دقیقه)" htmlFor={id("dur")} optional error={errors.durationMin}>
              <NumberInput id={id("dur")} className="wsearch-newform-name trade-glass-field" dir="ltr" style={{ textAlign: "right" }} value={d.durationMin} onChange={(v) => onPatch({ durationMin: v })} maxLength={4} />
            </MentorField>
          </div>

          {type === "WORKOUT" && (
            <>
              <div className="mentor-field-row">
                <MentorField label="ست" htmlFor={id("sets")} optional error={errors.sets}>
                  <NumberInput id={id("sets")} className="wsearch-newform-name trade-glass-field" dir="ltr" style={{ textAlign: "right" }} value={d.sets} onChange={(v) => onPatch({ sets: v })} maxLength={3} />
                </MentorField>
                <MentorField label="تکرار در هر ست" htmlFor={id("reps")} optional error={errors.reps}>
                  <input
                    id={id("reps")} type="text" inputMode="numeric" className="wsearch-newform-name trade-glass-field" dir="ltr" style={{ textAlign: "right" }}
                    value={d.reps} placeholder="8-12" maxLength={7}
                    onChange={(e) => onPatch({ reps: toEnDigits(e.target.value).replace(/[^\d-]/g, "") })}
                  />
                </MentorField>
              </div>
              <div className="mentor-field-row">
                <MentorField label="وزنه (کیلوگرم)" htmlFor={id("w")} optional error={errors.weightKg}>
                  <NumberInput decimal id={id("w")} className="wsearch-newform-name trade-glass-field" dir="ltr" style={{ textAlign: "right" }} value={d.weightKg} onChange={(v) => onPatch({ weightKg: v })} maxLength={6} />
                </MentorField>
                <MentorField label="استراحت (ثانیه)" htmlFor={id("rest")} optional error={errors.restSec}>
                  <NumberInput id={id("rest")} className="wsearch-newform-name trade-glass-field" dir="ltr" style={{ textAlign: "right" }} value={d.restSec} onChange={(v) => onPatch({ restSec: v })} maxLength={4} />
                </MentorField>
              </div>
            </>
          )}

          <MentorField label="جزئیات" htmlFor={id("details")} optional error={errors.details}>
            <textarea
              id={id("details")} className="wsearch-newform-name trade-glass-field" rows={2} maxLength={ITEM_DETAILS_MAX} value={d.details}
              placeholder={type === "WORKOUT" ? "مثلا تمپوی 3-1-1، زانو هم‌راستای پنجه" : "مثلا بعد از صبحانه"}
              onChange={(e) => onPatch({ details: e.target.value })}
            />
          </MentorField>
        </div>
      </MentorCollapse>
    </Reorder.Item>
  );
}
