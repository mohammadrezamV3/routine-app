"use client";

import { MentorList, MentorListItem } from "./MentorMotion";
import { useMemo, useState } from "react";
import { CircleSlash, Search, SearchX, Users } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { fa, pct } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmpty, MentorEmptyState, MentorRow, MentorSection } from "./MentorUI";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { fmtDate, fmtRelative } from "@/lib/mentorFormat";
import { publicUserName } from "@/lib/mentorTypes";
import type { StudentIndexResponse, StudentIndexRow } from "@/lib/mentorTypes";
import { GoldenName } from "@/components/GoldenName";

const ic = (Icon: typeof Users, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type Sort = "name" | "adherence" | "activity" | "joined";
const SORTS: { value: Sort; label: string }[] = [
  { value: "name", label: "نام" },
  { value: "adherence", label: "پایبندی" },
  { value: "activity", label: "فعالیت" },
  { value: "joined", label: "شروع" },
];
const FILTER_ALL = "__all";
const FILTER_PAUSED = "__paused";

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : -Infinity);

function sortRows(rows: StudentIndexRow[], sort: Sort): StudentIndexRow[] {
  const out = rows.slice();
  const name = (r: StudentIndexRow) => publicUserName(r.student);
  switch (sort) {
    case "name": return out.sort((a, b) => name(a).localeCompare(name(b), "fa"));
    // پایبندی کم‌تر اول — شاگردی که عقب مانده زودتر دیده شود؛ بدون ثبت در انتها
    case "adherence": return out.sort((a, b) => (a.adherence ?? Infinity) - (b.adherence ?? Infinity) || name(a).localeCompare(name(b), "fa"));
    case "activity": return out.sort((a, b) => time(b.lastActivityAt) - time(a.lastActivityAt));
    case "joined": return out.sort((a, b) => time(b.startedAt) - time(a.startedAt));
  }
}

/** فهرست کامل شاگردهای فعال با جست‌وجو، فیلتر برچسب/توقف و مرتب‌سازی */
export function MentorStudentsList({ data }: { data: StudentIndexResponse }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [sort, setSort] = useState<Sort>("name");
  const labelName = useMemo(() => new Map(data.labels.map((l) => [l.id, l.name])), [data.labels]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = data.students.filter((r) => {
      if (filter === FILTER_PAUSED && !r.pausedAt) return false;
      if (filter !== FILTER_ALL && filter !== FILTER_PAUSED && !r.labelIds.includes(filter)) return false;
      if (!needle) return true;
      const hay = `${publicUserName(r.student)} ${r.student.username ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
    return sortRows(filtered, sort);
  }, [data.students, q, filter, sort]);

  if (data.students.length === 0) {
    return <MentorEmptyState icon={ic(Users, MI.empty)} title="هنوز شاگرد فعالی نداری" text="درخواست‌های پذیرفته‌شده و دعوت‌های قبول‌شده اینجا نمایش داده می‌شوند" />;
  }

  const paused = data.students.filter((r) => r.pausedAt).length;

  return (
    <>
      <div className="mentor-filter">
        <div className="mentor-filter-row">
          <label className="mentor-search">
            {ic(Search, MI.btnSm)}
            <input
              type="search" className="wsearch-newform-name trade-glass-field" value={q} aria-label="جست‌وجوی شاگرد"
              placeholder="نام یا یوزرنیم" onChange={(e) => setQ(e.target.value)}
            />
          </label>
          {(data.labels.length > 0 || paused > 0) && (
            <select
              className="wsearch-newform-name trade-glass-field mentor-sort" aria-label="فیلتر شاگردها"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            >
              <option value={FILTER_ALL}>همه‌ی شاگردها</option>
              {paused > 0 && <option value={FILTER_PAUSED}>متوقف‌شده ({fa(paused)})</option>}
              {data.labels.length > 0 && (
                <optgroup label="برچسب">
                  {data.labels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({fa(data.students.filter((r) => r.labelIds.includes(l.id)).length)})</option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </div>
        <div className="mentor-sort-tabs" role="group" aria-label="مرتب‌سازی">
          <SegmentedTabs options={SORTS} active={sort} onChange={setSort} />
        </div>
      </div>

      <MentorSection
        title="شاگردهای فعال" icon={ic(Users, MI.section)} count={fa(rows.length)} flush
        action={data.capacity != null ? <span className="mentor-range">ظرفیت {fa(data.students.length)} از {fa(data.capacity)}</span> : undefined}
      >
        {rows.length === 0 && <MentorEmpty icon={ic(SearchX, MI.row)}>شاگردی با این فیلتر پیدا نشد</MentorEmpty>}
        <MentorList>
        {rows.map((r) => {
          const name = publicUserName(r.student);
          const labels = r.labelIds.map((id) => labelName.get(id)).filter(Boolean) as string[];
          return (
            <MentorListItem key={r.mentorshipId}>
            <MentorRow
              href={`/mentor/students/${r.student.id}`}
              lead={<MentorUserAvatar avatarUrl={r.student.avatarUrl} name={name} size={36} />}
              title={<GoldenName golden={r.student.golden}>{name}</GoldenName>}
              sub={
                <>
                  <span>{r.adherence === null ? "بدون ثبت در 7 روز" : `پایبندی ${pct(r.adherence)}`}</span>
                  <span>{r.lastActivityAt ? `فعالیت ${fmtRelative(r.lastActivityAt)}` : "بدون فعالیت"}</span>
                  {r.startedAt && <span>از {fmtDate(r.startedAt)}</span>}
                  {labels.length > 0 && <span>{labels.join("، ")}</span>}
                </>
              }
              end={r.pausedAt || r.unread > 0 ? (
                <>
                  {r.pausedAt && <MentorChip tone="neutral" icon={ic(CircleSlash, MI.chip)}>متوقف</MentorChip>}
                  {r.unread > 0 && <span className="mentor-unread" aria-label={`${fa(r.unread)} پیام خوانده‌نشده`}>{fa(r.unread)}</span>}
                </>
              ) : undefined}
            />
            </MentorListItem>
          );
        })}
        </MentorList>
      </MentorSection>
    </>
  );
}
