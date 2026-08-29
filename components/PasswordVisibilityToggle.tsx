"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

/** دکمه‌ی نمایش/مخفی‌کردنِ رمز — سمتِ چپِ فیلد (endAction توی AuthField)،
 * مستقل از آیکونِ خودِ فیلد که سمتِ راسته. کراس‌فیدِ چرخشیِ ملایم بینِ
 * چشمِ باز/بسته، نه پرشِ خامِ آیکون. */
export function PasswordVisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="field-toggle-visibility-btn"
      tabIndex={-1}
      aria-label={visible ? "مخفی‌کردن رمز عبور" : "نمایش رمز عبور"}
      onClick={onToggle}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={visible ? "visible" : "hidden"}
          initial={{ opacity: 0, scale: 0.5, rotate: -50 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 50 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex" }}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
