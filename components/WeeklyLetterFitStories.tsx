"use client";

// اسلایدهای مخصوص بخش ورزش در «داستان هفته»: تمرین هفته و سوخت هفته. اندازه‌ها با
// --u مثل بقیه‌ی اسلایدها؛ استایل در بلوک fit-week ته CSS هفته‌نامه.
import type { CSSProperties, ReactNode } from "react";
import { m as motion, type Variants } from "framer-motion";
import { Apple, Check, Dumbbell, Moon, Plus, X, type LucideIcon } from "lucide-react";
import { CAL_WEEK_ORDER, weekdayShort } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import type { FitStorySlide } from "@/lib/weeklyLetter/fitStories";
import { WL_EASE } from "./WeeklyLetterShared";
import { GradientRing, RING_GREEN } from "./GradientRing";
import { Odo } from "./WeeklyLetterStoryFx";
import { KcalBars } from "./WeeklyLetterFit";

const ITEM: Variants = {
  enter: { opacity: 0, y: 26 },
  center: { opacity: 1, y: 0, transition: { duration: 0.6, ease: WL_EASE as never } },
};
const POP: Variants = {
  enter: { opacity: 0, scale: 0.82 },
  center: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 240, damping: 20 } },
};

function SItem({ children, className, variants = ITEM, style }: { children: ReactNode; className?: string; variants?: Variants; style?: CSSProperties }) {
  return <motion.div className={className} variants={variants} style={style}>{children}</motion.div>;
}

function Kicker({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="wl-st-kicker">
      <span className="wl-st-kicker-ico"><Icon size={15} /></span>
      {children}
    </span>
  );
}

const ICON: Record<string, LucideIcon> = { done: Check, extra: Plus, rest: Moon, missed: X };

function TrainSlide({ slide, u }: { slide: Extract<FitStorySlide, { id: "fitTrain" }>; u: number }) {
  const t = slide.fit.training!;
  const s = t.sessions;
  const letters = CAL_WEEK_ORDER.map(weekdayShort);
  const ringVal = s.planned > 0 ? s.done / s.planned : s.extra > 0 ? 1 : 0;
  const hit = t.muscles.filter((m) => m.count > 0).length;
  const chips: string[] = [];
  if (t.adherence != null && s.planned > 0) chips.push(tr(`${t.adherence}% پایبندی`, `${t.adherence}% adherence`));
  if (t.exercises.pct != null && t.exercises.planned > 0) chips.push(tr(`${t.exercises.done} از ${t.exercises.planned} حرکت`, `${t.exercises.done} of ${t.exercises.planned} exercises`));
  if (hit >= 2) chips.push(tr(`${hit} گروه عضلانی`, `${hit} muscle groups`));
  if (t.longestStreak >= 2) chips.push(tr(`زنجیره ${t.longestStreak} جلسه`, `${t.longestStreak}-session chain`));
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Dumbbell}>{tr("تمرین هفته", "Training this week")}</Kicker></SItem>
      <SItem variants={POP} className="wl-st-ringwrap">
        <GradientRing value={ringVal} size={Math.round(210 * u)} stroke={Math.round(16 * u)} grad={RING_GREEN} delay={0.5}>
          <span className="wl-st-ringc">
            <Odo value={s.planned > 0 ? `${s.done}/${s.planned}` : String(s.extra)} className="wl-st-huge wl-st-grad" delay={0.55} duration={1.3} />
            <small>{s.planned > 0 ? tr("جلسه‌ی برنامه", "planned sessions") : tr("جلسه", "sessions")}</small>
          </span>
        </GradientRing>
      </SItem>
      <SItem className="wl-fts-days">
        {t.days.map((d, i) => {
          const Icon = ICON[d.status];
          return (
            <span key={d.date} className={`wl-fts-day is-${d.status}`}>
              <i>{Icon ? <Icon size={Math.round(14 * u)} strokeWidth={2.5} /> : null}</i>
              <small>{letters[i]}</small>
            </span>
          );
        })}
      </SItem>
      <SItem className="wl-chips">
        {chips.slice(0, 3).map((c) => <span key={c} className="wl-chip"><b dir="ltr">{c}</b></span>)}
      </SItem>
    </div>
  );
}

function FuelSlide({ slide, u }: { slide: Extract<FitStorySlide, { id: "fitFuel" }>; u: number }) {
  const f = slide.fit.fuel!;
  const chips: string[] = [];
  if (f.within.of >= 3) chips.push(tr(`${f.within.days} از ${f.within.of} روز داخل هدف`, `${f.within.days} of ${f.within.of} days on target`));
  if (f.macros.protein.target && f.macros.protein.loggedDays > 0) chips.push(tr(`پروتئین ${f.macros.protein.hitDays} روز`, `protein ${f.macros.protein.hitDays} days`));
  if (f.balance) chips.push(tr(`تراز ${f.balance.totalDelta > 0 ? "+" : ""}${f.balance.totalDelta} کالری`, `balance ${f.balance.totalDelta > 0 ? "+" : ""}${f.balance.totalDelta} kcal`));
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Apple}>{tr("سوخت هفته", "Fuel this week")}</Kicker></SItem>
      {f.avgKcal != null && (
        <SItem variants={POP} className="wl-fts-avg">
          <Odo value={String(f.avgKcal)} className="wl-st-huge wl-st-grad" delay={0.45} duration={1.4} />
          <small>{tr("کالری در روز، میانگین", "kcal a day on average")}</small>
        </SItem>
      )}
      <SItem className="wl-fts-chart" style={{ width: Math.round(300 * u) }}><KcalBars f={f} /></SItem>
      <SItem className="wl-chips">
        {chips.slice(0, 3).map((c) => <span key={c} className="wl-chip"><b dir="ltr">{c}</b></span>)}
      </SItem>
    </div>
  );
}

export function FitSlideView({ slide, u }: { slide: FitStorySlide; u: number }) {
  switch (slide.id) {
    case "fitTrain": return <TrainSlide slide={slide} u={u} />;
    case "fitFuel": return <FuelSlide slide={slide} u={u} />;
  }
}
