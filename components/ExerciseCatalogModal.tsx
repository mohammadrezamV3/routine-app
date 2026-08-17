"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ImageOff, Star } from "lucide-react";
import { EXERCISE_CATALOG, ExerciseCatalogEntry, MuscleKey, getExerciseDifficulty } from "@/lib/exerciseCatalog";
import { normalizeFa } from "@/lib/utils";
import { MuscleDiagram } from "./MuscleDiagram";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

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

export function DifficultyStars({ level, className }: { level: number; className?: string }) {
  return (
    <div className={`exercise-difficulty-stars${className ? ` ${className}` : ""}`} aria-label={`میزان سختی: ${level} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} fill={i <= level ? "currentColor" : "none"} className={i <= level ? "on" : ""} />
      ))}
    </div>
  );
}

// «مشاهده حرکات» — یک پاپ‌آپ (نه صفحه‌ی تمام‌عرض)، پورتال‌شده به body چون
// DashCard والدش یه transform ثابت داره که position:fixed رو محدود می‌کنه.
// لیستِ اسم‌ها با جستجو/فیلترِ گروهِ عضلانی؛ زدن روی هرکدوم یه کارتِ جزئیات
// از پایین بالا میاد با جای عکس، دستورالعمل، میزانِ سختی (ستاره) و مزایا.
export function ExerciseCatalogModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleKey | null>(null);
  const [selected, setSelected] = useState<ExerciseCatalogEntry | null>(null);

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

  return createPortal(
    <>
      <motion.div
        className="exercise-catalog-popup-wrap"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="exercise-catalog-popup-panel dash-scope"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="modal-head">
            <div className="modal-title">مشاهده حرکات</div>
            <button type="button" className="nav-close" onClick={onClose} aria-label="بستن">×</button>
          </div>

          <input
            type="text"
            dir="rtl"
            className="wsearch-newform-name trade-glass-field pill-glass-field"
            placeholder="جستجوی حرکت…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="no-scrollbar exercise-catalog-filters">
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

          <div className="no-scrollbar exercise-catalog-list">
            {visible.length === 0 ? (
              <div className="item-line empty">حرکتی پیدا نشد.</div>
            ) : (
              visible.map((e, i) => (
                <motion.div
                  key={e.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }}
                  onClick={() => setSelected(e)}
                  className="exercise-catalog-row"
                >
                  <div className="min-w-0 flex-1 truncate text-right text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">
                    {e.name}
                  </div>
                  <DifficultyStars level={getExerciseDifficulty(e)} className="exercise-catalog-row-stars" />
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              className="modal-overlay open exercise-catalog-detail-overlay"
              onClick={() => setSelected(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="exercise-catalog-detail-card dash-scope"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
            >
              <div className="modal-head exercise-detail-head">
                <span />
                <button className="nav-close" onClick={() => setSelected(null)} aria-label="بستن">×</button>
              </div>

              <div className="no-scrollbar exercise-catalog-detail-body">
                <div className="exercise-pictogram-stage">
                  <div className="exercise-photo-placeholder" style={{ width: 120, height: 120 }}>
                    <ImageOff size={32} />
                  </div>
                </div>
                <div className="modal-title exercise-detail-name">{selected.name}</div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">میزان سختی</div>
                  <DifficultyStars level={getExerciseDifficulty(selected)} />
                </div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">دستورالعمل</div>
                  <ol style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, paddingRight: 18 }}>
                    {selected.howTo.map((step, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 * i, duration: 0.2 }}
                        className="item-line"
                        style={{ listStyle: "decimal" }}
                      >
                        {step}
                      </motion.li>
                    ))}
                  </ol>
                </div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">عضلاتِ درگیر</div>
                  <div className="item-line">{selected.muscleGroup}</div>
                  <div style={{ marginTop: 10 }}>
                    <MuscleDiagram keys={selected.muscleKeys} />
                  </div>
                </div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">مزایا</div>
                  <div className="item-line">{selected.benefits}</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
