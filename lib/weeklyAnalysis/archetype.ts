import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type WeekArchetype } from "./types";
import { mean } from "./score";
import { tr } from "@/lib/i18n";
import { pl } from "./plural";

// «تیپ هفته» — برچسب قطعی (بدون AI) از الگوی امتیاز روزها. تابع خالص.
// قانون صداقت: با داده‌ی کم (هفته‌ی جاری که تازه شروع شده یا روزهای فعال
// کم) چیزی گفته نمی‌شه — null یعنی «هنوز زوده برای برچسب‌زدن».

export type ArchetypeInput = {
  isCurrentWeek: boolean;
  daysElapsed: number; // 1..7
  score: number | null;
  prevScore: number | null;
  consistency: number | null;
  activeDays: number;
  dayScores: (number | null)[]; // ۷تایی؛ آینده null
  dayNames: string[]; // ۷تایی weekday فارسی
  domains: { domain: AnalysisDomain; score: number | null }[];
};

const L = (d: AnalysisDomain) => ANALYSIS_DOMAIN_LABELS[d];
const r0 = Math.round;

function halves(scores: (number | null)[]): { first: number; second: number } | null {
  const xs = scores.filter((s): s is number => s != null);
  if (xs.length < 4) return null;
  const h = Math.floor(xs.length / 2);
  const second = xs.slice(xs.length - h);
  const first = xs.slice(0, h);
  return { first: mean(first)!, second: mean(second)! };
}

