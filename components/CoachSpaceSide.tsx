"use client";

// ستون‌های کناری فضای همکاری در دسکتاپ (>=1024px). فقط روی دسکتاپ mount می‌شن.
import "./coach.css";
import "./coach-space.css";
import { useEffect, useState } from "react";
import { NotebookPen, Plus } from "lucide-react";
import type { CoachNomoQuota, CoachStudentRow, CoachSpace as CoachSpaceData } from "@/lib/coachTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { studentStatusText } from "@/lib/mentorStatus";
import { tr } from "@/lib/i18n";
import { faNum } from "@/lib/jalali";
import { CoachAvatar } from "./CoachAvatar";
import { CoachEmpty } from "./CoachEmpty";
import { CoachGoalCard } from "./CoachGoalCard";
import { CoachNomoLine } from "./CoachNomoLine";
import { CoachWeekCard } from "./CoachWeekCard";
import { mentorApi } from "./MentorDashKit";
import { SmartLink } from "./SmartLink";
import { TickButton } from "./TickButton";
import { LoadingBlock } from "./Spinner";
import { weekIndexOf } from "@/lib/coachWeek";

/** ستون شروع (مربی): فهرست فشرده‌ی شاگردها؛ زدن هر کدوم فضای همون شاگرد */
export function CoachSpaceStudents({ currentMentorshipId }: { currentMentorshipId: string }) {
  const [rows, setRows] = useState<CoachStudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    mentorApi<{ students: CoachStudentRow[] }>("/api/mentor/students").then((r) => {
      if (dead) return;
      if (r.ok) setRows((r.data.students || []).filter((s) => s && s.user));
      else setError(r.error);
    });
    return () => { dead = true; };
  }, []);
  return (
    <nav className="cs-students" aria-label={tr("شاگردها", "Students")}>
      <h2 className="ch-section-title">{tr("شاگردها", "Students")}</h2>
      {error ? (
        <div className="form-inline-error" role="alert">{error}</div>
      ) : !rows ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <p className="cs-muted">{tr("هنوز شاگردی نداری", "No students yet")}</p>
      ) : (
        <ul className="ch-list">
          {rows.map((s) => {
            const st = studentStatusText({ rate: s.weekRate, idleDays: s.idleDays, paused: s.paused });
            const current = s.mentorshipId === currentMentorshipId;
            return (
              <li key={s.mentorshipId}>
                <SmartLink href={`/mentor/students/${s.user.id}`} className={`ch-row cs-student-row${current ? " is-current" : ""}`} aria-current={current ? "page" : undefined}>
                  <CoachAvatar user={s.user} size={36} ring={s.weekRate} />
                  <span className="ch-row-main">
                    <span className="ch-row-title">{publicUserName(s.user)}</span>
                    <span className="ch-row-sub">{st.text}</span>
                  </span>
                  {s.unread > 0 && <span className="ch-nav-badge cs-badge" aria-label={tr(`${faNum(s.unread)} پیام تازه`, `${faNum(s.unread)} new messages`)}>{s.unread > 9 ? "9+" : s.unread}</span>}
                </SmartLink>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

/** ستون پایان (مربی): نومو، گزارش این هفته، برنامه‌های فعال، یادداشت و دکمه‌ی اصلی */
export function CoachSpaceMentorSide({ space, studentId, onNotes }: { space: CoachSpaceData; studentId: string; onNotes: () => void }) {
  const week = space.thisWeek;
  const [summary, setSummary] = useState<string | null>(week?.summary ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setSummary(week?.summary ?? null); }, [week?.summary, week?.weekStart]);
  const programs = space.events.filter((e): e is Extract<typeof e, { kind: "program" }> => e.kind === "program" && e.status === "ACTIVE");
  const active = space.status === "ACTIVE";

  async function makeSummary() {
    if (!week || busy) return;
    setBusy(true);
    setError(null);
    const r = await mentorApi<{ summary: string; quota: CoachNomoQuota }>("/api/mentor/nomo/week", { method: "POST", body: { mentorshipId: space.mentorshipId, weekStart: week.weekStart } });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setSummary(r.data.summary);
  }

  return (
    <>
      {week && (
        <CoachWeekCard
          index={week.weekIndex}
          grade={week.grade}
          routineRate={week.routineRate}
          workoutsDone={week.workoutsDone}
          workoutsPlanned={week.workoutsPlanned}
          sleepAvgMinutes={week.sleepAvgMinutes}
          href={`/mentor/students/${studentId}/week?w=${week.weekStart}`}
          title={tr(`گزارش هفته‌ی ${week.weekIndex}`, `Week ${week.weekIndex} report`)}
        />
      )}
      {week && (summary ? (
        <CoachNomoLine text={summary} />
      ) : (
        <CoachNomoLine
          loading={busy}
          text={error ?? tr("خلاصه‌ی این هفته رو نومو بنویسه؟", "Want Nomo to sum up this week?")}
          action={!busy && (
            <button type="button" className="btn btn-tonal btn-sm" onClick={makeSummary}>{tr("خلاصه‌ی نومو", "Nomo summary")}</button>
          )}
        />
      ))}

      <section className="ch-card cs-side-card" aria-label={tr("برنامه‌های فعال", "Active programs")}>
        <h2 className="ch-section-title">{tr("برنامه‌های فعال", "Active programs")}</h2>
        {programs.length === 0 ? (
          <p className="cs-muted">{tr("الان برنامه‌ی فعالی نیست", "No active program right now")}</p>
        ) : (
          <ul className="ch-list">
            {programs.map((p) => (
              <li key={p.id}>
                <SmartLink href={`/mentor-programs/${p.programId}`} className="cs-side-row">
                  <span className="cs-side-row-title">{p.title}</span>
                  <span className="cs-side-row-val">{p.rate == null ? "" : `${Math.round(p.rate <= 1 ? p.rate * 100 : p.rate)}%`}</span>
                </SmartLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="ch-row cs-note-row" onClick={onNotes}>
        <NotebookPen size={18} strokeWidth={1.75} aria-hidden />
        <span className="ch-row-main">
          <span className="ch-row-title">{tr("یادداشت من", "My notes")}</span>
          <span className="ch-row-sub">{tr("فقط خودت می‌بینی", "Only you can see this")}</span>
        </span>
      </button>

      {active && (
        <SmartLink href={`/mentor/programs/new?student=${encodeURIComponent(studentId)}`} className="btn btn-primary">
          <Plus size={16} aria-hidden="true" /> {tr("برنامه‌ی تازه", "New program")}
        </SmartLink>
      )}
    </>
  );
}

/** ستون پایان (شاگرد): هدف، گزارش این هفته و کارهای امروز از این مربی */
export function CoachSpaceStudentSide({ space, onGoal, onShare, onSees }: { space: CoachSpaceData; onGoal: () => void; onShare: () => void; onSees: () => void }) {
  const goal = space.goal;
  const week = space.thisWeek;
  const name = publicUserName(space.counterpart);
  const tasks = space.todayTasks ?? [];
  return (
    <>
      {goal && (
        <button type="button" className="cs-reset" onClick={onGoal} aria-label={tr("جزئیات هدف", "Goal details")}>
          <CoachGoalCard goal={goal} onShare={undefined} />
        </button>
      )}
      {goal?.status === "DONE" && (
        <button type="button" className="btn btn-tonal" onClick={onShare}>{tr("اشتراک‌گذاری هدف", "Share goal")}</button>
      )}
      {week && (
        <CoachWeekCard
          index={weekIndexOf(space.since, week.weekStart)}
          grade={week.grade}
          routineRate={week.routineRate}
          workoutsDone={week.workoutsDone}
          workoutsPlanned={week.workoutsPlanned}
          sleepAvgMinutes={week.sleepAvgMinutes}
          href={`/mentorship/${space.mentorshipId}/week?w=${week.weekStart}`}
        />
      )}
      <section className="ch-card cs-side-card" aria-label={tr("امروز", "Today")}>
        <h2 className="ch-section-title">{tr("امروز", "Today")}</h2>
        {tasks.length === 0 ? (
          <CoachEmpty text={tr(`${name} برای امروز کاری نذاشته`, `${name} has no tasks for today`)} />
        ) : (
          <ul className="ch-list">
            {tasks.map((t) => (
              <li key={t.id} className="cs-task">
                <TickButton as="span" checked={t.done} size={22} />
                <span className="ch-row-main">
                  <span className={`ch-row-title${t.done ? " is-done" : ""}`}>{t.title}</span>
                  {t.meta && <span className="ch-row-sub">{t.meta}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <button type="button" className="btn btn-ghost" onClick={onSees}>{tr(`${name} چی می‌بینه؟`, `What can ${name} see?`)}</button>
    </>
  );
}
