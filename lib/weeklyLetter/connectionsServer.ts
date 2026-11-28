// بخش دیتابیس «ارتباط‌ها»: داده‌ی خود کاربر در پنجره‌ی هفته‌ی جاری + ۴ هفته‌ی قبل رو
// به ورودی موتور خالص (connections.ts) تبدیل می‌کنه. جزئیات روزها از همون history آنالیز
// اصلی میاد (بدون محاسبه‌ی دوباره)، و فقط چند سیگنال غیرفعال اضافه خونده می‌شه که آنالیز
// اصلی نگه نمی‌داره: ساعت آخرین ثبت روز (updatedAt)، ساعت شروع تمرین (startedAt)، تاخیر
// خواب و بیدارشدن‌ها، تیک داروها و معامله‌ها. هیچ سیگنال تازه‌ای ردیابی نمی‌شه؛ هر چیزی که
// ذخیره نشده باشه کنار گذاشته می‌شه. فقط دامنه‌هایی که توی آنالیز هستن (بخش + دسترسی ماژول)
// خونده می‌شن و همه‌ی کوئری‌ها با userId محدودن.
import { prisma } from "@/lib/prisma";
import { addDaysIso, isoToUtcDate, isoWeekday, localIso, localMinuteOfDay, safeTimezone, todayIso, utcIso } from "@/lib/weeklyAnalysis/week";
import type { DayCell, DayDetails } from "@/lib/weeklyAnalysis/types";
import { dosesOnDay, DOSE_LOG_DAYS, type DoseLog } from "@/lib/medicationDoses";
import type { Medication } from "@/lib/medicationSchedule";
import { loadTradeRows } from "./tradeWeekServer";
import type { TradeWeekRow } from "./tradeWeek";
import {
  bedtimeShifted, computeConnections, mean,
  type ConnDay, type ConnTrade, type ConnectionsBlock, type MetricKey,
} from "./connections";

/** ۴ هفته‌ی قبل + هفته‌ی جاری */
export const CONN_WINDOW_DAYS = 35;

