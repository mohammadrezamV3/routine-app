import { Flag, Clock } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";
import { ROADMAP_LEVEL_OPTIONS } from "@/lib/api-contract";
import type { RoadmapListItem } from "../repo";

function faDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export default function RoadmapCard({ item, onClick }: { item: RoadmapListItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-card border p-4 text-start"
      style={{ background: "var(--surface-1)", borderColor: "var(--surface-line)" }}
    >
      <ProgressRing pct={item.progress.pct / 100} size={52} strokeWidth={5}>
        <span className="font-vazir text-[12px] font-semibold" style={{ color: "var(--text)" }}>
          {faDigits(item.progress.pct)}٪
        </span>
      </ProgressRing>

      <div className="min-w-0 flex-1">
        <div className="truncate font-vazir text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
          {item.title}
        </div>
        <div
          className="mt-1 flex items-center gap-1.5 font-vazir text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          <Flag size={11} />
          <span className="truncate">{item.topic}</span>
        </div>
        {item.goal && (
          <div className="mt-0.5 truncate font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
            هدف: {item.goal}
          </div>
        )}
        <div
          className="mt-1.5 flex items-center gap-3 font-vazir text-[11.5px]"
          style={{ color: "var(--muted)" }}
        >
          {item.totalDuration && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {item.totalDuration}
            </span>
          )}
          {item.stageCount > 0 && <span>{faDigits(item.stageCount)} مرحله</span>}
          {item.level && <span>{ROADMAP_LEVEL_OPTIONS.find((o) => o.value === item.level)?.label}</span>}
          {item.stageCount > 0 && (
            <span>
              {faDigits(item.progress.done)} از {faDigits(item.progress.total)} انجام‌شده
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
