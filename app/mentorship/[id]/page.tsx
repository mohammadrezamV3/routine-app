"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarCheck, ClipboardList, Dumbbell, MessageCircle, Plus, ShieldCheck, User } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorList, MentorListItem } from "@/components/MentorMotion";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorshipStateNote } from "@/components/MentorshipStateNote";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { ProgramRespondModal } from "@/components/ProgramRespondModal";
import { MentorKebabMenu } from "@/components/MentorKebabMenu";
import { useMentorshipActions } from "@/components/MentorshipActions";
import { useMentorshipRelation, type Relation } from "@/components/useMentorshipRelation";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "@/components/MentorTermsAcceptance";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { GradientRing } from "@/components/GradientRing";
import type { ProgramDetailResponse, ProgramRow, ProgramsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { categoryLabel } from "@/components/MentorBadges";
import { fmtDate, fmtDay, fmtRelative, networkError, readApiError } from "@/lib/mentorFormat";
import { tr } from "@/lib/i18n";
import { faNum } from "@/lib/jalali";
import { GoldenName } from "@/components/GoldenName";

type Role = "student" | "mentor";

const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const ROW = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * صفحه‌ی یک رابطه‌ی منتوری (هر دو طرف). ترتیب عمدا بر اساس «چه کاری الان
 * با توست»:
 *   ۱. پاسخ به دعوت/درخواست (اگر منتظر توست)
 *   ۲. برنامه‌های تازه‌ای که منتظر پاسخ تو هستند، با یادداشت منتور و دکمه‌های پذیرش
 *   ۳. ورود به گفت‌وگو (صفحه‌ی جدا: /mentorship/[id]/chat)
 *   ۴. برای شاگرد یک ردیف «دسترسی‌ها» → تنظیمات پنل کاربری (/account/general/mentors)
 *   ۵. برنامه‌ها (هر کدام با یادداشت منتور)
 * اقدام‌های مخرب (پایان، لغو، مسدودی، گزارش گفت‌وگو) فقط در منوی سه‌نقطه‌ی سر.
 */
export default function MentorshipPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { rel, error, reload } = useMentorshipRelation(id);
  const { actions, dialogs } = useMentorshipActions({
    rel,
    onChanged: reload,
    onReportConversation: () => router.push(`/mentorship/${id}/chat?report=1`),
  });

  const back = rel?.role === "mentor"
    ? { href: `/mentor/students/${rel.row.counterpart.id}`, label: publicUserName(rel.row.counterpart) }
    : { href: "/mentorship", label: tr("مربی‌های من", "My mentors") };
  const name = rel ? publicUserName(rel.row.counterpart) : "";
  const chatOpen = !!rel && (rel.row.status === "ACTIVE" || rel.row.status === "ENDED");

  const head = rel ? (
    <div className="mv2-ms-head">
      <div className="mv2-ms-head-kebab">
        <MentorKebabMenu actions={actions} label={tr("گزینه‌های همکاری", "Mentorship options")} />
      </div>
      <MentorUserAvatar name={name} avatarUrl={rel.row.counterpart.avatarUrl} size={72} />
      <h1><GoldenName golden={rel.row.counterpart.golden} staff={rel.row.counterpart.staff}>{name}</GoldenName></h1>
      <p className="mv2-ms-role">
        {[
          rel.role === "student" ? tr("مربی تو", "Your mentor") : tr("شاگرد تو", "Your student"),
          rel.row.categories.map((c) => categoryLabel(c)).join(tr("، ", ", ")),
          rel.row.startedAt ? tr(`از ${fmtDate(rel.row.startedAt)}`, `Since ${fmtDate(rel.row.startedAt)}`) : "",
        ].filter(Boolean).join(" · ")}
      </p>
      <div className="mv2-ms-head-actions">
        {chatOpen && (
          <Link href={`/mentorship/${id}/chat`} className="trade-primary-btn mentor-btn">
            <MessageCircle {...BTN} /> {tr("گفت‌وگو", "Chat")}
            {rel.row.unread > 0 && <span className="mv2-ms-badge" aria-label={tr(`${faNum(rel.row.unread)} پیام تازه`, `${faNum(rel.row.unread)} new ${rel.row.unread === 1 ? "message" : "messages"}`)}>{faNum(rel.row.unread)}</span>}
          </Link>
        )}
        {rel.role === "student" ? (
          <Link href={`/account/general/mentors?mentorship=${encodeURIComponent(id)}`} className="account-outline-btn mentor-btn">
            <ShieldCheck {...BTN} /> {tr("چی می‌بینه؟", "What can they see?")}
          </Link>
        ) : (
          <Link href={`/mentor/students/${rel.row.counterpart.id}`} className="account-outline-btn mentor-btn">
            <User {...BTN} /> {tr("صفحه‌ی شاگرد", "Student page")}
          </Link>
        )}
      </div>
    </div>
  ) : null;

  return (
    <MentorPageShell back={rel || error ? back : null} head={head} surface={!!rel}>
      {error ? (
        <MentorErrorState message={error.msg} onRetry={error.retry ? reload : undefined} />
      ) : !rel ? (
        <LoadingBlock />
      ) : (
        <Relationship rel={rel} reload={reload} />
      )}
      {dialogs}
    </MentorPageShell>
  );
}

