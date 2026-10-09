"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import { useParams, useRouter } from "next/navigation";
import { CalendarCheck, CirclePause, CirclePlay, Download, Dumbbell, LogOut, Tag, UserRound, MessageSquareText } from "lucide-react";
import { LoadingBlock } from "@/components/Spinner";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MentorKebabMenu, type MentorMenuAction } from "@/components/MentorKebabMenu";
import { MentorDashBar, MentorDashError, MentorDashShell, fa, mentorApi, pct } from "@/components/MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmpty, MentorEmptyState, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorStudentHeader } from "@/components/MentorStudentHeader";
import { MentorStudentWeek, weekRate } from "@/components/MentorStudentWeek";
import { MentorStudentModules } from "@/components/MentorStudentModules";
import { MentorStudentManage, useStudentManage } from "@/components/MentorStudentManage";
import { MentorStudentNotes } from "@/components/MentorStudentNotes";
import { MentorStudentPrivacy } from "@/components/MentorStudentPrivacy";
import { MentorIntakeAnswers } from "@/components/MentorIntakeAnswers";
import { MentorStudentRelationControls, type StudentRelationDialog } from "@/components/MentorStudentRelationControls";
import { MentorProgramTools } from "@/components/MentorProgramTools";
import { GoldenName } from "@/components/GoldenName";
import { programStatusText } from "@/lib/mentorStatus";
import { fmtDate, fmtRelative } from "@/lib/mentorFormat";
import { isoLocal } from "@/lib/jalali";
import { exportCsvUrl } from "@/lib/mentorToolsTypes";
import { publicUserName } from "@/lib/mentorTypes";
import type { StudentView } from "@/components/MentorStudentTypes";
import { tr } from "@/lib/i18n";

const ic = (Icon: typeof Tag, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;
const privateText = () => tr("این بخش رو شاگرد خصوصی نگه داشته", "The student keeps this section private");

type Tab = "week" | "programs" | "notes" | "about";
const tabs = (): { value: Tab; label: string }[] => [
  { value: "week", label: tr("هفته", "Week") },
  { value: "programs", label: tr("برنامه‌ها", "Programs") },
  { value: "notes", label: tr("یادداشت‌ها", "Notes") },
  { value: "about", label: tr("درباره", "About") },
];

function weekRange(offset: number): { from: string; to: string } {
  const to = new Date();
  to.setHours(12, 0, 0, 0);
  to.setDate(to.getDate() + offset * 7);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: isoLocal(from), to: isoLocal(to) };
}

