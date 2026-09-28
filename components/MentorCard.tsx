"use client";

import "./mentor.css";
import Link from "next/link";
import { CalendarDays, ChevronLeft, CircleSlash } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { availabilityShort } from "@/lib/mentorAvailability";
import { fmtDate } from "@/lib/mentorFormat";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { CertificateMark, RatingInline } from "./MentorBadges";
import { MentorSaveButton } from "./MentorSaved";
import { prefetchMentorProfile } from "@/lib/mentorProfileCache";

const META_ICON = { size: 12, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * کارتِ جمع‌وجورِ منتور در «پیدا کردن منتور» (ردیف‌های افقی و فهرست):
 * سرِ کارت آواتار، نام + مدالِ طلاییِ مدرک درست کنارِ نام، نقش/عنوان در یک خط،
 * و نشانک؛ اگر پذیرش بسته است یک خطِ کوتاهِ وضعیت؛ ردیفِ پایین امتیاز · عضویت · شِورون.
 * «هویت تأییدشده» روی کارت نمی‌آید (احرازِ هویت برای منتورشدن اجباری است).
 * کلِ کارت با «لینکِ کشیده» (::after روی نام) قابلِ کلیک است؛ مدال (CertificateMark،
 * لمس معنی‌اش را توضیح می‌دهد) و نشانک دکمه‌های مستقل‌اند و داخلِ <a> نمی‌نشینند.
 */
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const closed = mentor.availability && mentor.availability !== "OPEN"
    ? availabilityShort(mentor.availability, mentor.awayUntil)
    : !mentor.acceptingStudents ? "شاگرد جدید نمی‌پذیرد" : null;
  const line = [mentor.routineRole, mentor.headline].filter(Boolean).join(" · ");
  return (
    <article className="trade-surface rp-card mentor-card">
      <div className="mentor-card-head">
        <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={44} />
        <div className="mentor-card-id">
          <div className="mentor-card-name-row">
            <Link
              href={`/mentors/${mentor.userId}`}
              prefetch={false}
              className="mentor-card-name mentor-card-link"
              draggable={false}
              // داده‌ی پروفایل از همین لحظه‌ی لمس/هاور گرفته می‌شه (lib/mentorProfileCache.ts)
              onPointerDown={() => prefetchMentorProfile(mentor.userId)}
              onMouseEnter={() => prefetchMentorProfile(mentor.userId)}
            >
              {mentor.name}
            </Link>
            <CertificateMark certifications={mentor.certifications} size={16} />
          </div>
          {line && <div className="mentor-card-headline" title={line}>{line}</div>}
          {closed && (
            <div className="mentor-card-closed">
              {mentor.availability === "AWAY" ? <CalendarDays {...META_ICON} /> : <CircleSlash {...META_ICON} />} {closed}
            </div>
          )}
        </div>
        <MentorSaveButton mentor={mentor} className="mentor-card-save" />
      </div>
      <div className="mentor-card-foot">
        <RatingInline value={mentor.ratingAvg} count={mentor.ratingCount} />
        {mentor.memberSince && (
          <span className="mentor-card-since"><CalendarDays {...META_ICON} /> از {fmtDate(mentor.memberSince)}</span>
        )}
        <ChevronLeft size={16} strokeWidth={1.75} className="rp-card-arrow" aria-hidden />
      </div>
    </article>
  );
}
