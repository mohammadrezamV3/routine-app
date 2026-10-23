"use client";

// فصل «نظم و ذهن» (فقط بخش ترید): حلقه‌های انضباط (طبق پلن، چک‌لیست، حدضرر)،
// «هزینه‌ی قانون‌شکنی» (معامله‌های هیجانی یا بدون پلن در برابر منظم‌ها)، جدول
// احساسات قبل از ورود با اطمینان برد و باخت، و رفتار بعد از ضرر. حلقه‌ها فقط
// GradientRing؛ کارت‌ها همون کارت هفته‌نامه.
import { AlertTriangle, BrainCircuit, RotateCcw, ShieldCheck } from "lucide-react";
import { tr } from "@/lib/i18n";
import { isolateNumbers } from "@/lib/weeklyAnalysis/bidi";
import type { TradeWeek } from "@/lib/weeklyLetter/tradeWeek";
import { TRADE_AFTER_LOSS_HOURS } from "@/lib/weeklyLetter/tradeWeek";
import { fmtMoney, tradeEmotionLabel } from "@/lib/weeklyLetter/tradeWeekText";
import { GradientRing, RING_AMBER, RING_BLUE, RING_GREEN } from "./GradientRing";
import { WeeklyLetterChapterHead } from "./WeeklyLetterChapterHead";
import { MeterBar, Reveal } from "./WeeklyLetterShared";

const pctOf = (yes: number, of: number) => Math.round((yes / of) * 100);

function Ring({ label, yes, of, grad, delay }: { label: string; yes: number; of: number; grad: typeof RING_GREEN; delay: number }) {
  const p = pctOf(yes, of);
  return (
    <div className="wl-tw-ring">
      <GradientRing value={p / 100} size={92} stroke={9} grad={grad} delay={delay}>
        <span className="wl-tw-ring-v" dir="ltr">{p}%</span>
      </GradientRing>
      <b>{label}</b>
      <small dir="ltr">{yes}/{of}</small>
    </div>
  );
}

/** شرط نمایش فصل در خواننده (همون شرط خود فصل) */
export function tradeMindHasData(t: TradeWeek | null | undefined): boolean {
  return !!t && t.discipline.total >= 1;
}

