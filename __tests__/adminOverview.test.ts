import { describe, it, expect } from "vitest";
import {
  tehranDayKey, lastDayKeys, bucketCounts, bucketSums, deltaPercent, sparklinePoints, areaPaths,
  barHeights, relativeTimeFa, mergeFeed, queueTotal, healthSummary, parseDashRange, dashRangeDays, safeRate, rialToToman,
} from "@/lib/adminOverview";

describe("adminOverview pure helpers", () => {
  it("tehranDayKey uses Tehran offset", () => {
    expect(tehranDayKey("2026-10-07T21:00:00Z")).toBe("2026-10-08");
    expect(tehranDayKey("2026-10-07T20:00:00Z")).toBe("2026-10-07");
  });
  it("lastDayKeys is ascending and ends at end day", () => {
    const k = lastDayKeys(new Date("2026-10-07T10:00:00Z"), 3);
    expect(k).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });
  it("bucketCounts / bucketSums ignore out of range and nulls", () => {
    const keys = ["2026-10-05", "2026-10-06"];
    expect(bucketCounts(["2026-10-05T10:00:00Z", "2026-10-05T11:00:00Z", "2026-10-06T10:00:00Z", "2026-01-01T00:00:00Z", null], keys)).toEqual([2, 1]);
    expect(bucketSums([{ at: "2026-10-06T10:00:00Z", value: 5 }, { at: "2026-10-06T12:00:00Z", value: 7 }], keys)).toEqual([0, 12]);
  });
  it("deltaPercent handles zero base without fake 100", () => {
    expect(deltaPercent(10, 5)).toBe(100);
    expect(deltaPercent(5, 10)).toBe(-50);
    expect(deltaPercent(0, 0)).toBe(0);
    expect(deltaPercent(3, 0)).toBeNull();
  });
  it("safeRate and rialToToman", () => {
    expect(safeRate(1, 4)).toBe(25);
    expect(safeRate(1, 0)).toBeNull();
    expect(rialToToman(12345)).toBe(1235);
  });
  it("sparklinePoints", () => {
    expect(sparklinePoints([])).toBe("");
    expect(sparklinePoints([5, 5, 5], 72, 26)).toBe("0.0,13.0 36.0,13.0 72.0,13.0");
    const p = sparklinePoints([0, 10], 72, 26, 2).split(" ");
    expect(p[0]).toBe("0.0,24.0");
    expect(p[1]).toBe("72.0,2.0");
  });
  it("areaPaths closes the area", () => {
    const { line, area } = areaPaths([1, 2, 3], 100, 100);
    expect(line.startsWith("M0.0")).toBe(true);
    expect(area.endsWith("Z")).toBe(true);
    expect(areaPaths([], 10, 10)).toEqual({ line: "", area: "" });
  });
  it("barHeights", () => {
    expect(barHeights([0, 0], 50)).toEqual([0, 0]);
    expect(barHeights([0, 1, 10], 50)).toEqual([0, 5, 50]);
  });
  it("relativeTimeFa", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    expect(relativeTimeFa("2026-10-07T11:59:50Z", now)).toBe("لحظاتی پیش");
    expect(relativeTimeFa("2026-10-07T11:50:00Z", now)).toBe("10 دقیقه پیش");
    expect(relativeTimeFa("2026-10-07T09:00:00Z", now)).toBe("3 ساعت پیش");
    expect(relativeTimeFa("2026-10-04T12:00:00Z", now)).toBe("3 روز پیش");
  });
  it("mergeFeed sorts desc, dedupes, limits", () => {
    const mk = (id: string, at: string, kind: any = "signup") => ({ id, kind, text: id, at, href: "/" });
    const out = mergeFeed([[mk("a", "2026-10-01T00:00:00Z"), mk("b", "2026-10-03T00:00:00Z")], [mk("a", "2026-10-01T00:00:00Z"), mk("c", "2026-10-02T00:00:00Z", "ticket")]], 2);
    expect(out.map((x) => x.id)).toEqual(["b", "c"]);
  });
  it("queueTotal, healthSummary", () => {
    expect(queueTotal([{ count: 2 }, { count: -1 }, { count: 3 }])).toBe(5);
    expect(healthSummary({ dbConnected: false, errors24h: 0 })).toBe("bad");
    expect(healthSummary({ dbConnected: true, errors24h: 2 })).toBe("warn");
    expect(healthSummary({ dbConnected: true, errors24h: null })).toBe("ok");
  });
  it("range parsing", () => {
    expect(parseDashRange("bogus")).toBe("30d");
    expect(parseDashRange("90d")).toBe("90d");
    expect(dashRangeDays("today")).toBe(1);
  });
});
