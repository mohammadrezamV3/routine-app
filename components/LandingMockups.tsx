"use client";

import {
  Bell, CalendarDays, Check, ChevronDown, ChevronLeft, Clock, Hash, Layers, ListChecks, Lock, Medal, MoreVertical, Percent,
  Play, Plus, Star, Hammer, Tablets, Users, X, ArrowUp, Bookmark,
} from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { DashProgressCircle } from "@/components/DashProgressCircle";
import { StreakFlame } from "@/components/StreakFlame";
import { STREAK_MILESTONES } from "@/lib/streakTier";
import { jMonthName, weekdayName } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

// ─── ماکت‌های لندینگ که «همون خود اپ» ـن ─────────────────────────────────
// هر تکه این‌جا یا *خود* کامپوننت نمایشی اپ است (StreakFlame،
// DashProgressCircle، AgentAvatar، …) با دیتای نمونه‌ی ثابت، یا آینه‌ی
// مو‌به‌موی مارک‌آپ/کلاس‌های کامپوننت واقعی (DashTaskRow، DashMedicationCard،
// TradeAccountsPanel، MentorCard، MentorChat، …) وقتی خود کامپوننت fetch/
// session/storage دارد. کلاس‌های سراسری (trade-*، rp-*، support-msg، …) از
// globals.css می‌آیند، پس ظاهر با خود اپ یکی می‌ماند. هیچ Date/Math.random
// در رندر نیست (بدون hydration mismatch). هیچ <button>ی نیست: کل ماکت
// تزئینی و aria-hidden است و نباید فوکوس بگیرد.

export const INERT = { inert: "" } as object;

// ارقام در کل سایت انگلیسی‌اند (مثل faNum  lib/jalali.ts)
export function fa(n: number | string) {
  return String(n);
}

type Importance = "veryHigh" | "high" | "medium" | "low";

/* ───────────── DashTaskRow (نسخه‌ی موبایل) ───────────── */
export type MockTask = {
  name: string; time?: string; importance?: Importance; tag?: string;
  done?: boolean; missed?: boolean; exercise?: boolean;
};

