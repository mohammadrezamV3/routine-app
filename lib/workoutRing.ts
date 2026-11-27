"use client";

// ذخیره‌ی کوچک مشترک برای حلقه‌ی بالای صفحه‌های /exercise و /calorie.
// ExerciseDashboard و CaloriePanel عدد امروز رو همین‌جا منتشر می‌کنن (و موقع
// unmount پاک می‌کنن) و WorkoutRingHero فقط می‌خونه — بدون هیچ درخواست جدید.
import { useSyncExternalStore } from "react";

export type WorkoutRingKind = "exercise" | "calorie";
export type WorkoutRingData = {
  kind: WorkoutRingKind;
  /** 0 تا 1 */
  value: number;
  /** عدد وسط حلقه (رشته‌ی آماده، رقم لاتین) */
  display: string;
  /** برچسب زیر حلقه */
  label: string;
  /** کالری: از هدف گذشته */
  over?: boolean;
};

let current: WorkoutRingData | null = null;
const listeners = new Set<() => void>();

export function publishWorkoutRing(d: WorkoutRingData | null) {
  if (current === d) return;
  if (current && d && current.kind === d.kind && current.value === d.value && current.display === d.display && current.label === d.label && current.over === d.over) return;
  current = d;
  listeners.forEach((l) => l());
}

/** فقط اگه همین نوع هنوز منتشر شده باشه پاک می‌کنه (جلوی پاک‌کردن مقدار صفحه‌ی بعدی) */
export function clearWorkoutRing(kind: WorkoutRingKind) {
  if (current?.kind === kind) publishWorkoutRing(null);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useWorkoutRing(kind: WorkoutRingKind): WorkoutRingData | null {
  return useSyncExternalStore(
    subscribe,
    () => (current && current.kind === kind ? current : null),
    () => null,
  );
}
