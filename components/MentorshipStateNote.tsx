"use client";

import { CalendarDays, CirclePause, LogOut } from "lucide-react";
import { MI, MI_STROKE, MentorChip } from "./MentorUI";
import { fmtDate } from "@/lib/mentorFormat";
import type { MentorshipRow } from "@/lib/mentorTypes";

const ic = (Icon: typeof LogOut, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * خط‌های وضعیتِ رابطه در صفحه‌ی رابطه: توقفِ موقت، عدمِ حضورِ منتور،
 * دلیلِ پایان و پیامِ خوش‌آمد. هر مورد یک چیپ + یک جمله است، بی‌قاب؛
 * وقتی هیچ‌کدام نیست چیزی رندر نمی‌شود.
 */
export function MentorshipStateNote({ row, role }: { row: MentorshipRow; role: "student" | "mentor" }) {
  const lines: React.ReactNode[] = [];

  if (row.status === "ACTIVE" && row.pausedAt) {
    lines.push(
      <p key="paused" className="mentor-state-note">
        <MentorChip tone="neutral" icon={ic(CirclePause, MI.chip)}>همکاری متوقف است</MentorChip>
        <span>
          {role === "student" ? "مربی همکاری را موقتاً متوقف کرده است" : "همکاری را موقتاً متوقف کرده‌ای"}
          {row.pauseReason ? `؛ ${row.pauseReason}` : ""}
        </span>
      </p>,
    );
  }
  if (role === "student" && row.mentorAway && (row.status === "ACTIVE" || row.status === "PENDING")) {
    lines.push(
      <p key="away" className="mentor-state-note">
        <MentorChip tone="info" icon={ic(CalendarDays, MI.chip)}>تا {fmtDate(row.mentorAway.until)} در دسترس نیست</MentorChip>
        {row.mentorAway.message && <span>{row.mentorAway.message}</span>}
      </p>,
    );
  }
  if (row.status === "ENDED" && row.endReason) {
    const byMe = (row.endedBy === "MENTOR" && role === "mentor") || (row.endedBy === "STUDENT" && role === "student");
    lines.push(
      <p key="ended" className="mentor-state-note">
        <MentorChip tone="neutral" icon={ic(LogOut, MI.chip)}>{byMe ? "پایان از طرف تو" : role === "student" ? "پایان از طرف مربی" : "پایان از طرف شاگرد"}</MentorChip>
        <span>{row.endReason}</span>
      </p>,
    );
  }
  // پیام خوش‌آمد این‌جا تکرار نمی‌شود: گفت‌وگو (MentorChat) آن را اولِ پیام‌ها
  // سنجاق می‌کند و قبلاً هر دو هم‌زمان روی یک صفحه دیده می‌شدند.

  if (lines.length === 0) return null;
  return <div className="mentor-state-notes">{lines}</div>;
}