export function MockTaskRow({ task }: { task: MockTask }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl px-2.5 py-3">
      <div className="flex h-6 w-6 shrink-0 items-center">
        {!task.exercise && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-dash-muted">
            <MoreVertical className="h-[15px] w-[15px]" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-start">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-start text-[13px] font-medium text-dash-text">{task.name}</span>
          {task.tag && (
            <span className="max-w-[72px] shrink-0 truncate whitespace-nowrap rounded-full border border-dash-border px-2 py-0.5 text-center text-[9.5px] font-semibold text-dash-muted">
              {task.tag}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {task.time ? (
            <span className="shrink-0 font-mono text-[10.5px] text-dash-muted" dir="ltr">{task.time}</span>
          ) : (
            <span className="shrink-0 text-[10.5px] text-dash-muted">{tr("بدون ساعت", "No time")}</span>
          )}
          {!task.exercise && task.missed && !task.done && (
            <span className="shrink-0 text-[9.5px] font-semibold leading-none" style={{ color: "#E05252" }}>{tr("وقتش گذشته", "Overdue")}</span>
          )}
        </div>
      </div>
      {task.exercise ? (
        task.done ? (
          <span
            key="ex-done"
            className="lm-pop flex shrink-0 items-center rounded-full px-2.5 py-1.5 text-[11px] font-bold"
            style={{ background: "rgba(var(--accent-rgb),.14)", color: "var(--accent)" }}
          >
            {tr("انجام دادی", "Done")}
          </span>
        ) : (
          <span
            key="ex-start"
            className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={{ background: "rgba(var(--accent-rgb),.14)", color: "var(--accent)" }}
          >
            <Play className="h-3 w-3" fill="currentColor" />
            {tr("شروع", "Start")}
          </span>
        )
      ) : (
        <span
          className={`task-check-btn relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            task.done || task.missed ? "text-white" : "text-transparent"
          }${!task.done && task.missed ? " task-check-missed" : ""}`}
          style={
            task.done
              ? { background: "var(--accent)", borderColor: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),.65)" }
              : task.missed
              ? { background: "#E05252", borderColor: "#E05252" }
              : { background: "transparent", borderColor: "var(--muted)" }
          }
        >
          {task.done ? (
            <span key="d" className="lm-pop absolute inset-0 flex items-center justify-center"><Check className="h-3 w-3" strokeWidth={3} /></span>
          ) : task.missed ? (
            <span key="m" className="lm-pop absolute inset-0 flex items-center justify-center"><X className="h-3 w-3" strokeWidth={3} /></span>
          ) : null}
        </span>
      )}
    </div>
  );
}

/** DashCard — همون قاب، بدون fade-in فریمر (که در SSR محتوا رو تا هیدریت پنهان می‌کرد) */
export function MockCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-dash border border-dash-border bg-dash-card p-3.5 ${className}`}>{children}</div>;
}

/** DashTaskList — «برنامه‌های امروز» */
export function MockTaskList({ tasks }: { tasks: MockTask[] }) {
  return (
    <MockCard className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[16px] font-bold text-dash-text">
          <ListChecks className="h-[18px] w-[18px] text-dash-green" />
          {tr("برنامه‌های امروز", "Today's plans")}
        </span>
        <span className="flex items-center gap-1 text-[11.5px] font-semibold text-dash-green">
          <Plus className="h-[15px] w-[15px]" />
          {tr("افزودن برنامه", "Add plan")}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-1">
        {tasks.map((t) => <MockTaskRow key={t.name} task={t} />)}
      </div>
    </MockCard>
  );
}

/** DashMedicationCard — «یادآوری دارو» */
export function MockMedicationCard({ meds }: { meds: { name: string; every: string; times: string; left: string }[] }) {
  return (
    <MockCard>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text">
          <Tablets className="h-4 w-4 text-dash-green" />
          {tr("یادآوری دارو", "Medication reminder")}
        </span>
        <span className="flex items-center gap-1 text-[11.5px] font-semibold text-dash-green">
          <Plus className="h-[15px] w-[15px]" />
          {tr("افزودن", "Add")}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {meds.map((m) => (
          <div key={m.name} className="med-row flex items-center gap-2 rounded-2xl border border-dash-border px-3 py-2.5 text-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-dash-muted">
              <MoreVertical className="h-[15px] w-[15px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[11.5px] font-semibold text-dash-text">{m.name}</span>
                <span className="shrink-0 text-[9.5px] font-semibold text-dash-muted">{m.every}</span>
              </div>
              <div className="mt-1 truncate text-[9.5px] text-dash-muted">
                <span className="mono" dir="ltr">{m.times}</span>
                <span className="mx-1.5">·</span>
                {m.left}
              </div>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-dash-green/15 text-dash-green">
              <Bell className="h-[13px] w-[13px]" fill="currentColor" />
            </span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

/** نوار انتخاب روز (DashDateSelector موبایل) — پنج روز در دید */
const strip = () => {
  const mehr = jMonthName(6);
  return [
    { w: tr("شنبه", weekdayName(6)), d: tr("4 مهر", `4 ${mehr}`) },
    { w: tr("یکشنبه", weekdayName(0)), d: tr("5 مهر", `5 ${mehr}`) },
    { w: tr("دوشنبه", weekdayName(1)), d: tr("6 مهر", `6 ${mehr}`), on: true },
    { w: tr("سه‌شنبه", weekdayName(2)), d: tr("7 مهر", `7 ${mehr}`) },
    { w: tr("چهارشنبه", weekdayName(3)), d: tr("8 مهر", `8 ${mehr}`) },
  ];
};
export function MockDateStrip() {
  const STRIP = strip();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-dash border border-dash-border" style={{ background: "rgba(var(--bg-rgb), .16)" }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 overflow-hidden px-2 py-2.5">
          {STRIP.map((s) => (
            <span
              key={s.w}
              className={`flex min-w-[calc((100%_-_24px)/5)] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-1 py-1 text-center ${s.on ? "text-dash-bg" : "text-dash-muted"}`}
              style={s.on ? { background: "var(--accent)", boxShadow: "0 0 0 1px rgba(var(--accent-rgb),.4), 0 0 8px rgba(var(--accent-rgb),.3)" } : undefined}
            >
              <span className={`whitespace-nowrap text-[10px] font-semibold ${s.on ? "text-dash-bg" : "text-dash-text"}`}>{s.w}</span>
              <span className={`whitespace-nowrap text-[9px] ${s.on ? "text-dash-bg/80" : "text-dash-muted"}`}>{s.d}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** DashFilterButton (موبایل) */
export function MockFilterButton({ label, icon, active }: { label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-dash border px-2.5 py-1.5 text-[11px] font-semibold ${active ? "text-dash-bg" : "border-dash-border bg-dash-card text-dash-muted"}`}
      style={active ? { background: "var(--accent)", borderColor: "rgba(var(--accent-rgb),.4)", boxShadow: "0 0 8px rgba(var(--accent-rgb),.25)" } : undefined}
    >
      {icon}
      {label}
    </span>
  );
}

