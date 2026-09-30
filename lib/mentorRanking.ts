// رتبه‌بندیِ شایستگیِ منتورها — هسته‌ی خالص (بدونِ دیتابیس، کاملاً تست‌پذیر).
//
// هدف: منتور به‌خاطرِ *نتیجه‌ی واقعیِ شاگردهاش* بالا بیاد، نه به‌خاطرِ تعدادِ
// شاگرد، چند نظرِ ۵ستاره‌ی ساختگی یا این‌که زودتر ثبت‌نام کرده. توضیحِ کامل،
// وزن‌ها و دلیلِ هر کدوم: docs/mentor-ranking.md.
//
// شکلِ کلی:
//
//   کیفیت (Q, ۰..۱) = میانگینِ وزن‌دارِ شش مؤلفه‌ی *هموارشده‌ی بیزی*
//       پایبندیِ واقعیِ شاگردها ۳۰٪ · تکمیلِ برنامه ۲۰٪ · نظرهای تاییدشده ۲۰٪
//       ماندگاریِ ۴هفته‌ای ۱۵٪ · سرعتِ پاسخ ۱۰٪ · تمدید/ادامه ۵٪
//   امتیاز = ۱۰۰ × Q × شواهد × اعتماد × سلامت × فعالیت
//
// هر مؤلفه با نمونه‌ی کم به سمتِ یک پیش‌فرض کشیده می‌شه (نه ۰ و نه ۱) تا یک
// شاگردِ خوب یا بد به‌تنهایی منتور رو بالا/پایین نبره. ضریب‌ها همه ≤ ۱ـن: احراز
// هویت/مدرک *جریمه‌ی نبودن* رو برمی‌داره، ولی هیچ‌وقت امتیازِ رایگان نمی‌ده.
//
// ضدِ دست‌کاری (قاعده‌ها این‌جا، جمع‌آوری در lib/mentorRankingStats.ts):
//   - سهمِ هر شاگرد سقف داره (وزنِ پایبندی ≤ ۱، حداکثر ۳ برنامه، یک رایِ پاسخ،
//     یک نظر)؛ پس یک حسابِ پرکار نمی‌تونه نتیجه رو بسازه.
//   - نظر فقط از شاگردِ واقعی: رابطه‌ی فعالِ حداقل REVIEW_MIN_ACTIVE_DAYS روز و
//     حداقل یک برنامه‌ی فعال‌شده؛ وزن با میزانِ مشارکتِ واقعی؛ رگباری از حساب‌های
//     تازه در پنجره‌ی کوتاه کم‌اثر می‌شه.
//   - برنامه‌ی کوتاه‌تر از یک هفته «تکمیل» حساب نمی‌شه (برنامه‌ی یک‌روزه‌ی
//     ساختگی نرخِ تکمیل نمی‌سازه).
//   - ورود به «منتورهای محبوب» حداقلِ نمونه، احرازِ هویت و سلامتِ کافی می‌خواد.

// ───────────────────────── ثابت‌ها ─────────────────────────

const DAY_MS = 86_400_000;

export const MERIT_WEIGHTS = {
  adherence: 0.3,
  completion: 0.2,
  reviews: 0.2,
  retention: 0.15,
  response: 0.1,
  renewal: 0.05,
} as const;

export type MeritComponentKey = keyof typeof MERIT_WEIGHTS;

