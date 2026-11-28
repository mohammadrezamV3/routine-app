// حالت پروسه‌ای (per worker) محافظ: سمافورها، قطع‌کننده‌ها و بافر حلقوی آمار.
// روی globalThis نگه داشته می‌شه تا با HMR/ایمپورت دوباره صفر نشه.
// هیچ متن جستجو یا پیامی ثبت نمی‌شه — فقط شمارنده و شناسه‌ی کاربر.

import { CircuitBreaker, type BreakerState } from "./breaker";
import { Semaphore } from "./semaphore";
import type { KeyState } from "./slidingWindow";

export const POLICY_NAMES = ["search", "read", "write", "ai", "export", "upload", "auth"] as const;
export type PolicyName = (typeof POLICY_NAMES)[number];

export const GATE_LIMITS = { ai: 8, weekly: 4, export: 3 } as const;
export type GateName = keyof typeof GATE_LIMITS;

const MINUTES = 15;
const MAX_USERS_PER_MIN = 300;

type Counts = { requests: number; limited: number; shed: number };
type Minute = { t: number; byPolicy: Record<string, Counts>; users: Map<string, number> };

type Reg = {
  gates: Map<string, Semaphore>;
  breakers: Map<string, CircuitBreaker>;
  ring: Minute[];
  /** حالت پنجره‌ی لغزنده‌ی هر کلید (lib/requestGuard.ts) */
  states: Map<string, KeyState>;
};

const g = globalThis as unknown as { __arionGuard?: Reg };
const reg: Reg = (g.__arionGuard ||= { gates: new Map(), breakers: new Map(), ring: [], states: new Map() });

export function getLimiterStates(): Map<string, KeyState> { return reg.states; }

export function getGate(name: GateName): Semaphore {
  let s = reg.gates.get(name);
  if (!s) { s = new Semaphore(GATE_LIMITS[name]); reg.gates.set(name, s); }
  return s;
}

export function getBreaker(name: string, opts: { threshold: number; resetMs: number } = { threshold: 5, resetMs: 30_000 }): CircuitBreaker {
  let b = reg.breakers.get(name);
  if (!b) { b = new CircuitBreaker(name, opts); reg.breakers.set(name, b); }
  return b;
}

function currentMinute(now: number): Minute {
  const t = Math.floor(now / 60_000) * 60_000;
  const last = reg.ring[reg.ring.length - 1];
  if (last && last.t === t) return last;
  const m: Minute = { t, byPolicy: {}, users: new Map() };
  reg.ring.push(m);
  while (reg.ring.length > MINUTES) reg.ring.shift();
  return m;
}

export type MetricKind = "requests" | "limited" | "shed";

export function recordMetric(policy: string, kind: MetricKind, userId?: string | null, now = Date.now()): void {
  const m = currentMinute(now);
  const c = (m.byPolicy[policy] ||= { requests: 0, limited: 0, shed: 0 });
  c[kind]++;
  // فقط شناسه‌ی کاربر واردشده (نه IP مهمان)، با سقف حافظه
  if (kind === "requests" && userId && (m.users.has(userId) || m.users.size < MAX_USERS_PER_MIN)) {
    m.users.set(userId, (m.users.get(userId) || 0) + 1);
  }
}

export type MetricsSnapshot = {
  pid: number;
  minutes: number;
  byPolicy: Record<string, Counts>;
  perMinute: { t: number; requests: number; limited: number; shed: number }[];
  topUsers: { userId: string; count: number }[];
  breakers: { name: string; state: BreakerState }[];
  gates: { name: string; inFlight: number; max: number }[];
};

export function snapshotMetrics(minutes = 10, now = Date.now()): MetricsSnapshot {
  const from = now - minutes * 60_000;
  const byPolicy: Record<string, Counts> = {};
  const users = new Map<string, number>();
  const perMinute: MetricsSnapshot["perMinute"] = [];
  for (const m of reg.ring) {
    if (m.t < from) continue;
    let r = 0, l = 0, s = 0;
    for (const [p, c] of Object.entries(m.byPolicy)) {
      const t = (byPolicy[p] ||= { requests: 0, limited: 0, shed: 0 });
      t.requests += c.requests; t.limited += c.limited; t.shed += c.shed;
      r += c.requests; l += c.limited; s += c.shed;
    }
    perMinute.push({ t: m.t, requests: r, limited: l, shed: s });
    for (const [u, n] of m.users) users.set(u, (users.get(u) || 0) + n);
  }
  return {
    pid: process.pid,
    minutes,
    byPolicy,
    perMinute,
    topUsers: [...users].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([userId, count]) => ({ userId, count })),
    breakers: [...reg.breakers.values()].map((b) => ({ name: b.name, state: b.state })),
    gates: (Object.keys(GATE_LIMITS) as GateName[]).map((n) => ({ name: n, inFlight: getGate(n).inFlight, max: GATE_LIMITS[n] })),
  };
}

export function resetGuardStateForTests(): void {
  reg.gates.clear(); reg.breakers.clear(); reg.ring.length = 0; reg.states.clear();
}
