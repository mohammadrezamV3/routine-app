"use client";

// کارت «دارو» داشبورد روتین: نوبت‌های دارویی امروز با تیک «خوردم» (TickButton) و
// افزودن دارو با همون MedicationForm. لیست و ذخیره‌ی داروها از useMedications
// (همون منطق کارت یادآوری دارو)، نوبت‌ها و تیک‌ها از lib/medicationDoses.ts.
// داشبورد فقط همین تیک و افزودن رو داره؛ ویرایش/حذف در کارت یادآوری دارو (/weekly).

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { BentoCard, CardHead, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";
import { TickButton } from "./TickButton";
import { faNum, isoLocal } from "@/lib/jalali";
import { MAX_MEDICATIONS } from "@/lib/medications";
import { useMedications } from "@/lib/useMedications";
import { dosesOnDay, nextPendingDose, toggleDose, type DoseLog } from "@/lib/medicationDoses";
import { getDoseLog, setDoseLog } from "@/lib/medicationDoseStore";
import { useLiveRefresh } from "@/lib/liveSync";
import { tr } from "@/lib/i18n";

const MedicationForm = dynamic(() => import("./MedicationForm").then((m) => m.MedicationForm), { ssr: false });

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function DashboardMedication() {
  const { meds, saveMedication } = useMedications();
  const [log, setLog] = useState<DoseLog | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [today, setToday] = useState(() => isoLocal(new Date()));
  const [nowMin, setNowMin] = useState(nowMinutes);

  useEffect(() => { getDoseLog().then(setLog).catch(() => setLog({})); }, []);
  useLiveRefresh(["medicationDoses"], () => { getDoseLog().then(setLog).catch(() => {}); });
  useEffect(() => {
    const t = setInterval(() => { setNowMin(nowMinutes()); setToday((p) => { const n = isoLocal(new Date()); return n === p ? p : n; }); }, 30_000);
    return () => clearInterval(t);
  }, []);

  const slots = useMemo(() => dosesOnDay(meds ?? [], today), [meds, today]);
  const taken = log?.[today] ?? [];
  const next = useMemo(() => nextPendingDose(slots, taken, nowMin), [slots, taken, nowMin]);
  const doneCount = slots.filter((s) => taken.includes(s.key)).length;

  const toggle = useCallback((key: string) => {
    setLog((prev) => {
      const nextLog = toggleDose(prev ?? {}, today, key);
      void setDoseLog(nextLog);
      return nextLog;
    });
  }, [today]);

  const ready = meds !== null && log !== null;
  const canAdd = (meds?.length ?? 0) < MAX_MEDICATIONS;
  const addBtn = canAdd && (
    <button type="button" className="btn btn-ghost btn-sm db-med-add" onClick={() => setFormOpen(true)}>
      <Plus aria-hidden width={16} height={16} />
      <span>{tr("افزودن دارو", "Add medication")}</span>
    </button>
  );

  return (
    <BentoCard area="meds" className="db-med" label={tr("دارو", "Medication")}>
      <CardHead
        icon="pill"
        title={tr("دارو", "Medication")}
        extra={ready && slots.length > 0 ? <span className="db-med-count" dir="ltr">{faNum(doneCount)}/{faNum(slots.length)}</span> : undefined}
      />
      {!ready ? (
        <Skel w="100%" h={90} r={12} />
      ) : (meds ?? []).length === 0 ? (
        <div className="db-empty">
          <span className="db-empty-icon"><DashIcon name="pill" /></span>
          <p>{tr("دارویی ثبت نشده. اسم دارو و تعداد دفعاتش رو بده تا نوبت‌های امروز و یادآوری‌هاش این‌جا بیاد.", "No medications yet. Add a medication and its doses to see today's doses and reminders here.")}</p>
          {addBtn}
        </div>
      ) : slots.length === 0 ? (
        <div className="db-empty">
          <p>{tr("امروز نوبت دارویی نداری.", "No doses due today.")}</p>
          {addBtn}
        </div>
      ) : (
        <>
          <ul className="db-med-list" aria-label={tr("نوبت‌های دارویی امروز", "Today's doses")}>
            {slots.map((s) => {
              const done = taken.includes(s.key);
              const overdue = !done && s.minutes < nowMin - 30;
              return (
                <li key={s.key} className={`db-med-row${done ? " is-done" : ""}${next?.key === s.key ? " is-next" : ""}`}>
                  <TickButton
                    checked={done}
                    size={22}
                    state={overdue ? "missed" : "idle"}
                    onToggle={() => toggle(s.key)}
                    label={`${done ? tr("برداشتن تیک", "Untick") : tr("خوردم", "Mark taken")} ${s.name} ${s.time}`}
                  />
                  <span className="db-med-name">{s.name}{s.note ? <small>{s.note}</small> : null}</span>
                  <span className="db-med-time" dir="ltr">{faNum(s.time)}</span>
                </li>
              );
            })}
          </ul>
          <div className="db-med-foot">{addBtn}</div>
        </>
      )}
      {formOpen && createPortal(
        <MedicationForm initial={null} onClose={() => setFormOpen(false)} onSave={saveMedication} />,
        document.body,
      )}
    </BentoCard>
  );
}
