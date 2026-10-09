"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ImageOff, Star } from "lucide-react";
import {
  EXERCISE_CATALOG,
  EQUIPMENT_LABEL,
  ExerciseCatalogEntry,
  ExerciseEquipment,
  MuscleKey,
  exerciseSearchText,
  getExerciseDifficulty,
  getExerciseEquipment,
  matchesExerciseQuery,
} from "@/lib/exerciseCatalog";
import { mediaKey } from "@/lib/exerciseMedia";
import { normalizeFa } from "@/lib/utils";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useProgressiveList } from "@/lib/useProgressiveList";
import { isEn, tr } from "@/lib/i18n";
import { localizeExercise } from "@/lib/exerciseI18n";
import { EXERCISE_EN } from "@/lib/exerciseCatalogData/en";

const MUSCLE_LABEL: Record<MuscleKey, string> = {
  get chest() { return tr("سینه", "Chest"); },
  get back() { return tr("پشت", "Back"); },
  get traps() { return tr("ذوزنقه‌ای", "Traps"); },
  get shoulders() { return tr("سرشانه", "Shoulders"); },
  get biceps() { return tr("جلوبازو", "Biceps"); },
  get triceps() { return tr("پشت‌بازو", "Triceps"); },
  get forearms() { return tr("ساعد", "Forearms"); },
  get abs() { return tr("شکم", "Abs"); },
  get obliques() { return tr("مایل‌های شکم", "Obliques"); },
  get glutes() { return tr("باسن", "Glutes"); },
  get quads() { return tr("چهارسر ران", "Quads"); },
  get hamstrings() { return tr("همسترینگ", "Hamstrings"); },
  get calves() { return tr("ساق پا", "Calves"); },
  get cardio() { return tr("کاردیو", "Cardio"); },
  get fullbody() { return tr("تمام بدن", "Full body"); },
  get flexibility() { return tr("انعطاف‌پذیری", "Flexibility"); },
};

const MUSCLE_FILTERS: MuscleKey[] = [
  "chest", "back", "traps", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques",
  "quads", "hamstrings", "glutes", "calves", "cardio", "fullbody", "flexibility",
];

const EQUIPMENT_FILTERS: ExerciseEquipment[] = [
  "bodyweight", "dumbbell", "barbell", "cable", "machine", "smith", "kettlebell", "band", "suspension", "other",
];

// متن جستجو و تجهیزات هر حرکت یک بار برای کل کاتالوگ ساخته می‌شه (نه با هر
// حرف تایپ‌شده) — با 700+ حرکت این فرق محسوسه.
const INDEXED = EXERCISE_CATALOG.map((entry) => ({
  entry,
  // نام و گروه عضلانی انگلیسی هم قابل جستجوست (فارسی و انگلیسی مستقل از زبان جاری)
  text: normalizeFa(`${exerciseSearchText(entry)} | ${EXERCISE_EN[entry.name]?.name ?? ""} | ${EXERCISE_EN[entry.name]?.muscleGroup ?? ""}`),
  equipment: getExerciseEquipment(entry),
  level: getExerciseDifficulty(entry),
}));

export function DifficultyStars({ level, className }: { level: number; className?: string }) {
  return (
    <div className={`exercise-difficulty-stars${className ? ` ${className}` : ""}`} aria-label={tr(`میزان سختی: ${level} از 5`, `Difficulty: ${level} of 5`)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} fill={i <= level ? "currentColor" : "none"} className={i <= level ? "on" : ""} />
      ))}
    </div>
  );
}

