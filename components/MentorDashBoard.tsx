"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Ban, CheckCircle2, Clock, Hourglass, MessageCircle, Pencil, Send, ShieldCheck, UserPlus, FilePlus2,
} from "lucide-react";
import { useLiveRefresh, useVisiblePolling } from "@/lib/liveSync";
import { LoadingBlock, } from "./Spinner";
import { MentorDashError, fa, mentorApi, normRate } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmptyState, MentorNotice } from "./MentorUI";
import { MentorHero } from "./MentorHero";
import { MentorTaskCard } from "./MentorTaskCard";
import { MentorAvatarRing } from "./MentorAvatarRing";
import { MentorAvailabilityQuick } from "./MentorAvailabilityQuick";
import { MentorBroadcastSheet } from "./MentorBroadcast";
import { MentorTodayInviteSheet } from "./MentorTodayInvite";
import { MentorTodayRequestSheet } from "./MentorTodayRequest";
import { MentorList, MentorListItem } from "./MentorMotion";
import { fmtRelative } from "@/lib/mentorFormat";
import { publicUserName } from "@/lib/mentorTypes";
import { tr, trv } from "@/lib/i18n";
import type {
  MentorDashboard, MentorSelf, MentorshipRow, MentorshipsResponse, ProgramRow, ProgramsResponse,
} from "@/lib/mentorTypes";

