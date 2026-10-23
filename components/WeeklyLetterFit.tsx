"use client";

// فصل‌های مخصوص بخش ورزش در آنالیز هفتگی: «تمرین هفته»، «سوخت هفته» و «ریکاوری».
// همه‌ی عددها سمت سرور حساب شدن (lib/weeklyLetter/fitWeek.ts)؛ این‌جا فقط نمایش.
// کارت‌ها همون سطح wl-card ان (بدون بک‌گراند تازه)، حلقه‌ها فقط GradientRing و
// حرکت‌ها فقط transform/opacity با احترام به کاهش حرکت. CSS: بلوک fit-week
// ته components/weekly-letter.css.
import { useRef } from "react";
import { m as motion, useInView } from "framer-motion";
import { Activity, Apple, Check, Clock, Dumbbell, Flame, Minus, Moon, Plus, Scale, Target, TrendingDown, TrendingUp, X, type LucideIcon } from "lucide-react";
import { CAL_WEEK_ORDER, weekdayShort } from "@/lib/jalali";
import { isEn, tr } from "@/lib/i18n";
import { exerciseDisplayName } from "@/lib/exerciseI18n";
import { useExerciseEn } from "@/lib/exerciseEnStore";
import { muscleLabel } from "@/lib/exerciseSplit";
import { RING_OVER } from "./GradientRing";
import type { FitFuel, FitMealKey, FitRecovery, FitTraining, FitWeek } from "@/lib/weeklyLetter/fitWeek";
import { isolateNumbers } from "@/lib/weeklyAnalysis/bidi";
import { WeeklyLetterChapterHead } from "./WeeklyLetterChapterHead";
import { CountText, DOM_GRAD, LazyRing, MeterBar, Reveal, WL_EASE, useLite } from "./WeeklyLetterShared";

const dayLetters = () => CAL_WEEK_ORDER.map(weekdayShort);
/** عدد با جداکننده‌ی هزارگان (همیشه رقم لاتین) */
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

// ───────────────────────── شرط نمایش (هم‌شرط با فهرست چسبان) ─────────────────────────

export function fitTrainingShown(fit: FitWeek | null | undefined): boolean {
  const t = fit?.training;
  if (!t) return false;
  const s = t.sessions;
  return s.planned + s.extra + s.rest > 0 || t.muscles.length > 0 || t.top.length > 0;
}
export function fitFuelShown(fit: FitWeek | null | undefined): boolean {
  return !!fit?.fuel && fit.fuel.days.some((d) => d.kcal != null);
}
export function fitRecoveryShown(fit: FitWeek | null | undefined): boolean {
  return !!fit?.recovery;
}

// ───────────────────────── تمرین ─────────────────────────

const STATUS_ICON: Record<string, LucideIcon> = { done: Check, extra: Plus, rest: Moon, missed: X, partial: Minus };
const statusLabel = (s: string): string => {
  switch (s) {
    case "done": return tr("انجام شد", "Done");
    case "extra": return tr("جلسه‌ی اضافه", "Extra session");
    case "rest": return tr("استراحت", "Rest day");
    case "missed": return tr("جا افتاد", "Missed");
    case "partial": return tr("نیمه‌کاره", "Unfinished");
    case "future": return tr("هنوز نرسیده", "Not yet");
    default: return tr("بدون برنامه", "No plan");
  }
};

