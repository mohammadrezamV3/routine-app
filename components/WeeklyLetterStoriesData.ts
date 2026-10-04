// منطق خالص «داستان هفته» (بدون React، تست‌دار): از snapshot هفته‌نامه فهرست
// اسلایدها رو می‌سازه. هر اسلایدی که داده‌اش نباشه اصلا ساخته نمی‌شه (رد می‌شه)،
// و اگه بیشتر از سقف (MAX_SLIDES) شد ضعیف‌ترین‌ها به ترتیب DROP_ORDER حذف می‌شن.
// v3: اسلایدها رنگ جدا ندارن؛ همه یک رنگ داده (ring-1) و شدت با امتیاز عوض می‌شه.
import type { AnalysisDomain, DayCell, Grade, Insight, WeekArchetype, WeekNumber } from "@/lib/weeklyAnalysis/types";
import type { LetterAchievement, WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { bestWorstIndex, dayRows, type DayRow } from "./WeeklyLetterUtils";

export type StoryBase = { dur: number; label: string };

export type RhythmBar = { score: number | null; best: boolean; worst: boolean; label: string; weekday: string };

export type TrendMode = "best" | "above" | "below" | "even";

export type StorySlide =
  | (StoryBase & { id: "intro" })
  | (StoryBase & { id: "score"; score: number; grade: Grade | null; delta: number | null; prevScore: number | null; rank: { position: number; of: number } | null })
  | (StoryBase & { id: "archetype"; archetype: WeekArchetype })
  | (StoryBase & { id: "rhythm"; bars: RhythmBar[]; min: number; max: number; avg: number; bestDay: string; worstDay: string })
  | (StoryBase & { id: "best"; day: DayCell; rows: DayRow[] })
  | (StoryBase & { id: "domains"; top: { domain: AnalysisDomain; score: number; note: string }; riser: { domain: AnalysisDomain; delta: number } | null })
  | (StoryBase & { id: "numbers"; items: WeekNumber[] })
  | (StoryBase & { id: "trend"; points: (number | null)[]; weekStarts: string[]; last: number; count: number; mode: TrendMode; diff: number; caption: string })
  | (StoryBase & { id: "insight"; insight: Insight })
  | (StoryBase & { id: "streak"; streak: number | null; achievements: LetterAchievement[] })
  | (StoryBase & { id: "reflection"; mood: number | null; primary: { label: string; text: string }; secondary: { label: string; text: string } | null })
  | (StoryBase & {
      id: "summary";
      score: number | null;
      grade: Grade | null;
      archetype: { key: WeekArchetype["key"]; title: string } | null;
      bestDay: { weekday: string; score: number } | null;
      numbers: WeekNumber[];
      focus: { title: string; domain: AnalysisDomain | null; target: number | null };
    });

export type StorySlideId = StorySlide["id"];

/** سقف تعداد اسلاید: بیشتر از یک دقیقه نشه و خسته‌کننده نباشه */
export const MAX_SLIDES = 10;

/** وقتی بیش از سقف شد، به این ترتیب (ضعیف‌ترین اول) حذف می‌شن. intro / score / summary هیچ‌وقت حذف نمی‌شن. */
export const DROP_ORDER: StorySlideId[] = ["numbers", "insight", "streak", "domains", "reflection", "archetype", "best", "rhythm", "trend"];

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

/** متن بلند یادداشت کاربر رو برای اسلاید کوتاه می‌کنه (سر کلمه، با «…») */
export function clipText(text: string, max = 150): string {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trim()}…`;
}

const TONE_ORDER: Record<string, number> = { good: 0, neutral: 1, bad: 2 };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** مهم‌ترین بینش برای نقل‌قول: اولین بینش (مهم‌ترین اول) که تکرار اسلاید «بهترین روز» نباشه */
export function pickInsight(insights: Insight[]): Insight | null {
  return insights.find((i) => i && i.kind !== "best_day" && i.title && i.body) ?? null;
}

/** تحلیل مسیر هفته‌ها: آیا بهترین هفته‌ست یا چقدر از میانگین هفته‌های قبلی فاصله داره. null = داده‌ی کافی نیست. */
export function trendStory(trend: WeeklyLetterData["trend"]): Extract<StorySlide, { id: "trend" }> | null {
  if (!Array.isArray(trend) || trend.length < 3) return null;
  const points = trend.map((t) => (isNum(t?.score) ? (t.score as number) : null));
  const lastPoint = points[points.length - 1];
  if (lastPoint === null) return null;
  const prior = points.slice(0, -1).filter(isNum);
  if (prior.length < 2) return null;
  const count = prior.length + 1;
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  const diff = Math.round(Math.abs(lastPoint - avg));
  let mode: TrendMode;
  let caption: string;
  if (lastPoint >= Math.max(...prior)) {
    mode = "best";
    caption = `بهترین هفته از ${count} هفته‌ی اخیر`;
  } else if (diff === 0) {
    mode = "even";
    caption = "هم‌سطح میانگین هفته‌های اخیر";
  } else if (lastPoint > avg) {
    mode = "above";
    caption = `${diff} امتیاز بهتر از میانگین`;
  } else {
    mode = "below";
    caption = `${diff} امتیاز پایین‌تر از میانگین`;
  }
  return {
    id: "trend", dur: 5600, label: "مسیر هفته‌ها",
    points, weekStarts: trend.map((t) => t.weekStart), last: lastPoint, count, mode, diff, caption,
  };
}

/** حذف ضعیف‌ترین اسلایدها تا سقف */
export function capSlides(slides: StorySlide[], max = MAX_SLIDES): StorySlide[] {
  const out = [...slides];
  for (const id of DROP_ORDER) {
    if (out.length <= max) break;
    const i = out.findIndex((s) => s.id === id);
    if (i >= 0) out.splice(i, 1);
  }
  return out;
}

/** مدت تقریبی پخش (ثانیه، گرد به ۵): همه‌ی اسلایدها جز آخری که می‌مونه */
export function storySeconds(slides: StorySlide[]): number {
  if (slides.length < 2) return 0;
  const ms = slides.slice(0, -1).reduce((a, s) => a + s.dur, 0);
  return Math.max(5, Math.round(ms / 5000) * 5);
}

export function buildStorySlides(letter: WeeklyLetterData): StorySlide[] {
  const slides: StorySlide[] = [];
  const o = letter.overall;

  slides.push({ id: "intro", dur: 3800, label: "شروع" });

  if (o.score !== null && Number.isFinite(o.score)) {
    slides.push({
      id: "score", dur: 5600, label: "امتیاز هفته",
      score: o.score, grade: o.grade, delta: o.delta, prevScore: o.prevScore, rank: o.rank,
    });
  }

  if (letter.archetype) {
    slides.push({ id: "archetype", dur: 5000, label: "تیپ هفته", archetype: letter.archetype });
  }

  const { best, worst } = bestWorstIndex(letter.days);
  const scoredDays = letter.days.filter((d) => isNum(d.score));
  const scored = scoredDays.length;

  // ریتم هفته: هفت میله + بازه‌ی نوسان؛ فقط وقتی حداقل سه روز امتیاز داره و همه‌ی روزها یکسان نیستن
  if (scored >= 3) {
    const vals = scoredDays.map((d) => d.score as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max > min && best >= 0 && worst >= 0) {
      slides.push({
        id: "rhythm", dur: 5400, label: "ریتم هفته",
        bars: letter.days.map((d, i) => ({ score: isNum(d.score) ? d.score : null, best: i === best, worst: i === worst, label: dayInitial(d.weekday), weekday: d.weekday })),
        min: Math.round(min), max: Math.round(max), avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        bestDay: letter.days[best].weekday, worstDay: letter.days[worst].weekday,
      });
    }
  }

  if (scored >= 2 && best >= 0 && letter.days[best] && !letter.days[best].isFuture) {
    const day = letter.days[best];
    const rows = dayRows(day.details)
      .sort((a, b) => (TONE_ORDER[a.tone ?? "neutral"] ?? 1) - (TONE_ORDER[b.tone ?? "neutral"] ?? 1))
      .slice(0, 3);
    slides.push({ id: "best", dur: 5400, label: "بهترین روز", day, rows });
  }

  // قوی‌ترین بخش + بیشترین پیشرفت
  const withScore = letter.domains.filter((d) => d.hasData && isNum(d.score));
  if (withScore.length) {
    const top = withScore.reduce((a, b) => ((b.score as number) > (a.score as number) ? b : a));
    const rising = withScore.filter((d) => isNum(d.delta) && Math.round(d.delta as number) >= 1);
    const riserDom = rising.length ? rising.reduce((a, b) => ((b.delta as number) > (a.delta as number) ? b : a)) : null;
    slides.push({
      id: "domains", dur: 5200, label: "قوی‌ترین بخش",
      top: { domain: top.domain, score: top.score as number, note: firstSentence(top.note) },
      riser: riserDom ? { domain: riserDom.domain, delta: Math.round(riserDom.delta as number) } : null,
    });
  }

  const nums = letter.numbers.filter((n) => n && n.value !== undefined && n.value !== "").slice(0, 4);
  if (nums.length >= 2) {
    slides.push({ id: "numbers", dur: 5600, label: "هفته در اعداد", items: nums });
  }

  const tr = trendStory(letter.trend);
  if (tr) slides.push(tr);

  const ins = pickInsight(letter.insights);
  if (ins) slides.push({ id: "insight", dur: 6000, label: "یک بینش", insight: ins });

  const ach = letter.achievements.slice(0, 3);
  if (letter.streak || ach.length) {
    slides.push({
      id: "streak", dur: 4800, label: "استریک و دستاوردها",
      streak: letter.streak ? letter.streak.days : null, achievements: ach,
    });
  }

  const r = letter.reflection;
  const went = r?.wentWell ? clipText(r.wentWell) : "";
  const impr = r?.improve ? clipText(r.improve) : "";
  if (r && (went || impr)) {
    const mood = r.mood && r.mood >= 1 && r.mood <= 5 ? r.mood : null;
    slides.push({
      id: "reflection", dur: 6200, label: "حرف خودت", mood,
      primary: went ? { label: "چی خوب پیش رفت", text: went } : { label: "چی بهتر می‌شد", text: impr },
      secondary: went && impr ? { label: "چی بهتر می‌شد", text: impr } : null,
    });
  }

  // آخرین اسلاید: خلاصه در یک نگاه + تمرکز هفته‌ی بعد + دکمه‌ها
  const bestDay = best >= 0 && scored >= 2 && isNum(letter.days[best]?.score) ? { weekday: letter.days[best].weekday, score: Math.round(letter.days[best].score as number) } : null;
  slides.push({
    id: "summary", dur: 9000, label: "خلاصه در یک نگاه",
    score: o.score !== null && Number.isFinite(o.score) ? o.score : null,
    grade: o.grade,
    archetype: letter.archetype ? { key: letter.archetype.key, title: letter.archetype.title } : null,
    bestDay,
    numbers: nums.slice(0, 3),
    focus: { title: letter.nextWeek.focusTitle || "هفته‌ی بعد", domain: letter.nextWeek.focusDomain, target: letter.nextWeek.suggestedTarget },
  });

  return capSlides(slides);
}
