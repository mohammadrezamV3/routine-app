import { describe, it, expect } from "vitest";
import { parseProfile, parseAnswers, parseSchedule } from "@/lib/roadmapInput";
import { pushVersion, graphFromRow, MAX_HISTORY } from "@/lib/roadmapStore";
import { normalizeGraph } from "@/lib/roadmapGraph";

// ورودیِ کاربر مستقیم داخلِ پرامپت می‌رود و در دیتابیس می‌نشیند — پس این
// لایه همان جایی‌ست که باید جلوی ورودیِ بی‌سقف/بدشکل را بگیرد.

describe("parseProfile", () => {
  it("موضوعِ خالی را رد می‌کند", () => {
    expect(parseProfile({ topic: "" })).toMatchObject({ ok: false });
    expect(parseProfile({ topic: "   " })).toMatchObject({ ok: false });
    expect(parseProfile({})).toMatchObject({ ok: false });
    expect(parseProfile(null)).toMatchObject({ ok: false });
  });

  it("موضوعِ خیلی بلند را می‌بُرد (نه رد می‌کند)", () => {
    const r = parseProfile({ topic: "ا".repeat(5000) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile.topic.length).toBeLessThanOrEqual(120);
  });

  it("هدفِ خیلی بلند را هم می‌بُرد", () => {
    const r = parseProfile({ topic: "OWASP", goal: "x".repeat(5000) });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.profile.goal || "").length).toBeLessThanOrEqual(300);
  });

  it("فقط گزینه‌های مجاز را می‌پذیرد و بقیه را دور می‌ریزد", () => {
    const r = parseProfile({
      topic: "OWASP", level: "خدا", resourceLang: "کلینگان", budget: "نامحدود", learnStyle: "تله‌پاتی",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.level).toBeUndefined();
      expect(r.profile.resourceLang).toBeUndefined();
      expect(r.profile.budget).toBeUndefined();
      expect(r.profile.learnStyle).toBeUndefined();
    }
  });

  it("گزینه‌های معتبر را نگه می‌دارد", () => {
    const r = parseProfile({ topic: "OWASP", level: "از صفر", budget: "فقط رایگان" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.level).toBe("از صفر");
      expect(r.profile.budget).toBe("فقط رایگان");
    }
  });

  it("ددلاینِ بیرونِ بازه را نادیده می‌گیرد", () => {
    const bad = parseProfile({ topic: "x", deadlineMonths: 9999 });
    expect(bad.ok && bad.profile.deadlineMonths).toBeUndefined();
    const neg = parseProfile({ topic: "x", deadlineMonths: -3 });
    expect(neg.ok && neg.profile.deadlineMonths).toBeUndefined();
    const ok = parseProfile({ topic: "x", deadlineMonths: 6 });
    expect(ok.ok && ok.profile.deadlineMonths).toBe(6);
  });

  it("برنامه‌ی زمانیِ بدشکل باعث خطا می‌شود، ولی نبودنش نه", () => {
    expect(parseProfile({ topic: "x", schedule: { jsDays: [], minutesPerDay: 60, startTime: "18:00" } }))
      .toMatchObject({ ok: false });
    expect(parseProfile({ topic: "x" }).ok).toBe(true);
  });
});

describe("parseSchedule", () => {
  it("برنامه‌ی درست را می‌پذیرد", () => {
    expect(parseSchedule({ jsDays: [1, 3], minutesPerDay: 60, startTime: "18:00" }))
      .toEqual({ jsDays: [1, 3], minutesPerDay: 60, startTime: "18:00" });
  });
  it("روزِ تکراری و خارج از بازه را تمیز می‌کند", () => {
    expect(parseSchedule({ jsDays: [1, 1, 9, -2, 3], minutesPerDay: 60, startTime: "08:00" })?.jsDays)
      .toEqual([1, 3]);
  });
  it("دقیقه و ساعتِ نامعتبر را رد می‌کند", () => {
    expect(parseSchedule({ jsDays: [1], minutesPerDay: 2, startTime: "18:00" })).toBeNull();
    expect(parseSchedule({ jsDays: [1], minutesPerDay: 9999, startTime: "18:00" })).toBeNull();
    expect(parseSchedule({ jsDays: [1], minutesPerDay: 60, startTime: "25:00" })).toBeNull();
    expect(parseSchedule({ jsDays: [1], minutesPerDay: 60, startTime: "شب" })).toBeNull();
  });
  it("ورودیِ غیرشیء را رد می‌کند", () => {
    expect(parseSchedule(null)).toBeNull();
    expect(parseSchedule("x")).toBeNull();
  });
});

