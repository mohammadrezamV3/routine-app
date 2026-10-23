// اسلایدهای «داستان هفته» مخصوص بخش ترید (خالص، بدون React). به‌جای متن‌های
// روتین، منحنی سرمایه، بهترین/بدترین معامله، بهترین جلسه و نماد، و انضباط و
// هزینه‌ی قانون‌شکنی رو نشون می‌دن. هر اسلاید بدون داده ساخته نمی‌شه.
import { tr } from "@/lib/i18n";
import type { TradeWeek } from "./tradeWeek";

type Base = { dur: number; label: string; trade: TradeWeek };

export type TradeStorySlide =
  | (Base & { id: "tradeCurve" })
  | (Base & { id: "tradeBest" })
  | (Base & { id: "tradeWhere" })
  | (Base & { id: "tradeMind" });

export function tradeStorySlides(t: TradeWeek): TradeStorySlide[] {
  const out: TradeStorySlide[] = [];
  if (t.count >= 1 && t.curve.length >= 2) out.push({ id: "tradeCurve", dur: 6200, label: tr("منحنی هفته", "Week curve"), trade: t });
  if (t.best || t.worst) out.push({ id: "tradeBest", dur: 5600, label: tr("بهترین و بدترین معامله", "Best and worst trade"), trade: t });
  if (t.bySession.length >= 2 || t.bySymbol.length >= 2 || t.byDirection.length >= 2) {
    out.push({ id: "tradeWhere", dur: 5600, label: tr("کجا بردی، کجا باختی", "Where you won and lost"), trade: t });
  }
  if (t.discipline.total >= 1) out.push({ id: "tradeMind", dur: 6200, label: tr("نظم و ذهن", "Discipline and mind"), trade: t });
  return out;
}
