"use client";

import "./weekly-analysis.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { BarChart3, ChevronLeft, Mail, Newspaper, RotateCw } from "lucide-react";
import type { AiCoach, AnalysisDomain, ReflectionDto, WeeklyAnalysis, WeeklyGoalDto } from "@/lib/weeklyAnalysis/types";
import { ModuleGate } from "./ModuleGate";
import { AuthGate } from "./AuthGate";
import { Spinner } from "./Spinner";
import { WeeklyAnalysisNav, MIN_OFFSET } from "./WeeklyAnalysisNav";
import { WeeklyAnalysisHero } from "./WeeklyAnalysisHero";
import { WeeklyAnalysisDomains } from "./WeeklyAnalysisDomains";
import { WeeklyAnalysisRhythm } from "./WeeklyAnalysisRhythm";
import { WeeklyAnalysisDaySheet } from "./WeeklyAnalysisDaySheet";
import { WeeklyAnalysisHeatmap } from "./WeeklyAnalysisHeatmap";
import { WeeklyAnalysisTrend } from "./WeeklyAnalysisTrend";
import { WeeklyAnalysisNumbers } from "./WeeklyAnalysisNumbers";
import { WeeklyAnalysisInsights } from "./WeeklyAnalysisInsights";
import { WeeklyAnalysisAchievements } from "./WeeklyAnalysisAchievements";
import { WeeklyAnalysisCoach } from "./WeeklyAnalysisCoach";
import { WeeklyAnalysisGoals, type GoalDraft } from "./WeeklyAnalysisGoals";
import { WeeklyAnalysisReflection } from "./WeeklyAnalysisReflection";
import { WeeklyAnalysisShare } from "./WeeklyAnalysisShare";
import { WeeklyAnalysisEmpty } from "./WeeklyAnalysisEmpty";
import { WeeklyAnalysisSleep } from "./WeeklyAnalysisSleep";
import { V_WK_CARD, V_WK_GRID, WK_EASE, normalizeAnalysis, waFetch } from "./WeeklyAnalysisKit";

export type WeeklyGate = "guest" | "on";

const STALE_MS = 45_000; // بعد از این مدت، ورود دوباره به یک هفته‌ی کش‌شده بی‌صدا تازه می‌شه
const SWIPE_MIN = 70; // px
const SWIPE_RATIO = 1.6; // افقی باید به این اندازه از عمودی بیشتر باشه

// ---- کش کلاینتی ----
// کش در سطح ماژول: برگشتن به صفحه (یا back مرورگر) فوری و بدون اسکلت باز می‌شه
type Entry = { a: WeeklyAnalysis; at: number };
const cache = new Map<number, Entry>();
const inflight = new Map<number, Promise<WeeklyAnalysis>>();

function fetchWeek(off: number, signal?: AbortSignal): Promise<WeeklyAnalysis> {
  const hit = inflight.get(off);
  if (hit) return hit;
  const p = waFetch<{ analysis: WeeklyAnalysis }>(`/api/analysis/weekly?offset=${off}`, { signal })
    .then((d) => {
      const a = normalizeAnalysis(d.analysis);
      cache.set(off, { a, at: Date.now() });
      return a;
    })
    .finally(() => { inflight.delete(off); });
  inflight.set(off, p);
  return p;
}

// اگه از یه لینک مشخص باز شده باشه (مثلا نوتیف «آنالیز هفته‌ی قبلت آماده‌ست»
// با ?offset=-1)، همون هفته باز می‌شه. از window.location مستقیم می‌خونیم
// (نه useSearchParams) تا Suspense لازم نباشه.
function offsetFromUrl(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(new URLSearchParams(window.location.search).get("offset"));
  return Number.isInteger(v) && v <= 0 && v >= MIN_OFFSET ? v : 0;
}

