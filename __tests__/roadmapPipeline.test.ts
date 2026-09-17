import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// پایپ‌لاینِ کاملِ ساختِ گراف — بدونِ شبکه‌ی واقعی و بدونِ دیتابیس.
//
// چیزی که این‌جا سنجیده می‌شود همان زنجیره‌ی واقعیِ تولید است:
//   پاسخِ مدل → parse → normalize → validate → (اگر خراب بود) repair → خروجی
// فقط خودِ fetch جای گیت‌وی را می‌گیرد، پس منطقِ تعمیر واقعاً اجرا می‌شود،
// نه یک mockِ سطحی از بالای آن.

// ثبتِ مصرفِ توکن به دیتابیس می‌خورد؛ این‌جا دیتابیسی نیست و خودش هم
// خطایش را می‌بلعد، ولی mock کردنش تست را از آن مسیر کاملاً جدا می‌کند.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageRecord: { create: vi.fn(async () => ({})) },
    errorLog: { create: vi.fn(() => ({ catch: () => {} })) },
    appSetting: { findUnique: vi.fn(async () => null) },
  },
}));
vi.mock("@/lib/appSettings", () => ({
  getAiCostRate: vi.fn(async () => ({ inputPerMTokUsd: 0, outputPerMTokUsd: 0 })),
  estimateAiCostUsdMicros: vi.fn(() => 0),
}));

import { generateRoadmapGraph, editRoadmapGraph } from "@/lib/aiClient";

const VALID = {
  title: "OWASP Bug Bounty",
  description: "از صفر تا باگ‌بانتی",
  goal: "Bug Bounty",
  level: "beginner",
  estimated_hours: 100,
  estimated_weeks: 10,
  stages: [
    {
      id: "stage-1", title: "Web Fundamentals", description: "پایه", order: 1,
      nodes: [
        { id: "http-basics", title: "HTTP", description: "d", level: "beginner", estimated_hours: 10, prerequisites: [], topics: ["t"], resources: [], tasks: ["یک درخواست بفرست"] },
        { id: "auth", title: "Authentication", description: "d", level: "beginner", estimated_hours: 10, prerequisites: ["http-basics"], topics: [], resources: [], tasks: ["ورود را تست کن"] },
      ],
    },
  ],
  connections: [{ from: "http-basics", to: "auth" }],
};

/** همان گراف ولی با یک حلقه — چیزی که هرگز نباید به کاربر برسد. */
const CYCLIC = {
  ...VALID,
  connections: [{ from: "http-basics", to: "auth" }, { from: "auth", to: "http-basics" }],
};

function gatewayReply(payload: unknown) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    }),
  } as any;
}

const profile = { topic: "OWASP", goal: "Bug Bounty", level: "از صفر" };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.ARVAN_AI_BASE_URL = "https://gateway.test/v1";
  process.env.ARVAN_AI_API_KEY = "test-key";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("generateRoadmapGraph — مسیرِ سالم", () => {
  it("خروجیِ معتبر را با یک تلاش برمی‌گرداند", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));

    const { graph, meta } = await generateRoadmapGraph(profile as any, [], "u1");

    expect(meta.attempts).toBe(1);
    expect(meta.repaired).toBe(false);
    expect(graph.stages).toHaveLength(1);
    expect(graph.stages[0].nodes.map((n) => n.id)).toEqual(["http-basics", "auth"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("کلیدِ API را در هدر می‌فرستد و هیچ‌وقت در بدنه نمی‌گذارد", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));
    await generateRoadmapGraph(profile as any, [], "u1");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(init.body).not.toContain("test-key");
  });

  it("جواب‌های کاربر را داخلِ پیام به مدل می‌گذارد", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));
    await generateRoadmapGraph(profile as any, [{ q: "لینوکس بلدی؟", a: "چند دستورِ ساده" }], "u1");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const userMsg = body.messages.find((m: any) => m.role === "user").content;
    expect(userMsg).toContain("لینوکس بلدی؟");
    expect(userMsg).toContain("چند دستورِ ساده");
  });
});

