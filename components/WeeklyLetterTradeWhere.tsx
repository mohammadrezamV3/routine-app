"use client";

// فصل «کجا بردی، کجا باختی» (فقط بخش ترید): فهرست‌های فشرده‌ی جلسه، نماد، خرید
// در برابر فروش، روز هفته، ستاپ و تگ. هر ردیف: اسم، تعداد، نوار نرخ برد و سود و
// زیان خالص. کارت‌ها همون کارت هفته‌نامه‌ان؛ بدون هیچ بک‌گراند جدید.
import { BarChart3, CalendarDays, CandlestickChart, Clock3, Layers, Tag, type LucideIcon } from "lucide-react";
import { tr } from "@/lib/i18n";
import type { TradeBucket, TradeWeek } from "@/lib/weeklyLetter/tradeWeek";
import { fmtMoney, tradeDayLabel, tradeDirectionLabel, tradeSessionLabel } from "@/lib/weeklyLetter/tradeWeekText";
import { WeeklyLetterChapterHead } from "./WeeklyLetterChapterHead";
import { MeterBar, Reveal } from "./WeeklyLetterShared";

function BucketList({ icon: Icon, title, rows, label, cur, delay }: { icon: LucideIcon; title: string; rows: TradeBucket[]; label: (k: string) => string; cur: string | null; delay: number }) {
  if (!rows.length) return null;
  return (
    <Reveal className="wl-card wl-tw-list" delay={delay}>
      <h3><span className="wl-tw-list-ico"><Icon size={15} /></span>{title}</h3>
      <ul>
        {rows.map((b) => (
          <li key={b.key} className="wl-tw-row">
            <span className="wl-tw-row-name">{label(b.key)}</span>
            <span className="wl-tw-row-n" aria-label={tr(`${b.count} معامله`, `${b.count} trades`)}>{b.count}</span>
            <span className="wl-tw-row-bar" title={tr("نرخ برد", "Win rate")}>
              <MeterBar ratio={(b.winRate ?? 0) / 100} />
              <small dir="ltr">{b.winRate == null ? "-" : `${b.winRate}%`}</small>
            </span>
            <b className={`wl-tw-row-net${b.net > 0 ? " is-win" : b.net < 0 ? " is-loss" : ""}`} dir="ltr">{fmtMoney(b.net, null)}</b>
          </li>
        ))}
      </ul>
      {cur && <small className="wl-tw-unit">{cur}</small>}
    </Reveal>
  );
}

/** چند فهرست دارای داده؟ شرط نمایش فصل در خواننده با همین یکیه */
export function tradeWhereHasData(t: TradeWeek | null | undefined): boolean {
  if (!t || t.count < 2) return false;
  return t.bySession.length + t.bySymbol.length + t.byDirection.length + t.byWeekday.length + t.bySetup.length + t.byTag.length > 0;
}

export function WeeklyLetterTradeWhere({ trade, no }: { trade: TradeWeek; no?: number }) {
  const cur = trade.currency;
  const id = (k: string) => k;
  return (
    <section id="trade-where" className="wl-ch">
      <WeeklyLetterChapterHead icon={BarChart3} title={tr("کجا بردی، کجا باختی", "Where you won, where you lost")} no={no} />
      <div className="wl-tw-grid">
        <BucketList icon={Clock3} title={tr("جلسه‌ها", "Sessions")} rows={trade.bySession} label={tradeSessionLabel} cur={cur} delay={0} />
        <BucketList icon={CandlestickChart} title={tr("نمادها", "Symbols")} rows={trade.bySymbol} label={id} cur={cur} delay={0.06} />
        <BucketList icon={Layers} title={tr("خرید و فروش", "Buy and sell")} rows={trade.byDirection} label={tradeDirectionLabel} cur={cur} delay={0} />
        <BucketList icon={CalendarDays} title={tr("روزهای هفته", "Weekdays")} rows={trade.byWeekday} label={(k) => tradeDayLabel(+k)} cur={cur} delay={0.06} />
        <BucketList icon={Layers} title={tr("ستاپ‌ها", "Setups")} rows={trade.bySetup} label={id} cur={cur} delay={0} />
        <BucketList icon={Tag} title={tr("تگ‌ها", "Tags")} rows={trade.byTag} label={id} cur={cur} delay={0.06} />
      </div>
    </section>
  );
}