function Relationship({ rel, reload }: { rel: Relation; reload: () => void }) {
  const { row, role } = rel;
  const router = useRouter();
  const name = publicUserName(row.counterpart);
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [respond, setRespond] = useState<{ id: string; action: "reject" | "request_changes" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ key: string; msg: string } | null>(null);
  const terms = useMentorTermsStatus();
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [forceTerms, setForceTerms] = useState(false);

  const isPending = row.status === "PENDING";
  const iMustAnswer = isPending && ((role === "student" && row.initiatedBy === "MENTOR") || (role === "mentor" && row.initiatedBy === "STUDENT"));
  const needTerms = role === "student" && iMustAnswer && (forceTerms || (!terms.loading && !terms.studentAccepted));

  // «دسترسی‌ها» به تنظیمات پنل کاربری منتقل شد؛ لینک قدیمی ?tab=privacy همان‌جا می‌رود
  const privacyHref = `/account/general/mentors?mentorship=${encodeURIComponent(row.id)}`;
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "privacy" && role === "student") router.replace(privacyHref);
  }, [role, router, privacyHref]);

  const loadPrograms = useCallback(async () => {
    setProgramsError(null);
    try {
      const res = await fetch(`/api/mentor-programs?role=${role}&mentorshipId=${encodeURIComponent(row.id)}`, { cache: "no-store" });
      if (!res.ok) { setProgramsError(await readApiError(res, tr("برنامه‌ها دریافت نشد؛ دوباره تلاش کن", "Couldn't load programs. Try again"))); return; }
      const d: ProgramsResponse = await res.json();
      setPrograms(d.programs || []);
    } catch {
      setProgramsError(networkError());
    }
  }, [row.id, role]);
  useEffect(() => { loadPrograms(); }, [loadPrograms]);
  // زنده: برنامه‌ی تازه/پاسخ طرف مقابل همون لحظه
  useLiveRefresh("mentor:program", () => { loadPrograms(); });
  useVisiblePolling(() => { loadPrograms(); }, 30_000);

  async function answer(action: "accept" | "reject") {
    if (action === "accept" && needTerms && !termsChecked) { setTermsError(tr("برای پذیرش، شرایط را بپذیر", "Accept the terms to continue")); return; }
    setBusy(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/mentorships/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "accept" ? mentorTermsPayload(needTerms && termsChecked) : {}) }),
      });
      if (!res.ok) {
        const j = await res.clone().json().catch(() => null);
        if (isMentorTermsError(j)) { setForceTerms(true); setTermsChecked(false); setTermsError(j?.error ?? null); return; }
        setActionError({ key: "rel", msg: await readApiError(res) });
        return;
      }
      if (action === "accept") terms.refresh();
      reload();
      loadPrograms();
    } catch {
      setActionError({ key: "rel", msg: networkError() });
    } finally {
      setBusy(null);
    }
  }

  async function acceptProgram(p: ProgramRow) {
    setBusy(`accept:${p.id}`);
    setActionError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${p.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) { setActionError({ key: p.id, msg: await readApiError(res) }); return; }
      loadPrograms();
    } catch {
      setActionError({ key: p.id, msg: networkError() });
    } finally {
      setBusy(null);
    }
  }

  const waiting = useMemo(() => (role === "student" ? (programs ?? []).filter((p) => p.status === "PENDING") : []), [programs, role]);
  const others = useMemo(() => (programs ?? []).filter((p) => !waiting.includes(p)), [programs, waiting]);
  const running = others.filter((p) => p.status === "ACTIVE" || p.status === "ACCEPTED");
  const rest = others.filter((p) => !running.includes(p));

  // خلاصه‌ی کارهای برنامه‌ی منتظر جواب (چند عنوان اول)
  const [itemsById, setItemsById] = useState<Record<string, string[]>>({});
  const waitingKey = waiting.map((p) => p.id).join(",");
  useEffect(() => {
    let alive = true;
    for (const p of waiting) {
      fetch(`/api/mentor-programs/${p.id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: ProgramDetailResponse | null) => {
          if (alive && d) setItemsById((prev) => ({ ...prev, [p.id]: d.items.map((i) => i.title) }));
        })
        .catch(() => {});
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingKey]);

  const programRow = (p: ProgramRow) => (
    <MentorListItem key={p.id}>
      <MentorRow
        href={`/mentor-programs/${p.id}`}
        lead={
          p.status === "ACTIVE" && !p.progress.hidden ? (
            <GradientRing value={Math.max(0, Math.min(1, p.progress.rate > 1 ? p.progress.rate / 100 : p.progress.rate))} size={40} stroke={4}>
              {p.type === "WORKOUT" ? <Dumbbell size={14} strokeWidth={1.75} aria-hidden /> : <CalendarCheck size={14} strokeWidth={1.75} aria-hidden />}
            </GradientRing>
          ) : p.type === "WORKOUT" ? <Dumbbell {...ROW} /> : <CalendarCheck {...ROW} />
        }
        title={p.title}
        sub={<ProgramFacts p={p} />}
        end={<ProgramStatusBadge status={p.status} />}
        below={p.note?.trim() ? <MentorNote note={p.note} role={role} /> : undefined}
      />
    </MentorListItem>
  );

  const programsSection = (
    <MentorSection
      title={tr("برنامه‌ها", "Programs")}
      icon={<ClipboardList {...SECTION} />}
      count={others.length ? faNum(others.length) : undefined}
      action={
        role === "mentor" && row.status === "ACTIVE" ? (
          <Link href={`/mentor/programs/new?mentorshipId=${encodeURIComponent(row.id)}`} className="mentor-text-btn">
            <Plus {...BTN_SM} /> {tr("برنامه‌ی جدید", "New program")}
          </Link>
        ) : undefined
      }
      flush
    >
      {programsError ? (
        <MentorErrorState message={programsError} onRetry={loadPrograms} />
      ) : programs === null ? (
        <LoadingBlock />
      ) : others.length === 0 ? (
        <MentorEmpty>
          {waiting.length ? tr("برنامه‌ی دیگه‌ای نیست", "No other programs") : role === "student" ? tr("هنوز برنامه‌ای از این مربی نرسیده", "No programs from this mentor yet") : tr("هنوز برنامه‌ای برای این شاگرد نساخته‌ای", "You haven't created a program for this student yet")}
        </MentorEmpty>
      ) : (
        <>
          {running.length > 0 && (
            <>
              <h3 className="mv2-ms-sub">{tr("در حال اجرا", "In progress")}</h3>
              <MentorList>{running.map(programRow)}</MentorList>
            </>
          )}
          {rest.length > 0 && (
            <>
              {running.length > 0 && <h3 className="mv2-ms-sub">{tr("بقیه", "Others")}</h3>}
              <MentorList>{rest.map(programRow)}</MentorList>
            </>
          )}
        </>
      )}
    </MentorSection>
  );

  return (
    <>
      {iMustAnswer && (
        <section className="mv2-ms-invite" aria-label={role === "student" ? tr("دعوت مربی", "Mentor invitation") : tr("درخواست شاگرد", "Student request")}>
          <p className="mv2-ms-invite-text">
            {role === "student" ? tr(`${name} دعوتت کرده مربی‌ت باشه`, `${name} invited you to be your mentor`) : tr(`${name} می‌خواد شاگردت باشه`, `${name} wants to be your student`)}
            {row.categories.length > 0 && <span className="mv2-ms-meta">{row.categories.map((c) => categoryLabel(c)).join(tr("، ", ", "))}</span>}
          </p>
          {row.message && <p className="mentor-quote">{row.message}</p>}
          {needTerms && (
            <MentorTermsAcceptance role="student" checked={termsChecked} onChange={(v) => { setTermsChecked(v); setTermsError(null); }} error={termsError} />
          )}
          {actionError?.key === "rel" && <div className="form-inline-error" role="alert">{actionError.msg}</div>}
          <div className="mv2-ms-invite-actions">
            <button type="button" className="trade-primary-btn mentor-btn" onClick={() => answer("accept")} disabled={!!busy || (needTerms && !termsChecked)}>
              {busy === "accept" ? <Spinner size={14} /> : tr("قبول", "Accept")}
            </button>
            <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => answer("reject")} disabled={!!busy}>
              {busy === "reject" ? <Spinner size={14} /> : tr("نه، ممنون", "No, thanks")}
            </button>
          </div>
        </section>
      )}

      <MentorshipStateNote row={row} role={role} />

      {waiting.map((p) => {
        const titles = itemsById[p.id] ?? [];
        return (
          <section key={p.id} className="mv2-ms-invite" aria-label={tr("برنامه‌ی تازه", "New program")}>
            <p className="mv2-ms-invite-text">
              <b>{name}</b> {tr("یه برنامه‌ی تازه برات فرستاده", "sent you a new program")}
              <Link href={`/mentor-programs/${p.id}`} className="mv2-ms-name">{p.title}</Link>
              <span className="mv2-ms-meta"><ProgramFacts p={p} /></span>
            </p>
            {p.note?.trim() && <MentorNote note={p.note} role={role} />}
            {titles.length > 0 && (
              <ul className="mv2-ms-items">
                {titles.slice(0, 4).map((t, i) => <li key={i}>{t}</li>)}
                {titles.length > 4 && <li className="is-more">{tr(`و ${faNum(titles.length - 4)} مورد دیگه`, `and ${faNum(titles.length - 4)} more`)}</li>}
              </ul>
            )}
            {actionError?.key === p.id && <div className="form-inline-error" role="alert">{actionError.msg}</div>}
            <div className="mv2-ms-invite-actions is-three">
              <button type="button" className="trade-primary-btn mentor-btn" onClick={() => acceptProgram(p)} disabled={!!busy}>
                {busy === `accept:${p.id}` ? <Spinner size={14} /> : tr("قبول", "Accept")}
              </button>
              <button type="button" className="account-outline-btn mentor-btn" onClick={() => setRespond({ id: p.id, action: "request_changes" })} disabled={!!busy}>
                {tr("تغییر بخواه", "Ask for changes")}
              </button>
              <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => setRespond({ id: p.id, action: "reject" })} disabled={!!busy}>
                {tr("نه", "No")}
              </button>
            </div>
          </section>
        );
      })}

      {programsSection}

      {respond && (
        <ProgramRespondModal
          programId={respond.id}
          action={respond.action}
          onClose={() => setRespond(null)}
          onDone={() => { setRespond(null); loadPrograms(); }}
        />
      )}
    </>
  );
}

function ProgramFacts({ p }: { p: ProgramRow }) {
  return (
    <>
      <span>{p.type === "WORKOUT" ? tr("تمرینی", "Workout") : tr("روتین", "Routine")}</span>
      {p.version > 1 && <span> · {tr("ویرایش‌شده", "Edited")}</span>}
      {p.startDate && <span> · {p.endDate ? tr(`${fmtDay(p.startDate)} تا ${fmtDay(p.endDate)}`, `${fmtDay(p.startDate)} to ${fmtDay(p.endDate)}`) : tr(`از ${fmtDay(p.startDate)}`, `From ${fmtDay(p.startDate)}`)}</span>}
      {(p.status === "ACTIVE" || p.status === "COMPLETED") && !p.progress.hidden && <span> · {tr(`${faNum(Math.round(p.progress.rate))}٪ انجام شده`, `${faNum(Math.round(p.progress.rate))}% done`)}</span>}
      {p.status === "PENDING" && p.sentAt && <span> · {fmtRelative(p.sentAt)}</span>}
    </>
  );
}

/** یادداشت مربی روی برنامه، برچسب‌دار تا با توضیح برنامه اشتباه نشه */
function MentorNote({ note, role }: { note: string; role: Role }) {
  return (
    <div className="mentor-note-box mentor-program-note">
      <b>{role === "student" ? tr("یادداشت مربی", "Mentor's note") : tr("یادداشت تو برای شاگرد", "Your note to the student")}</b>
      <div>{note.trim()}</div>
    </div>
  );
}