export const RANKING_RULES = {
  /** پیش‌فرض و وزنِ پیش‌فرضِ هر مؤلفه (به‌تعدادِ «شاگردِ فرضی») */
  adherencePrior: 0.5,
  adherencePriorWeight: 3,
  /** ثبتِ روزانه‌ای که یک شاگرد را «کامل» می‌شمارد؛ کمتر = سهمِ کمتر، بیشتر = بی‌اثر (سقف) */
  adherenceFullWeightEntries: 14,
  completionPrior: 0.5,
  completionPriorWeight: 3,
  /** برنامه‌ی کوتاه‌تر از این «تکمیل» حساب نمی‌شود */
  completionMinDays: 7,
  /** برنامه‌ی فعالی که این‌قدر از تاریخِ پایانش گذشته و تکمیل نشده = رهاشده */
  abandonGraceDays: 7,
  /** حداکثر برنامه‌ی شمرده‌شده از هر شاگرد */
  maxProgramsPerStudent: 3,
  retentionPrior: 0.5,
  retentionPriorWeight: 3,
  retentionDays: 28,
  renewalPrior: 0.3,
  renewalPriorWeight: 3,
  responsePrior: 0.5,
  responsePriorWeight: 3,
  /** نیمه‌عمرِ امتیازِ پاسخ: پاسخ در ۲۴ ساعت = ۰٫۵ */
  responseHalfLifeHours: 24,
  /** بی‌پاسخ بعد از این مدت = نمونه‌ی «دیر» (قبلش هنوز قضاوت نمی‌شود) */
  responseOverdueHours: 72,
  responseCapHours: 168,
  ratingPriorMean: 3.5,
  ratingPriorWeight: 4,
  reviewMinActiveDays: 14,
  /** وزنِ پایه‌ی نظرِ تاییدشده؛ بقیه با مشارکت (ثبتِ اجرای برنامه) پر می‌شود */
  reviewBaseWeight: 0.4,
  reviewFullEngagementEntries: 20,
  /** حسابِ «تازه» در لحظه‌ی نوشتنِ نظر */
  burstNewAccountDays: 30,
  burstWindowDays: 7,
  /** تا این تعداد نظرِ حسابِ تازه در یک پنجره بی‌جریمه است */
  burstAllowance: 2,
  /** ضریبِ شواهد: ۰٫۵ + ۰٫۵ × n/(n+k) */
  evidenceHalfStudents: 4,
  activityHalfLifeDays: 14,
  /** حداقل‌های ورود به «منتورهای محبوب» */
  popularMinStudents: 3,
  popularMinAdherenceEntries: 20,
  popularMinVerifiedReviews: 3,
  popularMinIntegrity: 0.8,
} as const;

const R = RANKING_RULES;