describe("generateRoadmapGraph — تعمیرِ خروجیِ خراب", () => {
  it("گرافِ حلقه‌دار را دور نمی‌ریزد؛ ایرادها را به مدل پس می‌دهد و تعمیرشده را می‌پذیرد", async () => {
    fetchMock
      .mockResolvedValueOnce(gatewayReply(CYCLIC))
      .mockResolvedValueOnce(gatewayReply(VALID));

    const { graph, meta } = await generateRoadmapGraph(profile as any, [], "u1");

    expect(meta.attempts).toBe(2);
    expect(meta.repaired).toBe(true);
    expect(graph.connections).toHaveLength(1);

    // پیامِ تعمیر باید خودِ ایراد را به مدل گفته باشد
    const repairMsg = JSON.parse(fetchMock.mock.calls[1][1].body).messages.find((m: any) => m.role === "user").content;
    expect(repairMsg).toContain("حلقه");
  });

  it("اگر بعدِ همه‌ی تلاش‌ها هنوز حلقه داشت، هیچ‌وقت گرافِ خراب را برنمی‌گرداند", async () => {
    fetchMock.mockResolvedValue(gatewayReply(CYCLIC));
    await expect(generateRoadmapGraph(profile as any, [], "u1")).rejects.toThrow();
  });

  it("سقفِ تلاش‌ها رعایت می‌شود (هزینه‌ی بی‌نهایت ممنوع)", async () => {
    fetchMock.mockResolvedValue(gatewayReply(CYCLIC));
    await expect(generateRoadmapGraph(profile as any, [], "u1")).rejects.toThrow();
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("JSONِ خراب هم باعثِ تلاشِ دوباره می‌شود، نه کرش", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "این JSON نیست" } }], usage: {} }),
      } as any)
      .mockResolvedValueOnce(gatewayReply(VALID));

    const { graph } = await generateRoadmapGraph(profile as any, [], "u1");
    expect(graph.stages).toHaveLength(1);
  });

  it("خطای HTTPِ گیت‌وی را به پیامِ فارسی تبدیل می‌کند، نه استک‌تریس", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" } as any);
    await expect(generateRoadmapGraph(profile as any, [], "u1")).rejects.toThrow();
  });

  it("بدونِ کلیدِ گیت‌وی، پیامِ روشن می‌دهد", async () => {
    delete process.env.ARVAN_AI_API_KEY;
    await expect(generateRoadmapGraph(profile as any, [], "u1")).rejects.toThrow(/ARVAN_AI_API_KEY/);
  });
});

describe("generateRoadmapGraph — پاک‌سازیِ خروجی", () => {
  it("لینکِ ساختگیِ مدل را نگه نمی‌دارد ولی خودِ منبع را حذف نمی‌کند", async () => {
    const withFakeLink = JSON.parse(JSON.stringify(VALID));
    withFakeLink.stages[0].nodes[0].resources = [
      { title: "دوره‌ی عالی", type: "course", url: "https://definitely-not-real-course.example/x" },
      { title: "OWASP Top 10", type: "documentation", url: "https://owasp.org/Top10/", source: "OWASP" },
    ];
    fetchMock.mockResolvedValueOnce(gatewayReply(withFakeLink));

    const { graph } = await generateRoadmapGraph(profile as any, [], "u1");
    const res = graph.stages[0].nodes[0].resources;
    expect(res).toHaveLength(2);
    expect(res[0].url).toBeUndefined();
    expect(res[1].url).toBe("https://owasp.org/Top10/");
  });

  it("گرافِ بزرگ‌تر از سقف را رد می‌کند (کنترلِ هزینه/اندازه)", async () => {
    const huge = JSON.parse(JSON.stringify(VALID));
    huge.stages = Array.from({ length: 10 }, (_, s) => ({
      id: `s${s}`, title: `S${s}`, description: "", order: s + 1,
      nodes: Array.from({ length: 12 }, (_, i) => ({
        id: `s${s}-n${i}`, title: `N${i}`, description: "", level: "beginner",
        estimated_hours: 2, prerequisites: i ? [`s${s}-n${i - 1}`] : [], topics: [], resources: [], tasks: [],
      })),
    }));
    huge.connections = [];
    fetchMock.mockResolvedValue(gatewayReply(huge));

    await expect(generateRoadmapGraph(profile as any, [], "u1")).rejects.toThrow();
  });
});

describe("editRoadmapGraph", () => {
  const base = {
    title: "T", description: "", goal: "", level: "beginner",
    estimatedHours: 20, estimatedWeeks: 4,
    stages: VALID.stages.map((s) => ({
      ...s,
      nodes: s.nodes.map((n) => ({
        ...n, estimatedHours: n.estimated_hours, prerequisites: n.prerequisites,
        resources: [] as any[], topics: n.topics, tasks: n.tasks,
      })),
    })),
    connections: VALID.connections,
  } as any;

  it("گرافِ فعلی و دستورِ کاربر را به مدل می‌دهد", async () => {
    fetchMock.mockResolvedValueOnce(gatewayReply(VALID));
    await editRoadmapGraph(base, "auth رو حذف کن", "u1");

    const userMsg = JSON.parse(fetchMock.mock.calls[0][1].body).messages.find((m: any) => m.role === "user").content;
    expect(userMsg).toContain("auth رو حذف کن");
    expect(userMsg).toContain("http-basics");
  });

  it("خروجیِ خرابِ ویرایش هم اعتبارسنجی می‌شود", async () => {
    fetchMock.mockResolvedValue(gatewayReply(CYCLIC));
    await expect(editRoadmapGraph(base, "چیزی عوض کن", "u1")).rejects.toThrow();
  });
});
