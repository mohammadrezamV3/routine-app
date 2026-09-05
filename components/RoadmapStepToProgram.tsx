"use client";

import { useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { CustomOccurrence, getCustomOccurrences, setCustomOccurrences } from "@/lib/storage";
import { isoLocal } from "@/lib/jalali";

const DAYS = [
  { jsDay: 6, label: "شنبه" }, { jsDay: 0, label: "یکشنبه" }, { jsDay: 1, label: "دوشنبه" },
  { jsDay: 2, label: "سه‌شنبه" }, { jsDay: 3, label: "چهارشنبه" }, { jsDay: 4, label: "پنجشنبه" },
  { jsDay: 5, label: "جمعه" },
];

/**
 * «این مرحله را به برنامه‌هایم اضافه کن».
 *
 * یک رودمپ تا وقتی فقط خوانده شود هیچ اتفاقی نمی‌افتد؛ کاری که واقعاً
 * انجام می‌شود آن است که سرِ ساعتِ مشخص در برنامه‌ی هفتگی نشسته باشد.
 * این دکمه همان مرحله را به `customOccurrences` اضافه می‌کند — همان
 * مخزنی که برنامه‌ی هفتگی و صفحه‌ی خانه از آن می‌خوانند.
 */
export function RoadmapStepToProgram({ title, topic }: { title: string; topic: string }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!days.length) { setError("حداقل یک روز را انتخاب کن"); return; }
    if (end <= start) { setError("ساعت پایان باید بعد از ساعت شروع باشد"); return; }
    setSaving(true);
    setError(null);
    try {
      const existing = await getCustomOccurrences();
      const today = isoLocal(new Date());
      const fresh: CustomOccurrence[] = days.map((jsDay, i) => ({
        id: `rm-${Date.now()}-${i}`,
        name: `${title} — ${topic}`,
        jsDay,
        time: `${start} – ${end}`,
        startDate: today,
      }));
      await setCustomOccurrences([...existing, ...fresh]);
      setAdded(true);
      setOpen(false);
    } catch {
      setError("ذخیره نشد — دوباره تلاش کن");
    } finally {
      setSaving(false);
    }
  }

  if (added) {
    return (
      <div className="rm-added"><Check size={14} /> به برنامه‌های هفتگی اضافه شد</div>
    );
  }

  return (
    <div className="rm-toprogram">
      {!open ? (
        <button type="button" className="rm-add-btn" onClick={() => setOpen(true)}>
          <CalendarPlus size={14} /> افزودن به برنامه‌هایم
        </button>
      ) : (
        <div className="rm-add-panel">
          <div className="rm-add-title">کدام روزها روی این مرحله کار می‌کنی؟</div>
          <div className="rm-day-row">
            {DAYS.map((d) => (
              <button
                key={d.jsDay}
                type="button"
                className={`rm-day${days.includes(d.jsDay) ? " on" : ""}`}
                onClick={() => setDays((p) => p.includes(d.jsDay) ? p.filter((x) => x !== d.jsDay) : [...p, d.jsDay])}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="rm-time-row">
            <label>
              <span>ساعت شروع</span>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              <span>ساعت پایان</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          {error && <div className="trade-form-error">{error}</div>}
          <div className="rm-add-actions">
            <button type="button" className="account-outline-btn" onClick={() => setOpen(false)}>لغو</button>
            <button type="button" className="trade-primary-btn" onClick={save} disabled={saving}>
              {saving ? <><Loader2 size={14} className="trade-spin" /> در حال ذخیره…</> : "افزودن"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
