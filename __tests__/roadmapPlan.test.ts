import { describe, it, expect } from "vitest";
import {
  PLAN_LIMITS, computePlanProgress, countRowProgress, normalizePlan, parseHours, parseLevel,
  sanitizeStepProgress, sanitizeUrl, taskKey, validateGuide, validateOutline, validateStageDetail,
} from "@/lib/roadmapPlan";

// خروجیِ مدل هیچ تضمینی ندارد و مستقیم هم ذخیره می‌شود هم رندر — این لایه
// هر شکلِ بدقواره‌ای (و هر ردیفِ نسخه‌ی قبل) را به چیزی قابلِ رندر تبدیل می‌کند.

const STAGE = {
  title: "شبکه از صفر",
  goal: "بتوانی یک شبکه‌ی ساده را بخوانی",
  focus: "OSI، TCP/IP، DNS",
  duration: "۲ هفته",
  topics: [
    { title: "مدل OSI", detail: "هفت لایه", points: ["لایه‌ی ۳"] },
    { title: "TCP/IP", detail: "پروتکل‌ها", points: [] },
  ],
  tasks: [
    { title: "ترسیمِ شبکه‌ی خانه", detail: "با draw.io", output: "PNG" },
    { title: "ضبطِ ترافیک", detail: "Wireshark", output: "pcap" },
  ],
  tools: [{ name: "Wireshark", use: "تحلیل" }],
  resources: [{ title: "Cisco Networking Basics", type: "course", source: "Cisco" }],
  done: ["مسیرِ یک بسته را توضیح می‌دهی"],
};

const GOOD = {
  title: "از صفر تا امنیت شبکه",
  summary: "مسیری از مبانیِ شبکه تا کارِ واقعیِ امنیت",
  totalDuration: "۶ ماه",
  tools: [{ name: "Linux", use: "محیط" }],
  meta: { audience: "تازه‌کار", outcomes: ["اسکن"], level: "zero", weeklyHours: "8" },
  guide: "## مسیر در یک نگاه\n" + "متنِ واقعیِ راهنما. ".repeat(40),
  stages: [STAGE, { ...STAGE, title: "لینوکس" }, { ...STAGE, title: "امنیت" }],
};

describe("normalizePlan", () => {
  it("خروجیِ سالم را دست‌نخورده نگه می‌دارد", () => {
    const p = normalizePlan(GOOD);
    expect(p.stages).toHaveLength(3);
    expect(p.stages[0].topics[0].points).toEqual(["لایه‌ی ۳"]);
    expect(p.stages[0].detailed).toBe(true);
    expect(p.meta.level).toBe("zero");
    expect(validateOutline(p)).toEqual([]);
    expect(validateStageDetail(p.stages[0])).toEqual([]);
  });

  it("ردیفِ نسخه‌ی قبل (learn/do/tools رشته‌ای/done رشته‌ای) به شکلِ جدید نگاشت می‌شود", () => {
    const p = normalizePlan({
      title: "قدیمی",
      tools: ["Linux"],
      stages: [{ title: "م۱", learn: ["OSI"], do: ["ترسیم"], tools: ["Wireshark"], done: "تمام شد" }],
    });
    const st = p.stages[0];
    expect(st.topics).toEqual([{ title: "OSI", detail: "", points: [] }]);
    expect(st.tasks[0].title).toBe("ترسیم");
    expect(st.tools).toEqual([{ name: "Wireshark", use: "" }]);
    expect(st.done).toEqual(["تمام شد"]);
    expect(st.detailed).toBe(true);
    expect(p.tools).toEqual([{ name: "Linux", use: "" }]);
  });

  it("اسکلت (بدونِ سرفصل و کار) detailed نیست", () => {
    const p = normalizePlan({ stages: [{ title: "فقط اسکلت", goal: "g" }] });
    expect(p.stages[0].detailed).toBe(false);
  });

  it("شماره‌ی مرحله از ترتیبِ آرایه ساخته می‌شود", () => {
    const p = normalizePlan({ ...GOOD, stages: [{ ...STAGE, n: 7 }, { ...STAGE, title: "دوم", n: 0 }] });
    expect(p.stages.map((s) => s.n)).toEqual([1, 2]);
  });

  it("مرحله‌ی بی‌عنوان و ورودیِ غیرشیء دور ریخته می‌شود؛ سقفِ تعداد رعایت می‌شود", () => {
    expect(normalizePlan({ stages: [STAGE, { goal: "x" }, null, "متن"] }).stages).toHaveLength(1);
    const many = Array.from({ length: 40 }, (_, i) => ({ ...STAGE, title: `م${i}` }));
    expect(normalizePlan({ stages: many }).stages).toHaveLength(PLAN_LIMITS.maxStages);
  });

  it("فیلدهای بدشکل کرش نمی‌کنند", () => {
    const p = normalizePlan({ title: 42, guide: 5, meta: "x", stages: [{ ...STAGE, topics: 3, tools: null, project: "x" }] });
    expect(p.title).toBe("42");
    expect(p.guide).toBe("");
    expect(p.meta.outcomes).toEqual([]);
    expect(p.stages[0].topics).toEqual([]);
    expect(p.stages[0].project).toBeNull();
    expect(normalizePlan(null).stages).toEqual([]);
  });

  it("سطح/وقتِ ناشناخته در meta دور ریخته می‌شود", () => {
    const p = normalizePlan({ meta: { level: "god", weeklyHours: "99" } });
    expect(p.meta.level).toBeUndefined();
    expect(p.meta.weeklyHours).toBeUndefined();
    expect(parseLevel("mid")).toBe("mid");
    expect(parseHours("15")).toBe("15");
    expect(parseHours(15)).toBeUndefined();
  });

  it("شکستِ خطِ راهنما حفظ می‌شود", () => {
    const p = normalizePlan({ guide: "## تیتر\n\nبند اول\n- آیتم" });
    expect(p.guide.startsWith("## تیتر\n")).toBe(true);
  });
});

