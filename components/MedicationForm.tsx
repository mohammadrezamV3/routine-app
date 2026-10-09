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
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

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
  // طبق درخواست صریح، هر خطا زیر همون فیلدش نشان داده می‌شه (نه یک پیام
  // کلی مشترک ته فرم) — تا مشخص باشه دقیقا کدوم مقدار مشکل داره.
  const [nameError, setNameError] = useState<string | null>(null);
  const [timesError, setTimesError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  function clearErrors() {
    setNameError(null); setTimesError(null); setDurationError(null); setTimeError(null); setSaveError(null);
  }

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
    clearErrors();

    const trimmed = name.trim();
    if (!trimmed) { setNameError(tr("اسم دارو رو وارد کن", "Enter the medication name")); return; }

    const times = Number(timesPerDay);
    if (!Number.isFinite(times) || times < MIN_TIMES_PER_DAY || times > MAX_TIMES_PER_DAY) {
      setTimesError(tr(`تعداد دفعات در روز باید بین ${MIN_TIMES_PER_DAY} تا ${MAX_TIMES_PER_DAY} باشه`, `Doses per day must be between ${MIN_TIMES_PER_DAY} and ${MAX_TIMES_PER_DAY}`));
      return;
    }
    const time = toEnDigits(firstDoseTime).trim();
    if (!/^\d{1,2}:\d{2}$/.test(time)) { setTimeError(tr("ساعت اولین نوبت رو کامل وارد کن", "Enter the full time of the first dose")); return; }

    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 1 || days > MAX_DURATION_DAYS) {
      setDurationError(tr(`طول دوره باید بین 1 تا ${MAX_DURATION_DAYS} روز باشه`, `Course length must be between 1 and ${MAX_DURATION_DAYS} days`));
      return;
    }

    setStatus("loading");
    const [gy, gm, gd] = [startJalali[0], startJalali[1], startJalali[2]];
    const startDate = isoLocal(jalaliToGregorianApprox(gy, gm, gd));

    // قبلا onSave بدون try/catch صدا زده می‌شد: اگر ذخیره واقعا شکست
    // می‌خورد (شبکه/سرور)، این تابع throw می‌کرد و setStatus("success")
    // هیچ‌وقت اجرا نمی‌شد — دکمه برای همیشه روی «در حال ثبت…» قفل می‌ماند،
    // بدون هیچ پیامی که بگوید مشکل چیست.
    try {
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
    } catch (err) {
      setStatus("idle");
      setSaveError(err instanceof Error ? err.message : tr("ثبت دارو ناموفق بود — دوباره امتحان کن", "Couldn't save the medication — please try again"));
      return;
    }
    setStatus("success");
    setTimeout(onClose, 350);
  }

  return (
    <>
      <div className="wsearch-newform-overlay strong-blur open" onClick={onClose} />
      <div className="wsearch-newform dash-scope open">
        <div className="relative z-[1] add-program-glass" ref={formRef} onKeyDown={(e) => focusNextOnEnter(e, formRef)}>
          <div className="wsearch-newform-head">
            <div className="wsearch-newform-title accent">{initial ? tr("ویرایش دارو", "Edit medication") : tr("افزودن دارو", "Add medication")}</div>
            <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
          </div>

          <label htmlFor="medName">{tr("اسم دارو", "Medication name")}</label>
          <input
            id="medName"
            type="text"
            className="wsearch-newform-name"
            placeholder={tr("مثلا آموکسی‌سیلین", "e.g. Amoxicillin")}
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(null); }}
          />
          {nameError && <div className="field-error-msg" style={{ display: "block", marginTop: 4 }}>{nameError}</div>}

          <label style={{ marginTop: 14, display: "block" }}>{tr("چند بار در روز؟", "How many times a day?")}</label>
          <SegmentedTabs
            active={timesPerDay}
            onChange={(v) => { setTimesPerDay(v); setTimesError(null); }}
            options={["1", "2", "3", "4", "6"].map((n) => ({ value: n, label: tr(`${n} بار`, `${n}x`) }))}
          />
          {timesError && <div className="field-error-msg" style={{ display: "block", marginTop: 4 }}>{timesError}</div>}

          <div className="wsearch-date-row" style={{ marginTop: 14 }}>
            <div className="time-field">
              <span className="time-field-label">{tr("ساعت اولین نوبت", "First dose time")}</span>
              <TimeInput value={firstDoseTime} onChange={(v) => { setFirstDoseTime(v); setTimeError(null); }} />
              {timeError && <div className="field-error-msg" style={{ display: "block", marginTop: 4 }}>{timeError}</div>}
            </div>
            <div className="time-field">
              <span className="time-field-label">{tr("طول دوره (روز)", "Course length (days)")}</span>
              <NumberInput
                className="wsearch-add-time"
                value={durationDays}
                onChange={(v) => { setDurationDays(v); setDurationError(null); }}
                placeholder="7"
              />
              {durationError && <div className="field-error-msg" style={{ display: "block", marginTop: 4 }}>{durationError}</div>}
            </div>
          </div>

          <div className="time-field" style={{ marginTop: 14 }}>
            <span className="time-field-label">{tr("تاریخ شروع دوره", "Course start date")}</span>
            <button type="button" className="jdate-btn" onClick={() => setPickerOpen(true)}>
              {formatJalali(startJalali)}
            </button>
          </div>

          <label htmlFor="medNote" style={{ marginTop: 14, display: "block" }}>{tr("یادداشت (اختیاری)", "Note (optional)")}</label>
          <input
            id="medNote"
            type="text"
            className="wsearch-newform-name"
            placeholder={tr("بعد از غذا، با آب زیاد…", "After meals, with plenty of water…")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="med-preview">
            <span className="med-preview-label">
              {tr(`هر ${intervalHours % 1 === 0 ? intervalHours : intervalHours.toFixed(1)} ساعت یک‌بار`, `Every ${intervalHours % 1 === 0 ? intervalHours : intervalHours.toFixed(1)} hours`)}
            </span>
            <span className="med-preview-times mono" dir="ltr">{doseTimes.join(" · ")}</span>
          </div>

          {saveError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{saveError}</div>}

          <div className="wsearch-newform-actions">
            <button type="button" className="wsearch-submit-btn" onClick={submit} disabled={status !== "idle"}>
              {status === "loading" ? (
                <Spinner size={15} />
              ) : status === "success" ? tr("ثبت شد", "Saved") : initial ? tr("ذخیره تغییرات", "Save changes") : tr("ثبت دارو", "Save medication")}
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <JalaliDatePicker
          initial={startJalali}
          title={tr("تاریخ شروع دوره", "Course start date")}
          onClose={() => setPickerOpen(false)}
          onPick={(d) => { setStartJalali(d); setPickerOpen(false); }}
        />
      )}
    </>
  );
}