// فقط سمت کلاینت بعد از mount: وضعیت فلگ قابلیت‌ها (useFeature) و کش کلاینتی
// سمت سرور وجود ندارن و رندر اولیه رو با HTML سرور ناسازگار می‌کردن
function AfterMount({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on ? <>{children}</> : null;
}

function TitleRow({ analysis }: { analysis: WeeklyAnalysis | null }) {
  const unread = !!analysis?.unreadLetter;
  return (
    <div className="wk-title-row">
      <div className="wk-title">
        <span className="page-title-icon"><BarChart3 /></span>
        <h1>آنالیز هفتگی</h1>
      </div>
      <div className="wk-actions">
        <Link href="/analysis/weekly/letters" className="account-outline-btn wk-small-btn wk-letters-btn" prefetch={false}>
          <Newspaper size={14} />
          هفته‌نامه
          {unread && <i className="wk-unread-dot" aria-label="هفته‌نامه‌ی خوانده‌نشده" />}
        </Link>
        <WeeklyAnalysisShare analysis={analysis} />
      </div>
    </div>
  );
}

function LetterBanner({ analysis }: { analysis: WeeklyAnalysis }) {
  const l = analysis.unreadLetter;
  if (!l) return null;
  return (
    <motion.div variants={V_WK_CARD} className="wk-span-12">
      <Link href={`/analysis/weekly/letters/${l.weekStart}`} className="wk-card wk-banner" prefetch={false}>
        <span className="wk-banner-ic"><Mail size={20} /></span>
        <span className="wk-banner-text">
          <b>هفته‌نامه‌ی شماره <span className="wk-num">{l.issueNo}</span> رسید</b>
          <span className="wk-banner-sub">{l.headline || l.weekLabel}</span>
        </span>
        <span className="wk-banner-go">بخون<ChevronLeft size={15} /></span>
      </Link>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="wk-grid wk-skeleton" aria-hidden="true">
      <div className="wk-card wk-span-12 wk-sk-hero">
        <span className="wk-sk-ring" />
        <span className="wk-sk-lines"><i /><i /><i /></span>
      </div>
      <div className="wk-span-12 wk-domain-grid">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="wk-card wk-sk-domain" />)}
      </div>
      <div className="wk-card wk-span-7 wk-sk-block" />
      <div className="wk-card wk-span-5 wk-sk-block" />
    </div>
  );
}

