"use client";

import "./sleep-log.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { GradientRing, RING_AMBER, RING_BLUE, RING_GREEN, RING_OVER, type RingGrad } from "./GradientRing";
import { NumberInput } from "./NumberInput";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { TickOption } from "./TickOption";
import { TimeInput } from "./TimeInput";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { weekdayName, jMonthName, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { isEn, tr } from "@/lib/i18n";
import { deleteSleep, saveSleep, SleepSaveError } from "@/lib/storage";
import { ROUTINE_PLAN_KEY } from "@/lib/trial";
import {
  AWAKENINGS_MAX, LATENCY_MAX, NAP_MAX, scoreBandLabel, SLEEP_MAX_MIN, SLEEP_MIN_MIN, SLEEP_TAGS,
  addDaysIso, buildSleepTimes, isFutureWake, clockOf, durationLabel, goalFromTargets, scoreBand, sleepScore,
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
  const [more, setMore] = useState(() => !!(init?.latencyMin || init?.awakenings || init?.napMin || init?.tags?.length));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [purchase, setPurchase] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

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
    if (isFutureWake(range.wokeAt)) { setErr(tr("ساعت بیداری هنوز نرسیده؛ ساعت یا روز رو درست کن", "The wake-up time hasn't happened yet; fix the time or day")); return; }
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

  return (
    <>
      <div className="modal-overlay open" onClick={() => { if (!saving) onClose(); }} />
      <div className="modal-panel liquid-glass-panel open sleep-scope slg-panel" role="dialog" aria-modal="true" aria-label={tr("ثبت خواب", "Log sleep")}>
        <div className="modal-head">
          <div className="modal-title">{existing ? tr("ویرایش خواب", "Edit sleep") : tr("ثبت خواب", "Log sleep")}</div>
          <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>

        <div className="slg-body">
          <div className="slg-date">
            <button type="button" className="slg-nav" onClick={() => shift(-1)} aria-label={tr("روز قبل", "Previous day")}>{isEn() ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button>
            <div className="slg-date-text">
              <span className="slg-date-cap">{tr("صبح بیدارشدن", "Morning you woke up")}</span>
              <b>{dateLabel(date)}</b>
            </div>
            <button type="button" className="slg-nav" onClick={() => shift(1)} disabled={atToday} aria-label={tr("روز بعد", "Next day")}>{isEn() ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
          </div>

          <div className="slg-times">
            <label className="slg-field">
              <span>{tr("ساعت خواب", "Bedtime")}</span>
              <TimeInput className="wsearch-newform-name slg-time" value={bed} onChange={(v) => { setBed(v); setTimesDirty(true); }} />
            </label>
            <label className="slg-field">
              <span>{tr("ساعت بیداری", "Wake-up time")}</span>
              <TimeInput className="wsearch-newform-name slg-time" value={wake} onChange={(v) => { setWake(v); setTimesDirty(true); }} />
            </label>
          </div>

          <div className="slg-preview">
            <GradientRing value={score != null ? score / 100 : 0} size={64} stroke={7} grad={BAND_GRAD[band ?? "good"]}>
              <b className={`slg-ring-num${band ? ` slp-c-${band}` : ""}`}>{score != null ? faNum(score) : "-"}</b>
            </GradientRing>
            <div className="slg-preview-text">
              <b>{durOk && durMin != null ? durationLabel(durMin) : tr("ساعت‌ها را وارد کن", "Enter the times")}</b>
              <span className={band ? `slp-c-${band}` : "sl-sub"}>
                {band ? tr(`امتیاز این شب: ${scoreBandLabel(band)}`, `Score for this night: ${scoreBandLabel(band)}`) : tr("مدت باید بین 30 دقیقه و 20 ساعت باشد", "Duration must be between 30 minutes and 20 hours")}
              </span>
            </div>
          </div>

          <div className="slg-block">
            <div className="slg-block-head">
              <span className="slg-label">{tr("کیفیت خواب", "Sleep quality")}</span>
              {quality && <button type="button" className="slg-clear" onClick={() => setQuality(null)}>{tr("پاک‌کردن", "Clear")}</button>}
            </div>
            <SegmentedTabs className="slg-quality" ariaLabel={tr("کیفیت خواب", "Sleep quality")} options={qualityOpts()} active={quality} onChange={setQuality} />
          </div>

          <button type="button" className="slg-more-toggle" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            <span>{tr("جزئیات بیشتر", "More details")}</span>
            <ChevronDown size={16} className={more ? "slg-chev open" : "slg-chev"} />
          </button>

          {more && (
            <div className="slg-more">
              <div className="slg-nums">
                <label className="slg-field">
                  <span>{tr("تا خواب رفتن (دقیقه)", "Time to fall asleep (min)")}</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" maxLength={3} value={latency} onChange={setLatency} />
                </label>
                <label className="slg-field">
                  <span>{tr("بیدارشدن وسط شب", "Night awakenings")}</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" maxLength={2} value={awake} onChange={setAwake} />
                </label>
                <label className="slg-field">
                  <span>{tr("چرت روز (دقیقه)", "Daytime nap (min)")}</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" maxLength={3} value={nap} onChange={setNap} />
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
                <span>{tr("یادداشت", "Note")}</span>
                <textarea
                  className="wsearch-newform-name slg-note"
                  rows={2}
                  maxLength={200}
                  placeholder={tr("مثلا شب پرتحرکی بود", "e.g. it was a restless night")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <small className="slg-count" dir="ltr">{faNum(note.length)} / 200</small>
              </label>
            </div>
          )}

          {err && (
            <div className="sl-err slg-err">
              {err}{" "}
              {purchase && <Link href={BUY_HREF} className="slg-buy">{tr("تهیه‌ی پلن روتین من", "Get the My Routine plan")}</Link>}
            </div>
          )}

          {confirmDel ? (
            <div className="slg-actions">
              <span className="slg-confirm">{tr("این شب حذف بشه؟", "Delete this night?")}</span>
              <button type="button" className="account-outline-btn slg-danger" onClick={onDelete} disabled={saving}>
                {saving && <Spinner label={null} />} {tr("حذف شود", "Delete")}
              </button>
              <button type="button" className="account-outline-btn" onClick={() => setConfirmDel(false)} disabled={saving}>{tr("انصراف", "Cancel")}</button>
            </div>
          ) : (
            <div className="slg-actions">
              <button type="button" className="trade-primary-btn slg-save" onClick={onSave} disabled={saving || !durOk}>
                {saving && <Spinner label={null} />} {existing ? tr("ذخیره‌ی تغییرات", "Save changes") : tr("ذخیره", "Save")}
              </button>
              {existing && (
                <button type="button" className="account-outline-btn slg-danger" onClick={() => setConfirmDel(true)} disabled={saving}>{tr("حذف", "Delete")}</button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
