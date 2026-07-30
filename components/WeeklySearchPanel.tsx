"use client";

import { useMemo, useState } from "react";
import { WEEK_ORDER, tasksForDate } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { timeStartMinutes } from "@/lib/schedule";
import { findScheduleConflict, rangesOverlap } from "@/lib/conflict";
import { showConflictAlert } from "@/lib/conflictAlertBus";
import { TimeInput } from "./TimeInput";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { formatJalali, JalaliDate, isoLocal, jalaliToGregorianApprox } from "@/lib/jalali";
import { CustomOccurrence, setCustomOccurrences, setRemovedOccurrences } from "@/lib/storage";
import { LiquidBlobLayers } from "./LiquidBlobBox";

const now = new Date();

type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: CustomOccurrence[] };
type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean };

function buildWeeklyGroups(opts: ScheduleOpts) {
  const map: Record<string, { name: string; occ: Occ[] }> = {};
  const list: { name: string; occ: Occ[] }[] = [];
  WEEK_ORDER.forEach((o) => {
    const d = new Date(now);
    d.setDate(now.getDate() + (o.jsDay - now.getDay()));
    const items = tasksForDate(d, opts);
    items.forEach((t) => {
      if (!map[t.name]) { map[t.name] = { name: t.name, occ: [] }; list.push(map[t.name]); }
      map[t.name].occ.push({ dayName: o.name, jsDay: o.jsDay, time: t.time, id: t.id, custom: !!t.custom });
    });
  });
  return list;
}

type NewRow = { jsDays: number[]; start: string; end: string };

