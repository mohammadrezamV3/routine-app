"use client";

import { useRef, useState } from "react";
import { formatJalali, isoLocal, jalaliToGregorianApprox, toJalali, JalaliDate } from "@/lib/jalali";
import { toEnDigits } from "@/lib/schedule";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { NumberInput } from "./NumberInput";
import { TimeInput } from "./TimeInput";
import { SegmentedTabs } from "./SegmentedTabs";
import {
  Medication, MAX_DURATION_DAYS, MAX_TIMES_PER_DAY, MIN_TIMES_PER_DAY,
  doseIntervalHours, doseMinutesOfDay, minutesToDoseTime, newMedicationId,
} from "@/lib/medications";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { focusNextOnEnter } from "@/lib/formNav";

const now = new Date();

function isoToJalali(iso: string): JalaliDate {
  const [y, m, d] = iso.split("-").map(Number);
  return toJalali(y, m, d);
}

// فرم افزودن/ویرایش یک دارو. همون فرمه برای هر دو حالت — با `initial` پر
// می‌شه و تیترش عوض می‌شه، چون فیلدهاشون دقیقا یکی‌ان.
export function MedicationForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Medication | null;
  onClose: () => void;
  onSave: (med: Medication) => Promise<void> | void;
}) {
  useLockBodyScroll();
  const formRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [timesPerDay, setTimesPerDay] = useState(String(initial?.timesPerDay ?? 3));
  const [firstDoseTime, setFirstDoseTime] = useState(initial?.firstDoseTime ?? "08:00");
  const [durationDays, setDurationDays] = useState(String(initial?.durationDays ?? 7));
  const [note, setNote] = useState(initial?.note ?? "");
  const [startJalali, setStartJalali] = useState<JalaliDate>(() =>
    initial ? isoToJalali(initial.startDate) : toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate())
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  // پیش‌نمایش زنده‌ی ساعت نوبت‌ها — کاربر همون‌جا می‌بینه «۴ بار در روز» با
  // شروع ۰۸:۰۰ دقیقا یعنی چه ساعت‌هایی، به‌جای اینکه بعد ثبت غافلگیر بشه.
  const previewMed: Medication = {
    id: "preview",
    name,
    timesPerDay: Number(timesPerDay) || 1,
    firstDoseTime: toEnDigits(firstDoseTime) || "08:00",
    startDate: isoLocal(now),
    durationDays: Number(durationDays) || 1,
  };
  const doseTimes = doseMinutesOfDay(previewMed).map(minutesToDoseTime);
  const intervalHours = doseIntervalHours(previewMed);

  async function submit() {
    if (status !== "idle") return;
    const trimmed = name.trim();
    if (!trimmed) { setError("اسم دارو رو وارد کن"); return; }

    const times = Number(timesPerDay);
    if (!Number.isFinite(times) || times < MIN_TIMES_PER_DAY || times > MAX_TIMES_PER_DAY) {
      setError(`تعداد دفعات در روز باید بین ${MIN_TIMES_PER_DAY} تا ${MAX_TIMES_PER_DAY} باشه`);
      return;
    }
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 1 || days > MAX_DURATION_DAYS) {
      setError(`طول دوره باید بین ۱ تا ${MAX_DURATION_DAYS} روز باشه`);
      return;
    }
    const time = toEnDigits(firstDoseTime).trim();
    if (!/^\d{1,2}:\d{2}$/.test(time)) { setError("ساعت اولین نوبت رو کامل وارد کن"); return; }

    setError(null);
    setStatus("loading");
    const [gy, gm, gd] = [startJalali[0], startJalali[1], startJalali[2]];
    const startDate = isoLocal(jalaliToGregorianApprox(gy, gm, gd));

    await onSave({
      id: initial?.id ?? newMedicationId(),
      name: trimmed,
      timesPerDay: Math.round(times),
      firstDoseTime: time,
      startDate,
      durationDays: Math.round(days),
      notify: initial?.notify ?? true,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setStatus("success");
    setTimeout(onClose, 350);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">{initial ? "ویرایش دارو" : "افزودن دارو"}</div>
            <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>

          <label htmlFor="medName">اسم دارو</label>
          <input
            id="medName"
            type="text"
            className="wsearch-newform-name"
            placeholder="مثلا آموکسی‌سیلین"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
          />

          <label style={{ marginTop: 14, display: "block" }}>چند بار در روز؟</label>
          <SegmentedTabs
            active={timesPerDay}
            onChange={(v) => setTimesPerDay(v)}
            options={["1", "2", "3", "4", "6"].map((n) => ({ value: n, label: `${n} بار` }))}
          />

          <div className="wsearch-date-row" style={{ marginTop: 14 }}>
            <div className="time-field">
              <span className="time-field-label">ساعت اولین نوبت</span>
              <TimeInput value={firstDoseTime} onChange={setFirstDoseTime} />
            </div>
            <div className="time-field">
              <span className="time-field-label">طول دوره (روز)</span>
              <NumberInput
                className="wsearch-add-time"
                value={durationDays}
                onChange={(v) => { setDurationDays(v); setError(null); }}
                placeholder="۷"
              />
            </div>
          </div>

          <div className="time-field" style={{ marginTop: 14 }}>
            <span className="time-field-label">تاریخ شروع دوره</span>
            <button type="button" className="jdate-btn" onClick={() => setPickerOpen(true)}>
              {formatJalali(startJalali)}
            </button>
          </div>

          <label htmlFor="medNote" style={{ marginTop: 14, display: "block" }}>یادداشت (اختیاری)</label>
          <input
            id="medNote"
            type="text"
            className="wsearch-newform-name"
            placeholder="بعد از غذا، با آب زیاد…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="med-preview">
            <span className="med-preview-label">
              هر {intervalHours % 1 === 0 ? intervalHours : intervalHours.toFixed(1)} ساعت یک‌بار
            </span>
            <span className="med-preview-times mono" dir="ltr">{doseTimes.join(" · ")}</span>
          </div>

          {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}

          <div className="wsearch-newform-actions">
            <button type="button" className="wsearch-submit-btn" onClick={submit} disabled={status !== "idle"}>
              {status === "loading" && <span className="wsearch-submit-spinner" />}
              {status === "loading" ? "در حال ثبت…" : status === "success" ? "ثبت شد" : initial ? "ذخیره تغییرات" : "ثبت دارو"}
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <JalaliDatePicker
          initial={startJalali}
          title="تاریخ شروع دوره"
          onClose={() => setPickerOpen(false)}
          onPick={(d) => { setStartJalali(d); setPickerOpen(false); }}
        />
      )}
    </>
  );
}
