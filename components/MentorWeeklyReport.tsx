"use client";

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
 * گزارش ۷ روزه‌ی هر شاگرد، ساخته‌شده خودکار از پیشرفت برنامه‌ها (نه گزارش
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
  else if (error || !data) body = <MentorDashError message={error?.msg || "گزارش دریافت نشد؛ دوباره تلاش کن"} onRetry={error?.final ? undefined : () => load(offset)} />;
  else if (data.students.length === 0) {
    body = <MentorEmptyState icon={ic(ClipboardCheck, MI.empty)} title="شاگرد فعالی نداری" text="گزارش پس از پذیرش اولین شاگرد ساخته می‌شود" />;
  } else {
    const shown = [...data.students].sort((a, b) => Number(a.progressHidden) - Number(b.progressHidden) || a.rate - b.rate);
    const first = shown.find((s) => !s.progressHidden) ?? shown[0];
    body = (
      <MentorSection
        title="شاگردها" icon={ic(ClipboardCheck, MI.section)} count={fa(shown.length)} flush
        action={<span className="mentor-range">{fmtDate(first.from)} تا {fmtDate(first.to)}</span>}
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
          <span>{ic(EyeOff, MI.chip)} شاگرد نمایش پیشرفت را خاموش کرده است</span>
        ) : noPlan ? (
          <span>در این بازه برنامه‌ی فعالی نداشت</span>
        ) : (
          <>
            <span>{fa(s.completed)} انجام‌شده</span>
            {s.partial > 0 && <span>{fa(s.partial)} ناقص</span>}
            <span>{fa(s.missed + s.unlogged)} انجام‌نشده</span>
            {s.streak > 0 && <span>{ic(Flame, MI.chip)} {fa(s.streak)} روز کامل پیاپی</span>}
            <span>آخرین انجام {s.lastDoneDate ? fmtDate(s.lastDoneDate) : "ندارد"}</span>
          </>
        )
      }
      end={
        s.progressHidden || noPlan ? (
          s.paused ? <MentorChip tone="neutral" icon={ic(PauseCircle, MI.chip)}>متوقف</MentorChip> : undefined
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
      <MentorChip key="idle" tone="warn" icon={ic(AlertCircle, MI.chip)}>{fa(s.idleDays)} روز برنامه‌دار بدون انجام</MentorChip>,
    );
  }
  if (s.paused && !(s.progressHidden || s.scheduled === 0)) {
    lines.push(<MentorChip key="paused" tone="neutral" icon={ic(PauseCircle, MI.chip)}>رابطه متوقف است</MentorChip>);
  }
  for (const p of s.scheduledPrograms.slice(0, 2)) {
    lines.push(
      <MentorChip key={p.id} tone="info" icon={ic(CalendarClock, MI.chip)} title={`«${p.title}» پس از پذیرش در این روز خودکار فعال می‌شود`}>
        شروع {fmtDate(p.startDate)}
      </MentorChip>,
    );
  }
  const missed = !s.progressHidden && s.missedItems.length > 0
    ? s.missedItems.map((m) => `${m.title} (${fa(m.count)})`).join("، ")
    : null;

  return (
    <div className="mentor-report-below">
      {lines.length > 0 && <div className="mentor-chips">{lines}</div>}
      {missed && <p className="mentor-report-line"><b>بیشترین انجام‌نشده:</b> {missed}</p>}
      <p className="mentor-report-line">
        {s.lastMessageAt ? <>آخرین پیام شاگرد {fmtRelative(s.lastMessageAt)}</> : "شاگرد هنوز پیامی نفرستاده است"}
      </p>
      {!s.progressHidden && (
        <div className="mentor-btn-group is-end">
          <a href={exportCsvUrl(s.studentId)} download className="account-outline-btn mentor-btn is-sm">
            {ic(Download, MI.btnSm)} خروجی 30 روز (CSV)
          </a>
        </div>
      )}
    </div>
  );
}
