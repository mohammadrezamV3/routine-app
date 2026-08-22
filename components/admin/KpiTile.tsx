"use client";

import { motion } from "framer-motion";

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="admin-kpi-grid">{children}</div>;
}

export function KpiTile({
  label, value, deltaPercent, index = 0,
}: { label: string; value: string; deltaPercent?: number | null; index?: number }) {
  const deltaClass = deltaPercent == null ? "flat" : deltaPercent > 0 ? "up" : deltaPercent < 0 ? "down" : "flat";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
      className="admin-kpi-tile"
    >
      <span className="admin-kpi-label">{label}</span>
      <span className="admin-kpi-value">{value}</span>
      {deltaPercent !== undefined && (
        <span className={`admin-kpi-delta ${deltaClass}`}>
          {deltaPercent === null ? "نسبت به بازه قبل: —" : `${deltaPercent > 0 ? "▲" : deltaPercent < 0 ? "▼" : "–"} ${Math.abs(deltaPercent)}%`}
        </span>
      )}
    </motion.div>
  );
}
