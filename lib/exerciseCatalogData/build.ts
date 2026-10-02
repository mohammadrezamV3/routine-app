import type { ExerciseCatalogEntry, ExerciseEquipment, MovementPattern, MuscleKey } from "../exerciseCatalogMeta";

type Extra = { equipment?: ExerciseEquipment; level?: number; aliases?: string[] };

/**
 * سازنده‌ی فشرده‌ی یک حرکت — فقط برای کوتاه‌ماندن فایل‌های دیتا.
 * `aliases`: اسم‌های دیگه با «|» جدا (معمولا اسم انگلیسی رایج).
 */
export function x(
  name: string,
  aliases: string,
  muscleGroup: string,
  muscleKeys: MuscleKey[],
  pattern: MovementPattern,
  howTo: string[],
  benefits: string,
  extra: Extra = {},
): ExerciseCatalogEntry {
  const list = [
    ...aliases.split("|").map((a) => a.trim()).filter(Boolean),
    ...(extra.aliases ?? []),
  ];
  const entry: ExerciseCatalogEntry = { name, muscleGroup, muscleKeys, pattern, howTo, benefits };
  if (list.length) entry.aliases = list;
  if (extra.equipment) entry.equipment = extra.equipment;
  if (extra.level) entry.level = extra.level;
  return entry;
}
