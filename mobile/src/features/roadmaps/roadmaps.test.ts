import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MobileRoadmap, RoadmapStage } from "@/lib/api-contract";
import { db } from "./db";
import { computeProgress, getRoadmap, regenerateRoadmapPart, sanitizeLocalProgress, seedRoadmap, toggleStep, toggleTask } from "./repo";
import type { RoadmapApi } from "./api";
import { parseGuide } from "./guide";

const T1 = "2026-09-21T10:00:00.000Z";
const T2 = "2026-09-22T10:00:00.000Z";

function stage(n: number, tasks = 2, detailed = true): RoadmapStage {
  return {
    n, title: `مرحله ${n}`, goal: "", duration: "", focus: "", why: "", detailed,
    prerequisites: [], topics: [],
    tasks: Array.from({ length: detailed ? tasks : 0 }, (_, i) => ({ title: `کار ${i + 1}`, detail: "", output: "" })),
    project: null, tools: [], resources: [], pitfalls: [], done: [],
  };
}

function roadmap(stages: RoadmapStage[], stepProgress: Record<string, boolean> = {}, editedAt = T1): MobileRoadmap {
  return {
    id: "croadmap000000000000000000000001", topic: "شبکه", goal: null, generatedByAi: true, createdAt: T1,
    plan: {
      title: "t", summary: "", guide: "", totalDuration: "", tools: [],
      meta: { audience: "", prerequisites: [], outcomes: [], certifications: [] },
      stages,
    },
    stepProgress, progress: computeProgress(stages, stepProgress), editedAt, updatedAt: editedAt,
  };
}

beforeEach(async () => {
  await db.roadmaps.clear();
  await db.progress.clear();
});

describe("roadmap progress (two-phase plan)", () => {
  it("percent counts only stage keys, never task keys — same as the server", () => {
    const stages = [stage(1), stage(2)];
    expect(computeProgress(stages, { "1": true, "1.1": true, "2.1": true, "2.2": true })).toEqual({ total: 2, done: 1, pct: 50 });
  });

  it("sanitize drops keys for stages/tasks that no longer exist", () => {
    expect(sanitizeLocalProgress([stage(1, 1)], { "1": true, "1.1": true, "1.2": true, "3": true })).toEqual({ "1": true, "1.1": true });
  });

  it("task toggles are local, dirty, and keyed n.i (1-based)", async () => {
    const rm = roadmap([stage(1), stage(2)]);
    await seedRoadmap(rm);
    await toggleTask(rm.id, 2, 0);
    await toggleStep(rm.id, 1);
    const row = await db.progress.get(rm.id);
    expect(row).toMatchObject({ stepProgress: { "2.1": true, "1": true }, dirty: 1 });
    expect(await getRoadmap(rm.id)).toMatchObject({ done: 1, total: 2, pct: 50 });
  });

  it("regenerate replaces cached content; a dirty local progress survives (sanitized)", async () => {
    const before = roadmap([stage(1, 3), stage(2, 0, false)]);
    await seedRoadmap(before);
    await toggleTask(before.id, 1, 2); // "1.3"
    await toggleTask(before.id, 1, 0); // "1.1"

    const after = roadmap([stage(1, 1), stage(2, 2)], {}, T2);
    const api = { regenerate: vi.fn(async () => ({ roadmap: after })) } as unknown as RoadmapApi;
    await regenerateRoadmapPart(api, before.id, { target: "stage", n: 1 });

    expect(api.regenerate).toHaveBeenCalledWith(before.id, { target: "stage", n: 1 });
    expect((await db.roadmaps.get(before.id))?.plan.stages[1].detailed).toBe(true);
    expect(await db.progress.get(before.id)).toMatchObject({ stepProgress: { "1.1": true }, dirty: 1 });
  });

  it("regenerate takes the server progress when nothing local is pending", async () => {
    const before = roadmap([stage(1)], { "1.1": true });
    await seedRoadmap(before);
    const after = roadmap([stage(1)], { "1": true }, T2);
    const api = { regenerate: vi.fn(async () => ({ roadmap: after })) } as unknown as RoadmapApi;
    await regenerateRoadmapPart(api, before.id, { target: "guide" });
    expect(await db.progress.get(before.id)).toEqual({ id: before.id, stepProgress: { "1": true }, updatedAt: T2, dirty: 0 });
  });
});

describe("parseGuide", () => {
  it("handles headings, bullet and numbered items, and strips **", () => {
    expect(parseGuide("## **شروع**\n1. اول\n- دوم\nمتن **مهم**")).toEqual([
      { kind: "h", text: "شروع" },
      { kind: "li", text: "اول" },
      { kind: "li", text: "دوم" },
      { kind: "p", text: "متن مهم" },
    ]);
  });
});
