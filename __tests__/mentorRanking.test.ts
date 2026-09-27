import { describe, it, expect } from "vitest";
import {
  MERIT_WEIGHTS,
  RANKING_RULES,
  activityMultiplier,
  adherenceComponent,
  burstFactors,
  compareRanked,
  completionComponent,
  computeMerit,
  engagementWeight,
  evidenceFactor,
  explorationOrder,
  integrityMultiplier,
  isDemoIdentity,
  isVerifiedReview,
  median,
  programVerdict,
  renewalComponent,
  requestResponseHours,
  responseComponent,
  responseHoursFromMessages,
  responseScore,
  retentionComponent,
  reviewComponent,
  smoothedMean,
  trustMultiplier,
  type MeritInputs,
  type ProgramOutcome,
  type ReviewSignal,
  type StudentSignals,
} from "@/lib/mentorRanking";

// تست‌های واحدِ رتبه‌بندیِ شایستگی — بدونِ دیتابیس.

const NOW = new Date("2026-09-27T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * DAY - hours * 3_600_000);

function student(over: Partial<StudentSignals> = {}): StudentSignals {
  return {
    studentId: over.studentId ?? `s${Math.random().toString(36).slice(2, 8)}`,
    startedAt: ago(60),
    endedAt: null,
    adherence: { completed: 0, partial: 0, missed: 0 },
    programs: [],
    responseHours: [],
    ...over,
  };
}

const prog = (over: Partial<ProgramOutcome> = {}): ProgramOutcome => ({
  status: "COMPLETED",
  activatedAt: ago(40),
  completedAt: ago(10),
  cancelledAt: null,
  endDate: ago(10),
  ...over,
});

function review(over: Partial<ReviewSignal> = {}): ReviewSignal {
  return {
    studentId: over.studentId ?? `r${Math.random().toString(36).slice(2, 8)}`,
    rating: 5,
    createdAt: ago(5),
    reviewerCreatedAt: ago(200),
    activeDays: 40,
    activatedPrograms: 1,
    engagementEntries: 30,
    ...over,
  };
}

const NEUTRAL: Omit<MeritInputs, "students" | "reviews"> = {
  trust: { identityVerified: true, certificateVerified: true },
  integrity: { openReporters: 0, resolvedReporters: 0, recentSuspension: false },
  lastActiveAt: NOW,
};

describe("کمک‌تابع‌ها", () => {
  it("وزن‌ها جمعاً ۱ هستند", () => {
    const sum = Object.values(MERIT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("smoothedMean: بدونِ داده = پیش‌فرض؛ داده‌ی زیاد = مقدارِ واقعی؛ همیشه ۰..۱", () => {
    expect(smoothedMean(0, 0, 0.5, 3)).toBeCloseTo(0.5);
    expect(smoothedMean(1000, 1000, 0.5, 3)).toBeGreaterThan(0.99);
    expect(smoothedMean(-5, -5, 0.5, 3)).toBeCloseTo(0.5);
    expect(smoothedMean(1e9, 1, 0.5, 3)).toBeLessThanOrEqual(1);
  });

  it("median", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it("isDemoIdentity فقط با هر دو شرط", () => {
    expect(isDemoIdentity({ email: "demo+1@demo.arion.local", username: "demo_sara" })).toBe(true);
    expect(isDemoIdentity({ email: "demo+1@demo.arion.local", username: "sara" })).toBe(false);
    expect(isDemoIdentity({ email: "sara@gmail.com", username: "demo_sara" })).toBe(false);
    expect(isDemoIdentity({ email: null, username: null })).toBe(false);
  });
});

describe("پایبندی", () => {
  it("نرخِ واقعی با PARTIAL نصف؛ بدونِ داده = پیش‌فرض", () => {
    expect(adherenceComponent([]).value).toBeCloseTo(RANKING_RULES.adherencePrior);
    const r = adherenceComponent([student({ adherence: { completed: 10, partial: 4, missed: 6 } })]);
    expect(r.raw).toBeCloseTo((10 + 2) / 20);
    expect(r.entries).toBe(20);
  });

  it("ضدِ دست‌کاری: یک شاگردِ پرثبت بیش از یک رأی نمی‌گیرد", () => {
    const heavy = student({ adherence: { completed: 5000, partial: 0, missed: 0 } });
    const bad = Array.from({ length: 4 }, () => student({ adherence: { completed: 0, partial: 0, missed: 20 } }));
    const r = adherenceComponent([heavy, ...bad]);
    // ۱ رأیِ ۱۰۰٪ + ۴ رأیِ ۰٪ + پیش‌فرض (۰٫۵ × ۳) = ۲٫۵ ÷ ۸
    expect(r.value).toBeCloseTo(2.5 / 8);
  });

  it("شاگردی با دو ثبت سهمِ کمی دارد", () => {
    const tiny = adherenceComponent([student({ adherence: { completed: 2, partial: 0, missed: 0 } })]);
    const full = adherenceComponent([student({ adherence: { completed: 14, partial: 0, missed: 0 } })]);
    expect(tiny.value).toBeLessThan(full.value);
    expect(tiny.value).toBeLessThan(0.6);
  });
});

describe("تکمیلِ برنامه", () => {
  it("programVerdict: کوتاه‌تر از یک هفته نادیده، لغو = شکست، فعالِ رهاشده = شکست، در جریان = نادیده", () => {
    expect(programVerdict(prog(), NOW)).toBe("completed");
    expect(programVerdict(prog({ activatedAt: ago(12), completedAt: ago(10) }), NOW)).toBe("ignored");
    expect(programVerdict(prog({ status: "CANCELLED", completedAt: null, cancelledAt: ago(3) }), NOW)).toBe("failed");
    expect(programVerdict(prog({ status: "ACTIVE", completedAt: null, endDate: ago(RANKING_RULES.abandonGraceDays + 2) }), NOW)).toBe("failed");
    expect(programVerdict(prog({ status: "ACTIVE", completedAt: null, endDate: ago(2) }), NOW)).toBe("ignored");
  });

  it("هموارسازی: ۱ از ۱ از ۱۰ از ۱۰ کمتر است", () => {
    const one = completionComponent([student({ programs: [prog()] })], NOW);
    const ten = completionComponent(Array.from({ length: 10 }, () => student({ programs: [prog()] })), NOW);
    expect(one.value).toBeLessThan(ten.value);
    expect(one.raw).toBe(1);
  });

  it("ضدِ دست‌کاری: از هر شاگرد حداکثر ۳ برنامه شمرده می‌شود", () => {
    const pump = student({ programs: Array.from({ length: 30 }, (_, i) => prog({ activatedAt: ago(40 + i) })) });
    const r = completionComponent([pump], NOW);
    expect(r.started).toBe(RANKING_RULES.maxProgramsPerStudent);
  });

  it("برنامه‌های یک‌روزه‌ی ساختگی نرخِ تکمیل نمی‌سازند", () => {
    const fake = Array.from({ length: 10 }, () => student({ programs: [prog({ activatedAt: ago(11), completedAt: ago(10) })] }));
    expect(completionComponent(fake, NOW).started).toBe(0);
  });
});

describe("ماندگاری و تمدید", () => {
  it("شاگردِ زیرِ ۴ هفته هنوز قضاوت نمی‌شود", () => {
    const r = retentionComponent([student({ startedAt: ago(10) })], NOW);
    expect(r.sample).toBe(0);
    expect(r.value).toBeCloseTo(RANKING_RULES.retentionPrior);
  });

  it("ماند ≥ ۴ هفته در برابرِ رفتن زود", () => {
    const stayed = Array.from({ length: 6 }, () => student({ startedAt: ago(90), endedAt: ago(20) }));
    const left = Array.from({ length: 6 }, () => student({ startedAt: ago(90), endedAt: ago(85) }));
    expect(retentionComponent(stayed, NOW).raw).toBe(1);
    expect(retentionComponent(left, NOW).raw).toBe(0);
    expect(retentionComponent(stayed, NOW).value).toBeGreaterThan(retentionComponent(left, NOW).value);
  });

  it("تمدید: شروعِ برنامه‌ی بعد از تکمیل", () => {
    const renewed = student({ programs: [prog({ activatedAt: ago(80), completedAt: ago(50), endDate: ago(50) }), prog({ status: "ACTIVE", activatedAt: ago(49), completedAt: null, endDate: ago(-10) })] });
    const once = student({ programs: [prog()] });
    expect(renewalComponent([renewed], NOW).raw).toBe(1);
    expect(renewalComponent([once], NOW).raw).toBe(0);
    expect(renewalComponent([], NOW).raw).toBeNull();
  });
});

describe("سرعتِ پاسخ", () => {
  const M = "mentor";
  const S = "student";

  it("از اولین پیامِ بی‌جوابِ شاگرد تا پیامِ منتور", () => {
    const h = responseHoursFromMessages(
      [
        { senderId: S, createdAt: ago(3, 10) },
        { senderId: S, createdAt: ago(3, 9) },
        { senderId: M, createdAt: ago(3, 6) },
        { senderId: M, createdAt: ago(3, 5) },
        { senderId: S, createdAt: ago(2, 0) },
        { senderId: M, createdAt: ago(1, 0) },
      ],
      M,
      NOW
    );
    expect(h).toEqual([4, 24]);
  });

  it("پیامِ «ارسالِ گروهی» پاسخ حساب نمی‌شود", () => {
    const h = responseHoursFromMessages(
      [
        { senderId: S, createdAt: ago(2, 0) },
        { senderId: M, createdAt: ago(2, -1), broadcastId: "b1" },
        { senderId: M, createdAt: ago(1, 0) },
      ],
      M,
      NOW
    );
    expect(h).toEqual([24]);
  });

  it("بی‌جوابِ طولانی = نمونه‌ی دیر با سقف؛ بی‌جوابِ تازه قضاوت نمی‌شود", () => {
    expect(responseHoursFromMessages([{ senderId: S, createdAt: ago(20) }], M, NOW)).toEqual([RANKING_RULES.responseCapHours]);
    expect(responseHoursFromMessages([{ senderId: S, createdAt: ago(1) }], M, NOW)).toEqual([]);
  });

  it("پاسخ به درخواستِ شاگردی", () => {
    const base = { initiatedBy: "STUDENT", createdAt: ago(3), updatedAt: ago(3), startedAt: null as Date | null };
    expect(requestResponseHours({ ...base, status: "ACTIVE", startedAt: ago(2) }, NOW)).toBeCloseTo(24);
    expect(requestResponseHours({ ...base, status: "REJECTED", updatedAt: ago(2, 12) }, NOW)).toBeCloseTo(12);
    expect(requestResponseHours({ ...base, status: "PENDING" }, NOW)).toBeCloseTo(72);
    expect(requestResponseHours({ ...base, status: "PENDING", createdAt: ago(1) }, NOW)).toBeNull();
    expect(requestResponseHours({ ...base, initiatedBy: "MENTOR", status: "ACTIVE", startedAt: ago(2) }, NOW)).toBeNull();
  });

  it("responseScore: ۰ = ۱، ۲۴ ساعت = ۰٫۵، نزولی", () => {
    expect(responseScore(0)).toBe(1);
    expect(responseScore(24)).toBeCloseTo(0.5);
    expect(responseScore(72)).toBeLessThan(responseScore(24));
    expect(responseScore(10_000)).toBe(responseScore(RANKING_RULES.responseCapHours));
  });

  it("ضدِ دست‌کاری: هر شاگرد یک رأی (میانه‌ی خودش)", () => {
    const spammy = student({ responseHours: Array(200).fill(0) });
    const slow = Array.from({ length: 4 }, () => student({ responseHours: [96] }));
    const r = responseComponent([spammy, ...slow]);
    expect(r.sample).toBe(5);
    expect(r.medianHours).toBe(96);
  });

  it("درخواست‌های شروع‌نشده در سرعتِ پاسخ اثر دارند", () => {
    const fast = responseComponent([student({ responseHours: [1] })]);
    const withIgnored = responseComponent([student({ responseHours: [1] })], [[168], [168], [168]]);
    expect(withIgnored.value).toBeLessThan(fast.value);
  });
});

describe("نظرهای تأییدشده", () => {
  it("نظرِ بدونِ رابطه‌ی کافی یا بدونِ برنامه‌ی فعال‌شده شمرده نمی‌شود", () => {
    expect(isVerifiedReview(review())).toBe(true);
    expect(isVerifiedReview(review({ activeDays: RANKING_RULES.reviewMinActiveDays - 1 }))).toBe(false);
    expect(isVerifiedReview(review({ activatedPrograms: 0 }))).toBe(false);
    expect(isVerifiedReview(review({ rating: 9 }))).toBe(false);
  });

  it("وزنِ مشارکت ۰٫۴..۱", () => {
    expect(engagementWeight(0)).toBeCloseTo(RANKING_RULES.reviewBaseWeight);
    expect(engagementWeight(10_000)).toBe(1);
    expect(engagementWeight(10)).toBeGreaterThan(engagementWeight(0));
  });

  it("میانگینِ بیزی: یک نظرِ ۵ از ۲۰ نظرِ ۴٫۸ جلو نمی‌زند", () => {
    const one = reviewComponent([review({ rating: 5 })]);
    const many = reviewComponent(Array.from({ length: 20 }, (_, i) => review({ rating: i < 4 ? 4 : 5 })));
    expect(one.value).toBeLessThan(many.value);
  });

  it("ضدِ دست‌کاری: ده نظرِ ۵ستاره از رابطه‌های چندروزه هیچ اثری ندارد", () => {
    const fake = Array.from({ length: 10 }, () => review({ rating: 5, activeDays: 2, activatedPrograms: 0 }));
    const r = reviewComponent(fake);
    expect(r.verified).toBe(0);
    expect(r.excluded).toBe(10);
    expect(r.value).toBeCloseTo((RANKING_RULES.ratingPriorMean - 1) / 4);
  });

  it("رگبار: نظرهای حساب‌های تازه در یک پنجره کم‌اثر می‌شوند؛ حساب‌های قدیمی نه", () => {
    const burst = Array.from({ length: 8 }, (_, i) => review({ createdAt: ago(2, i), reviewerCreatedAt: ago(20) }));
    const f = burstFactors(burst);
    expect(f.every((x) => x === RANKING_RULES.burstAllowance / 8)).toBe(true);
    const old = Array.from({ length: 8 }, (_, i) => review({ createdAt: ago(2, i), reviewerCreatedAt: ago(400) }));
    expect(burstFactors(old).every((x) => x === 1)).toBe(true);
    const spread = Array.from({ length: 4 }, (_, i) => review({ createdAt: ago(i * 10), reviewerCreatedAt: ago(i * 10 + 5) }));
    expect(burstFactors(spread).every((x) => x === 1)).toBe(true);
  });

  it("رگبارِ ۱۰ نظرِ ۵ از حساب‌های نو کمتر از ۵ نظرِ ۵ از شاگردهای قدیمی اثر دارد", () => {
    const burst = reviewComponent(Array.from({ length: 10 }, (_, i) => review({ createdAt: ago(1, i), reviewerCreatedAt: ago(10) })));
    const organic = reviewComponent(Array.from({ length: 5 }, (_, i) => review({ createdAt: ago(i * 20), reviewerCreatedAt: ago(300) })));
    expect(burst.sample).toBeLessThan(organic.sample);
    expect(burst.value).toBeLessThan(organic.value);
  });
});

describe("ضریب‌ها", () => {
  it("شواهد: ۰ شاگرد = ۰٫۵، صعودی، همیشه < ۱", () => {
    expect(evidenceFactor(0)).toBe(0.5);
    expect(evidenceFactor(4)).toBeCloseTo(0.75);
    expect(evidenceFactor(100)).toBeLessThan(1);
    expect(evidenceFactor(10)).toBeGreaterThan(evidenceFactor(5));
  });

  it("اعتماد هیچ‌وقت بیش از ۱ نیست (جریمه‌ی نبودن، نه امتیازِ رایگان)", () => {
    expect(trustMultiplier({ identityVerified: true, certificateVerified: true })).toBe(1);
    expect(trustMultiplier({ identityVerified: true, certificateVerified: false })).toBeLessThan(1);
    expect(trustMultiplier({ identityVerified: false, certificateVerified: true })).toBeLessThan(trustMultiplier({ identityVerified: true, certificateVerified: false }));
  });

  it("سلامت: گزارشِ تأییدشده سنگین‌تر از باز؛ سقف و کف", () => {
    const clean = { openReporters: 0, resolvedReporters: 0, recentSuspension: false };
    expect(integrityMultiplier(clean)).toBe(1);
    expect(integrityMultiplier({ ...clean, resolvedReporters: 1 })).toBeLessThan(integrityMultiplier({ ...clean, openReporters: 1 }));
    expect(integrityMultiplier({ ...clean, openReporters: 50 })).toBeCloseTo(0.85);
    expect(integrityMultiplier({ openReporters: 9, resolvedReporters: 9, recentSuspension: true })).toBe(0.4);
  });

  it("فعالیت: ۰٫۸..۱", () => {
    expect(activityMultiplier(NOW, NOW)).toBe(1);
    expect(activityMultiplier(ago(14), NOW)).toBeCloseTo(0.9);
    expect(activityMultiplier(null, NOW)).toBe(0.8);
  });
});

describe("computeMerit — امتیازِ نهایی", () => {
  const goodStudents = () =>
    Array.from({ length: 8 }, () =>
      student({
        startedAt: ago(80),
        adherence: { completed: 30, partial: 4, missed: 4 },
        programs: [prog()],
        responseHours: [3],
      })
    );

  it("منتورِ با نتیجه‌ی واقعی از منتورِ پرشاگرد با نتیجه‌ی بد جلوتر است", () => {
    const good = computeMerit({ ...NEUTRAL, students: goodStudents(), reviews: [review(), review({ rating: 4 })] }, NOW);
    const bigBad = computeMerit(
      {
        ...NEUTRAL,
        students: Array.from({ length: 60 }, () =>
          student({ startedAt: ago(80), endedAt: ago(75), adherence: { completed: 2, partial: 0, missed: 30 }, programs: [prog({ status: "CANCELLED", completedAt: null, cancelledAt: ago(70) })], responseHours: [120] })
        ),
        reviews: [],
      },
      NOW
    );
    expect(good.score).toBeGreaterThan(bigBad.score);
    expect(good.eligible).toBe(true);
  });

  it("فقط نظرهای ۵ستاره (بدونِ نتیجه) منتور را بالا نمی‌برد", () => {
    const reviewsOnly = computeMerit(
      { ...NEUTRAL, students: [student({ startedAt: ago(5) })], reviews: Array.from({ length: 15 }, () => review({ activeDays: 3, activatedPrograms: 0 })) },
      NOW
    );
    const real = computeMerit({ ...NEUTRAL, students: goodStudents(), reviews: [] }, NOW);
    expect(real.score).toBeGreaterThan(reviewsOnly.score);
    expect(reviewsOnly.sample.verifiedReviews).toBe(0);
    expect(reviewsOnly.eligible).toBe(false);
  });

  it("احرازِ هویت بدونِ نتیجه امتیازِ رایگان نمی‌دهد", () => {
    const verifiedEmpty = computeMerit({ ...NEUTRAL, students: [], reviews: [] }, NOW);
    const unverifiedProven = computeMerit({ ...NEUTRAL, trust: { identityVerified: false, certificateVerified: false }, students: goodStudents(), reviews: [] }, NOW);
    expect(unverifiedProven.score).toBeGreaterThan(verifiedEmpty.score);
    expect(unverifiedProven.eligible).toBe(false);
    expect(unverifiedProven.ineligibleReasons).toContain("identity_unverified");
  });

  it("گزارشِ تأییدشده و تعلیقِ اخیر امتیاز را پایین و از «محبوب» بیرون می‌برد", () => {
    const clean = computeMerit({ ...NEUTRAL, students: goodStudents(), reviews: [] }, NOW);
    const reported = computeMerit({ ...NEUTRAL, integrity: { openReporters: 0, resolvedReporters: 2, recentSuspension: false }, students: goodStudents(), reviews: [] }, NOW);
    expect(reported.score).toBeLessThan(clean.score);
    expect(reported.ineligibleReasons).toContain("integrity");
  });

  it("حداقلِ نمونه برای «محبوب»", () => {
    const two = computeMerit({ ...NEUTRAL, students: goodStudents().slice(0, 2), reviews: [] }, NOW);
    expect(two.eligible).toBe(false);
    expect(two.ineligibleReasons).toContain("few_students");
    const noEvidence = computeMerit({ ...NEUTRAL, students: Array.from({ length: 5 }, () => student()), reviews: [] }, NOW);
    expect(noEvidence.ineligibleReasons).toContain("little_evidence");
  });

  it("خروجیِ breakdown کامل و قابلِ JSON است", () => {
    const b = computeMerit({ ...NEUTRAL, students: goodStudents(), reviews: [review()] }, NOW);
    const round = JSON.parse(JSON.stringify(b));
    expect(Object.keys(round.components).sort()).toEqual(Object.keys(MERIT_WEIGHTS).sort());
    expect(round.score).toBeGreaterThan(0);
    expect(round.score).toBeLessThanOrEqual(100);
    const q = Object.entries(MERIT_WEIGHTS).reduce((a, [k, w]) => a + w * round.components[k].value, 0);
    expect(q).toBeCloseTo(round.quality, 3);
  });
});

describe("ترتیب", () => {
  it("compareRanked قطعی: امتیاز، بعد شاگرد، بعد id", () => {
    const list = [
      { profileId: "c", score: 50, sampleStudents: 3 },
      { profileId: "a", score: 50, sampleStudents: 3 },
      { profileId: "b", score: 50, sampleStudents: 9 },
      { profileId: "d", score: 70, sampleStudents: 1 },
    ];
    expect([...list].sort(compareRanked).map((x) => x.profileId)).toEqual(["d", "b", "a", "c"]);
    expect([...list].reverse().sort(compareRanked).map((x) => x.profileId)).toEqual(["d", "b", "a", "c"]);
  });

  it("explorationOrder: در یک روز ثابت، بینِ روزها می‌چرخد", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ profileId: `p${i}` }));
    const d1 = explorationOrder(items, "2026-09-27").map((x) => x.profileId);
    expect(explorationOrder([...items].reverse(), "2026-09-27").map((x) => x.profileId)).toEqual(d1);
    const d2 = explorationOrder(items, "2026-09-28").map((x) => x.profileId);
    expect(d2).not.toEqual(d1);
    expect([...d2].sort()).toEqual([...d1].sort());
  });
});
