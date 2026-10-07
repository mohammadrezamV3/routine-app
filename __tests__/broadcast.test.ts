import { describe, it, expect } from "vitest";
import {
  BROADCAST_BODY_MAX, BROADCAST_TITLE_MAX, canCancelBroadcast, dueBroadcastIds, isSafeBroadcastPath,
  parseBroadcastInput, parseSegment, trimBroadcasts, BROADCAST_KEEP, type BroadcastRecord,
} from "@/lib/broadcast";

const NOW = new Date("2026-10-07T10:00:00Z");
const ok = { title: "سلام", body: "متن", channels: ["inapp"], segment: { kind: "all" } };

function rec(p: Partial<BroadcastRecord>): BroadcastRecord {
  return {
    id: "a", title: "t", body: "b", url: null, channels: ["inapp"], segment: { kind: "all" }, status: "scheduled",
    sendAt: NOW.toISOString(), createdAt: NOW.toISOString(), createdBy: "u", createdByName: null, runs: 0, leaseUntil: null,
    cursor: null, recipients: 0, delivered: 0, pushSent: 0, startedAt: null, sentAt: null, error: null, ...p,
  };
}

describe("isSafeBroadcastPath", () => {
  it("accepts in-app paths only", () => {
    expect(isSafeBroadcastPath("/dashboard")).toBe(true);
    expect(isSafeBroadcastPath("/trade?share=1")).toBe(true);
    expect(isSafeBroadcastPath("//evil.com")).toBe(false);
    expect(isSafeBroadcastPath("/\\evil.com")).toBe(false);
    expect(isSafeBroadcastPath("https://evil.com")).toBe(false);
    expect(isSafeBroadcastPath("javascript:alert(1)")).toBe(false);
    expect(isSafeBroadcastPath("dashboard")).toBe(false);
    expect(isSafeBroadcastPath("/a b")).toBe(false);
  });
});

describe("parseBroadcastInput", () => {
  it("accepts a valid immediate message", () => {
    const r = parseBroadcastInput(ok, NOW);
    expect(r.ok && r.value.sendAt).toBe(null);
  });
  it("enforces limits", () => {
    expect(parseBroadcastInput({ ...ok, title: "x".repeat(BROADCAST_TITLE_MAX + 1) }, NOW).ok).toBe(false);
    expect(parseBroadcastInput({ ...ok, body: "x".repeat(BROADCAST_BODY_MAX + 1) }, NOW).ok).toBe(false);
    expect(parseBroadcastInput({ ...ok, title: "  " }, NOW).ok).toBe(false);
  });
  it("rejects bad links, channels and segments", () => {
    expect(parseBroadcastInput({ ...ok, url: "//x.com" }, NOW).ok).toBe(false);
    expect(parseBroadcastInput({ ...ok, channels: [] }, NOW).ok).toBe(false);
    expect(parseBroadcastInput({ ...ok, channels: ["sms"] }, NOW).ok).toBe(false);
    expect(parseBroadcastInput({ ...ok, segment: { kind: "module" } }, NOW).ok).toBe(false);
    expect(parseBroadcastInput({ ...ok, segment: { kind: "nope" } }, NOW).ok).toBe(false);
  });
  it("schedules only future times; past means now", () => {
    const future = parseBroadcastInput({ ...ok, sendAt: "2026-10-08T10:00:00Z" }, NOW);
    expect(future.ok && future.value.sendAt).toBe("2026-10-08T10:00:00.000Z");
    const past = parseBroadcastInput({ ...ok, sendAt: "2026-10-01T10:00:00Z" }, NOW);
    expect(past.ok && past.value.sendAt).toBe(null);
    expect(parseBroadcastInput({ ...ok, sendAt: "garbage" }, NOW).ok).toBe(false);
    expect(parseBroadcastInput({ ...ok, sendAt: "2027-12-01T00:00:00Z" }, NOW).ok).toBe(false);
  });
  it("dedupes channels", () => {
    const r = parseBroadcastInput({ ...ok, channels: ["push", "push", "inapp"] }, NOW);
    expect(r.ok && r.value.channels).toEqual(["push", "inapp"]);
  });
});

describe("parseSegment", () => {
  it("keeps module only for module kind", () => {
    expect(parseSegment({ kind: "module", module: "TRADE" })).toEqual({ kind: "module", module: "TRADE" });
    expect(parseSegment({ kind: "paid", module: "TRADE" })).toEqual({ kind: "paid" });
  });
});

describe("dueBroadcastIds", () => {
  it("picks due scheduled and stale sending, skips others", () => {
    const list = [
      rec({ id: "due", sendAt: "2026-10-07T09:00:00Z" }),
      rec({ id: "later", sendAt: "2026-10-07T11:00:00Z" }),
      rec({ id: "busy", status: "sending", leaseUntil: "2026-10-07T10:01:00Z" }),
      rec({ id: "stale", status: "sending", leaseUntil: "2026-10-07T09:59:00Z" }),
      rec({ id: "done", status: "sent" }),
      rec({ id: "x", status: "canceled", sendAt: "2026-10-07T09:00:00Z" }),
    ];
    expect(dueBroadcastIds(list, NOW)).toEqual(["due", "stale"]);
  });
});

describe("misc", () => {
  it("only scheduled can be canceled", () => {
    expect(canCancelBroadcast({ status: "scheduled" })).toBe(true);
    expect(canCancelBroadcast({ status: "sending" })).toBe(false);
  });
  it("trims to the newest records", () => {
    const many = Array.from({ length: BROADCAST_KEEP + 5 }, (_, i) => rec({ id: String(i), createdAt: new Date(2026, 0, 1, 0, i).toISOString() }));
    const t = trimBroadcasts(many);
    expect(t).toHaveLength(BROADCAST_KEEP);
    expect(t[0].id).toBe(String(BROADCAST_KEEP + 4));
  });
});
