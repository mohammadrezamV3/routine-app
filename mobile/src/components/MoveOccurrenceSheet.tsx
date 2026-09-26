import { useState } from "react";
import BottomSheet from "./BottomSheet";
import TimeField from "./TimeField";
import JalaliDatePickerSheet from "./JalaliDatePickerSheet";
import { tapHaptic } from "@/lib/haptics";
import { formatJalali, isoLocal, toJalali } from "@/lib/jalali";
import { dayBeforeIso, timeStartMinutes, ScheduleOpts } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { findScheduleConflict } from "@/lib/conflict";
import { CustomOccurrence, Occ } from "@/lib/occurrenceTypes";
import { setCustomOccurrences, setRemovedOccurrences } from "@/db/repo";

function newOccId(): string {
  return "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// انتقالِ یک برنامه به یک روزِ دیگه — پورت از MoveOccurrenceModal.tsx وب:
// نسخه‌ی قبلی به‌جای پاک‌شدنِ کامل، endDate می‌گیره (تا گذشته‌اش دست‌نخورده
// بمونه) و یک occurrence تازه روی روزِ مقصد ساخته می‌شه.
export default function MoveOccurrenceSheet({
  open,
  onClose,
  name,
  occ,
  sourceIso,
  scheduleOpts,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  occ: Occ;
  sourceIso: string;
  scheduleOpts: ScheduleOpts;
}) {
  const parts = String(occ.time).split(/[–—-]/);
  const [targetIso, setTargetIso] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [start, setStart] = useState((parts[0] || "").trim());
  const [end, setEnd] = useState((parts[1] || "").trim());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    if (!targetIso) { setError("روزِ مقصد رو انتخاب کن"); return; }
    if (!start || !end) { setError("ساعتِ شروع و پایان رو وارد کن"); return; }

    const startFa = normalizeTimeToFa(start);
    const endFa = normalizeTimeToFa(end);
    const startMin = timeStartMinutes(startFa);
    const endMin = timeStartMinutes(endFa);
    const targetDate = new Date(targetIso + "T00:00:00");
    const targetJsDay = targetDate.getDay();

    const conflict = findScheduleConflict(targetJsDay, startMin, endMin, new Date(), scheduleOpts, occ.id);
    if (conflict) { setError(`تداخلِ زمانی با «${conflict.name}»`); return; }

    setError(null);
    setSaving(true);

    let nextCustom = scheduleOpts.customOccurrences as CustomOccurrence[];
    let nextRemoved = scheduleOpts.removedOccurrences;

    if (occ.custom) {
      const cutoff = dayBeforeIso(sourceIso);
      nextCustom = nextCustom.flatMap((c) => {
        if (c.id !== occ.id) return [c];
        if (c.startDate && c.startDate > cutoff) return [];
        return [{ ...c, endDate: cutoff }];
      });
    } else {
      nextRemoved = new Set(nextRemoved);
      nextRemoved.add(occ.id + "|" + occ.jsDay);
    }

    const newOcc: CustomOccurrence = {
      id: newOccId(),
      name,
      jsDay: targetJsDay,
      time: endFa ? `${startFa} – ${endFa}` : startFa,
      startDate: isoLocal(new Date()),
      ...(occ.importance ? { importance: occ.importance } : {}),
      ...(occ.tag ? { tag: occ.tag } : {}),
    };
    nextCustom = [...nextCustom, newOcc];

    await setCustomOccurrences(nextCustom);
    if (nextRemoved !== scheduleOpts.removedOccurrences) {
      await setRemovedOccurrences(Array.from(nextRemoved));
    }
    void tapHaptic();
    setSaving(false);
    onClose();
  }

  const jd = targetIso ? (() => {
    const d = new Date(targetIso + "T00:00:00");
    return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  })() : null;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={`انتقالِ «${name}» به روزِ دیگر`}>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center justify-between rounded-xl px-3 font-vazir text-[13px]"
            style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
          >
            انتقال به روز
            <span className="mono">{jd ? formatJalali(jd) : "روز / ماه / سال"}</span>
          </button>

          <div className="flex gap-3">
            <TimeField label="ساعتِ شروع" value={start} onChange={setStart} />
            <TimeField label="ساعتِ پایان" value={end} onChange={setEnd} />
          </div>

          {error && <div className="font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }}>{error}</div>}

          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl font-vazir text-[15px] font-bold"
            style={{ minHeight: 48, background: "var(--accent)", color: "var(--bg)", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "…" : "انتقال"}
          </button>
        </div>
      </BottomSheet>

      <JalaliDatePickerSheet
        open={pickerOpen}
        title="انتقال به روز"
        initialIso={targetIso}
        disablePast
        onClose={() => setPickerOpen(false)}
        onPick={(iso) => { setTargetIso(iso); setPickerOpen(false); }}
      />
    </>
  );
}
