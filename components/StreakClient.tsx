"use client";

// بخش «استریک» — باکس اصلی استریک (شعله‌ی زنده، شمارنده، حلقه تا مایلستون
// بعدی، مسیر مایلستون‌ها، ۷ روز اخیر و وضعیت امروز) + همه‌ی اچیومنت‌ها + نام
// طلایی. استریک زنده از lib/storage (useDashboardRoutine → lib/routineStreak.ts،
// همون تعریف هدر و داشبورد) میاد، پس همون ثانیه‌ای که آخرین برنامه‌ی امروز
// تیک می‌خوره این‌جا هم یکی بالا می‌ره. اچیومنت‌ها کاملا سمت سرور حساب/ثبت
// می‌شن (/api/achievements) و با هر تیک (بی‌درنگ، با کمی مکث) دوباره خونده می‌شن.

import "@/app/dashboard/dashboard.css";
import "@/app/streak/streak.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { AuthGate } from "./AuthGate";
import { ModuleGate } from "./ModuleGate";
import { SegmentedTabs } from "./SegmentedTabs";
import { GradientRing } from "./GradientRing";
import { AchievementIcon } from "./AchievementIcons";
import { GoldenName } from "./GoldenName";
import { BentoCard, CardHead, CountUp, D_EASE, Skel, V_GRID } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";
import { useDashboardRoutine } from "@/lib/useDashboardRoutine";
import { useLiveRefresh, keyMatches } from "@/lib/liveSync";
import { getStreakTier, STREAK_MILESTONES } from "@/lib/streakTier";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, ACHIEVEMENT_CATEGORIES, type AchievementCategory } from "@/lib/achievements";
import type { AchievementsPayload } from "@/lib/achievementsServer";
import { FA_WEEKDAY_SHORT, J_MONTHS, toJalali } from "@/lib/jalali";

export function StreakClient() {
  const { status } = useSession();
  if (status === "unauthenticated") {
    return <section className="db-page"><AuthGate message="برای دیدن استریک و اچیومنت‌ها وارد شوید" /></section>;
  }
  return (
    <section className="db-page dash-scope stk-page">
      <ModuleGate module="ROUTINE">
        <MotionConfig reducedMotion="user">
          <StreakBody />
        </MotionConfig>
      </ModuleGate>
    </section>
  );
}

type Filter = "all" | "unlocked" | AchievementCategory;

function useAchievements() {
  const [data, setData] = useState<AchievementsPayload | null>(null);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = useCallback(() => {
    fetch("/api/achievements", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: AchievementsPayload) => { setData(j); setError(false); })
      .catch(() => setError(true));
  }, []);
  useEffect(() => { load(); return () => { if (timer.current) clearTimeout(timer.current); }; }, [load]);
  // هر تیک/تغییر خواب → یک بار (debounce) دوباره حساب — تا تیک پشت‌سرهم ده درخواست نسازه
  useLiveRefresh(["daily", "customOccurrences", "sleep", "wakeSleepTimes"], (changed) => {
    if (!changed.some((c) => c === "*" || keyMatches("daily", c) || c === "customOccurrences" || c === "sleep" || c === "wakeSleepTimes")) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 1200);
  });
  return { data, error, reload: load };
}

function StreakBody() {
  const routine = useDashboardRoutine();
  const { data: session } = useSession();
  const ach = useAchievements();
  const [filter, setFilter] = useState<Filter>("all");
  const [celebrate, setCelebrate] = useState<string[]>([]);

  useEffect(() => {
    if (ach.data?.fresh.length) setCelebrate(ach.data.fresh);
  }, [ach.data?.fresh]);

  const name = ((session?.user as { name?: string } | undefined)?.name ?? "").split(" ")[0];

  return (
    <>
      <StreakHero routine={routine} best={ach.data?.metrics.bestStreak ?? null} />

      <motion.div className="stk-grid" variants={V_GRID} initial="hidden" animate="show">
        <GoldenCard data={ach.data} name={name} />
        <StatsCard data={ach.data} streak={routine.streak} />
      </motion.div>

      <BentoCard className="stk-ach" label="اچیومنت‌ها">
        <CardHead
          icon="trophy"
          title="اچیومنت‌ها"
          extra={ach.data ? <span className="stk-ach-count"><b>{ach.data.unlockedCount}</b>/{ach.data.total}</span> : null}
        />
        <div className="stk-filter">
          <SegmentedTabs<Filter>
            ariaLabel="دسته‌ی اچیومنت‌ها"
            active={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "همه" },
              { value: "unlocked", label: "باز شده" },
              ...(Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[]).map((c) => ({ value: c as Filter, label: ACHIEVEMENT_CATEGORIES[c] })),
            ]}
          />
        </div>
        {ach.error && !ach.data ? (
          <div className="db-empty">
            <p>دریافت اچیومنت‌ها ناموفق بود.</p>
            <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={ach.reload}>تلاش دوباره</button>
          </div>
        ) : (
          <AchievementGrid data={ach.data} filter={filter} />
        )}
      </BentoCard>

      <AnimatePresence>
        {celebrate.length > 0 && <UnlockToast ids={celebrate} onDone={() => setCelebrate([])} />}
      </AnimatePresence>
    </>
  );
}

