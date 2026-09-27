"use client";

import "./mentor.css";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { faNum } from "@/lib/jalali";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { CategoryChip, RatingStars, VerificationBadges } from "./MentorBadges";

// کارتِ یک منتور در لیستِ کشف — همان قابِ rp-card رودمپ‌ها (trade-surface).
// هاور فقط رنگِ بوردر/نام را عوض می‌کند؛ حرکتی ندارد.
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const hasChips = mentor.identityVerified || mentor.certifications.some((c) => c.verified) || mentor.categories.length > 0;
  return (
    <Link href={`/mentors/${mentor.userId}`} prefetch={false} className="trade-surface rp-card mentor-card">
      <div className="mentor-card-head">
        <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={44} />
        <div className="mentor-card-id">
          <div className="mentor-card-name">{mentor.name}</div>
          {mentor.headline && <div className="mentor-card-headline">{mentor.headline}</div>}
        </div>
      </div>

      {hasChips && (
        <div className="mentor-chips">
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
      {!mentor.acceptingStudents && <div className="mentor-card-closed">شاگرد جدید نمی‌پذیرد</div>}
    </Link>
  );
}
