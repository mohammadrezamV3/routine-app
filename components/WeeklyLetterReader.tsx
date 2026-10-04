"use client";

// خواننده‌ی هفته‌نامه (/analysis/weekly/letters/[week]) — یک شماره‌ی مجله‌ای
// کامل: جلد، فهرست چسبان، فصل‌ها و ناوبری شماره‌ی قبل/بعد. داده فقط از API
// واقعی؛ هر بخش ناقص (بدون AI، بدون یادداشت، چند دامنه) بی‌سروصدا حذف می‌شه.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Award, CalendarDays, Compass, LayoutGrid, Lightbulb, Newspaper, PenLine, Sparkles, Target, Trophy, BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { weekLabelFa } from "@/lib/weeklyAnalysis/week";
import { Chapter, Reveal, WeeklyLetterGate, WlError, wlFetch } from "./WeeklyLetterShared";
import { WeeklyLetterCover } from "./WeeklyLetterCover";
import { WeeklyLetterToc, type TocItem } from "./WeeklyLetterToc";
import { WeeklyLetterNumbers } from "./WeeklyLetterNumbers";
import { WeeklyLetterTimeline } from "./WeeklyLetterTimeline";
import { WeeklyLetterDomains } from "./WeeklyLetterDomains";
import {
  WeeklyLetterAchievements, WeeklyLetterCoach, WeeklyLetterGoals, WeeklyLetterInsights, WeeklyLetterNext, WeeklyLetterReflection, WeeklyLetterWins,
} from "./WeeklyLetterStory";
import { WeeklyLetterStories } from "./WeeklyLetterStories";
import { buildStorySlides, storySeconds } from "./WeeklyLetterStoriesData";
import { normalizeLetter, offsetOfWeek } from "./WeeklyLetterUtils";

const CH_ICONS: Record<string, LucideIcon> = {
  "wl-numbers": BarChart3, "wl-days": CalendarDays, "wl-domains": LayoutGrid, "wl-insights": Lightbulb, "wl-wins": Trophy,
  "wl-goals": Target, "wl-ach": Award, "wl-coach": Sparkles, "wl-refl": PenLine, "wl-next": Compass,
};

const STORY_MIN = 3;

type Payload = { letter: WeeklyLetterData; prev: string | null; next: string | null };

// کش درون‌حافظه‌ی نشست: برگشت/جلو بین شماره‌ها فوری
const cache = new Map<string, Payload>();

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

function IssueNav({ prev, next }: { prev: string | null; next: string | null }) {
  return (
    <nav className="wl-issue-nav" aria-label="شماره‌های دیگر">
      {prev ? (
        <Link href={`/analysis/weekly/letters/${prev}`} className="wl-card wl-nav-card is-prev" prefetch>
          <ArrowRight size={20} />
          <span><small>شماره‌ی قبل</small><b>{weekLabelFa(prev)}</b></span>
        </Link>
      ) : <span className="wl-nav-gap" />}
      {next ? (
        <Link href={`/analysis/weekly/letters/${next}`} className="wl-card wl-nav-card is-next" prefetch>
          <span><small>شماره‌ی بعد</small><b>{weekLabelFa(next)}</b></span>
          <ArrowLeft size={20} />
        </Link>
      ) : <span className="wl-nav-gap" />}
    </nav>
  );
}