function WeeklyAnalysisBody({ initial }: { initial: WeeklyAnalysis | null }) {
  const first = useMemo(() => (initial ? normalizeAnalysis(initial) : null), [initial]);
  // بدون داده‌ی سرور (مثلا خطای رندر سرور) آفست رو بعد از mount از آدرس می‌خونیم
  // تا HTML سرور و کلاینت یکی بمونن
  const [offset, setOffset] = useState<number>(first ? first.offset : 0);
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(() => {
    if (first) cache.set(first.offset, { a: first, at: Date.now() });
    return first;
  });
  useEffect(() => {
    if (first) return;
    const o = offsetFromUrl();
    if (o !== 0) setOffset(o);
  }, [first]);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);
  const dir = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const controls = useAnimationControls();
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const seenWeek = useRef<string | null>(first?.weekStart ?? null);

  // ---- بارگذاری هفته‌ی انتخابی ----
  const load = useCallback((off: number, force = false) => {
    abortRef.current?.abort();
    const hit = cache.get(off);
    if (hit && !force) {
      setAnalysis(hit.a);
      setError(null);
      if (Date.now() - hit.at < STALE_MS) return;
      // کهنه: همین الان نشونش بده، پشت صحنه تازه کن
      fetchWeek(off).then((a) => setAnalysis((cur) => (cur && cur.offset === off ? a : cur))).catch(() => {});
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    fetchWeek(off, ctrl.signal)
      .then((a) => { if (!ctrl.signal.aborted) setAnalysis(a); })
      .catch((e) => { if (!ctrl.signal.aborted && (e as Error)?.name !== "AbortError") setError((e as Error).message); });
  }, []);

  useEffect(() => {
    load(offset);
    // آدرس هم‌گام با هفته‌ی انتخابی — رفرش/اشتراک لینک همون هفته رو باز می‌کنه
    try {
      const url = new URL(window.location.href);
      if (offset === 0) url.searchParams.delete("offset");
      else url.searchParams.set("offset", String(offset));
      window.history.replaceState(window.history.state, "", url.toString());
    } catch { /* بی‌اهمیت */ }
    setDay(null);
    return () => abortRef.current?.abort();
  }, [offset, load]);

  // هفته‌ی قبل رو وقتی مرورگر بیکاره از قبل بگیر تا دکمه‌ی «قبلی» فوری باشه
  useEffect(() => {
    if (!analysis || analysis.offset !== offset) return;
    const target = offset - 1;
    if (target < MIN_OFFSET || cache.has(target)) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const run = () => { fetchWeek(target).catch(() => {}); };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(run, 1200);
    return () => clearTimeout(t);
  }, [analysis, offset]);

  // برگشت به تب بعد از چند دقیقه: هفته‌ی جاری تازه بشه
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const hit = cache.get(offset);
      if (hit && Date.now() - hit.at > 120_000) load(offset, true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [offset, load]);

  // ---- ناوبری ----
  const go = useCallback((next: number) => {
    const clamped = Math.max(MIN_OFFSET, Math.min(0, next));
    setOffset((cur) => {
      if (clamped === cur) return cur;
      dir.current = clamped < cur ? 1 : -1; // قدیمی‌تر: از راست وارد می‌شه
      return clamped;
    });
  }, []);

  // ورود جهت‌دار محتوا وقتی داده‌ی هفته‌ی تازه نشست (اولین بار نه)
  const weekStart = analysis?.weekStart ?? null;
  useEffect(() => {
    if (!weekStart) return;
    if (seenWeek.current === null) { seenWeek.current = weekStart; return; }
    if (seenWeek.current === weekStart) return;
    seenWeek.current = weekStart;
    const d = dir.current || 1;
    controls.set({ x: d * 26, opacity: 0.4 });
    void controls.start({ x: 0, opacity: 1, transition: { duration: 0.42, ease: WK_EASE } });
  }, [weekStart, controls]);

  // ---- کشیدن افقی برای عوض‌کردن هفته (فقط لمس) ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || !e.isPrimary) return;
    if ((e.target as HTMLElement).closest("[data-noswipe],input,textarea,select")) { swipe.current = null; return; }
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
    // انگشت به چپ = هفته‌ی قدیمی‌تر (سمت راست)، به راست = جدیدتر
    go(dx < 0 ? offset - 1 : offset + 1);
  };

  // ---- به‌روزرسانی محلی بعد از ذخیره‌ها (کش هم هم‌گام می‌شه) ----
  const patch = useCallback((fn: (a: WeeklyAnalysis) => WeeklyAnalysis) => {
    setAnalysis((a) => {
      if (!a) return a;
      const next = fn(a);
      cache.set(a.offset, { a: next, at: cache.get(a.offset)?.at ?? Date.now() });
      return next;
    });
  }, []);
  const onAi = (ai: AiCoach) => patch((a) => ({ ...a, ai }));
  const onGoalAdded = (g: WeeklyGoalDto) => patch((a) => ({ ...a, nextWeekGoals: [...a.nextWeekGoals, g] }));
  const onGoalDeleted = (id: string) =>
    patch((a) => ({ ...a, goals: a.goals.filter((g) => g.id !== id), nextWeekGoals: a.nextWeekGoals.filter((g) => g.id !== id) }));
  const onReflection = (reflection: ReflectionDto) => patch((a) => ({ ...a, reflection }));
  const onAddGoalFromCoach = (d: { domain: AnalysisDomain | null; title: string }) => setGoalDraft({ ...d, nonce: Date.now() });

  // لینک #goals / #sleep بعد از لود محتوا (بخش‌ها بعد از رندر ساخته می‌شن)
  const hashDone = useRef(false);
  useEffect(() => {
    if (!analysis || hashDone.current) return;
    const h = window.location.hash;
    if (h !== "#goals" && h !== "#reflection") return;
    hashDone.current = true;
    const t = setTimeout(() => document.getElementById(h.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
    return () => clearTimeout(t);
  }, [analysis]);

  const loading = !analysis || analysis.offset !== offset;
  const showCoach = !!analysis && (!!analysis.ai || analysis.aiAvailable);
  const hasAnyData = !!analysis && (analysis.domains.some((d) => d.hasData) || analysis.overall.score !== null);

  return (
    <section className="wk-page" aria-busy={loading}>
      <TitleRow analysis={analysis} />

      <WeeklyAnalysisNav
        offset={offset}
        weekLabel={analysis && analysis.offset === offset ? analysis.weekLabel : null}
        trend={analysis?.trend ?? []}
        loading={loading && !error}
        onChange={go}
      />

      {error && loading ? (
        <div className="wk-card wk-error-card" role="alert">
          <div>{error}</div>
          <button type="button" className="account-outline-btn" onClick={() => load(offset, true)}><RotateCw size={14} />تلاش دوباره</button>
        </div>
      ) : !analysis ? (
        <Skeleton />
      ) : (
        <div className="wk-swipe" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }}>
          <motion.div animate={controls} className={`wk-content${loading ? " is-loading" : ""}`}>
            {/* پرده‌ی بی‌صدا: حین گرفتن هفته‌ی تازه محتوای قبلی کم‌رنگ می‌مونه */}
            {loading && <span className="wk-loading-chip" role="status"><Spinner size={13} label={null} />در حال بارگذاری</span>}
            <motion.div className="wk-grid" variants={V_WK_GRID} initial="hidden" animate="show">
              <LetterBanner analysis={analysis} />

              {hasAnyData ? (
                <>
                  <div className="wk-span-12 wk-pass"><WeeklyAnalysisHero analysis={analysis} /></div>
                  <div className="wk-span-12 wk-pass"><WeeklyAnalysisDomains domains={analysis.domains} days={analysis.days} /></div>
                  <div className="wk-span-7 wk-pass">
                    <WeeklyAnalysisRhythm days={analysis.days} prevDays={analysis.prevDays} selected={day} onPick={setDay} />
                  </div>
                  <div className="wk-span-5 wk-pass">
                    <WeeklyAnalysisHeatmap domains={analysis.domains} days={analysis.days} onPickDay={setDay} />
                  </div>
                  <div className={`${analysis.numbers.length ? "wk-span-7" : "wk-span-12"} wk-pass`}>
                    <WeeklyAnalysisTrend trend={analysis.trend} offset={analysis.offset} onJump={go} />
                  </div>
                  {analysis.numbers.length > 0 && (
                    <div className="wk-span-5 wk-pass"><WeeklyAnalysisNumbers numbers={analysis.numbers} /></div>
                  )}
                  {/* مربی وقتی نه نتیجه‌ی کش‌شده داره نه AI در دسترسه، کارت خالی‌ای نمی‌سازه */}
                  <div className={`${showCoach ? "wk-span-6" : "wk-span-12"} wk-pass`}><WeeklyAnalysisInsights insights={analysis.insights} /></div>
                  {showCoach && (
                    <div className="wk-span-6 wk-pass">
                      <WeeklyAnalysisCoach
                        offset={analysis.offset}
                        ai={analysis.ai}
                        aiAvailable={analysis.aiAvailable}
                        canAddGoal={analysis.offset === 0}
                        onAi={onAi}
                        onAddGoal={onAddGoalFromCoach}
                      />
                    </div>
                  )}
                  <div className="wk-span-12 wk-pass"><WeeklyAnalysisAchievements achievements={analysis.achievements} /></div>
                </>
              ) : (
                <div className="wk-span-12 wk-pass"><WeeklyAnalysisEmpty domains={analysis.domains} isCurrentWeek={analysis.isCurrentWeek} /></div>
              )}
              <div className={`${hasAnyData ? "wk-span-6" : "wk-span-6"} wk-pass`}>
                <WeeklyAnalysisGoals
                  offset={analysis.offset}
                  goals={analysis.goals}
                  nextWeekGoals={analysis.nextWeekGoals}
                  domains={analysis.domains}
                  draft={goalDraft}
                  onAdded={onGoalAdded}
                  onDeleted={onGoalDeleted}
                />
              </div>
              <div className="wk-span-6 wk-pass">
                <WeeklyAnalysisReflection
                  key={analysis.weekStart}
                  offset={analysis.offset}
                  reflection={analysis.reflection}
                  onSaved={onReflection}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {analysis && hasAnyData && (
        <WeeklyAnalysisDaySheet analysis={analysis} index={day} onClose={() => setDay(null)} onIndex={setDay} />
      )}
    </section>
  );
}

/**
 * گیت سمت سرور (app/analysis/weekly/page.tsx) تصمیم می‌گیره و داده‌ی هفته‌ی
 * اول رو همراه HTML می‌فرسته؛ پس بار اول نه اسکلت داریم نه رفت‌وبرگشت اضافه.
 * enforcement واقعی همچنان روی روت API هم هست (requireModule + featureBlocked)
 * و فلگ weeklyAnalysis در layout همین مسیر (FeaturePageGate) سمت سرور چک می‌شه.
 */
export function WeeklyAnalysisClient({ gate, initial }: { gate: WeeklyGate; initial: WeeklyAnalysis | null }) {
  if (gate === "guest") {
    return (
      <section className="wk-page">
        <TitleRow analysis={null} />
        <AuthGate message="برای دیدن آنالیز هفتگی وارد شوید" />
      </section>
    );
  }
  return (
    <>
      <ModuleGate module="AI_INSIGHT">
        <WeeklyAnalysisBody initial={initial} />
      </ModuleGate>
      {/* آمار خواب بیرون از گیت AI Insight: خوندن تاریخچه‌ی خواب آزاده */}
      <AfterMount><section className="wk-page wk-page-sleep"><WeeklyAnalysisSleep /></section></AfterMount>
    </>
  );
}
