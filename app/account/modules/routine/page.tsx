"use client";

import { useEffect, useState } from "react";
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

      <div className="tm-extra">
        <div className="domain-sub">ساعت بیداری و خواب</div>
        <div className="item-line" style={{ textAlign: "center" }}>
          بیداری <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.wake || DEFAULT_WAKE}</b>
          {" — "}خواب <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.sleep || DEFAULT_SLEEP}</b>
        </div>
        <button onClick={() => setEditing(true)} style={{ marginTop: 8, borderColor: "var(--accent)", color: "var(--accent)" }}>
          تغییر ساعت‌ها
        </button>
      </div>

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
