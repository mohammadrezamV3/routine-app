"use client";

import { MentorList, MentorListItem } from "./MentorMotion";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Search, SearchX, Users } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { fa, normRate, pct } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorEmptyState } from "./MentorUI";
import { MentorAvatarRing } from "./MentorAvatarRing";
import { MentorWeeklyReport } from "./MentorWeeklyReport";
import { studentStatusText } from "@/lib/mentorStatus";
import { publicUserName } from "@/lib/mentorTypes";
import type { StudentIndexResponse, StudentIndexRow } from "@/lib/mentorTypes";
import { GoldenName } from "@/components/GoldenName";

const ic = (Icon: typeof Users, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type Sort = "name" | "adherence" | "activity" | "joined";
const SORTS: { value: Sort; label: string }[] = [
  { value: "name", label: "نام" },
  { value: "adherence", label: "پیشرفت" },
  { value: "activity", label: "فعالیت" },
  { value: "joined", label: "شروع" },
];
type View = "all" | "attention" | "paused";
type Week = "0" | "1" | "2";
const WEEKS: { value: Week; label: string }[] = [
  { value: "0", label: "این هفته" },
  { value: "1", label: "هفته‌ی قبل" },
  { value: "2", label: "دو هفته قبل" },
];

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : -Infinity);
const DAY_MS = 86_400_000;

/** چند روز از آخرین فعالیت گذشته؛ null = هیچ فعالیتی ثبت نشده */
function idleDaysOf(r: StudentIndexRow): number | null {
  if (!r.lastActivityAt) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(r.lastActivityAt).getTime()) / DAY_MS));
}

/** نیاز به توجه: بی‌خبر چند روزه یا پیشرفت کم؛ شاگرد متوقف جدا حساب می‌شود */
function needsAttention(r: StudentIndexRow): boolean {
  if (r.pausedAt) return false;
  const idle = idleDaysOf(r);
  if (idle !== null && idle >= 2) return true;
  return r.adherence !== null && normRate(r.adherence) < 0.5;
}

function sortRows(rows: StudentIndexRow[], sort: Sort): StudentIndexRow[] {
  const out = rows.slice();
  const name = (r: StudentIndexRow) => publicUserName(r.student);
  switch (sort) {
    case "name": return out.sort((a, b) => name(a).localeCompare(name(b), "fa"));
    // پیشرفت کم‌تر اول: شاگردی که عقب مانده زودتر دیده شود؛ بدون ثبت در انتها
    case "adherence": return out.sort((a, b) => (a.adherence ?? Infinity) - (b.adherence ?? Infinity) || name(a).localeCompare(name(b), "fa"));
    case "activity": return out.sort((a, b) => time(b.lastActivityAt) - time(a.lastActivityAt));
    case "joined": return out.sort((a, b) => time(b.startedAt) - time(a.startedAt));
  }
}

/**
 * /mentor/students: عنوان، جست‌وجو و دعوت، نمای (همه، نیاز به توجه، متوقف)،
 * چیپ‌های برچسب، مرتب‌سازی، و انتخاب هفته. هفته‌ی قبل یا حالت گزارش،
 * گزارش هفتگی (و خروجی CSV) را به‌جای فهرست نشان می‌دهد.
 */
