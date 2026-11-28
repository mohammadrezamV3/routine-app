import { describe, it, expect } from "vitest";
import { hit, hitPolicy, effectiveCount, emptyWindow, type KeyState } from "@/lib/guard/slidingWindow";
import { Semaphore } from "@/lib/guard/semaphore";
import { CircuitBreaker, BreakerOpenError } from "@/lib/guard/breaker";
import { LruTtlCache } from "@/lib/guard/lruCache";
import { normalizeQuery } from "@/lib/guard/queryNormalize";
import { aggregateCounters } from "@/lib/guard/adminStats";
import { parseRetryAfterSec, isBackoffStatus, shouldSearch } from "@/lib/searchClient";
import { isRetryableStatus } from "@/lib/offline/sync";

describe("sliding window", () => {
  const rule = { limit: 3, windowMs: 10_000 };
  it("allows up to the limit then rejects with a retry-after", () => {
    let s: any; const t = 1_000_000;
    for (let i = 0; i < 3; i++) { const r = hit(s, t + i, rule); expect(r.decision.allowed).toBe(true); s = r.state; }
    const r = hit(s, t + 5, rule);
    expect(r.decision.allowed).toBe(false);
    expect(r.decision.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(r.decision.retryAfterSec).toBeLessThanOrEqual(10);
  });
  it("previous window weight decays so a burst at the boundary is still limited", () => {
    let s: any; const start = 1_000_000 - (1_000_000 % 10_000);
    for (let i = 0; i < 3; i++) s = hit(s, start + 9_000, rule).state;
    // just after the boundary the old window still counts almost fully
    expect(hit(s, start + 10_100, rule).decision.allowed).toBe(false);
    // late in the next window it has decayed
    expect(hit(s, start + 19_500, rule).decision.allowed).toBe(true);
  });
  it("a long gap resets completely", () => {
    let s: any; for (let i = 0; i < 3; i++) s = hit(s, 5_000_000, rule).state;
    expect(hit(s, 5_000_000 + 60_000, rule).decision.allowed).toBe(true);
  });
  it("effective count weights the previous window", () => {
    const w = { start: 0, cur: 2, prev: 10 };
    expect(effectiveCount(w, 5_000, 10_000)).toBe(7);
    expect(effectiveCount(emptyWindow(0, 10_000), 0, 10_000)).toBe(0);
  });
  it("burst rule rejects even when sustained has room, and rejected hits are not counted", () => {
    const policy = { sustained: { limit: 100, windowMs: 60_000 }, burst: { limit: 2, windowMs: 3_000 } };
    let st: KeyState | undefined; const t = 2_000_000;
    for (let i = 0; i < 2; i++) { const r = hitPolicy(st, t, policy); expect(r.decision.allowed).toBe(true); st = r.state; }
    const r = hitPolicy(st, t + 10, policy);
    expect(r.decision.allowed).toBe(false);
    expect(r.state.sustained.cur).toBe(2);
    expect(hitPolicy(r.state, t + 3_100, policy).decision.allowed).toBe(true);
  });
});

describe("semaphore", () => {
  it("sheds instead of queueing and releases idempotently", () => {
    const s = new Semaphore(2);
    const a = s.tryAcquire()!, b = s.tryAcquire()!;
    expect(s.tryAcquire()).toBeNull();
    a(); a();
    expect(s.inFlight).toBe(1);
    expect(s.tryAcquire()).not.toBeNull();
    b();
  });
  it("run() reports shed and frees the slot on error", async () => {
    const s = new Semaphore(1);
    let release!: () => void;
    const p = s.run(() => new Promise<void>((r) => { release = r; }));
    expect(await s.run(async () => 1)).toEqual({ shed: true });
    release(); await p;
    await expect(s.run(async () => { throw new Error("x"); })).rejects.toThrow();
    expect(s.inFlight).toBe(0);
  });
});

describe("circuit breaker", () => {
  it("closed -> open -> half-open -> closed, and re-opens on failed probe", async () => {
    let t = 0; const b = new CircuitBreaker("x", { threshold: 2, resetMs: 1000 }, () => t);
    const fail = async () => { throw new Error("down"); };
    await expect(b.call(fail)).rejects.toThrow("down");
    expect(b.state).toBe("closed");
    await expect(b.call(fail)).rejects.toThrow("down");
    expect(b.state).toBe("open");
    await expect(b.call(async () => 1)).rejects.toBeInstanceOf(BreakerOpenError);
    t = 1000; expect(b.state).toBe("half-open");
    await expect(b.call(fail)).rejects.toThrow("down");
    expect(b.state).toBe("open");
    t = 2500; expect(await b.call(async () => "ok")).toBe("ok");
    expect(b.state).toBe("closed");
  });
  it("only one probe in half-open and failure predicate counts", async () => {
    let t = 0; const b = new CircuitBreaker("y", { threshold: 1, resetMs: 100 }, () => t);
    await b.call(async () => 503, (r) => r >= 500);
    expect(b.state).toBe("open");
    t = 200;
    expect(b.canPass()).toBe(true);
    expect(b.canPass()).toBe(false);
  });
});

describe("LRU TTL cache", () => {
  it("evicts least recently used and expires by ttl", () => {
    let t = 0; const c = new LruTtlCache<number>(2, 100, () => t);
    c.set("a", 1); c.set("b", 2); c.get("a"); c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
    t = 150; expect(c.get("a")).toBeUndefined();
    expect(c.size).toBeLessThanOrEqual(2);
  });
});

describe("normalizeQuery", () => {
  it("strips control chars, collapses whitespace, enforces min/max", () => {
    expect(normalizeQuery("  a\u0000b \t\n  c ", { min: 2 })).toEqual({ ok: true, q: "a b c" });
    expect(normalizeQuery("x", { min: 2 })).toEqual({ ok: false, reason: "too_short" });
    expect(normalizeQuery(undefined, { min: 2 }).ok).toBe(false);
    const long = normalizeQuery("ab".repeat(500), { min: 2, max: 10 });
    expect(long.ok && long.q.length).toBe(10);
    expect(normalizeQuery("", { min: 0 })).toEqual({ ok: true, q: "" });
    expect(normalizeQuery("a", { min: 1 })).toEqual({ ok: true, q: "a" });
  });
  it("rejects pathological input but accepts persian and latin", () => {
    expect(normalizeQuery("%%%%___", { min: 2 }).ok).toBe(false);
    expect(normalizeQuery("a".repeat(40), { min: 2, max: 60 }).ok).toBe(false);
    expect(normalizeQuery("!!!!!!!!!!a!!!!!!", { min: 2 }).ok).toBe(false);
    expect(normalizeQuery("برنج  سفید", { min: 2 })).toEqual({ ok: true, q: "برنج سفید" });
    expect(normalizeQuery("rice", { min: 2 })).toEqual({ ok: true, q: "rice" });
  });
});

describe("admin stats + client helpers", () => {
  it("aggregates counters and never exposes guest ips", () => {
    const r = aggregateCounters([
      { key: "ai:x:u:u1", policy: "ai", count: 5 },
      { key: "ai:x:u:u2", policy: "ai", count: 9 },
      { key: "auth:x:ip:1.2.3.4", policy: "auth", count: 7 },
    ]);
    expect(r.topUsers[0]).toEqual({ userId: "u2", count: 9 });
    expect(r.byPolicy.auth).toEqual({ total: 7, guests: 7 });
    expect(JSON.stringify(r)).not.toContain("1.2.3.4");
  });
  it("parses Retry-After with a cap and treats 429/503 as backoff / offline-retryable", () => {
    expect(parseRetryAfterSec("7")).toBe(7);
    expect(parseRetryAfterSec("9999")).toBe(60);
    expect(parseRetryAfterSec(null)).toBe(10);
    expect(isBackoffStatus(503)).toBe(true);
    expect(shouldSearch(" a ", 2)).toBe(false);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
  });
});
