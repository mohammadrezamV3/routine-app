"use client";

import { motion } from "framer-motion";

// کارت استاندارد بخش‌های تنظیمات پنل کاربری — آیکون در دایره‌ی نرم + عنوان،
// با ورود مرحله‌ای ملایم وقتی چند کارت زیر هم‌ان.
export function AccountSectionCard({
  icon, title, children, index = 0,
}: { icon: React.ReactNode; title: string; children: React.ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="account-card"
      style={{ padding: 16, marginBottom: 14 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span className="account-row2-icon" style={{ width: 34, height: 34 }}>{icon}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{title}</span>
      </div>
      {children}
    </motion.div>
  );
}
