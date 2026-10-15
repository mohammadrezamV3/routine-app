"use client";
// بارگذاری تنبل دیتای انگلیسی حرکات (docs/i18n.md). دیکشنری انگلیسی
// (`exerciseCatalogData/en/*`، حدود 280KB مینیفای) و کاتالوگ فارسی کامل
// (حدود 500KB) هیچ‌وقت توی باندل اولیه‌ی صفحه‌ها نمی‌شینن: فقط در زبان
// انگلیسی و بعد از اولین رندر با import() پویا میان و کامپوننت‌هایی که
// `useExerciseEn()` رو صدا می‌زنن بعد از آماده‌شدن دوباره رندر می‌شن.
// در حالت فارسی هیچ چیزی لود نمی‌شه.
import { useSyncExternalStore } from "react";
import { isEn } from "./i18n";
import type { ExerciseEn } from "./exerciseCatalogData/en/types";
import type { ExerciseCatalogEntry } from "./exerciseCatalogMeta";

type EnMap = Record<string, ExerciseEn>;
type FindEntry = (item: string) => ExerciseCatalogEntry | undefined;

let enMap: EnMap | null = null;
let enPromise: Promise<void> | null = null;
let findEntry: FindEntry | null = null;
let findPromise: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function bump() {
  version += 1;
  listeners.forEach((l) => l());
}

/** دیکشنری انگلیسی اگه لود شده باشه (همزمان)؛ وگرنه null. */
export function getExerciseEnMap(): EnMap | null {
  return enMap;
}

/** تطبیق اسم با کاتالوگ فارسی اگه لود شده باشه؛ وگرنه null. */
export function getFindCatalogEntry(): FindEntry | null {
  return findEntry;
}

/** دیکشنری انگلیسی حرکات رو (یک بار) لود می‌کنه. */
export function loadExerciseEn(): Promise<void> {
  if (enMap) return Promise.resolve();
  if (!enPromise) {
    enPromise = import("./exerciseCatalogData/en")
      .then((m) => {
        enMap = m.EXERCISE_EN;
        bump();
      })
      .catch(() => {
        enPromise = null;
      });
  }
  return enPromise;
}

/** کاتالوگ کامل (برای نام‌های مستعار / اسم انگلیسی AI) رو فقط وقتی لازمه لود می‌کنه. */
export function loadCatalogLookup(): Promise<void> {
  if (findEntry) return Promise.resolve();
  if (!findPromise) {
    findPromise = import("./exerciseCatalogUtils")
      .then((m) => {
        findEntry = m.findCatalogEntry;
        bump();
      })
      .catch(() => {
        findPromise = null;
      });
  }
  return findPromise;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * هوک: در انگلیسی لود دیکشنری رو شروع می‌کنه و با آماده‌شدنش کامپوننت رو
 * دوباره رندر می‌کنه. در فارسی هیچ کاری نمی‌کنه. سمت سرور و اولین رندر
 * کلاینت هر دو «لود نشده» رو می‌بینن، پس hydration یکسانه.
 */
export function useExerciseEn(): number {
  if (typeof window !== "undefined" && isEn() && !enMap) void loadExerciseEn();
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}

/** پیش‌لود بی‌صدا (بعد از اولین رندر) برای زبان انگلیسی. */
export function preloadExerciseEn(): void {
  if (typeof window !== "undefined" && isEn()) void loadExerciseEn();
}
