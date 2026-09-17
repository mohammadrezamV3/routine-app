import { describe, it, expect } from "vitest";
import {
  PLAN_LIMITS, computePlanProgress, countRowProgress, normalizePlan,
  sanitizeStepProgress, sanitizeUrl, validatePlan,
} from "@/lib/roadmapPlan";

// خروجیِ مدل هیچ تضمینی ندارد و مستقیم هم ذخیره می‌شود هم رندر — پس این
// لایه همان جایی‌ست که باید هر شکلِ بدقواره‌ای را به چیزی قابلِ رندر
// تبدیل کند، و هرچه واقعاً ناقص است را برای تعمیر علامت بزند.

const STAGE = {
  title: "شبکه از صفر",
  goal: "بتوانی یک شبکه‌ی ساده را بخوانی",
  duration: "۲ هفته",
  learn: ["مدل OSI", "TCP/IP"],
  do: ["یک شبکه‌ی خانگی را ترسیم کن"],
  tools: ["Wireshark"],
  resources: [{ title: "Cisco Networking Basics", type: "course", source: "Cisco" }],
  done: "می‌توانی مسیرِ یک بسته را توضیح بدهی",
};

const GOOD = {
  title: "از صفر تا امنیت شبکه",
  summary: "مسیری از مبانیِ شبکه تا کارِ واقعیِ امنیت",
  totalDuration: "۶ ماه",
  tools: ["Linux", "Wireshark"],
  guide: "## مسیر در یک نگاه\n" + "متنِ واقعیِ راهنما. ".repeat(40),
  stages: [STAGE, { ...STAGE, title: "لینوکس" }],
};

describe("normalizePlan", () => {
  it("خروجیِ سالم را دست‌نخورده نگه می‌دارد", () => {
    const p = normalizePlan(GOOD);
    expect(p.title).toBe("از صفر تا امنیت شبکه");
    expect(p.stages).toHaveLength(2);
    expect(p.stages[0].learn).toEqual(["مدل OSI", "TCP/IP"]);
    expect(validatePlan(p)).toEqual([]);
  });

  it("شماره‌ی مرحله را از ترتیبِ آرایه می‌سازد، نه از عددی که مدل داده", () => {
    const p = normalizePlan({
      ...GOOD,
      stages: [{ ...STAGE, n: 7 }, { ...STAGE, title: "دوم", n: 7 }, { ...STAGE, title: "سوم", n: 0 }],
    });
    expect(p.stages.map((s) => s.n)).toEqual([1, 2, 3]);
  });

  it("مرحله‌ی بی‌عنوان و ورودیِ غیرشیء دور ریخته می‌شود", () => {
    const p = normalizePlan({ ...GOOD, stages: [STAGE, { goal: "بدونِ عنوان" }, null, "متن"] });
    expect(p.stages).toHaveLength(1);
  });

  it("سقفِ تعدادِ مرحله رعایت می‌شود", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...STAGE, title: `م${i}` }));
    expect(normalizePlan({ ...GOOD, stages: many }).stages).toHaveLength(PLAN_LIMITS.maxStages);
  });

  it("فیلدهای غیررشته‌ای کرش نمی‌کنند", () => {
    const p = normalizePlan({ title: 42, summary: null, guide: 5, stages: [{ ...STAGE, learn: "رشته نه آرایه", tools: null }] });
    expect(p.title).toBe("42");
    expect(p.guide).toBe("");
    expect(p.stages[0].learn).toEqual([]);
    expect(p.stages[0].tools).toEqual([]);
  });

  it("شکستِ خطِ متنِ راهنما حفظ می‌شود (بخشی از معنایش است)", () => {
    const p = normalizePlan({ ...GOOD, guide: "## تیتر\n\nبند اول\n- آیتم" });
    expect(p.guide).toContain("\n");
    expect(p.guide.startsWith("## تیتر")).toBe(true);
  });

  it("خروجیِ کاملاً خالی هم کرش نمی‌کند", () => {
    expect(normalizePlan(null).stages).toEqual([]);
    expect(normalizePlan(undefined).title).toBe("");
  });
});

