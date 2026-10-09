import { tr } from "@/lib/i18n";
import { pl } from "./plural";
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
  const pre = i.isCurrentWeek ? tr("تا الان ", "so far ") : "";
  const soFar = i.isCurrentWeek ? " so far" : "";
  // انگلیسی: عبارت با حرف کوچیک شروع می‌شه و «so far» آخرش میاد؛ buildHeadline حرف اول رو بزرگ می‌کنه
  if (n === 0) return { text: tr(`${pre}هیچ روزی به ${GOOD_LINE} نرسیدی`, `you haven't reached ${GOOD_LINE} on any day${soFar}`), positive: false };
  if (n === elapsed) return { text: tr(`${pre}هر ${elapsed} روز بالای ${GOOD_LINE} بودی`, `you were above ${GOOD_LINE} on all ${elapsed} days${soFar}`), positive: true };
  return { text: tr(`${pre}${n} روز از ${elapsed} روز بالای ${GOOD_LINE} بودی`, `you were above ${GOOD_LINE} on ${n} of ${pl(elapsed, "day")}${soFar}`), positive: n * 2 >= elapsed };
}

function highlight(i: HeadlineInput): { text: string; positive: boolean } | null {
  const sh = i.sleepHours;
  if (sh && sh.cur != null && sh.prev != null) {
    const d = r1(sh.cur - sh.prev);
    if (Math.abs(d) >= 0.3) {
      return { text: tr(`خوابت ${Math.abs(d)} ساعت ${d > 0 ? "بیشتر" : "کمتر"} شد`, `you slept ${Math.abs(d)} ${Math.abs(d) === 1 ? "hour" : "hours"} ${d > 0 ? "more" : "less"}`), positive: d > 0 };
    }
  }
  const movers = i.domains.filter((x) => x.delta != null && Math.abs(x.delta) >= 10).sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!));
  if (movers[0]) {
    const m = movers[0];
    const up = m.delta! > 0;
    return { text: tr(`امتیاز ${ANALYSIS_DOMAIN_LABELS[m.domain]} ${Math.abs(m.delta!)} واحد ${up ? "بالا رفت" : "پایین اومد"}`, `your ${ANALYSIS_DOMAIN_LABELS[m.domain]} score ${up ? "went up" : "went down"} ${pl(Math.abs(m.delta!), "point")}`), positive: up };
  }
  if (i.score != null && i.prevScore != null) {
    const d = i.score - i.prevScore;
    if (Math.abs(d) >= 5) {
      return { text: tr(`امتیاز کلت ${Math.abs(d)} واحد ${d > 0 ? "بیشتر" : "کمتر"} از هفته‌ی قبل شد`, `your overall score is ${pl(Math.abs(d), "point")} ${d > 0 ? "higher" : "lower"} than last week`), positive: d > 0 };
    }
  }
  return null;
}

const up1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function buildHeadline(i: HeadlineInput): string {
  if (i.score == null || i.activeDays === 0) return tr("هنوز چیزی برای جمع‌بندی این هفته ثبت نشده", "Nothing has been logged yet to sum up this week");
  if (i.isCurrentWeek && i.daysElapsed <= 2) {
    return tr(`هفته تازه شروع شده؛ تا الان ${i.activeDays} روز ثبت داشتی`, `The week has just started; you have logged ${pl(i.activeDays, "day")} so far`);
  }
  if (i.activeDays <= 1) return tr(`این هفته فقط ${i.activeDays} روز ثبت داشتی`, `You logged only ${pl(i.activeDays, "day")} this week`);

  const a = daysClause(i);
  const b = highlight(i);
  if (a && b) return tr(`${a.text} ${a.positive === b.positive ? "و" : "ولی"} ${b.text}`, `${up1(a.text)}, ${a.positive === b.positive ? "and" : "but"} ${b.text}`);
  if (a) return tr(a.text, up1(a.text));
  if (b) return tr(`میانگین امتیازت ${i.score} شد و ${b.text}`, `Your average score is ${i.score} and ${b.text}`);
  return tr(`میانگین امتیازت ${i.score} شد، با ${i.activeDays} روز فعال`, `Your average score is ${i.score}, with ${pl(i.activeDays, "active day")}`);
}