export default function MentorStudentPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = typeof params?.studentId === "string" ? params.studentId : "";
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<Tab>("week");
  const [data, setData] = useState<StudentView | null>(null);
  const [thisWeek, setThisWeek] = useState<StudentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [relation, setRelation] = useState<StudentRelationDialog | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const manage = useStudentManage(studentId);

  const load = useCallback(async (off: number) => {
    if (!studentId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    const { from, to } = weekRange(off);
    const r = await mentorApi<StudentView>(`/api/mentor/students/${encodeURIComponent(studentId)}?from=${from}&to=${to}`, { signal: ctrl.signal });
    if (r.status === -1) return; // درخواست قدیمی لغو شد
    setLoading(false);
    if (!r.ok) { setError({ message: r.error, status: r.status }); return; }
    setData(r.data);
    if (off === 0) setThisWeek(r.data);
  }, [studentId]);

  useEffect(() => { load(offset); }, [load, offset]);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  useLiveRefresh("mentor", () => { load(offsetRef.current); });
  useVisiblePolling(() => { load(offsetRef.current); }, 30_000);
  useEffect(() => () => abortRef.current?.abort(), []);

  const name = data ? publicUserName(data.student) : tr("شاگرد", "Student");

  function download(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  let body: React.ReactNode;
  if (!studentId || (loading && !data)) body = <LoadingBlock />;
  else if (error && !data) {
    body = error.status === 404 || error.status === 403 ? (
      <MentorEmptyState
        icon={ic(UserRound, MI.empty)}
        title={tr("به اطلاعات این شاگرد دسترسی نداری", "You do not have access to this student")}
        text={tr("فقط شاگردهایی که همکاری فعال با تو دارن اینجا دیده می‌شن", "Only students you are actively working with show up here")}
      />
    ) : (
      <MentorDashError message={error.message} onRetry={() => load(offset)} />
    );
  } else if (data) {
    const { from, to } = weekRange(offset);
    const cur = thisWeek ?? data;
    const wr = weekRange(0);
    const rate = weekRate(cur.routine, wr.from, wr.to);
    const rateHidden = cur.routine.scheduleHidden || !cur.privacy.showProgress;
    const labelNames = manage.data ? manage.data.labels.filter((l) => manage.data!.labelIds.includes(l.id)).map((l) => l.name) : [];
    const pausedAt = manage.data?.pausedAt ?? null;
    const activeCount = data.programs.filter((p) => p.status === "ACTIVE").length;

    const actions: MentorMenuAction[] = [
      { label: tr("برچسب‌ها", "Labels"), icon: ic(Tag, MI.btnSm), onClick: () => setLabelsOpen(true), disabled: !manage.data },
      { label: tr("خروجی هفته (CSV)", "Export week (CSV)"), icon: ic(Download, MI.btnSm), onClick: () => download(exportCsvUrl(studentId, { from, to })) },
      pausedAt
        ? { label: tr("ادامه‌ی همکاری", "Resume"), icon: ic(CirclePlay, MI.btnSm), onClick: () => setRelation("resume") }
        : { label: tr("توقف موقت", "Pause"), icon: ic(CirclePause, MI.btnSm), onClick: () => setRelation("pause") },
      { label: tr("پایان همکاری", "End working together"), icon: ic(LogOut, MI.btnSm), onClick: () => setRelation("end"), danger: true },
    ];

    body = (
      <>
        <div className="mv2-st-kebab">
          <MentorKebabMenu actions={actions} label={tr("کارهای بیشتر", "More actions")} />
        </div>
        <MentorStudentHeader
          name={name} avatarUrl={data.student.avatarUrl} since={data.since}
          rate={rate} rateHidden={rateHidden} activePrograms={activeCount}
          labels={labelNames} pausedAt={pausedAt} mentorshipId={data.mentorshipId}
          nameNode={<GoldenName golden={data.student.golden} staff={data.student.staff}>{name}</GoldenName>}
          onNote={() => { setTab("notes"); setComposeOpen(true); }}
        />

        <SegmentedTabs<Tab> options={tabs()} active={tab} onChange={setTab} ariaLabel={tr("بخش‌های صفحه‌ی شاگرد", "Student page sections")} className="mv2-st-seg" />

        {tab === "week" && (
          <>
            {error && <div className="form-inline-error" role="alert">{error.message}</div>}
            <MentorStudentWeek
              from={from} to={to} routine={data.routine} privacy={data.privacy} loading={loading}
              canPrev={offset > -4} canNext={offset < 0}
              onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)}
            />
            <MentorStudentModules modules={data.modules} />
          </>
        )}

        {tab === "programs" && (
          <MentorSection title={tr("برنامه‌ها", "Programs")} icon={ic(CalendarCheck, MI.section)} count={data.programs.length ? fa(data.programs.length) : undefined} flush>
            {data.programs.length === 0 ? (
              <MentorEmpty>{tr("هنوز برنامه‌ای برای این شاگرد نساختی", "You have not created a program for this student yet")}</MentorEmpty>
            ) : data.programs.map((p) => {
              const href = p.status === "DRAFT" ? `/mentor/programs/${p.id}/edit` : `/mentor-programs/${p.id}`;
              const st = programStatusText(p.status);
              const tracked = p.progress.completed + p.progress.partial + p.progress.missed > 0;
              const showProgress = p.status === "ACTIVE" || p.status === "COMPLETED" || tracked;
              return (
                <MentorRow
                  key={p.id}
                  href={href}
                  lead={p.type === "WORKOUT" ? ic(Dumbbell, MI.row) : ic(CalendarCheck, MI.row)}
                  title={p.title}
                  sub={
                    <>
                      <span>{p.type === "WORKOUT" ? tr("تمرینی", "Workout") : tr("روتین", "Routine")}</span>
                      {p.version > 1 && <span>{tr("ویرایش‌شده", "Edited")}</span>}
                      {(p.startDate || p.endDate) && (
                        <span>
                          {p.startDate ? tr(`از ${fmtDate(p.startDate.slice(0, 10))}`, `From ${fmtDate(p.startDate.slice(0, 10))}`) : ""}
                          {p.startDate && p.endDate ? " " : ""}
                          {p.endDate ? tr(`تا ${fmtDate(p.endDate.slice(0, 10))}`, `until ${fmtDate(p.endDate.slice(0, 10))}`) : ""}
                        </span>
                      )}
                    </>
                  }
                  end={<MentorChip tone={st.tone}>{st.text}</MentorChip>}
                  below={showProgress || p.status !== "DRAFT" ? (
                    <>
                      {showProgress && p.progress.hidden && <span className="mentor-muted">{privateText()}</span>}
                      {showProgress && !p.progress.hidden && (
                        <div className="mentor-progress" style={{ marginTop: 0 }}>
                          <MentorDashBar rate={p.progress.rate} label={tr(`پیشرفت ${p.title}`, `Progress on ${p.title}`)} />
                          <span className="mentor-progress-value">{pct(p.progress.rate)}</span>
                        </div>
                      )}
                      {p.status !== "DRAFT" && (
                        <div className="mentor-program-tools">
                          <MentorProgramTools programId={p.id} title={p.title} studentId={studentId} />
                        </div>
                      )}
                    </>
                  ) : undefined}
                />
              );
            })}
          </MentorSection>
        )}

        {tab === "notes" && (
          manage.data ? (
            <MentorStudentNotes studentId={studentId} initial={manage.data.notes} composeOpen={composeOpen} onComposeClose={() => setComposeOpen(false)} />
          ) : manage.error ? <MentorDashError message={manage.error} onRetry={manage.reload} /> : <LoadingBlock />
        )}

        {tab === "about" && (
          <>
            {manage.data && manage.data.intakeAnswers.length > 0 && (
              <MentorSection title={tr("جواب‌های اول کار", "Answers from the start")}>
                <MentorIntakeAnswers answers={manage.data.intakeAnswers} />
              </MentorSection>
            )}
            <MentorSection title={tr("چیزهایی که با تو به اشتراک گذاشته", "What they share with you")}>
              <MentorStudentPrivacy privacy={data.privacy} modules={data.modules} scheduleHidden={data.routine.scheduleHidden} />
            </MentorSection>
            <MentorSection title={tr("بازخوردهای اخیر", "Recent feedback")} icon={ic(MessageSquareText, MI.section)}>
              {data.recentFeedback.length === 0 ? (
                <MentorEmpty>{tr("هنوز بازخوردی ننوشتی", "You have not written any feedback yet")}</MentorEmpty>
              ) : data.recentFeedback.map((f) => (
                <div key={f.id} className="mentor-feedback">
                  <div className="mentor-feedback-head">
                    {f.itemTitle && <span className="mentor-feedback-ref">{f.itemTitle}</span>}
                    <span>{fmtRelative(f.createdAt)}</span>
                    <span>{f.readAt ? tr("خوانده شد", "Read") : tr("هنوز نخونده", "Not read yet")}</span>
                  </div>
                  <p className="mentor-feedback-body">{f.body}</p>
                </div>
              ))}
            </MentorSection>
          </>
        )}

        {manage.data && (
          <MentorStudentManage
            studentId={studentId} data={manage.data} onChange={manage.setData}
            open={labelsOpen} onClose={() => setLabelsOpen(false)}
          />
        )}
        <MentorStudentRelationControls
          studentId={studentId} mentorshipId={data.mentorshipId} name={name}
          open={relation} onClose={() => setRelation(null)}
          onPaused={(at, reason) => manage.setData((d) => (d ? { ...d, pausedAt: at, pauseReason: reason } : d))}
          onEnded={() => router.push("/mentor/students")}
        />
      </>
    );
  } else body = null;

  return (
    <MentorDashShell title="" back={{ href: "/mentor/students", label: tr("شاگردها", "Students") }}>
      {body}
    </MentorDashShell>
  );
}
