import { describe, it, expect } from "vitest";
import {
  normalizeGraph, validateGraph, findCycle, topologicalLayers,
  computeProgress, sanitizeProgress, sanitizeUrl, isNodeUnlocked,
  LIMITS, RoadmapGraph,
} from "@/lib/roadmapGraph";

// یک خروجیِ «سالم» شبیهِ چیزی که مدل باید بدهد — تست‌ها از روی همین
// خرابش می‌کنند تا هر اعتبارسنجی جدا سنجیده شود.
function rawGraph(overrides: any = {}) {
  return {
    title: "OWASP Bug Bounty Roadmap",
    description: "از صفر تا سطحِ باگ‌بانتی",
    goal: "Bug Bounty",
    level: "beginner",
    estimated_hours: 240,
    estimated_weeks: 24,
    stages: [
      {
        id: "stage-1",
        title: "Web Fundamentals",
        description: "پایه‌ی وب",
        order: 1,
        nodes: [
          {
            id: "http-basics", title: "HTTP Fundamentals", description: "…",
            level: "beginner", estimated_hours: 12, prerequisites: [],
            topics: ["Request/Response"], resources: [], tasks: ["یک درخواست را با curl بفرست"],
          },
          {
            id: "authentication", title: "Authentication", description: "…",
            level: "beginner", estimated_hours: 10, prerequisites: ["http-basics"],
            topics: [], resources: [], tasks: [],
          },
        ],
      },
      {
        id: "stage-2",
        title: "OWASP Top 10",
        description: "آسیب‌پذیری‌ها",
        order: 2,
        nodes: [
          {
            id: "sql-injection", title: "SQL Injection", description: "…",
            level: "intermediate", estimated_hours: 12, prerequisites: ["authentication"],
            topics: ["Blind SQLi"], resources: [], tasks: [],
          },
        ],
      },
    ],
    connections: [
      { from: "http-basics", to: "authentication" },
      { from: "authentication", to: "sql-injection" },
    ],
    ...overrides,
  };
}

describe("normalizeGraph", () => {
  it("خروجیِ سالم را بدونِ ایراد نرمال می‌کند", () => {
    const g = normalizeGraph(rawGraph());
    expect(g.stages).toHaveLength(2);
    expect(g.stages[0].nodes).toHaveLength(2);
    expect(validateGraph(g)).toEqual([]);
  });

  it("ترتیبِ مرحله‌ها را بازنویسی می‌کند حتی اگر مدل عددِ پرت داده باشد", () => {
    const g = normalizeGraph(rawGraph({
      stages: [
        { ...rawGraph().stages[1], order: 9 },
        { ...rawGraph().stages[0], order: 4 },
      ],
    }));
    expect(g.stages.map((s) => s.order)).toEqual([1, 2]);
    // مرحله‌ای که عددِ کوچک‌تر داشت باید اول بیاید
    expect(g.stages[0].title).toBe("Web Fundamentals");
  });

  it("یال‌های connections و prerequisites را یکی می‌کند (بدونِ تکرار)", () => {
    const g = normalizeGraph(rawGraph({
      connections: [
        { from: "http-basics", to: "authentication" },
        { from: "http-basics", to: "authentication" }, // تکراری
      ],
    }));
    const edges = g.connections.filter((c) => c.from === "http-basics" && c.to === "authentication");
    expect(edges).toHaveLength(1);
    // یالِ authentication→sql-injection از prerequisites درآمده، نه connections
    expect(g.connections).toContainEqual({ from: "authentication", to: "sql-injection" });
  });

  it("prerequisites را با یال‌های واقعی هم‌خوان می‌کند", () => {
    // مدل یال را فقط در connections داده و prerequisites را جا انداخته
    const raw = rawGraph();
    raw.stages[1].nodes[0].prerequisites = [];
    const g = normalizeGraph(raw);
    expect(g.stages[1].nodes[0].prerequisites).toEqual(["authentication"]);
  });

  it("نودِ بدونِ عنوان یا شناسه را دور می‌ریزد", () => {
    const raw = rawGraph();
    raw.stages[0].nodes.push({ id: "", title: "", description: "x" } as any);
    const g = normalizeGraph(raw);
    expect(g.stages[0].nodes).toHaveLength(2);
  });

  it("اگر مدل estimated_hours کلی نداده باشد، از جمعِ نودها حساب می‌کند", () => {
    const g = normalizeGraph(rawGraph({ estimated_hours: 0 }));
    expect(g.estimatedHours).toBe(34);
  });

  it("ورودیِ غیرشیء را رد می‌کند", () => {
    expect(() => normalizeGraph(null)).toThrow();
    expect(() => normalizeGraph("x")).toThrow();
  });
});

