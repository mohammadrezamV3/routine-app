import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ساخت برنامه‌ی بدنسازی دوفازی (تقسیم هفتگی → هر جلسه جدا و موازی)، بدون
// شبکه و دیتابیس واقعی. fetch جای گیت‌وی را می‌گیرد و از روی system prompt
// تشخیص می‌دهد کدام فاز صدا زده شده.

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

import { dayIssues, generateExercisePlan, minExercisesFor, splitIssues, type ExercisePlanProfile } from "@/lib/aiClient";

const PROFILE: ExercisePlanProfile = {
  level: "intermediate",
  goalLabel: "عضله‌سازی",
  gymDays: ["شنبه", "دوشنبه", "چهارشنبه"],
  equipment: "باشگاه کامل",
  hasPhysicalLimitation: false,
};

const SPLIT = {
  feasible: true,
  split: "PPL",
  days: [
    { day: "شنبه", focus: "سینه و پشت‌بازو", muscles: ["سینه", "پشت‌بازو"] },
    { day: "دوشنبه", focus: "پشت و جلوبازو", muscles: ["پشت", "جلوبازو"] },
    { day: "چهارشنبه", focus: "پا", muscles: ["چهارسر ران", "پشت ران", "ساق"] },
  ],
};

const ex = (name: string, muscle: string) => ({ name, muscle, sets: 4, reps: "8-12", rest: "90 ثانیه", note: "" });
const many = (muscle: string, n: number) => Array.from({ length: n }, (_, i) => ex(`${muscle} حرکت ${i + 1}`, muscle));

function reply(payload: unknown, finish = "stop") {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: typeof payload === "string" ? payload : JSON.stringify(payload) }, finish_reason: finish }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    }),
  } as any;
}
const systemOf = (init: any) => JSON.parse(init.body).messages.find((m: any) => m.role === "system").content as string;
const userOf = (init: any) => JSON.parse(init.body).messages.find((m: any) => m.role === "user").content as string;
const isSplit = (init: any) => systemOf(init).includes("تقسیم هفتگی* را طراحی کن");
const dayOf = (init: any) => /جلسه‌ی روز (\S+) را کامل/.exec(userOf(init))?.[1] ?? "";
const fullDay = (day: string) => SPLIT.days.find((d) => d.day === day)!.muscles.flatMap((m) => many(m, minExercisesFor(m, false) + 1));

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

describe("کف «برنامه‌ی کامل»", () => {
  it("عضله‌ی بزرگ 4، عضله‌ی کوچک 3؛ با محدودیت نوشته‌شده کف برداشته می‌شود", () => {
    expect(minExercisesFor("سینه", false)).toBe(4);
    expect(minExercisesFor("چهارسر ران", false)).toBe(4);
    expect(minExercisesFor("پشت", false)).toBe(4);
    expect(minExercisesFor("پشت‌بازو", false)).toBe(3);
    expect(minExercisesFor("جلو بازو", false)).toBe(3);
    expect(minExercisesFor("ساق", false)).toBe(3);
    expect(minExercisesFor("سینه", true)).toBe(1);
  });

  it("جلسه‌ی سه‌حرکتی برای عضله‌ی بزرگ ایراد دارد", () => {
    const issues = dayIssues([...many("سینه", 3), ...many("پشت‌بازو", 3)], ["سینه", "پشت‌بازو"], false);
    expect(issues.join(" ")).toContain("«سینه» فقط 3 حرکت");
    expect(issues.join(" ")).not.toContain("پشت‌بازو»");
    expect(dayIssues([...many("سینه", 4), ...many("پشت‌بازو", 3)], ["سینه", "پشت‌بازو"], false)).toEqual([]);
  });

  it("تقسیم هفتگی: روز جاافتاده/تکراری/بی‌عضله", () => {
    const issues = splitIssues([{ day: "شنبه", muscles: ["سینه"] }, { day: "شنبه", muscles: [] }], PROFILE.gymDays);
    expect(issues.join(" ")).toContain("دوشنبه");
    expect(issues.join(" ")).toContain("تکراری");
    expect(issues.join(" ")).toContain("هیچ عضله‌ی هدفی");
  });
});

