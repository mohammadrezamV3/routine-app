import BottomSheet from "./BottomSheet";
import { useSleepRange } from "@/db/repo";
import { addDaysIso } from "@/lib/schedule";
import { isoLocal, toJalali, formatJalali } from "@/lib/jalali";

const HISTORY_DAYS = 14;

function isoDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return formatJalali(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}

function timeOf(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// تاریخچه‌ی خوابِ ۱۴ روزِ اخیر (کیفیت + ساعتِ خواب/بیداری) — از کارتِ خواب
// داشبورد باز می‌شه. فقط نمایشی، بدونِ ویرایش (ویرایشِ همون روز از
// SleepLogSheet انجام می‌شه).
export default function SleepHistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = isoLocal(new Date());
  const from = addDaysIso(today, -(HISTORY_DAYS - 1));
  const entries = useSleepRange(from, today);

  const days: string[] = [];
  for (let i = 0; i < HISTORY_DAYS; i++) days.push(addDaysIso(today, -i));
  const byDate = new Map((entries ?? []).map((e) => [e.date, e]));

  return (
    <BottomSheet open={open} onClose={onClose} title="تاریخچه‌ی خواب">
      <div className="flex flex-col gap-2">
        {days.map((iso) => {
          const e = byDate.get(iso);
          return (
            <div
              key={iso}
              className="flex items-center justify-between gap-2 rounded-xl px-3"
              style={{ minHeight: 48, background: "var(--surface-2)" }}
            >
              <span className="font-vazir text-[12.5px]" style={{ color: "var(--text)" }}>{isoDisplay(iso)}</span>
              {e ? (
                <div className="flex items-center gap-3">
                  <span className="mono text-[11.5px]" style={{ color: "var(--muted)" }}>
                    {timeOf(e.sleptAt) ?? "—"} → {timeOf(e.wokeAt) ?? "—"}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 font-vazir text-[10.5px] font-semibold"
                    style={{ background: "rgba(var(--accent-rgb),.14)", color: "var(--accent)" }}
                  >
                    {e.quality != null ? `کیفیت ${e.quality} از 5` : "—"}
                  </span>
                </div>
              ) : (
                <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>ثبت نشده</span>
              )}
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
