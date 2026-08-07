"use client";

import { motion } from "framer-motion";

// وقتی «این تجهیزات رو ندارم» می‌زنی، به‌جای سوییچِ خودکار به یک حرکتِ
// تصادفی، سه حرکتِ جایگزینِ آماده (از کاتالوگ، هم‌الگو/هم‌عضله با حرکتِ
// اصلی) نشون می‌ده تا خودت انتخاب کنی.
export function ExerciseSubstitutePicker({
  oldItem,
  candidates,
  onPick,
  onClose,
  picking,
}: {
  oldItem: string;
  candidates: string[];
  onPick: (newItem: string) => void;
  onClose: () => void;
  picking: boolean;
}) {
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open exercise-set-tracker-panel">
        <div className="modal-head">
          <div className="modal-title">جایگزینِ «{oldItem}»</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <div className="modal-body">
          <div className="section-note" style={{ marginTop: 0, marginBottom: 12 }}>
            یکی از این حرکت‌های جایگزین رو انتخاب کن
          </div>
          <div className="flex flex-col gap-2">
            {candidates.map((c, i) => (
              <motion.button
                key={c}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                whileTap={{ scale: 0.97 }}
                disabled={picking}
                onClick={() => onPick(c)}
                className="exercise-substitute-option"
              >
                {c}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