// ── باکس اصلی استریک ───────────────────────────────────────
function StreakHero({ routine, best }: { routine: ReturnType<typeof useDashboardRoutine>; best: number | null }) {
  const streak = routine.streak;
  const tier = getStreakTier(streak);
  const s = streak ?? 0;
  const prev = tier.milestone ?? 0;
  const next = tier.nextMilestone;
  const toNext = next ? (s - prev) / (next - prev) : 1;
  const { completed, total } = routine.stats;
  const todayDone = total > 0 && completed === total;
  const last7 = useMemo(() => routine.heat.flat().filter((c) => !c.future).slice(-7), [routine.heat]);

  const todayLine = !routine.ready
    ? null
    : total === 0
      ? "امروز برنامه‌ای نداری — استریک سر جاش می‌مونه"
      : todayDone
        ? "امروز هم کامل شد — همین الان به استریک اضافه شد"
        : `${total - completed} برنامه‌ی دیگه تا اضافه‌شدن امروز به استریک`;

  return (
    <motion.div variants={V_GRID} initial="hidden" animate="show">
    <BentoCard className={`stk-hero tier-${tier.tier}${todayDone ? " is-lit" : ""}`} label="استریک">
      <span className="stk-hero-aura" aria-hidden="true" />
      <div className="stk-hero-main">
        <div className="stk-flame-wrap">
          <GradientRing value={streak === null ? 0 : Math.min(1, toNext)} size={188} stroke={10} grad={["var(--stk-a)", "var(--stk-b)"]} delay={0.2}>
            <BigFlame tier={tier.tier} lit={s > 0} />
          </GradientRing>
        </div>
        <div className="stk-hero-info">
          <span className="stk-kicker">{tier.name}</span>
          <div className="stk-count">
            {streak === null ? <Skel w={90} h={56} r={14} /> : <CountUp value={s} className="stk-count-num" />}
            <span className="stk-count-unit">روز پشت‌سرهم</span>
          </div>
          <p className="stk-today" aria-live="polite">
            {todayLine === null ? <Skel w="80%" h={12} /> : <><span className={`stk-today-dot${todayDone ? " is-done" : ""}`} />{todayLine}</>}
          </p>
          <div className="stk-hero-meta">
            <span><DashIcon name="trophy" /> بهترین رکورد: <b>{best === null ? "…" : Math.max(best, s)}</b> روز</span>
            {next && <span><DashIcon name="target" /> مایلستون بعدی: <b>{next}</b> روز ({next - s} روز دیگه)</span>}
          </div>
        </div>
      </div>

      <MilestoneTrack streak={s} />

      <div className="stk-week" aria-label="7 روز اخیر">
        {last7.map((c, i) => {
          const [y, m, d] = c.iso.split("-").map(Number);
          const wd = FA_WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()];
          const state = c.pct === null ? "rest" : c.pct === 100 ? "done" : c.today ? "today" : "miss";
          return (
            <motion.div key={c.iso} className={`stk-day is-${state}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}>
              <span className="stk-day-icon">
                {state === "done" ? <MiniFlame /> : state === "rest" ? <span className="stk-day-rest" /> : <GradientRing value={(c.pct ?? 0) / 100} size={20} stroke={4} grad={["var(--stk-a)", "var(--stk-b)"]} className="stk-day-ring" />}
              </span>
              <em>{wd}</em>
            </motion.div>
          );
        })}
      </div>
    </BentoCard>
    </motion.div>
  );
}

function MilestoneTrack({ streak }: { streak: number }) {
  const ms = STREAK_MILESTONES;
  return (
    <ol className="stk-miles" aria-label="مایلستون‌های استریک">
      {ms.map((m, i) => {
        const reached = streak >= m;
        const current = !reached && (i === 0 || streak >= ms[i - 1]);
        return (
          <li key={m} className={`${reached ? "is-reached" : ""}${current ? " is-next" : ""}`}>
            <motion.span className="stk-mile-node" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 420, damping: 18 }}>
              {reached ? <MiniFlame /> : null}
            </motion.span>
            <span className="stk-mile-label">{m}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** شعله‌ی بزرگ چندلایه — رنگ و شدت حرکتش با سطح استریک زیاد می‌شه */
function BigFlame({ tier, lit }: { tier: number; lit: boolean }) {
  return (
    <svg className={`stk-flame${lit ? " is-lit" : ""}`} viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <radialGradient id="stk-fl-outer" cx="50%" cy="78%" r="70%">
          <stop offset="0%" stopColor="var(--stk-c)" />
          <stop offset="55%" stopColor="var(--stk-b)" />
          <stop offset="100%" stopColor="var(--stk-a)" />
        </radialGradient>
        <radialGradient id="stk-fl-inner" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#fffbe6" />
          <stop offset="60%" stopColor="var(--stk-c)" />
          <stop offset="100%" stopColor="var(--stk-b)" />
        </radialGradient>
      </defs>
      <g className="stk-fl-outer">
        <path d="M60 6c6 22 30 34 34 62 5 34-15 62-34 62S21 108 26 76c3-19 15-26 17-44 10 10 11 21 11 21S66 36 60 6Z" fill="url(#stk-fl-outer)" />
      </g>
      <g className="stk-fl-inner">
        <path d="M60 52c4 13 20 22 20 42 0 18-10 30-20 30s-20-12-20-28c0-12 7-17 9-28 6 6 6 13 6 13s7-12 5-29Z" fill="url(#stk-fl-inner)" />
      </g>
      {tier >= 3 && (
        <g className="stk-fl-sparks">
          <circle cx="30" cy="40" r="2.2" fill="var(--stk-c)" />
          <circle cx="92" cy="34" r="1.8" fill="var(--stk-c)" />
          <circle cx="78" cy="14" r="1.5" fill="#fffbe6" />
        </g>
      )}
    </svg>
  );
}

function MiniFlame() {
  return (
    <svg viewBox="0 0 24 24" className="stk-mini-flame" aria-hidden="true">
      <path d="M12 2c1.4 4.2 6 6.6 6 12a6 6 0 0 1-12 0c0-3.4 2-5 2.6-8 1.8 1.6 2 3.6 2 3.6S12.8 6 12 2Z" fill="currentColor" />
    </svg>
  );
}

// ── نام طلایی ───────────────────────────────────────────────
function GoldenCard({ data, name }: { data: AchievementsPayload | null; name: string }) {
  const pct = data ? data.unlockedCount / data.total : 0;
  return (
    <BentoCard className={`stk-golden${data?.golden ? " is-golden" : ""}`} label="نام طلایی">
      <CardHead icon="spark" title="نام طلایی" />
      <div className="stk-golden-body">
        <GradientRing value={pct} size={92} stroke={8} grad={["#d4891a", "#fff3b0"]} delay={0.3}>
          <b className="stk-golden-pct">{data ? Math.round(pct * 100) : "…"}%</b>
        </GradientRing>
        <div className="stk-golden-text">
          {data?.golden ? (
            <>
              <strong className="stk-golden-name"><GoldenName golden>{name || "قهرمان"}</GoldenName></strong>
              <p>همه‌ی اچیومنت‌ها رو باز کردی — اسمت همه‌جا طلایی دیده می‌شه.</p>
            </>
          ) : (
            <>
              <strong>همه رو باز کن، اسمت طلایی می‌شه</strong>
              <p>{data ? `${data.total - data.unlockedCount} اچیومنت دیگه تا نام طلایی دورنگ، همه‌جای آریون.` : <Skel w="70%" h={12} />}</p>
              <span className="stk-golden-preview" aria-hidden="true"><GoldenName golden>{name || "نام تو"}</GoldenName></span>
            </>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

function StatsCard({ data, streak }: { data: AchievementsPayload | null; streak: number | null }) {
  const m = data?.metrics;
  const items = [
    { k: "best", label: "بهترین استریک", v: m ? Math.max(m.bestStreak, streak ?? 0) : null, unit: "روز" },
    { k: "perfect", label: "روزهای کامل", v: m?.perfectDays ?? null, unit: "روز" },
    { k: "ticks", label: "کل تیک‌ها", v: m?.totalTicks ?? null, unit: "" },
    { k: "weeks", label: "هفته‌های بی‌نقص", v: m?.perfectWeeks ?? null, unit: "" },
  ];
  return (
    <BentoCard className="stk-stats" label="آمار">
      <CardHead icon="chart" title="کارنامه" href="/weekly" hrefLabel="روتین من" />
      <div className="stk-stats-grid">
        {items.map((it) => (
          <div key={it.k}>
            <span className="db-stat-label">{it.label}</span>
            <b className="db-stat-val">{it.v === null ? <Skel w={34} h={16} /> : <CountUp value={it.v} />}{it.unit && <small> {it.unit}</small>}</b>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

// ── شبکه‌ی اچیومنت‌ها ─────────────────────────────────────────
function AchievementGrid({ data, filter }: { data: AchievementsPayload | null; filter: Filter }) {
  const reduced = !!useReducedMotion();
  if (!data) {
    return <div className="stk-ach-grid">{Array.from({ length: 8 }, (_, i) => <Skel key={i} w="100%" h={148} r={18} />)}</div>;
  }
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const list = ACHIEVEMENTS.filter((a) => {
    const st = byId.get(a.id);
    if (filter === "all") return true;
    if (filter === "unlocked") return !!st?.unlocked;
    return a.category === filter;
  }).sort((a, b) => Number(!!byId.get(b.id)?.unlocked) - Number(!!byId.get(a.id)?.unlocked));

  if (!list.length) return <div className="db-empty"><p>هنوز اچیومنتی این‌جا باز نشده — ادامه بده!</p></div>;

  return (
    <motion.ul className="stk-ach-grid" layout>
      {list.map((a, i) => {
        const st = byId.get(a.id)!;
        const pct = st.goal ? st.value / st.goal : 0;
        return (
          <motion.li
            key={a.id}
            layout
            className={`stk-ach-item rarity-${a.rarity}${st.unlocked ? " is-unlocked" : ""}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 16) * 0.025, duration: 0.35, ease: D_EASE }}
          >
            <AchievementIcon id={a.id} unlocked={st.unlocked} rarity={a.rarity} size={64} reduced={reduced} />
            <strong className="stk-ach-title">{a.title}</strong>
            <span className="stk-ach-desc">{a.desc}</span>
            {st.unlocked ? (
              <span className="stk-ach-date">{st.unlockedAt ? jDate(st.unlockedAt) : "باز شده"}</span>
            ) : (
              <span className="stk-ach-prog" aria-label={`${st.value} از ${st.goal}`}>
                <span className="stk-ach-bar"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 0.9, ease: D_EASE, delay: 0.2 }} /></span>
                <em>{st.value}/{st.goal}</em>
              </span>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

function jDate(iso: string) {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${J_MONTHS[jm - 1]} ${jy}`;
}

// ── جشن بازشدن ─────────────────────────────────────────────
function UnlockToast({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 5200); return () => clearTimeout(t); }, [onDone]);
  const first = ACHIEVEMENT_BY_ID[ids[0]];
  if (!first) return null;
  return (
    <motion.div
      className="stk-toast"
      role="status"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      onClick={onDone}
    >
      <AchievementIcon id={first.id} unlocked rarity={first.rarity} size={52} />
      <div>
        <span className="stk-toast-kicker">اچیومنت تازه{ids.length > 1 ? ` (+${ids.length - 1})` : ""}</span>
        <strong>{first.title}</strong>
      </div>
    </motion.div>
  );
}