describe("parseAnswers", () => {
  it("جوابِ ناقص را دور می‌ریزد", () => {
    expect(parseAnswers([{ q: "س", a: "" }, { q: "", a: "ج" }, { q: "س۲", a: "ج۲" }]))
      .toEqual([{ q: "س۲", a: "ج۲" }]);
  });
  it("تعداد و طول را سقف می‌زند", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ q: `q${i}`, a: "x".repeat(2000) }));
    const out = parseAnswers(many);
    expect(out.length).toBeLessThanOrEqual(8);
    expect(out[0].a.length).toBeLessThanOrEqual(300);
  });
  it("ورودیِ غیرآرایه را خالی برمی‌گرداند", () => {
    expect(parseAnswers(null)).toEqual([]);
    expect(parseAnswers({ q: "a" })).toEqual([]);
  });
});

// ── نسخه‌بندی و بازخوانیِ گراف از ردیفِ دیتابیس ───────────────────────────

const GRAPH = normalizeGraph({
  title: "T", description: "d", goal: "g", level: "beginner",
  estimated_hours: 20, estimated_weeks: 4,
  stages: [{
    id: "s1", title: "S1", description: "", order: 1,
    nodes: [
      { id: "a", title: "A", description: "", level: "beginner", estimated_hours: 10, prerequisites: [], topics: [], resources: [], tasks: [] },
      { id: "b", title: "B", description: "", level: "beginner", estimated_hours: 10, prerequisites: ["a"], topics: [], resources: [], tasks: [] },
    ],
  }],
  connections: [{ from: "a", to: "b" }],
});

function owned(version: number, history: any[] = []) {
  return {
    id: "r1", userId: "u1", topic: "T", title: "T", version,
    graph: GRAPH, nodeProgress: { a: "completed" as const }, history,
    profile: { goal: null, level: null, deadlineMonths: null, resourceLang: null, budget: null, learnStyle: null, schedule: null, answers: null },
  };
}

describe("pushVersion", () => {
  it("نسخه‌ی فعلی را ته تاریخچه می‌گذارد", () => {
    const h = pushVersion(owned(3), "ویرایشِ تستی");
    expect(h).toHaveLength(1);
    expect(h[0].version).toBe(3);
    expect(h[0].reason).toBe("ویرایشِ تستی");
    expect(h[0].nodeProgress).toEqual({ a: "completed" });
  });

  it("تاریخچه بی‌نهایت رشد نمی‌کند", () => {
    const old = Array.from({ length: MAX_HISTORY + 3 }, (_, i) => ({
      version: i + 1, graph: GRAPH, nodeProgress: {}, savedAt: "", reason: `v${i}`,
    }));
    const h = pushVersion(owned(99, old), "تازه");
    expect(h).toHaveLength(MAX_HISTORY);
    // قدیمی‌ترین‌ها افتاده‌اند و تازه‌ترین سرِ جایش است
    expect(h[h.length - 1].version).toBe(99);
  });

  it("رودمپِ بدونِ گراف تاریخچه نمی‌سازد", () => {
    const noGraph = { ...owned(2), graph: null };
    expect(pushVersion(noGraph as any, "x")).toEqual([]);
  });
});

describe("graphFromRow", () => {
  const row = {
    title: "T", note: "d", goal: "g", level: "beginner",
    estimatedHours: 20, totalWeeks: 4,
    stages: GRAPH.stages, connections: GRAPH.connections,
  };

  it("ردیفِ گراف‌محور را بازمی‌سازد", () => {
    const g = graphFromRow(row as any);
    expect(g).not.toBeNull();
    expect(g!.stages[0].nodes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("رودمپِ قدیمی (بدونِ stages) null می‌دهد تا رندرِ قدیمی استفاده شود", () => {
    expect(graphFromRow({ ...row, stages: null } as any)).toBeNull();
    expect(graphFromRow({ ...row, stages: [] } as any)).toBeNull();
  });

  it("ردیفِ خرابِ غیرقابل‌نرمال‌سازی به‌جای کرش null می‌دهد", () => {
    expect(graphFromRow({ ...row, stages: ["نامعتبر"] } as any)).toBeNull();
  });
});
