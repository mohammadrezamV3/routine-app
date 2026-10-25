"use client";

// «مربی من» برای شاگرد (طرح StudentHome.dc.html): یک مربی فعال = کارت مربی + هدف + برنامه‌ی تازه + کارهای امروز؛
// چند مربی = فهرست کارت‌ها؛ هیچ مربی = حالت خالی. دعوت‌ها بالا، درخواست‌های فرستاده و سابقه ته صفحه (جمع‌شونده).
import "./coach.css";
import "./coach-space.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronLeft, Search, Users } from "lucide-react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import type { CoachSpace as CoachSpaceData } from "@/lib/coachTypes";
import type { MentorshipAction, MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, networkError, readApiError } from "@/lib/mentorFormat";
import { intersectsCategories } from "@/lib/mentorCategories";
import { SECTION_META } from "@/lib/sections";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { tr } from "@/lib/i18n";
import { faNum } from "@/lib/jalali";
import { AuthGate } from "./AuthGate";
import { CoachAvatar } from "./CoachAvatar";
import { CoachEmpty } from "./CoachEmpty";
import { CoachGoalCard } from "./CoachGoalCard";
import { CoachHeader } from "./CoachHeader";
import { categoryLabel } from "./MentorBadges";
import { GoldenName } from "./GoldenName";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { mentorApi } from "./MentorDashKit";
import { MentorErrorState } from "./MentorPageShell";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "./MentorTermsAcceptance";
import { useSection } from "./SectionProvider";
import { SmartLink } from "./SmartLink";
import { TickButton } from "./TickButton";
import { LoadingBlock, Spinner } from "./Spinner";

export function CoachStudentHome() {
  const { status } = useSession();
  if (status === "loading") return <div className="ch-page cs-page"><LoadingBlock /></div>;
  if (status === "unauthenticated") return <div className="ch-page cs-page"><AuthGate message={tr("برای استفاده از بخش مربی‌ها وارد شو", "Sign in to use the mentors section")} /></div>;
  return <Home />;
}

const pastLabel = (): Record<string, string> => ({ ENDED: tr("همکاری تموم شده", "Mentorship ended"), REJECTED: tr("قبول نشد", "Declined"), BLOCKED: tr("مسدود شده", "Blocked") });

