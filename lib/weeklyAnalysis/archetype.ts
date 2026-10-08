import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type WeekArchetype } from "./types";
import { mean } from "./score";

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
      title: "هفته‌ی آروم",
      description: `فقط ${i.activeDays} روز از ${elapsed} روز چیزی ثبت کردی، برای همین امتیاز ${score} تصویر کاملی از هفته‌ت نیست.`,
      tone: "neutral",
    };
  }
  if (i.activeDays <= 2) return null;

  if (score >= 90 && i.activeDays >= 4) {
    const high = scored.filter((x) => x.s >= 80).length;
    return {
      key: "perfect",
      title: "هفته‌ی بی‌نقص",
      description: `امتیاز ${score} از 100؛ ${high} روز از ${scored.length} روز بالای 80 بودی.`,
      tone: "good",
    };
  }

  const h = halves(i.dayScores);
  if (h) {
    const diff = r0(h.second - h.first);
    if (diff >= 15) {
      return {
        key: "comeback",
        title: "برگشت قدرتمند",
        description: `نیمه‌ی اول هفته با میانگین ${r0(h.first)} شروع شد و نیمه‌ی دوم به ${r0(h.second)} رسید؛ ${diff} امتیاز بهتر.`,
        tone: "good",
      };
    }
    if (-diff >= 15) {
      return {
        key: "fast_start",
        title: "شروع پرقدرت",
        description: `نیمه‌ی اول هفته میانگینت ${r0(h.first)} بود ولی نیمه‌ی دوم به ${r0(h.second)} رسید؛ ${-diff} امتیاز افت.`,
        tone: "neutral",
      };
    }
  }

  if (i.consistency != null && i.consistency < 50 && scored.length >= 4) {
    const best = scored.reduce((a, b) => (b.s > a.s ? b : a));
    const worst = scored.reduce((a, b) => (b.s < a.s ? b : a));
    return {
      key: "rollercoaster",
      title: "هفته‌ی پرنوسان",
      description: `${i.dayNames[best.idx]} با ${best.s} اوج بود و ${i.dayNames[worst.idx]} با ${worst.s} کف؛ یکنواختی روزهات ${i.consistency} از 100 شد.`,
      tone: "neutral",
    };
  }

  if (i.prevScore != null && score - i.prevScore >= 10) {
    return {
      key: "rising",
      title: "در حال اوج گرفتن",
      description: `امتیازت از ${i.prevScore} به ${score} رسید، ${score - i.prevScore} امتیاز بیشتر از هفته‌ی قبل.`,
      tone: "good",
    };
  }

  if (i.consistency != null && i.consistency >= 80 && score >= 60 && scored.length >= 4) {
    return {
      key: "steady",
      title: "ثابت‌قدم",
      description: `روزهات خیلی هم‌سطح بودن (یکنواختی ${i.consistency} از 100) و میانگینت روی ${score} موند.`,
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
        title: "متعادل",
        description: `${bestGroup.length} حوزه (${bestGroup.map((x) => L(x.domain)).join("، ")}) تقریبا هم‌سطح بودن، بین ${lo} و ${hi}.`,
        tone: "good",
      };
    }
  }

  const tail = scored.length >= 3
    ? (() => {
        const best = scored.reduce((a, b) => (b.s > a.s ? b : a));
        return `؛ قوی‌ترین روزت ${i.dayNames[best.idx]} بود (${best.s}).`;
      })()
    : ".";
  return {
    key: "building",
    title: "در حال ساختن",
    description: `امتیاز ${score} با ${i.activeDays} روز فعال${tail}`,
    tone: "neutral",
  };
}
