"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, Dumbbell, Eye, EyeOff, MessageCircle, MessageSquareText, ShieldCheck, UserRound,
} from "lucide-react";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { MentorDashBar, MentorDashError, MentorDashShell, fa, mentorApi, pct } from "@/components/MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmpty, MentorEmptyState, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorStudentWeek } from "@/components/MentorStudentWeek";
import { MentorStudentModules } from "@/components/MentorStudentModules";
import { MentorStudentManage, useStudentManage } from "@/components/MentorStudentManage";
import { MentorStudentRelationControls } from "@/components/MentorStudentRelationControls";
import { MentorProgramTools } from "@/components/MentorProgramTools";
import { fmtDate, fmtRelative } from "@/lib/mentorFormat";
import { isoLocal } from "@/lib/jalali";
import { publicUserName } from "@/lib/mentorTypes";
import type { StudentView } from "@/components/MentorStudentTypes";

const ic = (Icon: typeof Eye, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

function weekRange(offset: number): { from: string; to: string } {
  const to = new Date();
  to.setHours(12, 0, 0, 0);
  to.setDate(to.getDate() + offset * 7);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: isoLocal(from), to: isoLocal(to) };
}

/**
 * آنچه منتور از این شاگرد می‌بیند؛ دو ردیف چیپ (دیده می‌شود / مخفی).
 * تنظیمات دست خود شاگرد است و سرور فقط همین‌ها را می‌فرستد.
 */
function PrivacySummary({ data }: { data: StudentView }) {
  const p = data.privacy;
  const programs = p.shareAllPrograms ? "همه‌ی برنامه‌ها" : p.sharedCount > 0 ? `${fa(p.sharedCount)} برنامه` : "برنامه‌های روتین";
  const programsOn = p.shareAllPrograms || p.sharedCount > 0;
  const items: { label: string; on: boolean }[] = [
    { label: programs, on: programsOn },
    { label: "زمان‌بندی", on: !(data.routine.scheduleHidden || !p.showSchedule) },
    { label: "نام برنامه‌ها", on: p.showProgramName },
    { label: "عنوان کارها", on: p.showTaskName },
    { label: "جزئیات کارها", on: p.showTaskDetails },
    { label: "پیشرفت روزانه", on: p.showProgress },
    { label: "بدنسازی", on: data.modules.exercise !== null },
    { label: "کالری", on: data.modules.calorie !== null },
  ];
  const visible = items.filter((i) => i.on);
  const hidden = items.filter((i) => !i.on);
  return (
    <MentorSection
      title="آنچه می‌بینی" icon={ic(ShieldCheck, MI.section)}
    >
      <div className="mentor-form" style={{ gap: "var(--m-2)" }}>
        {visible.length > 0 && (
          <div className="mentor-preview-row">
            <span className="mentor-preview-tag">دیده می‌شود</span>
            <span className="mentor-chips">
              {visible.map((i) => <MentorChip key={i.label} tone="accent" icon={ic(Eye, MI.chip)}>{i.label}</MentorChip>)}
            </span>
          </div>
        )}
        {hidden.length > 0 && (
          <div className="mentor-preview-row">
            <span className="mentor-preview-tag">مخفی</span>
            <span className="mentor-chips">
              {hidden.map((i) => <MentorChip key={i.label} tone="neutral" icon={ic(EyeOff, MI.chip)}>{i.label}</MentorChip>)}
            </span>
          </div>
        )}
      </div>
    </MentorSection>
  );
}

