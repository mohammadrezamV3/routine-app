"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

// انیمیشنِ «کاربر پریمیوم شد» — بعدِ پرداختِ موفقِ اشتراک، یک‌بار روی
// صفحه‌ی اشتراک نشون داده می‌شه (نگاه کن به app/subscription/page.tsx).
// ذره‌های اطرافِ آیکون از رویِ ۸ زاویه‌ی مساوی (۴۵ درجه از هم) محاسبه
// می‌شن تا یه انفجارِ شعاعیِ متقارن بسازن.
const PARTICLE_COUNT = 8;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
  return { x: Math.cos(angle) * 58, y: Math.sin(angle) * 58 };
});

export function PremiumUnlockCelebration({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="premium-celebration-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="premium-celebration-card"
          initial={{ scale: 0.7, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="premium-celebration-icon-wrap">
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="premium-celebration-particle"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
                transition={{ delay: 0.15, duration: 0.7, ease: "easeOut" }}
              />
            ))}
            <motion.div
              className="premium-celebration-icon"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 14 }}
            >
              <Sparkles size={30} />
            </motion.div>
          </div>
          <div className="premium-celebration-title">به جمع کاربران پریمیوم خوش اومدی!</div>
          <div className="premium-celebration-sub">پلنت با موفقیت فعال شد — حالا به همه‌ی امکاناتش دسترسی داری.</div>
          <button type="button" className="premium-celebration-close" onClick={onClose}>باشه</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
