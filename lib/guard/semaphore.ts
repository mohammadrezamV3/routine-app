// سمافور بدون صف برای «ریزش بار» (load shedding): وقتی ظرفیت پره، منتظر
// نمی‌مونیم و درخواست سریع 503 می‌گیره، نه اینکه تا ابد توی صف بمونه.

export class Semaphore {
  private active = 0;
  constructor(public readonly max: number) {}

  get inFlight(): number { return this.active; }

  /** اگه جا بود یک مجوز برمی‌داره و تابع آزادسازی (idempotent) رو می‌ده؛ وگرنه null. */
  tryAcquire(): (() => void) | null {
    if (this.active >= this.max) return null;
    this.active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
    };
  }

  /** تابع رو با مجوز اجرا می‌کنه؛ اگه ظرفیت نبود `{ shed: true }`. */
  async run<T>(fn: () => Promise<T>): Promise<{ shed: false; value: T } | { shed: true }> {
    const release = this.tryAcquire();
    if (!release) return { shed: true };
    try { return { shed: false, value: await fn() }; } finally { release(); }
  }
}
