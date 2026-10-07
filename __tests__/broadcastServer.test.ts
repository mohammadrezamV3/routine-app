import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/appSettings", () => ({ getAppSetting: vi.fn(), setAppSetting: vi.fn() }));
vi.mock("@/lib/webPush", () => ({ isPushConfigured: () => false, sendPushToUser: vi.fn() }));
vi.mock("@/lib/realtime", () => ({ publishToUser: vi.fn() }));
import { segmentWhere } from "@/lib/broadcastServer";

const NOW = new Date("2026-10-07T10:00:00Z");

describe("segmentWhere", () => {
  it("always excludes blocked and deleted users", () => {
    for (const kind of ["all", "paid", "trial", "inactive", "admins"] as const) {
      const w = segmentWhere({ kind }, NOW);
      expect(w.deletedAt).toBe(null);
      expect(w.isBlocked).toBe(false);
    }
  });
  it("inactive uses a 7 day cutoff", () => {
    const w: any = segmentWhere({ kind: "inactive" }, NOW);
    expect(w.sessions.none.lastSeenAt.gte.toISOString()).toBe("2026-09-30T10:00:00.000Z");
  });
  it("module requires an active, unexpired access row", () => {
    const w: any = segmentWhere({ kind: "module", module: "TRADE" }, NOW);
    expect(w.moduleAccess.some.module).toBe("TRADE");
    expect(w.moduleAccess.some.active).toBe(true);
  });
  it("admins covers owner and limited admins", () => {
    const w: any = segmentWhere({ kind: "admins" }, NOW);
    expect(w.OR).toHaveLength(2);
  });
});
