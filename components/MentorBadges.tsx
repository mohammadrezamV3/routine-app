"use client";

import "./mentor.css";
import { BadgeCheck, Award, Star } from "lucide-react";
import { MENTOR_CATEGORY_META, isMentorCategory } from "@/lib/mentorCategories";
import { faNum } from "@/lib/jalali";

/** برچسبِ فارسیِ یک دسته (کلیدِ ناشناخته همان‌طور نمایش داده می‌شود) */
export function categoryLabel(key: string): string {
  return isMentorCategory(key) ? MENTOR_CATEGORY_META[key].label : key;
}

/**
 * نشان‌های احراز: «هویت تأییدشده» + یک نشان برای هر مدرکِ تأییدشده. مدرکِ
 * تأییدنشده عمدا نشان داده نمی‌شود — نشانی که تأیید نشده، اعتبار نمی‌سازد.
 */
export function VerificationBadges({
  identityVerified,
  certifications,
}: {
  identityVerified: boolean;
  certifications: { category: string; verified: boolean }[];
}) {
  const verified = certifications.filter((c) => c.verified);
  if (!identityVerified && verified.length === 0) return null;
  return (
    <span className="mentor-chips">
      {identityVerified && (
        <span className="mentor-chip is-accent" title="ادمین‌های آریون مدرک شناسایی این منتور را بررسی و تأیید کرده‌اند">
          <BadgeCheck size={13} strokeWidth={1.75} aria-hidden /> <span>هویت تأییدشده</span>
        </span>
      )}
      {verified.map((c) => (
        <span key={c.category} className="mentor-chip is-accent" title="ادمین‌های آریون مدرک تخصصی این منتور را بررسی و تأیید کرده‌اند">
          <Award size={13} strokeWidth={1.75} aria-hidden /> <span>{isMentorCategory(c.category) ? MENTOR_CATEGORY_META[c.category].certLabel : c.category}</span>
        </span>
      ))}
    </span>
  );
}

/** چیپِ یک دسته (بدون آیکون، رنگ متن) */
export function CategoryChip({ category }: { category: string }) {
  return <span className="mentor-chip is-cat"><span>{categoryLabel(category)}</span></span>;
}

/** امتیاز به‌شکلِ پنج ستاره (نیم‌ستاره به نزدیک‌ترین ستاره‌ی کامل گرد می‌شود) + عدد */
export function RatingStars({ value, count }: { value: number; count?: number }) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const filled = Math.round(v);
  const none = count === 0 || v === 0;
  return (
    <span className="mentor-stars" aria-label={none ? "بدون امتیاز" : `امتیاز ${faNum(v.toFixed(1))} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} strokeWidth={1.75} aria-hidden className={i <= filled && !none ? undefined : "is-empty"} fill={i <= filled && !none ? "currentColor" : "none"} />
      ))}
      {none ? (
        <span className="mentor-stars-count">بدون امتیاز</span>
      ) : (
        <>
          <span className="mentor-stars-value">{faNum(v.toFixed(1))}</span>
          {count !== undefined && <span className="mentor-stars-count">({faNum(count)} نظر)</span>}
        </>
      )}
    </span>
  );
}
