"use client";

import "./mentor.css";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { faNum } from "@/lib/jalali";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { RatingStars, VerificationBadges, categoryLabel } from "./MentorBadges";

// کارتِ یک منتور در لیستِ کشف/محبوب‌ها — همان قابِ rp-card رودمپ‌ها
// (trade-surface + هاورِ بوردرِ اکسنت)، نه یک کارتِ تازه.
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  return (
    <Link href={`/mentors/${mentor.userId}`} prefetch={false} className="trade-surface rp-card mentor-card">
      <div className="mentor-card-head">
        <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={46} />
        <div className="mentor-card-id">
          <div className="mentor-card-name">{mentor.name}</div>
          {mentor.headline && <div className="mentor-card-headline">{mentor.headline}</div>}
        </div>
      </div>

      <VerificationBadges identityVerified={mentor.identityVerified} certifications={mentor.certifications} />

      {mentor.categories.length > 0 && (
        <div className="rp-card-meta">
          {mentor.categories.map((c) => (
            <span key={c} className="mentor-badge is-cat">{categoryLabel(c)}</span>
          ))}
        </div>
      )}

      <div className="rp-card-foot">
        <RatingStars value={mentor.ratingAvg} count={mentor.ratingCount} />
        <span className="rp-card-meta" style={{ marginTop: 0, marginInlineStart: "auto" }}>
          <span><Users size={12} /> {faNum(mentor.activeStudents)} شاگرد فعال</span>
        </span>
        <ChevronLeft size={16} className="rp-card-arrow" />
      </div>
      {!mentor.acceptingStudents && <div className="mentor-card-closed" style={{ marginTop: 8 }}>فعلا شاگردِ جدید نمی‌پذیرد</div>}
    </Link>
  );
}
