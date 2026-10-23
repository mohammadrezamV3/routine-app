"use client";

// اسلایدهای مخصوص بخش ترید در «داستان هفته»: منحنی سرمایه، بهترین/بدترین
// معامله، بهترین جلسه و نماد، انضباط و هزینه‌ی قانون‌شکنی. استایل در بلوک
// trade-week همین فایل CSS هفته‌نامه؛ اندازه‌ها با --u مثل بقیه‌ی اسلایدها.
import type { CSSProperties, ReactNode } from "react";
import { m as motion, type Variants } from "framer-motion";
import { BrainCircuit, MapPin, Trophy, TrendingUp, type LucideIcon } from "lucide-react";
import { tr } from "@/lib/i18n";
import type { TradeStorySlide } from "@/lib/weeklyLetter/tradeStories";
import type { TradeBucket, TradeWeek } from "@/lib/weeklyLetter/tradeWeek";
import { fmtMoney, tradeDirectionLabel, tradeSessionLabel } from "@/lib/weeklyLetter/tradeWeekText";
import { WL_EASE } from "./WeeklyLetterShared";
import { GradientRing, RING_GREEN } from "./GradientRing";
import { MaskText, Odo } from "./WeeklyLetterStoryFx";
import { TradeCurveChart } from "./WeeklyLetterTradeCurve";

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

const toneOf = (n: number) => (n > 0 ? "is-win" : n < 0 ? "is-loss" : "");

function CurveSlide({ t, u }: { t: TradeWeek; u: number }) {
  const chips: string[] = [tr(`${t.count} معامله`, `${t.count} ${t.count === 1 ? "trade" : "trades"}`)];
  if (t.winRate != null) chips.push(tr(`${t.winRate}% نرخ برد`, `${t.winRate}% win rate`));
  if (t.profitFactor != null) chips.push(tr(`ضریب سود ${t.profitFactor}`, `PF ${t.profitFactor}`));
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={TrendingUp}>{tr("منحنی هفته", "Week curve")}</Kicker></SItem>
      <SItem variants={POP} className={`wl-tws-net ${toneOf(t.net)}`}>
        <Odo value={fmtMoney(t.net, null)} className="wl-st-huge" delay={0.45} duration={1.4} />
        {t.currency && <small>{t.currency}</small>}
      </SItem>
      <SItem className="wl-tws-chart"><TradeCurveChart trade={t} height={Math.round(170 * u)} /></SItem>
      <SItem className="wl-chips">
        {chips.map((c) => <span key={c} className="wl-chip"><b dir="ltr">{c}</b></span>)}
      </SItem>
    </div>
  );
}

function BriefCard({ tone, title, b }: { tone: "win" | "loss"; title: string; b: NonNullable<TradeWeek["best"]> }) {
  return (
    <SItem variants={POP} className={`wl-tws-trade is-${tone}`}>
      <small>{title}</small>
      <b dir="ltr">{b.symbol}</b>
      <span>{tradeDirectionLabel(b.direction)}</span>
      <em dir="ltr">{fmtMoney(b.pnl, null)}</em>
      {b.r != null && <span dir="ltr" className="wl-tws-r">{b.r > 0 ? "+" : ""}{b.r}R</span>}
    </SItem>
  );
}

function BestSlide({ t }: { t: TradeWeek }) {
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={Trophy}>{tr("بهترین و بدترین معامله", "Best and worst trade")}</Kicker></SItem>
      <div className="wl-tws-pair">
        {t.best && <BriefCard tone="win" title={tr("بهترین معامله", "Best trade")} b={t.best} />}
        {t.worst && <BriefCard tone="loss" title={tr("بدترین معامله", "Worst trade")} b={t.worst} />}
      </div>
      {t.avgWin != null && t.avgLoss != null && (
        <SItem className="wl-st-cap">{tr(`میانگین سود ${fmtMoney(t.avgWin, t.currency)} و میانگین ضرر ${fmtMoney(t.avgLoss, t.currency)}`, `Average win ${fmtMoney(t.avgWin, t.currency)} and average loss ${fmtMoney(t.avgLoss, t.currency)}`)}</SItem>
      )}
    </div>
  );
}