function Home() {
  // روی زیردامنه‌ی یک بخش فقط همکاری‌هایی که حوزه‌شون با اون بخش اشتراک داره (بقیه فقط پنهان می‌شن)
  const section = useSection();
  const [rawRows, setRows] = useState<MentorshipRow[] | null>(null);
  const rows = useMemo(() => {
    if (!rawRows || !section) return rawRows;
    const allowed = SECTION_META[section].mentorCategories;
    return rawRows.filter((r) => intersectsCategories(r.categories, allowed));
  }, [rawRows, section]);
  const [spaces, setSpaces] = useState<Record<string, CoachSpaceData>>({});
  const [error, setError] = useState<string | null>(null);
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
      if (!res.ok) { setError(await readApiError(res, tr("فهرست مربی‌ها دریافت نشد؛ دوباره تلاش کن", "Couldn't load your mentors. Try again"))); return; }
      const d: MentorshipsResponse = await res.json();
      setRows(d.mentorships || []);
    } catch {
      setError(networkError());
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh("mentor", () => { load(); });
  useVisiblePolling(() => { load(); }, 30_000);

  const list = rows ?? [];
  const invites = list.filter((r) => r.status === "PENDING" && r.initiatedBy === "MENTOR");
  const active = list.filter((r) => r.status === "ACTIVE");
  const outgoing = list.filter((r) => r.status === "PENDING" && r.initiatedBy === "STUDENT");
  const past = list.filter((r) => r.status === "ENDED" || r.status === "REJECTED" || r.status === "BLOCKED");

  // هدف، برنامه‌ی تازه و کارهای امروز هر مربی فعال از فضای همون همکاری می‌آد (حداکثر 8 مربی)
  const activeKey = active.map((r) => r.id).join(",");
  const loadSpaces = useCallback(async () => {
    const ids = activeKey ? activeKey.split(",").slice(0, 8) : [];
    const out = await Promise.all(ids.map((id) => mentorApi<CoachSpaceData>(`/api/mentorships/${encodeURIComponent(id)}/space`)));
    const next: Record<string, CoachSpaceData> = {};
    out.forEach((r, i) => { if (r.ok) next[ids[i]] = r.data; });
    setSpaces(next);
  }, [activeKey]);
  useEffect(() => { loadSpaces(); }, [loadSpaces]);
  useLiveRefresh("mentor", () => { loadSpaces(); });

  async function act(row: MentorshipRow, action: MentorshipAction) {
    setActionFor(row.id);
    const withTerms = action === "accept" && row.initiatedBy === "MENTOR";
    if (withTerms && needTerms && !termsChecked) { setTermsError(tr("برای قبول کردن، شرایط رو بپذیر", "Accept the terms to continue")); return; }
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
    }
  }

  const header = <CoachHeader title={tr("مربی من", "My mentor")} />;
  if (error) return <div className="ch-page cs-page">{header}<MentorErrorState message={error} onRetry={load} /></div>;
  if (!rows) return <div className="ch-page cs-page">{header}<LoadingBlock /></div>;

  const busy = (key: string) => pendingKey === key;
  const rowError = (id: string) => (actionFor === id && actionError && !confirmCancel ? <p className="cs-card-error" role="alert">{actionError}</p> : null);
  const nameOf = (r: MentorshipRow) => <GoldenName golden={r.counterpart.golden} staff={r.counterpart.staff}>{publicUserName(r.counterpart)}</GoldenName>;
  const roleLine = (r: MentorshipRow, sp?: CoachSpaceData) => {
    const parts = [r.categories.map((c) => categoryLabel(c)).join(tr("، ", ", "))];
    const rt = sp?.counterpart.responseTimeHours;
    if (rt != null && rt <= 12) parts.push(tr("معمولا زود جواب می‌ده", "Usually replies fast"));
    return parts.filter(Boolean).join(" · ");
  };

  const none = active.length === 0 && invites.length === 0 && outgoing.length === 0 && past.length === 0;

  return (
    <div className="ch-page cs-page">
      <span className="ch-halo" aria-hidden="true" />
      {header}

      {invites.length > 0 && (
        <section className="cs-invites" aria-label={tr(`دعوت‌های تازه (${faNum(invites.length)})`, `New invitations (${faNum(invites.length)})`)}>
          {invites.map((r) => (
            <div key={r.id} className="ch-card cs-invite">
              <div className="cs-invite-head">
                <CoachAvatar user={r.counterpart} size={48} />
                <p className="cs-invite-text">
                  <SmartLink href={`/mentors/${r.counterpart.id}`} className="cs-link"><b>{nameOf(r)}</b></SmartLink> {tr("دعوتت کرده مربی‌ت باشه", "invited you to be your mentor")}
                  {r.categories.length > 0 && <span className="cs-muted">{r.categories.map((c) => categoryLabel(c)).join(tr("، ", ", "))}</span>}
                </p>
              </div>
              {r.message && <p className="cs-quote" dir="auto">{r.message}</p>}
              {needTerms && <MentorTermsAcceptance role="student" checked={termsChecked} onChange={(v) => { setTermsChecked(v); setTermsError(null); }} error={termsError} />}
              {rowError(r.id)}
              <div className="cs-invite-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { clearError(); act(r, "reject"); }} disabled={!!pendingKey}>
                  {busy(`reject:${r.id}`) ? <Spinner size={14} /> : tr("نه، ممنون", "No, thanks")}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => { clearError(); act(r, "accept"); }} disabled={!!pendingKey || (needTerms && !termsChecked)}>
                  {busy(`accept:${r.id}`) ? <Spinner size={14} /> : tr("قبول", "Accept")}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {active.length === 1 && <SingleCoach row={active[0]} space={spaces[active[0].id]} line={roleLine(active[0], spaces[active[0].id])} nameNode={nameOf(active[0])} />}

      {active.length > 1 && (
        <ul className="ch-list" aria-label={tr("مربی‌های من", "My mentors")}>
          {active.map((r) => {
            const sp = spaces[r.id];
            const tasks = sp?.todayTasks ?? null;
            const done = tasks ? tasks.filter((t) => t.done).length : 0;
            const rate = tasks && tasks.length ? (done / tasks.length) * 100 : null;
            return (
              <li key={r.id}>
                <SmartLink href={`/mentorship/${r.id}`} className="ch-row cs-coach-row">
                  <CoachAvatar user={r.counterpart} size={44} ring={rate} />
                  <span className="ch-row-main">
                    <span className="ch-row-title">{nameOf(r)}</span>
                    <span className="ch-row-sub">{tasks && tasks.length ? tr(`امروز ${done} از ${tasks.length}`, `Today ${done} of ${tasks.length}`) : roleLine(r, sp) || tr("برای امروز کاری نیست", "Nothing for today")}</span>
                  </span>
                  {r.unread > 0 && <span className="ch-nav-badge cs-badge" aria-label={tr(`${faNum(r.unread)} پیام تازه`, `${faNum(r.unread)} new messages`)}>{r.unread > 9 ? "9+" : r.unread}</span>}
                  <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
                </SmartLink>
              </li>
            );
          })}
        </ul>
      )}

      {active.length === 0 && (
        <CoachEmpty
          icon={<Users size={26} strokeWidth={1.75} aria-hidden />}
          text={none ? tr("هنوز مربی‌ای نداری. یه مربی پیدا کن تا کنارت باشه.", "You don't have a mentor yet. Find one to be by your side.") : tr("الان مربی فعالی نداری", "You have no active mentors right now")}
          action={<SmartLink href="/mentors" className="btn btn-primary"><Search size={15} strokeWidth={1.75} aria-hidden /> {tr("پیدا کردن مربی", "Find a mentor")}</SmartLink>}
        />
      )}

      {outgoing.length > 0 && (
        <section className="cs-fold">
          <button type="button" className="btn btn-ghost cs-fold-btn" aria-expanded={openSent} aria-controls="cs-sent" onClick={() => setOpenSent((v) => !v)}>
            <span>{tr("درخواست‌هایی که فرستادی", "Requests you sent")}</span>
            <span className="cs-fold-count">{faNum(outgoing.length)}</span>
            <ChevronDown size={18} strokeWidth={1.75} className={openSent ? "is-open" : ""} aria-hidden />
          </button>
          {openSent && (
            <ul id="cs-sent" className="ch-list">
              {outgoing.map((r) => (
                <li key={r.id} className="ch-row cs-fold-row">
                  <CoachAvatar user={r.counterpart} size={40} />
                  <span className="ch-row-main">
                    <SmartLink href={`/mentors/${r.counterpart.id}`} className="ch-row-title cs-link">{nameOf(r)}</SmartLink>
                    <span className="ch-row-sub">{tr("منتظر جواب", "Waiting for a reply")} · {fmtRelative(r.createdAt)}</span>
                    {rowError(r.id)}
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { clearError(); setActionFor(r.id); setConfirmCancel(r); }} disabled={!!pendingKey}>
                    {tr("لغو درخواست", "Cancel request")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {past.length > 0 && (
        <section className="cs-fold">
          <button type="button" className="btn btn-ghost cs-fold-btn" aria-expanded={openPast} aria-controls="cs-past" onClick={() => setOpenPast((v) => !v)}>
            <span>{tr("همکاری‌های قبلی", "Past mentorships")}</span>
            <span className="cs-fold-count">{faNum(past.length)}</span>
            <ChevronDown size={18} strokeWidth={1.75} className={openPast ? "is-open" : ""} aria-hidden />
          </button>
          {openPast && (
            <ul id="cs-past" className="ch-list">
              {past.map((r) => (
                <li key={r.id} className="ch-row cs-fold-row">
                  <CoachAvatar user={r.counterpart} size={40} />
                  <span className="ch-row-main">
                    <SmartLink href={r.status === "ENDED" ? `/mentorship/${r.id}` : `/mentors/${r.counterpart.id}`} className="ch-row-title cs-link">{nameOf(r)}</SmartLink>
                    <span className="ch-row-sub">{pastLabel()[r.status] ?? ""}{r.status === "ENDED" && r.endedAt ? ` · ${fmtDate(r.endedAt)}` : ""}</span>
                    {rowError(r.id)}
                  </span>
                  {r.status === "BLOCKED" && r.blockedByMe && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => { clearError(); act(r, "unblock"); }} disabled={!!pendingKey}>
                      {busy(`unblock:${r.id}`) ? <Spinner size={14} /> : tr("رفع مسدودی", "Unblock")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {active.length > 0 && <SmartLink href="/mentors" className="btn btn-ghost">{tr("پیدا کردن مربی تازه", "Find a new mentor")}</SmartLink>}

      {confirmCancel && (
        <MentorConfirmDialog
          message={tr(`درخواست به ${publicUserName(confirmCancel.counterpart)} لغو بشه؟`, `Cancel your request to ${publicUserName(confirmCancel.counterpart)}?`)}
          hint={tr("بعدا می‌تونی دوباره درخواست بدی.", "You can send a request again later.")}
          confirmLabel={tr("لغو درخواست", "Cancel request")}
          busy={busy(`cancel:${confirmCancel.id}`)}
          error={actionError}
          onConfirm={() => act(confirmCancel, "cancel")}
          onCancel={() => { setConfirmCancel(null); clearError(); }}
        />
      )}
    </div>
  );
}

/** تنها مربی فعال: کارت مربی، هدف، برنامه‌ی تازه، کارهای امروز و دو دکمه */
function SingleCoach({ row, space, line, nameNode }: { row: MentorshipRow; space?: CoachSpaceData; line: string; nameNode: React.ReactNode }) {
  const name = publicUserName(row.counterpart);
  const tasks = space?.todayTasks ?? null;
  const goal = space?.goal && space.goal.status !== "ENDED" ? space.goal : null;
  const pending = space?.pendingProgram ?? null;
  const spaceHref = `/mentorship/${row.id}`;
  return (
    <>
      <section className="ch-card ch-card-lg cs-coach-card" aria-label={tr("مربی من", "My mentor")}>
        <CoachAvatar user={row.counterpart} size={64} />
        <div className="cs-coach-body">
          <h2 className="cs-coach-name">{nameNode}</h2>
          {line && <p className="cs-muted">{line}</p>}
        </div>
      </section>

      {goal && <CoachGoalCard goal={goal} />}

      {pending && (
        <SmartLink href={spaceHref} className="ch-card cs-strip">
          <span className="cs-strip-body">
            <span className="cs-strip-title">{tr(`${name} برات برنامه‌ی تازه فرستاده`, `${name} sent you a new program`)}</span>
            <span className="cs-muted">{pending.title}</span>
          </span>
          <span className="cs-strip-go">{tr("ببین", "View")}</span>
        </SmartLink>
      )}

      {tasks && tasks.length > 0 && (
        <section className="ch-card cs-side-card" aria-label={tr("امروز", "Today")}>
          <h2 className="ch-section-title">{tr("امروز", "Today")}</h2>
          <ul className="ch-list">
            {tasks.map((t) => (
              <li key={t.id} className="cs-task">
                <TickButton as="span" checked={t.done} size={22} />
                <span className="ch-row-main">
                  <span className={`ch-row-title${t.done ? " is-done" : ""}`}>{t.title}</span>
                  {t.meta && <span className="ch-row-sub">{t.meta}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="cs-home-actions">
        <SmartLink href={`/account/general/mentors?mentorship=${encodeURIComponent(row.id)}`} className="btn btn-ghost">{tr(`${name} چی می‌بینه؟`, `What can ${name} see?`)}</SmartLink>
        <SmartLink href={spaceHref} className="btn btn-primary">{tr(`پیام به ${name}`, `Message ${name}`)}</SmartLink>
      </div>
    </>
  );
}
