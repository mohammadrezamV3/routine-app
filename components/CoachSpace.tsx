"use client";

// فضای همکاری مربی و شاگرد (docs/coach-v3.md): یک خط زمانی از پیام‌ها، برنامه‌ها، گزارش هفته،
// هدف و بازخوردها. هر دو مسیر /mentor/students/[studentId] و /mentorship/[id] از همین استفاده می‌کنن.
import "./coach.css";
import "./coach-space.css";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Ban, CirclePause, CirclePlay, Download, Eye, Flag, LogOut, NotebookPen, Plus, Sparkles, Tag, Target, Lock } from "lucide-react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import type { CoachSpace as CoachSpaceData, CoachTimelineEvent } from "@/lib/coachTypes";
import { weekIndexOf } from "@/lib/coachWeek";
import { exportCsvUrl } from "@/lib/mentorToolsTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { tr } from "@/lib/i18n";
import { AuthGate } from "./AuthGate";
import { CoachAvatar } from "./CoachAvatar";
import { CoachChat, CoachSavedReplies, type CoachChatApi, type CoachChatSheet } from "./CoachChat";
import { CoachEmpty } from "./CoachEmpty";
import { CoachGoalPill } from "./CoachGoalPill";
import { CoachHeader } from "./CoachHeader";
import { CoachNomoLine } from "./CoachNomoLine";
import { CoachPress } from "./CoachPress";
import { CoachProgramCard } from "./CoachProgramCard";
import { CoachSheet, CoachSheetBody } from "./CoachSheet";
import { CoachWeekCard } from "./CoachWeekCard";
import { GoldenName } from "./GoldenName";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { mentorApi } from "./MentorDashKit";
import { MentorErrorState } from "./MentorPageShell";
import { MentorKebabMenu, type MentorMenuAction } from "./MentorKebabMenu";
import { MentorStudentRelationControls, type StudentRelationDialog } from "./MentorStudentRelationControls";
import { ProgramRespondModal } from "./ProgramRespondModal";
import { SmartLink } from "./SmartLink";
import { LoadingBlock, Spinner } from "./Spinner";

const CoachGoalSheet = dynamic(() => import("./CoachGoalSheet"), { ssr: false });
const CoachGoalShareSheet = dynamic(() => import("./CoachGoalShareSheet"), { ssr: false });
const CoachNotesSheet = dynamic(() => import("./CoachSpaceSheets").then((m) => m.CoachNotesSheet), { ssr: false });
const CoachLabelsSheet = dynamic(() => import("./CoachSpaceSheets").then((m) => m.CoachLabelsSheet), { ssr: false });
const CoachSeesSheet = dynamic(() => import("./CoachSpaceSheets").then((m) => m.CoachSeesSheet), { ssr: false });
const CoachMineSheet = dynamic(() => import("./CoachSpaceSheets").then((m) => m.CoachMineSheet), { ssr: false });
const CoachSpaceStudents = dynamic(() => import("./CoachSpaceSide").then((m) => m.CoachSpaceStudents), { ssr: false });
const CoachSpaceMentorSide = dynamic(() => import("./CoachSpaceSide").then((m) => m.CoachSpaceMentorSide), { ssr: false });
const CoachSpaceStudentSide = dynamic(() => import("./CoachSpaceSide").then((m) => m.CoachSpaceStudentSide), { ssr: false });

const IC = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

function useDesktop(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return on;
}

type SheetName = "goal" | "goalNew" | "share" | "notes" | "labels" | "sees" | "mine";

export function CoachSpace({ role, mentorshipId }: { role: "MENTOR" | "STUDENT"; mentorshipId: string }) {
  const { status } = useSession();
  if (status === "loading") return <div className="ch-page cs-page"><LoadingBlock /></div>;
  if (status === "unauthenticated") return <div className="ch-page cs-page"><AuthGate message={tr("برای استفاده از بخش مربی‌ها وارد شو", "Sign in to use the mentors section")} /></div>;
  return <SpaceBody role={role} mentorshipId={mentorshipId} />;
}

