"use client";

// آنالیز هفتگی = خواننده‌ی زنده (/analysis/weekly). هر هفته (جاری هم) از
// /api/analysis/letters/live ساخته می‌شه، پس هدف/بازتاب/مربی همون لحظه
// به‌روز می‌شن. جلد، فهرست چسبان، فصل‌ها و ناوبری هفته‌ی قبل/بعد؛ هر فصل
// ناقص بی‌سروصدا حذف می‌شه.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Award, CalendarDays, Compass, LayoutGrid, Lightbulb, Moon, Newspaper, PenLine, Sparkles, Target, Trophy, BarChart3, Grid3x3,
  type LucideIcon,
} from "lucide-react";
import type { LiveWeekPayload } from "@/lib/weeklyLetter/types";
import { weekLabelFa } from "@/lib/weeklyAnalysis/week";
import { useFeature } from "@/lib/useFeatures";
import { Spinner } from "./Spinner";
import { Chapter, Reveal, WeeklyLetterGate, WlError, wlFetch } from "./WeeklyLetterShared";
import { WeeklyLetterCover } from "./WeeklyLetterCover";
import { WeeklyLetterToc, type TocItem } from "./WeeklyLetterToc";
import { WeeklyLetterNumbers } from "./WeeklyLetterNumbers";
import { WeeklyLetterTimeline } from "./WeeklyLetterTimeline";
import { WeeklyLetterDomains } from "./WeeklyLetterDomains";
import { WeeklyLetterAchievements, WeeklyLetterInsights, WeeklyLetterNext, WeeklyLetterWins } from "./WeeklyLetterStory";
import { WeeklyLetterCoach } from "./WeeklyLetterCoach";
import { WeeklyLetterGoals } from "./WeeklyLetterGoals";
import { WeeklyLetterReflection } from "./WeeklyLetterReflection";
import { WeeklyLetterPrediction } from "./WeeklyLetterPrediction";
import { WeeklyLetterShareButton } from "./WeeklyLetterShareButton";
import { WeeklyLetterWeekPicker } from "./WeeklyLetterWeekPicker";
import { WeeklyLetterMatrix } from "./WeeklyLetterMatrix";
import { WeeklyLetterSleep } from "./WeeklyLetterSleep";
import { WeeklyLetterEmpty } from "./WeeklyLetterEmpty";
import { WeeklyLetterStories } from "./WeeklyLetterStories";
import { buildStorySlides, storySeconds } from "./WeeklyLetterStoriesData";
import { normalizeLetter } from "./WeeklyLetterUtils";
import type { LetterCtx } from "./WeeklyLetterCtx";

const STORY_MIN = 3;
const STALE_MS = 45_000;

const CH_ICONS: Record<string, LucideIcon> = {
  "wl-numbers": BarChart3, "wl-days": CalendarDays, "wl-domains": LayoutGrid, "wl-insights": Lightbulb, "wl-wins": Trophy,
  "wl-ach": Award, "wl-next": Compass,
};

export type ReaderQuery = { week: string | null; offset: string | null };

// ---- کش درون‌حافظه‌ی نشست ----
// کلید = رشته‌ی کوئری API ("" = هفته‌ی جاری، "week=YYYY-MM-DD"، "offset=-1").
// reload() ورودی همون هفته رو بی‌اعتبار می‌کنه.
type Entry = { p: LiveWeekPayload; at: number };
const cache = new Map<string, Entry>();
const weekKey = (w: string) => `week=${w}`;

function store(key: string, p: LiveWeekPayload) {
  const e = { p, at: Date.now() };
  cache.set(key, e);
  cache.set(weekKey(p.weekStart), e);
  if (p.isCurrent) cache.set("", e);
}

