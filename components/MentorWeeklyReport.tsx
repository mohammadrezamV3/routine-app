"use client";

import { tr } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarClock, ClipboardCheck, Download, EyeOff, Flame, PauseCircle } from "lucide-react";
import { MentorDashBar, MentorDashError, fa, mentorApi, pct } from "@/components/MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmptyState, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorSwap } from "@/components/MentorMotion";
import { LoadingBlock } from "@/components/Spinner";
import { fmtDate, fmtRelative } from "@/lib/mentorFormat";
import { exportCsvUrl, type WeeklyReport, type WeeklyStudentReport } from "@/lib/mentorToolsTypes";

const ic = (Icon: typeof Flame, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * گزارش 7 روزه‌ی هر شاگرد، ساخته‌شده خودکار از پیشرفت برنامه‌ها (نه گزارش
 * دستی شاگرد). فقط بدنه؛ انتخاب هفته و ظرف صفحه با والد است.
 * offset: 0 = 7 روز اخیر، 1 = هفته‌ی قبل، 2 = دو هفته قبل
 */
export function MentorWeeklyReport({ offset = 0 }: { offset?: 0 | 1 | 2 }) {
  const [data, setData] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; final: boolean } | null>(null);

  const load = useCallback(async (o: number) => {
    setLoading(true);
    setError(null);
    const r = await mentorApi<WeeklyReport>(`/api/mentor/reports?offset=${o}`);
    setLoading(false);
    if (!r.ok) { setError({ msg: r.error, final: r.status === 403 }); return; }
    setData(r.data);
  }, []);

  useEffect(() => { load(offset); }, [load, offset]);

  let body: React.ReactNode;
  if (loading) body = <LoadingBlock />;
  else if (error || !data) body = <MentorDashError message={error?.msg || tr("گزارش دریافت نشد؛ دوباره تلاش کن", "Could not load the report. Try again.")} onRetry={error?.final ? undefined : () => load(offset)} />;
  else if (data.students.length === 0) {
    body = <MentorEmptyState icon={ic(ClipboardCheck, MI.empty)} title={tr("شاگرد فعالی نداری", "You have no active students")} text={tr("گزارش پس از پذیرش اولین شاگرد ساخته می‌شود", "The report appears after you accept your first student")} />;
  } else {
    const shown = [...data.students].sort((a, b) => Number(a.progressHidden) - Number(b.progressHidden) || a.rate - b.rate);
    const first = shown.find((s) => !s.progressHidden) ?? shown[0];
    body = (
      <MentorSection
        flush
        action={<span className="mentor-range">{tr(`${fmtDate(first.from)} تا ${fmtDate(first.to)}`, `${fmtDate(first.from)} to ${fmtDate(first.to)}`)}</span>}
      >
        {shown.map((s) => <StudentReportRow key={s.studentId} s={s} current={data.offset === 0} />)}
      </MentorSection>
    );
  }

  return <MentorSwap swapKey={loading ? "loading" : `w${offset}`}>{body}</MentorSwap>;
}

function StudentReportRow({ s, current }: { s: WeeklyStudentReport; current: boolean }) {
  const noPlan = !s.progressHidden && s.scheduled === 0;
  return (
    <MentorRow
      href={`/mentor/students/${s.studentId}`}
      lead={<MentorUserAvatar avatarUrl={s.avatarUrl} name={s.name} size={36} />}
      title={s.name}
      sub={
        s.progressHidden ? (
          <span>{ic(EyeOff, MI.chip)} {tr("این بخش رو شاگرد خصوصی نگه داشته", "The student keeps this section private")}</span>
        ) : noPlan ? (
          <span>{tr("در این بازه برنامه‌ی فعالی نداشت", "No active program in this period")}</span>
        ) : (
          <>
            <span>{tr(`${fa(s.completed)} انجام‌شده`, `${fa(s.completed)} done`)}</span>
            {s.partial > 0 && <span>{tr(`${fa(s.partial)} ناقص`, `${fa(s.partial)} partial`)}</span>}
            <span>{tr(`${fa(s.missed + s.unlogged)} انجام‌نشده`, `${fa(s.missed + s.unlogged)} not done`)}</span>
            {s.streak > 0 && <span>{ic(Flame, MI.chip)} {tr(`${fa(s.streak)} روز کامل پیاپی`, `${fa(s.streak)} ${s.streak === 1 ? "full day" : "full days"} in a row`)}</span>}
            <span>{tr("آخرین انجام", "Last done")} {s.lastDoneDate ? fmtDate(s.lastDoneDate) : tr("ندارد", "never")}</span>
          </>
        )
      }
      end={
        s.progressHidden || noPlan ? (
          s.paused ? <MentorChip tone="neutral" icon={ic(PauseCircle, MI.chip)}>{tr("متوقف", "Paused")}</MentorChip> : undefined
        ) : (
          <span className="mentor-progress" style={{ marginTop: 0, width: 96 }}>
            <MentorDashBar rate={s.rate} />
            <span className="mentor-progress-value">{pct(s.rate)}</span>
          </span>
        )
      }
      below={<StudentReportDetails s={s} current={current} />}
    />
  );
}

function StudentReportDetails({ s, current }: { s: WeeklyStudentReport; current: boolean }) {
  const lines: React.ReactNode[] = [];
  if (!s.progressHidden && current && s.idleDays >= 2) {
    lines.push(
      <MentorChip key="idle" tone="warn" icon={ic(AlertCircle, MI.chip)}>{tr(`${fa(s.idleDays)} روز برنامه‌دار بدون انجام`, `${fa(s.idleDays)} planned ${s.idleDays === 1 ? "day" : "days"} with nothing done`)}</MentorChip>,
    );
  }
  if (s.paused && !(s.progressHidden || s.scheduled === 0)) {
    lines.push(<MentorChip key="paused" tone="neutral" icon={ic(PauseCircle, MI.chip)}>{tr("همکاری متوقف است", "Paused")}</MentorChip>);
  }
  for (const p of s.scheduledPrograms.slice(0, 2)) {
    lines.push(
      <MentorChip key={p.id} tone="info" icon={ic(CalendarClock, MI.chip)} title={tr(`«${p.title}» پس از پذیرش در این روز خودکار فعال می‌شود`, `"${p.title}" starts automatically on this day once accepted`)}>
        {tr("شروع", "Starts")} {fmtDate(p.startDate)}
      </MentorChip>,
    );
  }
  const missed = !s.progressHidden && s.missedItems.length > 0
    ? s.missedItems.map((m) => `${m.title} (${fa(m.count)})`).join(tr("، ", ", "))
    : null;

  return (
    <div className="mentor-report-below">
      {lines.length > 0 && <div className="mentor-chips">{lines}</div>}
      {missed && <p className="mentor-report-line"><b>{tr("بیشترین انجام‌نشده:", "Most missed:")}</b> {missed}</p>}
      <p className="mentor-report-line">
        {s.lastMessageAt ? <>{tr("آخرین پیام شاگرد", "Student's last message")} {fmtRelative(s.lastMessageAt)}</> : tr("شاگرد هنوز پیامی نفرستاده است", "The student has not sent a message yet")}
      </p>
      {!s.progressHidden && (
        <div className="mentor-btn-group is-end">
          <a href={exportCsvUrl(s.studentId)} download className="account-outline-btn mentor-btn is-sm">
            {ic(Download, MI.btnSm)} {tr("خروجی 30 روز (CSV)", "Export 30 days (CSV)")}
          </a>
        </div>
      )}
    </div>
  );
}
