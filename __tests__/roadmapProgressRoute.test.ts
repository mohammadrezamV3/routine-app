import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// روتِ پیشرفتِ نودها — بدونِ دیتابیسِ واقعی.
//
// چیزی که این‌جا اهمیت دارد و با mock هم کاملاً قابلِ سنجش است:
//   • بدونِ احراز هویت هیچ چیزی برنمی‌گردد
//   • کوئری همیشه userId دارد (جلوگیری از IDOR: رودمپِ کاربرِ دیگر)
//   • وضعیتِ نامعتبر و نودِ ناموجود رد می‌شوند
//   • درصد را *سرور* حساب می‌کند، نه چیزی که کلاینت فرستاده

const GRAPH_ROW = {
  id: "r1", userId: "owner", topic: "OWASP", title: "T", note: "", goal: "", level: "beginner",
  estimatedHours: 20, totalWeeks: 4,
  stages: [{
    id: "s1", title: "S1", description: "", order: 1,
    nodes: [
      { id: "a", title: "A", description: "", level: "beginner", estimatedHours: 10, prerequisites: [], topics: [], resources: [], tasks: [] },
      { id: "b", title: "B", description: "", level: "beginner", estimatedHours: 10, prerequisites: ["a"], topics: [], resources: [], tasks: [] },
    ],
  }],
  connections: [{ from: "a", to: "b" }],
  nodeProgress: {}, version: 1, history: [],
  deadlineMonths: null, resourceLang: null, budget: null, learnStyle: null,
  schedule: null, answers: null,
};

let guard: any = { ok: true, userId: "owner" };
vi.mock("@/lib/requireSuperAdmin", () => ({
  requireSuperAdmin: vi.fn(async () => guard),
}));

const findFirst = vi.fn();
const updateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { roadmap: { findFirst: (...a: any[]) => findFirst(...a), updateMany: (...a: any[]) => updateMany(...a) } },
}));

import { PATCH } from "@/app/api/roadmaps/[id]/progress/route";

function patch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/roadmaps/r1/progress", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  guard = { ok: true, userId: "owner" };
  findFirst.mockReset().mockResolvedValue(GRAPH_ROW);
  updateMany.mockReset().mockResolvedValue({ count: 1 });
});

describe("PATCH /api/roadmaps/[id]/progress — دسترسی", () => {
  it("بدونِ اجازه چیزی برنمی‌گرداند", async () => {
    const { NextResponse } = await import("next/server");
    guard = { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

    const res = await PATCH(patch({ nodeId: "a", status: "completed" }), { params: { id: "r1" } });
    expect(res.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("کوئری همیشه userId دارد — رودمپِ کاربرِ دیگر اصلاً خوانده نمی‌شود", async () => {
    await PATCH(patch({ nodeId: "a", status: "completed" }), { params: { id: "r1" } });

    const where = findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "r1", userId: "owner" });
    // نوشتن هم همین‌طور
    expect(updateMany.mock.calls[0][0].where).toMatchObject({ id: "r1", userId: "owner" });
  });

  it("رودمپی که مالِ کاربر نیست ۴۰۴ می‌گیرد (نه ۴۰۳ — وجودش هم لو نرود)", async () => {
    findFirst.mockResolvedValue(null);
    const res = await PATCH(patch({ nodeId: "a", status: "completed" }), { params: { id: "other" } });
    expect(res.status).toBe(404);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/roadmaps/[id]/progress — اعتبارسنجی", () => {
  it("وضعیتِ نامعتبر رد می‌شود", async () => {
    const res = await PATCH(patch({ nodeId: "a", status: "done" }), { params: { id: "r1" } });
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("ورودیِ بدونِ nodeId رد می‌شود", async () => {
    const res = await PATCH(patch({ foo: "bar" }), { params: { id: "r1" } });
    expect(res.status).toBe(400);
  });

  it("نودِ ناموجود ذخیره نمی‌شود", async () => {
    const res = await PATCH(patch({ nodeId: "ghost", status: "completed" }), { params: { id: "r1" } });
    expect(res.status).toBe(200);
    // پذیرفته شد ولی چیزی ننشست — کلیدِ ناشناس دور ریخته می‌شود
    expect(updateMany.mock.calls[0][0].data.nodeProgress).toEqual({});
  });
});

describe("PATCH /api/roadmaps/[id]/progress — محاسبه‌ی پیشرفت", () => {
  it("درصد را سرور حساب می‌کند", async () => {
    const res = await PATCH(patch({ nodeId: "a", status: "completed" }), { params: { id: "r1" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodeProgress).toEqual({ a: "completed" });
    expect(data.progress).toMatchObject({ total: 2, completed: 1, pct: 50, hoursDone: 10 });
  });

  it("درصدی که کلاینت بفرستد نادیده گرفته می‌شود", async () => {
    const res = await PATCH(
      patch({ nodeId: "a", status: "in_progress", progress: { pct: 100 }, pct: 100 }),
      { params: { id: "r1" } }
    );
    const data = await res.json();
    expect(data.progress.pct).toBe(0); // in_progress یعنی هنوز تمام نشده
    expect(data.progress.inProgress).toBe(1);
  });

  it("not_started وضعیت را پاک می‌کند، نه اینکه ذخیره‌اش کند", async () => {
    findFirst.mockResolvedValue({ ...GRAPH_ROW, nodeProgress: { a: "completed" } });
    const res = await PATCH(patch({ nodeId: "a", status: "not_started" }), { params: { id: "r1" } });
    const data = await res.json();
    expect(data.nodeProgress).toEqual({});
    expect(data.progress.pct).toBe(0);
  });

  it("نقشه‌ی کاملِ پیشرفت هم پذیرفته می‌شود و پاک‌سازی می‌شود", async () => {
    const res = await PATCH(
      patch({ nodeProgress: { a: "completed", b: "in_progress", ghost: "completed" } }),
      { params: { id: "r1" } }
    );
    const data = await res.json();
    expect(data.nodeProgress).toEqual({ a: "completed", b: "in_progress" });
    expect(data.progress).toMatchObject({ completed: 1, inProgress: 1, pct: 50 });
  });
});
