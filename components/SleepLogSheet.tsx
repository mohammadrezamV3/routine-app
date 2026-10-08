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
import { FA_WEEKDAY, J_MONTHS, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { deleteSleep, saveSleep, SleepSaveError } from "@/lib/storage";
import { ROUTINE_PLAN_KEY } from "@/lib/trial";
import {
  AWAKENINGS_MAX, LATENCY_MAX, NAP_MAX, SCORE_BAND_LABEL, SLEEP_MAX_MIN, SLEEP_MIN_MIN, SLEEP_TAGS,
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
const QUALITY_OPTS = [
  { value: "1", label: "خیلی بد" },
  { value: "2", label: "بد" },
  { value: "3", label: "معمولی" },
  { value: "4", label: "خوب" },
  { value: "5", label: "عالی" },
];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateLabel(iso: string): string {
  const d = parseIso(iso);
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${FA_WEEKDAY[d.getDay()]} ${faNum(jd)} ${J_MONTHS[jm - 1]}`;
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
    if (!range || !durOk) { setErr("ساعت‌ها را درست وارد کن (خواب 30 دقیقه تا 20 ساعت)"); return; }
    if (isFutureWake(range.wokeAt)) { setErr("ساعت بیداری هنوز نرسیده؛ ساعت یا روز رو درست کن"); return; }
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
      if (e instanceof SleepSaveError && e.status === 403) { setPurchase(true); setErr("دوره‌ی آزمایشی «روتین من» تموم شده؛ برای ثبت خواب پلن رو تهیه کن."); }
      else setErr(e instanceof Error ? e.message : "ذخیره نشد");
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
      if (e instanceof SleepSaveError && e.status === 403) { setPurchase(true); setErr("دوره‌ی آزمایشی «روتین من» تموم شده؛ برای تغییر خواب پلن رو تهیه کن."); }
      else setErr(e instanceof Error ? e.message : "حذف نشد");
      setSaving(false);
    }
  }

  const atToday = date >= todayIso;

  return (
    <>
      <div className="modal-overlay open" onClick={() => { if (!saving) onClose(); }} />
      <div className="modal-panel liquid-glass-panel open sleep-scope slg-panel" role="dialog" aria-modal="true" aria-label="ثبت خواب">
        <div className="modal-head">
          <div className="modal-title">{existing ? "ویرایش خواب" : "ثبت خواب"}</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <div className="slg-body">
          <div className="slg-date">
            <button type="button" className="slg-nav" onClick={() => shift(-1)} aria-label="روز قبل"><ChevronRight size={18} /></button>
            <div className="slg-date-text">
              <span className="slg-date-cap">صبح بیدارشدن</span>
              <b>{dateLabel(date)}</b>
            </div>
            <button type="button" className="slg-nav" onClick={() => shift(1)} disabled={atToday} aria-label="روز بعد"><ChevronLeft size={18} /></button>
          </div>

          <div className="slg-times">
            <label className="slg-field">
              <span>ساعت خواب</span>
              <TimeInput className="wsearch-newform-name slg-time" value={bed} onChange={(v) => { setBed(v); setTimesDirty(true); }} />
            </label>
            <label className="slg-field">
              <span>ساعت بیداری</span>
              <TimeInput className="wsearch-newform-name slg-time" value={wake} onChange={(v) => { setWake(v); setTimesDirty(true); }} />
            </label>
          </div>

          <div className="slg-preview">
            <GradientRing value={score != null ? score / 100 : 0} size={64} stroke={7} grad={BAND_GRAD[band ?? "good"]}>
              <b className={`slg-ring-num${band ? ` slp-c-${band}` : ""}`}>{score != null ? faNum(score) : "-"}</b>
            </GradientRing>
            <div className="slg-preview-text">
              <b>{durOk && durMin != null ? durationLabel(durMin) : "ساعت‌ها را وارد کن"}</b>
              <span className={band ? `slp-c-${band}` : "sl-sub"}>
                {band ? `امتیاز این شب: ${SCORE_BAND_LABEL[band]}` : "مدت باید بین 30 دقیقه و 20 ساعت باشد"}
              </span>
            </div>
          </div>

          <div className="slg-block">
            <div className="slg-block-head">
              <span className="slg-label">کیفیت خواب</span>
              {quality && <button type="button" className="slg-clear" onClick={() => setQuality(null)}>پاک‌کردن</button>}
            </div>
            <SegmentedTabs className="slg-quality" ariaLabel="کیفیت خواب" options={QUALITY_OPTS} active={quality} onChange={setQuality} />
          </div>

          <button type="button" className="slg-more-toggle" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            <span>جزئیات بیشتر</span>
            <ChevronDown size={16} className={more ? "slg-chev open" : "slg-chev"} />
          </button>

          {more && (
            <div className="slg-more">
              <div className="slg-nums">
                <label className="slg-field">
                  <span>تا خواب رفتن (دقیقه)</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" maxLength={3} value={latency} onChange={setLatency} />
                </label>
                <label className="slg-field">
                  <span>بیدارشدن وسط شب</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" maxLength={2} value={awake} onChange={setAwake} />
                </label>
                <label className="slg-field">
                  <span>چرت روز (دقیقه)</span>
                  <NumberInput className="wsearch-newform-name" placeholder="0" maxLength={3} value={nap} onChange={setNap} />
                </label>
              </div>
              <div className="slg-block">
                <span className="slg-label">چه چیزی روی این شب اثر داشت؟</span>
                <div className="slg-tags">
                  {SLEEP_TAGS.map((t) => (
                    <TickOption key={t.key} checked={tags.includes(t.key)} onChange={(v) => toggleTag(t.key, v)}>{t.label}</TickOption>
                  ))}
                </div>
              </div>
              <label className="slg-field">
                <span>یادداشت</span>
                <textarea
                  className="wsearch-newform-name slg-note"
                  rows={2}
                  maxLength={200}
                  placeholder="مثلا شب پرتحرکی بود"
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
              {purchase && <Link href={BUY_HREF} className="slg-buy">تهیه‌ی پلن روتین من</Link>}
            </div>
          )}

          {confirmDel ? (
            <div className="slg-actions">
              <span className="slg-confirm">این شب حذف بشه؟</span>
              <button type="button" className="account-outline-btn slg-danger" onClick={onDelete} disabled={saving}>
                {saving && <Spinner label={null} />} حذف شود
              </button>
              <button type="button" className="account-outline-btn" onClick={() => setConfirmDel(false)} disabled={saving}>انصراف</button>
            </div>
          ) : (
            <div className="slg-actions">
              <button type="button" className="trade-primary-btn slg-save" onClick={onSave} disabled={saving || !durOk}>
                {saving && <Spinner label={null} />} {existing ? "ذخیره‌ی تغییرات" : "ذخیره"}
              </button>
              {existing && (
                <button type="button" className="account-outline-btn slg-danger" onClick={() => setConfirmDel(true)} disabled={saving}>حذف</button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