// ───────────────────────── کمک‌تابع‌ها ─────────────────────────

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** میانگینِ هموارشده: (Σ وزن×مقدار + پیش‌فرض×k) ÷ (Σ وزن + k) */
export function smoothedMean(sumWeighted: number, sumWeights: number, prior: number, priorWeight: number): number {
  const w = Math.max(0, sumWeights);
  return clamp01((Math.max(0, sumWeighted) + prior * priorWeight) / (w + priorWeight));
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const daysBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / DAY_MS;

// ───────────────────────── هویتِ داده‌ی آزمایشی ─────────────────────────

/**
 * همون تعریفِ lib/demoData.ts (هر دو شرط با هم). سیگنالِ کاربرِ آزمایشی هیچ‌وقت
 * به منتورِ واقعی نمی‌رسه و برعکس — دنیای آزمایشی فقط خودش رو رتبه‌بندی می‌کنه.
 */
export function isDemoIdentity(u: { email: string | null; username: string | null }): boolean {
  return !!u.email && u.email.endsWith("@demo.arion.local") && !!u.username && u.username.startsWith("demo_");
}

// ───────────────────────── ورودی‌ها ─────────────────────────

export type ProgramOutcome = {
  status: string; // MentorProgramStatus
  activatedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  endDate: Date | null;
};

/** همه‌ی سیگنال‌های *یک شاگردِ معتبر* نزدِ یک منتور، در یک دامنه (کلی یا یک دسته) */
export type StudentSignals = {
  studentId: string;
  startedAt: Date;
  /** پایانِ رابطه (ENDED/BLOCKED)؛ null = هنوز فعال */
  endedAt: Date | null;
  /** شمارشِ روز-آیتم‌های اجرای برنامه در پنجره‌ی اخیر (از پیشرفتِ خودکار) */
  adherence: { completed: number; partial: number; missed: number };
  programs: ProgramOutcome[];
  /** زمان‌های پاسخِ منتور به این شاگرد (ساعت): درخواست و پیام‌ها */
  responseHours: number[];
};

export type ReviewSignal = {
  studentId: string;
  rating: number;
  createdAt: Date;
  reviewerCreatedAt: Date;
  /** مدتِ فعال‌بودنِ رابطه‌ی همین نظر (روز) */
  activeDays: number;
  /** برنامه‌ی فعال‌شده در همین رابطه */
  activatedPrograms: number;
  /** ثبتِ اجرای برنامه در همین رابطه (همه‌ی زمان‌ها) */
  engagementEntries: number;
};

export type TrustSignals = {
  identityVerified: boolean;
  /** مدرکِ تاییدشده برای همین دامنه (کلی: هر کدوم از دسته‌های فعلی) */
  certificateVerified: boolean;
};

export type IntegritySignals = {
  /** گزارش‌گرانِ متمایزِ معتبر با گزارشِ OPEN علیهِ منتور */
  openReporters: number;
  /** گزارش‌گرانِ متمایز با گزارشِ RESOLVED (تاییدشده توسطِ ادمین) در ۱۸۰ روزِ اخیر */
  resolvedReporters: number;
  /** تعلیق در ۱۸۰ روزِ اخیر (حتی اگه الان رفع شده) */
  recentSuspension: boolean;
};

export type MeritInputs = {
  students: StudentSignals[];
  reviews: ReviewSignal[];
  trust: TrustSignals;
  integrity: IntegritySignals;
  lastActiveAt: Date | null;
  /**
   * زمان‌های پاسخ به درخواست‌کننده‌هایی که (هنوز) شاگرد نشدن — درخواستِ ردشده یا
   * بی‌جواب. فقط در سرعتِ پاسخ اثر دارن (هر نفر یک رای)، نه در شواهد/ماندگاری.
   */
  requestResponses?: number[][];
};

// ───────────────────────── مؤلفه‌ها ─────────────────────────

export type ComponentResult = {
  /** مقدارِ هموارشده ۰..۱ که وارد فرمول می‌شود */
  value: number;
  /** مقدارِ خام بدونِ پیش‌فرض (null = داده‌ای نیست) */
  raw: number | null;
  /** اندازه‌ی نمونه‌ی مؤثر (شاگرد/برنامه/نظر، بسته به مؤلفه) */
  sample: number;
};

/**
 * پایبندی: نرخِ اجرای هر شاگرد (PARTIAL نصف) از پیشرفتِ ثبت‌شده، وزن‌دار با
 * min(1, ثبت‌ها/۱۴) — شاگردی با ۲ ثبت سهمِ کمی داره و شاگردِ پرثبت بیش از یک
 * رای نمی‌گیره.
 */
export function adherenceComponent(students: StudentSignals[]): ComponentResult & { entries: number } {
  let sw = 0;
  let swv = 0;
  let entries = 0;
  for (const s of students) {
    const { completed, partial, missed } = s.adherence;
    const total = completed + partial + missed;
    if (total <= 0) continue;
    entries += total;
    const rate = (completed + partial * 0.5) / total;
    const w = Math.min(1, total / R.adherenceFullWeightEntries);
    sw += w;
    swv += w * rate;
  }
  return {
    value: smoothedMean(swv, sw, R.adherencePrior, R.adherencePriorWeight),
    raw: sw > 0 ? swv / sw : null,
    sample: Math.round(sw * 100) / 100,
    entries,
  };
}

/** یک برنامه در نرخِ تکمیل چطور شمرده می‌شود */
export function programVerdict(p: ProgramOutcome, now: Date): "completed" | "failed" | "ignored" {
  if (p.status === "COMPLETED") {
    const end = p.completedAt ?? now;
    return daysBetween(p.activatedAt, end) >= R.completionMinDays ? "completed" : "ignored";
  }
  if (p.status === "CANCELLED") return "failed";
  if (p.status === "ACTIVE" && p.endDate && daysBetween(p.endDate, now) > R.abandonGraceDays) return "failed";
  return "ignored"; // هنوز در جریان
}

/** برنامه‌های قضاوت‌شده‌ی هر شاگرد، تازه‌ترین‌ها اول، حداکثر maxProgramsPerStudent */
function judgedPrograms(s: StudentSignals, now: Date) {
  return s.programs
    .map((p) => ({ p, v: programVerdict(p, now) }))
    .filter((x) => x.v !== "ignored")
    .sort((a, b) => b.p.activatedAt.getTime() - a.p.activatedAt.getTime())
    .slice(0, R.maxProgramsPerStudent);
}

/** تکمیل = تکمیل‌شده ÷ (تکمیل‌شده + لغوشده/رهاشده)، هموارشده */
export function completionComponent(students: StudentSignals[], now: Date): ComponentResult & { completed: number; started: number } {
  let completed = 0;
  let started = 0;
  for (const s of students) {
    for (const x of judgedPrograms(s, now)) {
      started++;
      if (x.v === "completed") completed++;
    }
  }
  return {
    value: smoothedMean(completed, started, R.completionPrior, R.completionPriorWeight),
    raw: started > 0 ? completed / started : null,
    sample: started,
    completed,
    started,
  };
}

/** ماندگاری: از شاگردهایی که حداقل ۴ هفته از شروعشون گذشته، چند نفر ≥ ۴ هفته موندن */
export function retentionComponent(students: StudentSignals[], now: Date): ComponentResult {
  let decided = 0;
  let stayed = 0;
  for (const s of students) {
    if (daysBetween(s.startedAt, now) < R.retentionDays) continue; // هنوز قابلِ قضاوت نیست
    decided++;
    if (daysBetween(s.startedAt, s.endedAt ?? now) >= R.retentionDays) stayed++;
  }
  return {
    value: smoothedMean(stayed, decided, R.retentionPrior, R.retentionPriorWeight),
    raw: decided > 0 ? stayed / decided : null,
    sample: decided,
  };
}

/** تمدید: از شاگردهایی که برنامه‌ای رو تموم کردن، چند نفر برنامه‌ی بعدی رو هم شروع کردن */
export function renewalComponent(students: StudentSignals[], now: Date): ComponentResult {
  let base = 0;
  let renewed = 0;
  for (const s of students) {
    const done = s.programs
      .filter((p) => programVerdict(p, now) === "completed")
      .sort((a, b) => (a.completedAt ?? now).getTime() - (b.completedAt ?? now).getTime());
    if (done.length === 0) continue;
    base++;
    const firstDone = (done[0].completedAt ?? now).getTime();
    if (s.programs.some((p) => p.activatedAt.getTime() >= firstDone - DAY_MS && p !== done[0])) renewed++;
  }
  return {
    value: smoothedMean(renewed, base, R.renewalPrior, R.renewalPriorWeight),
    raw: base > 0 ? renewed / base : null,
    sample: base,
  };
}

/** امتیازِ یک زمانِ پاسخ: ۰ ساعت = ۱، ۲۴ ساعت = ۰٫۵، ۷۲ ساعت ≈ ۰٫۱۲ */
export function responseScore(hours: number): number {
  const h = Math.min(R.responseCapHours, Math.max(0, hours));
  return Math.pow(0.5, h / R.responseHalfLifeHours);
}

/** سرعتِ پاسخ: هر شاگرد یک رای (میانه‌ی زمان‌های خودش)، بعد هموارسازی */
export function responseComponent(students: StudentSignals[], requestResponses: number[][] = []): ComponentResult & { medianHours: number | null } {
  const perStudent: number[] = [];
  for (const hours of [...students.map((s) => s.responseHours), ...requestResponses]) {
    const m = median(hours);
    if (m !== null) perStudent.push(m);
  }
  const sum = perStudent.reduce((a, h) => a + responseScore(h), 0);
  return {
    value: smoothedMean(sum, perStudent.length, R.responsePrior, R.responsePriorWeight),
    raw: perStudent.length ? sum / perStudent.length : null,
    sample: perStudent.length,
    medianHours: median(perStudent),
  };
}

/**
 * زمان‌های پاسخ از روی زمان‌بندیِ پیام‌ها (محتوای پیام لازم نیست — با رمزنگاریِ
 * سرتاسری هم کار می‌کنه). از اولین پیامِ بی‌جوابِ شاگرد تا اولین پیامِ منتور =
 * یک نمونه. بی‌جواب بیش از responseOverdueHours = نمونه‌ی دیر (با سقف).
 * پیامِ «ارسالِ گروهی» (broadcastId) پاسخ حساب نمی‌شه.
 */
export function responseHoursFromMessages(
  messages: { senderId: string; createdAt: Date; broadcastId?: string | null }[],
  mentorId: string,
  now: Date
): number[] {
  const out: number[] = [];
  let waitingSince: Date | null = null;
  const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const m of sorted) {
    if (m.senderId === mentorId) {
      // «ارسالِ گروهی» جوابِ این شاگرد نیست — وگرنه یک پیامِ همگانی همه‌ی انتظارها رو صفر می‌کرد
      if (m.broadcastId) continue;
      if (waitingSince) out.push((m.createdAt.getTime() - waitingSince.getTime()) / 3_600_000);
      waitingSince = null;
    } else if (!waitingSince) {
      waitingSince = m.createdAt;
    }
  }
  if (waitingSince) {
    const h = (now.getTime() - waitingSince.getTime()) / 3_600_000;
    if (h >= R.responseOverdueHours) out.push(Math.min(h, R.responseCapHours));
  }
  return out;
}

