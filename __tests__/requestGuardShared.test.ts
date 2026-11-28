import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { bumpShared } from "@/lib/guard/sharedCounter";

// شمارنده‌ی مشترک روی Postgres واقعی: افزایش اتمی، حتی هم‌زمان
describe("shared counter (postgres)", () => {
  const key = `ai:test:u:shared-${Date.now()}`;
  afterAll(async () => { await prisma.rateCounter.deleteMany({ where: { key } }); });

  it("increments atomically under concurrency", async () => {
    const now = Date.now();
    const results = await Promise.all(Array.from({ length: 8 }, () => bumpShared(key, "ai", 60_000, now)));
    expect(results.every((r) => typeof r === "number")).toBe(true);
    expect([...(results as number[])].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const row = await prisma.rateCounter.findFirst({ where: { key } });
    expect(row?.count).toBe(8);
  });
});