type Analysis = {
  weekStart: string;
  weekEnd: string;
  days: DayCell[];
  domains: { domain: string }[];
  history?: { date: string; details: DayDetails }[];
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function hmToMin(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function tradeRowsToConn(rows: TradeWeekRow[], tz: string): ConnTrade[] {
  return rows
    .filter((t) => t.status !== "CANCELED")
    .map((t) => ({
      date: localIso(tz, t.openedAt),
      minute: localMinuteOfDay(tz, t.openedAt),
      openedMs: t.openedAt.getTime(),
      closedMs: t.closedAt ? t.closedAt.getTime() : null,
      win: t.status !== "CLOSED" ? null : t.result === "PROFIT" ? true : t.result === "LOSS" ? false : null,
      r: t.rMultiple,
      checklistFull: t.checklistTotal && t.checklistTotal > 0 ? (t.checklistDone ?? 0) >= t.checklistTotal : null,
      followedPlan: t.followedPlan,
      hasStop: t.stopLoss != null && t.stopLoss !== 0,
    }));
}

/** معیارهای روزانه‌ی ترید از معامله‌های همون روز */
export function tradeDayMetrics(ts: ConnTrade[]): Partial<Record<MetricKey, number | null>> {
  if (!ts.length) return {};
  const dec = ts.filter((t) => t.win !== null);
  const rs = ts.map((t) => t.r).filter((x): x is number => x != null);
  const cl = ts.map((t) => t.checklistFull).filter((x): x is boolean => x != null);
  const pl = ts.map((t) => t.followedPlan).filter((x): x is boolean => x != null);
  return {
    tradeCount: ts.length,
    dayWin: dec.length ? (dec.filter((t) => t.win).length / dec.length) * 100 : null,
    tradeR: rs.length ? mean(rs) : null,
    checklistPct: cl.length ? (cl.filter(Boolean).length / cl.length) * 100 : null,
    planPct: pl.length ? (pl.filter(Boolean).length / pl.length) * 100 : null,
  };
}

export async function gatherConnections(
  userId: string,
  a: Analysis,
  opts: { timezone: string; now: Date },
): Promise<ConnectionsBlock | null> {
  if (!a.history?.length) return null;
  const tz = safeTimezone(opts.timezone);
  const today = todayIso(tz, opts.now);
  const has = (d: string) => a.domains.some((x) => x.domain === d);
  const from = addDaysIso(a.weekStart, -(CONN_WINDOW_DAYS - 7));
  const to = a.weekEnd < today ? a.weekEnd : today;
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDaysIso(d, 1)) dates.push(d);
  if (dates.length < 10) return null;

  const dFrom = isoToUtcDate(from);
  const dTo = isoToUtcDate(to);
  const hasRoutine = has("routine");

  const [dailyRows, sleepRows, exRows, settings, tradeRows] = await Promise.all([
    hasRoutine
      ? prisma.dailyEntry.findMany({ where: { userId, date: { gte: dFrom, lte: dTo } }, select: { date: true, updatedAt: true, completedItems: true } })
      : Promise.resolve([]),
    has("sleep")
      ? prisma.sleepEntry.findMany({ where: { userId, date: { gte: dFrom, lte: dTo } }, select: { date: true, latencyMin: true, awakenings: true } })
      : Promise.resolve([]),
    has("fitness")
      ? prisma.exerciseLog.findMany({ where: { userId, date: { gte: dFrom, lte: dTo } }, select: { date: true, startedAt: true } })
      : Promise.resolve([]),
    hasRoutine
      ? prisma.userSetting.findMany({ where: { userId, key: { in: ["medications", "medicationDoses"] } }, select: { key: true, value: true } })
      : Promise.resolve([]),
    has("trading") ? loadTradeRows(userId, from, to).catch(() => [] as TradeWeekRow[]) : Promise.resolve([] as TradeWeekRow[]),
  ]);

  // ساعت آخرین ثبت روز: فقط وقتی همون روز ثبت شده (ویرایش روزهای بعد، ساعت رو بی‌معنی می‌کنه)
  const lastTick = new Map<string, number>();
  for (const r of dailyRows) {
    const iso = utcIso(r.date);
    const items = r.completedItems && typeof r.completedItems === "object" && !Array.isArray(r.completedItems) ? (r.completedItems as Record<string, unknown>) : {};
    if (!Object.values(items).some((v) => v === true)) continue;
    if (localIso(tz, r.updatedAt) !== iso) continue;
    lastTick.set(iso, localMinuteOfDay(tz, r.updatedAt));
  }
  const sleepExtra = new Map(sleepRows.map((r) => [utcIso(r.date), r]));
  const wStart = new Map<string, number>();
  for (const r of exRows) if (r.startedAt) wStart.set(utcIso(r.date), localMinuteOfDay(tz, r.startedAt));

  // داروها: تیک‌ها فقط ۱۴ روز اخیر نگه داشته می‌شن
  const by = new Map(settings.map((s) => [s.key, s.value]));
  const meds = asArray<Medication>(by.get("medications"));
  const doseRaw = by.get("medicationDoses");
  const doseLog: DoseLog = doseRaw && typeof doseRaw === "object" && !Array.isArray(doseRaw) ? (doseRaw as DoseLog) : {};
  const medFrom = addDaysIso(today, -(DOSE_LOG_DAYS - 1));
  const medPct = new Map<string, number>();
  if (meds.length) {
    for (const iso of dates) {
      if (iso < medFrom || iso >= today) continue;
      const slots = dosesOnDay(meds, iso);
      if (!slots.length) continue;
      const taken = new Set(asArray<string>(doseLog[iso]));
      medPct.set(iso, (slots.filter((s) => taken.has(s.key)).length / slots.length) * 100);
    }
  }

  const conn = tradeRowsToConn(tradeRows, tz).filter((t) => t.date >= from && t.date <= to);
  const tradesByDate = new Map<string, ConnTrade[]>();
  for (const t of conn) tradesByDate.set(t.date, [...(tradesByDate.get(t.date) ?? []), t]);

  const detailsBy = new Map(a.history.map((h) => [h.date, h.details]));
  const days: ConnDay[] = dates.map((iso) => {
    const d = detailsBy.get(iso);
    const m: Partial<Record<MetricKey, number | null>> = {};
    if (d?.sleep) {
      m.sleepHours = d.sleep.hours;
      m.sleepQuality = d.sleep.quality;
      const bt = hmToMin(d.sleep.sleptAt);
      m.bedtime = bt == null ? null : bedtimeShifted(bt);
      const x = sleepExtra.get(iso);
      m.latency = x?.latencyMin ?? null;
      m.awakenings = x?.awakenings ?? null;
    }
    if (d?.routine && d.routine.total > 0) m.routinePct = (d.routine.done / d.routine.total) * 100;
    if (d?.tasks && d.tasks.due > 0) m.tasksPct = (d.tasks.done / d.tasks.due) * 100;
    if (d?.fitness) {
      const s = d.fitness.status;
      m.workout = s === "done" || s === "extra" ? 1 : s === "partial" ? 0.5 : s === "missed" ? 0 : null;
    }
    if (d?.nutrition) {
      const n = d.nutrition;
      m.kcalOff = n.target && n.target > 0 ? (Math.abs(n.kcal - n.target) / n.target) * 100 : null;
      m.protein = n.protein;
    }
    if (lastTick.has(iso)) m.lastTick = lastTick.get(iso)!;
    if (wStart.has(iso)) m.workoutStart = wStart.get(iso)!;
    if (medPct.has(iso)) m.medPct = medPct.get(iso)!;
    Object.assign(m, tradeDayMetrics(tradesByDate.get(iso) ?? []));
    return { date: iso, jsDay: isoWeekday(iso), m };
  });

  const block = computeConnections({
    days,
    weekStart: a.weekStart,
    weekScores: a.days.map((d) => ({ date: d.date, score: d.score })),
    trades: conn,
  });
  return block.items.length ? block : null;
}
