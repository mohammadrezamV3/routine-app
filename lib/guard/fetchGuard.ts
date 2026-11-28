// فراخوانی بیرونی با سقف زمانی + قطع‌کننده‌ی مدار. وقتی مدار بازه فورا خطا
// می‌ده (بدون صبر برای تایم‌اوت)؛ شکست = خطای شبکه/تایم‌اوت یا HTTP 5xx.
import { getBreaker } from "./registry";
import { BreakerOpenError } from "./breaker";

export { BreakerOpenError };

export async function guardedFetch(
  breakerName: string,
  url: string,
  init: RequestInit & { timeoutMs: number },
  opts?: { threshold?: number; resetMs?: number },
): Promise<Response> {
  const { timeoutMs, ...rest } = init;
  const breaker = getBreaker(breakerName, { threshold: opts?.threshold ?? 5, resetMs: opts?.resetMs ?? 30_000 });
  return breaker.call(
    () => fetch(url, { ...rest, signal: rest.signal ?? AbortSignal.timeout(timeoutMs) }),
    (res) => res.status >= 500,
  );
}
