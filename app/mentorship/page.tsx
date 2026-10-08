"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ClipboardList, MessageCircle, Search, Users } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmptyState } from "@/components/MentorUI";
import { MentorAvatarRing } from "@/components/MentorAvatarRing";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { useAsyncAction } from "@/lib/useAsyncAction";
import type { MentorshipAction, MentorshipRow, MentorshipsResponse, ProgramRow, ProgramsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META } from "@/lib/mentorCategories";
import { categoryLabel } from "@/components/MentorBadges";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "@/components/MentorTermsAcceptance";
import { GoldenName } from "@/components/GoldenName";

const STRIP = { size: 18, strokeWidth: 1.75, "aria-hidden": true } as const;

export default function MentorshipHomePage() {
  return (
    <MentorPageShell title="مربی‌های من" surface>
      <MentorshipHome />
    </MentorPageShell>
  );
}

/** میانگین پیشرفت برنامه‌های در حال اجرا (فقط وقتی شاگرد پنهانش نکرده)؛ 0..1 یا null */
function adherence(programs: ProgramRow[], mentorshipId: string): number | null {
  const act = programs.filter((p) => p.mentorshipId === mentorshipId && p.status === "ACTIVE" && !p.progress.hidden);
  if (act.length === 0) return null;
  const avg = act.reduce((s, p) => s + (p.progress.rate > 1 ? p.progress.rate / 100 : p.progress.rate), 0) / act.length;
  return Math.max(0, Math.min(1, avg));
}

const PAST_LABEL: Record<string, string> = { ENDED: "همکاری تموم شده", REJECTED: "قبول نشد", BLOCKED: "مسدود شده" };