const ic = (Icon: typeof UserPlus, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type Task = { key: string; node: React.ReactNode };

/** صفحه‌ی امروز مربی: هیرو، میان‌بر، کارهای امروز و حلقه‌ی پیشرفت شاگردها. */
export function MentorDashBoard({ self }: { self: MentorSelf }) {
  const { data: session } = useSession();
  const [dash, setDash] = useState<MentorDashboard | null>(null);
  const [rows, setRows] = useState<MentorshipRow[]>([]);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [changeProgs, setChangeProgs] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reqRow, setReqRow] = useState<MentorshipRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bcOpen, setBcOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const [d, m, p] = await Promise.all([
      mentorApi<MentorDashboard>("/api/mentor/dashboard"),
      mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor"),
      mentorApi<ProgramsResponse>("/api/mentor-programs?role=mentor&status=DRAFT"),
    ]);
    setLoading(false);
    if (!d.ok) { setError(d.error); return; }
    setDash(d.data);
    if (m.ok) { setRows(m.data.mentorships || []); setRowsError(null); }
    else setRowsError(m.error);
    // پیش‌نویسی که قبلا فرستاده شده یعنی شاگرد تغییر خواسته
    if (p.ok) setChangeProgs((p.data.programs || []).filter((x) => x.sentAt));
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh("mentor", () => { load(true); });
  useVisiblePolling(() => { load(true); }, 30_000);

  // /mentor?invite=1 (از صفحه‌ی شاگردها) برگه‌ی دعوت را باز می‌کند
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("invite") === "1") {
        setInviteOpen(true);
        sp.delete("invite");
        const q = sp.toString();
        window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
      }
    } catch { /* بدون پارامتر */ }
  }, []);

  const active = useMemo(() => rows.filter((r) => r.status === "ACTIVE"), [rows]);

  async function cancelInvite(id: string) {
    if (busyId) return;
    setBusyId(id);
    setActionError(null);
    const r = await mentorApi<unknown>(`/api/mentorships/${id}`, { method: "PATCH", body: { action: "cancel" } });
    setBusyId(null);
    if (!r.ok) { setActionError(r.error); if (r.status === 409 || r.status === 404) load(true); return; }
    load(true);
  }

  if (loading && !dash) return <LoadingBlock />;
  if (!dash) return <MentorDashError message={error || tr("داشبورد دریافت نشد؛ دوباره تلاش کن", "Could not load the dashboard. Try again.")} onRetry={() => load()} />;

  const profile = dash.profile;
  const suspended = !!(profile?.suspendedAt ?? self.suspendedAt);
  const published = profile?.published ?? self.published;
  const identity = profile?.identityStatus ?? self.identityStatus;
  const setupDone = identity === "VERIFIED" && published;

  const pausedIds = new Set(active.filter((r) => r.pausedAt).map((r) => r.counterpart.id));
  const rowByStudent = new Map(active.map((r) => [r.counterpart.id, r]));
  const attention = dash.attention.filter((a) => !pausedIds.has(a.studentId));
  const sentInvites = rows.filter((r) => r.status === "PENDING" && r.initiatedBy === "MENTOR");
  const incoming = dash.requests.filter((r) => r.status === "PENDING" && r.initiatedBy === "STUDENT");
  const unreadRows = active.filter((r) => r.unread > 0);

  // کارها به ترتیب فوریت: درخواست، تغییر برنامه، پیام، بی‌خبر، دعوت منتظر
  const tasks: Task[] = [];
  for (const r of incoming) {
    const name = publicUserName(r.counterpart);
    tasks.push({
      key: `req-${r.id}`,
      node: (
        <MentorTaskCard
          icon={ic(UserPlus, MI.row)} tone="accent" meta={fmtRelative(r.createdAt)}
          action={{ label: tr("دیدن درخواست", "View request"), onClick: () => setReqRow(r) }}
        >
          {trv(<><b>{name}</b> می‌خواد شاگردت بشه</>, <><b>{name}</b> wants to be your student</>)}
        </MentorTaskCard>
      ),
    });
  }
  for (const p of changeProgs) {
    tasks.push({
      key: `chg-${p.id}`,
      node: (
        <MentorTaskCard
          icon={ic(Pencil, MI.row)} tone="warn" meta={p.title}
          action={{ label: tr("ویرایش برنامه", "Edit program"), href: `/mentor/programs/${p.id}/edit` }}
        >
          {trv(<><b>{publicUserName(p.counterpart)}</b> برای برنامه تغییر خواسته</>, <><b>{publicUserName(p.counterpart)}</b> asked for changes to a program</>)}
        </MentorTaskCard>
      ),
    });
  }
  for (const r of unreadRows) {
    tasks.push({
      key: `msg-${r.id}`,
      node: (
        <MentorTaskCard
          icon={ic(MessageCircle, MI.row)} tone="info"
          action={{ label: tr("جواب دادن", "Reply"), href: `/mentorship/${r.id}/chat` }}
        >
          {trv(<><b>{publicUserName(r.counterpart)}</b> {fa(r.unread)} پیام خوانده‌نشده برات داره</>, <><b>{publicUserName(r.counterpart)}</b> sent you {fa(r.unread)} unread {r.unread === 1 ? "message" : "messages"}</>)}
        </MentorTaskCard>
      ),
    });
  }
  for (const a of attention) {
    const rel = rowByStudent.get(a.studentId);
    tasks.push({
      key: `att-${a.studentId}-${a.reason}`,
      node: (
        <MentorTaskCard
          icon={ic(Clock, MI.row)} tone="warn" meta={a.reason}
          action={{ label: tr("پیام دادن", "Send a message"), href: rel ? `/mentorship/${rel.id}/chat` : `/mentor/students/${a.studentId}` }}
        >
          {trv(<><b>{a.name}</b> نیاز به توجه داره</>, <><b>{a.name}</b> needs your attention</>)}
        </MentorTaskCard>
      ),
    });
  }
  for (const r of sentInvites) {
    tasks.push({
      key: `inv-${r.id}`,
      node: (
        <MentorTaskCard
          icon={ic(Hourglass, MI.row)} tone="neutral" meta={tr(`دعوت ${fmtRelative(r.createdAt)}`, `Invited ${fmtRelative(r.createdAt)}`)}
          action={{ label: tr("لغو دعوت", "Cancel invite"), onClick: () => cancelInvite(r.id), busy: busyId === r.id }}
        >
          {trv(<>دعوت <b>{publicUserName(r.counterpart)}</b> هنوز جواب نگرفته</>, <>Your invite to <b>{publicUserName(r.counterpart)}</b> has no answer yet</>)}
        </MentorTaskCard>
      ),
    });
  }

  const completionBy = new Map(dash.completion.map((c) => [c.studentId, c]));
  const great = dash.completion.filter((c) => c.completed + c.partial + c.missed > 0 && normRate(c.rate) >= 0.8).length;
  const waiting = incoming.length + changeProgs.length + unreadRows.length;

  const summary = active.length === 0
    ? tr("هنوز شاگرد فعالی نداری؛ یکی رو دعوت کن", "You have no active students yet. Invite one.")
    : waiting > 0
      ? trv(
          <><b>{fa(waiting)} مورد</b> منتظر جواب توئه{great > 0 && <> و <b>{fa(great)} شاگرد</b> عالی پیش می‌رن</>}.</>,
          <><b>{fa(waiting)} {waiting === 1 ? "item" : "items"}</b> waiting for your reply{great > 0 && <>, and <b>{fa(great)} {great === 1 ? "student is" : "students are"}</b> doing great</>}.</>,
        )
      : great > 0
        ? trv(
            <>کاری منتظرت نیست؛ <b>{fa(great)} شاگرد</b> عالی پیش می‌رن.</>,
            <>Nothing is waiting for you; <b>{fa(great)} {great === 1 ? "student is" : "students are"}</b> doing great.</>,
          )
        : tr("فعلا کاری منتظر تو نیست.", "Nothing is waiting for you right now.");

  const rawName = (session?.user?.name || "").trim();
  const first = rawName.split(/\s+/)[0] || "";

  let setupTitle = "";
  if (!setupDone) {
    setupTitle = identity === "PENDING" ? tr("تایید هویتت در حال بررسیه", "Your identity check is under review")
      : identity === "VERIFIED" ? tr("پروفایلت هنوز در فهرست مربی‌ها نیست", "Your profile is not in the mentor listing yet")
        : identity === "REJECTED" ? tr("مدرک هویتت تایید نشد؛ دوباره بفرست", "Your ID document was not accepted. Send it again.")
          : tr("برای دیده شدن در فهرست، هویتت رو تایید کن", "Verify your identity to appear in the listing");
  }

  return (
    <div className="mv2-today">
      {suspended && (
        <div className="mentor-notices">
          <MentorNotice tone="danger" icon={ic(Ban, MI.row)} title={tr("حساب مربی‌گری‌ت موقتا بسته شده", "Your mentor account is temporarily closed")}>
            {self.suspendedReason || tr("تا باز شدنش، شاگرد تازه و فرستادن برنامه ممکن نیست", "Until it reopens, you cannot take new students or send programs")}
          </MentorNotice>
        </div>
      )}
      {!setupDone && !suspended && (
        <div className="mentor-notices">
          <MentorNotice
            tone="warn" icon={ic(ShieldCheck, MI.row)} title={setupTitle}
            action={<Link href="/mentor/settings" className="account-outline-btn mentor-btn is-sm">{tr("تنظیمات", "Settings")}</Link>}
          />
        </div>
      )}

      <MentorHero
        title={first ? tr(`سلام ${first}`, `Hi ${first}`) : tr("سلام", "Hi")}
        summary={summary}
        trailing={<MentorAvailabilityQuick variant="pill" />}
        stats={[
          { label: tr("شاگردها", "Students"), value: fa(dash.stats.activeStudents) },
          { label: tr("عالی پیش می‌رن", "Doing great"), value: fa(great) },
          { label: tr("منتظر جواب تو", "Waiting for you"), value: fa(waiting) },
        ]}
      />

      <div className="mv2-today-tiles">
        <button type="button" className="mv2-today-tile mv2-tone-accent" onClick={() => setInviteOpen(true)}>
          <UserPlus size={22} strokeWidth={MI_STROKE} aria-hidden /><span>{tr("دعوت شاگرد", "Invite a student")}</span>
        </button>
        <button type="button" className="mv2-today-tile mv2-tone-info" onClick={() => setBcOpen(true)} disabled={suspended || !!rowsError}>
          <Send size={22} strokeWidth={MI_STROKE} aria-hidden /><span>{tr("پیام به همه", "Message everyone")}</span>
        </button>
        <Link href="/mentor/programs/new" className="mv2-today-tile mv2-tone-warn">
          <FilePlus2 size={22} strokeWidth={MI_STROKE} aria-hidden /><span>{tr("برنامه‌ی تازه", "New program")}</span>
        </Link>
      </div>

      <section className="mv2-today-sec" aria-labelledby="mv2-today-tasks">
        <div className="mv2-today-sec-head">
          <h2 id="mv2-today-tasks">{tr("کارهای امروز", "Today's tasks")}</h2>
          {tasks.length > 0 && <span className="mv2-today-count">{fa(tasks.length)}</span>}
        </div>
        {actionError && <div className="form-inline-error" role="alert">{actionError}</div>}
        {tasks.length === 0 ? (
          <MentorEmptyState icon={<CheckCircle2 size={28} strokeWidth={MI_STROKE} aria-hidden />} title={tr("همه‌چیز مرتبه", "All caught up")} />
        ) : (
          <MentorList>
            {tasks.map((t) => <MentorListItem key={t.key}>{t.node}</MentorListItem>)}
          </MentorList>
        )}
      </section>

      <section className="mv2-today-sec" aria-labelledby="mv2-today-students">
        <div className="mv2-today-sec-head">
          <h2 id="mv2-today-students">{tr("شاگردها امروز", "Students today")}</h2>
          <Link href="/mentor/students" className="mentor-link">{tr("همه", "All")}</Link>
        </div>
        {rowsError ? (
          <p className="mentor-empty"><span>{tr("فهرست شاگردها دریافت نشد؛ صفحه رو تازه کن", "Could not load your students. Refresh the page.")}</span></p>
        ) : active.length === 0 ? (
          <p className="mentor-empty"><span>{tr("هنوز شاگرد فعالی نداری", "You have no active students yet")}</span></p>
        ) : (
          <ul className="mv2-today-people thin-scroll">
            {active.map((r) => {
              const name = publicUserName(r.counterpart);
              const c = completionBy.get(r.counterpart.id);
              const has = !!c && c.completed + c.partial + c.missed > 0;
              const progress = has ? normRate(c!.rate) : null;
              const label = r.pausedAt ? tr(`${name}، متوقف`, `${name}, paused`)
                : !c ? tr(`${name}، پیشرفت رو شاگرد خصوصی نگه داشته`, `${name}, keeps their progress private`)
                  : has ? tr(`${name}، ${Math.round(normRate(c.rate) * 100)} درصد در 7 روز اخیر`, `${name}, ${Math.round(normRate(c.rate) * 100)} percent in the last 7 days`) : tr(`${name}، هنوز داده‌ای نیست`, `${name}, no data yet`);
              return (
                <li key={r.id}>
                  <Link href={`/mentor/students/${r.counterpart.id}`} className="mv2-today-person" aria-label={label}>
                    <MentorAvatarRing name={name} avatarUrl={r.counterpart.avatarUrl} progress={progress} size={64} />
                    <span className="mv2-today-person-name">{name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <MentorTodayRequestSheet row={reqRow} onClose={() => setReqRow(null)} suspended={suspended} onChanged={() => load(true)} />
      <MentorTodayInviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} suspended={suspended} categories={self.categories} onSent={() => load(true)} />
      <MentorBroadcastSheet open={bcOpen} onClose={() => setBcOpen(false)} activeCount={active.length} />
    </div>
  );
}
