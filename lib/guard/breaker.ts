// قطع‌کننده‌ی مدار (circuit breaker) برای فراخوانی سرویس‌های بیرونی.
// closed → (N شکست پشت‌سرهم) → open → (بعد resetMs) → half-open (یک پروب) →
// موفق: closed / ناموفق: دوباره open. زمان ورودیه تا تست‌پذیر باشه.

export type BreakerState = "closed" | "open" | "half-open";

export class BreakerOpenError extends Error {
  constructor(public readonly breaker: string, public readonly retryAfterSec: number) {
    super(`circuit open: ${breaker}`);
    this.name = "BreakerOpenError";
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private probing = false;
  private st: BreakerState = "closed";

  constructor(
    public readonly name: string,
    private readonly opts: { threshold: number; resetMs: number },
    private readonly now: () => number = Date.now,
  ) {}

  get state(): BreakerState {
    if (this.st === "open" && this.now() - this.openedAt >= this.opts.resetMs) return "half-open";
    return this.st;
  }

  retryAfterSec(): number {
    return Math.max(1, Math.ceil((this.openedAt + this.opts.resetMs - this.now()) / 1000));
  }

  /** آیا الان اجازه‌ی فراخوانی هست؟ در half-open فقط یک پروب هم‌زمان. */
  canPass(): boolean {
    const s = this.state;
    if (s === "closed") return true;
    if (s === "open") return false;
    if (this.probing) return false;
    this.st = "half-open";
    this.probing = true;
    return true;
  }

  onSuccess(): void {
    this.failures = 0;
    this.probing = false;
    this.st = "closed";
  }

  onFailure(): void {
    this.probing = false;
    if (this.st === "half-open" || this.state === "half-open") {
      this.st = "open";
      this.openedAt = this.now();
      return;
    }
    this.failures++;
    if (this.failures >= this.opts.threshold) {
      this.st = "open";
      this.openedAt = this.now();
    }
  }

  /**
   * fn رو زیر قطع‌کننده اجرا می‌کنه. شکست = پرتاب خطا یا isFailure(result).
   * وقتی مدار بازه فورا BreakerOpenError پرتاب می‌شه (بدون تماس با سرویس).
   */
  async call<T>(fn: () => Promise<T>, isFailure?: (r: T) => boolean): Promise<T> {
    if (!this.canPass()) throw new BreakerOpenError(this.name, this.retryAfterSec());
    try {
      const r = await fn();
      if (isFailure?.(r)) this.onFailure(); else this.onSuccess();
      return r;
    } catch (e) {
      this.onFailure();
      throw e;
    }
  }
}
