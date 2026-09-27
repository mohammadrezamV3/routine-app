"use client";

import "./mentor.css";
import Link from "next/link";
import { CalendarDays, ChevronLeft, CircleSlash, Users } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { faNum } from "@/lib/jalali";
import { availabilityShort } from "@/lib/mentorAvailability";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { CategoryChip, RatingStars, VerificationBadges } from "./MentorBadges";
import { MentorChip } from "./MentorUI";

// کارتِ یک منتور در لیستِ کشف — همان قابِ rp-card رودمپ‌ها (trade-surface).
// هاور فقط رنگِ بوردر/نام را عوض می‌کند؛ حرکتی ندارد.
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  // ظرفیت/عدم حضور یک چیپِ فشرده کنارِ بقیه‌ی چیپ‌هاست، نه یک خطِ متنیِ جدا
  const closed = mentor.availability && mentor.availability !== "OPEN"
    ? availabilityShort(mentor.availability, mentor.awayUntil)
    : !mentor.acceptingStudents ? "شاگرد جدید نمی‌پذیرد" : null;
  const hasChips = !!closed || mentor.identityVerified || mentor.certifications.some((c) => c.verified) || mentor.categories.length > 0;
  return (
    <Link href={`/mentors/${mentor.userId}`} prefetch={false} className="trade-surface rp-card mentor-card">
      <div className="mentor-card-head">
        <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={44} />
        <div className="mentor-card-id">
          {mentor.routineRole && <div className="rp-card-eyebrow">{mentor.routineRole}</div>}
          <div className="mentor-card-name">{mentor.name}</div>
          {mentor.headline && <div className="mentor-card-headline">{mentor.headline}</div>}
        </div>
      </div>

      {hasChips && (
        <div className="mentor-chips">
          {closed && (
            <MentorChip tone={mentor.availability === "AWAY" ? "info" : "neutral"} icon={mentor.availability === "AWAY" ? <CalendarDays size={13} strokeWidth={1.75} aria-hidden /> : <CircleSlash size={13} strokeWidth={1.75} aria-hidden />}>
              {closed}
            </MentorChip>
          )}
          <VerificationBadges identityVerified={mentor.identityVerified} certifications={mentor.certifications} />
          {mentor.categories.map((c) => <CategoryChip key={c} category={c} />)}
        </div>
      )}

      <div className="rp-card-foot">
        <RatingStars value={mentor.ratingAvg} count={mentor.ratingCount} />
        <span className="rp-card-meta" style={{ marginInlineStart: "auto" }}>
          <span><Users size={13} strokeWidth={1.75} aria-hidden /> {faNum(mentor.activeStudents)} شاگرد فعال</span>
        </span>
        <ChevronLeft size={16} strokeWidth={1.75} className="rp-card-arrow" aria-hidden />
      </div>
    </Link>
  );
}