describe("sanitizeUrl — جلوگیری از لینکِ جعلی", () => {
  it("دامنه‌ی مرجعِ https را می‌پذیرد", () => {
    expect(sanitizeUrl("https://owasp.org/Top10/")).toBe("https://owasp.org/Top10/");
    expect(sanitizeUrl("https://developer.mozilla.org/en-US/docs/Web/HTTP")).toContain("mozilla.org");
    expect(sanitizeUrl("https://www.portswigger.net/web-security")).toContain("portswigger.net");
  });
  it("زیردامنه‌ی دامنه‌ی مرجع را هم می‌پذیرد", () => {
    expect(sanitizeUrl("https://cheatsheetseries.owasp.org/x")).toBeTruthy();
  });
  it("دامنه‌ی ناشناس را رد می‌کند (لینکِ ساختگیِ مدل)", () => {
    expect(sanitizeUrl("https://best-owasp-course-2024.com/free")).toBeUndefined();
  });
  it("http و پروتکل‌های خطرناک را رد می‌کند", () => {
    expect(sanitizeUrl("http://owasp.org")).toBeUndefined();
    expect(sanitizeUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeUrl("data:text/html,<script>")).toBeUndefined();
  });
  it("ورودیِ بدشکل/خالی را رد می‌کند", () => {
    expect(sanitizeUrl("")).toBeUndefined();
    expect(sanitizeUrl("not a url")).toBeUndefined();
    expect(sanitizeUrl(42)).toBeUndefined();
  });
  it("منبع با URLِ نامعتبر حذف نمی‌شود، فقط لینکش می‌افتد", () => {
    const raw = rawGraph();
    raw.stages[0].nodes[0].resources = [
      { title: "منبعِ خوب", type: "documentation", url: "https://owasp.org/x", source: "OWASP" },
      { title: "منبعِ مشکوک", type: "course", url: "https://totally-real-course.example/x" },
    ] as any;
    const g = normalizeGraph(raw);
    const res = g.stages[0].nodes[0].resources;
    expect(res).toHaveLength(2);
    expect(res[0].url).toBeTruthy();
    expect(res[1].url).toBeUndefined();
    expect(res[1].title).toBe("منبعِ مشکوک");
  });
});

describe("findCycle", () => {
  it("گرافِ بدونِ حلقه را null برمی‌گرداند", () => {
    expect(findCycle(["a", "b", "c"], [{ from: "a", to: "b" }, { from: "b", to: "c" }])).toBeNull();
  });
  it("حلقه‌ی ساده را پیدا می‌کند", () => {
    const cycle = findCycle(["a", "b"], [{ from: "a", to: "b" }, { from: "b", to: "a" }]);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThanOrEqual(2);
  });
  it("حلقه‌ی بلندتر را هم پیدا می‌کند", () => {
    const cycle = findCycle(
      ["a", "b", "c", "d"],
      [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "a" }, { from: "c", to: "d" }]
    );
    expect(cycle).not.toBeNull();
    expect(cycle!).toContain("a");
    expect(cycle!).toContain("c");
  });
  it("خودارجاعی را حلقه حساب می‌کند", () => {
    expect(findCycle(["a"], [{ from: "a", to: "a" }])).not.toBeNull();
  });
  it("یالِ به نودِ ناموجود را نادیده می‌گیرد (نه کرش)", () => {
    expect(findCycle(["a"], [{ from: "a", to: "ghost" }])).toBeNull();
  });
});