export function detectArchetype(i: ArchetypeInput): WeekArchetype | null {
  if (i.score == null || i.activeDays === 0) return null;
  // هفته‌ی جاری تا سه روز اول هنوز الگویی نداره
  if (i.isCurrentWeek && i.daysElapsed < 3) return null;

  const scored = i.dayScores.map((s, idx) => ({ s, idx })).filter((x): x is { s: number; idx: number } => x.s != null);
  const score = i.score;
  const elapsed = i.isCurrentWeek ? i.daysElapsed : 7;

  // کم‌داده: دو روز یا کمتر فعالیت در هفته‌ای که تقریبا تموم شده
  if (i.activeDays <= 2 && elapsed >= 4) {
    return {
      key: "quiet",
      title: tr("هفته‌ی آروم", "A quiet week"),
      description: tr(
        `فقط ${i.activeDays} روز از ${elapsed} روز چیزی ثبت کردی، برای همین امتیاز ${score} تصویر کاملی از هفته‌ت نیست.`,
        `You logged something on only ${i.activeDays} of ${elapsed} days, so a score of ${score} is not the full picture of your week.`,
      ),
      tone: "neutral",
    };
  }
  if (i.activeDays <= 2) return null;

  if (score >= 90 && i.activeDays >= 4) {
    const high = scored.filter((x) => x.s >= 80).length;
    return {
      key: "perfect",
      title: tr("هفته‌ی بی‌نقص", "A flawless week"),
      description: tr(
        `امتیاز ${score} از 100؛ ${high} روز از ${scored.length} روز بالای 80 بودی.`,
        `Score ${score} out of 100; you were above 80 on ${high} of ${scored.length} days.`,
      ),
      tone: "good",
    };
  }

  const h = halves(i.dayScores);
  if (h) {
    const diff = r0(h.second - h.first);
    if (diff >= 15) {
      return {
        key: "comeback",
        title: tr("برگشت قدرتمند", "Strong comeback"),
        description: tr(
          `نیمه‌ی اول هفته با میانگین ${r0(h.first)} شروع شد و نیمه‌ی دوم به ${r0(h.second)} رسید؛ ${diff} امتیاز بهتر.`,
          `The first half of the week averaged ${r0(h.first)} and the second half reached ${r0(h.second)}; ${pl(diff, "point")} better.`,
        ),
        tone: "good",
      };
    }
    if (-diff >= 15) {
      return {
        key: "fast_start",
        title: tr("شروع پرقدرت", "Fast start"),
        description: tr(
          `نیمه‌ی اول هفته میانگینت ${r0(h.first)} بود ولی نیمه‌ی دوم به ${r0(h.second)} رسید؛ ${-diff} امتیاز افت.`,
          `Your average was ${r0(h.first)} in the first half of the week but ${r0(h.second)} in the second; a drop of ${pl(-diff, "point")}.`,
        ),
        tone: "neutral",
      };
    }
  }

  if (i.consistency != null && i.consistency < 50 && scored.length >= 4) {
    const best = scored.reduce((a, b) => (b.s > a.s ? b : a));
    const worst = scored.reduce((a, b) => (b.s < a.s ? b : a));
    return {
      key: "rollercoaster",
      title: tr("هفته‌ی پرنوسان", "A bumpy week"),
      description: tr(
        `${i.dayNames[best.idx]} با ${best.s} اوج بود و ${i.dayNames[worst.idx]} با ${worst.s} کف؛ یکنواختی روزهات ${i.consistency} از 100 شد.`,
        `${i.dayNames[best.idx]} was the peak at ${best.s} and ${i.dayNames[worst.idx]} the low at ${worst.s}; your day-to-day consistency came out at ${i.consistency} out of 100.`,
      ),
      tone: "neutral",
    };
  }

  if (i.prevScore != null && score - i.prevScore >= 10) {
    return {
      key: "rising",
      title: tr("در حال اوج گرفتن", "On the rise"),
      description: tr(
        `امتیازت از ${i.prevScore} به ${score} رسید، ${score - i.prevScore} امتیاز بیشتر از هفته‌ی قبل.`,
        `Your score went from ${i.prevScore} to ${score}, ${pl(score - i.prevScore, "point")} more than last week.`,
      ),
      tone: "good",
    };
  }

  if (i.consistency != null && i.consistency >= 80 && score >= 60 && scored.length >= 4) {
    return {
      key: "steady",
      title: tr("ثابت‌قدم", "Steady"),
      description: tr(
        `روزهات خیلی هم‌سطح بودن (یکنواختی ${i.consistency} از 100) و میانگینت روی ${score} موند.`,
        `Your days were very even (consistency ${i.consistency} out of 100) and your average held at ${score}.`,
      ),
      tone: "good",
    };
  }

  const withScore = i.domains.filter((d): d is { domain: AnalysisDomain; score: number } => d.score != null);
  if (withScore.length >= 3) {
    // بزرگ‌ترین گروه دامنه‌هایی که با هم حداکثر ۱۵ امتیاز فاصله دارن
    const sorted = [...withScore].sort((a, b) => a.score - b.score);
    let bestGroup: typeof sorted = [];
    for (let a = 0; a < sorted.length; a++) {
      const g = sorted.filter((x) => x.score >= sorted[a].score && x.score - sorted[a].score <= 15);
      if (g.length > bestGroup.length) bestGroup = g;
    }
    if (bestGroup.length >= 3) {
      const lo = bestGroup[0].score;
      const hi = bestGroup[bestGroup.length - 1].score;
      return {
        key: "balanced",
        title: tr("متعادل", "Balanced"),
        description: tr(
          `${bestGroup.length} حوزه (${bestGroup.map((x) => L(x.domain)).join("، ")}) تقریبا هم‌سطح بودن، بین ${lo} و ${hi}.`,
          `${bestGroup.length} areas (${bestGroup.map((x) => L(x.domain)).join(", ")}) were roughly level, between ${lo} and ${hi}.`,
        ),
        tone: "good",
      };
    }
  }

  const tail = scored.length >= 3
    ? (() => {
        const best = scored.reduce((a, b) => (b.s > a.s ? b : a));
        return tr(`؛ قوی‌ترین روزت ${i.dayNames[best.idx]} بود (${best.s}).`, `; your strongest day was ${i.dayNames[best.idx]} (${best.s}).`);
      })()
    : ".";
  return {
    key: "building",
    title: tr("در حال ساختن", "Building up"),
    description: tr(`امتیاز ${score} با ${i.activeDays} روز فعال${tail}`, `Score ${score} with ${pl(i.activeDays, "active day")}${tail}`),
    tone: "neutral",
  };
}