export function MentorStudentsList({ data, initialReport = false }: { data: StudentIndexResponse; initialReport?: boolean }) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("all");
  const [label, setLabel] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("name");
  const [week, setWeek] = useState<Week>("0");
  const [report, setReport] = useState(initialReport);
  const labelName = useMemo(() => new Map(data.labels.map((l) => [l.id, l.name])), [data.labels]);

  const attention = useMemo(() => data.students.filter(needsAttention).length, [data.students]);
  const paused = useMemo(() => data.students.filter((r) => r.pausedAt).length, [data.students]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = data.students.filter((r) => {
      if (view === "paused" && !r.pausedAt) return false;
      if (view === "attention" && !needsAttention(r)) return false;
      if (label && !r.labelIds.includes(label)) return false;
      if (!needle) return true;
      const hay = `${publicUserName(r.student)} ${r.student.username ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
    return sortRows(filtered, sort);
  }, [data.students, q, view, label, sort]);

  const showReport = report || week !== "0";

  return (
    <div className="mv2-st-wrap">
      <div className="mv2-st-titlebar">
        <h1 className="mv2-st-title">شاگردها</h1>
        <span className="mv2-st-count" aria-label={`${fa(data.students.length)} شاگرد`}>{fa(data.students.length)}</span>
        {data.capacity != null && <span className="mv2-st-cap">از {fa(data.capacity)} جا</span>}
      </div>

      {data.students.length === 0 ? (
        <>
          <MentorEmptyState icon={ic(Users, MI.empty)} title="هنوز شاگرد فعالی نداری" text="شاگردهایی که درخواستشون رو قبول کنی یا دعوتت رو بپذیرن اینجا میان" />
          <div className="mv2-st-center">
            <Link href="/mentor?invite=1" className="trade-primary-btn mentor-btn">{ic(Plus, MI.btn)} دعوت شاگرد</Link>
          </div>
        </>
      ) : (
        <>
          <div className="mv2-st-toolbar">
            <label className="mentor-search mv2-st-search">
              {ic(Search, MI.btnSm)}
              <input
                type="search" className="wsearch-newform-name trade-glass-field" value={q} aria-label="جست‌وجوی شاگرد"
                placeholder="جست‌وجوی نام" onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <Link href="/mentor?invite=1" className="trade-primary-btn mentor-btn mv2-st-invite">{ic(Plus, MI.btn)} دعوت</Link>
          </div>

          <SegmentedTabs<Week> options={WEEKS} active={week} onChange={(w) => { setWeek(w); if (w === "0") setReport(false); }} ariaLabel="هفته" className="mv2-st-seg" />

          {showReport ? (
            <MentorWeeklyReport offset={Number(week) as 0 | 1 | 2} />
          ) : (
            <>
              <SegmentedTabs<View>
                options={[
                  { value: "all", label: "همه" },
                  { value: "attention", label: attention > 0 ? `نیاز به توجه (${fa(attention)})` : "نیاز به توجه" },
                  { value: "paused", label: paused > 0 ? `متوقف (${fa(paused)})` : "متوقف" },
                ]}
                active={view} onChange={setView} ariaLabel="نمایش شاگردها" className="mv2-st-seg"
              />

              <div className="mv2-st-filters">
                {data.labels.length > 0 && (
                  <div className="mv2-st-labels" role="group" aria-label="فیلتر برچسب">
                    {data.labels.map((l) => {
                      const on = label === l.id;
                      return (
                        <button key={l.id} type="button" className={`trade-choice${on ? " active" : ""}`} aria-pressed={on} onClick={() => setLabel(on ? null : l.id)}>
                          {l.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <label className="mv2-st-sort">
                  <span>مرتب‌سازی</span>
                  <select className="wsearch-newform-name trade-glass-field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>

              {rows.length === 0 ? (
                <MentorEmpty icon={ic(SearchX, MI.row)}>
                  {view === "attention" ? "الان کسی نیاز به توجه نداره" : "شاگردی با این فیلتر پیدا نشد"}
                </MentorEmpty>
              ) : (
                <MentorList className="mv2-st-list">
                  {rows.map((r) => {
                    const name = publicUserName(r.student);
                    const st = studentStatusText({ rate: r.adherence, idleDays: idleDaysOf(r), paused: !!r.pausedAt });
                    const labels = r.labelIds.map((id) => labelName.get(id)).filter(Boolean) as string[];
                    const progress = r.adherence === null ? null : normRate(r.adherence);
                    return (
                      <MentorListItem key={r.mentorshipId}>
                        <Link href={`/mentor/students/${r.student.id}`} prefetch={false} className="mv2-st-row">
                          <MentorAvatarRing name={name} avatarUrl={r.student.avatarUrl} progress={progress} size={56} />
                          <span className="mv2-st-body">
                            <span className="mv2-st-name"><GoldenName golden={r.student.golden} staff={r.student.staff}>{name}</GoldenName></span>
                            <span className={`mv2-st-status mv2-tone-${st.tone}`}>
                              <span className="mv2-st-dot" aria-hidden />
                              <span>{st.text}</span>
                              {r.adherence !== null && <span className="mv2-st-pct">{pct(r.adherence)} این هفته</span>}
                            </span>
                            {labels.length > 0 && <span className="mv2-st-rowlabels">{labels.join("، ")}</span>}
                          </span>
                          {r.unread > 0 && <span className="mentor-unread" aria-label={`${fa(r.unread)} پیام خوانده‌نشده`}>{fa(r.unread)}</span>}
                          <ChevronLeft size={MI.row} strokeWidth={MI_STROKE} className="mv2-st-chev" aria-hidden />
                        </Link>
                      </MentorListItem>
                    );
                  })}
                </MentorList>
              )}

              <div className="mv2-st-center">
                <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setReport(true)}>گزارش کامل این هفته</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
