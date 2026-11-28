import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.ARION_GUARD_DISABLED = "0";
import { NextRequest } from "next/server";

vi.mock("@/lib/featureFlagsServer", () => ({ sessionFeatureBlocked: vi.fn(async () => null) }));
vi.mock("@/lib/serverSession", () => ({ getSessionFast: vi.fn(async () => ({ user: { id: "route-test-user" } })) }));
// شمارنده‌ی مشترک: دیتابیس خراب → باید fail-open بشه
vi.mock("@/lib/prisma", () => ({
  prisma: { rateCounter: { upsert: vi.fn(async () => { throw new Error("db down"); }), deleteMany: vi.fn(async () => ({})) } },
}));

import { GET } from "@/app/api/calorie/foods/route";
import { checkGuard, resetRequestGuardForTests } from "@/lib/requestGuard";
import { resetGuardStateForTests, getGate } from "@/lib/guard/registry";
import { resetSharedCounterForTests } from "@/lib/guard/sharedCounter";

function req(q: string) {
  return new NextRequest(`http://localhost/api/calorie/foods?q=${encodeURIComponent(q)}`);
}

beforeEach(() => { resetGuardStateForTests(); resetRequestGuardForTests(); resetSharedCounterForTests(); });

describe("food search route guard", () => {
  it("serves results, then answers 429 with Retry-After once the burst is exceeded", async () => {
    const statuses: number[] = [];
    let last: Response | null = null;
    for (let i = 0; i < 20; i++) { last = await GET(req("rice")); statuses.push(last.status); }
    expect(statuses[0]).toBe(200);
    expect(statuses).toContain(429);
    const limited = (await Promise.all([GET(req("rice"))]))[0];
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    expect((await limited.json()).error).toBeTruthy();
  });
  it("pathological query returns an empty list, not an error", async () => {
    const res = await GET(req("%%%%%%%%"));
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });
});

describe("checkGuard", () => {
  const r = new Request("http://localhost/x");
  it("sheds with 503 + Retry-After when the gate is saturated, and releases after", async () => {
    const gate = getGate("export");
    const held = Array.from({ length: gate.max }, () => gate.tryAcquire()!);
    const res = await checkGuard(r, { policy: "read", userId: "u-shed", gate: "export" });
    expect(res.ok).toBe(false);
    if (!res.ok) { expect(res.response.status).toBe(503); expect(res.response.headers.get("Retry-After")).toBe("5"); }
    held.forEach((h) => h());
    const ok = await checkGuard(r, { policy: "read", userId: "u-shed", gate: "export" });
    expect(ok.ok).toBe(true);
    if (ok.ok) ok.release();
    expect(gate.inFlight).toBe(0);
  });
  it("shared (db-backed) policies fail open when the database is down", async () => {
    const res = await checkGuard(r, { policy: "ai", userId: "u-ai" });
    expect(res.ok).toBe(true);
  });
  it("super admin bypasses the limit but not the gate", async () => {
    for (let i = 0; i < 30; i++) {
      const g = await checkGuard(r, { policy: "export", userId: "root", isSuperAdmin: true });
      expect(g.ok).toBe(true);
    }
  });
});
