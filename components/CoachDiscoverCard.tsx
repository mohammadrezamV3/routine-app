"use client";

import "./coach.css";
import "./coach-discover.css";
import { Bookmark } from "lucide-react";
import { SmartLink } from "./SmartLink";
import { CoachAvatar } from "./CoachAvatar";
import { GoldenName } from "./GoldenName";
import { useSavedMentors } from "./MentorSaved";
import { prefetchMentorProfile } from "@/lib/mentorProfileCache";
import { faNum } from "@/lib/jalali";
import type { MentorCard } from "@/lib/mentorTypes";
import { tr, iso } from "@/lib/i18n";

/** تیک تایید کنار نام مربی (فقط وقتی هویتش تایید شده) */
export function CoachVerifiedMark({ size = 16 }: { size?: number }) {
  return (
    <span className="chd-verified" role="img" aria-label={tr("تایید شده", "Verified")}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** خط وضعیت جای خالی: «جای خالی دارد» / «پر» / بسته */
export function coachSeatLine(m: Pick<MentorCard, "availability" | "acceptingStudents">): { text: string; tone: "open" | "full" | "none" } {
  const a = m.availability ?? (m.acceptingStudents ? "OPEN" : "CLOSED");
  if (a === "OPEN") return { text: tr("جای خالی دارد", "Has openings"), tone: "open" };
  if (a === "FULL") return { text: tr("پر", "Full"), tone: "full" };
  if (a === "AWAY") return { text: tr("فعلا در دسترس نیست", "Away for now"), tone: "none" };
  return { text: tr("فعلا شاگرد نمی‌پذیرد", "Not taking students"), tone: "none" };
}

/** کارت مربی در «پیدا کردن مربی»: آواتار 56، نام + تیک، عنوان یک خط، امتیاز · شاگرد · جای خالی، ذخیره */
export function CoachDiscoverCard({ mentor }: { mentor: MentorCard }) {
  const saved = useSavedMentors();
  const isSaved = saved?.isSaved(mentor.userId) ?? false;
  const seat = coachSeatLine(mentor);
  const line = [mentor.routineRole, mentor.headline].filter(Boolean).join(" · ");
  const hasRating = mentor.ratingCount > 0 && mentor.ratingAvg > 0;
  const user = { id: mentor.userId, name: mentor.name, lastName: null, username: null, avatarUrl: mentor.avatarUrl, golden: mentor.golden };
  return (
    <article className="ch-card chd-card">
      <SmartLink
        href={`/mentors/${mentor.userId}`}
        prefetch={false}
        className="chd-card-link"
        draggable={false}
        onPointerDown={() => prefetchMentorProfile(mentor.userId)}
        onMouseEnter={() => prefetchMentorProfile(mentor.userId)}
      >
        <CoachAvatar user={user} size={56} />
        <span className="chd-card-main">
          <span className="chd-name">
            <span><GoldenName golden={mentor.golden} staff={mentor.staff}>{mentor.name}</GoldenName></span>
            {mentor.identityVerified && <CoachVerifiedMark size={16} />}
          </span>
          {line && <span className="chd-head" title={line}>{line}</span>}
          <span className="chd-meta">
            {hasRating && <span><b>{faNum(mentor.ratingAvg.toFixed(1))}</b> ({faNum(mentor.ratingCount)})</span>}
            <span>{tr(`${faNum(mentor.activeStudents)} شاگرد`, `${faNum(mentor.activeStudents)} ${mentor.activeStudents === 1 ? "student" : "students"}`)}</span>
            <span className={seat.tone === "open" ? "chd-open" : seat.tone === "full" ? "chd-full" : undefined}>{seat.text}</span>
          </span>
        </span>
      </SmartLink>
      {saved && (
        <button
          type="button"
          className="btn btn-ghost btn-icon chd-save"
          aria-pressed={isSaved}
          aria-label={isSaved ? tr(`برداشتن ${mentor.name} از ذخیره‌ها`, `Remove ${iso(mentor.name)} from saved`) : tr(`ذخیره‌ی ${mentor.name}`, `Save ${iso(mentor.name)}`)}
          onClick={() => saved.toggle(mentor)}
        >
          <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
