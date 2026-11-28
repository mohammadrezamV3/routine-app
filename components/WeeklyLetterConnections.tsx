"use client";

// فصل «ارتباط‌ها»: مهم‌ترین رابطه‌های بین منبع‌های داده‌ی خود کاربر (خواب، روتین، تمرین،
// تغذیه، دارو، ترید) و الگوهای روز هفته و ساعت. کارت‌ها همون کارت بینش‌ها هستن
// (WeeklyLetterInsights)، پس چیز تازه‌ای برای استایل نیست. فقط مشاهده‌ست، نه توصیه‌ی پزشکی.
import { Link2 } from "lucide-react";
import { tr } from "@/lib/i18n";
import { isolateNumbers } from "@/lib/weeklyAnalysis/bidi";
import type { Insight } from "@/lib/weeklyAnalysis/types";
import type { ConnectionsBlock, Connection } from "@/lib/weeklyLetter/connections";
import { Chapter } from "./WeeklyLetterShared";
import { WeeklyLetterInsights } from "./WeeklyLetterStory";

const ICON: Record<Connection["kind"], Insight["icon"]> = {
  link: "link", time: "zap", weekday: "calendar", day: "trophy", trade: "alert",
};

/** شرط نمایش فصل در خواننده (همون شرط خود فصل) */
export function connectionsShown(c: ConnectionsBlock | null | undefined): c is ConnectionsBlock {
  return !!c && Array.isArray(c.items) && c.items.length > 0;
}

export function connectionToInsight(c: Connection): Insight {
  const d = c.domains[0];
  return {
    id: `conn-${c.id}`,
    kind: "correlation",
    icon: c.kind === "day" && c.tone === "bad" ? "alert" : ICON[c.kind],
    title: isolateNumbers(c.title),
    body: isolateNumbers(c.body),
    // «دارو» دامنه‌ی آنالیز نیست؛ برچسب فقط برای دامنه‌های واقعی
    domain: d && d !== "meds" ? d : undefined,
    tone: c.tone,
  };
}

export function WeeklyLetterConnections({ connections, no }: { connections: ConnectionsBlock; no: number }) {
  return (
    <Chapter id="connections" no={no} icon={Link2} title={tr("ارتباط‌ها", "Connections")}>
      <WeeklyLetterInsights insights={connections.items.map(connectionToInsight)} />
      <p className="wl-conn-note">
        {tr(
          `بر اساس ${connections.windowDays} روز اخیر داده‌ی خودت. اینا مشاهده‌ان، نه علت قطعی یا توصیه‌ی پزشکی.`,
          `Based on your own last ${connections.windowDays} days of data. These are observations, not proven causes or medical advice.`,
        )}
      </p>
    </Chapter>
  );
}
