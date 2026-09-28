"use client";

import "./mentor.css";
import Link from "next/link";
import { CalendarDays, CircleSlash, Users } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { faNum } from "@/lib/jalali";
import { availabilityShort } from "@/lib/mentorAvailability";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { CertificateMark, MentorTag, RatingInline, categoryLabel } from "./MentorBadges";
import { MentorSaveButton } from "./MentorSaved";

const META_ICON = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * کارتِ فشرده‌ی منتور در «جستجوی منتور»: آواتار، نام + نشانِ مدرک کنارِ نام،
 * نقش/عنوان در یک خط، امتیاز و شاگردِ فعال در یک خطِ متا، و برچسب‌های کوچکِ حوزه.
 * کلِ کارت با «لینکِ کشیده» (::after روی نام) قابلِ کلیک است؛ نشانِ مدرک و نشانک
 * دکمه‌های مستقل‌اند (دکمه داخلِ <a> نمی‌نشیند).
 */
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const closed = mentor.availability && mentor.availability !== "OPEN"
    ? availabilityShort(mentor.availability, mentor.awayUntil)
    : !mentor.acceptingStudents ? "شاگرد جدید نمی‌پذیرد" : null;
  const line = [mentor.routineRole, mentor.headline].filter(Boolean).join(" · ");
  return (
    <article className="trade-surface rp-card mentor-card is-compact">
      <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={44} />
      <div className="mentor-card-id">
        <div className="mentor-card-title">
          <Link href={`/mentors/${mentor.userId}`} prefetch={false} className="mentor-card-name mentor-card-link">
            {mentor.name}
          </Link>
          <CertificateMark certifications={mentor.certifications} size={15} />
        </div>
        {line && <div className="mentor-card-headline" title={line}>{line}</div>}
        <div className="mentor-card-meta">
          <RatingInline value={mentor.ratingAvg} count={mentor.ratingCount} />
          <span><Users {...META_ICON} /> {faNum(mentor.activeStudents)} شاگرد فعال</span>
          {closed && (
            <span className="mentor-card-closed">
              {mentor.availability === "AWAY" ? <CalendarDays {...META_ICON} /> : <CircleSlash {...META_ICON} />} {closed}
            </span>
          )}
        </div>
        {mentor.categories.length > 0 && (
          <div className="mentor-card-tags">
            {mentor.categories.map((c) => <MentorTag key={c}>{categoryLabel(c)}</MentorTag>)}
          </div>
        )}
      </div>
      <MentorSaveButton mentor={mentor} className="mentor-card-save" />
    </article>
  );
}