function DeltaChip({ now, prev, unit = "%" }: { now: number | null; prev: number | null; unit?: string }) {
  if (now == null || prev == null || now === prev) return null;
  const d = now - prev;
  return (
    <span className={`wl-delta ${d > 0 ? "is-good" : "is-bad"}`} dir="ltr" title={tr("نسبت به هفته‌ی قبل", "Versus last week")}>
      {d > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {d > 0 ? "+" : "−"}{Math.abs(d)}{unit}
    </span>
  );
}

function SessionStrip({ t }: { t: FitTraining }) {
  const letters = dayLetters();
  return (
    <ol className="wl-fit-days" aria-label={tr("جلسه‌های هفته", "Sessions of the week")}>
      {t.days.map((d, i) => {
        const Icon = STATUS_ICON[d.status];
        const label = statusLabel(d.status);
        return (
          <li key={d.date} className={`wl-fit-day is-${d.status}`} title={`${d.weekday}: ${label}`}>
            <span className="wl-fit-day-ico" role="img" aria-label={`${d.weekday}: ${label}`}>{Icon ? <Icon size={16} strokeWidth={2.4} /> : <i />}</span>
            <small className="wl-fit-day-l">{letters[i]}</small>
            <small className="wl-fit-day-x" dir="ltr">{d.exPlanned != null && d.exDone != null ? `${d.exDone}/${d.exPlanned}` : ""}</small>
          </li>
        );
      })}
    </ol>
  );
}

function MusclesCard({ t }: { t: FitTraining }) {
  const max = Math.max(1, ...t.muscles.map((m) => m.count));
  const hit = t.muscles.filter((m) => m.count > 0).length;
  if (!t.muscles.length) return null;
  return (
    <Reveal className="wl-card wl-fit-card" delay={0.05}>
      <div className="wl-dom-head">
        <span className="wl-dom-ico"><Target size={18} /></span>
        <h3 className="wl-dom-name">{tr("گروه‌های عضلانی", "Muscle groups")}</h3>
        <span className="wl-mark" dir="ltr">{hit}/{t.muscles.length}</span>
      </div>
      <ul className="wl-fit-muscles">
        {t.muscles.map((m) => {
          const off = m.count === 0;
          return (
            <li key={m.key} className={`wl-fit-muscle${off ? " is-off" : ""}`}>
              <span className="wl-fit-muscle-n">{muscleLabel(m.key)}</span>
              <MeterBar ratio={off ? 0 : m.count / max} />
              <b className="wl-fit-muscle-c" dir="ltr">{off ? tr("جاافتاده", "Skipped") : m.count}</b>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}

function TopCard({ t }: { t: FitTraining }) {
  useExerciseEn();
  if (!t.top.length && !t.start) return null;
  const st = t.start;
  const slots = st
    ? [
        { n: st.morning, label: tr("صبح", "Morning") },
        { n: st.afternoon, label: tr("بعدازظهر", "Afternoon") },
        { n: st.evening, label: tr("عصر و شب", "Evening") },
      ].filter((x) => x.n > 0)
    : [];
  const hh = st?.avgMin != null ? `${String(Math.floor(st.avgMin / 60)).padStart(2, "0")}:${String(st.avgMin % 60).padStart(2, "0")}` : null;
  return (
    <Reveal className="wl-card wl-fit-card" delay={0.1}>
      <div className="wl-dom-head">
        <span className="wl-dom-ico"><Flame size={18} /></span>
        <h3 className="wl-dom-name">{t.top[0]?.count > 1 ? tr("پرتکرارترین حرکت‌ها", "Most repeated exercises") : tr("حرکت‌های هفته", "Exercises this week")}</h3>
      </div>
      {t.top.length > 0 && (
        <ol className="wl-fit-top">
          {t.top.map((x, i) => (
            <li key={x.name} className="wl-fit-top-row">
              <span className="wl-fit-top-rank" aria-hidden="true">{i + 1}</span>
              <span className="wl-fit-top-name">{exerciseDisplayName(x.name)}</span>
              <b className="wl-fit-top-c" dir="ltr">×{x.count}</b>
            </li>
          ))}
        </ol>
      )}
      {st && (
        <p className="wl-fit-note">
          <Clock size={14} />
          <span>
            {hh ? tr(`میانگین ساعت شروع ${hh}`, `Average start time ${hh}`) : ""}
            {slots.length ? `${hh ? " · " : ""}${tr("بیشتر", "mostly")} ${[...slots].sort((a, b) => b.n - a.n)[0].label}` : ""}
          </span>
        </p>
      )}
    </Reveal>
  );
}

export function WeeklyLetterFitTraining({ fit, no }: { fit: FitWeek; no?: number }) {
  const t = fit.training;
  if (!t || !fitTrainingShown(fit)) return null;
  const s = t.sessions;
  const ringVal = s.planned > 0 ? s.done / s.planned : s.extra > 0 ? 1 : 0;
  const ex = t.exercises;
  return (
    <section id="fit-train" className="wl-ch wl-fit">
      <WeeklyLetterChapterHead icon={Dumbbell} title={tr("تمرین هفته", "Training this week")} no={no} />
      <div className="wl-fit-grid">
        <Reveal className="wl-card wl-fit-main">
          <div className="wl-fit-main-top">
            <LazyRing value={ringVal} size={104} stroke={10} grad={DOM_GRAD} delay={0.1}>
              <span className="wl-fit-ringtxt" dir="ltr">{s.planned > 0 ? `${s.done}/${s.planned}` : s.extra}</span>
            </LazyRing>
            <dl className="wl-stats">
              <div className="wl-stat">
                <dt>{s.planned > 0 ? tr("پایبندی به برنامه", "Plan adherence") : tr("جلسه‌ها", "Sessions")}</dt>
                <dd className={s.planned > 0 && t.adherence != null ? (t.adherence >= 75 ? "is-good" : t.adherence < 50 ? "is-bad" : "") : ""}>
                  {s.planned > 0 && t.adherence != null ? <><span dir="ltr">{t.adherence}%</span> <DeltaChip now={t.adherence} prev={t.prevAdherence} /></> : <span dir="ltr">{s.extra}</span>}
                </dd>
              </div>
              {ex.pct != null && ex.planned > 0 && (
                <div className="wl-stat">
                  <dt>{tr("حرکت‌های برنامه", "Planned exercises")}</dt>
                  <dd><span dir="ltr">{ex.done}/{ex.planned}</span> <small className="wl-fit-sub" dir="ltr">{ex.pct}%</small></dd>
                </div>
              )}
              {s.extra > 0 && s.planned > 0 && (
                <div className="wl-stat">
                  <dt>{tr("جلسه‌ی اضافه", "Extra sessions")}</dt>
                  <dd className="is-good" dir="ltr">+{s.extra}</dd>
                </div>
              )}
              {t.longestStreak >= 2 && (
                <div className="wl-stat">
                  <dt>{tr("بلندترین زنجیره", "Longest chain")}</dt>
                  <dd dir="ltr">{t.longestStreak} <small className="wl-fit-sub">{tr("جلسه", "sessions")}</small></dd>
                </div>
              )}
            </dl>
          </div>
          <SessionStrip t={t} />
          <p className="wl-fit-legend" aria-hidden="true">
            <span><Check size={12} />{tr("انجام", "Done")}</span>
            <span><Plus size={12} />{tr("اضافه", "Extra")}</span>
            <span><X size={12} />{tr("جاافتاده", "Missed")}</span>
            <span><Moon size={12} />{tr("استراحت", "Rest")}</span>
          </p>
        </Reveal>
        <MusclesCard t={t} />
        <TopCard t={t} />
      </div>
    </section>
  );
}

// ───────────────────────── سوخت ─────────────────────────

const CH_W = 336;
const CH_H = 176;
const BAR_W = 30;
const SLOT = CH_W / 7;
const BASE = 144;
const TOP = 22;

/** نمودار کالری روزها در برابر خط هدف؛ میله‌ها با scaleY وارد می‌شن */
export function KcalBars({ f }: { f: FitFuel }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const lite = useLite();
  const letters = dayLetters();
  const rtl = !isEn();
  const vals = f.days.map((d) => d.kcal ?? 0);
  const max = Math.max(1, f.target ?? 0, ...vals) * 1.12;
  const y = (v: number) => BASE - (v / max) * (BASE - TOP);
  const xOf = (i: number) => (rtl ? 6 - i : i) * SLOT + (SLOT - BAR_W) / 2;
  const ty = f.target ? y(f.target) : null;
  const label = f.days.map((d, i) => `${d.weekday}: ${d.kcal == null ? tr("ثبت نشده", "not logged") : `${fmt(d.kcal)} kcal`}${i < 6 ? tr("، ", ", ") : ""}`).join("");
  return (
    <svg ref={ref} className="wl-fit-kcal" viewBox={`0 0 ${CH_W} ${CH_H}`} role="img" aria-label={`${tr("کالری هر روز", "Calories per day")}${f.target ? `, ${tr("هدف", "target")} ${fmt(f.target)}` : ""}: ${label}`}>
      {ty != null && (
        <g>
          <line className="wl-fit-tline" x1={0} x2={CH_W} y1={ty} y2={ty} />
        </g>
      )}
      {f.days.map((d, i) => {
        const x = xOf(i);
        const letter = <text key={`l${i}`} className="wl-fit-xl" x={x + BAR_W / 2} y={CH_H - 10} textAnchor="middle">{letters[i]}</text>;
        if (d.kcal == null) {
          return <g key={d.date}><line className="wl-fit-empty" x1={x + 6} x2={x + BAR_W - 6} y1={BASE - 1} y2={BASE - 1} />{letter}</g>;
        }
        const h = Math.max(3, BASE - y(d.kcal));
        const cls = `wl-fit-bar${d.within === false ? " is-off" : ""}${d.closed ? "" : " is-open"}`;
        return (
          <g key={d.date}>
            <motion.rect
              className={cls} x={x} y={BASE - h} width={BAR_W} height={h} rx={6}
              style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
              initial={{ scaleY: lite ? 1 : 0 }}
              animate={{ scaleY: inView || lite ? 1 : 0 }}
              transition={{ duration: lite ? 0 : 0.8, ease: WL_EASE as never, delay: lite ? 0 : 0.08 * i }}
            />
            <text className="wl-fit-val" x={x + BAR_W / 2} y={BASE - h - 5} textAnchor="middle">{fmt(d.kcal)}</text>
            {letter}
          </g>
        );
      })}
    </svg>
  );
}

function balanceSentence(f: FitFuel): string {
  const b = f.balance;
  if (!b) return "";
  const g = f.goal;
  if (b.verdict === "aligned") {
    if (g === "cut") return tr("نزدیک هدف کاتت بودی؛ همین ثبات نتیجه می‌ده.", "You stayed close to your cutting target; steady is what works.");
    if (g === "gain") return tr("نزدیک هدف حجمت بودی؛ ریتم خوبیه.", "You stayed close to your bulking target; a good rhythm.");
    return tr("مصرفت با هدفت هماهنگ بود.", "Your intake matched your target.");
  }
  const over = b.verdict === "over";
  if (g === "cut") return over ? tr("بالاتر از هدف کات بودی؛ این برخلاف کاهش چربیه.", "You were above your cutting target, which works against fat loss.") : tr("خیلی زیر هدف کات بودی؛ مراقب انرژی و ریکاوری باش.", "You were well under your cutting target; watch your energy and recovery.");
  if (g === "gain") return over ? tr("بیشتر از هدف حجم خوردی؛ مازاد بزرگ‌تر از برنامه‌ست.", "You ate more than your bulking target; the surplus is bigger than planned.") : tr("زیر هدف حجم بودی؛ برای حجم‌گیری مازاد لازمه.", "You were under your bulking target; building size needs a surplus.");
  return over ? tr("بالاتر از هدفت بودی.", "You were above your target.") : tr("پایین‌تر از هدفت بودی.", "You were below your target.");
}

function BalanceCard({ f }: { f: FitFuel }) {
  const b = f.balance;
  if (!b) return null;
  const kg = Math.abs(b.estKg);
  const good = b.verdict === "aligned";
  const value = `${b.totalDelta > 0 ? "+" : b.totalDelta < 0 ? "-" : ""}${Math.abs(b.totalDelta)}`;
  return (
    <Reveal className="wl-card wl-fit-card wl-fit-balance" delay={0.05}>
      <div className="wl-dom-head">
        <span className="wl-dom-ico"><Scale size={18} /></span>
        <h3 className="wl-dom-name">{tr("تراز انرژی هفته", "Weekly energy balance")}</h3>
        <span className={`wl-mark ${good ? "is-good" : "is-bad"}`}>{good ? tr("هماهنگ با هدف", "On goal") : b.verdict === "over" ? tr("بالاتر از هدف", "Over target") : tr("زیر هدف", "Under target")}</span>
      </div>
      <div className="wl-fit-bal-num">
        <CountText value={value} className="wl-fit-big" duration={1.2} />
        <span>kcal</span>
      </div>
      <p className="wl-fit-note">{isolateNumbers(balanceSentence(f))}</p>
      <p className="wl-fit-est">
        <Activity size={13} />
        <span>
          {kg < 0.1
            ? tr(`برآورد تغییر وزن: تقریبا بدون تغییر (فقط یک تخمین از ${b.days} روز ثبت‌شده)`, `Estimated weight change: about none (a rough estimate from ${b.days} logged days)`)
            : tr(`برآورد تغییر وزن: حدود ${kg} کیلو ${b.estKg >= 0 ? "افزایش" : "کاهش"} (فقط یک تخمین، نه اندازه‌گیری) از ${b.days} روز ثبت‌شده`, `Estimated weight change: about ${kg} kg ${b.estKg >= 0 ? "up" : "down"} (a rough estimate, not a measurement) from ${b.days} logged days`)}
        </span>
      </p>
    </Reveal>
  );
}

function MacroRings({ f }: { f: FitFuel }) {
  const m = f.macros;
  const items: { key: string; label: string; avg: number | null; target: number | null; over?: boolean }[] = [
    { key: "p", label: tr("پروتئین", "Protein"), avg: m.protein.avg, target: m.protein.target },
    { key: "c", label: tr("کربوهیدرات", "Carbs"), avg: m.carbs.avg, target: m.carbs.target, over: true },
    { key: "f", label: tr("چربی", "Fat"), avg: m.fat.avg, target: m.fat.target, over: true },
  ].filter((x) => x.avg != null);
  if (!items.length) return null;
  const g = tr("گرم", "g");
  return (
    <Reveal className="wl-card wl-fit-card" delay={0.05}>
      <div className="wl-dom-head">
        <span className="wl-dom-ico"><Apple size={18} /></span>
        <h3 className="wl-dom-name">{tr("درشت‌مغذی‌ها", "Macros")}</h3>
        <span className="wl-tag">{tr("میانگین روزانه", "Daily average")}</span>
      </div>
      <ul className="wl-fit-macros">
        {items.map((x, i) => {
          const ratio = x.target ? x.avg! / x.target : null;
          const overshoot = x.over && ratio != null && ratio > 1.15;
          return (
            <li key={x.key} className="wl-fit-macro">
              <LazyRing value={ratio != null ? Math.min(1, ratio) : 0} size={78} stroke={8} grad={overshoot ? RING_OVER : DOM_GRAD} delay={0.1 + i * 0.1}>
                <span className="wl-fit-macro-v" dir="ltr">{x.avg}</span>
              </LazyRing>
              <b>{x.label}</b>
              <small dir="ltr">{x.target ? `${tr("هدف", "Target")} ${x.target} ${g}` : g}</small>
            </li>
          );
        })}
      </ul>
      {m.protein.target && m.protein.loggedDays > 0 && (
        <p className="wl-fit-note">
          <Target size={14} />
          <span>{tr(`${m.protein.hitDays} از ${m.protein.loggedDays} روز به هدف پروتئین رسیدی`, `You hit your protein target on ${m.protein.hitDays} of ${m.protein.loggedDays} days`)}</span>
        </p>
      )}
    </Reveal>
  );
}

const mealLabel = (k: FitMealKey) => {
  switch (k) {
    case "breakfast": return tr("صبحانه", "Breakfast");
    case "lunch": return tr("ناهار", "Lunch");
    case "dinner": return tr("شام", "Dinner");
    case "snack": return tr("میان‌وعده", "Snacks");
    default: return tr("سایر", "Other");
  }
};

function MealsCard({ f }: { f: FitFuel }) {
  if (!f.meals || f.meals.length < 2) return null;
  return (
    <Reveal className="wl-card wl-fit-card" delay={0.1}>
      <div className="wl-dom-head">
        <span className="wl-dom-ico"><Apple size={18} /></span>
        <h3 className="wl-dom-name">{tr("سهم وعده‌ها", "Meal split")}</h3>
      </div>
      <ol className="wl-fit-stack" role="img" aria-label={f.meals.map((m) => `${mealLabel(m.key)} ${m.pct}%`).join(tr("، ", ", "))}>
        {f.meals.map((m, i) => <li key={m.key} style={{ flexGrow: m.pct, ["--k" as string]: 1 - i * 0.2 } as React.CSSProperties}><i /></li>)}
      </ol>
      <ul className="wl-fit-legendrows">
        {f.meals.map((m, i) => (
          <li key={m.key}><i style={{ opacity: 1 - i * 0.2 }} aria-hidden="true" /><span>{mealLabel(m.key)}</span><b dir="ltr">{m.pct}%</b></li>
        ))}
      </ul>
    </Reveal>
  );
}

function TrainRestCard({ f }: { f: FitFuel }) {
  const tv = f.trainVsRest;
  const we = f.weekend;
  if (!tv && !we) return null;
  const g = tr("گرم", "g");
  return (
    <Reveal className="wl-card wl-fit-card" delay={0.15}>
      <div className="wl-dom-head">
        <span className="wl-dom-ico"><Dumbbell size={18} /></span>
        <h3 className="wl-dom-name">{tr("روز تمرین و روز استراحت", "Training and rest days")}</h3>
      </div>
      {tv && (
        <div className="wl-fit-versus">
          <div>
            <small>{tr(`روزهای تمرین (${tv.trainDays})`, `Training days (${tv.trainDays})`)}</small>
            <b dir="ltr">{fmt(tv.trainKcal)} <span>kcal</span></b>
            {tv.trainProtein != null && <em dir="ltr">{tv.trainProtein} {g} {tr("پروتئین", "protein")}</em>}
          </div>
          <div>
            <small>{tr(`روزهای استراحت (${tv.restDays})`, `Rest days (${tv.restDays})`)}</small>
            <b dir="ltr">{fmt(tv.restKcal)} <span>kcal</span></b>
            {tv.restProtein != null && <em dir="ltr">{tv.restProtein} {g} {tr("پروتئین", "protein")}</em>}
          </div>
        </div>
      )}
      {we && (
        <p className="wl-fit-note">
          <Flame size={14} />
          <span>{isolateNumbers(tr(`پنجشنبه و جمعه میانگین ${fmt(we.weekendAvg)} کالری، روزهای کاری ${fmt(we.weekdayAvg)}`, `Thursday and Friday averaged ${fmt(we.weekendAvg)} kcal, weekdays ${fmt(we.weekdayAvg)}`))}</span>
        </p>
      )}
    </Reveal>
  );
}

export function WeeklyLetterFitFuel({ fit, no }: { fit: FitWeek; no?: number }) {
  const f = fit.fuel;
  if (!f || !fitFuelShown(fit)) return null;
  return (
    <section id="fit-fuel" className="wl-ch wl-fit">
      <WeeklyLetterChapterHead icon={Apple} title={tr("سوخت هفته", "Fuel this week")} no={no} />
      <div className="wl-fit-grid">
        <Reveal className="wl-card wl-fit-main">
          <div className="wl-fit-fuel-head">
            <dl className="wl-fit-chips">
              {f.avgKcal != null && (
                <div className="wl-stat"><dt>{tr("میانگین روزانه", "Daily average")}</dt><dd dir="ltr">{fmt(f.avgKcal)} <small className="wl-fit-sub">kcal</small></dd></div>
              )}
              {f.target != null && (
                <div className="wl-stat"><dt>{tr("هدف", "Target")}</dt><dd dir="ltr">{fmt(f.target)} <small className="wl-fit-sub">kcal</small></dd></div>
              )}
              {f.within.of > 0 && (
                <div className="wl-stat"><dt>{tr("روز داخل ±10%", "Days within ±10%")}</dt><dd className={f.within.days * 2 >= f.within.of ? "is-good" : "is-bad"} dir="ltr">{f.within.days}/{f.within.of}</dd></div>
              )}
              {f.prev && f.avgKcal != null && f.prev.withinOf > 0 && f.within.of > 0 && (
                <div className="wl-stat"><dt>{tr("روز داخل هدف، هفته‌ی قبل", "On-target days last week")}</dt><dd dir="ltr">{f.prev.withinDays}/{f.prev.withinOf}</dd></div>
              )}
            </dl>
          </div>
          <KcalBars f={f} />
          <p className="wl-fit-legend" aria-hidden="true">
            <span><i className="wl-fit-key is-ok" />{tr("داخل هدف", "On target")}</span>
            <span><i className="wl-fit-key is-off" />{tr("خارج از ±10%", "Outside ±10%")}</span>
            <span><i className="wl-fit-key is-line" />{f.target ? tr(`خط هدف (${fmt(f.target)})`, `Target line (${fmt(f.target)})`) : tr("خط هدف", "Target line")}</span>
          </p>
        </Reveal>
        <BalanceCard f={f} />
        <MacroRings f={f} />
        <MealsCard f={f} />
        <TrainRestCard f={f} />
      </div>
    </section>
  );
}

// ───────────────────────── ریکاوری ─────────────────────────

export function WeeklyLetterFitRecovery({ fit, no }: { fit: FitWeek; no?: number }) {
  const r: FitRecovery | null = fit.recovery;
  if (!r) return null;
  const rows = [
    { key: "t", label: tr(`خواب قبل از ${r.trainN > 1 ? "روزهای" : "روز"} تمرین`, `Sleep before ${r.trainN > 1 ? "training days" : "a training day"}`), h: r.trainAvg, n: r.trainN },
    { key: "m", label: tr(`خواب قبل از ${r.missedN > 1 ? "روزهای" : "روز"} جاافتاده`, `Sleep before ${r.missedN > 1 ? "missed days" : "a missed day"}`), h: r.missedAvg, n: r.missedN },
  ];
  const note = r.diff >= 0.5
    ? tr(`قبل از جلسه‌هایی که انجام دادی ${Math.abs(r.diff)} ساعت بیشتر خوابیده بودی؛ ریکاوری به تمرین کمک می‌کنه.`, `You slept ${Math.abs(r.diff)} hours more before the sessions you did; recovery feeds training.`)
    : r.diff <= -0.5
      ? tr("قبل از روزهای جاافتاده کمتر از روزهای تمرین نخوابیده بودی؛ دلیل جاافتادن احتمالا چیز دیگه‌ایه.", "You did not sleep less before the days you missed; the cause was probably something else.")
      : tr("خوابت قبل از روزهای تمرین و جاافتاده تقریبا یکی بود.", "Your sleep was about the same before training and missed days.");
  return (
    <section id="fit-recovery" className="wl-ch wl-fit">
      <WeeklyLetterChapterHead icon={Moon} title={tr("ریکاوری", "Recovery")} no={no} />
      <Reveal className="wl-card wl-fit-recovery">
        <ul className="wl-fit-rec">
          {rows.map((x) => (
            <li key={x.key}>
              <span className="wl-fit-rec-l">{x.label}</span>
              <CountText value={String(x.h)} className="wl-fit-rec-h" duration={1} />
              <small>{tr("ساعت", "hours")}</small>
              <MeterBar ratio={Math.min(1, x.h / 9)} />
            </li>
          ))}
        </ul>
        <p className="wl-fit-note">{isolateNumbers(note)}</p>
      </Reveal>
    </section>
  );
}