function LetterBody({ data }: { data: Payload }) {
  const { letter, prev, next } = data;
  const offset = useMemo(() => offsetOfWeek(letter.weekStart), [letter.weekStart]);
  const [storyOpen, setStoryOpen] = useState(false);
  const slides = useMemo(() => buildStorySlides(letter), [letter]);

  // ورودی از بنر صفحه‌ی آنالیز: /analysis/weekly/letters/<week>?story=1 داستان رو خودکار باز می‌کنه
  // و پارامتر رو از آدرس برمی‌داره (تا ریلود/برگشت دوباره باز نکنه). فقط وقتی داستان قابل پخشه.
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

  const chapters = useMemo(() => {
    const c: (TocItem & { show: boolean })[] = [
      { id: "wl-numbers", label: "خلاصه در اعداد", show: letter.numbers.length > 0 || letter.trend.length > 1 },
      { id: "wl-days", label: "روزبه‌روز", show: letter.days.length > 0 },
      { id: "wl-domains", label: "فصل‌ها", show: letter.domains.length > 0 },
      { id: "wl-insights", label: "بینش‌ها", show: letter.insights.length > 0 },
      { id: "wl-wins", label: "بردها", show: letter.wins.length > 0 || letter.improve.length > 0 },
      { id: "wl-goals", label: "اهداف", show: letter.goals.length > 0 },
      { id: "wl-ach", label: "دستاوردها", show: letter.achievements.length > 0 || !!letter.streak },
      { id: "wl-coach", label: "حرف مربی", show: !!letter.ai },
      { id: "wl-refl", label: "یادداشت خودت", show: !!letter.reflection },
      { id: "wl-next", label: "هفته‌ی بعد", show: true },
    ];
    return c.filter((x) => x.show);
  }, [letter]);
  const no = (id: string) => chapters.findIndex((c) => c.id === id) + 1;

  return (
    <>
      <ProgressBar />
      <div className="wl-top">
        <Link href="/analysis/weekly/letters" className="wl-back"><ArrowRight size={16} />همه‌ی شماره‌ها</Link>
      </div>
      <WeeklyLetterCover letter={letter} storyCount={slides.length} storySeconds={storySeconds(slides)} onPlayStory={() => setStoryOpen(true)} />
      <WeeklyLetterStories open={storyOpen} onClose={() => setStoryOpen(false)} letter={letter} slides={slides} offset={offset} />
      <WeeklyLetterToc items={chapters} />

      <div className="wl-chapters">
        {chapters.some((c) => c.id === "wl-numbers") && (
          <Chapter id="wl-numbers" no={no("wl-numbers")} icon={CH_ICONS["wl-numbers"]} title="خلاصه در اعداد">
            <WeeklyLetterNumbers numbers={letter.numbers} trend={letter.trend} />
          </Chapter>
        )}
        {letter.days.length > 0 && (
          <Chapter id="wl-days" no={no("wl-days")} icon={CH_ICONS["wl-days"]} title="روزبه‌روز">
            <WeeklyLetterTimeline days={letter.days} domains={letter.domains} />
          </Chapter>
        )}
        {letter.domains.length > 0 && (
          <Chapter id="wl-domains" no={no("wl-domains")} icon={CH_ICONS["wl-domains"]} title="فصل‌ها">
            <WeeklyLetterDomains domains={letter.domains} />
          </Chapter>
        )}
        {letter.insights.length > 0 && (
          <Chapter id="wl-insights" no={no("wl-insights")} icon={CH_ICONS["wl-insights"]} title="بینش‌ها">
            <WeeklyLetterInsights insights={letter.insights} />
          </Chapter>
        )}
        {(letter.wins.length > 0 || letter.improve.length > 0) && (
          <Chapter id="wl-wins" no={no("wl-wins")} icon={CH_ICONS["wl-wins"]} title="بردها و جای پیشرفت">
            <WeeklyLetterWins wins={letter.wins} improve={letter.improve} />
          </Chapter>
        )}
        {letter.goals.length > 0 && (
          <Chapter id="wl-goals" no={no("wl-goals")} icon={CH_ICONS["wl-goals"]} title="اهداف">
            <WeeklyLetterGoals goals={letter.goals} />
          </Chapter>
        )}
        {(letter.achievements.length > 0 || letter.streak) && (
          <Chapter id="wl-ach" no={no("wl-ach")} icon={CH_ICONS["wl-ach"]} title="دستاوردها">
            <WeeklyLetterAchievements achievements={letter.achievements} streak={letter.streak} />
          </Chapter>
        )}
        {letter.ai && (
          <Chapter id="wl-coach" no={no("wl-coach")} icon={CH_ICONS["wl-coach"]} title="حرف مربی">
            <WeeklyLetterCoach ai={letter.ai} />
          </Chapter>
        )}
        {letter.reflection && (
          <Chapter id="wl-refl" no={no("wl-refl")} icon={CH_ICONS["wl-refl"]} title="یادداشت خودت">
            <WeeklyLetterReflection reflection={letter.reflection} />
          </Chapter>
        )}
        <Chapter id="wl-next" no={no("wl-next")} icon={CH_ICONS["wl-next"]} title="هفته‌ی بعد">
          <WeeklyLetterNext letter={letter} offset={offset} />
        </Chapter>
      </div>

      <Reveal className="wl-nav-wrap">
        <IssueNav prev={prev} next={next} />
      </Reveal>
    </>
  );
}

function ReaderInner({ week }: { week: string }) {
  const [data, setData] = useState<Payload | null>(() => cache.get(week) ?? null);
  const [error, setError] = useState<WlError | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    let alive = true;
    setError(null);
    wlFetch<Partial<Payload>>(`/api/analysis/letters/${week}`)
      .then((res) => {
        if (!alive) return;
        const letter = normalizeLetter(res.letter);
        if (!letter) throw new WlError("این شماره پیدا نشد", 404);
        const p: Payload = { letter, prev: res.prev ?? null, next: res.next ?? null };
        cache.set(week, p);
        setData(p);
      })
      .catch((e) => { if (alive) setError(e instanceof WlError ? e : new WlError("مشکلی پیش اومد", 0)); });
    return () => { alive = false; };
  }, [week]);

  useEffect(() => {
    const cached = cache.get(week);
    setData(cached ?? null);
    return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, tick]);

  // پیش‌واکشی شماره‌ی قبل/بعد وقتی مرورگر بیکاره
  useEffect(() => {
    if (!data) return;
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const run = () => {
      for (const w of [data.prev, data.next]) {
        if (!w || cache.has(w)) continue;
        wlFetch<Partial<Payload>>(`/api/analysis/letters/${w}`)
          .then((res) => {
            const letter = normalizeLetter(res.letter);
            if (letter) cache.set(w, { letter, prev: res.prev ?? null, next: res.next ?? null });
          })
          .catch(() => {});
      }
    };
    const id = ric ? ric(run) : window.setTimeout(run, 1200);
    return () => { if (!ric) window.clearTimeout(id); };
  }, [data]);

  if (error && !data) {
    const missing = error.status === 404;
    return (
      <section className="wl-root wl-page">
        <div className="wl-card wl-state">
          <span className="wl-state-ico"><Newspaper size={26} /></span>
          <p>{missing ? "این شماره‌ی هفته‌نامه پیدا نشد" : error.message}</p>
          {missing ? (
            <Link href="/analysis/weekly/letters" className="account-outline-btn wl-cta-btn">همه‌ی شماره‌ها</Link>
          ) : (
            <button type="button" className="account-outline-btn wl-cta-btn" onClick={() => setTick((t) => t + 1)}>تلاش دوباره</button>
          )}
        </div>
      </section>
    );
  }
  if (!data) return <WeeklyLetterSkeleton />;
  return (
    <section className="wl-root wl-page wl-reader" key={week}>
      <LetterBody data={data} />
    </section>
  );
}

export function WeeklyLetterReader({ week }: { week: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <WeeklyLetterGate skeleton={<WeeklyLetterSkeleton />}>
        <ReaderInner week={week} />
      </WeeklyLetterGate>
    </MotionConfig>
  );
}