export function WeeklyLetterTradeMind({ trade, no }: { trade: TradeWeek; no?: number }) {
  const cur = trade.currency;
  const d = trade.discipline;
  const { broke, kept, afterLoss: al } = trade.mind;
  const hasSplit = trade.count >= 1;
  const emotions = trade.mind.byEmotion;
  const gap = broke.avg != null && kept.avg != null ? Math.round((kept.avg - broke.avg) * 100) / 100 : null;

  return (
    <section id="trade-mind" className="wl-ch">
      <WeeklyLetterChapterHead icon={BrainCircuit} title={tr("نظم و ذهن", "Discipline and mind")} no={no} />
      <div className="wl-tw-grid is-mind">
        <Reveal className="wl-card wl-tw-disc">
          <h3><span className="wl-tw-list-ico"><ShieldCheck size={15} /></span>{tr("انضباط", "Discipline")}</h3>
          <div className="wl-tw-rings">
            {d.plan && <Ring label={tr("طبق پلن", "On plan")} yes={d.plan.yes} of={d.plan.of} grad={RING_GREEN} delay={0.1} />}
            {d.checklist && <Ring label={tr("چک‌لیست کامل", "Full checklist")} yes={d.checklist.full} of={d.checklist.of} grad={RING_BLUE} delay={0.2} />}
            {d.stop && <Ring label={tr("با حدضرر", "With a stop")} yes={d.stop.yes} of={d.stop.of} grad={RING_AMBER} delay={0.3} />}
          </div>
        </Reveal>

        {hasSplit && (
          <Reveal className={`wl-card wl-tw-cost ${broke.count > 0 && broke.net < 0 ? "is-bad" : "is-good"}`} delay={0.06}>
            <h3><span className="wl-tw-list-ico"><AlertTriangle size={15} /></span>{tr("هزینه‌ی قانون‌شکنی", "Cost of breaking the rules")}</h3>
            {broke.count === 0 ? (
              <p className="wl-tw-cost-ok">{tr("هیچ معامله‌ی هیجانی یا خارج از پلن نداشتی. همین نظم، لبه‌ی توئه.", "No emotional or off-plan trades. That order is your edge.")}</p>
            ) : (
              <>
                <b className={`wl-tw-cost-v ${broke.net < 0 ? "is-loss" : "is-win"}`} dir="ltr">{fmtMoney(broke.net, cur)}</b>
                <p className="wl-tw-cost-cap">{tr(`از ${broke.count} معامله‌ی هیجانی یا خارج از پلن`, `from ${broke.count} emotional or off-plan ${broke.count === 1 ? "trade" : "trades"}`)}</p>
              </>
            )}
            <div className="wl-tw-split">
              <div>
                <small>{tr("خارج از قانون", "Off-rule")}</small>
                <b dir="ltr">{broke.count}</b>
                <em dir="ltr" className={broke.net < 0 ? "is-loss" : broke.net > 0 ? "is-win" : ""}>{broke.avg == null ? "-" : fmtMoney(broke.avg, null)}</em>
              </div>
              <div>
                <small>{tr("منظم", "Disciplined")}</small>
                <b dir="ltr">{kept.count}</b>
                <em dir="ltr" className={kept.net < 0 ? "is-loss" : kept.net > 0 ? "is-win" : ""}>{kept.avg == null ? "-" : fmtMoney(kept.avg, null)}</em>
              </div>
            </div>
            <small className="wl-tw-unit">{tr(`میانگین هر معامله${cur ? ` (${cur})` : ""}`, `average per trade${cur ? ` (${cur})` : ""}`)}</small>
            {gap != null && gap > 0 && broke.count > 0 && (
              <p className="wl-tw-cost-cap">{isolateNumbers(tr(`هر معامله‌ی منظم به‌طور میانگین ${fmtMoney(gap, cur, false)} بیشتر از معامله‌ی خارج از قانون آورد.`, `Each disciplined trade earned ${fmtMoney(gap, cur, false)} more on average than an off-rule one.`))}</p>
            )}
          </Reveal>
        )}

        {emotions.length > 0 && (
          <Reveal className="wl-card wl-tw-list" delay={0}>
            <h3><span className="wl-tw-list-ico"><BrainCircuit size={15} /></span>{tr("حال قبل از ورود", "Mood before entry")}</h3>
            <ul>
              {emotions.map((b) => (
                <li key={b.key} className="wl-tw-row">
                  <span className="wl-tw-row-name">{tradeEmotionLabel(b.key)}</span>
                  <span className="wl-tw-row-n">{b.count}</span>
                  <span className="wl-tw-row-bar">
                    <MeterBar ratio={(b.winRate ?? 0) / 100} />
                    <small dir="ltr">{b.winRate == null ? "-" : `${b.winRate}%`}</small>
                  </span>
                  <b className={`wl-tw-row-net${b.net > 0 ? " is-win" : b.net < 0 ? " is-loss" : ""}`} dir="ltr">{fmtMoney(b.net, null)}</b>
                </li>
              ))}
            </ul>
            {trade.mind.confidenceWin != null && trade.mind.confidenceLoss != null && (
              <p className="wl-tw-foot">{tr(`اطمینان قبل از ورود: ${trade.mind.confidenceWin} از 10 در بردها و ${trade.mind.confidenceLoss} در باخت‌ها`, `Confidence before entry: ${trade.mind.confidenceWin} of 10 on wins and ${trade.mind.confidenceLoss} on losses`)}</p>
            )}
          </Reveal>
        )}

        {al.count > 0 && (
          <Reveal className="wl-card wl-tw-after" delay={0.06}>
            <h3><span className="wl-tw-list-ico"><RotateCcw size={15} /></span>{tr("بعد از ضرر", "After a loss")}</h3>
            <p className="wl-tw-cost-cap">{tr(`${al.count} معامله رو کمتر از ${TRADE_AFTER_LOSS_HOURS} ساعت بعد از یک ضرر باز کردی.`, `You opened ${al.count} ${al.count === 1 ? "trade" : "trades"} within ${TRADE_AFTER_LOSS_HOURS} hours of a loss.`)}</p>
            <div className="wl-tw-split">
              <div>
                <small>{tr("نرخ برد بعد از ضرر", "Win rate after a loss")}</small>
                <b dir="ltr">{al.winRate == null ? "-" : `${al.winRate}%`}</b>
              </div>
              <div>
                <small>{tr("نرخ برد بقیه", "Win rate otherwise")}</small>
                <b dir="ltr">{al.otherWinRate == null ? "-" : `${al.otherWinRate}%`}</b>
              </div>
              <div>
                <small>{tr("جمع", "Total")}</small>
                <b dir="ltr" className={al.net < 0 ? "is-loss" : al.net > 0 ? "is-win" : ""}>{fmtMoney(al.net, null)}</b>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
