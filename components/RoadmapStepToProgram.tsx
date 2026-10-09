"use client";

import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { CustomOccurrence, getCustomOccurrences, setCustomOccurrences } from "@/lib/storage";
import { isoLocal, weekdayName } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { Spinner } from "./Spinner";

const DAYS = [6, 0, 1, 2, 3, 4, 5].map((jsDay) => ({ jsDay }));

/**
 * «این مرحله را به برنامه‌هایم اضافه کن».
 *
 * یک رودمپ تا وقتی فقط خوانده شود هیچ اتفاقی نمی‌افتد؛ کاری که واقعا
 * انجام می‌شود آن است که سر ساعت مشخص در برنامه‌ی هفتگی نشسته باشد.
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
    if (!days.length) { setError(tr("حداقل یک روز را انتخاب کن", "Select at least one day")); return; }
    if (end <= start) { setError(tr("ساعت پایان باید بعد از ساعت شروع باشد", "End time must be after start time")); return; }
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
      setError(tr("ذخیره نشد — دوباره تلاش کن", "Could not save — please try again"));
    } finally {
      setSaving(false);
    }
  }

  if (added) {
    return (
      <div className="rp-added"><Check size={14} /> {tr("به برنامه‌های هفتگی اضافه شد", "Added to your weekly plans")}</div>
    );
  }

  return (
    <div className="rp-toprogram">
      {!open ? (
        <button type="button" className="rp-ghost-btn" onClick={() => setOpen(true)}>
          <CalendarPlus size={14} /> {tr("افزودن به برنامه‌هایم", "Add to my plans")}
        </button>
      ) : (
        <div className="rp-add-panel">
          <div className="rp-add-title">{tr("کدام روزها روی این مرحله کار می‌کنی؟", "Which days will you work on this stage?")}</div>
          <div className="rp-day-row">
            {DAYS.map((d) => (
              <button
                key={d.jsDay}
                type="button"
                className={`rp-day${days.includes(d.jsDay) ? " on" : ""}`}
                onClick={() => setDays((p) => p.includes(d.jsDay) ? p.filter((x) => x !== d.jsDay) : [...p, d.jsDay])}
              >
                {weekdayName(d.jsDay)}
              </button>
            ))}
          </div>
          <div className="rp-time-row">
            <label>
              <span>{tr("ساعت شروع", "Start time")}</span>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              <span>{tr("ساعت پایان", "End time")}</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          {error && <div className="trade-form-error">{error}</div>}
          <div className="rp-add-actions">
            <button type="button" className="account-outline-btn" onClick={() => setOpen(false)}>{tr("لغو", "Cancel")}</button>
            <button type="button" className="trade-primary-btn" onClick={save} disabled={saving}>
              {saving ? <Spinner size={13} /> : tr("افزودن", "Add")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
