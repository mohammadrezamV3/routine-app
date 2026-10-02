"use client";

import type { ReactNode } from "react";
import { CloudMoon, Coffee, Hourglass, Moon, Sparkles, Sunrise, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { GradientRing, RING_AMBER, RING_BLUE, RING_GREEN } from "./GradientRing";
import { CHRONOTYPE_LABEL, durationLabel, type SleepInsights } from "@/lib/sleep";
import { faNum } from "@/lib/jalali";
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
      title: up ? "خوابت رو به بهتر شدنه" : "این هفته خوابت افت کرده",
      text: up
        ? `امتیاز خواب این هفته ${faNum(abs)} امتیاز از هفته‌ی قبل بیشتره. هرچی کردی ادامه بده.`
        : `امتیاز خواب این هفته ${faNum(abs)} امتیاز از هفته‌ی قبل کمتره. یه شب زودتر خوابیدن معمولا برای شروع دوباره کافیه.`,
    });
  }

  if (ins.nights >= MIN_NIGHTS) {
    if (ins.debt7Min >= 30) {
      const per = roundUp5(ins.debt7Min / 3);
      out.push({
        key: "debt",
        icon: <Hourglass />,
        tone: ins.debt7Min >= 180 ? "poor" : "fair",
        title: `${durationLabel(ins.debt7Min)} بدهی خواب داری`,
        text: `تو هفت شب اخیر نسبت به هدفت (${durationLabel(ins.goalMin)} در شب) کمتر خوابیدی. اگه سه شب آینده هر شب ${faNum(per)} دقیقه زودتر بخوابی، بدهی جبران می‌شه.`,
      });
    } else {
      out.push({
        key: "debt",
        icon: <Hourglass />,
        tone: "good",
        title: "بدهی خوابی نداری",
        text: "تو هفت شب اخیر تقریبا همه‌ی خوابی که لازم داشتی رو گرفتی.",
      });
    }
  }

  if (ins.socialJetlagMin !== null) {
    const j = ins.socialJetlagMin;
    out.push({
      key: "jetlag",
      icon: <CloudMoon />,
      tone: j >= 90 ? "poor" : j >= 45 ? "fair" : "good",
      title: j >= 45 ? `جت‌لگ اجتماعی ${durationLabel(j)}` : "ساعت خوابت بین روزها ثابته",
      text:
        j >= 45
          ? `وسط خواب تو شب‌های آزاد (پنجشنبه و جمعه) با شب‌های کاری ${durationLabel(j)} فاصله داره. یعنی بدنت هر هفته انگار به یه منطقه‌ی زمانی دیگه سفر می‌کنه و اول هفته سخت‌تر بیدار می‌شی. سعی کن آخر هفته‌ها بیشتر از یک ساعت دیرتر نخوابی.`
          : "فرق ساعت خواب تو شب‌های آزاد و کاری کمتر از 45 دقیقه‌ست. بدنت از این ثبات خوشش میاد.",
    });
  }

  if (ins.chronotype) {
    const mid = ins.midSleepFree;
    const tip =
      ins.chronotype === "lark"
        ? "کارهای سنگین رو بذار صبح که ذهنت تازه‌ترینه و شب‌ها زود آروم شو."
        : ins.chronotype === "owl"
          ? "ذهنت عصر و شب بهتر کار می‌کنه؛ صبح‌ها نور خورشید بگیر تا ساعت بدنت جلو بیاد."
          : "ریتم تو متعادله و با برنامه‌ی معمول روز جور درمیاد؛ فقط ثابت نگهش دار.";
    out.push({
      key: "chrono",
      icon: <Sunrise />,
      tone: "ink",
      title: `تیپ خوابت: ${CHRONOTYPE_LABEL[ins.chronotype]}`,
      text: `${mid ? `وسط خواب تو شب‌های آزاد حدود ${mid} می‌افته.` : ""} ${tip}`.trim(),
    });
  }

  if (ins.bestBedWindow) {
    const w = ins.bestBedWindow;
    out.push({
      key: "bed",
      icon: <Moon />,
      tone: "good",
      title: "بهترین ساعت خوابت",
      text: `وقتی بین ${w.from} تا ${w.to} می‌خوابی، میانگین امتیازت ${faNum(w.avgScore)} می‌شه (${faNum(w.nights)} شب). اگه می‌تونی، همین بازه رو هدف بگیر.`,
    });
  }

  const pos = ins.tagImpacts.filter((t) => t.delta > 0).slice(0, 2);
  const neg = ins.tagImpacts.filter((t) => t.delta < 0).slice(0, 2);
  const tags = [...neg, ...pos].filter((t) => Math.abs(t.delta) >= 2);
  if (tags.length) {
    const lines: string[] = [];
    const n0 = neg[0], p0 = pos[0];
    if (n0 && Math.abs(n0.delta) >= 2) lines.push(`شب‌هایی که «${n0.label}» داشتی امتیازت ${faNum(Math.abs(n0.delta))} کمتر بوده.`);
    if (p0 && p0.delta >= 2) lines.push(`شب‌هایی که «${p0.label}» داشتی ${faNum(p0.delta)} امتیاز بیشتر گرفتی.`);
    const max = Math.max(...tags.map((t) => Math.abs(t.delta)), 1);
    out.push({
      key: "tags",
      icon: <Coffee />,
      tone: "ink",
      title: "چی روی خوابت اثر داره",
      text: lines.join(" "),
      extra: (
        <ul className="sli-tags">
          {tags.map((t) => (
            <li key={t.key} className="sli-tag">
              <span className="sli-tag-name">{t.label}</span>
              <span className="sli-div" dir="ltr" aria-hidden="true">
                <span className="sli-div-half sli-div-neg">
                  {t.delta < 0 && <i className="sli-bar sli-bar-neg" style={{ width: `${(Math.abs(t.delta) / max) * 100}%` }} />}
                </span>
                <span className="sli-div-half sli-div-pos">
                  {t.delta > 0 && <i className="sli-bar sli-bar-pos" style={{ width: `${(t.delta / max) * 100}%` }} />}
                </span>
              </span>
              <b className={t.delta > 0 ? "sli-pos" : "sli-neg"} dir="ltr">{t.delta > 0 ? "+" : "-"}{faNum(Math.abs(t.delta))}</b>
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
      <section className="sl-card" aria-label="تحلیل خواب">
        <h3 className="sl-card-title"><Sparkles />تحلیل خواب</h3>
        <div className="sli-empty-body">
          <GradientRing value={ins.nights / MIN_NIGHTS} size={72} stroke={7} grad={RING_BLUE}>
            <b className="sli-empty-n">{faNum(ins.nights)}/{faNum(MIN_NIGHTS)}</b>
          </GradientRing>
          <p className="sl-sub">
            با ثبت {faNum(MIN_NIGHTS)} شب خواب، این‌جا برات تحلیل می‌سازیم: میانگین خواب، بدهی خواب، بهترین ساعت خوابیدن، تیپ خواب و این‌که چه چیزهایی روی خوابت اثر دارن.
            {ins.nights > 0 ? ` ${faNum(MIN_NIGHTS - ins.nights)} شب دیگه مونده.` : ""}
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
    <section className="sl-card" aria-label="تحلیل خواب">
      <div className="sl-head-row">
        <h3 className="sl-card-title"><Sparkles />تحلیل خواب</h3>
        <span className="sl-sub">{faNum(ins.nights)} شب ثبت‌شده</span>
      </div>

      <div className="sli-grid">
        <div className="sl-stat">
          <span>میانگین خواب</span>
          <b className={durTone}>{ins.avgMin !== null ? durationLabel(ins.avgMin) : "-"}</b>
        </div>
        <div className="sl-stat">
          <span>خواب و بیداری معمول</span>
          <b className="sli-clocks"><bdi dir="ltr" className="sli-ltr">{ins.avgBed ?? "--:--"}</bdi><em>تا</em><bdi dir="ltr" className="sli-ltr">{ins.avgWake ?? "--:--"}</bdi></b>
        </div>
        <div className="sl-stat sli-ring-stat">
          <GradientRing value={cons / 100} size={40} stroke={5} grad={cons >= 70 ? RING_GREEN : RING_AMBER} />
          <div className="sli-ring-txt">
            <span>ثبات ساعت خواب</span>
            <b>{faNum(cons)}%</b>
          </div>
        </div>
        <div className="sl-stat">
          <span>شب‌های داخل هدف</span>
          <b>{faNum(ins.goalPct ?? 0)}%</b>
        </div>
        <div className="sl-stat">
          <span>بدهی خواب 7 شب</span>
          <b className={debtTone}>{ins.debt7Min < 15 ? "ندارم" : durationLabel(ins.debt7Min)}</b>
        </div>
        <div className="sl-stat">
          <span>رشته‌ی خواب کافی</span>
          <b className="sli-streak">{ins.goalStreak > 0 && <Zap />}{faNum(ins.goalStreak)} شب</b>
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
