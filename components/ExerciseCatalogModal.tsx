"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { EXERCISE_CATALOG, ExerciseCatalogEntry, MuscleKey } from "@/lib/exerciseCatalog";
import { normalizeFa } from "@/lib/utils";
import { ExercisePictogram } from "./ExercisePictogram";
import { MuscleDiagram } from "./MuscleDiagram";

const MUSCLE_LABEL: Record<MuscleKey, string> = {
  chest: "سینه",
  back: "پشت",
  traps: "ذوزنقه‌ای",
  shoulders: "سرشانه",
  biceps: "جلوبازو",
  triceps: "پشت‌بازو",
  forearms: "ساعد",
  abs: "شکم",
  obliques: "مایل‌های شکم",
  glutes: "باسن",
  quads: "چهارسر ران",
  hamstrings: "همسترینگ",
  calves: "ساق پا",
  cardio: "کاردیو",
  fullbody: "تمام بدن",
  flexibility: "انعطاف‌پذیری",
};

const MUSCLE_FILTERS: MuscleKey[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "abs",
  "quads", "hamstrings", "glutes", "calves", "cardio",
];

// «مشاهده حرکات» — کاتالوگِ کاملِ حرکاتِ بدنسازی؛ هر آیتم با پیکتوگرامِ
// انیمیشنیِ الگوی حرکتش نشون داده می‌شه، فیلترِ گروهِ عضلانی بالای لیست
// اضافه شده. کلیک روی هرکدوم، دیاگرامِ بدن (عضله‌های درگیر) + نحوه‌ی انجام
// + مزایا رو نشون می‌ده. جستجو با normalizeFa تا کیبوردِ عربی/فارسی فرقی
// نکنه.
export function ExerciseCatalogModal({ onClose, initialName }: { onClose: () => void; initialName?: string }) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleKey | null>(null);
  const [selected, setSelected] = useState<ExerciseCatalogEntry | null>(
    () => EXERCISE_CATALOG.find((e) => e.name === initialName) ?? null
  );

  const normalizedQuery = normalizeFa(query);
  const visible = useMemo(
    () =>
      EXERCISE_CATALOG.filter(
        (e) =>
          (!normalizedQuery || normalizeFa(e.name).includes(normalizedQuery)) &&
          (!muscleFilter || e.muscleKeys.includes(muscleFilter))
      ),
    [normalizedQuery, muscleFilter]
  );

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel dash-scope open exercise-catalog-panel">
        <div className="modal-head">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-[13px] font-semibold text-dash-green"
            >
              <ChevronRight size={16} />
              بازگشت
            </button>
          ) : (
            <div className="modal-title">مشاهده حرکات</div>
          )}
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <div className="modal-body">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-center text-[16px] font-bold text-dash-text sm:text-[18px]">{selected.name}</h3>

                <div className="exercise-pictogram-stage">
                  <ExercisePictogram pattern={selected.pattern} size={84} />
                </div>

                <div className="tm-extra" style={{ marginTop: 4 }}>
                  <div className="domain-sub">عضلاتِ درگیر</div>
                  <div className="item-line">{selected.muscleGroup}</div>
                  <div style={{ marginTop: 10 }}>
                    <MuscleDiagram keys={selected.muscleKeys} />
                  </div>
                </div>

                <div className="tm-extra">
                  <div className="domain-sub">نحوه‌ی انجام</div>
                  <ol style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, paddingRight: 18 }}>
                    {selected.howTo.map((step, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 * i, duration: 0.25 }}
                        className="item-line"
                        style={{ listStyle: "decimal" }}
                      >
                        {step}
                      </motion.li>
                    ))}
                  </ol>
                </div>

                <div className="tm-extra">
                  <div className="domain-sub">مزایا</div>
                  <div className="item-line">{selected.benefits}</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <input
                  type="text"
                  dir="auto"
                  className="wsearch-newform-name trade-glass-field pill-glass-field"
                  placeholder="جستجوی حرکت…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <div className="thin-scroll exercise-catalog-filters">
                  <button
                    type="button"
                    onClick={() => setMuscleFilter(null)}
                    className={`exercise-catalog-chip${muscleFilter === null ? " active" : ""}`}
                  >
                    همه
                  </button>
                  {MUSCLE_FILTERS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setMuscleFilter((v) => (v === k ? null : k))}
                      className={`exercise-catalog-chip${muscleFilter === k ? " active" : ""}`}
                    >
                      {MUSCLE_LABEL[k]}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  {visible.length === 0 ? (
                    <div className="item-line empty">حرکتی پیدا نشد.</div>
                  ) : (
                    visible.map((e, i) => (
                      <motion.div
                        key={e.name}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 10) * 0.02, duration: 0.2 }}
                        onClick={() => setSelected(e)}
                        className="exercise-catalog-row"
                      >
                        <ExercisePictogram pattern={e.pattern} size={34} />
                        <div className="min-w-0 flex-1 text-right">
                          <div className="truncate text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{e.name}</div>
                          <div className="truncate text-[10px] text-dash-muted sm:text-[11px]">{e.muscleGroup}</div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
