"use client";

import { useState } from "react";
import { Angry, Frown, Meh, Smile, Laugh } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { DASH_MOOD_OPTIONS, DashMood } from "@/lib/dashboardMockData";

const MOOD_ICONS: Record<DashMood, typeof Smile> = {
  awful: Angry,
  bad: Frown,
  okay: Meh,
  good: Smile,
  great: Laugh,
};

export function DashMoodCard({ delay }: { delay?: number }) {
  const [selected, setSelected] = useState<DashMood>("good");

  return (
    <DashCard delay={delay}>
      <h2 className="text-right text-[15px] font-bold text-dash-text">حال امروزت چطوره؟</h2>

      <div dir="ltr" className="mt-4 flex items-start justify-between">
        {DASH_MOOD_OPTIONS.map((opt) => {
          const Icon = MOOD_ICONS[opt.key];
          const active = opt.key === selected;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelected(opt.key)}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border transition",
                  active
                    ? "border-dash-green text-dash-green shadow-[0_0_16px_rgba(46,230,107,.45)]"
                    : "border-dash-border text-dash-muted hover:border-white/15 hover:text-dash-text"
                )}
              >
                <Icon size={20} />
              </span>
              <span className={cn("text-[10.5px]", active ? "text-dash-green" : "text-dash-muted")}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </DashCard>
  );
}
