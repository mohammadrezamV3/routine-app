// ردیاب زنده‌ی خواب: «دارم می‌خوابم» لحظه‌ی شروع رو روی همین دستگاه نگه می‌داره
// و «بیدار شدم» از روش یک شب کامل می‌سازه (بعد از تایید کاربر در فرم ثبت).
// عمدا فقط localStorage: یک لحظه‌ی موقته، نه داده‌ی ماندگار؛ خود شب با
// saveSleep (lib/storage.ts) همون قرارداد مهمان/کاربر رو می‌گیره.

import { isoLocal } from "./jalali";
import { SLEEP_MAX_MIN, SLEEP_MIN_MIN } from "./sleep";

const KEY = "arion:sleepTracking";
export const TRACKER_EVENT = "arion:sleep-tracker";

export type SleepTracking = { startedAt: string };

export function getTracking(): SleepTracking | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SleepTracking;
    const t = new Date(v?.startedAt).getTime();
    // ردیابی رهاشده (بیش از سقف خواب) خودش پاک می‌شه
    if (!Number.isFinite(t) || Date.now() - t > SLEEP_MAX_MIN * 60000) { localStorage.removeItem(KEY); return null; }
    return v;
  } catch {
    return null;
  }
}

export function startTracking(at = new Date()): void {
  try { localStorage.setItem(KEY, JSON.stringify({ startedAt: at.toISOString() })); } catch { /* ذخیره‌سازی بسته */ }
  try { window.dispatchEvent(new Event(TRACKER_EVENT)); } catch { /* */ }
}

export function stopTracking(): void {
  try { localStorage.removeItem(KEY); } catch { /* */ }
  try { window.dispatchEvent(new Event(TRACKER_EVENT)); } catch { /* */ }
}

/**
 * شب پیشنهادی از ردیابی: شروع = لحظه‌ی «دارم می‌خوابم»، پایان = الان، تاریخ =
 * روز بیداری. اگه کمتر از حداقل خواب باشه null (احتمالا اشتباهی زده شده).
 */
export function draftFromTracking(t: SleepTracking, now = new Date()): { date: string; sleptAt: string; wokeAt: string } | null {
  const s = new Date(t.startedAt);
  const min = (now.getTime() - s.getTime()) / 60000;
  if (min < SLEEP_MIN_MIN || min > SLEEP_MAX_MIN) return null;
  return { date: isoLocal(now), sleptAt: s.toISOString(), wokeAt: now.toISOString() };
}