async function fetchLive(key: string): Promise<LiveWeekPayload> {
  const res = await wlFetch<Partial<LiveWeekPayload>>(`/api/analysis/letters/live${key ? `?${key}` : ""}`);
  const letter = normalizeLetter(res.letter);
  if (!letter || !res.analysis) throw new WlError("داده‌ی این هفته پیدا نشد", 404);
  const p: LiveWeekPayload = {
    letter,
    analysis: res.analysis,
    issue: res.issue ?? null,
    prev: res.prev ?? null,
    next: res.next ?? null,
    weekStart: res.weekStart ?? letter.weekStart,
    offset: res.offset ?? res.analysis.offset ?? 0,
    isCurrent: !!res.isCurrent,
  };
  store(key, p);
  return p;
}

export function WeeklyLetterSkeleton() {
  return (
    <section className="wl-root wl-page" aria-busy="true">
      <div className="wl-skel wl-skel-cover">
        <span className="wl-skel-line" style={{ width: "46%", margin: "0 auto" }} />
        <span className="wl-skel-ring" />
        <span className="wl-skel-line" style={{ width: "84%" }} />
        <span className="wl-skel-line" style={{ width: "62%" }} />
      </div>
      <div className="wl-skel wl-skel-block" />
      <div className="wl-skel wl-skel-block" />
    </section>
  );
}

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.4 });
  return <motion.div className="wl-progress" style={{ scaleX: x }} aria-hidden="true" />;
}

function WeekNav({ prev, next, onGo }: { prev: string | null; next: string | null; onGo: (w: string) => void }) {
  const link = (w: string, cls: string, children: React.ReactNode) => (
    <a
      href={`/analysis/weekly?week=${w}`}
      className={`wl-card wl-nav-card ${cls}`}
      onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onGo(w); }}
    >
      {children}
    </a>
  );
  return (
    <nav className="wl-issue-nav" aria-label="هفته‌های دیگر">
      {prev ? link(prev, "is-prev", <><ArrowRight size={20} /><span><small>هفته‌ی قبل</small><b>{weekLabelFa(prev)}</b></span></>) : <span className="wl-nav-gap" />}
      {next ? link(next, "is-next", <><span><small>هفته‌ی بعد</small><b>{weekLabelFa(next)}</b></span><ArrowLeft size={20} /></>) : <span className="wl-nav-gap" />}
    </nav>
  );
}

