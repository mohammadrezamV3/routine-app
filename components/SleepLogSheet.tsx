"use client";

import "./sleep-log.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmartLink as Link } from "@/components/SmartLink";
import { AlertTriangle, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { GradientRing, RING_AMBER, RING_BLUE, RING_GREEN, RING_OVER, type RingGrad } from "./GradientRing";
import { NumberInput } from "./NumberInput";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { TickOption } from "./TickOption";
import { SleepTimeField } from "./SleepTimeField";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { DURATION_PRESETS_MIN, bedForDuration, durationWarning, fullCyclesOf, hoursShort } from "@/lib/sleepSheetHelpers";
import { weekdayName, jMonthName, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { isEn, tr } from "@/lib/i18n";
import { deleteSleep, saveSleep, SleepSaveError } from "@/lib/storage";
import { ROUTINE_PLAN_KEY } from "@/lib/trial";
import {
  AWAKENINGS_MAX, LATENCY_MAX, NAP_MAX, scoreBandLabel, SLEEP_MAX_MIN, SLEEP_MIN_MIN, SLEEP_TAGS,
  DEFAULT_LATENCY, addDaysIso, buildSleepTimes, isFutureWake, clockOf, durationLabel, goalFromTargets, scoreBand, sleepScore,
  type ScoreBand, type SleepRecord,
} from "@/lib/sleep";

// پنجره‌ی ثبت/ویرایش یک شب: روز بیدارشدن + ساعت خواب و بیداری، پیش‌نمایش زنده‌ی
// مدت و امتیاز، کیفیت و جزئیات اختیاری. ورودی‌ها همه از کامپوننت‌های مشترک سایت.

export type SleepLogSheetProps = {
  open: boolean;
  /** شب موجود برای ویرایش، یا پیش‌نویس (مثلا از ردیاب زنده)، یا null برای ثبت تازه */
  initial: Partial<SleepRecord> & { date: string } | null;
  /** ساعت‌های هدف روتین (پیش‌فرض فیلدها) */
  target: { wake: string; sleep: string };
  /** اگه true، initial یک شب ذخیره‌شده‌ست و دکمه‌ی حذف نشون داده می‌شه */
  existing: boolean;
  onClose: () => void;
  /** بعد از ذخیره یا حذف موفق */
  onChanged: () => void;
};

type Pane = "time" | "details";
const BUY_HREF = `/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=1`;
const BAND_GRAD: Record<ScoreBand, RingGrad> = { great: RING_GREEN, good: RING_BLUE, fair: RING_AMBER, poor: RING_OVER };
const qualityOpts = () => [
  { value: "1", label: tr("خیلی بد", "Very bad") },
  { value: "2", label: tr("بد", "Bad") },
  { value: "3", label: tr("معمولی", "Okay") },
  { value: "4", label: tr("خوب", "Good") },
  { value: "5", label: tr("عالی", "Great") },
];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateLabel(iso: string): string {
  const d = parseIso(iso);
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${weekdayName(d.getDay())} ${faNum(jd)} ${jMonthName(jm - 1)}`;
}
function clockToMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : h * 60 + mi;
}
function numOrNull(v: string, max: number): number | null {
  if (!v.trim()) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : null;
}
const str = (n: number | null | undefined) => (typeof n === "number" ? String(n) : "");

export function SleepLogSheet(props: SleepLogSheetProps) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<SheetBody {...props} />, document.body);
}

function SheetBody({ initial, target, existing, onClose, onChanged }: SleepLogSheetProps) {
  useLockBodyScroll();
  const todayIso = isoLocal(new Date());
  const init = initial;
  const hasExact = !!(init?.sleptAt && init?.wokeAt);

  const [date, setDate] = useState(() => (init?.date && init.date <= todayIso ? init.date : todayIso));
  const [bed, setBed] = useState(() => (init?.sleptAt ? clockOf(init.sleptAt) : target.sleep));
  const [wake, setWake] = useState(() => (init?.wokeAt ? clockOf(init.wokeAt) : target.wake));
  const [timesDirty, setTimesDirty] = useState(false);
  const [quality, setQuality] = useState<string | null>(() => (init?.quality ? String(init.quality) : null));
  const [note, setNote] = useState(init?.note ?? "");
  const [latency, setLatency] = useState(str(init?.latencyMin));
  const [awake, setAwake] = useState(str(init?.awakenings));
  const [nap, setNap] = useState(str(init?.napMin));
  const [tags, setTags] = useState<string[]>(() => init?.tags ?? []);
  const [pane, setPane] = useState<Pane>("time");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [purchase, setPurchase] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  // ساعت‌های دقیق ردیاب زنده تا وقتی کاربر دست نزده و روز عوض نشده حفظ می‌شن
  const useExact = hasExact && !timesDirty && date === init?.date;
  const range = useMemo(() => {
    if (useExact) return { sleptAt: new Date(init!.sleptAt!), wokeAt: new Date(init!.wokeAt!) };
    return buildSleepTimes(date, bed, wake);
  }, [useExact, init, date, bed, wake]);
  const durMin = range ? Math.round((range.wokeAt.getTime() - range.sleptAt.getTime()) / 60000) : null;
  const durOk = durMin != null && durMin >= SLEEP_MIN_MIN && durMin <= SLEEP_MAX_MIN;

  const latencyN = numOrNull(latency, LATENCY_MAX);
  const awakeN = numOrNull(awake, AWAKENINGS_MAX);
  const napN = numOrNull(nap, NAP_MAX);
  const qualityN = quality ? Number(quality) : null;

  const score = useMemo(() => {
    if (!range || !durOk) return null;
    const rec: SleepRecord = {
      date, sleptAt: range.sleptAt.toISOString(), wokeAt: range.wokeAt.toISOString(),
      quality: qualityN, note: null, latencyMin: latencyN, awakenings: awakeN, napMin: napN, tags,
    };
    return sleepScore(rec, { goalMin: goalFromTargets(target), targetBedMin: clockToMin(target.sleep) }).score;
  }, [range, durOk, date, qualityN, latencyN, awakeN, napN, tags, target]);
  const band = score != null ? scoreBand(score) : null;
  const future = !!range && isFutureWake(range.wokeAt);
  const warn = future ? "future" : durationWarning(durOk ? durMin : null);
  const cycles = durOk && durMin != null ? fullCyclesOf(durMin, latencyN ?? DEFAULT_LATENCY) : null;
  const presetActive = durMin != null && DURATION_PRESETS_MIN.includes(durMin as never) ? String(durMin) : null;
  const overnight = !!range && range.sleptAt.getDate() !== range.wokeAt.getDate();

  const shift = (n: number) => {
    const next = addDaysIso(date, n);
    if (next > todayIso) return;
    setDate(next);
  };
  const toggleTag = (key: string, on: boolean) =>
    setTags((p) => (on ? (p.includes(key) ? p : [...p, key]) : p.filter((k) => k !== key)));

  async function onSave() {
    if (saving) return;
    if (!range || !durOk) { setErr(tr("ساعت‌ها را درست وارد کن (خواب 30 دقیقه تا 20 ساعت)", "Enter the times correctly (sleep of 30 minutes to 20 hours)")); return; }
    if (future) { setErr(tr("ساعت بیداری هنوز نرسیده؛ ساعت یا روز رو درست کن", "The wake-up time hasn't happened yet; fix the time or day")); return; }
    setSaving(true); setErr(null); setPurchase(false);
    try {
      await saveSleep({
        date,
        sleptAt: range.sleptAt.toISOString(),
        wokeAt: range.wokeAt.toISOString(),
        quality: qualityN,
        note: note.trim() ? note.trim().slice(0, 200) : null,
        latencyMin: latencyN,
        awakenings: awakeN,
        napMin: napN,
        tags,
      });
      onChanged();
    } catch (e) {
      if (e instanceof SleepSaveError && e.status === 403) { setPurchase(true); setErr(tr("دوره‌ی آزمایشی «روتین من» تموم شده؛ برای ثبت خواب پلن رو تهیه کن.", "Your My Routine trial has ended; get the plan to log sleep.")); }
      else setErr(e instanceof Error ? e.message : tr("ذخیره نشد", "Couldn't save"));
      setSaving(false);
    }
  }

  async function onDelete() {
    if (saving) return;
    setSaving(true); setErr(null); setPurchase(false);
    try {
      await deleteSleep(init?.date ?? date);
      onChanged();
    } catch (e) {
      if (e instanceof SleepSaveError && e.status === 403) { setPurchase(true); setErr(tr("دوره‌ی آزمایشی «روتین من» تموم شده؛ برای تغییر خواب پلن رو تهیه کن.", "Your My Routine trial has ended; get the plan to change sleep entries.")); }
      else setErr(e instanceof Error ? e.message : tr("حذف نشد", "Couldn't delete"));
      setSaving(false);
    }
  }

  const atToday = date >= todayIso;
  const warnText: Record<string, string> = {
    invalid: tr("مدت خواب باید بین 30 دقیقه و 20 ساعت باشد", "Sleep must be between 30 minutes and 20 hours"),
    short: tr("کمتر از 4 ساعت؛ مطمئنی ساعت‌ها درسته؟", "Under 4 hours; are the times right?"),
    long: tr("بیشتر از 12 ساعت؛ مطمئنی ساعت‌ها درسته؟", "Over 12 hours; are the times right?"),
    future: tr("ساعت بیداری هنوز نرسیده؛ ساعت یا روز رو درست کن", "The wake-up time hasn't happened yet; fix the time or day"),
  };
  const durPresetOpts = DURATION_PRESETS_MIN.map((m) => ({ value: String(m), label: tr(`${hoursShort(m)} س`, `${hoursShort(m)}h`) }));

  return (
    <>
      <div className="modal-overlay open" onClick={() => { if (!saving) onClose(); }} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel slg-wide" role="dialog" aria-modal="true" aria-label={tr("ثبت خواب", "Log sleep")}>
        <div className="modal-head">
          <div className="modal-title">{existing ? tr("ویرایش خواب", "Edit sleep") : tr("ثبت خواب", "Log sleep")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="slg-body">
          <SegmentedTabs<Pane>
            className="slg-pane-tabs seg-flush"
            ariaLabel={tr("بخش‌های ثبت خواب", "Log sections")}
            options={[{ value: "time", label: tr("زمان", "Time") }, { value: "details", label: tr("جزئیات", "Details") }]}
            active={pane}
            onChange={setPane}
          />

          <div className="slg-panes">
            <div className="slg-pane" data-on={pane === "time"}>
              <div className="slg-date">
                <button type="button" className="slg-nav" onClick={() => shift(-1)} aria-label={tr("روز قبل", "Previous day")}>{isEn() ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button>
                <div className="slg-date-text">
                  <span className="slg-date-cap">{tr("صبح بیدارشدن", "Morning you woke up")}</span>
                  <b>{dateLabel(date)}</b>
                </div>
                <button type="button" className="slg-nav" onClick={() => shift(1)} disabled={atToday} aria-label={tr("روز بعد", "Next day")}>{isEn() ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
              </div>

              <div className="slg-sec" role="group" aria-label={tr("ساعت‌ها", "Times")}>
                <div className="slg-times">
                  <SleepTimeField
                    label={tr("ساعت خواب", "Bedtime")}
                    hint={overnight ? tr("شب قبل", "Night before") : null}
                    value={bed}
                    fallback={target.sleep}
                    onChange={(v) => { setBed(v); setTimesDirty(true); }}
                  />
                  <SleepTimeField
                    label={tr("ساعت بیداری", "Wake-up time")}
                    value={wake}
                    fallback={target.wake}
                    onChange={(v) => { setWake(v); setTimesDirty(true); }}
                  />
                </div>
                <div className="slg-block">
                  <span className="slg-label">{tr("مدت خواب (ساعت بیداری ثابت می‌ماند)", "Duration (wake-up time stays)")}</span>
                  <SegmentedTabs
                    className="slg-dur seg-flush"
                    ariaLabel={tr("مدت خواب", "Sleep duration")}
                    options={durPresetOpts}
                    active={presetActive}
                    onChange={(v) => { const b = bedForDuration(wake, Number(v)); if (b) { setBed(b); setTimesDirty(true); } }}
                  />
                </div>
                {(bed !== target.sleep || wake !== target.wake) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm slg-goal-fill"
                    onClick={() => { setBed(target.sleep); setWake(target.wake); setTimesDirty(true); }}
                  >
                    <RotateCcw aria-hidden />
                    <span>{tr(`ساعت‌های هدف (${target.sleep} تا ${target.wake})`, `Use goal times (${target.sleep} to ${target.wake})`)}</span>
                  </button>
                )}
              </div>

              <div className="slg-preview" aria-live="polite">
                <GradientRing value={score != null ? score / 100 : 0} size={52} stroke={6} grad={BAND_GRAD[band ?? "good"]}>
                  <b className={`slg-ring-num${band ? ` slp-c-${band}` : ""}`}>{score != null ? faNum(score) : "-"}</b>
                </GradientRing>
                <div className="slg-preview-text">
                  <b>{durOk && durMin != null ? durationLabel(durMin) : tr("ساعت‌ها را وارد کن", "Enter the times")}</b>
                  {cycles != null && <span className="sl-sub">{tr(`${cycles} چرخه کامل`, `${cycles} full ${cycles === 1 ? "cycle" : "cycles"}`)}</span>}
                  <span className={band ? `slp-c-${band}` : "sl-sub"}>
                    {band ? tr(`امتیاز این شب: ${scoreBandLabel(band)}`, `Score for this night: ${scoreBandLabel(band)}`) : tr("امتیاز بعد از ورود ساعت‌ها", "Score appears once times are set")}
                  </span>
                </div>
              </div>

              {warn && (
                <div className="slg-warn" role="alert">
                  <AlertTriangle size={16} aria-hidden />
                  <span>{warnText[warn]}</span>
                </div>
              )}

              <div className="slg-sec" role="group" aria-label={tr("کیفیت خواب", "Sleep quality")}>
                <div className="slg-block-head">
                  <span className="slg-label">{tr("کیفیت خواب", "Sleep quality")}</span>
                  {quality && <button type="button" className="slg-clear" onClick={() => setQuality(null)}>{tr("پاک‌کردن", "Clear")}</button>}
                </div>
                <SegmentedTabs className="slg-quality seg-flush" ariaLabel={tr("کیفیت خواب", "Sleep quality")} options={qualityOpts()} active={quality} onChange={setQuality} />
              </div>
            </div>

            <div className="slg-pane" data-on={pane === "details"}>
              <div className="slg-nums">
                <label className="slg-field">
                  <span>{tr("تا خواب رفتن (دقیقه)", "Time to fall asleep (min)")}</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" limit="sleepLatency" value={latency} onChange={setLatency} />
                </label>
                <label className="slg-field">
                  <span>{tr("بیدارشدن وسط شب", "Night awakenings")}</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" limit="sleepAwakenings" value={awake} onChange={setAwake} />
                </label>
                <label className="slg-field">
                  <span>{tr("چرت روز (دقیقه)", "Daytime nap (min)")}</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" limit="sleepNap" value={nap} onChange={setNap} />
                </label>
              </div>
              <div className="slg-block">
                <span className="slg-label">{tr("چه چیزی روی این شب اثر داشت؟", "What affected this night?")}</span>
                <div className="slg-tags">
                  {SLEEP_TAGS.map((t) => (
                    <TickOption key={t.key} checked={tags.includes(t.key)} onChange={(v) => toggleTag(t.key, v)}>{tr(t.label, t.en)}</TickOption>
                  ))}
                </div>
              </div>
              <label className="slg-field">
                <span className="slg-note-head">
                  <span>{tr("یادداشت", "Note")}</span>
                  <small className="slg-count" dir="ltr">{faNum(note.length)} / 200</small>
                </span>
                <textarea
                  className="wsearch-newform-name slg-note"
                  rows={2}
                  maxLength={200}
                  placeholder={tr("مثلا شب پرتحرکی بود", "e.g. it was a restless night")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="slg-foot">
          {err && (
            <div className="sl-err slg-err">
              {err}{" "}
              {purchase && <Link href={BUY_HREF} className="slg-buy">{tr("تهیه‌ی پلن روتین من", "Get the My Routine plan")}</Link>}
            </div>
          )}
          {confirmDel ? (
            <div className="slg-actions">
              <span className="slg-confirm">{tr("این شب حذف بشه؟", "Delete this night?")}</span>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(false)} disabled={saving}>{tr("انصراف", "Cancel")}</button>
              <button type="button" className="btn btn-outline slg-danger" onClick={onDelete} disabled={saving}>
                {saving && <Spinner label={null} />} {tr("حذف شود", "Delete")}
              </button>
            </div>
          ) : (
            <div className="slg-actions">
              {existing && (
                <button type="button" className="btn btn-ghost btn-sm slg-danger slg-del" onClick={() => setConfirmDel(true)} disabled={saving}>{tr("حذف این شب", "Delete night")}</button>
              )}
              <button type="button" className="btn btn-primary slg-save" onClick={onSave} disabled={saving || !durOk || future}>
                {saving && <Spinner label={null} />} {existing ? tr("ذخیره‌ی تغییرات", "Save changes") : tr("ذخیره", "Save")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
