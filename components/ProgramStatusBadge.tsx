"use client";

import "./mentor.css";
import { Ban, CheckCircle2, CircleDot, CircleSlash, Clock, FileEdit, Flag, XCircle } from "lucide-react";
import { programStatusText } from "@/lib/mentorStatus";
import type { ProgramStatus } from "@/lib/mentorTypes";
import { pick, type Localized } from "@/lib/i18n";

const MENTORSHIP_LABELS: Record<string, Localized> = {
  PENDING: { fa: "در انتظار پاسخ", en: "Awaiting reply" },
  ACTIVE: { fa: "فعال", en: "Active" },
  REJECTED: { fa: "ردشده", en: "Declined" },
  BLOCKED: { fa: "مسدود", en: "Blocked" },
  ENDED: { fa: "پایان‌یافته", en: "Ended" },
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

const PROGRAM_KEYS = ["DRAFT", "PENDING", "ACCEPTED", "REJECTED", "ACTIVE", "COMPLETED", "CANCELLED"];

/** وضعیت برنامه به زبان مربی: آیتم نقطه‌ای + متن (رنگ تنها نیست). changeRequested برای پیش‌نویس برگشتی */
export function ProgramStatusBadge({ status, changeRequested }: { status: string; changeRequested?: boolean }) {
  if (!PROGRAM_KEYS.includes(status)) {
    return (
      <span className={`mentor-status is-${status.toLowerCase()}`}>
        {statusIcon(status)}
        {MENTORSHIP_LABELS[status] ? pick(MENTORSHIP_LABELS[status]) : status}
      </span>
    );
  }
  const { text, tone } = programStatusText(status as ProgramStatus, { changeRequested });
  return (
    <span className={`mv2-pg-pill mv2-tone-${tone}`}>
      {statusIcon(status)}
      {text}
    </span>
  );
}

/** وضعیت رابطه‌ی منتور ↔ شاگرد */
export function MentorshipStatusBadge({ status }: { status: string }) {
  return (
    <span className={`mentor-status is-${status.toLowerCase()}`}>
      {statusIcon(status)}
      {MENTORSHIP_LABELS[status] ? pick(MENTORSHIP_LABELS[status]) : status}
    </span>
  );
}
