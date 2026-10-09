"use client";
import "./friends.css";

import { GradientRing } from "./GradientRing";
import { weekdayShort, isoLocal } from "@/lib/jalali";
import { jsDayOfIso } from "@/lib/schedule";
import { weekIsos, type WeekPcts } from "@/lib/friendWeek";
import { tr, isEn } from "@/lib/i18n";

// نوار 7 روز اخیر — هر روز یک حلقه‌ی کوچک (GradientRing، تنها حلقه‌ی مجاز
// اپ). روز بی‌برنامه (null) حلقه‌ی خالی کم‌رنگه، نه «شکست». با `labels` حرف
// اول روز هفته زیر هر حلقه می‌آد (امروز پررنگ).
export function FriendWeekStrip({ week, size = 14, stroke = 2.5, labels = false, delay = 0 }: { week: WeekPcts | null | undefined; size?: number; stroke?: number; labels?: boolean; delay?: number }) {
  if (!week || !week.length) return null;
  const isos = weekIsos(isoLocal(new Date()));
  return (
    <span className={`fr-week${labels ? " has-labels" : ""}`} aria-label={tr("7 روز اخیر", "Last 7 days")}>
      {week.map((v, i) => (
        <span key={isos[i]} className={`fr-week-day${v === null ? " is-rest" : ""}${v === 100 ? " is-full" : ""}${i === week.length - 1 ? " is-today" : ""}`} title={v === null ? tr("بدون برنامه", "No programs") : `${v}%`}>
          <GradientRing value={(v ?? 0) / 100} size={size} stroke={stroke} delay={delay + i * 0.04} />
          {labels && <span className="fr-week-label">{weekdayShort(jsDayOfIso(isos[i]))}</span>}
        </span>
      ))}
    </span>
  );
}