// «مشاهده حرکات» — یک پاپ‌آپ (نه صفحه‌ی تمام‌عرض)، پورتال‌شده به body چون
// DashCard والدش یه transform ثابت داره که position:fixed رو محدود می‌کنه.
// لیست اسم‌ها با جستجو/فیلتر گروه عضلانی؛ زدن روی هرکدوم یه کارت جزئیات
// از پایین بالا میاد با جای عکس، دستورالعمل، میزان سختی (ستاره) و مزایا.
export function ExerciseCatalogModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleKey | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<ExerciseEquipment | null>(null);
  const [selected, setSelected] = useState<ExerciseCatalogEntry | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // عکس حرکات را ادمین دستی اضافه می‌کند، پس همه‌ی حرکات عکس ندارند و
  // مجموع عکس‌ها هم چند مگابایت است. اول فقط *فهرست کلیدها* (چند کیلوبایت)
  // می‌آید؛ بعد فقط عکس حرکتی که کاربر بازش می‌کند دانلود می‌شود — و همان
  // یک‌بار، چون در cache می‌ماند. حرکتی که کلیدش در فهرست نیست اصلا درخواستی
  // نمی‌سازد و مستقیم placeholder می‌گیرد.
  const [mediaKeys, setMediaKeys] = useState<Set<string> | null>(null);
  const photoCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let alive = true;
    fetch("/api/exercise/media")
      .then((r) => (r.ok ? r.json() : { keys: [] }))
      .then((d) => { if (alive) setMediaKeys(new Set<string>(d.keys || [])); })
      .catch(() => { if (alive) setMediaKeys(new Set<string>()); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selected || !mediaKeys) { setPhoto(null); return; }
    const key = mediaKey(selected.name);
    if (!mediaKeys.has(key)) { setPhoto(null); return; }

    const cached = photoCache.current.get(key);
    if (cached) { setPhoto(cached); return; }

    let alive = true;
    setPhoto(null);
    fetch(`/api/exercise/media?name=${encodeURIComponent(selected.name)}`)
      .then((r) => (r.ok ? r.json() : { dataUrl: null }))
      .then((d) => {
        if (!d?.dataUrl) return;
        photoCache.current.set(key, d.dataUrl);
        if (alive) setPhoto(d.dataUrl);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [selected, mediaKeys]);

  const normalizedQuery = normalizeFa(query).replace(/\s+/g, " ");
  const visible = useMemo(
    () =>
      INDEXED.filter(
        (x) =>
          matchesExerciseQuery(x.text, normalizedQuery) &&
          (!muscleFilter || x.entry.muscleKeys.includes(muscleFilter)) &&
          (!equipmentFilter || x.equipment === equipmentFilter)
      ),
    [normalizedQuery, muscleFilter, equipmentFilter]
  );
  const sel = selected ? localizeExercise(selected) : null;
  const { limit, onScroll, listRef } = useProgressiveList(
    visible.length,
    `${normalizedQuery}|${muscleFilter ?? ""}|${equipmentFilter ?? ""}`
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
            <div className="modal-title">{tr("مشاهده حرکات", "Browse exercises")}</div>
            <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
          </div>

          <input
            type="text"
            dir={isEn() ? "ltr" : "rtl"}
            className="wsearch-newform-name trade-glass-field pill-glass-field"
            placeholder={tr("جستجوی حرکت…", "Search exercises…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="no-scrollbar exercise-catalog-filters">
            <button
              type="button"
              onClick={() => setMuscleFilter(null)}
              className={`exercise-catalog-chip${muscleFilter === null ? " active" : ""}`}
            >
              {tr("همه", "All")}
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

          <div className="no-scrollbar exercise-catalog-filters exercise-catalog-filters-sub">
            {EQUIPMENT_FILTERS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setEquipmentFilter((v) => (v === k ? null : k))}
                className={`exercise-catalog-chip${equipmentFilter === k ? " active" : ""}`}
              >
                {EQUIPMENT_LABEL[k]}
              </button>
            ))}
          </div>

          <div ref={listRef} className="no-scrollbar exercise-catalog-list" onScroll={onScroll}>
            {visible.length === 0 ? (
              <div className="item-line empty">{tr("حرکتی پیدا نشد.", "No exercises found.")}</div>
            ) : (
              visible.slice(0, limit).map(({ entry: e, level }) => (
                <div key={e.name} onClick={() => setSelected(e)} className="exercise-catalog-row">
                  <div className="min-w-0 flex-1 truncate text-start text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">
                    {localizeExercise(e).name}
                  </div>
                  <DifficultyStars level={level} className="exercise-catalog-row-stars" />
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selected && sel && (
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
                <button className="nav-close" onClick={() => setSelected(null)} aria-label={tr("بستن", "Close")}>×</button>
              </div>

              <div className="no-scrollbar exercise-catalog-detail-body">
                <div className="exercise-pictogram-stage">
                  {photo ? (
                    <div className="exercise-photo">
                      {/* عکس ادمین یک data URL است، نه فایل استاتیک؛ next/image
                          روی data URL چیزی بهینه نمی‌کند و فقط محدودیت اضافه می‌کند. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={sel.name} />
                    </div>
                  ) : (
                    // جای خالی عکس — دقیقا هم‌اندازه‌ی .exercise-photo تا با
                    // اضافه‌شدن عکس از پنل ادمین چیدمان کارت جابه‌جا نشود.
                    <div className="exercise-photo-placeholder exercise-photo-slot" role="img" aria-label={tr("عکس این حرکت هنوز اضافه نشده", "No photo has been added for this exercise yet")}>
                      <ImageOff size={32} />
                    </div>
                  )}
                </div>
                <div className="modal-title exercise-detail-name">{sel.name}</div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">{tr("میزان سختی", "Difficulty")}</div>
                  <DifficultyStars level={getExerciseDifficulty(selected)} />
                </div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">{tr("تجهیزات", "Equipment")}</div>
                  <div className="item-line">{EQUIPMENT_LABEL[getExerciseEquipment(selected)]}</div>
                </div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">{tr("دستورالعمل", "Instructions")}</div>
                  <ol style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, paddingInlineStart: 18 }}>
                    {sel.howTo.map((step, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: isEn() ? 8 : -8 }}
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
                  <div className="domain-sub exercise-detail-label">{tr("عضلات درگیر", "Muscles worked")}</div>
                  <div className="item-line">{sel.muscleGroup}</div>
                </div>

                <div className="tm-extra">
                  <div className="domain-sub exercise-detail-label">{tr("مزایا", "Benefits")}</div>
                  <div className="item-line">{sel.benefits}</div>
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