function LetterBody({ data, onGo, reload }: { data: LiveWeekPayload; onGo: (w: string) => void; reload: () => void }) {
  const { letter, analysis } = data;
  const [storyOpen, setStoryOpen] = useState(false);
  const slides = useMemo(() => buildStorySlides(letter), [letter]);
  const sleepOn = useFeature("sleep") === true;

  // ?story=1 داستان رو خودکار باز می‌کنه و پارامتر رو از آدرس برمی‌داره (تا ریلود دوباره باز نکنه)
  useEffect(() => {
    let params: URLSearchParams;
    try { params = new URLSearchParams(window.location.search); } catch { return; }
    if (params.get("story") !== "1") return;
    params.delete("story");
    const qs = params.toString();
    try { window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`); } catch { /* آدرس همون می‌مونه */ }
    if (slides.length >= STORY_MIN) setStoryOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = useMemo<LetterCtx>(() => ({
    weekStart: data.weekStart, offset: data.offset, isCurrent: data.isCurrent, analysis, issue: data.issue, reload,
  }), [data, analysis, reload]);

  const hasData = analysis.domains.some((d) => d.hasData) || analysis.overall.score !== null;
  const hasMatrix = analysis.domains.some((d) => d.hasData && d.score !== null);
  const hasCoach = !!analysis.ai || (analysis.aiAvailable && analysis.overall.score !== null);
  const hasGoals = data.isCurrent || analysis.goals.length > 0;

  // ترتیب و شماره‌ی فصل‌ها؛ شرط هر فصل همون شرط نمایش خود فصله
  const chapters = useMemo(() => {
    const c: (TocItem & { show: boolean })[] = [
      { id: "wl-days", label: "روز به روز", show: hasData && letter.days.length > 0 },
      { id: "wl-domains", label: "بخش‌ها", show: hasData && letter.domains.length > 0 },
      { id: "matrix", label: "نقشه‌ی هفته", show: hasMatrix },
      { id: "wl-numbers", label: "عددها و روند", show: hasData && (letter.numbers.length > 0 || letter.trend.length > 1) },
      { id: "wl-insights", label: "بینش‌ها", show: letter.insights.length > 0 },
      { id: "wl-wins", label: "بردها", show: letter.wins.length > 0 || letter.improve.length > 0 },
      { id: "coach", label: "حرف مربی", show: hasCoach },
      { id: "wl-ach", label: "مدال‌ها", show: letter.achievements.length > 0 || !!letter.streak },
      { id: "wl-next", label: "هفته‌ی بعد", show: data.isCurrent && hasData },
      { id: "goals", label: "هدف‌ها", show: hasGoals },
      { id: "reflection", label: "یادداشت خودت", show: true },
      { id: "sleep", label: "خواب", show: sleepOn },
    ];
    return c.filter((x) => x.show);
  }, [letter, data.isCurrent, hasData, hasMatrix, hasCoach, hasGoals, sleepOn]);
  const no = (id: string) => chapters.findIndex((c) => c.id === id) + 1;
  const has = (id: string) => chapters.some((c) => c.id === id);

  // لنگر #goals / #sleep / #coach / #reflection بعد از ساخته‌شدن فصل‌ها
  const hashDone = useRef(false);
  useEffect(() => {
    if (hashDone.current) return;
    const h = window.location.hash.slice(1);
    if (!h) return;
    hashDone.current = true;
    const t = window.setTimeout(() => document.getElementById(h)?.scrollIntoView({ behavior: "smooth", block: "start" }), 600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <ProgressBar />
      <div className="wl-top wl-rd-top">
        <Link href="/analysis/weekly/letters" className="wl-back"><ArrowRight size={16} />آرشیو</Link>
        <div className="wl-rd-tools">
          <WeeklyLetterWeekPicker ctx={ctx} onPick={onGo} />
          <WeeklyLetterShareButton ctx={ctx} />
        </div>
      </div>
      <WeeklyLetterCover
        letter={letter}
        isCurrent={data.isCurrent}
        storyCount={slides.length}
        storySeconds={storySeconds(slides)}
        onPlayStory={() => setStoryOpen(true)}
        prediction={data.isCurrent ? <WeeklyLetterPrediction letter={letter} ctx={ctx} /> : null}
      />
      <WeeklyLetterStories open={storyOpen} onClose={() => setStoryOpen(false)} letter={letter} slides={slides} />
      <WeeklyLetterToc items={chapters} />

      <div className="wl-chapters">
        {!hasData && <WeeklyLetterEmpty ctx={ctx} />}
        {has("wl-days") && (
          <Chapter id="wl-days" no={no("wl-days")} icon={CH_ICONS["wl-days"]} title="روز به روز">
            <WeeklyLetterTimeline days={letter.days} domains={letter.domains} />
          </Chapter>
        )}
        {has("wl-domains") && (
          <Chapter id="wl-domains" no={no("wl-domains")} icon={CH_ICONS["wl-domains"]} title="بخش‌ها">
            <WeeklyLetterDomains domains={letter.domains} />
          </Chapter>
        )}
        {has("matrix") && <WeeklyLetterMatrix letter={letter} ctx={ctx} no={no("matrix")} />}
        {has("wl-numbers") && (
          <Chapter id="wl-numbers" no={no("wl-numbers")} icon={CH_ICONS["wl-numbers"]} title="عددها و روند">
            <WeeklyLetterNumbers numbers={letter.numbers} trend={letter.trend} onJumpWeek={onGo} />
          </Chapter>
        )}
        {has("wl-insights") && (
          <Chapter id="wl-insights" no={no("wl-insights")} icon={CH_ICONS["wl-insights"]} title="بینش‌ها">
            <WeeklyLetterInsights insights={letter.insights} />
          </Chapter>
        )}
        {has("wl-wins") && (
          <Chapter id="wl-wins" no={no("wl-wins")} icon={CH_ICONS["wl-wins"]} title="بردها و جای پیشرفت">
            <WeeklyLetterWins wins={letter.wins} improve={letter.improve} />
          </Chapter>
        )}
        {has("coach") && <WeeklyLetterCoach letter={letter} ctx={ctx} no={no("coach")} />}
        {has("wl-ach") && (
          <Chapter id="wl-ach" no={no("wl-ach")} icon={CH_ICONS["wl-ach"]} title="مدال‌ها">
            <WeeklyLetterAchievements achievements={letter.achievements} streak={letter.streak} />
          </Chapter>
        )}
        {has("wl-next") && (
          <Chapter id="wl-next" no={no("wl-next")} icon={CH_ICONS["wl-next"]} title="هفته‌ی بعد">
            <WeeklyLetterNext letter={letter} />
          </Chapter>
        )}
        {has("goals") && <WeeklyLetterGoals letter={letter} ctx={ctx} no={no("goals")} />}
        <WeeklyLetterReflection letter={letter} ctx={ctx} no={no("reflection")} />
        {has("sleep") && <WeeklyLetterSleep weekStart={data.weekStart} no={no("sleep")} />}
      </div>

      <Reveal className="wl-nav-wrap">
        <WeekNav prev={data.prev} next={data.next} onGo={onGo} />
        <Link href="/analysis/weekly/letters" className="wl-rd-archive-link"><Newspaper size={15} />آرشیو آنالیز هفتگی</Link>
      </Reveal>
    </>
  );
}

function setUrlWeek(weekStart: string | null) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("offset");
    if (weekStart) url.searchParams.set("week", weekStart); else url.searchParams.delete("week");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch { /* آدرس همون می‌مونه */ }
}

function ReaderInner({ initial, query, currentWeek }: { initial: LiveWeekPayload | null; query: ReaderQuery; currentWeek: string | null }) {
  const initKey = initial ? weekKey(initial.weekStart) : query.week ? weekKey(query.week) : query.offset ? `offset=${query.offset}` : "";
  const [data, setData] = useState<LiveWeekPayload | null>(() => {
    if (initial) store(initKey, initial);
    return initial ?? cache.get(initKey)?.p ?? null;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // کلید هفته‌ای که الان باید نشون داده بشه (برای نادیده‌گرفتن پاسخ‌های دیررسیده)
  const target = useRef<string>(initKey);
  const curWeek = useRef<string | null>(currentWeek ?? (initial?.isCurrent ? initial.weekStart : null));
  if (data?.isCurrent) curWeek.current = data.weekStart;

  const load = useCallback((key: string, silent = false) => {
    target.current = key;
    if (!silent) { setBusy(true); setError(null); }
    fetchLive(key)
      .then((p) => {
        if (target.current !== key) return;
        if (p.isCurrent) curWeek.current = p.weekStart;
        setData(p);
        setError(null);
      })
      .catch((e) => {
        if (target.current !== key || silent) return;
        setError(e instanceof WlError ? e.message : "مشکلی پیش اومد");
      })
      .finally(() => { if (target.current === key) setBusy(false); });
  }, []);

  // بار اول بدون داده‌ی سرور (خطای SSR) از API می‌گیره
  useEffect(() => {
    if (!data) load(initKey);
    else if (cache.get(initKey) && Date.now() - (cache.get(initKey)?.at ?? 0) > STALE_MS) load(initKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGo = useCallback((w: string) => {
    const isCur = !!curWeek.current && w >= curWeek.current;
    const key = isCur ? "" : weekKey(w);
    setUrlWeek(isCur ? null : w);
    const hit = cache.get(key);
    if (hit) {
      target.current = key;
      setData(hit.p);
      setError(null);
      setBusy(false);
      if (Date.now() - hit.at > STALE_MS) load(key, true);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    load(key);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [load]);

  // بعد از نوشتن (هدف، بازتاب، مربی): همین هفته بی‌صدا و بدون اسکلت تازه می‌شه
  const reload = useCallback(() => {
    const d = dataRef.current;
    if (!d) return;
    const key = weekKey(d.weekStart);
    cache.delete(key);
    if (d.isCurrent) cache.delete("");
    load(key, true);
  }, [load]);
  const dataRef = useRef<LiveWeekPayload | null>(data);
  dataRef.current = data;

  // هفته‌ی قبل/بعد رو وقتی مرورگر بیکاره از قبل بگیر
  useEffect(() => {
    if (!data) return;
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const run = () => {
      for (const w of [data.prev, data.next]) {
        if (!w || cache.has(weekKey(w))) continue;
        fetchLive(weekKey(w)).catch(() => {});
      }
    };
    const id = ric ? ric(run) : window.setTimeout(run, 1200);
    return () => { if (!ric) window.clearTimeout(id); };
  }, [data]);

  // برگشت به تب بعد از چند دقیقه: داده تازه بشه
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const d = dataRef.current;
      const hit = d ? cache.get(weekKey(d.weekStart)) : null;
      if (d && hit && Date.now() - hit.at > 120_000) load(weekKey(d.weekStart), true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  if (!data) {
    if (error) {
      return (
        <section className="wl-root wl-page">
          <div className="wl-card wl-state">
            <span className="wl-state-ico"><Newspaper size={26} /></span>
            <p>{error}</p>
            <button type="button" className="account-outline-btn wl-cta-btn" onClick={() => load(initKey)}>تلاش دوباره</button>
          </div>
        </section>
      );
    }
    return <WeeklyLetterSkeleton />;
  }
  return (
    <section className={`wl-root wl-page wl-reader${busy ? " wl-rd-busy" : ""}`} aria-busy={busy}>
      {busy && <span className="wl-rd-chip" role="status"><Spinner size={13} label={null} />در حال بارگذاری</span>}
      {error && (
        <div className="wl-card wl-rd-err" role="alert">
          <span>{error}</span>
          <button type="button" className="account-outline-btn wl-cta-btn" onClick={() => load(weekKey(data.weekStart))}>تلاش دوباره</button>
        </div>
      )}
      <LetterBody key={data.weekStart} data={data} onGo={onGo} reload={reload} />
    </section>
  );
}

/** فصل خواب بیرون از گیت AI Insight: خوندن تاریخچه‌ی خواب آزاده (فقط فلگ sleep) */
function LockedSleep({ weekStart }: { weekStart: string }) {
  return (
    <section className="wl-root wl-page wl-rd-locked-sleep">
      <div className="wl-chapters"><WeeklyLetterSleep weekStart={weekStart} /></div>
    </section>
  );
}

export function WeeklyLetterReader({ gate, initial, query, currentWeek }: { gate: "guest" | "on"; initial: LiveWeekPayload | null; query: ReaderQuery; currentWeek: string | null }) {
  // gate=guest: سشن وجود نداره؛ WeeklyLetterGate خودش پیام ورود رو نشون می‌ده
  void gate;
  const lockedWeek = initial?.weekStart ?? currentWeek ?? query.week ?? new Date().toISOString().slice(0, 10);
  return (
    <MotionConfig reducedMotion="user">
      <WeeklyLetterGate skeleton={<WeeklyLetterSkeleton />} whenLocked={<LockedSleep weekStart={lockedWeek} />}>
        <ReaderInner initial={initial} query={query} currentWeek={currentWeek} />
      </WeeklyLetterGate>
    </MotionConfig>
  );
}