export default function MentorStudentPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = typeof params?.studentId === "string" ? params.studentId : "";
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<StudentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // برچسب، یادداشت، جواب‌های پذیرش و توقف — داده‌ی خصوصیِ منتور
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
  }, [studentId]);

  useEffect(() => { load(offset); }, [load, offset]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const name = data ? publicUserName(data.student) : "شاگرد";
  const titleAction = data ? (
    <button
      type="button" className="trade-title-add-btn"
      onClick={() => router.push(`/mentor/programs/new?mentorshipId=${encodeURIComponent(data.mentorshipId)}`)}
    >
      + برنامه‌ی جدید
    </button>
  ) : undefined;

  let body: React.ReactNode;
  if (!studentId || (loading && !data)) body = <LoadingBlock />;
  else if (error && !data) {
    body = error.status === 404 || error.status === 403 ? (
      <MentorEmptyState
        icon={ic(UserRound, MI.empty)}
        title="به اطلاعات این شاگرد دسترسی نداری"
        text="فقط شاگردهایی که رابطه‌ی فعال با تو دارند اینجا نمایش داده می‌شوند"
      />
    ) : (
      <MentorDashError message={error.message} onRetry={() => load(offset)} />
    );
  } else if (data) {
    const { from, to } = weekRange(offset);
    body = (
      <>
        <MentorSection flush>
          <MentorRow
            href={`/mentorship/${data.mentorshipId}`}
            lead={ic(MessageCircle, MI.row)}
            title="گفت‌وگو"
            sub={<><span>پیام‌ها و وضعیت رابطه</span>{data.since && <span>شاگرد از {fmtDate(data.since)}</span>}</>}
          />
        </MentorSection>

        {manage.data && (
          <MentorStudentManage studentId={studentId} data={manage.data} onChange={manage.setData} />
        )}

        <PrivacySummary data={data} />

        <MentorSection title="برنامه‌ی زمانی" icon={ic(CalendarCheck, MI.section)}>
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: "var(--m-2)" }}>
            <button
              type="button" className="trade-icon-btn" aria-label="هفته‌ی قبل"
              onClick={() => setOffset((o) => o - 1)} disabled={loading || offset <= -4}
            >
              <ChevronRight size={MI.row} strokeWidth={MI_STROKE} />
            </button>
            <span className="mentor-row-sub" aria-live="polite">
              {loading ? <Spinner size={14} /> : <span>{fmtDate(from)} تا {fmtDate(to)}</span>}
            </span>
            <button
              type="button" className="trade-icon-btn" aria-label="هفته‌ی بعد"
              onClick={() => setOffset((o) => o + 1)} disabled={loading || offset >= 0}
            >
              <ChevronLeft size={MI.row} strokeWidth={MI_STROKE} />
            </button>
          </div>
          {error && <div className="form-inline-error" role="alert" style={{ marginTop: 0, marginBottom: "var(--m-2)" }}>{error.message}</div>}
          <MentorStudentWeek from={from} to={to} routine={data.routine} privacy={data.privacy} />
        </MentorSection>

        <MentorStudentModules modules={data.modules} />

        <MentorSection title="برنامه‌ها" icon={ic(ClipboardList, MI.section)} count={data.programs.length ? fa(data.programs.length) : undefined} flush>
          {data.programs.length === 0 ? (
            <MentorEmpty>هنوز برنامه‌ای برای این شاگرد نساخته‌ای</MentorEmpty>
          ) : data.programs.map((p) => {
            const href = p.status === "DRAFT" ? `/mentor/programs/${p.id}/edit` : `/mentor-programs/${p.id}`;
            const tracked = p.progress.completed + p.progress.partial + p.progress.missed > 0;
            const showProgress = p.status === "ACTIVE" || p.status === "COMPLETED" || tracked;
            const sub = (
              <>
                <span>{p.type === "WORKOUT" ? "تمرینی" : "روتین"}</span>
                {p.version > 1 && <span>نسخه‌ی {fa(p.version)}</span>}
                {(p.startDate || p.endDate) && (
                  <span>
                    {p.startDate ? `از ${fmtDate(p.startDate.slice(0, 10))}` : ""}
                    {p.startDate && p.endDate ? " " : ""}
                    {p.endDate ? `تا ${fmtDate(p.endDate.slice(0, 10))}` : ""}
                  </span>
                )}
                <span>به‌روزرسانی {fmtRelative(p.updatedAt)}</span>
              </>
            );
            return (
              <MentorRow
                key={p.id}
                href={href}
                lead={p.type === "WORKOUT" ? ic(Dumbbell, MI.row) : ic(CalendarCheck, MI.row)}
                title={p.title}
                sub={sub}
                end={<ProgramStatusBadge status={p.status} />}
                below={showProgress || p.status !== "DRAFT" ? (
                  <>
                    {showProgress && p.progress.hidden && (
                      <span className="mentor-muted">پیشرفت را شاگرد برای تو پنهان کرده است</span>
                    )}
                    {showProgress && !p.progress.hidden && (
                      <div className="mentor-progress" style={{ marginTop: 0 }}>
                        <MentorDashBar rate={p.progress.rate} />
                        <span className="mentor-progress-value">{pct(p.progress.rate)}</span>
                      </div>
                    )}
                    {/* ابزارِ برنامه (قالب/کپی) فقط برای برنامه‌ی ارسال‌شده — agent C */}
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

        <MentorSection title="بازخوردهای اخیر" icon={ic(MessageSquareText, MI.section)}>
          {data.recentFeedback.length === 0 ? (
            <MentorEmpty>هنوز بازخوردی ننوشته‌ای</MentorEmpty>
          ) : data.recentFeedback.map((f) => (
            <div key={f.id} className="mentor-feedback">
              <div className="mentor-feedback-head">
                {f.itemTitle && <span className="mentor-feedback-ref">{f.itemTitle}</span>}
                <span>{fmtRelative(f.createdAt)}</span>
                <span>{f.readAt ? "خوانده شد" : "خوانده نشده"}</span>
              </div>
              <p className="mentor-feedback-body">{f.body}</p>
            </div>
          ))}
        </MentorSection>

        {manage.data && (
          <MentorStudentRelationControls
            studentId={studentId}
            mentorshipId={data.mentorshipId}
            name={name}
            pausedAt={manage.data.pausedAt}
            pauseReason={manage.data.pauseReason}
            onPaused={(pausedAt, pauseReason) => manage.setData((d) => (d ? { ...d, pausedAt, pauseReason } : d))}
            onEnded={() => router.push("/mentor")}
          />
        )}
      </>
    );
  } else body = null;

  return (
    <MentorDashShell title={name} back={{ href: "/mentor/students", label: "شاگردها" }} titleAction={titleAction}>
      {body}
    </MentorDashShell>
  );
}
