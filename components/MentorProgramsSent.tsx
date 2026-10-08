"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, ClipboardList, Copy, Download, Dumbbell, LayoutTemplate, Trash2 } from "lucide-react";
import { LoadingBlock } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorKebabMenu, type MentorMenuAction } from "./MentorKebabMenu";
import { MentorTemplateSaveDialog } from "./MentorTemplateSaveDialog";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { MentorDashBar, MentorDashError, fa, mentorApi, normRate } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmptyState } from "./MentorUI";
import { ProgramStatusBadge } from "./ProgramStatusBadge";
import { fmtDate } from "@/lib/mentorFormat";
import { exportCsvUrl } from "@/lib/mentorToolsTypes";
import { publicUserName } from "@/lib/mentorTypes";
import type { ProgramRow, ProgramsResponse } from "@/lib/mentorTypes";

const ic = (Icon: typeof Copy, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

// پیش‌نویسی که قبلا فرستاده شده یعنی شاگرد تغییر خواسته
const changeRequested = (p: ProgramRow) => p.status === "DRAFT" && !!p.sentAt;

const RANK: Record<string, number> = { DRAFT: 0, PENDING: 1, ACCEPTED: 2, ACTIVE: 3, COMPLETED: 4, REJECTED: 5, CANCELLED: 6 };

/** تب «فرستاده‌شده»: برنامه‌های همه‌ی شاگردها با وضعیت، پیشرفت و یک کار اصلی */
export function MentorProgramsSent() {
  const router = useRouter();
  const [list, setList] = useState<ProgramRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tplFor, setTplFor] = useState<ProgramRow | null>(null);
  const [delFor, setDelFor] = useState<ProgramRow | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await mentorApi<ProgramsResponse>("/api/mentor-programs?role=mentor");
    if (!r.ok) { setError(r.error); return; }
    setList(r.data.programs);
  }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(
    () => [...(list ?? [])].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || (a.updatedAt < b.updatedAt ? 1 : -1)),
    [list],
  );

  async function remove() {
    if (!delFor || delBusy) return;
    setDelBusy(true);
    setDelError(null);
    const r = await mentorApi<unknown>(`/api/mentor-programs/${encodeURIComponent(delFor.id)}`, { method: "DELETE" });
    setDelBusy(false);
    if (!r.ok && r.status !== 404) { setDelError(r.error); return; }
    setList((xs) => (xs ?? []).filter((x) => x.id !== delFor.id));
    setDelFor(null);
  }

  if (error && !list) return <MentorDashError message={error} onRetry={load} />;
  if (!list) return <LoadingBlock />;
  if (list.length === 0) {
    return (
      <MentorEmptyState
        icon={ic(ClipboardList, MI.empty)}
        title="هنوز برنامه‌ای نساختی"
        text="اولین برنامه رو بساز و برای یکی از شاگردهات بفرست"
        action={<Link href="/mentor/programs/new" className="trade-primary-btn mentor-btn">برنامه‌ی تازه</Link>}
      />
    );
  }

  return (
    <>
      <ul className="mv2-pg-list">
        {sorted.map((p) => {
          const name = publicUserName(p.counterpart);
          const cr = changeRequested(p);
          const never = p.status === "DRAFT" && !p.sentAt;
          const actions: MentorMenuAction[] = [
            { label: "ذخیره به‌عنوان قالب", icon: ic(LayoutTemplate, MI.btn), onClick: () => setTplFor(p) },
            { label: "کپی برای شاگرد", icon: ic(Copy, MI.btn), onClick: () => router.push(`/mentor/programs/${p.id}/duplicate`) },
            { label: "خروجی CSV", icon: ic(Download, MI.btn), onClick: () => { window.location.href = exportCsvUrl(p.counterpart.id); } },
            ...(never ? [{ label: "حذف برنامه", icon: ic(Trash2, MI.btn), danger: true, onClick: () => { setDelError(null); setDelFor(p); } }] : []),
          ];
          const showBar = p.status === "ACTIVE" && !p.progress.hidden;
          return (
            <li key={p.id} className="mv2-pg-card">
              <div className="mv2-pg-card-top">
                <ProgramStatusBadge status={p.status} changeRequested={cr} />
                <MentorKebabMenu actions={actions} label={`کارهای بیشتر روی ${p.title}`} />
              </div>
              <h3 className="mv2-pg-card-title">
                <Link href={`/mentor-programs/${p.id}`} prefetch={false}>{p.title}</Link>
              </h3>
              <p className="mv2-pg-card-meta">
                <MentorUserAvatar avatarUrl={p.counterpart.avatarUrl} name={name} size={20} />
                <span>{name}</span>
                <span aria-hidden>·</span>
                <span>{p.type === "WORKOUT" ? <Dumbbell size={13} strokeWidth={MI_STROKE} aria-hidden /> : <CalendarCheck size={13} strokeWidth={MI_STROKE} aria-hidden />} {p.type === "WORKOUT" ? "تمرین ورزشی" : "روتین"}</span>
                {p.startDate && <><span aria-hidden>·</span><span>{fmtDate(p.startDate)}{p.endDate ? ` تا ${fmtDate(p.endDate)}` : ""}</span></>}
              </p>
              {showBar && (
                <div className="mv2-pg-card-bar">
                  <MentorDashBar rate={p.progress.rate} label={`پیشرفت ${p.title}`} />
                  <b>{fa(Math.round(normRate(p.progress.rate) * 100))}٪</b>
                </div>
              )}
              {cr && <Link href={`/mentor/programs/${p.id}/edit`} className="account-outline-btn mentor-btn is-sm">دیدن درخواست تغییر</Link>}
              {never && <Link href={`/mentor/programs/${p.id}/edit`} className="account-outline-btn mentor-btn is-sm">فرستادن</Link>}
            </li>
          );
        })}
      </ul>
      {tplFor && <MentorTemplateSaveDialog defaultName={tplFor.title} programId={tplFor.id} onClose={() => setTplFor(null)} />}
      {delFor && (
        <MentorConfirmDialog
          message={`برنامه‌ی «${delFor.title}» حذف بشه؟`}
          hint="برنامه‌ی حذف‌شده برنمی‌گرده"
          confirmLabel="حذف برنامه"
          busy={delBusy}
          error={delError}
          onConfirm={remove}
          onCancel={() => setDelFor(null)}
        />
      )}
    </>
  );
}
