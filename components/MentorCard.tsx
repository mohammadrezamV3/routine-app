"use client";

import "./mentor.css";
import Link from "next/link";
import { BadgeCheck, CalendarDays, ChevronLeft } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { fmtDate } from "@/lib/mentorFormat";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { RatingStars } from "./MentorBadges";
import { MentorChip } from "./MentorUI";

// کارتِ یک منتور در کشف — همان قابِ rp-card رودمپ‌ها (trade-surface).
// طبقِ طرحِ درخواستی فقط این جزئیات: آواتار، نام (+ تیکِ مدرکِ تأییدشده)،
// کار/عنوان، «هویت تأییدشده»، تاریخِ عضویت و امتیاز؛ شِورونِ ورود به
// پروفایل پایینِ چپ. هاور فقط رنگِ بوردر/نام را عوض می‌کند؛ حرکتی ندارد.
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const certVerified = mentor.certifications.some((c) => c.verified);
  const role = mentor.headline || mentor.routineRole;
  return (
    <Link href={`/mentors/${mentor.userId}`} prefetch={false} className="trade-surface rp-card mentor-card" draggable={false}>
      <div className="mentor-card-head">
        <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={48} />
        <div className="mentor-card-id">
          <div className="mentor-card-name-row">
            <span className="mentor-card-name">{mentor.name}</span>
            {certVerified && (
              <BadgeCheck size={16} strokeWidth={1.9} className="mentor-card-tick" aria-label="مدرک تأییدشده" />
            )}
          </div>
          {role && <div className="mentor-card-headline">{role}</div>}
        </div>
      </div>

      {mentor.identityVerified && (
        <div className="mentor-chips">
          <MentorChip tone="accent" icon={<BadgeCheck size={13} strokeWidth={1.75} aria-hidden />} title="ادمین‌های آریون مدرک شناسایی این منتور را بررسی و تأیید کرده‌اند">
            هویت تأییدشده
          </MentorChip>
        </div>
      )}

      {mentor.memberSince && (
        <div className="rp-card-meta">
          <span><CalendarDays size={13} strokeWidth={1.75} aria-hidden /> عضویت از {fmtDate(mentor.memberSince)}</span>
        </div>
      )}

      <div className="rp-card-foot">
        <RatingStars value={mentor.ratingAvg} count={mentor.ratingCount} />
        <ChevronLeft size={16} strokeWidth={1.75} className="rp-card-arrow" aria-hidden />
      </div>
    </Link>
  );
}
