"use client";

import { CalendarDays, Clock } from "lucide-react";
import { MI, MI_STROKE, MentorChip } from "./MentorUI";
import { fmtDate } from "@/lib/mentorFormat";
import { responseTimeLabel } from "@/lib/mentorAvailability";
import { tr } from "@/lib/i18n";

const ic = (Icon: typeof Clock, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * دسترس‌پذیری منتور روی پروفایل عمومی: عدم حضور (تا روز بازگشت + پیام)
 * و زمان معمول پاسخ. وقتی هیچ‌کدام تعریف نشده چیزی رندر نمی‌شود.
 */
export function MentorAvailabilityLine({
  awayUntil, awayMessage, responseTimeHours,
}: { awayUntil: string | null | undefined; awayMessage: string | null; responseTimeHours: number | null | undefined }) {
  const rt = responseTimeLabel(responseTimeHours);
  if (!awayUntil && !rt) return null;
  return (
    <div className="mentor-state-notes" style={{ marginTop: "var(--m-3)", marginBottom: 0 }}>
      {awayUntil && (
        <p className="mentor-state-note">
          <MentorChip tone="info" icon={ic(CalendarDays, MI.chip)}>{tr(`تا ${fmtDate(awayUntil)} در دسترس نیست`, `Unavailable until ${fmtDate(awayUntil)}`)}</MentorChip>
          {awayMessage && <span>{awayMessage}</span>}
        </p>
      )}
      {rt && (
        <p className="mentor-state-note">
          <span className="mentor-state-label">{ic(Clock, MI.chip)} {rt}</span>
        </p>
      )}
    </div>
  );
}