/** زمانِ پاسخ به درخواستِ شاگردی (فقط درخواست‌هایی که شاگرد فرستاده) */
export function requestResponseHours(
  r: { initiatedBy: string; status: string; createdAt: Date; startedAt: Date | null; updatedAt: Date },
  now: Date
): number | null {
  if (r.initiatedBy !== "STUDENT") return null;
  const hours = (to: Date) => Math.max(0, (to.getTime() - r.createdAt.getTime()) / 3_600_000);
  if (r.startedAt) return Math.min(hours(r.startedAt), R.responseCapHours);
  if (r.status === "REJECTED") return Math.min(hours(r.updatedAt), R.responseCapHours);
  if (r.status === "PENDING") {
    const h = hours(now);
    return h >= R.responseOverdueHours ? Math.min(h, R.responseCapHours) : null;
  }
  return null;
}

/** نظرِ تاییدشده: رابطه‌ی فعالِ کافی + حداقل یک برنامه‌ی فعال‌شده */
export function isVerifiedReview(r: ReviewSignal): boolean {
  return r.activeDays >= R.reviewMinActiveDays && r.activatedPrograms >= 1 && r.rating >= 1 && r.rating <= 5;
}

/** وزنِ مشارکت: ۰٫۴ پایه + تا ۰٫۶ با ثبتِ اجرای واقعی */
export function engagementWeight(entries: number): number {
  return R.reviewBaseWeight + (1 - R.reviewBaseWeight) * Math.min(1, Math.max(0, entries) / R.reviewFullEngagementEntries);
}

