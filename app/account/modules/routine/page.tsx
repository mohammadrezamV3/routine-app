"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon } from "lucide-react";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes, WakeSleepTimes } from "@/lib/wakeSleep";
import { WakeSleepSetup } from "@/components/WakeSleepSetup";

export default function RoutineModuleSettingsPage() {
  const [wakeSleep, setWakeSleep] = useState<WakeSleepTimes | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => { getWakeSleepTimes().then(setWakeSleep); }, []);

  return (
    <section>
      <h1>روتین</h1>
      <div className="account-content-hint">تنظیمات مربوط به برنامه‌ها و یادآوری‌های روتین</div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="account-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span className="account-row2-icon" style={{ width: 34, height: 34 }}><Moon size={16} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>ساعت بیداری و خواب</span>
        </div>
        <div className="item-line" style={{ textAlign: "center" }}>
          بیداری <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.wake || DEFAULT_WAKE}</b>
          {" — "}خواب <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.sleep || DEFAULT_SLEEP}</b>
        </div>
        <button className="account-outline-btn" onClick={() => setEditing(true)} style={{ marginTop: 12 }}>
          تغییر ساعت‌ها
        </button>
      </motion.div>

      <div className="section-note" style={{ marginTop: 16 }}>
        یادآوریِ برنامه‌های روزانه از بخشِ «اعلان‌ها» قابل تنظیمه.
      </div>

      {editing && (
        <WakeSleepSetup
          initial={wakeSleep}
          onClose={() => setEditing(false)}
          onDone={(v) => { setWakeSleep(v); setEditing(false); }}
        />
      )}
    </section>
  );
}
