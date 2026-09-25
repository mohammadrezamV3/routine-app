import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { setSleepEntry, useSleepEntry } from "@/db/repo";
import { tapHaptic } from "@/lib/haptics";
import { isoLocal } from "@/lib/jalali";

// ثبتِ خواب/بیداریِ امروز (SleepEntry model) — کیفیتِ خواب ۱ تا ۵.
export default function SleepLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const todayIso = isoLocal(new Date());
  const entry = useSleepEntry(todayIso);
  const [sleptAt, setSleptAt] = useState("");
  const [wokeAt, setWokeAt] = useState("");
  const [quality, setQuality] = useState<number>(entry?.quality ?? 3);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setSaving(true);
    const patch: Parameters<typeof setSleepEntry>[1] = { quality };
    if (sleptAt) {
      const d = new Date(todayIso + "T" + sleptAt);
      patch.sleptAt = d.toISOString();
    }
    if (wokeAt) {
      const d = new Date(todayIso + "T" + wokeAt);
      patch.wokeAt = d.toISOString();
    }
    await setSleepEntry(todayIso, patch);
    void tapHaptic();
    setSaving(false);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="ثبتِ خواب امروز">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>ساعتِ خواب</span>
            <input
              type="time"
              value={sleptAt}
              onChange={(e) => setSleptAt(e.target.value)}
              className="rounded-xl px-3 font-vazir mono"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>ساعتِ بیداری</span>
            <input
              type="time"
              value={wokeAt}
              onChange={(e) => setWokeAt(e.target.value)}
              className="rounded-xl px-3 font-vazir mono"
              style={{ minHeight: 44, background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--surface-line)" }}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>کیفیتِ خواب</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className="flex flex-1 items-center justify-center rounded-xl font-vazir"
                style={{
                  minHeight: 44,
                  background: quality === q ? "var(--accent)" : "var(--surface-2)",
                  color: quality === q ? "var(--bg)" : "var(--text)",
                  border: "1px solid var(--surface-line)",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="rounded-xl font-vazir text-[15px] font-bold"
          style={{ minHeight: 48, background: "var(--accent)", color: "var(--bg)", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "…" : "ثبت"}
        </button>
      </div>
    </BottomSheet>
  );
}
