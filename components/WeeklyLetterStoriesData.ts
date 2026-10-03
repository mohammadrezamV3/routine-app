// منطق خالص «داستان هفته» (بدون React، تست‌دار): از snapshot هفته‌نامه فهرست
// اسلایدها رو می‌سازه. هر اسلایدی که داده‌اش نباشه اصلا ساخته نمی‌شه (رد می‌شه).
// کلاس accent رنگ همون اسلاید رو تعیین می‌کنه (همون --wl-da / --wl-db).
import type { AnalysisDomain, DayCell, Grade, WeekArchetype, WeekNumber } from "@/lib/weeklyAnalysis/types";
import type { LetterAchievement, WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { bestWorstIndex, dayRows, scoreBand, type DayRow } from "./WeeklyLetterUtils";

export type StoryBase = { dur: number; label: string; accent: string };

export type StorySlide =
  | (StoryBase & { id: "intro" })
  | (StoryBase & { id: "score"; score: number; grade: Grade | null; delta: number | null; prevScore: number | null; rank: { position: number; of: number } | null })
  | (StoryBase & { id: "archetype"; archetype: WeekArchetype })
  | (StoryBase & { id: "best"; day: DayCell; rows: DayRow[]; bars: { score: number | null; best: boolean; label: string }[] })
  | (StoryBase & { id: "domains"; top: { domain: AnalysisDomain; score: number; note: string }; riser: { domain: AnalysisDomain; delta: number } | null })
  | (StoryBase & { id: "numbers"; items: WeekNumber[] })
  | (StoryBase & { id: "streak"; streak: number | null; achievements: LetterAchievement[] })
  | (StoryBase & { id: "next" });

export type StorySlideId = StorySlide["id"];

/** کلاس رنگ بر اساس درجه: S/A سبز، B فیروزه‌ای، C کهربایی، D مرجانی */
export function gradeAccent(grade: Grade | null | undefined): string {
  return grade ? `wl-gr-${grade}` : "";
}

export function toneAccent(tone: "good" | "bad" | "neutral" | undefined): string {
  return tone === "good" ? "wl-tone-good" : tone === "bad" ? "wl-tone-bad" : "";
}

const DOM_CLASS = (d: AnalysisDomain | null | undefined) => (d ? `wl-dom-${d}` : "");

/** جمله‌ی اول یک متن (نقطه‌ی بین ارقام اعشاری جدا نمی‌کنه) */
export function firstSentence(text: string): string {
  const t = (text ?? "").trim();
  const m = /[.!؟?](\s|$)/.exec(t);
  return m ? t.slice(0, m.index + 1) : t;
}

/** اولین حرف نام روز برای برچسب ستون‌های کوچک: «شنبه» → «ش» */
export function dayInitial(weekday: string): string {
  return (weekday ?? "").trim().charAt(0);
}

const TONE_ORDER: Record<string, number> = { good: 0, neutral: 1, bad: 2 };

export function buildStorySlides(letter: WeeklyLetterData): StorySlide[] {
  const slides: StorySlide[] = [];
  const o = letter.overall;

  slides.push({ id: "intro", dur: 4200, label: "شروع", accent: "" });

  if (o.score !== null && Number.isFinite(o.score)) {
    slides.push({
      id: "score", dur: 5800, label: "امتیاز هفته", accent: gradeAccent(o.grade),
      score: o.score, grade: o.grade, delta: o.delta, prevScore: o.prevScore, rank: o.rank,
    });
  }

  if (letter.archetype) {
    slides.push({ id: "archetype", dur: 5400, label: "تیپ هفته", accent: toneAccent(letter.archetype.tone), archetype: letter.archetype });
  }

  const { best } = bestWorstIndex(letter.days);
  const scored = letter.days.filter((d) => typeof d.score === "number").length;
  if (scored >= 2 && best >= 0 && letter.days[best] && !letter.days[best].isFuture) {
    const day = letter.days[best];
    const rows = dayRows(day.details)
      .sort((a, b) => (TONE_ORDER[a.tone ?? "neutral"] ?? 1) - (TONE_ORDER[b.tone ?? "neutral"] ?? 1))
      .slice(0, 3);
    const band = scoreBand(day.score);
    slides.push({
      id: "best", dur: 6000, label: "بهترین روز",
      accent: band === "great" || band === "good" ? "wl-tone-good" : band === "mid" ? "wl-gr-C" : band === "low" ? "wl-gr-D" : "",
      day, rows,
      bars: letter.days.map((d, i) => ({ score: d.score ?? null, best: i === best, label: dayInitial(d.weekday) })),
    });
  }

  // قوی‌ترین بخش + بیشترین پیشرفت
  const withScore = letter.domains.filter((d) => d.hasData && typeof d.score === "number" && Number.isFinite(d.score));
  if (withScore.length) {
    const top = withScore.reduce((a, b) => ((b.score as number) > (a.score as number) ? b : a));
    const rising = withScore.filter((d) => typeof d.delta === "number" && Math.round(d.delta as number) >= 1);
    const riserDom = rising.length ? rising.reduce((a, b) => ((b.delta as number) > (a.delta as number) ? b : a)) : null;
    slides.push({
      id: "domains", dur: 6200, label: "قوی‌ترین بخش", accent: DOM_CLASS(top.domain),
      top: { domain: top.domain, score: top.score as number, note: firstSentence(top.note) },
      riser: riserDom ? { domain: riserDom.domain, delta: Math.round(riserDom.delta as number) } : null,
    });
  }

  const nums = letter.numbers.filter((n) => n && n.value !== undefined && n.value !== "").slice(0, 4);
  if (nums.length >= 2) {
    slides.push({ id: "numbers", dur: 6600, label: "هفته در اعداد", accent: DOM_CLASS(nums[0].domain), items: nums });
  }

  const ach = letter.achievements.slice(0, 3);
  if (letter.streak || ach.length) {
    slides.push({
      id: "streak", dur: 5600, label: "استریک و دستاوردها", accent: letter.streak ? "wl-st-fire" : "wl-gr-C",
      streak: letter.streak ? letter.streak.days : null, achievements: ach,
    });
  }

  slides.push({ id: "next", dur: 8000, label: "هفته‌ی بعد", accent: DOM_CLASS(letter.nextWeek.focusDomain) });
  return slides;
}
