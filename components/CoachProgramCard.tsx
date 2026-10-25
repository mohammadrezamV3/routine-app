"use client";

import "./coach.css";
import type { ReactNode } from "react";
import type { ProgramStatus } from "@/lib/mentorTypes";
import { programStatusText } from "@/lib/mentorStatus";
import { weekdayShort } from "@/lib/jalali";
import { SmartLink } from "./SmartLink";
import { tr } from "@/lib/i18n";

/** شنبه تا جمعه (days همان getDay جاوااسکریپته: 0 یکشنبه) */
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

export function coachProgramMeta(itemCount: number, weeks: number | null, days: number[]): string {
  const parts = [tr(`${itemCount} کار`, `${itemCount} ${itemCount === 1 ? "task" : "tasks"}`)];
  if (weeks) parts.push(tr(`${weeks} هفته`, `${weeks} ${weeks === 1 ? "week" : "weeks"}`));
  const uniq = WEEK_ORDER.filter((d) => days.includes(d));
  if (uniq.length === 7) parts.push(tr("هر روز", "Every day"));
  else if (uniq.length) parts.push(uniq.map((d) => weekdayShort(d)).join(tr("، ", ", ")));
  return parts.join(" · ");
}

/**
 * کارت برنامه در خط زمانی. actions: دکمه‌ها (شاگرد: قبول btn-primary / تغییر بخواه btn-ghost / نه btn-ghost؛
 * اصلی آخر ردیف). اگه href بدهی کل بدنه لینک می‌شه. eyebrow پیش‌فرض «برنامه‌ی تازه».
 */
export function CoachProgramCard({ title, itemCount, weeks, days, status, changeRequested, eyebrow, statusLine, href, actions, align = "end" }: {
  title: string; itemCount: number; weeks: number | null; days: number[]; status: ProgramStatus; changeRequested?: boolean;
  eyebrow?: string; statusLine?: string; href?: string; actions?: ReactNode; align?: "start" | "end";
}) {
  const st = programStatusText(status, { changeRequested });
  const head = (
    <>
      <span className="ch-eyebrow">{eyebrow ?? tr("برنامه‌ی تازه", "New program")}</span>
      <span className="ch-program-title">{title}</span>
      <span className="ch-program-meta">{coachProgramMeta(itemCount, weeks, days)}</span>
      <span className={`ch-program-status is-${st.tone}`}>{statusLine ?? st.text}</span>
    </>
  );
  return (
    <article className={`ch-event-card ch-program is-${align}`}>
      {href ? <SmartLink href={href} className="ch-program-link">{head}</SmartLink> : <div className="ch-program-link">{head}</div>}
      {actions && <div className="ch-program-actions">{actions}</div>}
    </article>
  );
}
