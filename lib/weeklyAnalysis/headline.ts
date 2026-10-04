import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain } from "./types";

// تیتر یک‌خطی هفته — قطعی، بدون AI، همیشه با عدد واقعی. تابع خالص.
// اگه داده کافی نباشه کمتر می‌گه، نه بیشتر.

export type HeadlineInput = {
  isCurrentWeek: boolean;
  daysElapsed: number; // 1..7 (برای هفته‌ی گذشته 7)
  score: number | null;
  prevScore: number | null;
  activeDays: number;
  dayScores: (number | null)[]; // ۷تایی؛ آینده null
  domains: { domain: AnalysisDomain; delta: number | null }[];
  /** میانگین ساعت خواب این هفته و هفته‌ی قبل (اگه ثبت شده) */
  sleepHours?: { cur: number | null; prev: number | null };
};

const GOOD_LINE = 70;
const r1 = (n: number) => Math.round(n * 10) / 10;

function daysClause(i: HeadlineInput): { text: string; positive: boolean } | null {
  const elapsed = i.isCurrentWeek ? Math.max(1, Math.min(7, i.daysElapsed)) : 7;
  const slice = i.dayScores.slice(0, elapsed);
  const scored = slice.filter((s) => s != null).length;
  if (scored < 3) return null;
  const n = slice.filter((s) => s != null && s >= GOOD_LINE).length;
  const pre = i.isCurrentWeek ? "تا الان " : "";
  if (n === 0) return { text: `${pre}هیچ روزی به ${GOOD_LINE} نرسیدی`, positive: false };
  if (n === elapsed) return { text: `${pre}هر ${elapsed} روز بالای ${GOOD_LINE} بودی`, positive: true };
  return { text: `${pre}${n} روز از ${elapsed} روز بالای ${GOOD_LINE} بودی`, positive: n * 2 >= elapsed };
}

function highlight(i: HeadlineInput): { text: string; positive: boolean } | null {
  const sh = i.sleepHours;
  if (sh && sh.cur != null && sh.prev != null) {
    const d = r1(sh.cur - sh.prev);
    if (Math.abs(d) >= 0.3) {
      return { text: `خوابت ${Math.abs(d)} ساعت ${d > 0 ? "بیشتر" : "کمتر"} شد`, positive: d > 0 };
    }
  }
  const movers = i.domains.filter((x) => x.delta != null && Math.abs(x.delta) >= 10).sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!));
  if (movers[0]) {
    const m = movers[0];
    const up = m.delta! > 0;
    return { text: `امتیاز ${ANALYSIS_DOMAIN_LABELS[m.domain]} ${Math.abs(m.delta!)} واحد ${up ? "بالا رفت" : "پایین اومد"}`, positive: up };
  }
  if (i.score != null && i.prevScore != null) {
    const d = i.score - i.prevScore;
    if (Math.abs(d) >= 5) {
      return { text: `امتیاز کلت ${Math.abs(d)} واحد ${d > 0 ? "بیشتر" : "کمتر"} از هفته‌ی قبل شد`, positive: d > 0 };
    }
  }
  return null;
}

export function buildHeadline(i: HeadlineInput): string {
  if (i.score == null || i.activeDays === 0) return "هنوز چیزی برای جمع‌بندی این هفته ثبت نشده";
  if (i.isCurrentWeek && i.daysElapsed <= 2) {
    return `هفته تازه شروع شده؛ تا الان ${i.activeDays} روز ثبت داشتی`;
  }
  if (i.activeDays <= 1) return `این هفته فقط ${i.activeDays} روز ثبت داشتی`;

  const a = daysClause(i);
  const b = highlight(i);
  if (a && b) return `${a.text} ${a.positive === b.positive ? "و" : "ولی"} ${b.text}`;
  if (a) return a.text;
  if (b) return `میانگین امتیازت ${i.score} شد و ${b.text}`;
  return `میانگین امتیازت ${i.score} شد، با ${i.activeDays} روز فعال`;
}
