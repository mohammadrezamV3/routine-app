import { useEffect, useMemo, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { tapHaptic } from "@/lib/haptics";
import { parseExerciseItem } from "../lib/exerciseSets";
import { getSetLogs, logSet } from "../lib/repo";
import type { SetLogRow } from "../lib/exerciseTypes";

const REST_SECONDS = 90;

/**
 * BottomSheet ردیابیِ ست‌به‌ست یک حرکت — برای هر ست: تکرار/وزن (یا فقط
 * زمان برای حرکاتِ زمان‌محور مثل پلانک/کاردیو) + تایمرِ استراحتِ بینِ
 * ست‌ها با پیامِ لرزشی (haptic) وقتی تموم می‌شه.
 */
export default function SetTrackerSheet({
  open,
  onClose,
  planId,
  date,
  item,
}: {
  open: boolean;
  onClose: () => void;
  planId: string;
  date: string;
  item: string;
}) {
  const spec = useMemo(() => parseExerciseItem(item), [item]);
  const [logs, setLogs] = useState<SetLogRow[]>([]);
  const [restLeft, setRestLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    getSetLogs(planId, date, spec.baseName).then(setLogs);
  }, [open, planId, date, spec.baseName]);

  useEffect(() => {
    if (restLeft === null) return;
    if (restLeft <= 0) {
      void tapHaptic();
      setRestLeft(null);
      return;
    }
    const t = setTimeout(() => setRestLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  async function saveSet(setIndex: number, reps: string, weight: string) {
    await logSet({
      planId,
      date,
      itemKey: spec.baseName,
      setIndex,
      reps: reps ? Number(reps) : null,
      weightKg: weight ? Number(weight) : null,
      seconds: spec.isTimed ? spec.seconds : null,
    });
    setLogs(await getSetLogs(planId, date, spec.baseName));
    void tapHaptic();
  }

  function logOf(setIndex: number): SetLogRow | undefined {
    return logs.find((l) => l.setIndex === setIndex);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={spec.baseName}>
      <div className="flex flex-col gap-3">
        {spec.isTimed && (
          <p className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
            {spec.seconds ? `${spec.seconds} ثانیه` : ""} — فقط تیک بزن که انجامش دادی.
          </p>
        )}

        {Array.from({ length: spec.sets }).map((_, i) => {
          const existing = logOf(i);
          return (
            <SetRow
              key={i}
              index={i}
              isTimed={spec.isTimed}
              defaultReps={spec.reps ?? undefined}
              existing={existing}
              onSave={(reps, weight) => saveSet(i, reps, weight)}
            />
          );
        })}

        <div
          className="mt-1 flex items-center justify-between rounded-xl p-3"
          style={{ background: "var(--surface-2)" }}
        >
          <span className="font-vazir text-[13px]" style={{ color: "var(--text)" }}>
            تایمر استراحت
          </span>
          <div className="flex items-center gap-2">
            <span className="font-vazir text-[15px] font-bold tabular-nums" style={{ color: "var(--accent)" }}>
              {restLeft !== null ? `${restLeft}s` : `${REST_SECONDS}s`}
            </span>
            <button
              onClick={() => {
                void tapHaptic();
                setRestLeft(restLeft === null ? REST_SECONDS : null);
              }}
              className="flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: "var(--accent)", color: "#fff" }}
              aria-label={restLeft !== null ? "توقف تایمر" : "شروع تایمر استراحت"}
            >
              {restLeft !== null ? <Pause size={18} /> : <Play size={18} />}
            </button>
            {restLeft !== null && (
              <button
                onClick={() => setRestLeft(REST_SECONDS)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 44, height: 44, background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
                aria-label="ریست تایمر"
              >
                <RotateCcw size={16} color="var(--muted)" />
              </button>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

function SetRow({
  index,
  isTimed,
  defaultReps,
  existing,
  onSave,
}: {
  index: number;
  isTimed: boolean;
  defaultReps?: string;
  existing?: SetLogRow;
  onSave: (reps: string, weight: string) => void;
}) {
  const [reps, setReps] = useState(existing?.reps != null ? String(existing.reps) : defaultReps ?? "");
  const [weight, setWeight] = useState(existing?.weightKg != null ? String(existing.weightKg) : "");
  const done = !!existing;

  return (
    <div
      className="flex items-center gap-2 rounded-xl p-2.5"
      style={{ background: "var(--surface-2)", border: done ? "1px solid var(--accent)" : "1px solid transparent" }}
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-full font-vazir text-[12px] font-bold"
        style={{ width: 28, height: 28, background: "var(--surface-1)", color: "var(--text)" }}
      >
        {index + 1}
      </span>
      {!isTimed && (
        <>
          <input
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="تکرار"
            className="min-w-0 flex-1 rounded-lg px-2 font-vazir text-[13px]"
            style={{ height: 40, background: "var(--surface-1)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
          />
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="وزن (kg)"
            className="min-w-0 flex-1 rounded-lg px-2 font-vazir text-[13px]"
            style={{ height: 40, background: "var(--surface-1)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
          />
        </>
      )}
      {isTimed && <span className="flex-1 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>حرکت زمان‌محور</span>}
      <button
        onClick={() => onSave(reps, weight)}
        className="shrink-0 rounded-lg font-vazir text-[12.5px] font-medium"
        style={{
          minWidth: 56,
          height: 40,
          background: done ? "var(--accent)" : "var(--surface-1)",
          color: done ? "#fff" : "var(--text)",
          border: "1px solid var(--surface-line)",
        }}
      >
        {done ? "ثبت شد" : "ثبت"}
      </button>
    </div>
  );
}
