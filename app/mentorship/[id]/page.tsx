"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarCheck, Check, ChevronLeft, ClipboardList, Dumbbell, Inbox, Lock, MessageCircle, Pencil, Plus, ShieldCheck, X,
} from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorList, MentorListItem } from "@/components/MentorMotion";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorshipStateNote } from "@/components/MentorshipStateNote";
import { MentorshipStatusBadge, ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { ProgramRespondModal } from "@/components/ProgramRespondModal";
import { MentorKebabMenu } from "@/components/MentorKebabMenu";
import { useMentorshipActions } from "@/components/MentorshipActions";
import { useMentorshipRelation, type Relation } from "@/components/useMentorshipRelation";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "@/components/MentorTermsAcceptance";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import type { ProgramRow, ProgramsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { categoryLabel } from "@/components/MentorBadges";
import { fmtDate, fmtDay, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
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
    : { href: "/mentorship", label: "مربی‌های من" };
  const name = rel ? publicUserName(rel.row.counterpart) : "";

  const head = rel ? (
    <div className="mentor-head-custom">
      <MentorUserAvatar name={name} avatarUrl={rel.row.counterpart.avatarUrl} size={48} />
      <div className="mentor-rel-id">
        <h1><GoldenName golden={rel.row.counterpart.golden} staff={rel.row.counterpart.staff}>{name}</GoldenName></h1>
        <div className="mentor-rel-sub">
          <span>{rel.role === "student" ? "مربی تو" : "شاگرد تو"}</span>
          <MentorshipStatusBadge status={rel.row.status} />
          {rel.row.startedAt && <span>از {fmtDate(rel.row.startedAt)}</span>}
        </div>
      </div>
      <MentorKebabMenu actions={actions} label="گزینه‌های رابطه" />
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
  const chatOpen = row.status === "ACTIVE" || row.status === "ENDED";
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
      if (!res.ok) { setProgramsError(await readApiError(res, "برنامه‌ها دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: ProgramsResponse = await res.json();
      setPrograms(d.programs || []);
    } catch {
      setProgramsError(NETWORK_ERROR);
    }
  }, [row.id, role]);
  useEffect(() => { loadPrograms(); }, [loadPrograms]);
  // زنده: برنامه‌ی تازه/پاسخ طرف مقابل همون لحظه
  useLiveRefresh("mentor:program", () => { loadPrograms(); });
  useVisiblePolling(() => { loadPrograms(); }, 30_000);

  async function answer(action: "accept" | "reject") {
    if (action === "accept" && needTerms && !termsChecked) { setTermsError("برای پذیرش، شرایط را بپذیر"); return; }
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
      setActionError({ key: "rel", msg: NETWORK_ERROR });
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
      setActionError({ key: p.id, msg: NETWORK_ERROR });
    } finally {
      setBusy(null);
    }
  }

  const waiting = useMemo(() => (role === "student" ? (programs ?? []).filter((p) => p.status === "PENDING") : []), [programs, role]);
  const others = useMemo(() => (programs ?? []).filter((p) => !waiting.includes(p)), [programs, waiting]);

  const programsSection = (
    <MentorSection
      title="برنامه‌ها"
      icon={<ClipboardList {...SECTION} />}
      count={others.length ? faNum(others.length) : undefined}
      action={
        role === "mentor" && row.status === "ACTIVE" ? (
          <Link href={`/mentor/programs/new?mentorshipId=${encodeURIComponent(row.id)}`} className="mentor-text-btn">
            <Plus {...BTN_SM} /> برنامه‌ی جدید
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
          {waiting.length ? "برنامه‌ی دیگری نیست" : role === "student" ? "هنوز برنامه‌ای از این مربی نرسیده است" : "هنوز برنامه‌ای برای این شاگرد نساخته‌ای"}
        </MentorEmpty>
      ) : (
        <MentorList>
          {others.map((p) => (
            <MentorListItem key={p.id}>
              <MentorRow
                href={`/mentor-programs/${p.id}`}
                lead={p.type === "WORKOUT" ? <Dumbbell {...ROW} /> : <CalendarCheck {...ROW} />}
                title={p.title}
                sub={<ProgramFacts p={p} />}
                end={<ProgramStatusBadge status={p.status} />}
                below={p.note?.trim() ? <MentorNote note={p.note} role={role} /> : undefined}
              />
            </MentorListItem>
          ))}
        </MentorList>
      )}
    </MentorSection>
  );

  return (
    <>
      {iMustAnswer && (
        <MentorSection title={role === "student" ? "دعوت مربی‌گری" : "درخواست مربی‌گری"} icon={<Inbox {...SECTION} />}>
          <div className="mentor-form mentor-decision">
            {row.categories.length > 0 && (
              <div className="mentor-chips">
                {row.categories.map((c) => <span key={c} className="mentor-chip is-cat"><span>{categoryLabel(c)}</span></span>)}
              </div>
            )}
            {row.message && <p className="mentor-quote">{row.message}</p>}
            {needTerms && (
              <MentorTermsAcceptance role="student" checked={termsChecked} onChange={(v) => { setTermsChecked(v); setTermsError(null); }} error={termsError} />
            )}
            {actionError?.key === "rel" && <div className="form-inline-error" role="alert">{actionError.msg}</div>}
            <div className="mentor-form-actions">
              <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => answer("reject")} disabled={!!busy}>
                {busy === "reject" ? <Spinner size={14} /> : <><X {...BTN} /> رد {role === "student" ? "دعوت" : "درخواست"}</>}
              </button>
              <button type="button" className="trade-primary-btn mentor-btn" onClick={() => answer("accept")} disabled={!!busy || (needTerms && !termsChecked)}>
                {busy === "accept" ? <Spinner size={14} /> : <><Check {...BTN} /> پذیرفتن</>}
              </button>
            </div>
          </div>
        </MentorSection>
      )}

      <MentorshipStateNote row={row} role={role} />

      {waiting.length > 0 && (
        <MentorSection title="برنامه‌ی تازه؛ منتظر پاسخ تو" icon={<Inbox {...SECTION} />} count={faNum(waiting.length)}>
          <MentorList>
            {waiting.map((p) => (
              <MentorListItem key={p.id}>
                <div className="mentor-decision-card">
                  <Link href={`/mentor-programs/${p.id}`} className="mentor-decision-title">
                    {p.type === "WORKOUT" ? <Dumbbell {...ROW} /> : <CalendarCheck {...ROW} />}
                    <span>{p.title}</span>
                    <ChevronLeft size={16} strokeWidth={1.75} className="mentor-row-chevron" aria-hidden />
                  </Link>
                  <div className="mentor-row-sub"><ProgramFacts p={p} /></div>
                  {p.note?.trim() && <MentorNote note={p.note} role={role} />}
                  {actionError?.key === p.id && <div className="form-inline-error" role="alert">{actionError.msg}</div>}
                  <div className="mentor-form-actions">
                    <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => setRespond({ id: p.id, action: "reject" })} disabled={!!busy}>
                      <X {...BTN} /> رد
                    </button>
                    <button type="button" className="account-outline-btn mentor-btn" onClick={() => setRespond({ id: p.id, action: "request_changes" })} disabled={!!busy}>
                      <Pencil {...BTN} /> درخواست تغییر
                    </button>
                    <button type="button" className="trade-primary-btn mentor-btn" onClick={() => acceptProgram(p)} disabled={!!busy}>
                      {busy === `accept:${p.id}` ? <Spinner size={14} /> : <><Check {...BTN} /> پذیرفتن برنامه</>}
                    </button>
                  </div>
                </div>
              </MentorListItem>
            ))}
          </MentorList>
        </MentorSection>
      )}

      {(chatOpen || role === "student") && (
        <MentorSection flush>
          {chatOpen && <MentorRow
            href={`/mentorship/${row.id}/chat`}
            lead={<MessageCircle {...ROW} />}
            title="گفت‌وگو"
            sub={
              row.unread > 0
                ? <span>{faNum(row.unread)} پیام تازه</span>
                : <span><Lock size={12} strokeWidth={1.75} aria-hidden /> رمزگذاری سرتاسری{row.status === "ENDED" ? "؛ فقط‌خواندنی" : ""}</span>
            }
            end={row.unread > 0 ? <span className="mentor-unread" aria-label={`${faNum(row.unread)} پیام خوانده‌نشده`}>{faNum(row.unread)}</span> : undefined}
          />}
          {role === "student" && (
            <MentorRow
              href={privacyHref}
              lead={<ShieldCheck {...ROW} />}
              title="دسترسی‌ها"
              sub={<span>{name} چه بخشی از روتینت را ببیند</span>}
            />
          )}
        </MentorSection>
      )}

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
      <span>{p.type === "WORKOUT" ? "تمرینی" : "روتین"}</span>
      {p.version > 1 && <span>نسخه‌ی {faNum(p.version)}</span>}
      {p.startDate && <span>{p.endDate ? `${fmtDay(p.startDate)} تا ${fmtDay(p.endDate)}` : `از ${fmtDay(p.startDate)}`}</span>}
      {(p.status === "ACTIVE" || p.status === "COMPLETED") && !p.progress.hidden && <span>{faNum(p.progress.rate)}٪ پایبندی</span>}
      {p.status === "PENDING" && p.sentAt && <span>ارسال {fmtRelative(p.sentAt)}</span>}
    </>
  );
}

/** یادداشت منتور روی برنامه — برچسب‌دار تا با توضیح برنامه اشتباه نشود */
function MentorNote({ note, role }: { note: string; role: Role }) {
  return (
    <div className="mentor-note-box mentor-program-note">
      <b>{role === "student" ? "یادداشت مربی" : "یادداشت تو برای شاگرد"}</b>
      <div>{note.trim()}</div>
    </div>
  );
}