describe("topologicalLayers", () => {
  it("لایه‌ها را به‌ترتیبِ وابستگی می‌دهد", () => {
    const layers = topologicalLayers(
      ["a", "b", "c"],
      [{ from: "a", to: "b" }, { from: "b", to: "c" }]
    );
    expect(layers).toEqual([["a"], ["b"], ["c"]]);
  });
  it("نودهای موازی را در یک لایه می‌گذارد", () => {
    const layers = topologicalLayers(
      ["root", "x", "y"],
      [{ from: "root", to: "x" }, { from: "root", to: "y" }]
    );
    expect(layers![0]).toEqual(["root"]);
    expect(layers![1].sort()).toEqual(["x", "y"]);
  });
  it("برای گرافِ حلقه‌دار null می‌دهد", () => {
    expect(topologicalLayers(["a", "b"], [{ from: "a", to: "b" }, { from: "b", to: "a" }])).toBeNull();
  });
});

describe("validateGraph", () => {
  function codes(g: RoadmapGraph) {
    return validateGraph(g).map((i) => i.code);
  }

  it("نودِ تکراری را می‌گیرد", () => {
    const raw = rawGraph();
    raw.stages[1].nodes[0].id = "http-basics"; // تکراری با مرحله‌ی اول
    expect(codes(normalizeGraph(raw))).toContain("duplicate_node");
  });

  it("پیش‌نیازِ ناموجود را می‌گیرد", () => {
    const raw = rawGraph();
    raw.stages[1].nodes[0].prerequisites = ["ghost-node"];
    raw.connections = [];
    expect(codes(normalizeGraph(raw))).toContain("unknown_prerequisite");
  });

  it("اتصالِ به نودِ ناموجود را می‌گیرد", () => {
    const raw = rawGraph();
    raw.connections.push({ from: "http-basics", to: "ghost" });
    expect(codes(normalizeGraph(raw))).toContain("unknown_connection");
  });

  it("حلقه را می‌گیرد و مسیرش را در پیام می‌آورد", () => {
    const raw = rawGraph();
    raw.connections.push({ from: "sql-injection", to: "http-basics" });
    const issues = validateGraph(normalizeGraph(raw));
    const cycle = issues.find((i) => i.code === "cycle");
    expect(cycle).toBeTruthy();
    expect(cycle!.message).toMatch(/→/);
  });

  it("خودارجاعی را می‌گیرد", () => {
    const raw = rawGraph();
    raw.stages[0].nodes[0].prerequisites = ["http-basics"];
    expect(codes(normalizeGraph(raw))).toContain("self_dependency");
  });

  it("نودِ یتیم را می‌گیرد", () => {
    const raw = rawGraph();
    raw.stages[1].nodes.push({
      id: "floating", title: "Floating", description: "", level: "beginner",
      estimated_hours: 5, prerequisites: [], topics: [], resources: [], tasks: [],
    } as any);
    expect(codes(normalizeGraph(raw))).toContain("orphan_node");
  });

  it("نودِ تکیِ بدونِ یال را یتیم حساب نمی‌کند", () => {
    const raw = rawGraph({
      stages: [{
        id: "s1", title: "تک", description: "", order: 1,
        nodes: [{ id: "only", title: "Only", description: "", level: "beginner", estimated_hours: 3, prerequisites: [], topics: [], resources: [], tasks: [] }],
      }],
      connections: [],
    });
    expect(codes(normalizeGraph(raw))).not.toContain("orphan_node");
  });

  it("پیش‌نیازی که در مرحله‌ی بعدی است را می‌گیرد", () => {
    const raw = rawGraph();
    // نودِ مرحله‌ی ۱ به نودِ مرحله‌ی ۲ وابسته شود
    raw.stages[0].nodes[0].prerequisites = ["sql-injection"];
    raw.connections = [{ from: "sql-injection", to: "http-basics" }];
    expect(codes(normalizeGraph(raw))).toContain("forward_prerequisite");
  });

  it("مرحله‌ی خالی را می‌گیرد", () => {
    const raw = rawGraph();
    raw.stages[1].nodes = [];
    expect(codes(normalizeGraph(raw))).toContain("empty_stage");
  });

  it("زمانِ تخمینیِ نامعتبر را می‌گیرد", () => {
    const raw = rawGraph();
    raw.stages[0].nodes[0].estimated_hours = 0;
    expect(codes(normalizeGraph(raw))).toContain("invalid_hours");
  });

  it("گرافِ خالی را می‌گیرد", () => {
    expect(codes(normalizeGraph({ title: "x", stages: [], connections: [] }))).toContain("empty_graph");
  });

  it("گرافِ بزرگ‌تر از سقف را می‌گیرد", () => {
    const nodes = Array.from({ length: LIMITS.maxNodesPerStage }, (_, i) => ({
      id: `n${i}`, title: `N${i}`, description: "", level: "beginner",
      estimated_hours: 2, prerequisites: i ? [`n${i - 1}`] : [], topics: [], resources: [], tasks: [],
    }));
    const stages = Array.from({ length: LIMITS.maxStages }, (_, s) => ({
      id: `s${s}`, title: `S${s}`, description: "", order: s + 1,
      nodes: nodes.map((n) => ({ ...n, id: `s${s}-${n.id}`, prerequisites: n.prerequisites.map((p) => `s${s}-${p}`) })),
    }));
    const g = normalizeGraph({ title: "big", stages, connections: [] });
    expect(validateGraph(g).map((i) => i.code)).toContain("too_many_nodes");
  });
});

