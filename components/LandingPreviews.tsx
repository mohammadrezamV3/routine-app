"use client";

import { useEffect, useState } from "react";
import {
  Bell, Check, Dumbbell, Filter, History, Calendar, Pencil, Percent, Plus, Repeat2, RotateCw,
  Send, Timer, UtensilsCrossed, Wallet, ArrowUp, X,
} from "lucide-react";
import AIMessage from "@/components/smoothui/components/ai-message";
import SiriOrb from "@/components/smoothui/components/siri-orb";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { CalorieMacrosCard } from "@/components/CalorieMacrosCard";
import { WeeklyAnalysisHero } from "@/components/WeeklyAnalysisHero";
import { WeeklyAnalysisInsights } from "@/components/WeeklyAnalysisInsights";
import { ForexSessionsDial } from "@/components/ForexSessionsDial";
import { FlagCircle } from "@/components/FlagCircle";
import { arcForDef, isForexOpen, nextOpenForDef } from "@/lib/forexSessions";
import { CLOCK_SESSIONS } from "@/lib/forexClockSessions";
import type { Insight, WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import {
  fa, MockAccountCard, MockCard, MockDateStrip, MockFilterButton, MockFriendsCard, MockMedicationCard,
  MockMentorCard, MockMentorChat, MockRoadmapCard, MockRoadmapStage, MockStreakTiers, MockTaskList,
} from "@/components/LandingMockups";

// ─── پیش‌نمایش‌های ویترین — هرکدام یک برش از صفحه‌ی واقعیِ همان بخش ────────
// (نه UIِ ساختگی). هرجا کامپوننتِ اپ فقط نمایشی است، خودش رندر می‌شود
// (WeeklyAnalysisHero/Insights، CalorieMacrosCard، ForexSessionsDial،
// SegmentedTabs، AIMessage/SiriOrb، StreakFlame، …)؛ بقیه آینه‌ی مارک‌آپِ
// LandingMockups. فقط پیش‌نمایشِ «روتین» در SSR رندر می‌شود؛ بقیه فقط بعد از
// انتخابِ تب روی کلاینت سوار می‌شوند.

export type PreviewProps = { live: boolean };

function Pv({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`lsc-pv dash-scope text-dash-text ${className}`}>{children}</div>;
}

/* ─── روتین ─── */
export function PreviewRoutine() {
  return (
    <Pv className="lsc-pv-routine">
      <div className="flex flex-col gap-2.5">
        <MockDateStrip />
        <div className="flex flex-wrap items-center gap-2">
          <MockFilterButton label="تاریخچه" icon={<History size={15} />} />
          <MockFilterButton label="امروز" icon={<Calendar size={15} />} active />
          <MockFilterButton label="فیلتر" icon={<Filter size={15} />} />
        </div>
      </div>
      <MockTaskList
        tasks={[
          { name: "مدیتیشن صبحگاهی", time: "07:00", importance: "medium", done: true },
          { name: "جلسه کاری", time: "11:00", importance: "veryHigh", missed: true },
          { name: "مطالعه‌ی کتاب", time: "21:30", importance: "high", tag: "یادگیری" },
          { name: "برنامه تمرینی امروز", exercise: true },
        ]}
      />
      <MockMedicationCard meds={[
        { name: "امگا 3", every: "هر 12 ساعت", times: "09:00 · 21:00", left: "18 روز مونده" },
      ]} />
      {/* اعلانِ پوشِ واقعی (lib/reminderPlan.ts) */}
      <div className="lsc-push">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-icon-dark-theme.png" alt="" width={28} height={28} className="lsc-push-ic" />
        <div className="min-w-0">
          <b>یادآوری دارو</b>
          <span>نوبتِ «امگا 3» ساعت 21:00 — 15 دقیقه‌ی دیگه.</span>
        </div>
      </div>
    </Pv>
  );
}

/* ─── استریک و دوستان ─── */
export function PreviewStreak() {
  return (
    <Pv>
      <MockCard>
        <div className="mb-3 flex items-center justify-between text-[13px] font-bold">
          <span>سطح‌های استریک</span>
          <span className="text-[11px] font-semibold text-dash-muted">روزهای کاملِ پشت‌سرهم</span>
        </div>
        <MockStreakTiers />
      </MockCard>
      <MockFriendsCard />
    </Pv>
  );
}

/* ─── آنالیز هفتگی: خودِ WeeklyAnalysisHero و WeeklyAnalysisInsights ─── */
const ANALYSIS = {
  isCurrentWeek: true,
  daysElapsed: 5,
  overall: {
    score: 82, prevScore: 74, delta: 8, grade: "A", confidence: "high", consistency: 86, activeDays: 5,
    bestDay: { date: "", weekday: "سه‌شنبه", score: 94, isToday: false, isFuture: false },
    worstDay: { date: "", weekday: "شنبه", score: 61, isToday: false, isFuture: false },
  },
  prediction: { projectedScore: 84, low: 79, high: 89, message: "با همین روند، هفته رو با حدود 84 (نمره‌ی A) تموم می‌کنی." },
} as unknown as WeeklyAnalysis;

const INSIGHTS: Insight[] = [
  { id: "corr", kind: "correlation", icon: "link", title: "خواب ↔ روتین", body: "روزهایی که خواب خوبی داشتی، امتیاز روتین 18 واحد بهتر بود.", domain: "routine", tone: "good" },
  { id: "up", kind: "improvement", icon: "trend_up", title: "بهتر از هفته‌ی قبل", body: "امتیاز کلت از 74 به 82 رسید (+8).", tone: "good" },
];

export function PreviewAnalysis() {
  return (
    <Pv className="lsc-pv-wa">
      <WeeklyAnalysisHero analysis={ANALYSIS} />
      <WeeklyAnalysisInsights insights={INSIGHTS} />
    </Pv>
  );
}

/* ─── نومو: پنلِ RoutineAiFab با خودِ AIMessage و SiriOrb ─── */
export function PreviewNumo({ live }: PreviewProps) {
  const orb = (s: string) => (live ? <SiriOrb size={s} /> : <span className="lh-orb-still" style={{ width: s, height: s }} />);
  return (
    <Pv className="lsc-pv-numo">
      <div className="lsc-numo-panel">
        <div className="modal-head">
          <div className="modal-title routine-ai-title">{orb("26px")}نومو</div>
        </div>
        <div className="routine-ai-list">
          <AIMessage from="user" className="routine-ai-row-user">
            <p>شنبه‌ها و سه‌شنبه‌ها ساعت 6 صبح پیاده‌روی</p>
          </AIMessage>
          <AIMessage from="assistant" avatar={orb("24px")} className="routine-ai-row-bot tone-ok">
            <p>«پیاده‌روی» شنبه ساعتِ 06:00 اضافه شد.</p>
            <p className="mt-1">«پیاده‌روی» سه‌شنبه ساعتِ 06:00 اضافه شد.</p>
          </AIMessage>
        </div>
        <div className="routine-ai-composer">
          <span className="routine-ai-input lsc-numo-input">پیام…</span>
          <span className="routine-ai-action lsc-numo-send"><span className="routine-ai-action-icon"><Send size={16} /></span></span>
        </div>
      </div>
    </Pv>
  );
}

/* ─── بدنسازی: ExerciseTaskList در حالِ «شروع تمرین» ─── */
const MOVES = [
  { n: "پرس سینه هالتر", s: 4, r: 10, done: true },
  { n: "پرس شیب‌دار دمبل", s: 3, r: 12, done: true },
  { n: "فلای سیم‌کش", s: 3, r: 12 },
  { n: "پشت‌بازو سیمکش", s: 3, r: 15 },
];
export function PreviewFitness() {
  const [mode, setMode] = useState<"skip" | "stay">("stay");
  return (
    <Pv>
      <MockCard>
        <div className="mb-2 text-[12.5px] font-bold">روزِ تمرینِ جامانده</div>
        <SegmentedTabs
          options={[{ value: "skip" as const, label: "رد شدن" }, { value: "stay" as const, label: "ماندن" }]}
          active={mode}
          onChange={setMode}
        />
      </MockCard>
      <MockCard className="flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold text-dash-text">برنامه تمرینی</span>
          <span className="exercise-chrono" dir="ltr"><Timer className="h-[13px] w-[13px]" /><span className="mono">00:18:42</span></span>
        </div>
        <div className="mt-1 text-[11px] text-dash-muted">سینه و پشت‌بازو</div>
        <table className="exercise-plan-table mt-3">
          <thead>
            <tr>
              <th className="epc-idx" /><th className="epc-name" />
              <th className="epc-num"><Dumbbell size={13} /></th>
              <th className="epc-num"><Repeat2 size={13} /></th>
              <th className="epc-actions" />
            </tr>
          </thead>
          <tbody>
            {MOVES.map((m, i) => (
              <tr key={m.n}>
                <td className="epc-idx mono">{i + 1}-</td>
                <td className="epc-name">{m.n}</td>
                <td className="epc-num mono">{m.s}</td>
                <td className="epc-num mono">{m.r}</td>
                <td className="epc-actions">
                  <div className="flex shrink-0 items-center justify-end gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-dash-muted" style={{ opacity: 0.3 }}>
                      <RotateCw className="h-[14px] w-[14px]" />
                    </span>
                    {m.done ? (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-white"
                        style={{ background: "var(--accent)", borderColor: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),.65)" }}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="exercise-start-btn">شروع</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <span
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-[13px] font-bold"
          style={{ borderColor: "#E05252", color: "#E05252" }}
        >
          پایان تمرین
        </span>
      </MockCard>
    </Pv>
  );
}

/* ─── کالری ─── */
export function PreviewCalorie() {
  const entries = [
    { id: "1", customName: "جوجه‌کباب", grams: 200, customCalories: 330, proteinG: 52, carbsG: 2, fatG: 12 },
    { id: "2", customName: "چلو مرغ", grams: 350, customCalories: 620, proteinG: 42, carbsG: 78, fatG: 14 },
  ];
  return (
    <Pv>
      <MockCard className="flex flex-col">
        <div className="flex items-center justify-between">
          <div className="mono text-[15px] font-extrabold" style={{ color: "var(--accent)" }}>
            {fa(930)}<span className="mx-1 text-dash-muted">/</span>{fa(2100)}
            <span className="mr-1.5 text-[10.5px] font-semibold text-dash-muted">کالری</span>
          </div>
          <span className="text-[11px] font-semibold text-dash-green">تغییر برنامه</span>
        </div>
        <div className="lsc-kcal-bar"><i /></div>
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text">
            <UtensilsCrossed className="h-4 w-4 text-dash-green" /> کالری‌شمار
          </span>
          <span className="flex items-center gap-1 text-[11.5px] font-semibold text-dash-green"><Plus className="h-[15px] w-[15px]" /> افزودن</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {entries.map((e) => (
            <div key={e.id} className="calorie-glass-field flex items-center justify-between gap-2.5 border px-4 py-2.5" style={{ borderRadius: 9999 }}>
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-[11.5px] font-bold text-dash-text">{e.customName}</span>
                <span className="mono shrink-0 text-[10px] text-dash-muted">{fa(e.grams)} گرم</span>
              </div>
              <span className="flex shrink-0 items-center gap-2.5">
                <span className="mono flex items-baseline gap-1 rounded-lg px-2 py-1 text-[12px] font-extrabold" style={{ background: "rgba(var(--accent-rgb),.10)", color: "var(--accent)" }}>
                  <span className="text-[9px] font-semibold" style={{ opacity: 0.75 }}>kcal</span>{fa(e.customCalories)}
                </span>
                <X size={13} className="text-dash-muted" />
              </span>
            </div>
          ))}
        </div>
      </MockCard>
      {/* هدفِ روزانه — از lib/calorieCalc.ts (قد، وزن، سن، روزهای تمرین، هدف) */}
      <div className="lsc-goal-panel">
        <div className="modal-head"><div className="modal-title">هدفِ روزانه‌ی تو</div></div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-2">
            {[["کالری", 2100], ["پروتئین (گرم)", 140], ["کربوهیدرات (گرم)", 220], ["چربی (گرم)", 70]].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-dash-border bg-white/[0.02] px-1.5 py-2 text-center">
                <div className="mono text-[13px] font-bold text-dash-text">{fa(v)}</div>
                <div className="mt-0.5 text-[9px] text-dash-muted">{l}</div>
              </div>
            ))}
          </div>
          <div className="text-[10.5px] text-dash-muted">بر اساسِ قد، وزن، سن، روزهای تمرین در هفته و هدفت (کاهش، حفظ یا افزایش وزن).</div>
        </div>
      </div>
      <CalorieMacrosCard entries={entries} target={{ proteinTargetG: 140, carbsTargetG: 220, fatTargetG: 70 }} />
    </Pv>
  );
}

/* ─── ژورنال ترید ─── */
export function PreviewTrade() {
  const heads = [
    { l: "بالانس کل", I: Wallet, v: "20542$" },
    { l: "سود/زیان خالص", I: ArrowUp, v: "1242$", up: true },
    { l: "نرخ برد", I: Percent, v: "61.5%", up: true },
  ];
  return (
    <Pv>
      <div className="trade-surface lsc-trade-box">
        <div className="trade-journal-kpis">
          <div className="trade-headline-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {heads.map(({ l, I, v, up }) => (
              <div key={l} className="trade-headline-stat">
                <div className="trade-stat-label"><I size={12} /> {l}</div>
                <div className="trade-headline-value mono" dir="ltr" style={up ? { color: "var(--pnl-win)" } : undefined}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <MockAccountCard a={{ name: "حساب پراپ", color: "#3E7BFA", balance: "10842$", pct: "8.4", up: true, trades: 24, win: 62, broker: "FTMO", mt: true }} />
          <MockAccountCard a={{ name: "حساب شخصی", color: "#F5A524", balance: "9700$", pct: "3.1", up: true, trades: 41, win: 58, mt: true }} />
        </div>
      </div>
      <div className="trade-surface trade-page-box trade-checklist-detail-box lsc-trade-box">
        <div className="trade-checklist-detail-head">
          <div className="trade-checklist-detail-title">
            <span className="lsc-cl-name">چک‌لیست ورود</span>
            <span className="trade-account-dot" style={{ background: "#16C79A" }} />
            <span className="trade-account-type">الزامی</span>
          </div>
          <span className="trade-title-add-btn"><Pencil size={13} /> ویرایش</span>
        </div>
        <div className="trade-checklist-items">
          {[["روند تایم بالاتر هم‌جهته", true], ["حد ضرر پشت ساختار", true], ["خبر مهم تا 30 دقیقه‌ی بعد نیست", false]].map(([t, d]) => (
            <div key={t as string} className={`trade-check-row readonly${d ? " done" : ""}`}>
              <span className="trade-check-box" />
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="trade-checklist-card-foot" style={{ marginTop: 12 }}>
          <span className="mono">{fa(2)} / {fa(3)}</span>
        </div>
      </div>
    </Pv>
  );
}

/* ─── تقویم اقتصادی + ساعت فارکس: خودِ ForexSessionsDial با ساعتِ واقعی ─── */
function durationLabel(target: Date, now: Date): string {
  const mins = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60_000));
  return `${fa(Math.floor(mins / 60))}:${fa(String(mins % 60).padStart(2, "0"))}`;
}

export function PreviewMarket({ live }: PreviewProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    if (!live) return;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [live]);

  const rows = now
    ? CLOCK_SESSIONS.map((s) => {
        const arc = arcForDef(s, now);
        const open = arc.open && isForexOpen(now);
        return { s, arc, open, target: open ? arc.closeAt : nextOpenForDef(s, now) };
      })
        .sort((a, b) => (a.open !== b.open ? (a.open ? -1 : 1) : (a.target?.getTime() ?? Infinity) - (b.target?.getTime() ?? Infinity)))
        .slice(0, 2)
    : [];

  return (
    <Pv className="lsc-pv-market">
      <div className="lsc-fx">
        <div className="lsc-fx-dial">{now ? <ForexSessionsDial now={now} /> : <div className="fx-dial-wrap" />}</div>
        <div className="fx-cards lsc-fx-cards">
          {rows.map(({ s, arc, open, target }) => (
            <div key={s.key} className={`fx-card${open ? " open" : ""}`}>
              <span className="fx-card-flag"><FlagCircle code={s.flagCode} /></span>
              <span className="fx-card-main">
                <span className="fx-card-city">{s.label}</span>
                <span className="fx-card-hours mono"><bdi>{fa(arc.openLabel)}</bdi> تا <bdi>{fa(arc.closeLabel)}</bdi></span>
              </span>
              <span className="fx-card-state">
                <span className="fx-card-label">{open ? "تا بسته شدن" : "تا باز شدن"}</span>
                <span className={`fx-card-value${open ? " open" : ""}`}>{target && now ? durationLabel(target, now) : "—"}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="trade-surface trade-page-box trade-cal-table-box">
        <div className="trade-cal-list ltr-inline">
          {[
            { t: "15:30", c: "#E05252", cur: "USD", title: "Core CPI m/m", a: "0.3%", p: "0.2%", f: "0.3%", on: true },
            { t: "17:15", c: "#E05252", cur: "EUR", title: "ECB Interest Rate Decision", a: "", p: "2.15%", f: "2.15%" },
            { t: "18:30", c: "#E0A452", cur: "GBP", title: "BOE Gov Bailey Speaks", a: "", p: "", f: "" },
          ].map((e) => (
            <div key={e.title} className="trade-cal-item">
              <div className="tc-line1">
                <span className="tc-time mono">{e.t}</span>
                <span className="trade-cal-impact-dot" style={{ background: e.c }} />
                <b className="tc-cur mono">{e.cur}</b>
                <span className="tc-title">{e.title}</span>
                <span className={`trade-cal-icon-btn tc-alert${e.on ? " active" : ""}`}><Bell size={13} /></span>
              </div>
              <div className="tc-line2">
                <span className="tc-stat"><i>Actual</i><b className={`mono${e.a ? "" : " muted"}`}>{e.a || "—"}</b></span>
                <span className="tc-stat"><i>Previous</i><b className="mono">{e.p || "—"}</b></span>
                <span className="tc-stat"><i>Forecast</i><b className="mono">{e.f || "—"}</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Pv>
  );
}

/* ─── رودمپ ─── */
export function PreviewRoadmap() {
  return (
    <Pv>
      <MockRoadmapCard
        topic="گیتار"
        title="گیتار آکوستیک از صفر تا اولین آهنگ"
        desc="از گرفتن درستِ گیتار و آکوردهای پایه تا ریتم و نواختنِ یک آهنگ کامل."
        duration="10 هفته"
        stages={5}
        level="صفرِ مطلق"
        pct={40}
      />
      <ol className="lsc-stages">
        <MockRoadmapStage n={1} title="آشنایی با ساز و آکوردهای پایه" duration="2 هفته" done tasksDone={4} tasks={4} />
        <MockRoadmapStage
          n={2} title="ریتم و الگوهای ضرب" duration="2 هفته" tasksDone={1} tasks={3}
          openTasks={[
            { title: "الگوی ضربِ پایین-بالا با مترونوم روی 70", checked: true },
            { title: "تعویضِ روانِ آکوردهای G، C و D" },
          ]}
        />
        <MockRoadmapStage n={3} title="اولین آهنگ کامل" duration="3 هفته" tasksDone={0} tasks={4} />
      </ol>
    </Pv>
  );
}

/* ─── مربی‌ها ─── */
const WEEK = [
  { d: "ش", s: "done" }, { d: "ی", s: "done" }, { d: "د", s: "missed" }, { d: "س", s: "done" },
  { d: "چ", s: "done" }, { d: "پ", s: "today" }, { d: "ج", s: "" },
];
export function PreviewMentor() {
  return (
    <Pv>
      <MockMentorCard name="علی کاظمی" line="مربی بدنسازی · 8 سال تجربه" rating="4.8" count="52" since="مهر 1403" />
      <MockCard>
        <MockMentorChat
          peer="علی کاظمی"
          msgs={[
            { text: "این هفته چهار جلسه کامل بود، عالیه. از فردا وزنه‌ی پرس رو 2.5 کیلو ببر بالا.", time: "18:42" },
            { mine: true, text: "حتماً! دوشنبه جا موند، جبرانش کنم؟", time: "18:45" },
          ]}
        />
      </MockCard>
      <MockCard>
        <div className="flex items-center justify-between text-[12.5px] font-bold">
          <span>پیشرفتِ این هفته</span>
          <span className="text-[11px] font-semibold text-dash-muted">از تیک‌های روتینِ شاگرد</span>
        </div>
        <div className="lsc-week">
          {WEEK.map((w) => (
            <span key={w.d} className={`lsc-week-cell${w.s ? ` is-${w.s}` : ""}`}>
              <small>{w.d}</small>
              <i>{w.s === "done" ? <Check size={11} strokeWidth={3} /> : w.s === "missed" ? <X size={11} strokeWidth={3} /> : null}</i>
            </span>
          ))}
        </div>
      </MockCard>
    </Pv>
  );
}

