"use client";

import type { ReactNode } from "react";
import { CloudMoon, Coffee, Hourglass, Moon, Sparkles, Sunrise, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { GradientRing, RING_AMBER, RING_BLUE, RING_GREEN } from "./GradientRing";
import { chronotypeLabel, durationLabel, type SleepInsights } from "@/lib/sleep";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import "./sleep-insights.css";

// تحلیل‌ها و آمار خواب: کاشی‌های عددی + کارت‌های هوشمند که فقط وقتی داده‌اش
// هست ساخته می‌شن. هیچ بک‌گراندی اضافه نشده؛ فقط بوردر و رنگ متن.
export type SleepInsightsPanelProps = {
  insights: SleepInsights;
  target: { wake: string; sleep: string };
};

const MIN_NIGHTS = 3;

type Smart = { key: string; icon: ReactNode; tone: "good" | "fair" | "poor" | "ink"; title: string; text: string; extra?: ReactNode };

function roundUp5(n: number) {
  return Math.max(5, Math.ceil(n / 5) * 5);
}

function buildCards(ins: SleepInsights): Smart[] {
  const out: Smart[] = [];

  if (ins.trend !== null && ins.trend !== 0) {
    const up = ins.trend > 0;
    const abs = Math.abs(ins.trend);
    out.push({
      key: "trend",
      icon: up ? <TrendingUp /> : <TrendingDown />,
      tone: up ? "good" : abs >= 8 ? "poor" : "fair",
      title: up ? tr("خوابت رو به بهتر شدنه", "Your sleep is improving") : tr("این هفته خوابت افت کرده", "Your sleep dropped this week"),
      text: up
        ? tr(`امتیاز خواب این هفته ${faNum(abs)} امتیاز از هفته‌ی قبل بیشتره. هرچی کردی ادامه بده.`, `Your sleep score this week is ${abs} points higher than last week. Keep doing what you're doing.`)
        : tr(`امتیاز خواب این هفته ${faNum(abs)} امتیاز از هفته‌ی قبل کمتره. یه شب زودتر خوابیدن معمولا برای شروع دوباره کافیه.`, `Your sleep score this week is ${abs} points lower than last week. One earlier night is usually enough to get back on track.`),
    });
  }

  if (ins.nights >= MIN_NIGHTS) {
    if (ins.debt7Min >= 30) {
      const per = roundUp5(ins.debt7Min / 3);
      out.push({
        key: "debt",
        icon: <Hourglass />,
        tone: ins.debt7Min >= 180 ? "poor" : "fair",
        title: tr(`${durationLabel(ins.debt7Min)} بدهی خواب داری`, `You have ${durationLabel(ins.debt7Min)} of sleep debt`),
        text: tr(`تو هفت شب اخیر نسبت به هدفت (${durationLabel(ins.goalMin)} در شب) کمتر خوابیدی. اگه سه شب آینده هر شب ${faNum(per)} دقیقه زودتر بخوابی، بدهی جبران می‌شه.`, `Over the last seven nights you slept less than your goal (${durationLabel(ins.goalMin)} per night). If you go to bed ${per} minutes earlier for the next three nights, you'll pay the debt off.`),
      });
    } else {
      out.push({
        key: "debt",
        icon: <Hourglass />,
        tone: "good",
        title: tr("بدهی خوابی نداری", "No sleep debt"),
        text: tr("تو هفت شب اخیر تقریبا همه‌ی خوابی که لازم داشتی رو گرفتی.", "Over the last seven nights you got almost all the sleep you needed."),
      });
    }
  }

  if (ins.socialJetlagMin !== null) {
    const j = ins.socialJetlagMin;
    out.push({
      key: "jetlag",
      icon: <CloudMoon />,
      tone: j >= 90 ? "poor" : j >= 45 ? "fair" : "good",
      title: j >= 45 ? tr(`جت‌لگ اجتماعی ${durationLabel(j)}`, `Social jet lag ${durationLabel(j)}`) : tr("ساعت خوابت بین روزها ثابته", "Your sleep schedule is steady across days"),
      text:
        j >= 45
          ? tr(`وسط خواب تو شب‌های آزاد (پنجشنبه و جمعه) با شب‌های کاری ${durationLabel(j)} فاصله داره. یعنی بدنت هر هفته انگار به یه منطقه‌ی زمانی دیگه سفر می‌کنه و اول هفته سخت‌تر بیدار می‌شی. سعی کن آخر هفته‌ها بیشتر از یک ساعت دیرتر نخوابی.`, `Your mid-sleep on free nights (Thursday and Friday) is ${durationLabel(j)} away from work nights. It's as if your body travels to another time zone every week, and the start of the week is harder. Try not to go to bed more than an hour later on weekends.`)
          : tr("فرق ساعت خواب تو شب‌های آزاد و کاری کمتر از 45 دقیقه‌ست. بدنت از این ثبات خوشش میاد.", "The difference between your free-night and work-night sleep times is under 45 minutes. Your body likes this consistency."),
    });
  }

  if (ins.chronotype) {
    const mid = ins.midSleepFree;
    const tip =
      ins.chronotype === "lark"
        ? tr("کارهای سنگین رو بذار صبح که ذهنت تازه‌ترینه و شب‌ها زود آروم شو.", "Put demanding work in the morning when your mind is freshest, and wind down early at night.")
        : ins.chronotype === "owl"
          ? tr("ذهنت عصر و شب بهتر کار می‌کنه؛ صبح‌ها نور خورشید بگیر تا ساعت بدنت جلو بیاد.", "Your mind works better in the evening and at night; get morning sunlight to move your body clock earlier.")
          : tr("ریتم تو متعادله و با برنامه‌ی معمول روز جور درمیاد؛ فقط ثابت نگهش دار.", "Your rhythm is balanced and fits a normal day; just keep it steady.");
    out.push({
      key: "chrono",
      icon: <Sunrise />,
      tone: "ink",
      title: tr(`تیپ خوابت: ${chronotypeLabel(ins.chronotype)}`, `Your sleep type: ${chronotypeLabel(ins.chronotype)}`),
      text: `${mid ? tr(`وسط خواب تو شب‌های آزاد حدود ${mid} می‌افته.`, `Your mid-sleep on free nights is around ${mid}.`) : ""} ${tip}`.trim(),
    });
  }

  if (ins.bestBedWindow) {
    const w = ins.bestBedWindow;
    out.push({
      key: "bed",
      icon: <Moon />,
      tone: "good",
      title: tr("بهترین ساعت خوابت", "Your best bedtime"),
      text: tr(`وقتی بین ${w.from} تا ${w.to} می‌خوابی، میانگین امتیازت ${faNum(w.avgScore)} می‌شه (${faNum(w.nights)} شب). اگه می‌تونی، همین بازه رو هدف بگیر.`, `When you go to bed between ${w.from} and ${w.to}, your average score is ${w.avgScore} (${w.nights} ${w.nights === 1 ? "night" : "nights"}). If you can, aim for this window.`),
    });
  }

  const pos = ins.tagImpacts.filter((t) => t.delta > 0).slice(0, 2);
  const neg = ins.tagImpacts.filter((t) => t.delta < 0).slice(0, 2);
  const tags = [...neg, ...pos].filter((t) => Math.abs(t.delta) >= 2);
  if (tags.length) {
    const lines: string[] = [];
    const n0 = neg[0], p0 = pos[0];
    if (n0 && Math.abs(n0.delta) >= 2) lines.push(tr(`شب‌هایی که «${n0.label}» داشتی امتیازت ${faNum(Math.abs(n0.delta))} کمتر بوده.`, `On nights with "${n0.label}", your score was ${Math.abs(n0.delta)} lower.`));
    if (p0 && p0.delta >= 2) lines.push(tr(`شب‌هایی که «${p0.label}» داشتی ${faNum(p0.delta)} امتیاز بیشتر گرفتی.`, `On nights with "${p0.label}", your score was ${p0.delta} higher.`));
    const max = Math.max(...tags.map((t) => Math.abs(t.delta)), 1);
    out.push({
      key: "tags",
      icon: <Coffee />,
      tone: "ink",
      title: tr("چی روی خوابت اثر داره", "What affects your sleep"),
      text: lines.join(" "),
      extra: (
        <ul className="sli-tags">
          {tags.map((t) => (
            <li key={t.key} className="sli-tag">
              <span className="sli-tag-name">{t.label}</span>
              <span className="sli-div" aria-hidden="true">
                <span className="sli-div-half sli-div-neg">
                  {t.delta < 0 && <i className="sli-bar sli-bar-neg" style={{ width: `${(Math.abs(t.delta) / max) * 100}%` }} />}
                </span>
                <span className="sli-div-half sli-div-pos">
                  {t.delta > 0 && <i className="sli-bar sli-bar-pos" style={{ width: `${(t.delta / max) * 100}%` }} />}
                </span>
              </span>
              <b className={`sli-val ${t.delta > 0 ? "sli-pos" : "sli-neg"}`} dir="ltr">{t.delta > 0 ? "+" : "\u2212"}{faNum(Math.abs(t.delta))}</b>
            </li>
          ))}
        </ul>
      ),
    });
  }

  return out;
}

// ساعت‌های HH:mm داخل متن فارسی رو LTR می‌کنه تا ترتیبشون به هم نریزه
function renderClocks(text: string): ReactNode[] {
  return text.split(/(\d{2}:\d{2})/).map((part, i) => (/^\d{2}:\d{2}$/.test(part) ? <bdi key={i} dir="ltr" className="sli-ltr">{part}</bdi> : part));
}

export function SleepInsightsPanel({ insights }: SleepInsightsPanelProps) {
  const ins = insights;

  if (ins.nights < MIN_NIGHTS) {
    return (
      <section className="sl-card" aria-label={tr("تحلیل خواب", "Sleep analysis")}>
        <h3 className="sl-card-title"><Sparkles />{tr("تحلیل خواب", "Sleep analysis")}</h3>
        <div className="sli-empty-body">
          <GradientRing value={ins.nights / MIN_NIGHTS} size={72} stroke={7} grad={RING_BLUE}>
            <b className="sli-empty-n">{faNum(ins.nights)}/{faNum(MIN_NIGHTS)}</b>
          </GradientRing>
          <p className="sl-sub">
            {tr(`با ثبت ${faNum(MIN_NIGHTS)} شب خواب، این‌جا برات تحلیل می‌سازیم: میانگین خواب، بدهی خواب، بهترین ساعت خوابیدن، تیپ خواب و این‌که چه چیزهایی روی خوابت اثر دارن.`, `Once you log ${MIN_NIGHTS} nights of sleep, we'll build an analysis here: average sleep, sleep debt, best bedtime, sleep type and what affects your sleep.`)}
            {ins.nights > 0 ? tr(` ${faNum(MIN_NIGHTS - ins.nights)} شب دیگه مونده.`, ` ${MIN_NIGHTS - ins.nights} more ${MIN_NIGHTS - ins.nights === 1 ? "night" : "nights"} to go.`) : ""}
          </p>
        </div>
      </section>
    );
  }

  const cards = buildCards(ins);
  const avg = ins.avgMin ?? 0;
  const durTone = avg >= ins.goalMin - 30 ? "slp-c-great" : avg >= ins.goalMin - 75 ? "slp-c-fair" : "slp-c-poor";
  const debtTone = ins.debt7Min < 30 ? "slp-c-great" : ins.debt7Min < 180 ? "slp-c-fair" : "slp-c-poor";
  const cons = ins.consistency ?? 0;

  return (
    <section className="sl-card" aria-label={tr("تحلیل خواب", "Sleep analysis")}>
      <div className="sl-head-row">
        <h3 className="sl-card-title"><Sparkles />{tr("تحلیل خواب", "Sleep analysis")}</h3>
        <span className="sl-sub">{tr(`${faNum(ins.nights)} شب ثبت‌شده`, `${ins.nights} ${ins.nights === 1 ? "night" : "nights"} logged`)}</span>
      </div>

      <div className="sli-grid">
        <div className="sl-stat">
          <span>{tr("میانگین خواب", "Average sleep")}</span>
          <b className={durTone}>{ins.avgMin !== null ? durationLabel(ins.avgMin) : "-"}</b>
        </div>
        <div className="sl-stat">
          <span>{tr("خواب و بیداری معمول", "Usual bed and wake times")}</span>
          <b className="sli-clocks"><bdi dir="ltr" className="sli-ltr">{ins.avgBed ?? "--:--"}</bdi><em>{tr("تا", "to")}</em><bdi dir="ltr" className="sli-ltr">{ins.avgWake ?? "--:--"}</bdi></b>
        </div>
        <div className="sl-stat sli-ring-stat">
          <GradientRing value={cons / 100} size={40} stroke={5} grad={cons >= 70 ? RING_GREEN : RING_AMBER} />
          <div className="sli-ring-txt">
            <span>{tr("ثبات ساعت خواب", "Sleep schedule consistency")}</span>
            <b>{faNum(cons)}%</b>
          </div>
        </div>
        <div className="sl-stat">
          <span>{tr("شب‌های داخل هدف", "Nights within goal")}</span>
          <b>{faNum(ins.goalPct ?? 0)}%</b>
        </div>
        <div className="sl-stat">
          <span>{tr("بدهی خواب 7 شب", "7-night sleep debt")}</span>
          <b className={debtTone}>{ins.debt7Min < 15 ? tr("ندارم", "None") : durationLabel(ins.debt7Min)}</b>
        </div>
        <div className="sl-stat">
          <span>{tr("رشته‌ی خواب کافی", "Good-sleep streak")}</span>
          <b className="sli-streak">{ins.goalStreak > 0 && <Zap />}{tr(`${faNum(ins.goalStreak)} شب`, `${ins.goalStreak} ${ins.goalStreak === 1 ? "night" : "nights"}`)}</b>
        </div>
      </div>

      {cards.length > 0 && (
        <ul className="sli-list">
          {cards.map((c) => (
            <li key={c.key} className={`sli-card sli-t-${c.tone}`}>
              <span className="sli-ic">{c.icon}</span>
              <div className="sli-body">
                <b>{c.title}</b>
                <p>{renderClocks(c.text)}</p>
                {c.extra}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
