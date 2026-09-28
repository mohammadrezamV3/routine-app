"use client";

import "./mentor.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, Medal } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { fmtDate } from "@/lib/mentorFormat";
import { MENTOR_CATEGORY_META, isMentorCategory } from "@/lib/mentorCategories";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { RatingStars } from "./MentorBadges";

// کارتِ یک منتور در کشف — همان قابِ rp-card رودمپ‌ها (trade-surface).
// جزئیات: آواتار، نام، عنوانِ کاری، تاریخِ عضویت، امتیاز؛ شِورونِ ورود به
// پروفایل پایینِ چپ. «هویت تأییدشده» روی کارت نمی‌آید (هر منتوری برای تدریس
// باید احرازِ هویت شده باشد)؛ فقط اگر مدرکِ تخصصیِ تأییدشده دارد، یک مدالِ
// طلایی درست کنارِ نام که با کلیک معنی‌اش را می‌گوید.
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const certs = mentor.certifications.filter((c) => c.verified);
  const role = mentor.headline || mentor.routineRole;
  // «لینکِ کشیده»: خودِ نام لینک است و با ::after کلِ کارت را می‌پوشاند؛ این‌طوری
  // مدال (یک دکمه) می‌تواند درست کنارِ نام بنشیند بدونِ اینکه داخلِ <a> باشد.
  return (
    <div className="trade-surface rp-card mentor-card">
      <div className="mentor-card-head">
        <MentorUserAvatar name={mentor.name} avatarUrl={mentor.avatarUrl} size={44} />
        <div className="mentor-card-id">
          <div className="mentor-card-name-row">
            <Link href={`/mentors/${mentor.userId}`} prefetch={false} className="mentor-card-name mentor-card-link" draggable={false}>
              {mentor.name}
            </Link>
            {certs.length > 0 && (
              <CertMedal labels={certs.map((c) => (isMentorCategory(c.category) ? MENTOR_CATEGORY_META[c.category].certLabel : c.category))} />
            )}
          </div>
          {role && <div className="mentor-card-headline">{role}</div>}
        </div>
      </div>
      <div className="mentor-card-foot">
        <RatingStars value={mentor.ratingAvg} count={mentor.ratingCount} />
        {mentor.memberSince && (
          <span className="mentor-card-since"><CalendarDays size={12} strokeWidth={1.75} aria-hidden /> از {fmtDate(mentor.memberSince)}</span>
        )}
        <ChevronLeft size={16} strokeWidth={1.75} className="rp-card-arrow" aria-hidden />
      </div>
    </div>
  );
}

// مدالِ طلایی — درست کنارِ نام، بیرونِ <Link> (دکمه داخلِ لینک مجاز نیست) و بی‌بک‌گراند؛
// کلیک/لمس یک توضیحِ کوتاه باز می‌کند، کلیکِ بیرون یا Esc می‌بندد.
function CertMedal({ labels }: { labels: string[] }) {
  // موقعیتِ ثابت (fixed) نسبت به خودِ مدال — ردیفِ افقیِ کارت‌ها overflow دارد
  // و پاپ‌آپِ absolute را می‌بُرید. با اسکرول/تغییرِ اندازه بسته می‌شود.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const open = !!pos;
  function toggle() {
    if (pos) { setPos(null); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(220, window.innerWidth - 16);
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) });
  }
  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  return (
    <div className="mentor-medal" ref={ref}>
      <button
        type="button"
        className="mentor-medal-btn"
        aria-label="مدرک تخصصی تأییدشده؛ توضیح"
        aria-expanded={open}
        ref={btnRef}
        onClick={toggle}
      >
        <Medal size={17} strokeWidth={1.9} aria-hidden />
      </button>
      {pos && (
        <div className="mentor-medal-tip" role="tooltip" style={{ top: pos.top, left: pos.left }}>
          <b>مدرک تخصصی تأییدشده</b>
          <span>{labels.join("، ")} این منتور را ادمین‌های آریون بررسی و تأیید کرده‌اند.</span>
        </div>
      )}
    </div>
  );
}