describe("computeProgress", () => {
  const g = normalizeGraph(rawGraph());

  it("بدونِ هیچ پیشرفتی صفر است", () => {
    expect(computeProgress(g, {})).toMatchObject({ total: 3, completed: 0, pct: 0, hoursDone: 0 });
  });

  it("درصد را از روی نودهای تمام‌شده حساب می‌کند", () => {
    const p = computeProgress(g, { "http-basics": "completed" });
    expect(p.completed).toBe(1);
    expect(p.pct).toBe(33);
    expect(p.hoursDone).toBe(12);
  });

  it("in_progress جزوِ تمام‌شده‌ها نیست", () => {
    const p = computeProgress(g, { "http-basics": "in_progress" });
    expect(p.completed).toBe(0);
    expect(p.inProgress).toBe(1);
    expect(p.pct).toBe(0);
  });

  it("همه تمام‌شده یعنی ۱۰۰٪", () => {
    const p = computeProgress(g, {
      "http-basics": "completed", "authentication": "completed", "sql-injection": "completed",
    });
    expect(p.pct).toBe(100);
    expect(p.hoursDone).toBe(p.hoursTotal);
  });

  it("گرافِ بدونِ نود درصدش صفر است، نه NaN", () => {
    const empty = { ...g, stages: [] };
    expect(computeProgress(empty, {}).pct).toBe(0);
  });
});

describe("sanitizeProgress", () => {
  const g = normalizeGraph(rawGraph());

  it("کلیدِ نودِ ناموجود را دور می‌ریزد", () => {
    expect(sanitizeProgress(g, { ghost: "completed" })).toEqual({});
  });
  it("وضعیتِ نامعتبر را دور می‌ریزد", () => {
    expect(sanitizeProgress(g, { "http-basics": "done" })).toEqual({});
    expect(sanitizeProgress(g, { "http-basics": true })).toEqual({});
  });
  it("not_started را ذخیره نمی‌کند (حالتِ پیش‌فرض است)", () => {
    expect(sanitizeProgress(g, { "http-basics": "not_started" })).toEqual({});
  });
  it("وضعیتِ معتبر را نگه می‌دارد", () => {
    expect(sanitizeProgress(g, { "http-basics": "completed", "authentication": "in_progress" }))
      .toEqual({ "http-basics": "completed", "authentication": "in_progress" });
  });
  it("ورودیِ غیرشیء را خالی برمی‌گرداند", () => {
    expect(sanitizeProgress(g, null)).toEqual({});
    expect(sanitizeProgress(g, ["completed"])).toEqual({});
  });
});

describe("isNodeUnlocked", () => {
  const g = normalizeGraph(rawGraph());
  const auth = g.stages[0].nodes[1];

  it("نودِ بدونِ پیش‌نیاز همیشه باز است", () => {
    expect(isNodeUnlocked(g.stages[0].nodes[0], {})).toBe(true);
  });
  it("تا پیش‌نیاز تمام نشده قفل است", () => {
    expect(isNodeUnlocked(auth, {})).toBe(false);
    expect(isNodeUnlocked(auth, { "http-basics": "in_progress" })).toBe(false);
  });
  it("با تمام‌شدنِ پیش‌نیاز باز می‌شود", () => {
    expect(isNodeUnlocked(auth, { "http-basics": "completed" })).toBe(true);
  });
});
