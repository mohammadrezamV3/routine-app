"use client";

import "./mentor.css";
import { Ban, CheckCircle2, CircleDot, CircleSlash, Clock, FileEdit, Flag, XCircle } from "lucide-react";
import { PROGRAM_STATUS_LABELS } from "@/lib/mentorProgramState";

// برچسب‌های کوتاهِ چیپ. کلیدها همان وضعیت‌های دیتابیس‌اند؛ برای وضعیتِ
// ناشناخته به PROGRAM_STATUS_LABELS و در نهایت خودِ کلید برمی‌گردد.
const PROGRAM_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PENDING: "در انتظار پاسخ",
  ACCEPTED: "پذیرفته‌شده",
  REJECTED: "ردشده",
  ACTIVE: "در حال اجرا",
  COMPLETED: "تمام‌شده",
  CANCELLED: "لغوشده",
};

const MENTORSHIP_LABELS: Record<string, string> = {
  PENDING: "در انتظار پاسخ",
  ACTIVE: "فعال",
  REJECTED: "ردشده",
  BLOCKED: "مسدود",
  ENDED: "پایان‌یافته",
};

const ICON_PROPS = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;

function statusIcon(status: string) {
  switch (status) {
    case "DRAFT": return <FileEdit {...ICON_PROPS} />;
    case "PENDING": return <Clock {...ICON_PROPS} />;
    case "ACCEPTED": return <CheckCircle2 {...ICON_PROPS} />;
    case "ACTIVE": return <CircleDot {...ICON_PROPS} />;
    case "COMPLETED": return <Flag {...ICON_PROPS} />;
    case "REJECTED": return <XCircle {...ICON_PROPS} />;
    case "CANCELLED": return <CircleSlash {...ICON_PROPS} />;
    case "BLOCKED": return <Ban {...ICON_PROPS} />;
    case "ENDED": return <CircleSlash {...ICON_PROPS} />;
    default: return null;
  }
}

/** وضعیتِ برنامه‌ی منتور — چیپ کوچک: آیکون + متن، فقط رنگِ متن و بوردر */
export function ProgramStatusBadge({ status }: { status: string }) {
  const label = PROGRAM_LABELS[status] ?? (PROGRAM_STATUS_LABELS as Record<string, string>)[status] ?? MENTORSHIP_LABELS[status] ?? status;
  return (
    <span className={`mentor-status is-${status.toLowerCase()}`}>
      {statusIcon(status)}
      {label}
    </span>
  );
}

/** وضعیتِ رابطه‌ی منتور ↔ شاگرد */
export function MentorshipStatusBadge({ status }: { status: string }) {
  return (
    <span className={`mentor-status is-${status.toLowerCase()}`}>
      {statusIcon(status)}
      {MENTORSHIP_LABELS[status] ?? status}
    </span>
  );
}