/* ───────────── استریک: هر هشت سطح واقعی ───────────── */
const tierShort = () => [tr("شروع", "Start"), tr("3 روزه", "3 days"), tr("هفتگی", "Weekly"), tr("ماهانه", "Monthly"), tr("60 روزه", "60 days"), tr("فصلی", "Seasonal"), tr("نیم‌ساله", "Half-year"), tr("افسانه‌ای", "Legendary")];
export function MockStreakTiers({ labels = true }: { labels?: boolean }) {
  const TIER_SHORT = tierShort();
  return (
    <div className="lm-tiers">
      {STREAK_MILESTONES.map((d, i) => (
        <div key={d} className="lm-tier">
          <StreakFlame streak={d} className="lm-tier-flame" />
          {labels && <small>{TIER_SHORT[i]}</small>}
        </div>
      ))}
    </div>
  );
}

/* ───────────── DashFriendsCard ───────────── */
export const friends = () => [
  { name: tr("نیما", "Nima"), streak: 38, done: 5, total: 6 },
  { name: tr("مریم", "Maryam"), streak: 12, done: 3, total: 4 },
  { name: tr("آرش", "Arash"), streak: 4, done: 2, total: 5 },
];
export function MockFriendsCard({ unit = tr("برنامه", "plans") }: { unit?: string }) {
  const FRIENDS = friends();
  return (
    <MockCard>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text">
          <Users className="h-4 w-4 text-dash-green" />
          {tr("دوستان", "Friends")}
        </span>
        <span className="text-[11px] font-semibold text-dash-green">{tr("مشاهده همه", "View all")}</span>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {FRIENDS.map((f) => (
          <div key={f.name} className="flex items-center justify-between gap-3">
            <span className="flex flex-1 items-center justify-start gap-2.5 text-start">
              <AgentAvatar seed={f.name} size={32} animated={false} className="shrink-0" />
              <span className="text-start">
                <span className="flex items-center justify-end gap-1.5">
                  <span className="text-[11.5px] font-semibold text-dash-text">{f.name}</span>
                  <StreakFlame streak={f.streak} className="text-[10px]" />
                </span>
                <span className="mt-0.5 block text-[9.5px] text-dash-muted">{tr(`${f.done} از ${f.total} ${unit}`, `${f.done} of ${f.total} ${unit}`)}</span>
              </span>
            </span>
            <DashProgressCircle value={Math.round((f.done / f.total) * 100)} size={34} strokeWidth={3.5} />
          </div>
        ))}
      </div>
    </MockCard>
  );
}

/* ───────────── ژورنال ترید: کارت حساب (TradeAccountsPanel → AccountRow) ───────────── */
export type MockAccount = { name: string; color: string; balance: string; pct: string; up: boolean; trades: number; win: number; broker?: string; mt?: boolean };
export function MockAccountCard({ a }: { a: MockAccount }) {
  return (
    <div className="trade-surface trade-account-card">
      <div className="trade-account-top-row">
        <div className="trade-account-kebab-inline">
          <span className="trade-icon-btn lm-kebab"><MoreVertical size={16} /></span>
        </div>
        <span className="trade-account-title-link">
          <span className="trade-account-name">{a.name}</span>
          <span className="trade-account-dot" style={{ background: a.color }} />
        </span>
        <span className="trade-account-pnl-inline mono" dir="ltr" style={{ color: a.up ? "var(--accent)" : "#E05252" }}>
          {a.balance}
          <span className="trade-account-pnl-pct">{a.pct}%</span>
          <ArrowUp size={13} style={a.up ? undefined : { transform: "rotate(180deg)" }} />
        </span>
      </div>
      <div className="trade-account-facts">
        <span><Hash size={12} /> {tr(`${a.trades} معامله`, `${a.trades} trades`)}</span>
        <span><Percent size={12} /> {tr(`${a.win}% برد`, `${a.win}% win`)}</span>
        {a.broker && <span className="trade-account-facts-broker">{a.broker}</span>}
        {a.mt && <span className="trade-account-facts-mt">{tr("متاتریدر", "MetaTrader")}</span>}
      </div>
    </div>
  );
}

