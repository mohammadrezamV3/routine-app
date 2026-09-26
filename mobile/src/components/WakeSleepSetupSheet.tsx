import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { setWakeSleepTimes } from "@/db/repo";
import { DEFAULT_SLEEP, DEFAULT_WAKE, WakeSleepTimes } from "@/lib/wakeSleepLogic";
import { tapHaptic } from "@/lib/haptics";

// تنظیمِ ساعتِ بیداری/خوابِ هدف — پورت از WakeSleepSetup.tsx وب، ساده‌شده
// به یک شیتِ تک‌مرحله‌ای (هم برای اولین بار هم برای تغییرِ بعدی).
export default function WakeSleepSetupSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: WakeSleepTimes | null;
}) {
  const [wake, setWake] = useState(initial?.wake || DEFAULT_WAKE);
  const [sleep, setSleep] = useState(initial?.sleep || DEFAULT_SLEEP);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    await setWakeSleepTimes({ wake, sleep });
    void tapHaptic();
    setSaving(false);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="کی بیدار می‌شی، کی می‌خوابی؟">
      <div className="flex flex-col gap-4">
        <p className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
          این دو ساعت پایه‌ی تایم‌لاینِ روزانه‌ت هستن. هر وقت خواستی می‌تونی عوضشون کنی.
        </p>
        <label className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>ساعتِ بیداریِ هدف</span>
          <input
            type="time"
            value={wake}
            onChange={(e) => setWake(e.target.value)}
            className="rounded-xl px-3 font-vazir mono"
            style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>ساعتِ خوابِ هدف</span>
          <input
            type="time"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            className="rounded-xl px-3 font-vazir mono"
            style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
          />
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl font-vazir text-[15px] font-bold"
          style={{ minHeight: 48, background: "var(--accent)", color: "var(--bg)", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "…" : "ثبت و ادامه"}
        </button>
      </div>
    </BottomSheet>
  );
}
