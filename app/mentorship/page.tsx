"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, ClipboardList, Clock, Dumbbell, Inbox, Search, Send, Users, X } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorEmptyState, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorshipStatusBadge, ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { useAsyncAction } from "@/lib/useAsyncAction";
import type { MentorshipAction, MentorshipRow, MentorshipsResponse, ProgramRow, ProgramsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META } from "@/lib/mentorCategories";
import { categoryLabel } from "@/components/MentorBadges";

const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const ROW = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;

export default function MentorshipHomePage() {
  return (
    <MentorPageShell title="منتورهای من">
      <MentorshipHome />
    </MentorPageShell>
  );
}

function MentorshipHome() {
  const [rows, setRows] = useState<MentorshipRow[] | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // فیلترِ حوزه‌ی منتورهای فعال — فقط وقتی منتورها بیش از یک حوزه دارند دیده می‌شود
  const [area, setArea] = useState<string>("");
  const [confirmCancel, setConfirmCancel] = useState<MentorshipRow | null>(null);
  const { pendingKey, error: actionError, run, clearError } = useAsyncAction();
  const [actionFor, setActionFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/mentorships?role=student", { cache: "no-store" });
      if (!res.ok) { setError(await readApiError(res, "فهرست منتورها دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: MentorshipsResponse = await res.json();
      setRows(d.mentorships || []);
    } catch {
      setError(NETWORK_ERROR);
    }
  }, []);

  const loadPrograms = useCallback(async () => {
    setProgramsError(null);
    try {
      const res = await fetch("/api/mentor-programs?role=student", { cache: "no-store" });
      if (!res.ok) { setProgramsError(await readApiError(res, "برنامه‌ها دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: ProgramsResponse = await res.json();
      setPrograms(d.programs || []);
    } catch {
      setProgramsError(NETWORK_ERROR);
    }
  }, []);

  useEffect(() => { load(); loadPrograms(); }, [load, loadPrograms]);

  async function act(row: MentorshipRow, action: MentorshipAction) {
    setActionFor(row.id);
    const ok = await run(`${action}:${row.id}`, () =>
      fetch(`/api/mentorships/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
    );
    if (ok) {
      setConfirmCancel(null);
      setActionFor(null);
      await load();
      if (action === "accept") loadPrograms();
    }
  }

  if (error) return <MentorErrorState message={error} onRetry={load} />;
  if (!rows) return <LoadingBlock />;

  if (rows.length === 0) {
    return (
      <MentorEmptyState
        icon={<Users size={24} strokeWidth={1.75} aria-hidden />}
        title="هنوز منتوری نداری"
        text="منتورها را بر اساس حوزه و امتیاز پیدا کن و درخواست بده."
        action={
          <Link href="/mentors" className="trade-primary-btn mentor-btn">
            <Search size={15} strokeWidth={1.75} aria-hidden /> کشف منتور
          </Link>
        }
      />
    );
  }

  const invites = rows.filter((r) => r.status === "PENDING" && r.initiatedBy === "MENTOR");
  const allActive = rows.filter((r) => r.status === "ACTIVE");
  const areas = MENTOR_CATEGORIES.filter((c) => allActive.some((r) => r.categories.includes(c)));
  const activeArea = areas.includes(area as (typeof areas)[number]) ? area : "";
  const active = activeArea ? allActive.filter((r) => r.categories.includes(activeArea)) : allActive;
  const outgoing = rows.filter((r) => r.status === "PENDING" && r.initiatedBy === "STUDENT");
  const past = rows.filter((r) => r.status === "ENDED" || r.status === "REJECTED" || r.status === "BLOCKED");
  const busy = (key: string) => pendingKey === key;
  const rowError = (id: string) =>
    actionFor === id && actionError && !confirmCancel ? <p className="mentor-field-error" role="alert">{actionError}</p> : null;
  const avatar = (r: MentorshipRow) => (
    <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={36} />
  );
  const catSpans = (r: MentorshipRow) => r.categories.map((c) => <span key={c}>{categoryLabel(c)}</span>);

  return (
    <>
      {invites.length > 0 && (
        <MentorSection
          title="دعوت‌ها"
          icon={<Inbox {...SECTION} />}
          count={faNum(invites.length)}
          desc="پس از پذیرش، منتور فقط بخش‌هایی را می‌بیند که در دسترسی‌ها اجازه بدهی."
          flush
        >
          {invites.map((r) => (
            <MentorRow
              key={r.id}
              href={`/mentors/${r.counterpart.id}`}
              lead={avatar(r)}
              title={publicUserName(r.counterpart)}
              sub={<>{catSpans(r)}<span>{fmtRelative(r.createdAt)}</span></>}
              below={
                <>
                  {r.message && <p className="mentor-quote">{r.message}</p>}
                  {rowError(r.id)}
                  <div className="mentor-btn-group is-end">
                    <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { clearError(); act(r, "reject"); }} disabled={!!pendingKey}>
                      {busy(`reject:${r.id}`) ? <Spinner size={14} /> : <><X {...BTN_SM} /> رد دعوت</>}
                    </button>
                    <button type="button" className="trade-primary-btn mentor-btn is-sm" onClick={() => { clearError(); act(r, "accept"); }} disabled={!!pendingKey}>
                      {busy(`accept:${r.id}`) ? <Spinner size={14} /> : <><Check {...BTN_SM} /> پذیرفتن</>}
                    </button>
                  </div>
                </>
              }
            />
          ))}
        </MentorSection>
      )}

      <MentorSection title="منتورهای فعال" icon={<Users {...SECTION} />} count={allActive.length ? faNum(allActive.length) : undefined} flush>
        {areas.length > 1 && (
          <div className="trade-tag-row" role="group" aria-label="حوزه" style={{ padding: "0 16px 8px" }}>
            <button type="button" className={`trade-tag-chip${activeArea === "" ? " active" : ""}`} aria-pressed={activeArea === ""} onClick={() => setArea("")}>همه</button>
            {areas.map((c) => (
              <button key={c} type="button" className={`trade-tag-chip${activeArea === c ? " active" : ""}`} aria-pressed={activeArea === c} onClick={() => setArea(c)}>
                {MENTOR_CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        )}
        {active.length === 0 ? (
          <MentorEmpty>منتور فعالی نداری</MentorEmpty>
        ) : (
          active.map((r) => (
            <MentorRow
              key={r.id}
              href={`/mentorship/${r.id}`}
              lead={avatar(r)}
              title={publicUserName(r.counterpart)}
              sub={
                <>
                  {catSpans(r)}
                  <span>{r.activePrograms > 0 ? `${faNum(r.activePrograms)} برنامه‌ی در حال اجرا` : "بدون برنامه‌ی در حال اجرا"}</span>
                  {r.startedAt && <span>از {fmtDate(r.startedAt)}</span>}
                </>
              }
              end={r.unread > 0 ? <span className="mentor-unread" aria-label={`${faNum(r.unread)} پیام خوانده‌نشده`}>{faNum(r.unread)}</span> : undefined}
            />
          ))
        )}
      </MentorSection>

      {outgoing.length > 0 && (
        <MentorSection title="درخواست‌های ارسالی" icon={<Send {...SECTION} />} count={faNum(outgoing.length)} flush>
          {outgoing.map((r) => (
            <MentorRow
              key={r.id}
              href={`/mentors/${r.counterpart.id}`}
              lead={avatar(r)}
              title={publicUserName(r.counterpart)}
              sub={<>{catSpans(r)}<span>ارسال {fmtRelative(r.createdAt)}</span></>}
              end={<MentorshipStatusBadge status="PENDING" />}
              below={
                <>
                  {rowError(r.id)}
                  <div className="mentor-btn-group is-end">
                    <button
                      type="button"
                      className="account-outline-btn muted mentor-btn is-sm"
                      onClick={() => { clearError(); setActionFor(r.id); setConfirmCancel(r); }}
                      disabled={!!pendingKey}
                    >
                      <X {...BTN_SM} /> لغو درخواست
                    </button>
                  </div>
                </>
              }
            />
          ))}
        </MentorSection>
      )}

      {programsError ? (
        <MentorErrorState message={programsError} onRetry={loadPrograms} />
      ) : (
        <MentorSection
          title="برنامه‌های دریافتی"
          icon={<ClipboardList {...SECTION} />}
          count={programs && programs.length ? faNum(programs.length) : undefined}
          flush
        >
          {programs === null ? (
            <LoadingBlock />
          ) : programs.length === 0 ? (
            <MentorEmpty>هنوز برنامه‌ای دریافت نکرده‌ای</MentorEmpty>
          ) : (
            programs.map((p) => (
              <MentorRow
                key={p.id}
                href={`/mentor-programs/${p.id}`}
                lead={p.type === "WORKOUT" ? <Dumbbell {...ROW} /> : <CalendarCheck {...ROW} />}
                title={p.title}
                sub={
                  <>
                    <span>{p.type === "WORKOUT" ? "برنامه‌ی تمرینی" : "برنامه‌ی روتین"}</span>
                    <span>{publicUserName(p.counterpart)}</span>
                    {p.status === "ACTIVE" && <span>{faNum(Math.round(p.progress.rate))}٪ پایبندی</span>}
                  </>
                }
                end={<ProgramStatusBadge status={p.status} />}
              />
            ))
          )}
        </MentorSection>
      )}

      {past.length > 0 && (
        <MentorSection title="سابقه" icon={<Clock {...SECTION} />} count={faNum(past.length)} flush>
          {past.map((r) => (
            <MentorRow
              key={r.id}
              href={r.status === "ENDED" ? `/mentorship/${r.id}` : `/mentors/${r.counterpart.id}`}
              lead={avatar(r)}
              title={publicUserName(r.counterpart)}
              sub={
                r.status === "ENDED" ? (
                  <>
                    {r.endedAt && <span>پایان {fmtDate(r.endedAt)}</span>}
                    <span>گفت‌وگو فقط‌خواندنی</span>
                  </>
                ) : undefined
              }
              end={<MentorshipStatusBadge status={r.status} />}
              below={
                r.status === "BLOCKED" && r.blockedByMe ? (
                  <>
                    {rowError(r.id)}
                    <div className="mentor-btn-group is-end">
                      <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => { clearError(); act(r, "unblock"); }} disabled={!!pendingKey}>
                        {busy(`unblock:${r.id}`) ? <Spinner size={14} /> : "رفع مسدودی"}
                      </button>
                    </div>
                  </>
                ) : undefined
              }
            />
          ))}
        </MentorSection>
      )}

      {confirmCancel && (
        <MentorConfirmDialog
          message={`درخواست به ${publicUserName(confirmCancel.counterpart)} لغو شود؟`}
          hint="بعداً می‌توانی دوباره درخواست بدهی."
          confirmLabel="لغو درخواست"
          busy={busy(`cancel:${confirmCancel.id}`)}
          error={actionError}
          onConfirm={() => act(confirmCancel, "cancel")}
          onCancel={() => { setConfirmCancel(null); clearError(); }}
        />
      )}
    </>
  );
}
