import { describe, expect, it } from "vitest";
import {
  activeDayStreak, buildCsv, countActiveLastDays, csvCell, deriveUserStatus, isChurnRisk, normalizeTag, sanitizeFilters,
} from "@/lib/adminUsersView";

const now = new Date("2026-10-07T12:00:00Z");
const day = 86400000;
const paid = (endInDays: number) => ({ status: "ACTIVE", priceMonthly: 100, currentPeriodEnd: new Date(now.getTime() + endInDays * day) });

describe("isChurnRisk", () => {
  it("not paid -> never at risk", () => {
    expect(isChurnRisk([], null, now)).toBe(false);
    expect(isChurnRisk([{ status: "ACTIVE", priceMonthly: 0, currentPeriodEnd: now }], null, now)).toBe(false);
    expect(isChurnRisk([{ status: "EXPIRED", priceMonthly: 100, currentPeriodEnd: now }], null, now)).toBe(false);
  });
  it("paid ending within 7 days", () => {
    expect(isChurnRisk([paid(5)], new Date(now.getTime() - day), now)).toBe(true);
    expect(isChurnRisk([paid(30)], new Date(now.getTime() - day), now)).toBe(false);
  });
  it("paid inactive 7+ days or never", () => {
    expect(isChurnRisk([paid(30)], new Date(now.getTime() - 8 * day), now)).toBe(true);
    expect(isChurnRisk([paid(30)], new Date(now.getTime() - 6 * day), now)).toBe(false);
    expect(isChurnRisk([paid(30)], null, now)).toBe(true);
  });
});

describe("deriveUserStatus", () => {
  const base = { deletedAt: null, isBlocked: false, createdAt: new Date(now.getTime() - 100 * day) };
  it("priority", () => {
    expect(deriveUserStatus({ ...base, deletedAt: now, isBlocked: true }, [paid(9)], now, 14)).toBe("deleted");
    expect(deriveUserStatus({ ...base, isBlocked: true }, [paid(9)], now, 14)).toBe("blocked");
    expect(deriveUserStatus(base, [paid(9)], now, 14)).toBe("paid");
    expect(deriveUserStatus(base, [{ status: "EXPIRED", priceMonthly: 5, currentPeriodEnd: now }], now, 14)).toBe("expired");
    expect(deriveUserStatus(base, [], now, 14)).toBe("free");
    expect(deriveUserStatus({ ...base, createdAt: new Date(now.getTime() - 2 * day) }, [], now, 14)).toBe("trial");
  });
});

describe("csv", () => {
  it("escapes quotes and formula injection", () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(csvCell("-1+2")).toBe(`"'-1+2"`);
    expect(csvCell(null)).toBe('""');
    expect(csvCell("a,b\nc")).toBe('"a,b\nc"');
  });
  it("builds with BOM", () => {
    expect(buildCsv(["a", "b"], [[1, "x"]])).toBe('﻿"a","b"\n"1","x"');
  });
});

describe("tags and filters", () => {
  it("normalizes tags", () => {
    expect(normalizeTag("  hello   world ")).toBe("hello world");
    expect(normalizeTag("x".repeat(40))?.length).toBe(24);
    expect(normalizeTag("   ")).toBeNull();
  });
  it("sanitizes filters", () => {
    expect(sanitizeFilters({ tab: "evil", seen: "9d", signup: "30d", search: " hi " })).toMatchObject({ tab: "all", seen: "", signup: "30d", search: "hi" });
    expect(sanitizeFilters(null).tab).toBe("all");
    expect(sanitizeFilters({ tab: "risk" }).tab).toBe("risk");
  });
});

describe("activity", () => {
  const days = ["2026-10-07", "2026-10-06", "2026-10-05", "2026-10-02"];
  it("streak", () => {
    expect(activeDayStreak(days, "2026-10-07")).toBe(3);
    expect(activeDayStreak(["2026-10-06", "2026-10-05"], "2026-10-07")).toBe(2);
    expect(activeDayStreak(["2026-10-01"], "2026-10-07")).toBe(0);
  });
  it("week count", () => {
    expect(countActiveLastDays(days, "2026-10-07", 7)).toBe(4);
    expect(countActiveLastDays(days, "2026-10-07", 3)).toBe(3);
  });
});
