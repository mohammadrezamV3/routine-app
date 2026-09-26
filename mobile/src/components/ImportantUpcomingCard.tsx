import { AlertTriangle } from "lucide-react";
import { WEEK_ORDER } from "@/lib/schedule";
import { ImportantOccurrence } from "@/db/repo";

const dayShort = (jsDay: number) => WEEK_ORDER.find((w) => w.jsDay === jsDay)?.short ?? "";

// کارتِ برنامه‌های مهمِ پیشِ‌رو (اهمیتِ زیاد/خیلی‌زیاد، تا ۲ روزِ آینده) —
// از repo.getImportantUpcoming/useImportantUpcoming (که از قبل وجود داشت،
// فقط رویِ داشبورد سرفس نشده بود). چیزی برای نمایش نبود یعنی کارت اصلا
// رندر نمی‌شه — کاربر کارتِ خالی نمی‌بینه.
export default function ImportantUpcomingCard({ items }: { items: ImportantOccurrence[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-card p-4" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}>
      <div className="mb-3 flex items-center gap-2 font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
        <AlertTriangle size={16} color="var(--accent)" />
        برنامه‌های مهمِ پیشِ‌رو
      </div>
      <div className="flex flex-col gap-2">
        {items.map((it, i) => (
          <div key={it.id + "-" + i} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 truncate font-vazir text-[13px]" style={{ color: "var(--text)" }}>
              {it.name}
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 font-vazir text-[10.5px] font-semibold"
              style={{
                background: it.importance === "veryHigh" ? "rgba(224,82,82,.14)" : "rgba(var(--accent-rgb),.14)",
                color: it.importance === "veryHigh" ? "#E05252" : "var(--accent)",
              }}
            >
              {it.importance === "veryHigh" ? "خیلی زیاد" : "زیاد"}
            </span>
            <span className="mono shrink-0 text-[11.5px]" style={{ color: "var(--muted)" }}>
              {dayShort(it.jsDay)} {it.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
