"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowUp, CalendarRange, ClipboardList, Dumbbell, ListChecks, MessageSquareWarning, Plus, Send, Trash2, X,
} from "lucide-react";
import { AccountBlock } from "./AccountUI";
import { AuthField } from "./AuthField";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { TimeInput } from "./TimeInput";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { Spinner } from "./Spinner";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { MentorDashNotice, fa, mentorApi } from "./MentorDashKit";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";
import { WEEK_ORDER, toEnDigits } from "@/lib/schedule";
import { FA_WEEKDAY, JalaliDate, formatJalali, jalaliToIso, toJalali } from "@/lib/jalali";
import { publicUserName } from "@/lib/mentorTypes";
import type { Item, ItemInput, Program, ProgramType, PublicUser } from "@/lib/mentorTypes";

// همون سقف‌های lib/mentorValidate.ts — اعتبارسنجیِ کلاینت آینه‌ی سروره.
const MAX_ITEMS = 100;
const TITLE_MAX = 120;
const DESC_MAX = 2000;
const ITEM_TITLE_MAX = 120;
const ITEM_DETAILS_MAX = 1000;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const REPS_RE = /^\d{1,3}(-\d{1,3})?$/;

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

/** اعتبارسنجیِ یک آیتم + ساختِ بدنه‌ی ItemInput — آینه‌ی validateItem سرور */
function validateDraft(d: Draft, type: ProgramType): { errors: ItemErrors; input: ItemInput | null } {
  const errors: ItemErrors = {};
  const title = d.title.trim();
  if (!title) errors.title = "عنوان لازمه";
  else if (title.length > ITEM_TITLE_MAX) errors.title = `حداکثر ${fa(ITEM_TITLE_MAX)} کاراکتر`;
  if (d.details.trim().length > ITEM_DETAILS_MAX) errors.details = `حداکثر ${fa(ITEM_DETAILS_MAX)} کاراکتر`;
  if (d.repeat === "WEEKLY" && d.days.length === 0) errors.days = "حداقل یک روز هفته رو انتخاب کن";
  const time = toEnDigits(d.startTime).trim();
  if (time && !HHMM_RE.test(time)) errors.startTime = "ساعت باید به شکل ۰۸:۳۰ باشه";
  const dur = intIn(d.durationMin, 1, 1440);
  if (dur === "bad") errors.durationMin = "بین ۱ تا ۱۴۴۰ دقیقه";

  let sets: number | null = null, reps: string | null = null, weight: number | null = null, rest: number | null = null;
  if (type === "WORKOUT") {
    const s = intIn(d.sets, 1, 100);
    if (s === "bad") errors.sets = "بین ۱ تا ۱۰۰"; else sets = s;
    const r = toEnDigits(d.reps).trim();
    if (r && !REPS_RE.test(r)) errors.reps = "عدد یا بازه مثل 8-12"; else reps = r || null;
    const w = toEnDigits(d.weightKg).trim();
    if (w) {
      const n = Number(w);
      if (!Number.isFinite(n) || n < 0 || n > 1000) errors.weightKg = "بین ۰ تا ۱۰۰۰ کیلو"; else weight = Math.round(n * 10) / 10;
    }
    const rs = intIn(d.restSec, 0, 3600);
    if (rs === "bad") errors.restSec = "بین ۰ تا ۳۶۰۰ ثانیه"; else rest = rs;
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

export type MentorProgramEditorProps =
  | { mode: "new"; mentorshipId: string; student: PublicUser }
  | { mode: "edit"; program: Program; items: Item[]; student: PublicUser | null };

/**
 * ویرایشگرِ برنامه‌ی منتور (ساخت و ویرایشِ پیش‌نویس). «ذخیره پیش‌نویس» =
 * POST/PUT؛ «ارسال برای شاگرد» = اول ذخیره، بعد transition `send`.
 */
export function MentorProgramEditor(props: MentorProgramEditorProps) {
  const router = useRouter();
  const initialProgram = props.mode === "edit" ? props.program : null;

  const [programId, setProgramId] = useState<string | null>(initialProgram?.id ?? null);
  const [type, setType] = useState<ProgramType>(initialProgram?.type ?? "ROUTINE");
  const [title, setTitle] = useState(initialProgram?.title ?? "");
  const [description, setDescription] = useState(initialProgram?.description ?? "");
  const [startDate, setStartDate] = useState<JalaliDate | null>(isoToJalali(initialProgram?.startDate));
  const [endDate, setEndDate] = useState<JalaliDate | null>(isoToJalali(initialProgram?.endDate));
  const [picker, setPicker] = useState<"start" | "end" | null>(null);
  const [items, setItems] = useState<Draft[]>(() => (props.mode === "edit" && props.items.length ? [...props.items].sort((a, b) => a.order - b.order).map(fromItem) : [emptyDraft()]));

  const [itemErrors, setItemErrors] = useState<Record<string, ItemErrors>>({});
  const [formErr, setFormErr] = useState<{ title?: string; description?: string; dates?: string; items?: string }>({});
  const [busy, setBusy] = useState<"save" | "send" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const neverSent = !initialProgram?.sentAt;
  const student = props.student;
  const exerciseNames = useMemo(() => (type === "WORKOUT" ? Array.from(new Set(EXERCISE_CATALOG.map((e) => e.name))) : []), [type]);

  function patchItem(key: string, patch: Partial<Draft>) {
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    setItemErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e[key] };
      for (const k of Object.keys(patch)) delete next[k as keyof ItemErrors];
      return { ...e, [key]: next };
    });
    setSavedAt(null);
  }

  function move(idx: number, dir: -1 | 1) {
    setItems((xs) => {
      const j = idx + dir;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) { setFormErr((f) => ({ ...f, items: `حداکثر ${fa(MAX_ITEMS)} آیتم` })); return; }
    setItems((xs) => [...xs, emptyDraft()]);
    setFormErr((f) => ({ ...f, items: undefined }));
    requestAnimationFrame(() => {
      const el = listRef.current?.lastElementChild as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }

  /** اعتبارسنجیِ کل فرم؛ null یعنی خطا داره */
  function buildBody(forSend: boolean) {
    const f: typeof formErr = {};
    const t = title.trim();
    if (!t) f.title = "عنوان برنامه لازمه";
    else if (t.length > TITLE_MAX) f.title = `حداکثر ${fa(TITLE_MAX)} کاراکتر`;
    if (description.trim().length > DESC_MAX) f.description = `حداکثر ${fa(DESC_MAX)} کاراکتر`;
    const sIso = startDate ? jalaliToIso(...startDate) : null;
    const eIso = endDate ? jalaliToIso(...endDate) : null;
    if ((startDate && !sIso) || (endDate && !eIso)) f.dates = "تاریخ نامعتبره";
    else if (sIso && eIso && eIso < sIso) f.dates = "تاریخ پایان باید بعد از تاریخ شروع باشه";
    if (items.length > MAX_ITEMS) f.items = `حداکثر ${fa(MAX_ITEMS)} آیتم`;

    const errs: Record<string, ItemErrors> = {};
    const inputs: ItemInput[] = [];
    // آیتمِ کاملا خالی (عنوان/جزئیات نداره) در پیش‌نویس نادیده گرفته می‌شه
    const meaningful = items.filter((d) => d.title.trim() || d.details.trim() || d.days.length || d.startTime || d.sets || d.reps);
    for (const d of meaningful) {
      const r = validateDraft(d, type);
      if (r.input) inputs.push(r.input); else errs[d.key] = r.errors;
    }
    if (forSend && meaningful.length === 0) f.items = "برای ارسال حداقل یک آیتم لازمه";

    setFormErr(f);
    setItemErrors(errs);
    if (Object.keys(f).length || Object.keys(errs).length) {
      setError("چند مورد نیاز به اصلاح داره — موارد قرمز رو بررسی کن");
      return null;
    }
    const body: { type: ProgramType; title: string; description?: string; startDate?: string; endDate?: string; items: ItemInput[] } = { type, title: t, items: inputs };
    if (description.trim()) body.description = description.trim();
    if (sIso) body.startDate = sIso;
    if (eIso) body.endDate = eIso;
    return body;
  }

  async function persist(body: NonNullable<ReturnType<typeof buildBody>>): Promise<string | null> {
    if (programId) {
      const r = await mentorApi<{ program: Program }>(`/api/mentor-programs/${programId}`, { method: "PUT", body });
      if (!r.ok) { setError(r.status === 409 ? "این برنامه دیگه پیش‌نویس نیست و قابل ویرایش نیست — صفحه رو تازه کن" : r.error); return null; }
      return programId;
    }
    const mentorshipId = props.mode === "new" ? props.mentorshipId : initialProgram?.mentorshipId;
    const r = await mentorApi<{ program: Program }>("/api/mentor-programs", { method: "POST", body: { mentorshipId, ...body } });
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
    setSavedAt(Date.now());
    if (props.mode === "new") router.replace(`/mentor/programs/${id}/edit?saved=1`);
  }

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
      setSavedAt(Date.now());
      setError(`پیش‌نویس ذخیره شد ولی ارسال نشد: ${r.error}`);
      if (props.mode === "new") window.history.replaceState(null, "", `/mentor/programs/${id}/edit`);
      return;
    }
    router.push(`/mentor-programs/${id}`);
  }

  async function remove() {
    if (busy || !programId) return;
    setError(null);
    setBusy("delete");
    const r = await mentorApi<unknown>(`/api/mentor-programs/${programId}`, { method: "DELETE" });
    setBusy(null);
    setConfirmDelete(false);
    if (!r.ok) { setError(r.error); return; }
    router.replace(student ? `/mentor/students/${student.id}` : "/mentor");
  }

  const totalItemErrors = Object.values(itemErrors).filter((e) => Object.keys(e).length).length;

  return (
    <div>
      {student && (
        <div className="mb-4 flex items-center gap-3">
          <MentorUserAvatar avatarUrl={student.avatarUrl} name={publicUserName(student)} size={36} />
          <div className="min-w-0">
            <div className="text-[11px] text-dash-muted">برنامه برای</div>
            <div className="truncate text-[13.5px] font-bold text-dash-text">{publicUserName(student)}</div>
          </div>
        </div>
      )}

      {initialProgram?.changeRequestNote && (
        <MentorDashNotice tone="warn" icon={<MessageSquareWarning size={16} />} title="درخواست تغییر از طرف شاگرد">
          <span className="whitespace-pre-line text-dash-text">{initialProgram.changeRequestNote}</span>
        </MentorDashNotice>
      )}
      {initialProgram?.sentAt && (
        <p className="mb-3 mt-0 text-[11.5px] text-dash-muted">این برنامه قبلا ارسال شده؛ با ارسال دوباره، نسخه‌ی {fa(initialProgram.version + 1)} برای شاگرد فرستاده می‌شه.</p>
      )}

      {/* ── مشخصات ── */}
      <AccountBlock title="مشخصات برنامه" icon={<ClipboardList size={15} />} index={0}>
        <div className="mb-1 mt-2 text-[12px] font-bold text-dash-text">نوع برنامه</div>
        <SegmentedTabs<ProgramType>
          active={type}
          onChange={(v) => { setType(v); setItemErrors({}); setSavedAt(null); }}
          options={[{ value: "ROUTINE", label: "روتین" }, { value: "WORKOUT", label: "تمرینی" }]}
        />
        <p className="mb-0 mt-2 text-[11px] leading-6 text-dash-muted">
          {type === "ROUTINE"
            ? "آیتم‌ها بعد از فعال‌شدن، با برچسبِ عنوانِ برنامه به روتینِ شاگرد اضافه می‌شن."
            : "برای هر حرکت ست، تکرار، وزنه و استراحت تعیین کن؛ شاگرد هر روز انجامش رو ثبت می‌کنه."}
        </p>

        <div className="acc-field-stack">
          <AuthField id="pe-title" label="عنوان" error={formErr.title}>
            <input
              id="pe-title" type="text" className="wsearch-newform-name" maxLength={TITLE_MAX} value={title}
              placeholder={type === "WORKOUT" ? "مثلا: برنامه‌ی حجم ۸ هفته‌ای" : "مثلا: روتین صبحگاهی"}
              onChange={(e) => { setTitle(e.target.value); setFormErr((f) => ({ ...f, title: undefined })); setSavedAt(null); }}
            />
          </AuthField>
          <AuthField id="pe-desc" label="توضیحات (اختیاری)" error={formErr.description}>
            <textarea
              id="pe-desc" className="wsearch-newform-name acc-textarea" rows={3} maxLength={DESC_MAX} value={description}
              placeholder="هدف برنامه، نکات کلی، هشدارها…"
              onChange={(e) => { setDescription(e.target.value); setFormErr((f) => ({ ...f, description: undefined })); setSavedAt(null); }}
            />
          </AuthField>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[12px] font-bold text-dash-text"><CalendarRange size={14} className="text-dash-green" /> بازه‌ی زمانی (اختیاری)</div>
        <div className={`wsearch-date-row${formErr.dates ? " field-error" : ""}`} style={{ marginTop: 8 }}>
          <div className="time-field">
            <span className="time-field-label">تاریخ شروع</span>
            <button type="button" className={`jdate-btn${startDate ? "" : " placeholder"}`} onClick={() => setPicker("start")}>
              {startDate ? formatJalali(startDate) : "روز / ماه / سال"}
            </button>
          </div>
          <div className="time-field">
            <span className="time-field-label">تاریخ پایان</span>
            <button type="button" className={`jdate-btn${endDate ? "" : " placeholder"}`} onClick={() => setPicker("end")}>
              {endDate ? formatJalali(endDate) : "روز / ماه / سال"}
            </button>
          </div>
        </div>
        {(startDate || endDate) && (
          <button type="button" className="trade-title-add-btn mt-1" onClick={() => { setStartDate(null); setEndDate(null); setFormErr((f) => ({ ...f, dates: undefined })); }}>
            <X size={13} /> پاک‌کردن تاریخ‌ها
          </button>
        )}
        {formErr.dates && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{formErr.dates}</div>}
        <p className="mb-0 mt-2 text-[11px] leading-6 text-dash-muted">اگه تاریخ شروع خالی باشه، برنامه از روزی که شاگرد بپذیره شروع می‌شه.</p>
      </AccountBlock>

      {/* ── آیتم‌ها ── */}
      <AccountBlock
        title={type === "WORKOUT" ? `حرکات (${fa(items.length)})` : `آیتم‌ها (${fa(items.length)})`}
        icon={type === "WORKOUT" ? <Dumbbell size={15} /> : <ListChecks size={15} />}
        desc={`حداکثر ${fa(MAX_ITEMS)} آیتم. ترتیب با فلش‌ها عوض می‌شه.`}
        index={1}
      >
        {type === "WORKOUT" && (
          <datalist id="pe-exercise-names">
            {exerciseNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        )}
        <div ref={listRef} className="flex flex-col gap-3">
          {items.map((d, idx) => (
            <MentorProgramEditorItem
              key={d.key} draft={d} index={idx} count={items.length} type={type}
              errors={itemErrors[d.key] || {}}
              onPatch={(p) => patchItem(d.key, p)}
              onMove={(dir) => move(idx, dir)}
              onRemove={() => { setItems((xs) => xs.filter((x) => x.key !== d.key)); setItemErrors((e) => { const n = { ...e }; delete n[d.key]; return n; }); }}
            />
          ))}
          {items.length === 0 && <p className="m-0 py-2 text-center text-[12px] text-dash-muted">هنوز آیتمی اضافه نکردی.</p>}
        </div>
        {formErr.items && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{formErr.items}</div>}
        <div className="mt-3 flex justify-center">
          <button type="button" className="account-outline-btn" onClick={addItem} disabled={items.length >= MAX_ITEMS}>
            <Plus size={14} /> {type === "WORKOUT" ? "افزودن حرکت" : "افزودن آیتم"}
          </button>
        </div>
      </AccountBlock>

      {/* ── اکشن‌ها ── */}
      {error && <div className="form-inline-error" role="alert">{error}{totalItemErrors > 0 ? ` (${fa(totalItemErrors)} آیتم)` : ""}</div>}
      {savedAt && !error && <div className="mt-2.5 text-center text-[12px] font-bold text-dash-green" role="status">پیش‌نویس ذخیره شد</div>}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {programId && neverSent && props.mode === "edit" && (
          confirmDelete ? (
            <>
              <span className="text-[12px] text-dash-muted">پیش‌نویس حذف بشه؟</span>
              <button type="button" className="account-outline-btn" style={{ borderColor: "rgba(224,82,82,.55)", color: "#E05252" }} disabled={!!busy} onClick={remove}>
                {busy === "delete" ? <Spinner size={14} /> : "حذف"}
              </button>
              <button type="button" className="account-outline-btn muted" disabled={!!busy} onClick={() => setConfirmDelete(false)}>انصراف</button>
            </>
          ) : (
            <button type="button" className="account-outline-btn muted me-auto" disabled={!!busy} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> حذف پیش‌نویس
            </button>
          )
        )}
        <button type="button" className="account-outline-btn muted" disabled={!!busy} onClick={saveDraft} style={{ minWidth: 128 }}>
          {busy === "save" ? <Spinner size={14} /> : "ذخیره پیش‌نویس"}
        </button>
        <button type="button" className="account-outline-btn" disabled={!!busy} onClick={send} style={{ minWidth: 140 }}>
          {busy === "send" ? <Spinner size={14} /> : <><Send size={14} /> ارسال برای شاگرد</>}
        </button>
      </div>
      <p className="mb-0 mt-3 text-[11px] leading-6 text-dash-muted">
        بعد از ارسال، برنامه تا وقتی شاگرد بپذیره یا درخواست تغییر بده قابل ویرایش نیست.
        {programId && <> <Link href={`/mentor-programs/${programId}`} className="font-bold text-dash-green no-underline">صفحه‌ی برنامه</Link></>}
      </p>

      {picker && (
        <JalaliDatePicker
          initial={picker === "start" ? startDate : endDate}
          title={picker === "start" ? "تاریخ شروع برنامه" : "تاریخ پایان برنامه"}
          disablePast
          onClose={() => setPicker(null)}
          onPick={(v) => {
            setFormErr((f) => ({ ...f, dates: undefined }));
            setSavedAt(null);
            if (picker === "start") { setStartDate(v); setPicker(endDate ? null : "end"); }
            else { setEndDate(v); setPicker(null); }
          }}
        />
      )}
    </div>
  );
}

/** یک آیتمِ برنامه — فقط قابِ مویی (بی‌بک‌گراند) داخلِ بخشِ آیتم‌ها */
function MentorProgramEditorItem({
  draft: d, index, count, type, errors, onPatch, onMove, onRemove,
}: {
  draft: Draft;
  index: number;
  count: number;
  type: ProgramType;
  errors: ItemErrors;
  onPatch: (p: Partial<Draft>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = (f: string) => `pe-${d.key}-${f}`;
  const hasErr = Object.keys(errors).length > 0;
  const iconBtn: React.CSSProperties = { padding: "5px 8px" };
  return (
    <div className="rounded-[14px] border p-3" style={{ borderColor: hasErr ? "rgba(224,82,82,.55)" : "var(--surface-line)" }}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="flex-1 text-[12px] font-bold text-dash-muted">{type === "WORKOUT" ? "حرکت" : "آیتم"} {fa(index + 1)}</span>
        <button type="button" className="account-outline-btn muted" style={iconBtn} disabled={index === 0} onClick={() => onMove(-1)} aria-label="انتقال به بالا"><ArrowUp size={13} /></button>
        <button type="button" className="account-outline-btn muted" style={iconBtn} disabled={index === count - 1} onClick={() => onMove(1)} aria-label="انتقال به پایین"><ArrowDown size={13} /></button>
        <button type="button" className="account-outline-btn muted" style={{ ...iconBtn, color: "#E05252" }} onClick={onRemove} aria-label="حذف آیتم"><Trash2 size={13} /></button>
      </div>

      <div className="flex flex-col gap-3">
        <AuthField id={id("title")} label={type === "WORKOUT" ? "نام حرکت" : "عنوان"} error={errors.title}>
          <input
            id={id("title")} type="text" className="wsearch-newform-name" maxLength={ITEM_TITLE_MAX} value={d.title}
            list={type === "WORKOUT" ? "pe-exercise-names" : undefined}
            placeholder={type === "WORKOUT" ? "از کاتالوگ حرکات انتخاب کن یا بنویس" : "مثلا: پیاده‌روی ۳۰ دقیقه"}
            onChange={(e) => onPatch({ title: e.target.value })}
          />
        </AuthField>

        <div>
          <div className="mb-1.5 text-[11.5px] font-bold text-dash-text">تکرار</div>
          <SegmentedTabs<"DAILY" | "WEEKLY">
            active={d.repeat}
            onChange={(v) => onPatch({ repeat: v, days: v === "DAILY" ? [] : d.days })}
            options={[{ value: "WEEKLY", label: "روزهای مشخص" }, { value: "DAILY", label: "هر روز" }]}
          />
          {d.repeat === "WEEKLY" && (
            <div className={`day-picker${errors.days ? " field-error" : ""}`} style={{ marginTop: 8 }} role="group" aria-label="روزهای هفته">
              {WEEK_ORDER.map((o) => {
                const on = d.days.includes(o.jsDay);
                return (
                  <span
                    key={o.jsDay} role="checkbox" aria-checked={on} aria-label={FA_WEEKDAY[o.jsDay]} tabIndex={0}
                    className={`day-pill${on ? " on" : ""}`}
                    onClick={() => onPatch({ days: on ? d.days.filter((x) => x !== o.jsDay) : [...d.days, o.jsDay] })}
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onPatch({ days: on ? d.days.filter((x) => x !== o.jsDay) : [...d.days, o.jsDay] }); } }}
                  >
                    {o.short}
                  </span>
                );
              })}
            </div>
          )}
          {errors.days && <div className="field-error-msg" style={{ display: "block", marginTop: 4 }}>{errors.days}</div>}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <AuthField id={id("time")} label="ساعت شروع (اختیاری)" error={errors.startTime}>
            <span dir="ltr" className="block">
              <TimeInput value={d.startTime} onChange={(v) => onPatch({ startTime: v })} className="wsearch-newform-name mono" placeholder="--:--" />
            </span>
          </AuthField>
          <AuthField id={id("dur")} label="مدت (دقیقه)" error={errors.durationMin}>
            <NumberInput id={id("dur")} className="wsearch-newform-name" dir="ltr" style={{ textAlign: "right" }} value={d.durationMin} onChange={(v) => onPatch({ durationMin: v })} maxLength={4} />
          </AuthField>
        </div>

        {type === "WORKOUT" && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <AuthField id={id("sets")} label="ست" error={errors.sets}>
              <NumberInput id={id("sets")} className="wsearch-newform-name" dir="ltr" style={{ textAlign: "right" }} value={d.sets} onChange={(v) => onPatch({ sets: v })} maxLength={3} />
            </AuthField>
            <AuthField id={id("reps")} label="تکرار" error={errors.reps}>
              <input
                id={id("reps")} type="text" inputMode="numeric" className="wsearch-newform-name" dir="ltr" style={{ textAlign: "right" }}
                value={d.reps} placeholder="8-12" maxLength={7}
                onChange={(e) => onPatch({ reps: toEnDigits(e.target.value).replace(/[^\d-]/g, "") })}
              />
            </AuthField>
            <AuthField id={id("w")} label="وزنه (کیلو)" error={errors.weightKg}>
              <NumberInput decimal id={id("w")} className="wsearch-newform-name" dir="ltr" style={{ textAlign: "right" }} value={d.weightKg} onChange={(v) => onPatch({ weightKg: v })} maxLength={6} />
            </AuthField>
            <AuthField id={id("rest")} label="استراحت (ثانیه)" error={errors.restSec}>
              <NumberInput id={id("rest")} className="wsearch-newform-name" dir="ltr" style={{ textAlign: "right" }} value={d.restSec} onChange={(v) => onPatch({ restSec: v })} maxLength={4} />
            </AuthField>
          </div>
        )}

        <AuthField id={id("details")} label="جزئیات (اختیاری)" error={errors.details}>
          <textarea
            id={id("details")} className="wsearch-newform-name acc-textarea" rows={2} maxLength={ITEM_DETAILS_MAX} value={d.details}
            placeholder={type === "WORKOUT" ? "نکات فرم حرکت، تمپو، …" : "توضیح کوتاه برای شاگرد"}
            onChange={(e) => onPatch({ details: e.target.value })}
          />
        </AuthField>
      </div>
    </div>
  );
}
