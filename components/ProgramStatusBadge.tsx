"use client";

import "./mentor.css";
import { PROGRAM_STATUS_LABELS } from "@/lib/mentorProgramState";

const MENTORSHIP_LABELS: Record<string, string> = {
  PENDING: "در انتظار پاسخ",
  ACTIVE: "فعال",
  REJECTED: "ردشده",
  BLOCKED: "مسدود",
  ENDED: "پایان‌یافته",
};

/** وضعیتِ برنامه‌ی منتور — فقط رنگِ متن + بوردر (بی‌بک‌گراند) */
export function ProgramStatusBadge({ status }: { status: string }) {
  const label = (PROGRAM_STATUS_LABELS as Record<string, string>)[status] ?? MENTORSHIP_LABELS[status] ?? status;
  return <span className={`mentor-status is-${status.toLowerCase()}`}>{label}</span>;
}

/** وضعیتِ رابطه‌ی منتور ↔ شاگرد */
export function MentorshipStatusBadge({ status }: { status: string }) {
  return <span className={`mentor-status is-${status.toLowerCase()}`}>{MENTORSHIP_LABELS[status] ?? status}</span>;
}
