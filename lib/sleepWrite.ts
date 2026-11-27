import { tr } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { parseIsoDate } from "@/lib/validate";
import { SLEEP_MAX_MIN, SLEEP_MIN_MIN, sanitizeTags, type SleepRecord } from "@/lib/sleep";
import { checkOptionalNumber } from "@/lib/numberLimits";

// اعتبارسنجی و ذخیره‌ی یک شب خواب — تک‌منبع مشترک بین POST /api/sleep و
// دستیار نومو (lib/nomoApply.ts)، تا دو مسیر هیچ‌وقت از هم دریفت نکنن.

export type SleepRow = {
  date: Date; sleptAt: Date | null; wokeAt: Date | null; quality: number | null; note: string | null;
  latencyMin: number | null; awakenings: number | null; napMin: number | null; tags: string[];
};
export const SLEEP_ROW_SELECT = {
  date: true, sleptAt: true, wokeAt: true, quality: true, note: true,
  latencyMin: true, awakenings: true, napMin: true, tags: true,
} as const;

export function sleepRowToRecord(r: SleepRow): SleepRecord | null {
  if (!r.sleptAt || !r.wokeAt) return null;
  const d = r.date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    sleptAt: r.sleptAt.toISOString(),
    wokeAt: r.wokeAt.toISOString(),
    quality: r.quality,
    note: r.note,
    latencyMin: r.latencyMin,
    awakenings: r.awakenings,
    napMin: r.napMin,
    tags: r.tags ?? [],
  };
}

export type SleepInput = {
  date?: unknown; sleptAt?: unknown; wokeAt?: unknown; quality?: unknown; note?: unknown;
  latencyMin?: unknown; awakenings?: unknown; napMin?: unknown; tags?: unknown;
};

/** رشته = پیام خطای قابل‌نمایش؛ وگرنه ردیف ذخیره‌شده */
export async function saveSleepEntry(userId: string, b: SleepInput): Promise<string | { entry: SleepRecord | null }> {
  const date = parseIsoDate(b.date);
  const sleptAt = typeof b.sleptAt === "string" ? new Date(b.sleptAt) : null;
  const wokeAt = typeof b.wokeAt === "string" ? new Date(b.wokeAt) : null;
  if (!date || !sleptAt || !wokeAt || Number.isNaN(sleptAt.getTime()) || Number.isNaN(wokeAt.getTime())) {
    return tr("زمان خواب یا بیداری نامعتبر است", "Invalid sleep or wake time");
  }
  const minutes = (wokeAt.getTime() - sleptAt.getTime()) / 60000;
  if (minutes < SLEEP_MIN_MIN || minutes > SLEEP_MAX_MIN) {
    return tr("مدت خواب باید بین 30 دقیقه تا 20 ساعت باشد", "Sleep duration must be between 30 minutes and 20 hours");
  }
  if (wokeAt.getTime() > Date.now() + 12 * 3600_000) {
    return tr("زمان بیداری در آینده است", "Wake time is in the future");
  }
  // روز ثبت باید همون حوالی بیداری باشه (±۱ روز برای اختلاف منطقه‌ی زمانی)
  if (Math.abs(wokeAt.getTime() - date.getTime()) > 2 * 86_400_000) {
    return tr("تاریخ با زمان بیداری جور نیست", "The date does not match the wake time");
  }
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 200) : null;
  // عددهای اختیاری: خالی = ندارد؛ بیرون از بازه‌ی جدول مشترک (lib/numberLimits.ts) = خطا
  const quality = checkOptionalNumber(b.quality, "sleepQuality");
  const latency = checkOptionalNumber(b.latencyMin, "sleepLatency");
  const awake = checkOptionalNumber(b.awakenings, "sleepAwakenings");
  const nap = checkOptionalNumber(b.napMin, "sleepNap");
  for (const c of [quality, latency, awake, nap]) {
    if (!c.ok) return c.error;
  }
  const latencyMin = latency.ok ? latency.value : null;
  const awakenings = awake.ok ? awake.value : null;
  const napMin = nap.ok ? nap.value : null;
  const tags = sanitizeTags(b.tags);
  const data = { sleptAt, wokeAt, quality: quality.ok ? quality.value : null, note, latencyMin, awakenings, napMin, tags };

  const row = await prisma.sleepEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
    select: SLEEP_ROW_SELECT,
  });
  return { entry: sleepRowToRecord(row) };
}
