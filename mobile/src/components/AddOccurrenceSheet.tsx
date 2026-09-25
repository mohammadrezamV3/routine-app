import { useState } from "react";
import BottomSheet from "./BottomSheet";
import WeekdayPicker from "./WeekdayPicker";
import TimeField from "./TimeField";
import SegmentedTabs from "./SegmentedTabs";
import JalaliDatePickerSheet from "./JalaliDatePickerSheet";
import { tapHaptic } from "@/lib/haptics";
import { isoLocal, formatJalali, toJalali } from "@/lib/jalali";
import { timeStartMinutes, jsDayOfIso, sameWeekIso, ScheduleOpts } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { findConflictOnDate, findScheduleConflict } from "@/lib/conflict";
import { CustomOccurrence, Importance, IMPORTANCE_LABELS, Occ } from "@/lib/occurrenceTypes";
import { datesForEditedOccurrence, datesForNewOccurrence, firstOccurrenceIso, OccurrenceDates } from "@/lib/occurrenceDates";
import { setCustomOccurrences, setRemovedOccurrences } from "@/db/repo";

function newOccId(): string {
  return "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

type PickerTarget = "once" | "periodStart" | "periodEnd" | null;
type Dates = OccurrenceDates;

// افزودن/ویرایشِ یک برنامه — پورت شده از AddProgramForm.tsx +
// EditOccurrenceForm.tsx وب (منطقِ conflict/startDate/endDate/دوره عینِ
// همون)، روی یک BottomSheتِ تک‌صفحه‌ای به‌جای فرمِ دومرحله‌ایِ گلسِ وب.
//
// سه حالتِ تاریخ (دقیقا مثلِ وب): هفتگی (بدونِ endDate، از امروز به بعد)،
// «فقط یک روز» (startDate=endDate=همون روز، تکرار نمی‌شه)، «دوره» (بازه‌ی
// startDate..endDate انتخاب‌شده، تکرار هفتگی فقط داخلِ همون بازه). isOnce و
// isPeriod دقیقا مثلِ وب باهم incompatible‌اند. در حالتِ ویرایش این دو
// چک‌باکس اصلا نشون داده نمی‌شن — دقیقا مثلِ EditOccurrenceForm وب، که
// periodic/one-off بودنِ برنامه‌ی موجود رو از رویِ startDate/endDate اصلی‌اش
// (orig) نگه می‌داره، نه این‌که هربار startDate رو به امروز ریست کنه.
export default function AddOccurrenceSheet({
  open,
  onClose,
  scheduleOpts,
  editing,
  defaultIso,
}: {
  open: boolean;
  onClose: () => void;
  scheduleOpts: ScheduleOpts;
  /** پر بودنش یعنی حالتِ ویرایش. */
  editing?: { occ: Occ; name: string } | null;
  /** روزی که کاربر از توش «افزودن» زده — پیش‌فرضِ حالتِ تک‌روزه. */
  defaultIso?: string;
}) {
  const isEdit = !!editing;
  const [name, setName] = useState(editing?.name ?? "");
  const [jsDays, setJsDays] = useState<number[]>(editing ? [editing.occ.jsDay] : [6]);
  const parts = editing ? String(editing.occ.time).split(/[–—-]/) : [];
  const [start, setStart] = useState(parts[0] ? toEn(parts[0].trim()) : "10:00");
  const [end, setEnd] = useState(parts[1] ? toEn(parts[1].trim()) : "11:00");
  const [isOnce, setIsOnce] = useState(false);
  const [onceIso, setOnceIso] = useState(defaultIso || isoLocal(new Date()));
  const [isPeriod, setIsPeriod] = useState(false);
  const [periodStartIso, setPeriodStartIso] = useState<string | null>(null);
  const [periodEndIso, setPeriodEndIso] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<PickerTarget>(null);
  const [importance, setImportance] = useState<Importance>(editing?.occ.importance ?? "medium");
  const [tag, setTag] = useState(editing?.occ.tag ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toEn(v: string) {
    // native <input type="time"> فقط ارقامِ لاتین می‌پذیره
    return v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  }

  function toggleOnce(on: boolean) {
    setIsOnce(on);
    if (on) setIsPeriod(false);
  }
  function togglePeriod(on: boolean) {
    setIsPeriod(on);
    if (on) setIsOnce(false);
  }

  async function submit() {
    if (saving) return;
    if (!name.trim()) { setError("اسمِ برنامه رو وارد کن"); return; }
    if (!start || !end) { setError("ساعتِ شروع و پایان رو وارد کن"); return; }
    const startFa = normalizeTimeToFa(start);
    const endFa = normalizeTimeToFa(end);
    const startMin = timeStartMinutes(startFa);
    const endMin = timeStartMinutes(endFa);
    if (startMin !== null && endMin !== null && endMin <= startMin) {
      setError("ساعتِ پایان باید بعد از ساعتِ شروع باشه");
      return;
    }
    if (!isEdit && isPeriod) {
      if (!periodStartIso || !periodEndIso) { setError("تاریخ شروع و پایان دوره رو انتخاب کن"); return; }
      if (periodEndIso < periodStartIso) { setError("تاریخ پایان دوره باید بعد از تاریخ شروع باشه"); return; }
    }

    const now = new Date();
    const today = isoLocal(now);
    const excludeId = editing?.occ.id;
    const targetDays = isOnce ? [jsDayOfIso(onceIso)] : jsDays;

    // ویرایش: دوره‌ای/تک‌روزه/هفتگی‌بودنِ برنامه‌ی موجود از رویِ خودِ آن
    // (orig) نگه داشته می‌شود — نه این‌که همیشه از امروز شروع بشه.
    const orig = isEdit
      ? (scheduleOpts.customOccurrences as CustomOccurrence[]).find((c) => c.id === editing!.occ.id)
      : undefined;
    const addDates = isEdit
      ? null
      : datesForNewOccurrence({ today, isOnce, onceIso, isPeriod, periodStartIso, periodEndIso });
    const usesDateBasedConflict = !isEdit && (isOnce || isPeriod);

    let conflictName: string | null = null;
    const rowsToAdd: { jsDay: number; dates: Dates }[] = [];
    for (const jsDay of targetDays) {
      const dates = isEdit
        ? datesForEditedOccurrence({ today, jsDay, orig, sameWeekIso })
        : addDates!;
      let conflict = null;
      if (usesDateBasedConflict) {
        // اولین وقوعِ واقعیِ این روزِ هفته داخلِ بازه — عینِ firstOccurrence
        // در AddProgramForm وب: تداخل باید همونجا سنجیده بشه، نه لزوما امروز.
        const at = firstOccurrenceIso(jsDay, dates, today, isoLocal);
        conflict = at ? findConflictOnDate(new Date(at + "T00:00:00"), startMin, endMin, scheduleOpts, excludeId) : null;
      } else {
        conflict = findScheduleConflict(jsDay, startMin, endMin, now, scheduleOpts, excludeId);
      }
      if (conflict) { conflictName = conflict.name; break; }
      rowsToAdd.push({ jsDay, dates });
    }
    if (conflictName) {
      setError(`تداخلِ زمانی با «${conflictName}»`);
      return;
    }

    setError(null);
    setSaving(true);

    let nextCustom = scheduleOpts.customOccurrences as CustomOccurrence[];
    let nextRemoved = scheduleOpts.removedOccurrences;

    if (isEdit) {
      if (editing!.occ.custom) {
        nextCustom = nextCustom.filter((c) => c.id !== editing!.occ.id);
      } else {
        nextRemoved = new Set(nextRemoved);
        nextRemoved.add(editing!.occ.id + "|" + editing!.occ.jsDay);
      }
    }

    const trimmedTag = tag.trim();
    const additions: CustomOccurrence[] = rowsToAdd.map(({ jsDay, dates }) => ({
      id: newOccId(),
      name: name.trim(),
      jsDay,
      time: endFa ? `${startFa} – ${endFa}` : startFa,
      ...dates,
      importance,
      ...(trimmedTag ? { tag: trimmedTag } : {}),
    }));

    await setCustomOccurrences([...nextCustom, ...additions]);
    if (nextRemoved !== scheduleOpts.removedOccurrences) {
      await setRemovedOccurrences(Array.from(nextRemoved));
    }
    void tapHaptic();
    setSaving(false);
    onClose();
  }

  const onceDate = new Date(onceIso + "T00:00:00");
  const jd = toJalali(onceDate.getFullYear(), onceDate.getMonth() + 1, onceDate.getDate());
  const jPeriodStart = periodStartIso ? isoToJalaliDisplay(periodStartIso) : null;
  const jPeriodEnd = periodEndIso ? isoToJalaliDisplay(periodEndIso) : null;

  function isoToJalaliDisplay(iso: string): string {
    const d = new Date(iso + "T00:00:00");
    return formatJalali(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={isEdit ? `ویرایشِ «${editing!.name}»` : "افزودنِ برنامه"}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>اسمِ برنامه</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ریاضی، باشگاه، جلسه‌ی کاری…"
              className="rounded-xl px-3 font-vazir"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            />
          </label>

          {!isEdit && (
            <>
              <label className="flex items-center gap-2 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                <input type="checkbox" checked={isOnce} onChange={(e) => toggleOnce(e.target.checked)} style={{ width: 20, height: 20 }} />
                فقط برای یک روز (تکرار نشه)
              </label>
              <label className="flex items-center gap-2 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                <input type="checkbox" checked={isPeriod} onChange={(e) => togglePeriod(e.target.checked)} style={{ width: 20, height: 20 }} />
                این یک دوره است
              </label>
            </>
          )}

          {isOnce ? (
            <button
              type="button"
              onClick={() => setPickerFor("once")}
              className="flex items-center justify-between rounded-xl px-3 font-vazir text-[13px]"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            >
              تاریخ
              <span className="mono">{formatJalali(jd)}</span>
            </button>
          ) : (
            <WeekdayPicker value={jsDays} onChange={setJsDays} />
          )}

          {!isEdit && isPeriod && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPickerFor("periodStart")}
                className="flex flex-1 flex-col items-start gap-1 rounded-xl px-3 font-vazir text-[12px]"
                style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--muted)", border: "1px solid var(--surface-line)" }}
              >
                تاریخ شروع دوره
                <span className="mono text-[13px]" style={{ color: "var(--text)" }}>{jPeriodStart ?? "روز / ماه / سال"}</span>
              </button>
              <button
                type="button"
                onClick={() => setPickerFor("periodEnd")}
                className="flex flex-1 flex-col items-start gap-1 rounded-xl px-3 font-vazir text-[12px]"
                style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--muted)", border: "1px solid var(--surface-line)" }}
              >
                تاریخ پایان دوره
                <span className="mono text-[13px]" style={{ color: "var(--text)" }}>{jPeriodEnd ?? "روز / ماه / سال"}</span>
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <TimeField label="ساعتِ شروع" value={start} onChange={setStart} />
            <TimeField label="ساعتِ پایان" value={end} onChange={setEnd} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>میزانِ اهمیت</span>
            <SegmentedTabs
              active={importance}
              onChange={setImportance}
              options={(Object.keys(IMPORTANCE_LABELS) as Importance[]).map((k) => ({ value: k, label: IMPORTANCE_LABELS[k] }))}
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>تگ (اختیاری)</span>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="درس، ورزش، کار…"
              className="rounded-xl px-3 font-vazir"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            />
          </label>

          {error && <div className="font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }}>{error}</div>}

          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl font-vazir text-[15px] font-bold"
            style={{ minHeight: 48, background: "var(--accent)", color: "var(--bg)", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "…" : isEdit ? "ذخیره" : "ثبت"}
          </button>
        </div>
      </BottomSheet>

      <JalaliDatePickerSheet
        open={pickerFor === "once"}
        title="تاریخِ برنامه"
        initialIso={onceIso}
        onClose={() => setPickerFor(null)}
        onPick={(iso) => { setOnceIso(iso); setPickerFor(null); }}
      />
      <JalaliDatePickerSheet
        open={pickerFor === "periodStart"}
        title="تاریخِ شروعِ دوره"
        initialIso={periodStartIso}
        onClose={() => setPickerFor(null)}
        onPick={(iso) => { setPeriodStartIso(iso); setPickerFor("periodEnd"); }}
      />
      <JalaliDatePickerSheet
        open={pickerFor === "periodEnd"}
        title="تاریخِ پایانِ دوره"
        initialIso={periodEndIso}
        onClose={() => setPickerFor(null)}
        onPick={(iso) => { setPeriodEndIso(iso); setPickerFor(null); }}
      />
    </>
  );
}