function topBucket(list: TradeBucket[]): TradeBucket | null {
  const ok = list.filter((b) => b.count >= 1);
  return ok.length ? ok.reduce((a, b) => (b.net > a.net ? b : a)) : null;
}

function WhereSlide({ t }: { t: TradeWeek }) {
  const rows: { k: string; name: string; b: TradeBucket }[] = [];
  const ses = topBucket(t.bySession);
  const sym = topBucket(t.bySymbol);
  const dir = topBucket(t.byDirection);
  if (ses) rows.push({ k: tr("بهترین جلسه", "Best session"), name: tradeSessionLabel(ses.key), b: ses });
  if (sym) rows.push({ k: tr("بهترین نماد", "Best symbol"), name: sym.key, b: sym });
  if (dir && t.byDirection.length >= 2) rows.push({ k: tr("بهتر از همه", "Stronger side"), name: tradeDirectionLabel(dir.key), b: dir });
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={MapPin}>{tr("کجا بردی، کجا باختی", "Where you won and lost")}</Kicker></SItem>
      <div className="wl-tws-rows">
        {rows.map((r) => (
          <SItem key={r.k} variants={POP} className="wl-tws-row">
            <small>{r.k}</small>
            <b>{r.name}</b>
            <em dir="ltr" className={toneOf(r.b.net)}>{fmtMoney(r.b.net, null)}</em>
            <span dir="ltr">{r.b.winRate == null ? "-" : `${r.b.winRate}%`} · {r.b.count}</span>
          </SItem>
        ))}
      </div>
    </div>
  );
}

function MindSlide({ t, u }: { t: TradeWeek; u: number }) {
  const d = t.discipline;
  const main = d.plan ?? d.stop;
  const mainLabel = d.plan ? tr("طبق پلن", "on plan") : tr("با حدضرر", "with a stop");
  const p = main ? Math.round((main.yes / main.of) * 100) : 0;
  const broke = t.mind.broke;
  return (
    <div className="wl-st-body">
      <SItem><Kicker icon={BrainCircuit}>{tr("نظم و ذهن", "Discipline and mind")}</Kicker></SItem>
      {main && (
        <SItem variants={POP} className="wl-st-ringwrap wl-tws-mind">
          <GradientRing value={p / 100} size={Math.round(190 * u)} stroke={Math.round(15 * u)} grad={RING_GREEN} delay={0.5}>
            <span className="wl-st-ringc">
              <Odo value={`${p}%`} className="wl-st-huge wl-st-grad" delay={0.55} duration={1.4} />
              <small>{mainLabel}</small>
            </span>
          </GradientRing>
        </SItem>
      )}
      <SItem className="wl-chips">
        {d.stop && d.plan && <span className="wl-chip"><b dir="ltr">{Math.round((d.stop.yes / d.stop.of) * 100)}%</b>{tr("با حدضرر", "with a stop")}</span>}
        {d.checklist && <span className="wl-chip"><b dir="ltr">{Math.round((d.checklist.full / d.checklist.of) * 100)}%</b>{tr("چک‌لیست کامل", "full checklist")}</span>}
      </SItem>
      <p className="wl-st-cap is-lg">
        <MaskText
          delay={1}
          stagger={0.045}
          text={broke.count === 0
            ? tr("هیچ معامله‌ی خارج از قانون نداشتی.", "No off-rule trades this week.")
            : tr(`${broke.count} معامله‌ی خارج از قانون ${fmtMoney(broke.net, t.currency)} شد.`, `${broke.count} off-rule ${broke.count === 1 ? "trade" : "trades"} came to ${fmtMoney(broke.net, t.currency)}.`)}
        />
      </p>
    </div>
  );
}

export function TradeSlideView({ slide, u }: { slide: TradeStorySlide; u: number }) {
  switch (slide.id) {
    case "tradeCurve": return <CurveSlide t={slide.trade} u={u} />;
    case "tradeBest": return <BestSlide t={slide.trade} />;
    case "tradeWhere": return <WhereSlide t={slide.trade} />;
    case "tradeMind": return <MindSlide t={slide.trade} u={u} />;
  }
}
