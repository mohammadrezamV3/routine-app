// کش LRU با TTL و سقف اندازه — برای پاسخ‌های عمومی یکسان (مثلا جستجوی غذا).
// Map ترتیب درج رو نگه می‌داره: خواندن، کلید رو به انتها می‌بره.

export class LruTtlCache<V> {
  private map = new Map<string, { v: V; exp: number }>();
  constructor(private readonly max: number, private readonly ttlMs: number, private readonly now: () => number = Date.now) {}

  get size(): number { return this.map.size; }

  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.exp <= this.now()) { this.map.delete(key); return undefined; }
    this.map.delete(key);
    this.map.set(key, e);
    return e.v;
  }

  set(key: string, v: V): void {
    this.map.delete(key);
    this.map.set(key, { v, exp: this.now() + this.ttlMs });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void { this.map.clear(); }
}
