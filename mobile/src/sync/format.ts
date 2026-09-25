// نمایشِ فارسیِ زمانِ آخرین همگام‌سازی
export function formatLastSync(iso: string | null, now = Date.now()): string {
  if (!iso) return "هنوز انجام نشده";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, now - t);
  const fa = (n: number) => n.toLocaleString("fa-IR");
  if (diff < 60_000) return "همین الان";
  if (diff < 3_600_000) return `${fa(Math.floor(diff / 60_000))} دقیقه پیش`;
  if (diff < 86_400_000) return `${fa(Math.floor(diff / 3_600_000))} ساعت پیش`;
  return new Date(t).toLocaleDateString("fa-IR");
}