export function WeeklySearchPanel({
  scheduleOpts,
  onClose,
  onChanged,
  onOpenProgram,
}: {
  scheduleOpts: ScheduleOpts;
  onClose: () => void;
  onChanged: () => void;
  onOpenProgram: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [pendingRemoved, setPendingRemoved] = useState<Set<string>>(new Set());
  const [pendingCustomRemoved, setPendingCustomRemoved] = useState<Set<string>>(new Set());

  const [name, setName] = useState("");
  const [startJalali, setStartJalali] = useState<JalaliDate | null>(null);
  const [endJalali, setEndJalali] = useState<JalaliDate | null>(null);
  const [pickerFor, setPickerFor] = useState<"start" | "end" | null>(null);
  const [rows, setRows] = useState<NewRow[]>([{ jsDays: [WEEK_ORDER[0].jsDay], start: "", end: "" }]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [nameError, setNameError] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, { start?: boolean; end?: boolean }>>({});

  // اثر آنی حذف‌های در حال انتظار روی گروه‌ها، پیش از تایید نهایی
  const effectiveOpts: ScheduleOpts = useMemo(() => {
    const nextRemoved = new Set(scheduleOpts.removedOccurrences);
    pendingRemoved.forEach((k) => nextRemoved.add(k));
    const nextCustom = scheduleOpts.customOccurrences.filter((c) => !pendingCustomRemoved.has(c.id));
    return { removedOccurrences: nextRemoved, customOccurrences: nextCustom };
  }, [scheduleOpts, pendingRemoved, pendingCustomRemoved]);

  const groups = useMemo(() => {
    const all = buildWeeklyGroups(effectiveOpts);
    const q = query.trim();
    return q ? all.filter((g) => g.name.indexOf(q) !== -1) : all;
  }, [effectiveOpts, query]);

  function closePanel() {
    // اگه حذف‌گروهی نیمه‌کاره بود، لغوش کن (چیزی هنوز persist نشده)
    setPendingRemoved(new Set());
    setPendingCustomRemoved(new Set());
    setDeleteMode(false);
    setAddOpen(false);
    onClose();
  }

  function markGroupPendingDelete(g: { name: string; occ: Occ[] }) {
    const nextRemoved = new Set(pendingRemoved);
    const nextCustom = new Set(pendingCustomRemoved);
    g.occ.forEach((o) => {
      if (o.custom) nextCustom.add(o.id);
      else nextRemoved.add(o.id + "|" + o.jsDay);
    });
    setPendingRemoved(nextRemoved);
    setPendingCustomRemoved(nextCustom);
    if (navigator.vibrate) navigator.vibrate(15);
  }

  async function confirmDelete() {
    await setRemovedOccurrences(Array.from(new Set([...scheduleOpts.removedOccurrences, ...pendingRemoved])));
    await setCustomOccurrences(scheduleOpts.customOccurrences.filter((c) => !pendingCustomRemoved.has(c.id)));
    setPendingRemoved(new Set());
    setPendingCustomRemoved(new Set());
    setDeleteMode(false);
    onChanged();
  }

  function cancelDelete() {
    setPendingRemoved(new Set());
    setPendingCustomRemoved(new Set());
    setDeleteMode(false);
  }

  function addRow() {
    setRows((r) => [...r, { jsDays: [WEEK_ORDER[0].jsDay], start: "", end: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, patch: Partial<NewRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  // چند روز آزادانه توی همین یک ردیف — دیگه لازم نیست برای هر روز یک ردیف
  // جدا (با ساعت شروع/پایان تکراری) بسازی؛ فقط برای بازه‌ی زمانیِ متفاوت لازمه.
  function toggleRowDay(i: number, jsDay: number) {
    setRows((r) => r.map((row, idx) => {
      if (idx !== i) return row;
      const has = row.jsDays.includes(jsDay);
      if (has && row.jsDays.length === 1) return row;
      return { ...row, jsDays: has ? row.jsDays.filter((d) => d !== jsDay) : [...row.jsDays, jsDay] };
    }));
  }

  async function submitNew() {
    if (status !== "idle") return;
    let hasError = false;
    const nErr = !name.trim();
    setNameError(nErr);
    if (nErr) hasError = true;

    const rErrs: typeof rowErrors = {};
    rows.forEach((r, i) => {
      const e: { start?: boolean; end?: boolean } = {};
      if (!r.start.trim()) { e.start = true; hasError = true; }
      if (!r.end.trim()) { e.end = true; hasError = true; }
      if (e.start || e.end) rErrs[i] = e;
    });
    setRowErrors(rErrs);
    if (hasError) return;

    // هر ردیف حالا چند روز می‌تونه داشته باشه — قبل از چک تداخل، صاف‌شون می‌کنیم
    // به یک ورودیِ جدا به‌ازای هر روز (با همون ساعت شروع/پایانِ مشترکِ ردیف).
    const perDay = rows.flatMap((r) => r.jsDays.map((jsDay) => ({ jsDay, start: r.start, end: r.end })));

    const normalizedRows: { jsDay: number; start: string; end: string; startMin: number | null; endMin: number | null }[] = [];
    let conflictMsg: string | null = null;
    for (const r of perDay) {
      const startFa = normalizeTimeToFa(r.start);
      const endFa = normalizeTimeToFa(r.end);
      const startMin = timeStartMinutes(startFa);
      const endMin = timeStartMinutes(endFa);

      let conflict = findScheduleConflict(r.jsDay, startMin, endMin, now, effectiveOpts);
      if (!conflict) {
        for (const other of normalizedRows) {
          if (other.jsDay === r.jsDay && rangesOverlap(startMin!, endMin, other.startMin!, other.endMin)) {
            conflict = { id: "self", name } as any;
            break;
          }
        }
      }
      if (conflict) { conflictMsg = `تداخل زمانی با «${conflict.name}» — این برنامه اضافه نشد`; break; }
      normalizedRows.push({ jsDay: r.jsDay, start: startFa, end: endFa, startMin, endMin });
    }

    setStatus("loading");
    setTimeout(async () => {
      if (conflictMsg) {
        setStatus("error");
        showConflictAlert(conflictMsg!);
        setTimeout(() => setStatus("idle"), 900);
        return;
      }
      setStatus("success");
      if (navigator.vibrate) navigator.vibrate(15);

      const additions: CustomOccurrence[] = normalizedRows.map((r) => ({
        id: "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name,
        jsDay: r.jsDay,
        time: r.end ? `${r.start} – ${r.end}` : r.start,
      }));
      await setCustomOccurrences([...scheduleOpts.customOccurrences, ...additions]);

      setTimeout(() => {
        setAddOpen(false);
        setName(""); setStartJalali(null); setEndJalali(null);
        setRows([{ jsDays: [WEEK_ORDER[0].jsDay], start: "", end: "" }]);
        setStatus("idle");
        onChanged();
      }, 480);
    }, 550);
  }

  return (
    <>
      <div className="modal-overlay open" onClick={closePanel} />
      <div className="wsearch-panel open">
        <div className="modal-head">
          <div className="modal-title">جستجو در برنامه هفتگی</div>
          <button className="nav-close" onClick={closePanel} aria-label="بستن">×</button>
        </div>

        <div className="wsearch-input-wrap">
          <svg className="wsearch-input-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="var(--muted2)" strokeWidth="1.7" />
            <path d="M20 20l-3.2-3.2" stroke="var(--muted2)" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="wsearch-input"
            placeholder="نام برنامه را جستجو کنید…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="wsearch-list">
          {groups.length ? (
            <div className={`wsearch-grid${deleteMode ? " delete-mode" : ""}`}>
              {groups.map((g, i) => (
                <div
                  key={g.name}
                  className="wsearch-box"
                  onClick={() => { deleteMode ? markGroupPendingDelete(g) : onOpenProgram(g.name); }}
                >
                  <LiquidBlobLayers />
                  <span className="wbox-label">{g.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="item-line empty">موردی پیدا نشد</div>
          )}
        </div>

        {addOpen && (
          <div>
            <div className="wsearch-newform-overlay open" onClick={() => setAddOpen(false)} />
            <div className="wsearch-newform open">
              <div className="wsearch-newform-head">
                <div className="wsearch-newform-title accent">افزودن برنامه جدید</div>
                <button className="nav-close" onClick={() => setAddOpen(false)} aria-label="بستن">×</button>
              </div>

              <label htmlFor="wsearchNewName">اسم درس</label>
              <div className={`name-field-wrap${nameError ? " field-error" : ""}`}>
                <input
                  id="wsearchNewName"
                  type="text"
                  className="wsearch-newform-name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                />
              </div>

              <div className="wsearch-date-row">
                <div className="time-field">
                  <span className="time-field-label">تاریخ شروع دوره</span>
                  <button type="button" className={`jdate-btn${startJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("start")}>
                    {startJalali ? formatJalali(startJalali) : "روز / ماه / سال"}
                  </button>
                </div>
                <div className="time-field">
                  <span className="time-field-label">تاریخ پایان دوره</span>
                  <button type="button" className={`jdate-btn${endJalali ? "" : " placeholder"}`} onClick={() => setPickerFor("end")}>
                    {endJalali ? formatJalali(endJalali) : "روز / ماه / سال"}
                  </button>
                </div>
              </div>

              {rows.map((r, ri) => (
                <div key={ri} className="wsearch-newrow">
                  {rows.length > 1 && (
                    <div className="wsearch-newrow-remove-wrap">
                      <button type="button" className="wsearch-newrow-remove" onClick={() => removeRow(ri)} aria-label="حذف این ردیف">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="#E05252" strokeWidth="2.4" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                  )}
                  <div className="day-picker wsearch-newrow-day">
                    {WEEK_ORDER.map((o) => (
                      <span
                        key={o.jsDay}
                        className={`day-pill${r.jsDays.includes(o.jsDay) ? " on" : ""}`}
                        onClick={() => toggleRowDay(ri, o.jsDay)}
                      >
                        {o.short}
                      </span>
                    ))}
                  </div>
                  <div className={`time-field${rowErrors[ri]?.start ? " field-error" : ""}`}>
                    <span className="time-field-label">ساعت شروع</span>
                    <div className="field-error-wrap">
                      <TimeInput value={r.start} onChange={(v) => updateRow(ri, { start: v })} />
                    </div>
                  </div>
                  <div className={`time-field${rowErrors[ri]?.end ? " field-error" : ""}`}>
                    <span className="time-field-label">ساعت پایان</span>
                    <div className="field-error-wrap">
                      <TimeInput value={r.end} onChange={(v) => updateRow(ri, { end: v })} />
                    </div>
                  </div>
                </div>
              ))}

              <div className="wsearch-newform-addrow">
                <button type="button" className="wsearch-add-btn" onClick={addRow} aria-label="افزودن بازه‌ی زمانی دیگر">+</button>
              </div>

              <div className="wsearch-newform-actions">
                <button
                  type="button"
                  className={`wsearch-newform-submit${status !== "idle" ? " " + status : ""}`}
                  onClick={submitNew}
                  aria-label="ثبت"
                >
                  <span className="wns-spinner" />
                  <svg className="wns-check" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <svg className="wns-x" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="wsearch-footer">
          {deleteMode ? (
            <div className="wsearch-delete-actions">
              <button type="button" className="wsearch-cancel-btn" onClick={cancelDelete} aria-label="لغو تغییرات">
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" className="wsearch-confirm-btn" onClick={confirmDelete} aria-label="ثبت">
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          ) : (
            <div className="wsearch-fab-wrap">
              <div className={`wsearch-fab-menu${fabOpen ? " open" : ""}`}>
                <div className="wsearch-fab-option" onClick={() => { setFabOpen(false); setAddOpen(true); }}>
                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  <span>افزودن درس جدید</span>
                </div>
                <div className="wsearch-fab-option danger" onClick={() => { setFabOpen(false); setDeleteMode(true); }}>
                  <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span>حذف درس‌های موجود</span>
                </div>
              </div>
              <button className={`wsearch-newbtn${fabOpen ? " active" : ""}`} onClick={() => setFabOpen((o) => !o)} aria-label="ویرایش برنامه">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {pickerFor && (
        <JalaliDatePicker
          initial={pickerFor === "start" ? startJalali : endJalali}
          onClose={() => setPickerFor(null)}
          onPick={(d) => {
            if (pickerFor === "start") { setStartJalali(d); setPickerFor("end"); }
            else { setEndJalali(d); setPickerFor(null); }
          }}
        />
      )}
    </>
  );
}
