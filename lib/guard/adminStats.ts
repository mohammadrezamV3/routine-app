// تجمیع خالص ردیف‌های RateCounter برای پنل ادمین (بدون متن جستجو؛ فقط
// کلید سیاست + شناسه‌ی کاربر). کلیدها "policy:scope:u:<id>" یا "policy:scope:ip:<ip>".

export type CounterRow = { key: string; policy: string; count: number };

export function aggregateCounters(rows: CounterRow[]) {
  const byPolicy: Record<string, { total: number; guests: number }> = {};
  const users = new Map<string, number>();
  for (const r of rows) {
    const p = (byPolicy[r.policy] ||= { total: 0, guests: 0 });
    p.total += r.count;
    const m = /:u:([^:]+)$/.exec(r.key);
    if (m) users.set(m[1], (users.get(m[1]) || 0) + r.count);
    else p.guests += r.count; // IP مهمان هیچ‌وقت نمایش داده نمی‌شه
  }
  const topUsers = [...users].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([userId, count]) => ({ userId, count }));
  return { byPolicy, topUsers };
}
