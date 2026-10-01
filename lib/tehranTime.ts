import { toJalali, J_MONTHS } from "@/lib/jalali";

const TEHRAN_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** اجزای تقویم میلادی یک لحظه به وقت تهران (ارقام لاتین) */
export function tehranParts(d: Date) {
  const o: Record<string, number> = {};
  for (const p of TEHRAN_PARTS.formatToParts(d)) if (p.type !== "literal") o[p.type] = parseInt(p.value, 10);
  return { year: o.year, month: o.month, day: o.day, hour: o.hour % 24, minute: o.minute };
}

/** «5 مهر · 14:07» — تاریخ جلالی و ساعت به وقت تهران، ارقام انگلیسی */
export function formatTehranDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const p = tehranParts(d);
  const [, jm, jd] = toJalali(p.year, p.month, p.day);
  return `${jd} ${J_MONTHS[jm - 1]} · ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** دیرترین تاریخ بین چند مقدار (null/نامعتبر نادیده گرفته می‌شود) */
export function latestDate(...ds: (Date | string | null | undefined)[]): Date | null {
  let best: Date | null = null;
  for (const v of ds) {
    if (!v) continue;
    const d = typeof v === "string" ? new Date(v) : v;
    if (isNaN(d.getTime())) continue;
    if (!best || d.getTime() > best.getTime()) best = d;
  }
  return best;
}