describe("generateExercisePlan — دوفازی", () => {
  it("هر روز جدا و کامل ساخته می‌شود", async () => {
    fetchMock.mockImplementation(async (_u: string, init: any) => (isSplit(init) ? reply(SPLIT) : reply({ exercises: fullDay(dayOf(init)) })));
    const res = await generateExercisePlan(PROFILE, "u1");
    expect(res.feasible).toBe(true);
    if (!res.feasible) return;
    expect(res.days.map((d) => d.day)).toEqual(["شنبه", "دوشنبه", "چهارشنبه"]);
    expect(res.days[0].items).toHaveLength(5 + 4); // سینه 5 + پشت‌بازو 4
    expect(res.days[2].items).toHaveLength(5 + 5 + 4);
    // یک فراخوانی تقسیم + یک فراخوانی برای هر روز
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("جلسه‌ی سه‌حرکتی به مدل برگردانده و نسخه‌ی کامل جایگزین می‌شود", async () => {
    const seen: Record<string, number> = {};
    fetchMock.mockImplementation(async (_u: string, init: any) => {
      if (isSplit(init)) return reply(SPLIT);
      const day = dayOf(init);
      seen[day] = (seen[day] || 0) + 1;
      if (day === "شنبه" && seen[day] === 1) return reply({ exercises: [...many("سینه", 3), ...many("پشت‌بازو", 3)] });
      return reply({ exercises: fullDay(day) });
    });
    const res = await generateExercisePlan(PROFILE, "u1");
    if (!res.feasible) throw new Error("feasible expected");
    expect(seen["شنبه"]).toBe(2);
    expect(res.days[0].items.length).toBe(9);
  });

  it("خروجی بریده‌شده (سقف توکن) با سقف بالاتر دوباره گرفته می‌شود", async () => {
    const maxTokens: number[] = [];
    fetchMock.mockImplementation(async (_u: string, init: any) => {
      if (isSplit(init)) return reply(SPLIT);
      const day = dayOf(init);
      if (day === "دوشنبه") {
        maxTokens.push(JSON.parse(init.body).max_tokens);
        if (maxTokens.length === 1) return reply('{"exercises":[{"name":"بارفیکس"', "length");
      }
      return reply({ exercises: fullDay(day) });
    });
    const res = await generateExercisePlan(PROFILE, "u1");
    if (!res.feasible) throw new Error("feasible expected");
    expect(maxTokens[1]).toBeGreaterThan(maxTokens[0]);
    expect(res.days[1].items.length).toBe(9);
  });

  it("feasible:false فاز تقسیم مستقیم برمی‌گردد و جلسه‌ای ساخته نمی‌شود", async () => {
    fetchMock.mockImplementation(async () => reply({ feasible: false, message: "با یک روز در هفته این هدف ممکن نیست" }));
    const res = await generateExercisePlan(PROFILE, "u1");
    expect(res).toEqual({ feasible: false, message: "با یک روز در هفته این هدف ممکن نیست" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("کاربر بدون محدودیت: پرامپت کامل‌ترین برنامه را می‌خواهد؛ با محدودیت نوشته‌شده نه", async () => {
    const users: string[] = [];
    fetchMock.mockImplementation(async (_u: string, init: any) => {
      users.push(userOf(init));
      return isSplit(init) ? reply(SPLIT) : reply({ exercises: fullDay(dayOf(init)) });
    });
    await generateExercisePlan(PROFILE, "u1");
    expect(users[0]).toContain("کامل‌ترین برنامه را بده");
    users.length = 0;
    await generateExercisePlan({ ...PROFILE, hasPhysicalLimitation: true, limitationDetails: "درد زانو" }, "u1");
    expect(users[0]).toContain("کاربر خودش محدودیت نوشته");
    expect(users.find((u) => u.includes("جلسه‌ی روز"))).toContain("حداقل 1 حرکت");
  });
});