/**
 * ضریبِ رگبار برای هر نظر (هم‌ترتیب با ورودی). نظرهای حساب‌های تازه که در یک
 * پنجره‌ی ۷روزه (±۳٫۵ روز) بیش از burstAllowance تا هستن، هر کدوم allowance/n وزن
 * می‌گیرن — پس ۱۰ نظرِ هم‌زمان از حساب‌های نو روی‌هم اندازه‌ی ۲ نظر اثر دارن.
 */
export function burstFactors(reviews: ReviewSignal[]): number[] {
  const half = (R.burstWindowDays / 2) * DAY_MS;
  const isNew = reviews.map((r) => daysBetween(r.reviewerCreatedAt, r.createdAt) < R.burstNewAccountDays);
  return reviews.map((r, i) => {
    if (!isNew[i]) return 1;
    let n = 0;
    for (let j = 0; j < reviews.length; j++) {
      if (isNew[j] && Math.abs(reviews[j].createdAt.getTime() - r.createdAt.getTime()) <= half) n++;
    }
    return n > R.burstAllowance ? R.burstAllowance / n : 1;
  });
}

/** امتیازِ نظرها: میانگینِ بیزیِ وزن‌دار فقط از نظرهای تاییدشده، نرمال به ۰..۱ */
export function reviewComponent(reviews: ReviewSignal[]): ComponentResult & { verified: number; weightedAvg: number | null; excluded: number } {
  const verified = reviews.filter(isVerifiedReview);
  const burst = burstFactors(verified);
  let sw = 0;
  let swr = 0;
  verified.forEach((r, i) => {
    const w = engagementWeight(r.engagementEntries) * burst[i];
    sw += w;
    swr += w * r.rating;
  });
  const mean = (swr + R.ratingPriorMean * R.ratingPriorWeight) / (sw + R.ratingPriorWeight);
  return {
    value: clamp01((mean - 1) / 4),
    raw: sw > 0 ? (swr / sw - 1) / 4 : null,
    sample: Math.round(sw * 100) / 100,
    verified: verified.length,
    weightedAvg: sw > 0 ? Math.round((swr / sw) * 100) / 100 : null,
    excluded: reviews.length - verified.length,
  };
}

