"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, MoreVertical, Pencil, Tablets, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { MedicationForm } from "./MedicationForm";
import { isoLocal } from "@/lib/jalali";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import {
  Medication, MAX_MEDICATIONS, doseIntervalHours, doseMinutesOfDay, getMedications,
  medicationDaysLeft, minutesToDoseTime, setMedications,
} from "@/lib/medications";

const todayIso = isoLocal(new Date());

function intervalLabel(med: Medication): string {
  const h = doseIntervalHours(med);
  return `هر ${h % 1 === 0 ? h : h.toFixed(1)} ساعت`;
}

// «یادآوری دارو» — کارت داشبورد روتین. کاربر اسم دارو، تعداد دفعات در روز
// و طول دوره رو می‌ده و از همون‌جا برای هر نوبت اعلان می‌گیره
// (خود اعلان توسط NotificationEngine فرستاده می‌شه). منوی سه‌نقطه‌ی کنار
// اسم هر دارو، ویرایش/حذف رو می‌ده. کل این کارت از «تنظیمات» قابل
// خاموش‌شدنه (dashboardPrefs.showMedications).
export function DashMedicationCard({ delay }: { delay?: number }) {
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getMedications().then(setMeds); }, []);

  useEffect(() => {
    if (!menuFor) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuFor(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuFor]);

  async function persist(next: Medication[]) {
    setMeds(next);
    await setMedications(next);
  }

  async function saveMedication(med: Medication) {
    const current = meds ?? [];
    const exists = current.some((m) => m.id === med.id);
    await persist(exists ? current.map((m) => (m.id === med.id ? med : m)) : [...current, med]);
    // بدون اجازه‌ی نوتیف مرورگر، این یادآوری‌ها هیچ‌وقت دیده نمی‌شن
    if (getNotificationPermission() !== "granted") await requestNotificationPermission();
  }

  async function removeMedication(id: string) {
    setMenuFor(null);
    await persist((meds ?? []).filter((m) => m.id !== id));
  }

  async function toggleNotify(med: Medication) {
    const next = med.notify === false;
    if (next && getNotificationPermission() !== "granted") await requestNotificationPermission();
    await persist((meds ?? []).map((m) => (m.id === med.id ? { ...m, notify: next } : m)));
  }

  function openMenu(e: React.MouseEvent, id: string) {
    if (menuFor === id) { setMenuFor(null); return; }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setMenuFor(id);
  }

  const list = meds ?? [];
  const canAdd = list.length < MAX_MEDICATIONS;

  return (
    <>
      <DashCard delay={delay}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text sm:text-[15px]">
            <Tablets className="h-4 w-4 text-dash-green sm:h-[18px] sm:w-[18px]" />
            یادآوری دارو
          </h2>
          {canAdd && (
            <button
              type="button"
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="flex items-center gap-1 bg-transparent p-0 text-[11.5px] font-semibold text-dash-green transition hover:brightness-110 sm:gap-1.5 sm:text-[13px]"
            >
              <Plus className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
              افزودن
            </button>
          )}
        </div>

        <div className="no-scrollbar mt-3 flex max-h-[300px] flex-col gap-2 overflow-y-auto sm:mt-4 sm:max-h-[360px] sm:gap-2.5">
          {meds === null ? (
            <div className="text-[11px] text-dash-muted sm:text-[12px]">در حال بارگذاری…</div>
          ) : list.length === 0 ? (
            <div className="text-[11px] leading-relaxed text-dash-muted sm:text-[12px]">
              دارویی ثبت نشده. با «افزودن»، اسم دارو و تعداد دفعاتش در روز رو بده تا سر هر نوبت بهت اطلاع بدیم.
            </div>
          ) : (
            list.map((m) => {
              const daysLeft = medicationDaysLeft(m, todayIso);
              const finished = daysLeft === 0;
              const times = doseMinutesOfDay(m).map(minutesToDoseTime);
              const notifyOn = m.notify !== false;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "med-row flex items-center gap-2 rounded-2xl border border-dash-border px-3 py-2.5 text-right sm:gap-2.5 sm:px-3.5 sm:py-3",
                    finished && "opacity-55"
                  )}
                >
                  {/* سه‌نقطه سمت راست اسم دارو (اولین فرزند DOM توی RTL) */}
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label={`گزینه‌های ${m.name}`}
                      onClick={(e) => openMenu(e, m.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-transparent p-0 text-dash-muted transition hover:text-dash-text"
                    >
                      <MoreVertical className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11.5px] font-semibold text-dash-text sm:text-[13.5px]">{m.name}</span>
                      <span className="shrink-0 text-[9.5px] font-semibold text-dash-muted sm:text-[11px]">{intervalLabel(m)}</span>
                    </div>
                    <div className="mt-1 truncate text-[9.5px] text-dash-muted sm:text-[11px]">
                      <span className="mono" dir="ltr">{times.join(" · ")}</span>
                      <span className="mx-1.5">·</span>
                      {finished ? "دوره تموم شده" : `${daysLeft} روز مونده`}
                    </div>
                    {m.note && <div className="mt-0.5 truncate text-[9.5px] text-dash-muted sm:text-[10.5px]">{m.note}</div>}
                  </div>

                  <span
                    role="button"
                    aria-label={notifyOn ? `خاموش‌کردن یادآوری ${m.name}` : `روشن‌کردن یادآوری ${m.name}`}
                    onClick={() => toggleNotify(m)}
                    className={cn(
                      "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl transition hover:brightness-125 sm:h-9 sm:w-9",
                      // زنگوله‌ی خاموش بک‌گراند نداره — همون قاعده‌ی کارت یادآوری‌ها
                      notifyOn ? "bg-dash-green/15 text-dash-green" : "bg-transparent text-dash-muted"
                    )}
                  >
                    <Bell className="h-[13px] w-[13px] sm:h-[15px] sm:w-[15px]" fill={notifyOn ? "currentColor" : "none"} />
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DashCard>

      {menuFor && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPos.top, right: menuPos.right }}
          className="dash-context-menu fixed z-[70] min-w-[140px] overflow-hidden rounded-2xl border border-dash-border p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
        >
          <div
            onClick={() => {
              const med = list.find((m) => m.id === menuFor) || null;
              setMenuFor(null);
              setEditing(med);
              setFormOpen(true);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] text-dash-text transition hover:bg-white/5 sm:text-[13px]"
          >
            <Pencil size={13} className="shrink-0" />
            ویرایش دارو
          </div>
          <div
            onClick={() => removeMedication(menuFor)}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-right text-[12px] text-[#E05252] transition hover:bg-[#E05252]/10 sm:text-[13px]"
          >
            <Trash2 size={13} className="shrink-0" />
            حذف دارو
          </div>
        </div>,
        document.body
      )}

      {formOpen && createPortal(
        <MedicationForm
          initial={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={saveMedication}
        />,
        document.body
      )}
    </>
  );
}
