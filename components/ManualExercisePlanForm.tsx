"use client";

import { useState } from "react";
import { FA_WEEKDAY, CAL_WEEK_ORDER } from "@/lib/jalali";
import { ExerciseDay } from "@/lib/exercisePlans";

type ManualDayBlock = { day: string; focus: string; items: string[] };

const ALL_DAYS = CAL_WEEK_ORDER.map((i) => FA_WEEKDAY[i]);

function emptyBlock(usedDays: string[]): ManualDayBlock {
  const firstFree = ALL_DAYS.find((d) => !usedDays.includes(d)) || ALL_DAYS[0];
  return { day: firstFree, focus: "", items: [""] };
}

// برنامه‌ی دستی/شخصیِ کاربر — هر بلوک یک روزه (روز + تمرکز + لیستِ حرکات)،
// دقیقاً هم‌ساختار با ExerciseDay که مسیرِ هوش‌مصنوعی/قالب هم تولید می‌کنه.
export function ManualExercisePlanForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (days: ExerciseDay[]) => void;
  submitting: boolean;
}) {
  const [blocks, setBlocks] = useState<ManualDayBlock[]>([emptyBlock([])]);
  const [error, setError] = useState<string | null>(null);

  function addBlock() {
    setBlocks((b) => [...b, emptyBlock(b.map((x) => x.day))]);
  }
  function removeBlock(i: number) {
    setBlocks((b) => b.filter((_, idx) => idx !== i));
  }
  function updateBlock(i: number, patch: Partial<ManualDayBlock>) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addItem(i: number) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, items: [...x.items, ""] } : x)));
  }
  function removeItem(i: number, ii: number) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)));
  }
  function updateItem(i: number, ii: number, val: string) {
    setBlocks((b) => b.map((x, idx) => (idx === i ? { ...x, items: x.items.map((it, j) => (j === ii ? val : it)) } : x)));
  }

  function submit() {
    const days = new Set(blocks.map((b) => b.day));
    if (days.size !== blocks.length) { setError("هر روز فقط یک‌بار می‌تونه توی برنامه باشه."); return; }
    for (const b of blocks) {
      if (!b.items.some((it) => it.trim())) { setError(`برای روزِ «${b.day}» حداقل یک حرکت وارد کن.`); return; }
    }
    setError(null);
    const cleaned: ExerciseDay[] = blocks.map((b) => ({
      day: b.day,
      focus: b.focus.trim() || "برنامه‌ی شخصی",
      items: b.items.map((it) => it.trim()).filter(Boolean),
    }));
    onSubmit(cleaned);
  }

  return (
    <div>
      <div className="section-note" style={{ marginTop: 0 }}>
        برنامه‌ی تمرینیِ خودت رو روز‌به‌روز وارد کن — روزهای باشگاه و حرکاتِ هر روز دستِ خودته.
      </div>

      {blocks.map((b, bi) => (
        <div key={bi} className="tm-extra">
          <div className="domain-sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>روز</span>
            {blocks.length > 1 && (
              <button type="button" className="wsearch-newrow-remove-text" onClick={() => removeBlock(bi)}>
                حذف این روز
              </button>
            )}
          </div>
          <div className="exercise-day-select">
            {ALL_DAYS.map((d) => (
              <span
                key={d}
                className={`day-pill${b.day === d ? " on" : ""}`}
                onClick={() => updateBlock(bi, { day: d })}
              >
                {d}
              </span>
            ))}
          </div>

          <label className="exercise-form-label" style={{ marginTop: 12, display: "block" }}>تمرکزِ امروز (اختیاری)</label>
          <input
            type="text"
            dir="auto"
            className="wsearch-newform-name"
            placeholder="مثلاً بالاتنه، پا، بدنِ کامل…"
            value={b.focus}
            onChange={(e) => updateBlock(bi, { focus: e.target.value })}
          />

          <label className="exercise-form-label" style={{ marginTop: 12, display: "block" }}>حرکات</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            {b.items.map((it, ii) => (
              <div key={ii} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  dir="auto"
                  className="wsearch-newform-name"
                  placeholder="مثلاً اسکوات هالتر ۴×۱۰"
                  value={it}
                  onChange={(e) => updateItem(bi, ii, e.target.value)}
                />
                {b.items.length > 1 && (
                  <button type="button" className="wsearch-newrow-remove-text" onClick={() => removeItem(bi, ii)} style={{ flexShrink: 0 }}>
                    حذف
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="wsearch-add-btn" onClick={() => addItem(bi)} style={{ marginTop: 8 }}>
            افزودن حرکت
            <span className="wsearch-add-btn-icon">+</span>
          </button>
        </div>
      ))}

      {blocks.length < 7 && (
        <button type="button" className="wsearch-add-btn" onClick={addBlock} style={{ marginTop: 10 }}>
          افزودن روز دیگر
          <span className="wsearch-add-btn-icon">+</span>
        </button>
      )}

      {error && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        style={{ marginTop: 16, borderColor: "var(--accent)", color: "var(--accent)" }}
      >
        {submitting ? "در حال ثبت…" : "مرحله بعد"}
      </button>
    </div>
  );
}
