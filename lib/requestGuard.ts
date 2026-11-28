// لایه‌ی یکپارچه‌ی محافظت از درخواست/بار (درخواست صریح صاحب محصول: کاربرا با
// جستجو و درخواست نتونن سیستم رو بشکنن). سیاست‌های نام‌دار: search، read،
// write، ai، export، upload، auth (lib/guard/policies.ts).
//
// - کلید = شناسه‌ی کاربر، یا IP برای مهمان (getClientIp: فقط با TRUST_PROXY_HEADERS).
// - لایه‌ی سریع: پنجره‌ی لغزنده + burst در حافظه‌ی هر worker (رد زودهنگام).
// - سیاست‌های گران (ai/export/auth): علاوه بر اون، شمارنده‌ی مشترک Postgres
//   (جدول RateCounter) تا با چند worker شل نشه؛ خرابی دیتابیس = fail-open.
// - سقف هم‌زمانی (Semaphore) برای کار سنگین: پر بودن ظرفیت = 503 + Retry-After
//   فوری (ریزش بار)، نه صف بی‌پایان.
// - هیچ متن جستجو/پیامی ثبت نمی‌شه؛ فقط شمارنده و شناسه‌ی کاربر.
// محدودیت‌های قدیمی هر روت (checkRateLimit) سر جاشون می‌مونن؛ این لایه کنارشونه.

import { NextRequest, NextResponse } from "next/server";
import { tr } from "@/lib/i18n";
import { getClientIp } from "@/lib/rateLimit";
import { hitPolicy } from "@/lib/guard/slidingWindow";
import { POLICIES, DIRECT_IP_MULTIPLIER } from "@/lib/guard/policies";
import { getGate, getLimiterStates, recordMetric, type GateName, type PolicyName } from "@/lib/guard/registry";
import { bumpShared } from "@/lib/guard/sharedCounter";

export type { PolicyName, GateName } from "@/lib/guard/registry";

const states = getLimiterStates();
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, s] of states) {
    const idleMs = now - Math.max(s.sustained.start, s.burst?.start ?? 0);
    if (idleMs > 2 * 60 * 60_000) states.delete(k);
  }
  // سقف سخت حافظه
  if (states.size > 50_000) states.clear();
}

export type GuardOpts = {
  policy: PolicyName;
  userId?: string | null;
  isSuperAdmin?: boolean;
  /** کلید فرعی (مثلا نام روت) تا سقف هر روت جدا حساب بشه */
  scope?: string;
  /** سقف هم‌زمانی کار سنگین */
  gate?: GateName;
  /** برای تست */
  now?: number;
};

export type GuardResult = { ok: true; release: () => void } | { ok: false; response: NextResponse };

export function tooManyResponse(retryAfterSec: number): NextResponse {
  const ra = Math.max(1, Math.ceil(retryAfterSec));
  return NextResponse.json(
    { error: tr("درخواست‌های زیاد — کمی بعد دوباره امتحان کن", "Too many requests — try again shortly"), retryAfter: ra },
    { status: 429, headers: { "Retry-After": String(ra), "Cache-Control": "no-store" } },
  );
}

export function busyResponse(retryAfterSec = 5): NextResponse {
  return NextResponse.json(
    { error: tr("سرور الان سرش شلوغه — چند ثانیه بعد دوباره امتحان کن", "The server is busy right now — try again in a few seconds"), retryAfter: retryAfterSec },
    { status: 503, headers: { "Retry-After": String(retryAfterSec), "Cache-Control": "no-store" } },
  );
}

export async function checkGuard(req: Request, opts: GuardOpts): Promise<GuardResult> {
  // فقط محیط تست: تست‌های دیگه‌ی روت‌ها پشت‌سرهم و سریع صدا می‌زنن؛ تست‌های خود محافظ این رو "0" می‌کنن
  if (process.env.ARION_GUARD_DISABLED === "1") return { ok: true, release: () => {} };
  const now = opts.now ?? Date.now();
  const def = POLICIES[opts.policy];
  const ip = getClientIp(req.headers);
  const userId = def.ipOnly ? null : opts.userId || null;
  const isGuest = !userId;
  const idKey = userId ? `u:${userId}` : `ip:${ip}`;
  recordMetric(opts.policy, "requests", userId, now);

  const bypass = !!opts.isSuperAdmin && !def.ipOnly;
  if (!bypass) {
    let rule = isGuest ? def.guestRule ?? def.rule : def.rule;
    if (isGuest && ip === "direct") {
      rule = {
        sustained: { ...rule.sustained, limit: rule.sustained.limit * DIRECT_IP_MULTIPLIER },
        burst: rule.burst ? { ...rule.burst, limit: rule.burst.limit * DIRECT_IP_MULTIPLIER } : undefined,
      };
    }
    sweep(now);
    const key = `${opts.policy}:${opts.scope ?? "*"}:${idKey}`;
    const r = hitPolicy(states.get(key), now, rule);
    states.set(key, r.state);
    if (!r.decision.allowed) {
      recordMetric(opts.policy, "limited", userId, now);
      return { ok: false, response: tooManyResponse(r.decision.retryAfterSec) };
    }
    if (def.shared) {
      const w = rule.sustained.windowMs;
      const count = await bumpShared(`${opts.policy}:${opts.scope ?? "*"}:${idKey}`, opts.policy, w, now);
      if (count !== null && count > rule.sustained.limit) {
        recordMetric(opts.policy, "limited", userId, now);
        const bucketEnd = Math.floor(now / w) * w + w;
        return { ok: false, response: tooManyResponse((bucketEnd - now) / 1000) };
      }
    }
  }

  if (opts.gate) {
    const release = getGate(opts.gate).tryAcquire();
    if (!release) {
      recordMetric(opts.policy, "shed", userId, now);
      return { ok: false, response: busyResponse(5) };
    }
    return { ok: true, release };
  }
  return { ok: true, release: () => {} };
}

type Handler<A extends any[]> = (req: NextRequest, ...rest: A) => Promise<Response> | Response;

/**
 * پوشاننده‌ی هندلر روت: هویت رو از نشست می‌خونه (یا IP)، سیاست و سقف
 * هم‌زمانی رو اعمال می‌کنه و مجوز رو بعد از پایان هندلر آزاد می‌کنه.
 */
export function withGuard<A extends any[]>(
  opts: Omit<GuardOpts, "userId" | "isSuperAdmin" | "now">,
  handler: Handler<A>,
): (req: NextRequest, ...rest: A) => Promise<Response> {
  return async (req, ...rest) => {
    let userId: string | null = null;
    let isSuperAdmin = false;
    if (!POLICIES[opts.policy].ipOnly) {
      try {
        const { getSessionFast } = await import("@/lib/serverSession");
        const session = await getSessionFast();
        userId = ((session?.user as any)?.id as string | undefined) ?? null;
        isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
      } catch { /* بدون نشست = مهمان */ }
    }
    const g = await checkGuard(req, { ...opts, userId, isSuperAdmin });
    if (!g.ok) return g.response;
    try { return await handler(req, ...rest); } finally { g.release(); }
  };
}

/** تابع کمکی برای روت‌هایی که خودشون هویت دارن: یک پاسخ یا null. */
export async function guardOrNull(req: Request, opts: GuardOpts): Promise<{ response: NextResponse | null; release: () => void }> {
  const g = await checkGuard(req, opts);
  return g.ok ? { response: null, release: g.release } : { response: g.response, release: () => {} };
}

export { busyResponse as shedResponse };

export function resetRequestGuardForTests(): void { states.clear(); lastSweep = 0; }
