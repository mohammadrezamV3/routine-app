// نگهبان اسم حرکت‌های برنامه‌ی ورزشی AI: فقط حرکت‌های رایج و شناخته‌شده‌ی
// باشگاهی (کاتالوگ lib/exerciseCatalog.ts) باید به برنامه برسن. اسم ناشناخته
// یا به نزدیک‌ترین حرکت کاتالوگ تبدیل می‌شه یا حذف می‌شه. توابع این فایل
// خالص و تست‌دارن؛ فقط در کد سرور استفاده بشه (کاتالوگ کامل رو میاره).

import { EXERCISE_CATALOG, getExerciseEquipment, exerciseNameKey, type ExerciseCatalogEntry, type ExerciseEquipment } from "./exerciseCatalog";
import { findCatalogEntry } from "./exerciseCatalogUtils";

const norm = (s: string) => s.replace(/[\s‌\-–—_()]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");

/** حداقل شباهت کلمه‌ای برای قبول «نزدیک‌ترین حرکت کاتالوگ» */
export const MIN_NAME_SIMILARITY = 0.6;

function words(s: string): string[] {
  return s
    .replace(/[يی]/g, "ی").replace(/[كک]/g, "ک")
    .replace(/[‌\-–—_()«»"'.،,/]+/g, " ")
    .toLowerCase().split(/\s+/).filter(Boolean);
}

/** شباهت کلمه‌ای (Jaccard) بین دو اسم، 0 تا 1 */
export function nameSimilarity(a: string, b: string): number {
  const wa = new Set(words(a)), wb = new Set(words(b));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  wa.forEach((w) => { if (wb.has(w)) inter++; });
  return inter / (wa.size + wb.size - inter);
}

/** نزدیک‌ترین حرکت کاتالوگ به یک اسم؛ تطابق دقیق/نام دیگر اول، بعد شباهت کلمه‌ای. */
export function closestCatalogEntry(name: string): ExerciseCatalogEntry | undefined {
  const exact = findCatalogEntry(name);
  if (exact) return exact;
  let best: ExerciseCatalogEntry | undefined;
  let bestScore = 0;
  for (const e of EXERCISE_CATALOG) {
    for (const n of [e.name, ...(e.aliases ?? [])]) {
      const s = nameSimilarity(name, n);
      if (s > bestScore) { bestScore = s; best = e; }
    }
  }
  return bestScore >= MIN_NAME_SIMILARITY ? best : undefined;
}

export type ConformResult = { exercises: any[]; replaced: number; dropped: number; fellBack: boolean };

/**
 * اسم هر حرکت خروجی مدل را با کاتالوگ یکی می‌کند: اسم شناخته‌شده به اسم اصلی
 * کاتالوگ، اسم نزدیک به نزدیک‌ترین حرکت، اسم ناشناخته حذف می‌شود؛ تکراری‌های
 * حاصل هم حذف می‌شوند. اگر بیشتر از نصف حرکت‌ها ناشناخته بودند (مثلا کاتالوگ
 * پوشش نمی‌دهد) خروجی دست‌نخورده می‌ماند تا برنامه خالی نشود.
 */
export function conformExercisesToCatalog(raw: unknown): ConformResult {
  if (!Array.isArray(raw)) return { exercises: [], replaced: 0, dropped: 0, fellBack: false };
  const out: any[] = [];
  const seen = new Set<string>();
  let replaced = 0, dropped = 0;
  for (const ex of raw) {
    const name = typeof ex === "string" ? ex : typeof ex?.name === "string" ? ex.name : "";
    const entry = name.trim() ? closestCatalogEntry(name.trim()) : undefined;
    if (!entry) { dropped++; continue; }
    const key = exerciseNameKey(entry.name);
    if (seen.has(key)) { dropped++; continue; }
    seen.add(key);
    if (entry.name !== name.trim()) replaced++;
    out.push(typeof ex === "string" ? entry.name : { ...ex, name: entry.name });
  }
  if (!out.length || out.length * 2 < raw.length) return { exercises: raw, replaced: 0, dropped: 0, fellBack: true };
  return { exercises: out, replaced, dropped, fellBack: false };
}

const COMMON_EQUIPMENT: ExerciseEquipment[] = ["barbell", "dumbbell", "machine", "cable", "smith", "bodyweight"];

/** اسم حرکت‌های رایج کاتالوگ برای عضله‌ها (برای فهرست‌دادن در پرامپت)، به ترتیب کاتالوگ. */
export function commonCatalogNamesFor(muscles: string[], perMuscle = 25): string[] {
  const out: string[] = [];
  for (const m of muscles) {
    const target = norm(m).replace(/^پشتران$/, "همسترینگ").replace(/^ساق$/, "ساقپا");
    if (!target) continue;
    let n = 0;
    for (const e of EXERCISE_CATALOG) {
      if (n >= perMuscle) break;
      const primary = norm(e.muscleGroup.split("،")[0]);
      const ok = primary.startsWith(target) && !(target === "پشت" && primary.startsWith("پشتبازو"));
      if (!ok || !COMMON_EQUIPMENT.includes(getExerciseEquipment(e)) || out.includes(e.name)) continue;
      out.push(e.name);
      n++;
    }
  }
  return out;
}