describe("sanitizeUrl", () => {
  it("دامنه‌ی شناخته‌شده می‌ماند، ساختگی و غیرِ http حذف می‌شود", () => {
    expect(sanitizeUrl("https://owasp.org/Top10/")).toBe("https://owasp.org/Top10/");
    expect(sanitizeUrl("https://definitely-not-real.example/course")).toBeUndefined();
    expect(sanitizeUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeUrl(null)).toBeUndefined();
  });
  it("زیردامنه قبول است ولی دامنه‌ی جعلیِ شبیه نه", () => {
    expect(sanitizeUrl("https://docs.github.com/x")).toContain("github.com");
    expect(sanitizeUrl("https://github.com.evil.example/x")).toBeUndefined();
  });
});

describe("اعتبارسنجی", () => {
  it("اسکلتِ کم‌مرحله، تکراری و بی‌هدف علامت می‌خورد", () => {
    const codes = validateOutline(normalizePlan({ title: "t", stages: [{ title: "a" }, { title: "a" }] })).map((i) => i.code);
    expect(codes).toContain("too_few_stages");
    expect(codes).toContain("duplicate_stage");
    expect(codes).toContain("no_goal");
    expect(codes).toContain("no_outcomes");
  });

  it("جزئیاتِ کم‌عمق علامت می‌خورد", () => {
    const st = normalizePlan({ stages: [{ title: "x", topics: ["فقط عنوان"], tasks: [] }] }).stages[0];
    const codes = validateStageDetail(st).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["few_topics", "topic_no_detail", "few_tasks", "no_checkpoint"]));
  });

  it("راهنمای کوتاه رد می‌شود و پیامش برای مدل قابلِ عمل است", () => {
    const issues = validateGuide("کوتاه");
    expect(issues[0].code).toBe("guide_too_short");
    expect(issues[0].message.length).toBeGreaterThan(10);
  });
});

describe("پیشرفت", () => {
  const stages = normalizePlan(GOOD).stages;

  it("کلیدِ مرحله و کارِ معتبر می‌ماند، ناموجود دور ریخته می‌شود", () => {
    expect(taskKey(1, 0)).toBe("1.1");
    expect(
      sanitizeStepProgress(stages, { "1": true, "1.2": true, "1.9": true, "99": true, "2": false })
    ).toEqual({ "1": true, "1.2": true });
  });

  it("ورودیِ بدشکل خالی برمی‌گردد", () => {
    expect(sanitizeStepProgress(stages, null)).toEqual({});
    expect(sanitizeStepProgress(stages, ["1"])).toEqual({});
  });

  it("درصد فقط از مرحله‌ها حساب می‌شود، نه کارها", () => {
    expect(computePlanProgress(stages, { "1": true, "2.1": true })).toEqual({ total: 3, done: 1, pct: 33 });
    expect(computePlanProgress([], {})).toEqual({ total: 0, done: 0, pct: 0 });
  });

  it("countRowProgress همان عدد را از ردیفِ خام می‌دهد", () => {
    expect(countRowProgress(stages, { "1": true, "1.1": true })).toEqual({ total: 3, done: 1 });
    expect(countRowProgress(null, null)).toEqual({ total: 0, done: 0 });
  });
});
