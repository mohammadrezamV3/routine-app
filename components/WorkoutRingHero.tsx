"use client";

// بالای صفحه‌های /exercise و /calorie: فقط یک حلقه‌ی وسط‌چین با عدد داخلش و یک
// برچسب کوچک زیرش. عدد از lib/workoutRing.ts میاد (پنل‌ها منتشرش می‌کنن)؛ تا
// برنامه/هدف نباشه چیزی نشون داده نمی‌شه.
import { GradientRing, RING_AMBER, RING_BLUE, type RingGrad } from "./GradientRing";
import { useWorkoutRing, type WorkoutRingKind } from "@/lib/workoutRing";

const OVER: RingGrad = ["var(--ring-3b)", "var(--ring-over)"];

export function WorkoutRingHero({ kind }: { kind: WorkoutRingKind }) {
  const d = useWorkoutRing(kind);
  if (!d) return null;
  const grad: RingGrad = kind === "exercise" ? RING_BLUE : d.over ? OVER : RING_AMBER;
  return (
    <div className="wrh" role="img" aria-label={`${d.label}: ${d.display}`}>
      <GradientRing value={d.value} size={132} stroke={11} grad={grad}>
        <b className="wrh-val">{d.display}</b>
      </GradientRing>
      <span className="wrh-label">{d.label}</span>
    </div>
  );
}