/* ───────────── مربی: MentorCard ───────────── */
export function MockMentorCard({ name, line, rating, count, since }: { name: string; line: string; rating: string; count: string; since: string }) {
  return (
    <div className="trade-surface rp-card lm-mentor-card">
      <div className="lm-mentor-head">
        <AgentAvatar seed={name} size={44} animated={false} className="shrink-0" />
        <div className="lm-mentor-id">
          <div className="lm-mentor-name-row">
            <span className="lm-mentor-name">{name}</span>
            <span className="lm-cert"><Medal size={16} strokeWidth={1.9} /></span>
          </div>
          <div className="lm-mentor-line">{line}</div>
        </div>
        <span className="lm-mentor-save"><Bookmark size={18} strokeWidth={1.75} /></span>
      </div>
      <div className="rp-card-foot lm-mentor-foot">
        <span className="lm-rating"><Star size={13} strokeWidth={1.75} fill="currentColor" /><b>{rating}</b><span>({count})</span></span>
        <span className="lm-since"><CalendarDays size={12} strokeWidth={1.75} /> {tr(`از ${since}`, `Since ${since}`)}</span>
        <ChevronLeft size={16} strokeWidth={1.75} className="rp-card-arrow dir-flip" />
      </div>
    </div>
  );
}

/** MentorChat — ردیف سرویس رمزگذاری + حباب‌ها (support-msg همون کلاس سراسری) */
export function MockMentorChat({ peer, msgs }: { peer: string; msgs: { mine?: boolean; text: string; time: string }[] }) {
  return (
    <div className="lm-chat">
      <div className="lm-chat-service">
        <span><Lock size={12} strokeWidth={1.75} /> {tr(`چت‌ها سرتاسر رمزنگاری‌شده‌اند؛ فقط تو و ${peer} پیام‌ها را می‌خوانید`, `Chats are end-to-end encrypted; only you and ${peer} can read the messages`)}</span>
      </div>
      {msgs.map((m, i) => (
        <div key={i} className={`lm-chat-row${m.mine ? " is-mine" : ""}`}>
          <div className={`support-msg ${m.mine ? "mine" : "admin"} lm-chat-bubble`}>
            <span>{m.text}</span>
            <span className="lm-chat-time mono">{m.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────── رودمپ: کارت فهرست + مرحله‌ها (app/roadmaps، RoadmapStageCard) ───────────── */
export function MockRoadmapCard({ topic, title, desc, duration, stages, level, pct }: {
  topic: string; title: string; desc: string; duration: string; stages: number; level: string; pct: number;
}) {
  return (
    <div className="trade-surface rp-card">
      <div className="rp-card-head"><div className="rp-card-eyebrow">{topic}</div></div>
      <div className="rp-card-title">{title}</div>
      <p className="rp-card-desc">{desc}</p>
      <div className="rp-card-meta">
        <span><Clock size={12} /> {duration}</span>
        <span><Layers size={12} /> {tr(`${fa(stages)} مرحله`, `${fa(stages)} stages`)}</span>
        <span>{level}</span>
      </div>
      <div className="rp-card-foot">
        <div className="rp-bar"><span style={{ width: `${pct}%` }} /></div>
        <span className="rp-card-pct">{fa(pct)}{tr("٪", "%")}</span>
        <ChevronLeft size={16} className="rp-card-arrow dir-flip" />
      </div>
    </div>
  );
}

export function MockRoadmapStage({ n, title, duration, done, tasksDone, tasks, openTasks }: {
  n: number; title: string; duration: string; done?: boolean; tasksDone: number; tasks: number;
  openTasks?: { title: string; checked?: boolean }[];
}) {
  const open = !!openTasks;
  return (
    <li className={`rp-stage${done ? " done" : ""}${open ? " open" : ""}`}>
      <span className="rp-stage-num">{done ? <Check size={15} /> : fa(n)}</span>
      <div className="trade-surface rp-stage-card">
        <div className="rp-stage-head">
          <div className="rp-stage-head-main">
            <h3>{title}</h3>
            <div className="rp-stage-sub">
              <span>{duration}</span>
              <span>{tr(`${fa(tasksDone)} از ${fa(tasks)} کار`, `${fa(tasksDone)} of ${fa(tasks)} tasks`)}</span>
            </div>
          </div>
          <ChevronDown size={18} className="rp-stage-chevron" />
        </div>
        {open && (
          <div className="rp-stage-body">
            <div className="rp-sec lm-rp-sec">
              <div className="rp-sec-title"><Hammer size={14} /> {tr("کارهای عملی", "Practical tasks")}</div>
            <ul className="rp-tasks">
              {openTasks!.map((t) => (
                <li key={t.title} className={t.checked ? "checked" : ""}>
                  <span className="rp-check">{t.checked && <Check size={12} />}</span>
                  <div className="rp-task-body"><div className="rp-task-title">{t.title}</div></div>
                </li>
              ))}
            </ul>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
