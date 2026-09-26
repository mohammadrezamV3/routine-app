"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardList, MessageCircle, MessagesSquare, Plus, UserX } from "lucide-react";
import { AccountBlock } from "@/components/AccountUI";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorDashBar, MentorDashEmpty, MentorDashError, MentorDashShell, fa, mentorApi, pct } from "@/components/MentorDashKit";
import { MentorStudentPrivacy } from "@/components/MentorStudentPrivacy";
import { MentorStudentWeek } from "@/components/MentorStudentWeek";
import { MentorStudentModules } from "@/components/MentorStudentModules";
import { fmtDate, fmtRelative } from "@/lib/mentorFormat";
import { isoLocal } from "@/lib/jalali";
import { publicUserName } from "@/lib/mentorTypes";
import type { StudentView } from "@/components/MentorStudentTypes";

function weekRange(offset: number): { from: string; to: string } {
  const to = new Date();
  to.setHours(12, 0, 0, 0);
  to.setDate(to.getDate() + offset * 7);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: isoLocal(from), to: isoLocal(to) };
}

function StudentContent({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<StudentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (off: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    const { from, to } = weekRange(off);
    const r = await mentorApi<StudentView>(`/api/mentor/students/${encodeURIComponent(studentId)}?from=${from}&to=${to}`, { signal: ctrl.signal });
    if (r.status === -1) return; // درخواستِ قدیمی لغو شد
    setLoading(false);
    if (!r.ok) { setError({ message: r.error, status: r.status }); return; }
    setData(r.data);
  }, [studentId]);

  useEffect(() => { load(offset); }, [load, offset]);
  useEffect(() => () => abortRef.current?.abort(), []);

  if (loading && !data) return <LoadingBlock />;
  if (error && !data) {
    if (error.status === 404) {
      return (
        <div className="trade-surface rp-empty">
          <span className="rp-empty-icon"><UserX size={24} /></span>
          <h2>دسترسی نداری یا رابطه فعال نیست</h2>
          <p>فقط اطلاعات شاگردهایی رو می‌بینی که رابطه‌ی منتوری‌شون با تو فعاله. شاید رابطه تموم شده یا آدرس اشتباهه.</p>
          <Link href="/mentor" className="mt-4 text-[12.5px] font-bold text-dash-green no-underline">بازگشت به پنل منتور</Link>
        </div>
      );
    }
    return <MentorDashError message={error.message} onRetry={() => load(offset)} />;
  }
  if (!data) return null;

  const name = publicUserName(data.student);
  const { from, to } = weekRange(offset);

  return (
    <div>
      {/* ── سرصفحه‌ی شاگرد ── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <MentorUserAvatar avatarUrl={data.student.avatarUrl} name={name} size={54} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-extrabold text-dash-text">{name}</div>
          <div className="text-[11.5px] text-dash-muted">
            {data.student.username && <span dir="ltr">@{data.student.username}</span>}
            {data.since && <> · شاگرد از {fmtDate(data.since)}</>}
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <Link href={`/mentorship/${data.mentorshipId}`} className="flex items-center gap-1 px-2 py-1.5 text-[12.5px] font-bold text-dash-green no-underline">
            <MessageCircle size={15} /> چت
          </Link>
          <button type="button" className="account-outline-btn" onClick={() => router.push(`/mentor/programs/new?mentorshipId=${encodeURIComponent(data.mentorshipId)}`)}>
            <Plus size={14} /> برنامه‌ی جدید
          </button>
        </div>
      </div>

      {error && <div className="form-inline-error mb-3">{error.message}</div>}

      <MentorStudentPrivacy privacy={data.privacy} modules={data.modules} scheduleHidden={data.routine.scheduleHidden} />

      {/* ── هفته ── */}
      <AccountBlock
        title="برنامه‌ی زمانی"
        icon={<ClipboardList size={15} />}
        index={1}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" className="account-outline-btn muted" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setOffset((o) => o - 1)} disabled={loading || offset <= -4} aria-label="هفته‌ی قبل">
            <ChevronRight size={14} /> قبل
          </button>
          <span className="flex items-center gap-1.5 text-[11.5px] text-dash-muted">
            {loading && <Spinner size={12} />}
            {fmtDate(from)} تا {fmtDate(to)}
          </span>
          <button type="button" className="account-outline-btn muted" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setOffset((o) => o + 1)} disabled={loading || offset >= 0} aria-label="هفته‌ی بعد">
            بعد <ChevronLeft size={14} />
          </button>
        </div>
        <MentorStudentWeek from={from} to={to} routine={data.routine} privacy={data.privacy} />
      </AccountBlock>

      <MentorStudentModules modules={data.modules} />

      {/* ── برنامه‌های من برای این شاگرد ── */}
      <AccountBlock title="برنامه‌هایی که برای این شاگرد ساختی" icon={<ClipboardList size={15} />} index={3}>
        {data.programs.length === 0 ? (
          <MentorDashEmpty>هنوز برنامه‌ای نساختی. با «برنامه‌ی جدید» شروع کن.</MentorDashEmpty>
        ) : data.programs.map((p) => {
          const href = p.status === "DRAFT" ? `/mentor/programs/${p.id}/edit` : `/mentor-programs/${p.id}`;
          const tracked = p.progress.completed + p.progress.partial + p.progress.missed > 0;
          return (
            <Link key={p.id} href={href} className="block border-b border-dash-border py-3 text-dash-text no-underline last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{p.title}</span>
                <ProgramStatusBadge status={p.status} />
              </div>
              <div className="mt-1 text-[11px] text-dash-muted">
                {p.type === "WORKOUT" ? "تمرینی" : "روتین"}
                {p.version > 1 ? ` · نسخه ${fa(p.version)}` : ""}
                {p.startDate ? ` · از ${fmtDate(p.startDate.slice(0, 10))}` : ""}
                {p.endDate ? ` تا ${fmtDate(p.endDate.slice(0, 10))}` : ""}
                {` · به‌روزرسانی ${fmtRelative(p.updatedAt)}`}
              </div>
              {(p.status === "ACTIVE" || p.status === "COMPLETED" || tracked) && (
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="flex-1"><MentorDashBar rate={p.progress.rate} /></div>
                  <span className="shrink-0 text-[11.5px] font-bold text-dash-green">{pct(p.progress.rate)}</span>
                </div>
              )}
            </Link>
          );
        })}
      </AccountBlock>

      {/* ── بازخوردهای اخیر ── */}
      <AccountBlock title="بازخوردهای اخیر تو" icon={<MessagesSquare size={15} />} index={4}>
        {data.recentFeedback.length === 0 ? (
          <MentorDashEmpty>هنوز بازخوردی ننوشتی. از صفحه‌ی هر برنامه می‌تونی روی آیتم‌ها یا ثبت‌های شاگرد بازخورد بدی.</MentorDashEmpty>
        ) : data.recentFeedback.map((f) => (
          <div key={f.id} className="border-b border-dash-border py-3 last:border-b-0">
            {f.itemTitle && <div className="mb-1 text-[11px] font-bold text-dash-green">{f.itemTitle}</div>}
            <p className="m-0 whitespace-pre-line text-[12.5px] leading-6 text-dash-text">{f.body}</p>
            <div className="mt-1 text-[10.5px] text-dash-muted">
              {fmtRelative(f.createdAt)} · {f.readAt ? "خوانده شد" : "هنوز خوانده نشده"}
            </div>
          </div>
        ))}
      </AccountBlock>
    </div>
  );
}

export default function MentorStudentPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = typeof params?.studentId === "string" ? params.studentId : "";
  return (
    <MentorDashShell title="شاگرد" back={{ href: "/mentor", label: "پنل منتور" }}>
      {studentId ? <StudentContent studentId={studentId} /> : <LoadingBlock />}
    </MentorDashShell>
  );
}