function MentorshipHome() {
  const [rows, setRows] = useState<MentorshipRow[] | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState<string>("");
  const [confirmCancel, setConfirmCancel] = useState<MentorshipRow | null>(null);
  const { pendingKey, error: actionError, run, clearError } = useAsyncAction();
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [openSent, setOpenSent] = useState(false);
  const [openPast, setOpenPast] = useState(false);
  const terms = useMentorTermsStatus();
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [forceTerms, setForceTerms] = useState(false);
  const needTerms = forceTerms || (!terms.loading && !terms.studentAccepted);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/mentorships?role=student", { cache: "no-store" });
      if (!res.ok) { setError(await readApiError(res, "فهرست مربی‌ها دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: MentorshipsResponse = await res.json();
      setRows(d.mentorships || []);
    } catch {
      setError(NETWORK_ERROR);
    }
  }, []);

  // برنامه‌ها فقط برای نوار «برنامه‌ی تازه» و حلقه‌ی پیشرفت لازم‌اند؛ خطایش صفحه را خراب نمی‌کند
  const loadPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/mentor-programs?role=student", { cache: "no-store" });
      if (!res.ok) return;
      const d: ProgramsResponse = await res.json();
      setPrograms(d.programs || []);
    } catch {
      // دور بعد
    }
  }, []);

  useEffect(() => { load(); loadPrograms(); }, [load, loadPrograms]);
  useLiveRefresh("mentor", () => { load(); loadPrograms(); });
  useVisiblePolling(() => { load(); loadPrograms(); }, 30_000);

  async function act(row: MentorshipRow, action: MentorshipAction) {
    setActionFor(row.id);
    const withTerms = action === "accept" && row.initiatedBy === "MENTOR";
    if (withTerms && needTerms && !termsChecked) { setTermsError("برای قبول کردن، شرایط رو بپذیر"); return; }
    const ok = await run(`${action}:${row.id}`, async () => {
      const res = await fetch(`/api/mentorships/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(withTerms ? mentorTermsPayload(needTerms && termsChecked) : {}) }),
      });
      if (!res.ok && withTerms) {
        const j = await res.clone().json().catch(() => null);
        if (isMentorTermsError(j)) { setForceTerms(true); setTermsChecked(false); setTermsError(j?.error ?? null); }
      }
      return res;
    });
    if (ok && withTerms) { setForceTerms(false); terms.refresh(); }
    if (ok) {
      setConfirmCancel(null);
      setActionFor(null);
      await load();
      if (action === "accept") loadPrograms();
    }
  }

  const list = rows ?? [];
  const invites = list.filter((r) => r.status === "PENDING" && r.initiatedBy === "MENTOR");
  const allActive = list.filter((r) => r.status === "ACTIVE");
  const areas = MENTOR_CATEGORIES.filter((c) => allActive.some((r) => r.categories.includes(c)));
  const activeArea = areas.includes(area as (typeof areas)[number]) ? area : "";
  const active = activeArea ? allActive.filter((r) => r.categories.includes(activeArea)) : allActive;
  const outgoing = list.filter((r) => r.status === "PENDING" && r.initiatedBy === "STUDENT");
  const past = list.filter((r) => r.status === "ENDED" || r.status === "REJECTED" || r.status === "BLOCKED");
  const waitingByMentorship = useMemo(() => {
    const s = new Set<string>();
    for (const p of programs ?? []) if (p.status === "PENDING") s.add(p.mentorshipId);
    return s;
  }, [programs]);

  if (error) return <MentorErrorState message={error} onRetry={load} />;
  if (!rows) return <LoadingBlock />;

  if (rows.length === 0) {
    return (
      <MentorEmptyState
        icon={<Users size={24} strokeWidth={1.75} aria-hidden />}
        title="هنوز مربی‌ای نداری"
        text="مربی‌ها رو بر اساس حوزه و امتیاز پیدا کن و درخواست بده."
        action={
          <Link href="/mentors" className="trade-primary-btn mentor-btn">
            <Search size={15} strokeWidth={1.75} aria-hidden /> پیدا کردن مربی
          </Link>
        }
      />
    );
  }

  const busy = (key: string) => pendingKey === key;
  const rowError = (id: string) =>
    actionFor === id && actionError && !confirmCancel ? <p className="mentor-field-error" role="alert">{actionError}</p> : null;
  const nameOf = (r: MentorshipRow) => (
    <GoldenName golden={r.counterpart.golden} staff={r.counterpart.staff}>{publicUserName(r.counterpart)}</GoldenName>
  );

  return (
    <div className="mv2-ms">
      {invites.length > 0 && (
        <section className="mv2-ms-invites" aria-label={`دعوت‌های تازه (${faNum(invites.length)})`}>
          {invites.map((r) => (
            <div key={r.id} className="mv2-ms-invite">
              <div className="mv2-ms-invite-head">
                <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={48} />
                <p className="mv2-ms-invite-text">
                  <Link href={`/mentors/${r.counterpart.id}`} className="mv2-ms-name">{nameOf(r)}</Link> دعوتت کرده مربی‌ت باشه
                  {r.categories.length > 0 && <span className="mv2-ms-meta">{r.categories.map((c) => categoryLabel(c)).join("، ")}</span>}
                </p>
              </div>
              {r.message && <p className="mentor-quote">{r.message}</p>}
              {needTerms && (
                <MentorTermsAcceptance role="student" checked={termsChecked} onChange={(v) => { setTermsChecked(v); setTermsError(null); }} error={termsError} />
              )}
              {rowError(r.id)}
              <div className="mv2-ms-invite-actions">
                <button type="button" className="trade-primary-btn mentor-btn" onClick={() => { clearError(); act(r, "accept"); }} disabled={!!pendingKey || (needTerms && !termsChecked)}>
                  {busy(`accept:${r.id}`) ? <Spinner size={14} /> : "قبول"}
                </button>
                <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => { clearError(); act(r, "reject"); }} disabled={!!pendingKey}>
                  {busy(`reject:${r.id}`) ? <Spinner size={14} /> : "نه، ممنون"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section aria-label="مربی‌های فعال">
        {areas.length > 1 && (
          <div className="mv2-ms-filter">
            <SegmentedTabs
              options={[{ value: "", label: "همه" }, ...areas.map((c) => ({ value: c as string, label: MENTOR_CATEGORY_META[c].short }))]}
              active={activeArea}
              onChange={setArea}
            />
          </div>
        )}
        {active.length === 0 ? (
          <p className="mv2-ms-empty">{allActive.length === 0 ? "الان مربی فعالی نداری" : "تو این حوزه مربی فعالی نداری"}</p>
        ) : (
          <ul className="mv2-ms-cards">
            {active.map((r) => {
              const rate = adherence(programs ?? [], r.id);
              const name = publicUserName(r.counterpart);
              return (
                <li key={r.id} className="mv2-ms-card">
                  <Link href={`/mentorship/${r.id}`} className="mv2-ms-card-main">
                    <MentorAvatarRing
                      name={name}
                      avatarUrl={r.counterpart.avatarUrl}
                      progress={rate}
                      size={56}
                      label={rate == null ? undefined : `پیشرفت برنامه ${faNum(Math.round(rate * 100))} درصد`}
                    />
                    <span className="mv2-ms-card-body">
                      <span className="mv2-ms-name">{nameOf(r)}</span>
                      <span className="mv2-ms-meta">
                        {[r.categories.map((c) => categoryLabel(c)).join("، "), r.startedAt ? `از ${fmtDate(r.startedAt)}` : ""].filter(Boolean).join(" · ")}
                      </span>
                      <span className="mv2-ms-meta">
                        {rate != null ? `پیشرفت برنامه ${faNum(Math.round(rate * 100))}٪` : r.activePrograms > 0 ? `${faNum(r.activePrograms)} برنامه در حال اجرا` : "برنامه‌ی در حال اجرا نداری"}
                      </span>
                    </span>
                    <ChevronLeft size={16} strokeWidth={1.75} className="mv2-ms-chev" aria-hidden />
                  </Link>
                  {waitingByMentorship.has(r.id) && (
                    <Link href={`/mentorship/${r.id}`} className="mv2-ms-strip is-program">
                      <ClipboardList {...STRIP} />
                      <span>برنامه‌ی تازه رسیده، ببین</span>
                      <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
                    </Link>
                  )}
                  {r.unread > 0 && (
                    <Link href={`/mentorship/${r.id}/chat`} className="mv2-ms-strip is-chat">
                      <MessageCircle {...STRIP} />
                      <span>{faNum(r.unread)} پیام تازه</span>
                      <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="mv2-ms-fold">
          <button type="button" className="mv2-ms-fold-btn" aria-expanded={openSent} aria-controls="mv2-ms-sent" onClick={() => setOpenSent((v) => !v)}>
            <span>درخواست‌هایی که فرستادی</span>
            <span className="mv2-ms-count">{faNum(outgoing.length)}</span>
            <ChevronDown size={18} strokeWidth={1.75} className={openSent ? "is-open" : ""} aria-hidden />
          </button>
          {openSent && (
            <ul id="mv2-ms-sent" className="mv2-ms-list">
              {outgoing.map((r) => (
                <li key={r.id} className="mv2-ms-li">
                  <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={40} />
                  <span className="mv2-ms-card-body">
                    <Link href={`/mentors/${r.counterpart.id}`} className="mv2-ms-name">{nameOf(r)}</Link>
                    <span className="mv2-ms-meta">منتظر جواب · {fmtRelative(r.createdAt)}</span>
                    {rowError(r.id)}
                  </span>
                  <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { clearError(); setActionFor(r.id); setConfirmCancel(r); }} disabled={!!pendingKey}>
                    لغو درخواست
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {past.length > 0 && (
        <section className="mv2-ms-fold">
          <button type="button" className="mv2-ms-fold-btn" aria-expanded={openPast} aria-controls="mv2-ms-past" onClick={() => setOpenPast((v) => !v)}>
            <span>همکاری‌های قبلی</span>
            <span className="mv2-ms-count">{faNum(past.length)}</span>
            <ChevronDown size={18} strokeWidth={1.75} className={openPast ? "is-open" : ""} aria-hidden />
          </button>
          {openPast && (
            <ul id="mv2-ms-past" className="mv2-ms-list">
              {past.map((r) => (
                <li key={r.id} className="mv2-ms-li">
                  <MentorUserAvatar name={publicUserName(r.counterpart)} avatarUrl={r.counterpart.avatarUrl} size={40} />
                  <span className="mv2-ms-card-body">
                    <Link href={r.status === "ENDED" ? `/mentorship/${r.id}` : `/mentors/${r.counterpart.id}`} className="mv2-ms-name">{nameOf(r)}</Link>
                    <span className="mv2-ms-meta">
                      {PAST_LABEL[r.status] ?? ""}{r.status === "ENDED" && r.endedAt ? ` · ${fmtDate(r.endedAt)}` : ""}
                    </span>
                    {rowError(r.id)}
                  </span>
                  {r.status === "BLOCKED" && r.blockedByMe && (
                    <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => { clearError(); act(r, "unblock"); }} disabled={!!pendingKey}>
                      {busy(`unblock:${r.id}`) ? <Spinner size={14} /> : "رفع مسدودی"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Link href="/mentors" className="mv2-ms-find">پیدا کردن مربی تازه</Link>

      {confirmCancel && (
        <MentorConfirmDialog
          message={`درخواست به ${publicUserName(confirmCancel.counterpart)} لغو بشه؟`}
          hint="بعدا می‌تونی دوباره درخواست بدی."
          confirmLabel="لغو درخواست"
          busy={busy(`cancel:${confirmCancel.id}`)}
          error={actionError}
          onConfirm={() => act(confirmCancel, "cancel")}
          onCancel={() => { setConfirmCancel(null); clearError(); }}
        />
      )}
    </div>
  );
}
