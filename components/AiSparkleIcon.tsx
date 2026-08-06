"use client";

import { motion } from "framer-motion";

// آیکونِ «ساخت با هوش مصنوعی» — یه ستاره‌ی چهارپَره (شبیهِ لوگوی جمنای)،
// طلایی‌رنگ با گرادیانت، با یه چرخشِ آرومِ پیوسته + پالسِ نور که حسِ
// «درخشیدن» بده (نه صرفاً یه آیکونِ ثابت).
export function AiSparkleIcon({ size = 22 }: { size?: number }) {
  const gradId = "ai-sparkle-grad";
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 0 6px rgba(255,200,60,.75))" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE68A" />
          <stop offset="45%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
      </defs>
      <motion.path
        d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z"
        fill={`url(#${gradId})`}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}
