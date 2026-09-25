import { useState } from "react";
import BottomSheet from "./BottomSheet";
import WeekdayPicker from "./WeekdayPicker";
import TimeField from "./TimeField";
import SegmentedTabs from "./SegmentedTabs";
import JalaliDatePickerSheet from "./JalaliDatePickerSheet";
import { tapHaptic } from "@/lib/haptics";
import { isoLocal, formatJalali, toJalali } from "@/lib/jalali";
import { timeStartMinutes, jsDayOfIso, ScheduleOpts } from "@/lib/schedule";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import { findConflictOnDate, findScheduleConflict } from "@/lib/conflict";
import { CustomOccurrence, Importance, IMPORTANCE_LABELS, Occ } from "@/lib/occurrenceTypes";
import { setCustomOccurrences, setRemovedOccurrences } from "@/db/repo";

function newOccId(): string {
  return "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// افزودن/ویرایشِ یک برنامه — پورت شده از AddProgramForm.tsx +
// EditOccurrenceForm.tsx وب (منطقِ conflict/startDate/endDate عینِ همون)،
// روی یک BottomSheتِ تک‌صفحه‌ای به‌جای فرمِ دومرحله‌ایِ گلسِ وب.
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importance, setImportance] = useState<Importance>(editing?.occ.importance ?? "medium");
  const [tag, setTag] = useState(editing?.occ.tag ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toEn(v: string) {
    // native <input type="time"> فقط ارقامِ لاتین می‌پذیره
    return v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
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

    const now = new Date();
    const today = isoLocal(now);
    const excludeId = editing?.occ.id;

    const targetDays = isOnce ? [jsDayOfIso(onceIso)] : jsDays;
    let conflictName: string | null = null;
    for (const jsDay of targetDays) {
      const conflict = isOnce
        ? findConflictOnDate(new Date(onceIso + "T00:00:00"), startMin, endMin, scheduleOpts, excludeId)
        : findScheduleConflict(jsDay, startMin, endMin, now, scheduleOpts, excludeId);
      if (conflict) { conflictName = conflict.name; break; }
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
    const additions: CustomOccurrence[] = targetDays.map((jsDay) => {
      // تک‌روزه: دقیقا همون تاریخِ انتخاب‌شده. هفتگی: از همینِ امروز به بعد —
      // چه تازه ساخته بشه چه ویرایشِ یک برنامه‌ی هفتگیِ موجود، تاریخِ گذشته
      // نباید عوض بشه (نسخه‌ی قدیمی جدا نگه‌داشته می‌شه، بالاتر).
      const dates = isOnce ? { startDate: onceIso, endDate: onceIso } : { startDate: today };
      return {
        id: newOccId(),
        name: name.trim(),
        jsDay,
        time: endFa ? `${startFa} – ${endFa}` : startFa,
        ...dates,
        importance,
        ...(trimmedTag ? { tag: trimmedTag } : {}),
      };
    });

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
            <label className="flex items-center gap-2 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
              <input type="checkbox" checked={isOnce} onChange={(e) => setIsOnce(e.target.checked)} style={{ width: 20, height: 20 }} />
              فقط برای یک روز (تکرار نشه)
            </label>
          )}

          {isOnce ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center justify-between rounded-xl px-3 font-vazir text-[13px]"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            >
              تاریخ
              <span className="mono">{formatJalali(jd)}</span>
            </button>
          ) : (
            <WeekdayPicker value={jsDays} onChange={setJsDays} />
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
        open={pickerOpen}
        title="تاریخِ برنامه"
        initialIso={onceIso}
        onClose={() => setPickerOpen(false)}
        onPick={(iso) => { setOnceIso(iso); setPickerOpen(false); }}
      />
    </>
  );
}