function SpaceBody({ role, mentorshipId }: { role: "MENTOR" | "STUDENT"; mentorshipId: string }) {
  const router = useRouter();
  const isMentor = role === "MENTOR";
  const desktop = useDesktop();
  const [data, setData] = useState<CoachSpaceData | null>(null);
  const [error, setError] = useState<{ msg: string; status: number } | null>(null);
  const [chatSheet, setChatSheet] = useState<CoachChatSheet>(null);
  const [chatReady, setChatReady] = useState(false);
  const [open, setOpen] = useState<SheetName | null>(null);
  const [mounted, setMounted] = useState<Partial<Record<SheetName, boolean>>>({});
  const [relation, setRelation] = useState<StudentRelationDialog | null>(null);
  const [confirm, setConfirm] = useState<"end" | "block" | null>(null);
  const [respond, setRespond] = useState<{ id: string; action: "reject" | "request_changes" } | null>(null);
  const [progBusy, setProgBusy] = useState<string | null>(null);
  const [progError, setProgError] = useState<{ id: string; msg: string } | null>(null);
  const [prefill, setPrefill] = useState<string | null | undefined>(undefined);
  const wantReport = useRef(false);
  const { pendingKey, error: actionError, run, clearError } = useAsyncAction();

  const load = useCallback(async () => {
    const r = await mentorApi<CoachSpaceData>(`/api/mentorships/${encodeURIComponent(mentorshipId)}/space`);
    if (r.status === -1) return;
    if (!r.ok) { setError({ msg: r.error, status: r.status }); return; }
    setError(null);
    setData(r.data);
  }, [mentorshipId]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh("mentor", () => { load(); });
  useVisiblePolling(() => { load(); }, 30_000);

  // ?draft= (از گزارش هفته: پیشنهاد نومو) و ?report=1 (لینک قدیمی) یک بار خونده و از آدرس برداشته می‌شن
  useEffect(() => {
    if (!data || prefill !== undefined) return;
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get("draft");
    setPrefill(d ? d.slice(0, 2000) : null);
    if (sp.get("report") === "1") wantReport.current = true;
    if (d || sp.has("report")) {
      sp.delete("draft");
      sp.delete("report");
      const q = sp.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
    }
  }, [data, prefill]);
  useEffect(() => {
    if (wantReport.current && chatReady) { wantReport.current = false; setChatSheet("report"); }
  }, [chatReady]);

  const show = (s: SheetName) => { setMounted((m) => ({ ...m, [s]: true })); setOpen(s); };
  const close = () => setOpen(null);

  if (error && !data) {
    if (error.status === 404 || error.status === 403) {
      return (
        <div className="ch-page cs-page">
          <CoachEmpty text={tr("این همکاری پیدا نشد یا به آن دسترسی نداری", "This mentorship wasn't found or you don't have access to it")} action={<SmartLink href={isMentor ? "/mentor/students" : "/mentorship"} className="btn btn-primary">{tr("برگشت", "Back")}</SmartLink>} />
        </div>
      );
    }
    return <div className="ch-page cs-page"><MentorErrorState message={error.msg} onRetry={load} /></div>;
  }
  if (!data) return <div className="ch-page cs-page"><LoadingBlock /></div>;

  const d = data;
  const peer = d.counterpart;
  const name = publicUserName(peer);
  const studentId = isMentor ? peer.id : "";
  const active = d.status === "ACTIVE";
  const chatOpen = active || d.status === "ENDED";
  const backHref = isMentor ? "/mentor/students" : "/mentorship";
  const goal = d.goal;

  // ── منوی سه‌نقطه ──
  const actions: MentorMenuAction[] = [];
  if (isMentor) {
    if (active) actions.push({ label: tr("هدف تازه", "New goal"), icon: <Target {...IC} />, onClick: () => show("goalNew") });
    actions.push({ label: tr("یادداشت من", "My notes"), icon: <NotebookPen {...IC} />, onClick: () => show("notes") });
    actions.push({ label: tr("برچسب‌ها", "Labels"), icon: <Tag {...IC} />, onClick: () => show("labels") });
    actions.push({ label: tr("چیزهایی که می‌بینم", "What I can see"), icon: <Eye {...IC} />, onClick: () => show("sees") });
    actions.push({ label: tr("خروجی CSV", "Export CSV"), icon: <Download {...IC} />, onClick: () => downloadCsv(studentId) });
    if (active) {
      actions.push(d.paused
        ? { label: tr("ادامه‌ی همکاری", "Resume"), icon: <CirclePlay {...IC} />, onClick: () => setRelation("resume") }
        : { label: tr("توقف موقت", "Pause"), icon: <CirclePause {...IC} />, onClick: () => setRelation("pause") });
      actions.push({ label: tr("پایان همکاری", "End mentorship"), icon: <LogOut {...IC} />, onClick: () => setRelation("end"), danger: true });
    }
  } else {
    if (chatOpen) actions.push({ label: tr(`${name} چی می‌بینه؟`, `What can ${name} see?`), icon: <Eye {...IC} />, onClick: () => show("mine") });
    if (chatOpen) actions.push({ label: tr("گزارش", "Report"), icon: <Flag {...IC} />, onClick: () => (chatReady ? setChatSheet("report") : (wantReport.current = true)) });
    if (active) actions.push({ label: tr("پایان همکاری", "End mentorship"), icon: <LogOut {...IC} />, onClick: () => { clearError(); setConfirm("end"); } });
    actions.push({ label: tr("مسدود کردن", "Block"), icon: <Ban {...IC} />, danger: true, onClick: () => { clearError(); setConfirm("block"); } });
  }

  async function answerProgram(programId: string) {
    setProgBusy(programId);
    setProgError(null);
    const r = await mentorApi<unknown>(`/api/mentor-programs/${programId}/transition`, { method: "POST", body: { action: "accept" } });
    setProgBusy(null);
    if (!r.ok) { setProgError({ id: programId, msg: r.error }); return; }
    load();
  }

  async function relationAct(action: "end" | "block") {
    const ok = await run(action, () =>
      fetch(`/api/mentorships/${d.mentorshipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
    );
    if (!ok) return;
    setConfirm(null);
    if (action === "block") { router.push(backHref); return; }
    load();
  }

  const weekHref = (weekStart: string) => (isMentor ? `/mentor/students/${studentId}/week?w=${weekStart}` : `/mentorship/${d.mentorshipId}/week?w=${weekStart}`);

  function renderEvent(ev: CoachTimelineEvent): React.ReactNode {
    switch (ev.kind) {
      case "program": {
        const pendingForMe = !isMentor && ev.status === "PENDING";
        const href = isMentor && ev.status === "DRAFT" && ev.changeRequested ? `/mentor/programs/${ev.programId}/edit` : `/mentor-programs/${ev.programId}`;
        return (
          <CoachProgramCard
            title={ev.title}
            itemCount={ev.itemCount}
            weeks={ev.weeks}
            days={ev.days}
            status={ev.status}
            changeRequested={ev.changeRequested}
            align={isMentor ? "end" : "start"}
            href={href}
            actions={pendingForMe ? (
              <>
                {progError?.id === ev.programId && <span className="cs-card-error" role="alert">{progError.msg}</span>}
                <button type="button" className="btn btn-ghost btn-sm" disabled={!!progBusy} onClick={() => setRespond({ id: ev.programId, action: "reject" })}>{tr("نه", "No")}</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={!!progBusy} onClick={() => setRespond({ id: ev.programId, action: "request_changes" })}>{tr("تغییر بخواه", "Ask for changes")}</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={!!progBusy} onClick={() => answerProgram(ev.programId)}>
                  {progBusy === ev.programId ? <Spinner size={14} /> : tr("قبول", "Accept")}
                </button>
              </>
            ) : undefined}
          />
        );
      }
      case "week":
        return (
          <CoachWeekCard
            index={weekIndexOf(d.since, ev.weekStart)}
            grade={ev.grade}
            routineRate={ev.routineRate}
            workoutsDone={ev.workoutsDone}
            sleepAvgMinutes={ev.sleepAvgMinutes}
            href={weekHref(ev.weekStart)}
          />
        );
      case "goal": {
        const line = ev.status === "DONE" ? tr("هدف کامل شد", "Goal reached")
          : ev.status === "ENDED" ? tr("هدف تموم شد", "Goal ended")
          : tr(`${ev.weeksMet} از ${ev.weeks} هفته`, `${ev.weeksMet} of ${ev.weeks} weeks`);
        return (
          <CoachPress className="ch-card cs-mini-card" onPress={() => show("goal")}>
            <span className="ch-eyebrow">{ev.status === "DONE" ? tr("هدف رسید", "Goal reached") : tr("هدف", "Goal")}</span>
            <span className="cs-mini-title">{ev.title}</span>
            <span className="cs-mini-line">{line}</span>
          </CoachPress>
        );
      }
      case "feedback":
        return (
          <SmartLink href={`/mentor-programs/${ev.programId}`} className="ch-card cs-mini-card">
            <span className="ch-eyebrow">{tr("بازخورد", "Feedback")}</span>
            <span className="cs-mini-title">{ev.itemTitle ?? ev.programTitle}</span>
            <span className="cs-mini-line cs-clamp" dir="auto">{ev.body}</span>
          </SmartLink>
        );
      case "status": {
        const text = ev.status === "started" ? tr("همکاری شروع شد", "Mentorship started")
          : ev.status === "paused" ? tr("همکاری فعلا نگه داشته شد", "Mentorship put on hold")
          : ev.status === "resumed" ? tr("همکاری ادامه پیدا کرد", "Mentorship resumed")
          : tr("همکاری تموم شد", "Mentorship ended");
        return <div className="ch-day-sep">{text}</div>;
      }
    }
  }

  const wide = desktop && isMentor;
  const subbar = (
    <div className="cs-subbar">
      {chatOpen && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChatSheet("e2ee")} disabled={!chatReady} aria-haspopup="dialog" aria-label={tr("خصوصی؛ امنیت گفت‌وگو", "Private; chat security")}>
          <Lock size={14} strokeWidth={2} aria-hidden /> {tr("خصوصی", "Private")}
        </button>
      )}
      {goal && goal.status !== "ENDED" && <CoachGoalPill weeksMet={goal.weeksMet} weeks={goal.weeks} onClick={() => show("goal")} />}
      {d.paused && active && <span className="ch-pill is-warn">{tr("متوقف", "Paused")}</span>}
    </div>
  );

  const header = (
    <CoachHeader
      back={{ href: backHref, label: isMentor ? tr("شاگردها", "Students") : tr("مربی من", "My mentor") }}
      leading={<CoachAvatar user={peer} size={40} />}
      title={<GoldenName golden={peer.golden} staff={peer.staff}>{name}</GoldenName>}
      action={<MentorKebabMenu actions={actions} label={tr("گزینه‌های همکاری", "Mentorship options")} iconSize={18} />}
    />
  );

  // همکاری هنوز شروع نشده (یا قطع شده): کارت وضعیت به‌جای خط زمانی
  if (!chatOpen) {
    const text = d.status === "PENDING" ? tr("درخواست هنوز جواب داده نشده. بعد از قبول شدن، فضای مشترک باز می‌شه.", "The request hasn't been answered yet. Your shared space opens once it's accepted.")
      : d.status === "BLOCKED" ? tr("این همکاری مسدود شده", "This mentorship is blocked")
      : tr("این درخواست قبول نشد", "This request was declined");
    return (
      <div className="ch-page cs-page">
        <span className="ch-halo" aria-hidden="true" />
        {header}
        <CoachEmpty text={text} action={<SmartLink href={isMentor ? "/mentor" : "/mentors"} className="btn btn-primary">{isMentor ? tr("برگشت", "Back") : tr("پیدا کردن مربی", "Find a mentor")}</SmartLink>} />
        {confirm && confirmDialog()}
      </div>
    );
  }

  function confirmDialog() {
    if (!confirm) return null;
    return (
      <MentorConfirmDialog
        message={confirm === "end" ? tr(`همکاری با ${name} تموم بشه؟`, `End your mentorship with ${name}?`) : tr(`${name} مسدود بشه؟`, `Block ${name}?`)}
        hint={confirm === "end"
          ? tr("برنامه‌های در جریان لغو می‌شن و فقط می‌تونی پیام‌های قبلی رو ببینی.", "Programs in progress will be cancelled and you will only be able to see earlier messages.")
          : tr("همکاری قطع و برنامه‌های در جریان لغو می‌شن؛ دیگه درخواست یا پیامی از او نمی‌رسه.", "The mentorship will end, programs in progress will be cancelled, and you won't get requests or messages from them.")}
        confirmLabel={confirm === "end" ? tr("پایان همکاری", "End mentorship") : tr("مسدود کردن", "Block")}
        busy={pendingKey === confirm}
        error={actionError}
        onConfirm={() => relationAct(confirm)}
        onCancel={() => { setConfirm(null); clearError(); }}
      />
    );
  }

  return (
    <div className={`ch-page cs-page${wide ? " is-wide" : ""}`}>
      <span className="ch-halo" aria-hidden="true" />
      {header}
      {subbar}

      <div className={`ch-space-grid${isMentor ? "" : " cs-grid-2"}`}>
        {wide && (
          <aside className="cs-col-start">
            <CoachSpaceStudents currentMentorshipId={d.mentorshipId} />
          </aside>
        )}

        <section className="cs-col-main" aria-label={tr(`فضای مشترک با ${name}`, `Shared space with ${name}`)}>
          <CoachChat
            mentorshipId={d.mentorshipId}
            peerName={name}
            role={role}
            events={d.events}
            renderEvent={renderEvent}
            sheet={chatSheet}
            onSheetClose={() => setChatSheet(null)}
            onOpenSheet={setChatSheet}
            onReady={setChatReady}
            prefill={prefill}
            readOnly={!active || !d.canSend}
            renderPlus={isMentor && active ? (api) => <CoachPlus api={api} studentId={studentId} onGoal={() => show("goalNew")} /> : undefined}
            renderAbove={isMentor && active ? (api) => <CoachNudgeBar api={api} mentorshipId={d.mentorshipId} /> : undefined}
          />
        </section>

        {desktop && (
          <aside className="ch-space-side cs-col-side">
            {isMentor ? (
              <CoachSpaceMentorSide space={d} studentId={studentId} onNotes={() => show("notes")} />
            ) : (
              <CoachSpaceStudentSide space={d} onGoal={() => show("goal")} onShare={() => show("share")} onSees={() => show("mine")} />
            )}
          </aside>
        )}
      </div>

      {mounted.goal || mounted.goalNew ? (
        <CoachGoalSheet
          open={open === "goal" || open === "goalNew"}
          onClose={close}
          mentorshipId={d.mentorshipId}
          role={role}
          goal={goal}
          startCreate={open === "goalNew"}
          onChanged={load}
          onShare={() => show("share")}
        />
      ) : null}
      {mounted.share && goal && (
        <CoachGoalShareSheet open={open === "share"} onClose={close} goal={goal} withName={isMentor ? name : undefined} />
      )}
      {isMentor && mounted.notes && <CoachNotesSheet open={open === "notes"} onClose={close} studentId={studentId} />}
      {isMentor && mounted.labels && <CoachLabelsSheet open={open === "labels"} onClose={close} studentId={studentId} />}
      {isMentor && mounted.sees && <CoachSeesSheet open={open === "sees"} onClose={close} studentId={studentId} sleepShared={d.thisWeek?.sleepAvgMinutes != null} />}
      {!isMentor && mounted.mine && (
        <CoachMineSheet
          open={open === "mine"}
          onClose={close}
          mentorshipId={d.mentorshipId}
          mentorName={name}
          active={active}
          shareSleep={d.privacy?.shareSleep ?? false}
          onSleepChanged={() => load()}
        />
      )}

      {isMentor && (
        <MentorStudentRelationControls
          studentId={studentId}
          mentorshipId={d.mentorshipId}
          name={name}
          open={relation}
          onClose={() => setRelation(null)}
          onPaused={() => load()}
          onEnded={() => router.push("/mentor/students")}
        />
      )}
      {respond && <ProgramRespondModal programId={respond.id} action={respond.action} onClose={() => setRespond(null)} onDone={() => { setRespond(null); load(); }} />}
      {confirmDialog()}
    </div>
  );
}

function downloadCsv(studentId: string) {
  const a = document.createElement("a");
  a.href = exportCsvUrl(studentId);
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** دکمه‌ی + کنار نوار نوشتن (مربی): برنامه‌ی تازه، هدف تازه، پیام آماده */
function CoachPlus({ api, studentId, onGoal }: { api: CoachChatApi; studentId: string; onGoal: () => void }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-icon btn-round" onClick={() => { setReplies(false); setOpen(true); }} aria-label={tr("افزودن", "Add")} aria-haspopup="dialog">
        <Plus size={20} strokeWidth={2} aria-hidden />
      </button>
      <CoachSheet open={open} onClose={() => setOpen(false)} title={replies ? tr("پیام آماده", "Saved replies") : tr("افزودن", "Add")} size="sm">
        <CoachSheetBody>
          {replies ? (
            <CoachSavedReplies onPick={(t) => { api.insert(t); setOpen(false); }} />
          ) : (
            <ul className="ch-list">
              <li>
                <SmartLink href={`/mentor/programs/new?student=${encodeURIComponent(studentId)}`} className="ch-row">
                  <span className="ch-row-main"><span className="ch-row-title">{tr("برنامه‌ی تازه", "New program")}</span></span>
                </SmartLink>
              </li>
              <li>
                <CoachPress className="ch-row" onPress={() => { setOpen(false); onGoal(); }}>
                  <span className="ch-row-main"><span className="ch-row-title">{tr("هدف تازه", "New goal")}</span></span>
                </CoachPress>
              </li>
              <li>
                <CoachPress className="ch-row" onPress={() => setReplies(true)}>
                  <span className="ch-row-main"><span className="ch-row-title">{tr("پیام آماده", "Saved replies")}</span></span>
                </CoachPress>
              </li>
            </ul>
          )}
        </CoachSheetBody>
      </CoachSheet>
    </>
  );
}

/** پیشنهاد پیام تشویقی نومو: فقط وقتی مربی بزنه ساخته می‌شه؛ بعد هر پیشنهاد با یک زدن در پیش‌نویس می‌نشینه */
function CoachNudgeBar({ api, mentorshipId }: { api: CoachChatApi; mentorshipId: string }) {
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function ask() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await mentorApi<{ suggestions: string[] }>("/api/mentor/nomo/nudge", { method: "POST", body: { mentorshipId } });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setList(r.data.suggestions || []);
  }
  if (list && list.length > 0) {
    return (
      <div className="cs-nudge" role="group" aria-label={tr("پیشنهاد نومو", "Nomo suggestions")}>
        <Sparkles size={16} fill="currentColor" strokeWidth={1.5} className="cs-nudge-ico" aria-hidden />
        {list.map((s, i) => (
          <button key={i} type="button" className="btn btn-outline btn-sm cs-nudge-chip" onClick={() => { api.replace(s); setList(null); }}>{s}</button>
        ))}
      </div>
    );
  }
  if (busy || error) return <CoachNomoLine loading={busy} text={error ?? undefined} action={error ? <button type="button" className="btn btn-tonal btn-sm" onClick={ask}>{tr("تلاش دوباره", "Try again")}</button> : undefined} />;
  return (
    <div className="cs-nudge">
      <button type="button" className="btn btn-tonal btn-sm" onClick={ask}>
        <Sparkles size={14} fill="currentColor" strokeWidth={1.5} aria-hidden /> {tr("پیشنهاد نومو", "Nomo suggestion")}
      </button>
    </div>
  );
}