// ───────────────────────── ضریب‌ها ─────────────────────────

/**
 * شاگردی که واقعاً *نتیجه‌ی قابلِ اندازه‌گیری* داره: ثبتِ اجرای برنامه، برنامه‌ی
 * قضاوت‌شده (تمام/لغو/رهاشده)، یا حداقل ۴ هفته از شروعش گذشته. رابطه‌ی چندروزه‌ی
 * بدونِ برنامه «شاهد» نیست — وگرنه جذبِ انبوهِ شاگرد بدونِ کار، شواهد می‌ساخت.
 */
export function hasOutcome(s: StudentSignals, now: Date): boolean {
  const a = s.adherence;
  if (a.completed + a.partial + a.missed > 0) return true;
  if (s.programs.some((p) => programVerdict(p, now) !== "ignored")) return true;
  return daysBetween(s.startedAt, now) >= R.retentionDays;
}

/** شواهد: منتورِ بدونِ شاگردِ دارای نتیجه نصفِ کیفیتش رو می‌گیره، با ۴ شاگرد ۷۵٪، با ۱۲ ≈ ۸۸٪ */
export function evidenceFactor(students: number): number {
  const n = Math.max(0, students);
  return 0.5 + 0.5 * (n / (n + R.evidenceHalfStudents));
}

/** اعتماد (≤ ۱): احراز نشده ۰٫۸۵؛ هویتِ تاییدشده ۰٫۹۵؛ هویت + مدرکِ همین حوزه ۱ */
export function trustMultiplier(t: TrustSignals): number {
  if (!t.identityVerified) return 0.85;
  return t.certificateVerified ? 1 : 0.95;
}

/** سلامت: هر گزارشِ تاییدشده −۰٫۱۵، هر گزارشِ باز −۰٫۰۵ (هر کدوم سقفِ ۳)، تعلیقِ اخیر −۰٫۲؛ کف ۰٫۴ */
export function integrityMultiplier(i: IntegritySignals): number {
  const penalty =
    0.15 * Math.min(3, Math.max(0, i.resolvedReporters)) +
    0.05 * Math.min(3, Math.max(0, i.openReporters)) +
    (i.recentSuspension ? 0.2 : 0);
  return Math.max(0.4, 1 - penalty);
}

/** فعالیت: ۰٫۸ + ۰٫۲ × نیمه‌عمرِ ۱۴روزه‌ی آخرین حضور — غیبت پایین می‌بره ولی نتیجه رو پاک نمی‌کنه */
export function activityMultiplier(lastActiveAt: Date | null, now: Date): number {
  if (!lastActiveAt) return 0.8;
  const days = Math.max(0, daysBetween(lastActiveAt, now));
  return 0.8 + 0.2 * Math.pow(0.5, days / R.activityHalfLifeDays);
}

// ───────────────────────── امتیازِ نهایی ─────────────────────────

export type MeritBreakdown = {
  version: 1;
  score: number; // ۰..۱۰۰
  ratingScore: number; // ۰..۱
  quality: number; // Q
  components: Record<MeritComponentKey, ComponentResult & { weight: number }>;
  multipliers: { evidence: number; trust: number; integrity: number; activity: number };
  sample: {
    /** شاگردهای دارای نتیجه (پایه‌ی ضریبِ شواهد و حداقلِ «محبوب») */
    students: number;
    /** همه‌ی رابطه‌های شروع‌شده‌ی معتبر */
    startedStudents: number;
    adherenceEntries: number;
    programsJudged: number;
    programsCompleted: number;
    verifiedReviews: number;
    excludedReviews: number;
    weightedRating: number | null;
    medianResponseHours: number | null;
  };
  eligible: boolean;
  /** دلایلِ ماندن بیرونِ «منتورهای محبوب» (کلیدِ ماشینی؛ متن در UIِ ادمین) */
  ineligibleReasons: IneligibleReason[];
};

