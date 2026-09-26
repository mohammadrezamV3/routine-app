"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ClipboardList, History, Inbox, LayoutDashboard, Loader2, Send, UserSearch, Users } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorshipStatusBadge, ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { LoadingBlock } from "@/components/Spinner";
import { useAsyncAction } from "@/lib/useAsyncAction";
import type { MentorshipAction, MentorshipRow, MentorshipsResponse, ProgramRow, ProgramsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";

const rowAnim = (i: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: Math.min(i, 8) * 0.035, ease: [0.22, 1, 0.36, 1] as const },
});

export default function MentorshipHomePage() {
  return (
    <MentorPageShell
      title="منتورهای من"
      titleAction={<Link href="/mentors" className="trade-title-add-btn">+ پیدا کردنِ منتور</Link>}
    >
      <MentorshipHome />
    </MentorPageShell>
  );
}

function MentorshipHome() {
  const [rows, setRows] = useState<MentorshipRow[] | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMentor, setIsMentor] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<MentorshipRow | null>(null);
  const { pendingKey, error: actionError, run, clearError } = useAsyncAction();
  const [actionFor, setActionFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/mentorships?role=student", { cache: "no-store" });
      if (!res.ok) { setError(await readApiError(res, "لیستِ منتورها بارگذاری نشد")); return; }
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
      if (!res.ok) { setProgramsError(await readApiError(res, "برنامه‌ها بارگذاری نشد")); return; }
      const d: ProgramsResponse = await res.json();
      setPrograms(d.programs || []);
    } catch {
      setProgramsError(NETWORK_ERROR);
    }
  }, []);

  useEffect(() => { load(); loadPrograms(); }, [load, loadPrograms]);

  useEffect(() => {
    fetch("/api/mentors/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsMentor(!!d?.profile))
      .catch(() => {});
  }, []);

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

  const invites = rows.filter((r) => r.status === "PENDING" && r.initiatedBy === "MENTOR");
  const active = rows.filter((r) => r.status === "ACTIVE");
  const outgoing = rows.filter((r) => r.status === "PENDING" && r.initiatedBy === "STUDENT");
  const past = rows.filter((r) => r.status === "ENDED" || r.status === "REJECTED" || r.status === "BLOCKED");
  const busy = (key: string) => pendingKey === key;
  const rowError = (id: string) => (actionFor === id && actionError && !confirmCancel ? actionError : null);

  return (
    <>
      {isMentor && (
        <Link href="/mentor" className="trade-surface trade-hub-box" style={{ marginBottom: 14 }}>
          <span className="trade-hub-icon"><LayoutDashboard size={18} /></span>
          <span className="trade-hub-body">
            <span className="trade-hub-title">پنلِ منتور</span>
            <span className="trade-hub-desc">شاگردها، درخواست‌ها و برنامه‌هایی که برای دیگران ساخته‌ای</span>
          </span>
          <ChevronLeft size={17} className="trade-hub-chevron" />
        </Link>
      )}

      {invites.length > 0 && (
        <>
          <h2 className="mentor-section-title"><Inbox size={16} /> دعوت‌های منتوری <span className="mentor-count">({faNum(invites.length)})</span></h2>
          <div className="account-card">
            {invites.map((r, i) => (
              <motion.div key={r.id} {...rowAnim(i)} className="mentor-row-stack">
                <Link href={`/mentors/${r.counterpart.id}`} className="mentor-row-main">
                  <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={38} />
                  <span className="account-row2-body">
                    <span className="account-row2-label">{publicUserName(r.counterpart)}</span>
                    <span className="account-row2-desc">تو را به‌عنوانِ شاگرد دعوت کرده · {fmtRelative(r.createdAt)}</span>
                  </span>
                </Link>
                {r.message && <p className="mentor-quote">{r.message}</p>}
                <div className="mentor-row-actions">
                  <button type="button" className="trade-primary-btn" onClick={() => act(r, "accept")} disabled={!!pendingKey}>
                    {busy(`accept:${r.id}`) ? <Loader2 size={14} className="trade-spin" /> : "پذیرفتن"}
                  </button>
                  <button type="button" className="account-outline-btn muted" onClick={() => act(r, "reject")} disabled={!!pendingKey}>
                    {busy(`reject:${r.id}`) ? <Loader2 size={14} className="trade-spin" /> : "رد"}
                  </button>
                </div>
                {rowError(r.id) && <div className="trade-form-error" style={{ marginTop: 0 }}>{rowError(r.id)}</div>}
              </motion.div>
            ))}
          </div>
          <p className="mentor-muted" style={{ margin: "8px 2px 0", fontSize: 11 }}>
            با پذیرفتن، منتور به‌طورِ پیش‌فرض هیچ‌کدام از برنامه‌هایت را نمی‌بیند؛ از بخشِ «دسترسی‌ها» خودت تعیین می‌کنی.
          </p>
        </>
      )}

      <h2 className="mentor-section-title"><Users size={16} /> منتورهای فعال</h2>
      {active.length === 0 ? (
        <div className="trade-surface trade-empty-state">
          <UserSearch size={30} />
          <p>هنوز منتورِ فعالی نداری. از میانِ منتورهای تأییدشده یکی را پیدا کن و درخواست بده.</p>
          <Link href="/mentors" className="trade-primary-btn" style={{ textDecoration: "none" }}>کشفِ منتور</Link>
        </div>
      ) : (
        <div className="account-card">
          {active.map((r, i) => (
            <motion.div key={r.id} {...rowAnim(i)}>
              <Link href={`/mentorship/${r.id}`} className="account-row2">
                <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={38} />
                <span className="account-row2-body">
                  <span className="account-row2-label">{publicUserName(r.counterpart)}</span>
                  <span className="account-row2-desc">
                    {r.activePrograms > 0 ? `${faNum(r.activePrograms)} برنامه‌ی فعال` : "بدون برنامه‌ی فعال"}
                    {r.startedAt ? ` · از ${fmtDate(r.startedAt)}` : ""}
                  </span>
                </span>
                {r.unread > 0 && <span className="mentor-unread" aria-label={`${r.unread} پیامِ خوانده‌نشده`}>{faNum(r.unread)}</span>}
                <ChevronLeft size={15} className="account-row2-chevron" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <>
          <h2 className="mentor-section-title"><Send size={16} /> درخواست‌های ارسالی</h2>
          <div className="account-card">
            {outgoing.map((r, i) => (
              <motion.div key={r.id} {...rowAnim(i)} className="mentor-row-stack">
                <div className="mentor-row-main" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <Link href={`/mentors/${r.counterpart.id}`} className="mentor-row-main" style={{ flex: 1 }}>
                    <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={38} />
                    <span className="account-row2-body">
                      <span className="account-row2-label">{publicUserName(r.counterpart)}</span>
                      <span className="account-row2-desc">در انتظارِ پاسخ · {fmtRelative(r.createdAt)}</span>
                    </span>
                  </Link>
                  <div className="mentor-row-actions">
                    <button type="button" className="account-outline-btn muted" onClick={() => { clearError(); setActionFor(r.id); setConfirmCancel(r); }} disabled={!!pendingKey}>
                      لغوِ درخواست
                    </button>
                  </div>
                </div>
                {rowError(r.id) && <div className="trade-form-error" style={{ marginTop: 0 }}>{rowError(r.id)}</div>}
              </motion.div>
            ))}
          </div>
        </>
      )}

      <h2 className="mentor-section-title"><ClipboardList size={16} /> برنامه‌های دریافتی</h2>
      {programsError ? (
        <MentorErrorState message={programsError} onRetry={loadPrograms} />
      ) : programs === null ? (
        <LoadingBlock />
      ) : programs.length === 0 ? (
        <p className="mentor-muted" style={{ margin: "0 2px" }}>هنوز برنامه‌ای از منتورهایت دریافت نکرده‌ای.</p>
      ) : (
        <div className="account-card">
          {programs.map((p, i) => (
            <motion.div key={p.id} {...rowAnim(i)}>
              <Link href={`/mentor-programs/${p.id}`} className="account-row2">
                <span className="account-row2-icon"><ClipboardList size={17} /></span>
                <span className="account-row2-body">
                  <span className="account-row2-label">{p.title}</span>
                  <span className="account-row2-desc">
                    {p.type === "WORKOUT" ? "برنامه‌ی تمرینی" : "برنامه‌ی روتین"} · {publicUserName(p.counterpart)}
                    {p.status === "ACTIVE" && ` · ${faNum(Math.round(p.progress.rate))}٪ پایبندی`}
                  </span>
                </span>
                <ProgramStatusBadge status={p.status} />
                <ChevronLeft size={15} className="account-row2-chevron" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mentor-section-title"><History size={16} /> سابقه</h2>
          <div className="account-card">
            {past.map((r, i) => (
              <motion.div key={r.id} {...rowAnim(i)} className="mentor-row-stack">
                <div className="mentor-row-main" style={{ flexWrap: "wrap" }}>
                  {r.status === "ENDED" ? (
                    <Link href={`/mentorship/${r.id}`} className="mentor-row-main" style={{ flex: 1 }}>
                      <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={34} />
                      <span className="account-row2-body">
                        <span className="account-row2-label">{publicUserName(r.counterpart)}</span>
                        <span className="account-row2-desc">{r.endedAt ? `پایان: ${fmtDate(r.endedAt)} · ` : ""}گفت‌وگو فقط‌خواندنی</span>
                      </span>
                    </Link>
                  ) : (
                    <Link href={`/mentors/${r.counterpart.id}`} className="mentor-row-main" style={{ flex: 1 }}>
                      <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={34} />
                      <span className="account-row2-body">
                        <span className="account-row2-label">{publicUserName(r.counterpart)}</span>
                      </span>
                    </Link>
                  )}
                  <MentorshipStatusBadge status={r.status} />
                  {r.status === "BLOCKED" && (
                    <button type="button" className="trade-ghost-btn" onClick={() => act(r, "unblock")} disabled={!!pendingKey}>
                      {busy(`unblock:${r.id}`) ? <Loader2 size={13} className="trade-spin" /> : "رفعِ مسدودی"}
                    </button>
                  )}
                </div>
                {rowError(r.id) && <div className="trade-form-error" style={{ marginTop: 0 }}>{rowError(r.id)}</div>}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {confirmCancel && (
        <MentorConfirmDialog
          message={`درخواستت به «${publicUserName(confirmCancel.counterpart)}» لغو شود؟`}
          confirmLabel="لغوِ درخواست"
          busy={busy(`cancel:${confirmCancel.id}`)}
          error={actionError}
          onConfirm={() => act(confirmCancel, "cancel")}
          onCancel={() => { setConfirmCancel(null); clearError(); }}
        />
      )}
    </>
  );
}
