"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2 } from "lucide-react";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes, WakeSleepTimes } from "@/lib/wakeSleep";
import { WakeSleepSetup } from "@/components/WakeSleepSetup";
import { tr } from "@/lib/i18n";
import { AccountBlock, AccountOption } from "@/components/AccountUI";

// تنظیمات بخش «روتین» — مثل ترید، یک بخش با یک قاب؛ بالای هر گزینه فقط
// اسم خودش (نه یک کارت مستقل برای هرکدام).
export function RoutineSettings() {
  const [wakeSleep, setWakeSleep] = useState<WakeSleepTimes | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => { getWakeSleepTimes().then(setWakeSleep); }, []);

  return (
    <AccountBlock icon={<CalendarCheck2 size={15} />} title={tr("روتین", "Routine")} index={2}>
      <AccountOption label={tr("ساعت بیداری و خواب", "Wake and sleep times")}>
        <div className="item-line">
          {tr("بیداری", "Wake")} <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.wake || DEFAULT_WAKE}</b>
          {" — "}{tr("خواب", "Sleep")} <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.sleep || DEFAULT_SLEEP}</b>
        </div>
        <button className="account-outline-btn" onClick={() => setEditing(true)} style={{ marginTop: 10 }}>
          {tr("تغییر ساعت‌ها", "Change times")}
        </button>
      </AccountOption>

      {editing && (
        <WakeSleepSetup
          initial={wakeSleep}
          onClose={() => setEditing(false)}
          onDone={(v) => { setWakeSleep(v); setEditing(false); }}
        />
      )}
    </AccountBlock>
  );
}