describe("sanitizeUrl", () => {
  it("لینکِ دامنه‌ی شناخته‌شده می‌ماند", () => {
    expect(sanitizeUrl("https://owasp.org/Top10/")).toBe("https://owasp.org/Top10/");
    expect(sanitizeUrl("https://developer.mozilla.org/en-US/")).toContain("mozilla.org");
  });
  it("لینکِ ساختگیِ مدل حذف می‌شود — ۴۰۴ از نبودنِ لینک بدتر است", () => {
    expect(sanitizeUrl("https://definitely-not-real.example/course")).toBeUndefined();
  });
  it("هر چیزی که URLِ http(s) نیست رد می‌شود", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeUrl("data:text/html,<script>")).toBeUndefined();
    expect(sanitizeUrl("")).toBeUndefined();
    expect(sanitizeUrl(null)).toBeUndefined();
  });
  it("زیردامنه‌ی دامنه‌ی معتبر قبول است ولی دامنه‌ی جعلیِ شبیه به آن نه", () => {
    expect(sanitizeUrl("https://docs.github.com/x")).toContain("github.com");
    expect(sanitizeUrl("https://github.com.evil.example/x")).toBeUndefined();
  });
  it("منبعِ بدونِ لینکِ معتبر حذف نمی‌شود، فقط لینکش می‌رود", () => {
    const p = normalizePlan({
      ...GOOD,
      stages: [{ ...STAGE, resources: [{ title: "دوره‌ی عالی", type: "course", url: "https://fake.example/x" }] }],
    });
    expect(p.stages[0].resources).toHaveLength(1);
    expect(p.stages[0].resources[0].url).toBeUndefined();
  });
});

describe("validatePlan", () => {
  it("مسیرِ بدونِ مرحله رد می‌شود", () => {
    const issues = validatePlan(normalizePlan({ ...GOOD, stages: [] }));
    expect(issues.map((i) => i.code)).toContain("no_stages");
  });

  it("متنِ راهنمای کوتاه رد می‌شود — این بخش قرار نیست چند جمله باشد", () => {
    const issues = validatePlan(normalizePlan({ ...GOOD, guide: "خیلی کوتاه" }));
    expect(issues.map((i) => i.code)).toContain("guide_too_short");
  });

  it("مرحله‌ی تکراری و مرحله‌ی تهی علامت می‌خورند", () => {
    const issues = validatePlan(
      normalizePlan({
        ...GOOD,
        stages: [STAGE, STAGE, { title: "تهی", done: "x" }],
      })
    );
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("duplicate_stage");
    expect(codes).toContain("empty_stage");
  });

  it("مرحله‌ی بدونِ معیارِ اتمام علامت می‌خورد", () => {
    const issues = validatePlan(normalizePlan({ ...GOOD, stages: [{ ...STAGE, done: "" }] }));
    expect(issues.map((i) => i.code)).toContain("no_checkpoint");
  });

  it("پیامِ ایرادها برای خودِ مدل قابلِ عمل است (خالی نیستند)", () => {
    const issues = validatePlan(normalizePlan({ stages: [] }));
    expect(issues.length).toBeGreaterThan(0);
    for (const i of issues) expect(i.message.length).toBeGreaterThan(5);
  });
});

describe("پیشرفت", () => {
  const stages = normalizePlan(GOOD).stages;

  it("کلیدِ مرحله‌ی ناموجود دور ریخته می‌شود", () => {
    expect(sanitizeStepProgress(stages, { "1": true, "99": true, "2": false })).toEqual({ "1": true });
  });

  it("ورودیِ بدشکل خالی برمی‌گردد", () => {
    expect(sanitizeStepProgress(stages, null)).toEqual({});
    expect(sanitizeStepProgress(stages, ["1"])).toEqual({});
    expect(sanitizeStepProgress(stages, "1")).toEqual({});
  });

  it("درصد از روی خودِ مرحله‌ها حساب می‌شود", () => {
    expect(computePlanProgress(stages, { "1": true })).toEqual({ total: 2, done: 1, pct: 50 });
    expect(computePlanProgress(stages, {})).toEqual({ total: 2, done: 0, pct: 0 });
    expect(computePlanProgress([], {})).toEqual({ total: 0, done: 0, pct: 0 });
  });

  it("countRowProgress همان عدد را از ردیفِ خامِ دیتابیس می‌دهد", () => {
    expect(countRowProgress(stages, { "1": true })).toEqual({ total: 2, done: 1 });
    // بیرونِ ماژول هم نباید با ردیفِ خرابِ قدیمی کرش کند
    expect(countRowProgress(null, null)).toEqual({ total: 0, done: 0 });
    expect(countRowProgress("x", { "1": true })).toEqual({ total: 0, done: 0 });
  });
});
