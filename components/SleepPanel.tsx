"use client";

import "@/app/sleep/sleep.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { TimeInput } from "./TimeInput";
import { ICONS } from "./NavDrawer";
import { GradientRing } from "./GradientRing";
import { D_EASE } from "./DashboardKit";
import { FA_WEEKDAY, FA_WEEKDAY_SHORT, J_MONTHS, faNum, isoLocal, toJalali } from "@/lib/jalali";
import { deleteSleep, getSleepRange, saveSleep, SleepSaveError } from "@/lib/storage";
import { getWakeSleepTimes, DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { useLiveRefresh } from "@/lib/liveSync";
import { ROUTINE_PLAN_KEY } from "@/lib/trial";
import {
  SLEEP_GOAL_MAX, SLEEP_GOAL_MIN, SLEEP_MAX_MIN, SLEEP_MIN_MIN,
  buildSleepTimes, clockOf, durationLabel, sleepMinutes, summarizeSleep, timelineSpan,
  type SleepRecord,
} from "@/lib/sleep";

const DAYS_BACK = 14;
const LOAD_DAYS = 30;
const BUY_HREF = `/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=1`;

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return x;
}
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function jalaliLabel(iso: string): string {
  const d = parseIso(iso);
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${faNum(jd)} ${J_MONTHS[jm - 1]}`;
}
function goalTone(min: number): "good" | "low" | "high" {
  return min < SLEEP_GOAL_MIN ? "low" : min > SLEEP_GOAL_MAX ? "high" : "good";
}
function toneColor(t: "good" | "low" | "high"): string {
  return t === "good" ? "var(--sl-good-a)" : t === "low" ? "var(--sl-low)" : "var(--sl-high)";
}

export function SleepPanel() {
  // امروز با گذشتنِ نیمه‌شب (صفحه‌ی باز) عوض می‌شه
  const [todayIso, setTodayIso] = useState(() => isoLocal(new Date()));
  useEffect(() => {
    const t = setInterval(() => setTodayIso((p) => { const n = isoLocal(new Date()); return n === p ? p : n; }), 30_000);
    return () => clearInterval(t);
  }, []);
  const [entries, setEntries] = useState<SleepRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [target, setTarget] = useState<{ wake: string; sleep: string }>({ wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP });
  const [date, setDate] = useState(todayIso);
  const [bed, setBed] = useState("");
  const [wake, setWake] = useState("");
  const [quality, setQuality] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [purchase, setPurchase] = useState(false);
  const [okMsg, setOkMsg] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [range, setRange] = useState<"14" | "30">("14");
  const formRef = useRef<HTMLDivElement>(null);
  const prefilledFor = useRef<string | null>(null);
  // کاربر فرم رو دست زده؟ (پیش‌فرض‌های دیررسیده نباید تایپش رو بپرونن)
  const dirty = useRef(false);
  const dateRef = useRef(date);
  dateRef.current = date;
  const busy = useRef(false);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const from = isoLocal(addDays(new Date(), -(LOAD_DAYS - 1)));
    const list = await getSleepRange(from, isoLocal(new Date()));
    if (seq !== loadSeq.current) return; // درخواستِ جدیدتری در راهه
    setEntries(list.filter((e) => sleepMinutes(e) > 0));
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    getWakeSleepTimes().then((t) => { if (t) setTarget(t); }).catch(() => {});
  }, [load]);
  useLiveRefresh(["sleep"], () => { load(); });

  const byDate = useMemo(() => {
    const m = new Map<string, SleepRecord>();
    entries.forEach((e) => m.set(e.date, e));
    return m;
  }, [entries]);

  // پرکردنِ فرم: رکوردِ همون روز اگه هست، وگرنه ساعت‌های هدفِ کاربر.
  // فقط وقتی روز عوض می‌شه (یا بارِ اول که داده اومد) — تایپِ کاربر رو پاک نمی‌کنه.
  useEffect(() => {
    if (!loaded) return;
    const rec = byDate.get(date);
    if (prefilledFor.current === date) {
      // هدفِ کاربر دیرتر از داده رسید و شبِ بی‌رکورد دست‌نخورده‌ست: پیش‌فرض‌ها رو به‌روز کن
      if (!rec && !dirty.current && (bed !== target.sleep || wake !== target.wake)) {
        setBed(target.sleep); setWake(target.wake);
      }
      return;
    }
    prefilledFor.current = date;
    dirty.current = false;
    setBed(rec ? clockOf(rec.sleptAt) : target.sleep);
    setWake(rec ? clockOf(rec.wokeAt) : target.wake);
    setQuality(rec?.quality ? String(rec.quality) : null);
    setNote(rec?.note ?? "");
    setErr(null); setPurchase(false); setOkMsg(false); setConfirmDel(false);
  }, [loaded, date, byDate, target]); // eslint-disable-line react-hooks/exhaustive-deps

  const times = useMemo(() => buildSleepTimes(date, bed, wake), [date, bed, wake]);
  const previewMin = times ? Math.round((times.wokeAt.getTime() - times.sleptAt.getTime()) / 60000) : null;
  const previewOk = previewMin != null && previewMin >= SLEEP_MIN_MIN && previewMin <= SLEEP_MAX_MIN;
  const existing = byDate.get(date);

  const minDate = isoLocal(addDays(parseIso(todayIso), -(DAYS_BACK - 1)));
  const pickDate = (iso: string) => {
    if (iso > todayIso || iso < minDate || iso === date) return;
    prefilledFor.current = null;
    setDate(iso);
  };
  const shift = (n: number) => pickDate(isoLocal(addDays(parseIso(date), n)));

  async function onSave() {
    if (busy.current) return;
    if (!times || !previewOk) { setErr("ساعت‌ها را درست وارد کن (خوابِ 30 دقیقه تا 20 ساعت)"); return; }
    busy.current = true;
    const forDate = date;
    setSaving(true); setErr(null); setPurchase(false); setOkMsg(false); setConfirmDel(false);
    try {
      await saveSleep({
        date: forDate,
        sleptAt: times.sleptAt.toISOString(),
        wokeAt: times.wokeAt.toISOString(),
        quality: quality ? Number(quality) : null,
        note: note.trim() ? note.trim().slice(0, 200) : null,
      });
      // اگه وسطِ ذخیره روز عوض شده، پیامِ موفقیت/خطا مالِ روزِ دیگه‌ست
      if (dateRef.current === forDate) { setOkMsg(true); dirty.current = false; }
      await load();
    } catch (e) {
      if (dateRef.current === forDate) {
        if (e instanceof SleepSaveError && e.status === 403) setPurchase(true);
        else setErr(e instanceof Error ? e.message : "ذخیره نشد");
      }
    } finally { busy.current = false; setSaving(false); }
  }

  async function onDelete() {
    if (busy.current) return;
    if (!confirmDel) { setConfirmDel(true); return; }
    busy.current = true;
    const forDate = date;
    setSaving(true); setErr(null); setPurchase(false); setOkMsg(false);
    try {
      await deleteSleep(forDate);
      if (dateRef.current === forDate) { prefilledFor.current = null; setConfirmDel(false); }
      await load();
    } catch (e) {
      if (dateRef.current === forDate) {
        if (e instanceof SleepSaveError && e.status === 403) setPurchase(true);
        else setErr(e instanceof Error ? e.message : "حذف نشد");
      }
    } finally { busy.current = false; setSaving(false); }
  }

  const n = Number(range);
  const fromRange = isoLocal(addDays(parseIso(todayIso), -(n - 1)));
  const summary = useMemo(() => summarizeSleep(entries.filter((e) => e.date >= fromRange)), [entries, fromRange]);

  const dateLabel = date === todayIso ? "امروز" : date === isoLocal(addDays(parseIso(todayIso), -1)) ? "دیروز" : FA_WEEKDAY[parseIso(date).getDay()];

  return (
    <section className="sleep-page bodybuilding-glass">
      <div className="trade-head-row" style={{ justifyContent: "flex-start" }}>
        <span className="page-title-icon">{ICONS.sleep}</span>
        <h1>خواب</h1>
      </div>

      <div className="sl-stack">
        {/* ثبت */}
        <div className="sl-card" ref={formRef}>
          <h2 className="sl-card-title">ثبتِ خوابِ دیشب</h2>
          <div className="sl-date-nav">
            <button type="button" className="account-outline-btn mentor-btn" onClick={() => shift(-1)} disabled={date <= minDate} aria-label="روزِ قبل">›</button>
            <div className="sl-date-label">
              {jalaliLabel(date)}
              <small>{dateLabel} · روزِ بیدارشدن</small>
            </div>
            <button type="button" className="account-outline-btn mentor-btn" onClick={() => shift(1)} disabled={date >= todayIso} aria-label="روزِ بعد">‹</button>
          </div>

          <div className="sl-fields">
            <div className="sl-field">
              <label>ساعتِ خواب</label>
              <TimeInput value={bed} onChange={(v) => { dirty.current = true; setBed(v); }} className="wsearch-newform-name" />
            </div>
            <div className="sl-field">
              <label>ساعتِ بیداری</label>
              <TimeInput value={wake} onChange={(v) => { dirty.current = true; setWake(v); }} className="wsearch-newform-name" />
            </div>
          </div>

          <div className={`sl-preview${previewOk && previewMin != null ? ` is-${goalTone(previewMin)}` : ""}`} aria-live="polite">
            <span className="sl-sub">مدتِ خواب</span>
            <b>{previewOk && previewMin != null ? durationLabel(previewMin) : "—"}</b>
          </div>
          {bed.length === 5 && wake.length === 5 && !previewOk && (
            <div className="sl-sub">مدتِ خواب باید بینِ 30 دقیقه تا 20 ساعت باشد؛ ساعت‌ها را بررسی کن.</div>
          )}

          <div className="sl-field">
            <label>کیفیتِ خواب (اختیاری)</label>
            <SegmentedTabs
              ariaLabel="کیفیتِ خواب"
              active={quality ?? "0"}
              onChange={(v) => { dirty.current = true; setQuality(v === "0" ? null : v); }}
              options={[{ value: "0", label: "—" }, ...[1, 2, 3, 4, 5].map((q) => ({ value: String(q), label: String(q) }))]}
            />
          </div>

          <div className="sl-field full">
            <label>یادداشت (اختیاری)</label>
            <textarea className="wsearch-newform-name" maxLength={200} value={note} onChange={(e) => { dirty.current = true; setNote(e.target.value); }} placeholder="مثلا: دیر خوابیدم، قهوه‌ی عصر" />
            <div className="sl-count">{note.length}/200</div>
          </div>

          {purchase && (
            <div className="sl-err">
              دوره‌ی آزمایشیِ «روتین من» تمام شده و برای ثبتِ خواب اشتراک لازمه. <Link href={BUY_HREF} prefetch={false}>خرید اشتراک</Link>
            </div>
          )}
          {err && <div className="sl-err">{err}</div>}
          {okMsg && <div className="sl-ok">ذخیره شد</div>}

          <div className="sl-actions">
            <button type="button" className="trade-primary-btn" onClick={onSave} disabled={saving || !previewOk}>
              {saving ? <Loader2 size={16} className="trade-spin" /> : existing ? "ویرایش" : "ذخیره"}
            </button>
            {existing && (
              <button type="button" className="account-outline-btn mentor-btn" onClick={onDelete} disabled={saving}>
                {confirmDel ? "مطمئنی؟ دوباره بزن" : "حذف این شب"}
              </button>
            )}
          </div>
        </div>

        {loaded && entries.length === 0 ? (
          <div className="sl-card sl-empty">
            <span>{ICONS.sleep}</span>
            <div className="sl-card-title" style={{ justifyContent: "center" }}>هنوز خوابی ثبت نکردی</div>
            <div className="sl-sub">اولین شبت را بالا ثبت کن تا آمار و نمودار ساخته شود.</div>
          </div>
        ) : loaded ? (
          <>
            {/* آمار */}
            <div className="sl-card">
              <div className="sl-head-row">
                <h2 className="sl-card-title">آمارِ خواب</h2>
                <SegmentedTabs
                  className="sl-range-tabs"
                  ariaLabel="بازه‌ی آمار"
                  active={range}
                  onChange={setRange}
                  options={[{ value: "14", label: "14 شب" }, { value: "30", label: "30 شب" }]}
                />
              </div>
              {summary.nights === 0 ? (
                <div className="sl-sub">در این بازه خوابی ثبت نشده.</div>
              ) : (
                <div className="sl-stats">
                  <Stat k="میانگینِ مدت" v={summary.avgMin != null ? durationLabel(summary.avgMin) : "—"} />
                  <Stat k="میانگینِ ساعتِ خواب" v={summary.avgBed ?? "—"} ltr />
                  <Stat k="میانگینِ ساعتِ بیداری" v={summary.avgWake ?? "—"} ltr />
                  <Stat k="شب‌های 7 تا 9 ساعت" v={`${faNum(summary.goalPct ?? 0)}%`} ltr />
                  <div className="sl-stat ring">
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span>ثباتِ خواب</span>
                      <b style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>از 100</b>
                    </div>
                    <GradientRing value={(summary.consistency ?? 0) / 100} size={60} stroke={6} grad={["var(--sl-ring-a)", "var(--sl-ring-b)"]}>
                      <span className="sl-ring-num">{faNum(summary.consistency ?? 0)}</span>
                    </GradientRing>
                  </div>
                  <Stat k="بدهیِ خواب (نسبت به 8 ساعت)" v={summary.debtMin ? durationLabel(summary.debtMin) : "بدون بدهی"} />
                </div>
              )}
              <div className="sl-sub">هدفِ تو: خواب {target.sleep} و بیداری {target.wake}</div>
            </div>

            {/* نمودار */}
            <SleepChart byDate={byDate} todayIso={todayIso} selected={date} onPick={(iso) => { pickDate(iso); formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) {
  return (
    <div className="sl-stat">
      <span>{k}</span>
      <b style={ltr ? { direction: "ltr", textAlign: "start" } : undefined}>{v}</b>
    </div>
  );
}

// ── نمودار: میله‌ی مدتِ خواب + نوارِ زمانی «خواب→بیداری» ─────────────────
const COL = 40;
const W = COL * DAYS_BACK;
const DUR_H = 150;
const TL_H = 130;
const AXIS_START = 20 * 60; // 20:00
const AXIS_SPAN = 16 * 60; // تا 12:00 ظهر

function SleepChart({ byDate, todayIso, selected, onPick }: { byDate: Map<string, SleepRecord>; todayIso: string; selected: string; onPick: (iso: string) => void }) {
  const days = useMemo(() => {
    const t = parseIso(todayIso);
    return Array.from({ length: DAYS_BACK }, (_, i) => {
      const d = addDays(t, -(DAYS_BACK - 1 - i));
      const iso = isoLocal(d);
      const [, , jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return { iso, jd, wd: FA_WEEKDAY_SHORT[d.getDay()], rec: byDate.get(iso) ?? null };
    });
  }, [byDate, todayIso]);

  const maxMin = Math.max(10 * 60, ...days.map((d) => (d.rec ? sleepMinutes(d.rec) : 0)));
  const scale = (DUR_H - 14) / maxMin;
  const y = (m: number) => DUR_H - m * scale;
  const top = 6;
  const labelY = DUR_H + 14;
  const tlTop = DUR_H + 40;
  const tlScale = TL_H / AXIS_SPAN;
  const totalH = tlTop + TL_H + 6;
  const selRec = byDate.get(selected);

  return (
    <div className="sl-card">
      <h2 className="sl-card-title">{DAYS_BACK} شبِ اخیر</h2>
      <div className="sl-chart-wrap">
        <svg className="sl-chart" viewBox={`0 0 ${W} ${totalH}`} role="img" aria-label="نمودارِ مدتِ خواب در 14 شبِ اخیر">
          <rect className="sl-band" x={0} y={y(SLEEP_GOAL_MAX)} width={W} height={(SLEEP_GOAL_MAX - SLEEP_GOAL_MIN) * scale} />
          <line className="sl-band-line" x1={0} x2={W} y1={y(SLEEP_GOAL_MAX)} y2={y(SLEEP_GOAL_MAX)} />
          <line className="sl-band-line" x1={0} x2={W} y1={y(SLEEP_GOAL_MIN)} y2={y(SLEEP_GOAL_MIN)} />
          <line className="sl-grid" x1={0} x2={W} y1={DUR_H} y2={DUR_H} />
          <text x={2} y={y(SLEEP_GOAL_MAX) - 3}>9h</text>
          <text x={2} y={y(SLEEP_GOAL_MIN) + 10}>7h</text>

          {days.map((d, i) => {
            const cx = i * COL + COL / 2;
            const min = d.rec ? sleepMinutes(d.rec) : 0;
            const tone = goalTone(min);
            const h = Math.max(0, min * scale);
            const isSel = d.iso === selected;
            return (
              <g
                key={d.iso}
                className={`sl-col${isSel ? " is-sel" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${jalaliLabel(d.iso)}${d.rec ? ` ${durationLabel(min)}` : " ثبت نشده"}`}
                onClick={() => onPick(d.iso)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(d.iso); } }}
              >
                <rect className="sl-hit" x={i * COL + 2} y={top - 4} width={COL - 4} height={totalH - top} />
                {d.rec && (
                  <motion.rect
                    x={cx - 11} y={DUR_H - h} width={22} height={h} rx={6}
                    style={{ fill: toneColor(tone), transformBox: "fill-box", transformOrigin: "bottom" }}
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, ease: D_EASE as any, delay: i * 0.03 }}
                  />
                )}
                {d.rec?.quality ? <text x={cx} y={DUR_H - h - 4} textAnchor="middle" style={{ fontSize: 9 }}>{d.rec.quality}</text> : null}
                <text x={cx} y={labelY} textAnchor="middle" style={isSel ? { fill: "var(--accent)", fontWeight: 700 } : undefined}>{faNum(d.jd)}</text>
                <text x={cx} y={labelY + 11} textAnchor="middle" style={{ fontSize: 8.5 }}>{d.wd}</text>

                {d.rec && (() => {
                  const bedMin = new Date(d.rec.sleptAt).getHours() * 60 + new Date(d.rec.sleptAt).getMinutes();
                  const { from, to } = timelineSpan(bedMin, min, AXIS_START, AXIS_SPAN);
                  return (
                    <rect
                      x={cx - 5} y={tlTop + from * tlScale} width={10} height={Math.max(3, (to - from) * tlScale)} rx={5}
                      style={{ fill: toneColor(tone), opacity: 0.85 }}
                    />
                  );
                })()}
              </g>
            );
          })}

          <text x={2} y={tlTop - 6}>خواب→بیداری</text>
          {[20, 0, 6, 12].map((h) => {
            const yy = tlTop + (((h * 60 - AXIS_START + 1440) % 1440)) * tlScale;
            return (
              <g key={h}>
                <line className="sl-grid" x1={0} x2={W} y1={yy} y2={yy} style={{ opacity: 0.5 }} />
                <text x={W - 2} y={yy - 2} textAnchor="end">{String(h).padStart(2, "0")}:00</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="sl-legend">
        <span><i style={{ background: "var(--sl-good-a)" }} />7 تا 9 ساعت</span>
        <span><i style={{ background: "var(--sl-low)" }} />کمتر</span>
        <span><i style={{ background: "var(--sl-high)" }} />بیشتر</span>
      </div>
      <div className="sl-sub">
        {selRec
          ? `${jalaliLabel(selected)}: ${clockOf(selRec.sleptAt)} تا ${clockOf(selRec.wokeAt)} (${durationLabel(sleepMinutes(selRec))}) — برای ویرایش یا حذف، فرمِ بالا را ببین.`
          : "روی هر میله بزن تا همان شب را ثبت یا ویرایش کنی."}
      </div>
    </div>
  );
}
