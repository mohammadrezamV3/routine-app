"use client";

import { useCallback, useEffect, useState } from "react";
import { getNotificationPermission, requestNotificationPermission } from "./notifications";
import {
  getMedications, setMedications, setMedicationsChecked, type Medication,
} from "./medications";

// منطق مشترک لیست داروها برای کارت‌های داشبورد (DashMedicationCard و
// DashboardMedication): خواندن، ذخیره‌ی بررسی‌شده (خطا به فرم برمی‌گرده)،
// حذف و خاموش/روشن‌کردن اعلان. یک جا، بدون کپی.
export function useMedications() {
  const [meds, setMeds] = useState<Medication[] | null>(null);
  useEffect(() => { getMedications().then(setMeds); }, []);

  const persist = useCallback(async (next: Medication[]) => {
    setMeds(next);
    await setMedications(next);
  }, []);

  // اگه ذخیره واقعا شکست بخوره (شبکه/سرور)، فرم باید بفهمه
  const saveMedication = useCallback(async (med: Medication) => {
    const current = meds ?? [];
    const next = current.some((m) => m.id === med.id) ? current.map((m) => (m.id === med.id ? med : m)) : [...current, med];
    const result = await setMedicationsChecked(next);
    if (!result.ok) throw new Error(result.error);
    setMeds(next);
    // بدون اجازه‌ی نوتیف مرورگر، این یادآوری‌ها هیچ‌وقت دیده نمی‌شن
    if (getNotificationPermission() !== "granted") await requestNotificationPermission();
  }, [meds]);

  const removeMedication = useCallback((id: string) => persist((meds ?? []).filter((m) => m.id !== id)), [meds, persist]);

  const toggleNotify = useCallback(async (med: Medication) => {
    const next = med.notify === false;
    if (next && getNotificationPermission() !== "granted") await requestNotificationPermission();
    await persist((meds ?? []).map((m) => (m.id === med.id ? { ...m, notify: next } : m)));
  }, [meds, persist]);

  return { meds, saveMedication, removeMedication, toggleNotify };
}
