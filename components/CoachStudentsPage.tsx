"use client";

import "./coach.css";
import "./coach-pages.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, MessageSquare, MoreHorizontal, UserPlus } from "lucide-react";
import { SmartLink } from "./SmartLink";
import { PageLoader } from "./PageLoader";
import { SegmentedTabs } from "./SegmentedTabs";
import { CoachPanelShell } from "./CoachPanelShell";
import { CoachAvatar } from "./CoachAvatar";
import { CoachEmpty } from "./CoachEmpty";
import { CoachSheet } from "./CoachSheet";
import { MentorDashError, mentorApi } from "./MentorDashKit";
import { MentorWaitlistSection } from "./MentorWaitlistSection";
import { useMentorSelf } from "./MentorPanelNav";
import { useLiveRefresh } from "@/lib/liveSync";
import { studentStatusText } from "@/lib/mentorStatus";
import { publicUserName } from "@/lib/mentorTypes";
import type { CoachStudentRow } from "@/lib/coachTypes";
import { tr } from "@/lib/i18n";

const InviteSheet = dynamic(() => import("./MentorTodayInvite").then((m) => m.MentorTodayInviteSheet), { ssr: false });
const BroadcastSheet = dynamic(() => import("./MentorBroadcast").then((m) => m.MentorBroadcastSheet), { ssr: false });

type Filter = "all" | "help" | "near";

/** سازگاری: اگه سرور هنوز شکل قدیمی (student به‌جای user) بده، همون رو به CoachStudentRow برمی‌گردونیم */
function normalize(raw: unknown): CoachStudentRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any) => ({
    mentorshipId: r.mentorshipId,
    user: r.user ?? r.student,
    weekRate: r.weekRate ?? null,
    idleDays: r.idleDays ?? 0,
    paused: !!r.paused,
    unread: r.unread ?? 0,
    goal: r.goal ?? null,
    labels: r.labels ?? [],
    needsHelp: !!r.needsHelp,
    nearGoal: !!r.nearGoal,
  })).filter((r) => r.mentorshipId && r.user);
}

export function CoachStudentsPage() {
  const self = useMentorSelf();
  const [rows, setRows] = useState<CoachStudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bcOpen, setBcOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    const r = await mentorApi<{ students: unknown }>("/api/mentor/students");
    if (!r.ok) { if (!silent) setError(r.error); return; }
    setRows(normalize(r.data.students));
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh("mentor", () => { load(true); });

  // /mentor/students?invite=1 (از حالت خالی امروز) شیت دعوت را باز می‌کند
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("invite") === "1") {
        setInviteOpen(true);
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch { /* بدون پارامتر */ }
  }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "help" && !r.needsHelp) return false;
      if (filter === "near" && !r.nearGoal) return false;
      if (!needle) return true;
      return `${publicUserName(r.user)} ${r.user.username ?? ""}`.toLowerCase().includes(needle);
    });
  }, [rows, q, filter]);

  const profile = self.profile;
  const actions = (
    <>
      <button type="button" className="btn btn-ghost btn-icon" onClick={() => setInviteOpen(true)} aria-label={tr("دعوت شاگرد", "Invite a student")}>
        <UserPlus size={20} aria-hidden="true" />
      </button>
      <button type="button" className="btn btn-ghost btn-icon" onClick={() => setMenuOpen(true)} aria-label={tr("بیشتر", "More")} aria-haspopup="dialog">
        <MoreHorizontal size={20} aria-hidden="true" />
      </button>
    </>
  );

  let body: React.ReactNode;
  if (error && !rows) body = <MentorDashError message={error} onRetry={() => load()} />;
  else if (!rows) body = <PageLoader />;
  else {
    body = (
      <>
        {rows.length > 0 && (
          <div className="ch-stack">
            <div className="chp-search">
              <input
                type="search" className="trade-glass-field" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tr("جست‌وجوی شاگرد", "Search students")} aria-label={tr("جست‌وجوی شاگرد", "Search students")}
              />
            </div>
            <SegmentedTabs<Filter>
              active={filter} onChange={setFilter} ariaLabel={tr("فیلتر شاگردها", "Filter students")}
              options={[
                { value: "all", label: tr("همه", "All") },
                { value: "help", label: tr("کمک لازم", "Needs help") },
                { value: "near", label: tr("نزدیک هدف", "Near goal") },
              ]}
            />
          </div>
        )}
        {rows.length === 0 ? (
          <CoachEmpty
            icon={<UserPlus size={28} aria-hidden="true" />}
            text={tr("هنوز شاگردی نداری. اولین نفر رو دعوت کن.", "No students yet. Invite your first one.")}
            action={<button type="button" className="btn btn-primary" onClick={() => setInviteOpen(true)}>{tr("دعوت شاگرد", "Invite a student")}</button>}
          />
        ) : shown.length === 0 ? (
          <CoachEmpty text={tr("کسی با این فیلتر پیدا نشد", "Nobody matches this filter")} />
        ) : (
          <ul className="ch-list">
            {shown.map((r) => {
              const st = studentStatusText({ rate: r.weekRate == null ? null : r.weekRate / 100, idleDays: r.idleDays, paused: r.paused });
              const goalLine = r.goal ? tr(`${r.goal.weeksLeft} هفته تا هدف`, `${r.goal.weeksLeft} ${r.goal.weeksLeft === 1 ? "week" : "weeks"} to goal`) : null;
              return (
                <li key={r.mentorshipId}>
                  <SmartLink href={`/mentor/students/${r.user.id}`} className="ch-row">
                    <CoachAvatar user={r.user} size={44} ring={r.paused ? null : r.weekRate} />
                    <span className="ch-row-main">
                      <span className="ch-row-title">
                        {publicUserName(r.user)}
                        {r.unread > 0 && <span className="ch-dot" role="img" aria-label={tr("پیام تازه", "New message")} />}
                      </span>
                      <span className={`ch-row-sub${st.tone === "warn" ? " chp-tone-warn" : st.tone === "ok" ? " chp-tone-ok" : ""}`}>
                        {st.text}{goalLine ? ` · ${goalLine}` : ""}
                      </span>
                    </span>
                    <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
                  </SmartLink>
                </li>
              );
            })}
          </ul>
        )}
        <div className="chp-wait"><MentorWaitlistSection /></div>
      </>
    );
  }

  return (
    <CoachPanelShell title={tr("شاگردها", "Students")} action={actions}>
      {body}
      <CoachSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={tr("بیشتر", "More")} size="sm">
        <ul className="ch-list">
          <li>
            <button type="button" className="ch-row" onClick={() => { setMenuOpen(false); setBcOpen(true); }}>
              <MessageSquare size={20} aria-hidden="true" />
              <span className="ch-row-main"><span className="ch-row-title">{tr("پیام به همه", "Message everyone")}</span></span>
            </button>
          </li>
        </ul>
      </CoachSheet>
      {inviteOpen && (
        <InviteSheet open onClose={() => setInviteOpen(false)} suspended={!!profile?.suspendedAt} categories={profile?.categories ?? []} onSent={() => load(true)} />
      )}
      {bcOpen && <BroadcastSheet open onClose={() => setBcOpen(false)} activeCount={rows?.filter((r) => !r.paused).length ?? 0} />}
    </CoachPanelShell>
  );
}