export type IneligibleReason = "few_students" | "little_evidence" | "identity_unverified" | "integrity";

const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

export function computeMerit(inp: MeritInputs, now: Date = new Date()): MeritBreakdown {
  const adherence = adherenceComponent(inp.students);
  const completion = completionComponent(inp.students, now);
  const reviews = reviewComponent(inp.reviews);
  const retention = retentionComponent(inp.students, now);
  const response = responseComponent(inp.students, inp.requestResponses);
  const renewal = renewalComponent(inp.students, now);

  const parts: Record<MeritComponentKey, ComponentResult> = { adherence, completion, reviews, retention, response, renewal };
  let quality = 0;
  for (const k of Object.keys(MERIT_WEIGHTS) as MeritComponentKey[]) quality += MERIT_WEIGHTS[k] * parts[k].value;

  const outcomeStudents = inp.students.filter((s) => hasOutcome(s, now)).length;
  const multipliers = {
    evidence: evidenceFactor(outcomeStudents),
    trust: trustMultiplier(inp.trust),
    integrity: integrityMultiplier(inp.integrity),
    activity: activityMultiplier(inp.lastActiveAt, now),
  };
  const score = 100 * quality * multipliers.evidence * multipliers.trust * multipliers.integrity * multipliers.activity;

  const ineligibleReasons: IneligibleReason[] = [];
  if (outcomeStudents < R.popularMinStudents) ineligibleReasons.push("few_students");
  if (adherence.entries < R.popularMinAdherenceEntries && reviews.verified < R.popularMinVerifiedReviews) ineligibleReasons.push("little_evidence");
  if (!inp.trust.identityVerified) ineligibleReasons.push("identity_unverified");
  if (multipliers.integrity < R.popularMinIntegrity) ineligibleReasons.push("integrity");

  const components = {} as MeritBreakdown["components"];
  for (const k of Object.keys(MERIT_WEIGHTS) as MeritComponentKey[]) {
    const c = parts[k];
    components[k] = { weight: MERIT_WEIGHTS[k], value: round(c.value), raw: c.raw === null ? null : round(c.raw), sample: c.sample };
  }

  return {
    version: 1,
    score: round(score, 3),
    ratingScore: round(reviews.value),
    quality: round(quality),
    components,
    multipliers: {
      evidence: round(multipliers.evidence),
      trust: round(multipliers.trust),
      integrity: round(multipliers.integrity),
      activity: round(multipliers.activity),
    },
    sample: {
      students: outcomeStudents,
      startedStudents: inp.students.length,
      adherenceEntries: adherence.entries,
      programsJudged: completion.started,
      programsCompleted: completion.completed,
      verifiedReviews: reviews.verified,
      excludedReviews: reviews.excluded,
      weightedRating: reviews.weightedAvg,
      medianResponseHours: response.medianHours === null ? null : Math.round(response.medianHours * 10) / 10,
    },
    eligible: ineligibleReasons.length === 0,
    ineligibleReasons,
  };
}

// ───────────────────────── ترتیب ─────────────────────────

export type RankedEntry = { profileId: string; score: number; sampleStudents: number };

/**
 * مقایسه‌ی قطعی — همون ترتیبی که ORDER BYِ lib/mentorRankingStats.ts می‌سازه:
 * امتیاز ↓، بعد شاگردِ معتبرِ بیشتر ↓، بعد profileId ↑ (هیچ‌وقت ترتیبِ تصادفی).
 */
export function compareRanked(a: RankedEntry, b: RankedEntry): number {
  return b.score - a.score || b.sampleStudents - a.sampleStudents || (a.profileId < b.profileId ? -1 : a.profileId > b.profileId ? 1 : 0);
}

/** چرخشِ روزانه‌ی قطعیِ «منتورهای تازه»: هر روز ترتیبِ متفاوت، در یک روز ثابت */
export function explorationOrder<T extends { profileId: string }>(items: T[], dayKey: string): T[] {
  const h = (s: string) => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619) >>> 0;
    return x;
  };
  return [...items].sort((a, b) => h(dayKey + a.profileId) - h(dayKey + b.profileId) || (a.profileId < b.profileId ? -1 : 1));
}
