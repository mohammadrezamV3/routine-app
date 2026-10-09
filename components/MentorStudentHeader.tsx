"use client";

import Link from "next/link";
import { MessageSquare, NotebookPen, Plus } from "lucide-react";
import { MentorAvatarRing } from "./MentorAvatarRing";
import { MI, MI_STROKE } from "./MentorUI";
import { fa } from "./MentorDashKit";
import { fmtDate } from "@/lib/mentorFormat";
import { tr } from "@/lib/i18n";

/** سرتیتر صفحه‌ی شاگرد: حلقه‌ی بزرگ این هفته، نام، از کی، برچسب‌ها، سه عدد و سه دکمه */
export function MentorStudentHeader({
  name, avatarUrl, since, rate, rateHidden, activePrograms, labels, pausedAt, mentorshipId, onNote, nameNode,
}: {
  name: string;
  avatarUrl: string | null | undefined;
  since: string | null;
  rate: number | null;
  rateHidden: boolean;
  activePrograms: number;
  labels: string[];
  pausedAt: string | null;
  mentorshipId: string;
  onNote: () => void;
  nameNode?: React.ReactNode;
}) {
  const pctText = rate === null ? null : tr(`${fa(Math.round(rate * 100))}٪`, `${fa(Math.round(rate * 100))}%`);
  return (
    <div className="mv2-st-head">
      <MentorAvatarRing
        name={name} avatarUrl={avatarUrl} progress={rate} size={96}
        label={pctText ? tr(`پیشرفت این هفته ${fa(Math.round((rate ?? 0) * 100))} درصد`, `This week's progress: ${fa(Math.round((rate ?? 0) * 100))} percent`) : undefined}
      />
      <h1 className="mv2-st-h1">{nameNode ?? name}</h1>
      <p className="mv2-st-since">{since ? tr(`شاگردت از ${fmtDate(since)}`, `Your student since ${fmtDate(since)}`) : tr("شاگرد تو", "Your student")}{pausedAt ? tr(` · متوقف از ${fmtDate(pausedAt)}`, ` · Paused since ${fmtDate(pausedAt)}`) : ""}</p>
      {labels.length > 0 && (
        <ul className="mv2-st-labs" aria-label={tr("برچسب‌ها", "Labels")}>
          {labels.map((l) => <li key={l} className="mv2-st-lab">{l}</li>)}
        </ul>
      )}
      <dl className="mv2-st-stats">
        <div><dd>{pctText ?? (rateHidden ? tr("خصوصی", "Private") : "-")}</dd><dt>{tr("این هفته", "This week")}</dt></div>
        <div><dd>{fa(activePrograms)}</dd><dt>{tr("برنامه‌ی فعال", "Active programs")}</dt></div>
      </dl>
      <div className="mv2-st-actions">
        <Link href={`/mentorship/${mentorshipId}/chat`} prefetch={false} className="trade-primary-btn mentor-btn">
          <MessageSquare size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> {tr("پیام", "Message")}
        </Link>
        <Link href={`/mentor/programs/new?mentorshipId=${encodeURIComponent(mentorshipId)}`} prefetch={false} className="account-outline-btn mentor-btn">
          <Plus size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> {tr("برنامه", "Program")}
        </Link>
        <button type="button" className="account-outline-btn mentor-btn" onClick={onNote}>
          <NotebookPen size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> {tr("یادداشت", "Note")}
        </button>
      </div>
    </div>
  );
}
