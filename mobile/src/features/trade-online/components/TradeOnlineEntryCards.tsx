import { useNavigate } from "react-router-dom";
import { CalendarClock, Cable, CandlestickChart, type LucideIcon } from "lucide-react";
import { tapHaptic } from "@/lib/haptics";
import { tradeOnlineRoutePaths } from "../paths";

// کارت‌های ورود به بخش‌های آنلاینِ ترید — برای جای‌گذاری در TradeHub
// (جایگزینِ کارتِ «به‌زودی»ِ ComingSoon). همون ظاهرِ کاشی‌های هاب.
export type TradeOnlineEntry = { to: string; label: string; hint: string; icon: LucideIcon };

export const TRADE_ONLINE_ENTRIES: TradeOnlineEntry[] = [
  { to: tradeOnlineRoutePaths.calendar, label: "تقویم اقتصادی", hint: "Actual / Forecast / Previous", icon: CalendarClock },
  { to: tradeOnlineRoutePaths.market, label: "قیمت بازارها", hint: "واچ‌لیست زنده", icon: CandlestickChart },
  { to: tradeOnlineRoutePaths.metatrader, label: "اتصال متاتریدر", hint: "وضعیت و کدِ اتصالِ هر حساب", icon: Cable },
];

export function TradeOnlineEntryCard({ entry }: { entry: TradeOnlineEntry }) {
  const navigate = useNavigate();
  const Icon = entry.icon;
  return (
    <button
      type="button"
      onClick={() => {
        void tapHaptic();
        navigate(entry.to);
      }}
      className="flex flex-col items-start gap-2 rounded-card border px-3.5 py-3.5 text-start"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", minHeight: 76 }}
    >
      <Icon size={20} color="var(--accent)" />
      <span className="font-vazir text-[13px] font-medium" style={{ color: "var(--text)" }}>
        {entry.label}
      </span>
      <span className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
        {entry.hint}
      </span>
    </button>
  );
}

/** هر سه کارت در یک گریدِ دوستونه (مثلِ کاشی‌های هاب) — با عنوانِ «آنلاین» */
export default function TradeOnlineEntryCards() {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
        آنلاین (نیاز به اینترنت)
      </span>
      <div className="grid grid-cols-2 gap-2.5">
        {TRADE_ONLINE_ENTRIES.map((e) => (
          <TradeOnlineEntryCard key={e.to} entry={e} />
        ))}
      </div>
    </div>
  );
}
