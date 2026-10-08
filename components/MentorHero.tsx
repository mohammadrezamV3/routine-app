"use client";

import "./mentor.css";
import { MentorReveal } from "./MentorMotion";

export type MentorHeroStat = { label: string; value: string | number };

/**
 * هیروی بدون باکس بالای صفحه‌ی پنل مربی: عنوان، یک جمله‌ی خلاصه، حداکثر
 * سه عدد بزرگ و یک اسلات اختیاری (مثلا قرص وضعیت پذیرش). زیرنویس دیگری
 * زیر عنوان نیست؛ summary خودش محتوای هیروست.
 */
export function MentorHero({
  title, summary, stats, trailing, className,
}: {
  title: string;
  summary?: React.ReactNode;
  stats?: MentorHeroStat[];
  trailing?: React.ReactNode;
  className?: string;
}) {
  const list = (stats ?? []).slice(0, 3);
  return (
    <MentorReveal className={`mv2-hero${className ? ` ${className}` : ""}`}>
      <div className="mv2-hero-top">
        <div className="mv2-hero-text">
          <h1 className="mv2-hero-title">{title}</h1>
          {summary && <p className="mv2-hero-summary">{summary}</p>}
        </div>
        {trailing && <div className="mv2-hero-trailing">{trailing}</div>}
      </div>
      {list.length > 0 && (
        <dl className="mv2-hero-stats">
          {list.map((s) => (
            <div key={s.label} className="mv2-hero-stat">
              <dd>{s.value}</dd>
              <dt>{s.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </MentorReveal>
  );
}
