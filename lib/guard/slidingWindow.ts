// ریاضی خالص محدودکننده‌ی «پنجره‌ی لغزنده + انفجار» (burst) — بدون وابستگی به
// ساعت یا حافظه‌ی جهانی؛ زمان همیشه ورودیه تا تست‌پذیر باشه.
//
// پنجره‌ی لغزنده با روش شمارنده‌ی دو پنجره (مثل Cloudflare): تعداد موثر =
// شمارنده‌ی پنجره‌ی فعلی + شمارنده‌ی پنجره‌ی قبل * (سهم باقی‌مانده‌ی اون
// پنجره). حافظه‌ی ثابت (دو عدد برای هر قاعده)، بدون نگه‌داشتن زمان هر درخواست.

export type Rule = { limit: number; windowMs: number };
export type PolicyRule = { sustained: Rule; burst?: Rule };

export type WindowState = { start: number; cur: number; prev: number };

export function emptyWindow(now: number, windowMs: number): WindowState {
  return { start: Math.floor(now / windowMs) * windowMs, cur: 0, prev: 0 };
}

/** پنجره رو تا لحظه‌ی now جلو می‌بره (پنجره‌ی فعلی ← قبلی، یا صفر اگه فاصله زیاده). */
export function advance(s: WindowState, now: number, windowMs: number): WindowState {
  const start = Math.floor(now / windowMs) * windowMs;
  if (start === s.start) return s;
  if (start - s.start === windowMs) return { start, cur: 0, prev: s.cur };
  return { start, cur: 0, prev: 0 };
}

export function effectiveCount(s: WindowState, now: number, windowMs: number): number {
  const elapsed = now - s.start;
  const weight = Math.max(0, 1 - elapsed / windowMs);
  return s.cur + s.prev * weight;
}

export type Decision = { allowed: boolean; retryAfterSec: number };

/** چک و (اگه مجاز بود) ثبت یک درخواست روی یک قاعده. state جدید برگردونده می‌شه. */
export function hit(s: WindowState | undefined, now: number, rule: Rule): { state: WindowState; decision: Decision } {
  const cur = advance(s ?? emptyWindow(now, rule.windowMs), now, rule.windowMs);
  const eff = effectiveCount(cur, now, rule.windowMs);
  if (eff + 1 > rule.limit) {
    return { state: cur, decision: { allowed: false, retryAfterSec: retryAfterFor(cur, now, rule) } };
  }
  return { state: { ...cur, cur: cur.cur + 1 }, decision: { allowed: true, retryAfterSec: 0 } };
}

/** کمینه‌ی ثانیه‌ای که باید صبر کرد تا شمارنده‌ی موثر زیر سقف بیاد (حداقل 1، حداکثر یک پنجره). */
export function retryAfterFor(s: WindowState, now: number, rule: Rule): number {
  const end = s.start + rule.windowMs;
  // اگه پنجره‌ی فعلی خودش پر شده، تا پایان پنجره باید صبر کرد؛ وگرنه وزن پنجره‌ی قبل کم می‌شه
  const toEnd = Math.max(0, end - now);
  if (s.cur >= rule.limit) return Math.max(1, Math.ceil(toEnd / 1000));
  if (s.prev <= 0) return Math.max(1, Math.ceil(toEnd / 1000));
  // eff = cur + prev * (1 - t/W) <= limit - 1  →  t >= W * (1 - (limit - 1 - cur) / prev)
  const need = rule.windowMs * (1 - (rule.limit - 1 - s.cur) / s.prev);
  const wait = Math.min(toEnd, Math.max(0, need - (now - s.start)));
  return Math.max(1, Math.ceil(wait / 1000));
}

export type KeyState = { sustained: WindowState; burst?: WindowState };

/** هر دو قاعده باید اجازه بدن؛ فقط وقتی هر دو مجازن شمارنده‌ها زیاد می‌شن. */
export function hitPolicy(state: KeyState | undefined, now: number, rule: PolicyRule): { state: KeyState; decision: Decision } {
  const a = hit(state?.sustained, now, rule.sustained);
  const b = rule.burst ? hit(state?.burst, now, rule.burst) : undefined;
  if (!a.decision.allowed || (b && !b.decision.allowed)) {
    // درخواست ردشده هیچ شمارنده‌ای رو زیاد نمی‌کنه (فقط پنجره جلو می‌ره)
    const keep = (r: typeof a | undefined, prev: WindowState | undefined, rl: Rule | undefined) =>
      r && rl ? (r.decision.allowed ? advance(prev ?? emptyWindow(now, rl.windowMs), now, rl.windowMs) : r.state) : prev;
    return {
      state: { sustained: keep(a, state?.sustained, rule.sustained)!, burst: keep(b, state?.burst, rule.burst) },
      decision: { allowed: false, retryAfterSec: Math.max(a.decision.retryAfterSec, b?.decision.retryAfterSec ?? 0) },
    };
  }
  return { state: { sustained: a.state, burst: b?.state }, decision: { allowed: true, retryAfterSec: 0 } };
}
