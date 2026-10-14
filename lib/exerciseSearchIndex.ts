"use client";
// ایندکس جستجوی کاتالوگ حرکات برای پاپ‌آپ «مشاهده حرکات» و فرم برنامه‌ی دستی.
// فقط از همین دو تکه‌ی تنبل (next/dynamic) وارد می‌شه، چون کل کاتالوگ رو
// می‌کشه. جستجو به فارسی و انگلیسی مستقل از زبان جاری کار می‌کنه: دیکشنری
// انگلیسی در حالت فارسی فقط وقتی لود می‌شه که کاربر حرف لاتین تایپ کنه (در
// حالت انگلیسی از قبل لود شده).
import { useEffect, useMemo } from "react";
import {
  EXERCISE_CATALOG,
  ExerciseCatalogEntry,
  ExerciseEquipment,
  exerciseSearchText,
  getExerciseDifficulty,
  getExerciseEquipment,
} from "./exerciseCatalog";
import { normalizeFa } from "./utils";
import { getExerciseEnMap, loadExerciseEn, useExerciseEn } from "./exerciseEnStore";

export type IndexedExercise = {
  entry: ExerciseCatalogEntry;
  text: string;
  equipment: ExerciseEquipment;
  level: number;
};

// متن جستجو و تجهیزات هر حرکت یک بار برای کل کاتالوگ ساخته می‌شه (نه با هر
// حرف تایپ‌شده) — با 700+ حرکت این فرق محسوسه. بعد از رسیدن دیکشنری
// انگلیسی یک بار دوباره ساخته می‌شه.
let cached: IndexedExercise[] | null = null;
let cachedWithEn = false;

function getIndex(): IndexedExercise[] {
  const en = getExerciseEnMap();
  if (cached && (cachedWithEn || !en)) return cached;
  cached = EXERCISE_CATALOG.map((entry) => ({
    entry,
    text: normalizeFa(`${exerciseSearchText(entry)} | ${en?.[entry.name]?.name ?? ""} | ${en?.[entry.name]?.muscleGroup ?? ""}`),
    equipment: getExerciseEquipment(entry),
    level: getExerciseDifficulty(entry),
  }));
  cachedWithEn = !!en;
  return cached;
}

export function useExerciseSearchIndex(query: string): IndexedExercise[] {
  const version = useExerciseEn();
  useEffect(() => {
    if (/[a-z]/i.test(query)) void loadExerciseEn();
  }, [query]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getIndex(), [version]);
}
