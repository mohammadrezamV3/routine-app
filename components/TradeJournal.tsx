"use client";

import { useEffect, useMemo, useState } from "react";
import {
  J_MONTHS, CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, faNum,
  toJalali, jalaliMonthLength, jalaliToGregorianApprox, isoLocal, formatJalali,
} from "@/lib/jalali";
import { G_MONTHS, gregorianMonthLength } from "@/lib/gregorian";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { TradeDayHistory } from "./TradeDayHistory";
import { TradeEntryFields } from "./TradeEntryFields";
import { getSetting } from "@/lib/storage";
import {
  TradeEntry, TradeFormState, EMPTY_TRADE_FORM, CalSystem, CAL_SYSTEM_KEY, MONTHLY_GOAL_KEY,
  formStateToCreateBody, formStateToUpdateBody,
  TradeStatKey, DEFAULT_VISIBLE_TRADE_STATS, TRADE_STATS_VISIBILITY_KEY,
} from "@/lib/tradeTypes";

const now = new Date();
const jToday = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
const todayIso = isoLocal(now);

// حلقه‌ی پیشرفتِ هدف ماهانه — دقیقاً همون رنگ سبز/قرمزِ سود و زیانِ بقیه‌ی
// ژورنال، فقط این‌بار به‌شکل دایره‌ای به‌جای عدد خام
function TradeGoalRing({ current, goal }: { current: number; goal: number }) {
  const pct = goal > 0 ? Math.min(1, Math.max(0, current / goal)) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  const positive = current >= 0;
  return (
    <div className="trade-goal-ring-row">
      <div className="trade-goal-ring-wrap">
        <svg viewBox="0 0 72 72" className="trade-goal-ring">
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
            stroke={positive ? "var(--accent)" : "#E05252"}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            transform="rotate(-90 36 36)"
            className="trade-goal-ring-fill"
          />
        </svg>
        <span className="trade-goal-ring-pct mono">{faNum(Math.round(pct * 100))}٪</span>
      </div>
      <div className="trade-goal-ring-text">
        <div className="trade-stat-label">هدف ماهانه</div>
        <div className="trade-stat-value" style={{ color: positive ? "var(--accent)" : "#E05252" }}>
          {faNum(current.toFixed(1))}<span className="calorie-meal-of"> / {faNum(goal.toFixed(1))}</span>
        </div>
      </div>
    </div>
  );
}

export function TradeJournal() {
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [calYear, setCalYear] = useState(jToday[0]);
  const [calMonth, setCalMonth] = useState(jToday[1]);
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [selectedIso, setSelectedIso] = useState<string>(todayIso);
  const [historyIso, setHistoryIso] = useState<string>(todayIso);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [newTradeOpen, setNewTradeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TradeFormState>(EMPTY_TRADE_FORM);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [visibleStats, setVisibleStats] = useState<TradeStatKey[]>(DEFAULT_VISIBLE_TRADE_STATS);

  function patchForm(patch: Partial<TradeFormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  useEffect(() => { getSetting<number>(MONTHLY_GOAL_KEY, 0).then(setMonthlyGoal); }, []);
  useEffect(() => {
    getSetting<TradeStatKey[]>(TRADE_STATS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_STATS)
      .then((v) => setVisibleStats(v?.length ? v : DEFAULT_VISIBLE_TRADE_STATS));
  }, []);
  // خودِ انتخاب شمسی/میلادی هم دیگه اینجا نیست — رفته توی پنل کاربری؛ این‌جا فقط
  // مقدار ذخیره‌شده رو موقع mount می‌خونه
  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);

  // با عوض شدن سیستم تقویم، ماه نمایش‌داده‌شده به «همین ماه» توی همون سیستم برمی‌گرده —
  // چون ماه شمسی/میلادی جاری لزوماً عدد یکسانی ندارن و تبدیل مستقیم بین‌شون معنی نداره.
  useEffect(() => {
    if (calSystem === "jalali") { setCalYear(jToday[0]); setCalMonth(jToday[1]); }
    else { setCalYear(now.getFullYear()); setCalMonth(now.getMonth() + 1); }
  }, [calSystem]);

  const monthLen = calSystem === "jalali" ? jalaliMonthLength(calMonth) : gregorianMonthLength(calYear, calMonth);
  const monthStartDate = calSystem === "jalali" ? jalaliToGregorianApprox(calYear, calMonth, 1) : new Date(calYear, calMonth - 1, 1);
  const monthEndDate = calSystem === "jalali" ? jalaliToGregorianApprox(calYear, calMonth, monthLen) : new Date(calYear, calMonth - 1, monthLen);
  const startCol = (monthStartDate.getDay() + 1) % 7;
  const monthStartIso = isoLocal(monthStartDate);
  const monthEndIso = isoLocal(monthEndDate);
  const monthLabel = calSystem === "jalali" ? `${J_MONTHS[calMonth - 1]} ${faNum(calYear)}` : `${G_MONTHS[calMonth - 1]} ${faNum(calYear)}`;

  async function loadMonth() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trade/entries?from=${monthStartIso}&to=${monthEndIso}`);
      const data = await res.json();
      setEntries(res.ok ? data.entries || [] : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMonth(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [calYear, calMonth, calSystem]);

  const byDay = useMemo(() => {
    const map: Record<string, TradeEntry[]> = {};
    entries.forEach((e) => {
      const iso = isoLocal(new Date(e.openedAt));
      if (!map[iso]) map[iso] = [];
      map[iso].push(e);
    });
    return map;
  }, [entries]);

  const monthTotal = entries.reduce((s, e) => s + (e.pnl ?? 0), 0);

  // آمار ماه — بر اساس همون معاملاتی که pnl ثبت‌شده دارن (بسته‌شده‌ها)،
  // استریک‌ها به ترتیب زمانی محاسبه می‌شن (نه ترتیب دریافت از API)
  const stats = useMemo(() => {
    const closed = entries
      .filter((e) => e.pnl !== null)
      .slice()
      .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()) as (TradeEntry & { pnl: number })[];
    const wins = closed.filter((e) => e.pnl > 0);
    const losses = closed.filter((e) => e.pnl < 0);

    let curWin = 0, curLoss = 0, maxWinStreak = 0, maxLossStreak = 0;
    for (const e of closed) {
      if (e.pnl > 0) { curWin++; curLoss = 0; }
      else if (e.pnl < 0) { curLoss++; curWin = 0; }
      else { curWin = 0; curLoss = 0; }
      if (curWin > maxWinStreak) maxWinStreak = curWin;
      if (curLoss > maxLossStreak) maxLossStreak = curLoss;
    }

    return {
      total: entries.length,
      winRate: closed.length ? Math.round((wins.length / closed.length) * 100) : null,
      avgWin: wins.length ? wins.reduce((s, e) => s + e.pnl, 0) / wins.length : 0,
      avgLoss: losses.length ? losses.reduce((s, e) => s + e.pnl, 0) / losses.length : 0,
      winCount: wins.length,
      lossCount: losses.length,
      largestGain: wins.length ? Math.max(...wins.map((e) => e.pnl)) : 0,
      largestLoss: losses.length ? Math.min(...losses.map((e) => e.pnl)) : 0,
      maxWinStreak,
      maxLossStreak,
    };
  }, [entries]);

  async function addTrade() {
    if (!form.entryPrice || !form.lotSize) return;
    const body = {
      ...formStateToCreateBody(form),
      openedAt: new Date(selectedIso + "T12:00:00").toISOString(),
    };
    const res = await fetch("/api/trade/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm(EMPTY_TRADE_FORM);
      loadMonth();
    }
  }

  async function removeTrade(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/trade/entries?id=${id}`, { method: "DELETE" });
  }

  async function updateTrade(id: string, value: TradeFormState): Promise<string | null> {
    const res = await fetch("/api/trade/entries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formStateToUpdateBody(id, value)),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.entry) {
      setEntries((es) => es.map((e) => (e.id === id ? data.entry : e)));
      return null;
    }
    return data?.error || "خطا در ذخیره تغییرات";
  }

  function formatIsoForDisplay(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    if (calSystem === "jalali") {
      const j = toJalali(y, m, d);
      return `${faNum(j[2])} ${J_MONTHS[j[1] - 1]} ${faNum(j[0])}`;
    }
    return `${faNum(d)} ${G_MONTHS[m - 1]} ${faNum(y)}`;
  }

  const cells: JSX.Element[] = [];
  for (let i = 0; i < startCol; i++) cells.push(<div key={"e" + i} className="cal-cell empty" />);
  for (let d = 1; d <= monthLen; d++) {
    const gd = calSystem === "jalali" ? jalaliToGregorianApprox(calYear, calMonth, d) : new Date(calYear, calMonth - 1, d);
    const iso = isoLocal(gd);
    const dayEntries = byDay[iso] || [];
    const dayTotal = dayEntries.reduce((s, e) => s + (e.pnl ?? 0), 0);
    const hasEntries = dayEntries.length > 0;
    cells.push(
      <div
        key={iso}
        onClick={() => setHistoryIso(iso)}
        className={`cal-cell${iso === todayIso ? " today" : ""}${iso === historyIso ? " selected" : ""}`}
        style={hasEntries ? { background: dayTotal >= 0 ? "var(--accent-dim)" : "rgba(224,82,82,.14)", borderColor: dayTotal >= 0 ? "var(--accent)" : "#E05252" } : {}}
      >
        <span className="cal-daynum mono">{faNum(d)}</span>
        {hasEntries && (
          <span className="trade-cal-pnl mono" style={{ color: dayTotal >= 0 ? "var(--accent)" : "#E05252" }}>
            {faNum(dayTotal.toFixed(1))}
          </span>
        )}
      </div>
    );
  }

  const selectedJalali = toJalali(+selectedIso.slice(0, 4), +selectedIso.slice(5, 7), +selectedIso.slice(8, 10));

  return (
    <div style={{ marginTop: 10 }}>
      <div className="domain-sub" style={{ margin: 0 }}>پرتفوی ماهانه</div>

      {monthlyGoal > 0 && visibleStats.includes("goalRing") && <TradeGoalRing current={monthTotal} goal={monthlyGoal} />}

      <div className="trade-stats-grid">
        {visibleStats.includes("monthTotal") && (
          <div className="trade-stat-tile trade-stat-tile-wide">
            <div className="trade-stat-label">سود/زیان این ماه</div>
            <div className="trade-stat-value" style={{ color: monthTotal >= 0 ? "var(--accent)" : "#E05252" }}>
              {faNum(monthTotal.toFixed(1))}
            </div>
          </div>
        )}
        {visibleStats.includes("total") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">تعداد معاملات</div>
            <div className="trade-stat-value">{faNum(stats.total)}</div>
          </div>
        )}
        {visibleStats.includes("winRate") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">نرخ برد</div>
            <div className="trade-stat-value">{stats.winRate === null ? "—" : `${faNum(stats.winRate)}٪`}</div>
          </div>
        )}
        {visibleStats.includes("avgWin") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">میانگین سود</div>
            <div className="trade-stat-value" style={{ color: "var(--accent)" }}>{faNum(stats.avgWin.toFixed(1))}</div>
          </div>
        )}
        {visibleStats.includes("avgLoss") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">میانگین ضرر</div>
            <div className="trade-stat-value" style={{ color: "#E05252" }}>{faNum(stats.avgLoss.toFixed(1))}</div>
          </div>
        )}
        {visibleStats.includes("largestGain") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">بیشترین سود</div>
            <div className="trade-stat-value" style={{ color: "var(--accent)" }}>{faNum(stats.largestGain.toFixed(1))}</div>
          </div>
        )}
        {visibleStats.includes("largestLoss") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">بیشترین ضرر</div>
            <div className="trade-stat-value" style={{ color: "#E05252" }}>{faNum(stats.largestLoss.toFixed(1))}</div>
          </div>
        )}
        {visibleStats.includes("maxWinStreak") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">بیشترین برد پشت‌سرهم</div>
            <div className="trade-stat-value" style={{ color: "var(--accent)" }}>{faNum(stats.maxWinStreak)}</div>
          </div>
        )}
        {visibleStats.includes("maxLossStreak") && (
          <div className="trade-stat-tile">
            <div className="trade-stat-label">بیشترین باخت پشت‌سرهم</div>
            <div className="trade-stat-value" style={{ color: "#E05252" }}>{faNum(stats.maxLossStreak)}</div>
          </div>
        )}
      </div>

      <div className="tm-extra">
        <button type="button" className="small" onClick={() => setNewTradeOpen(true)} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          ثبت معامله جدید
        </button>
      </div>

      {newTradeOpen && (
        <>
          <div className="modal-overlay open" onClick={() => setNewTradeOpen(false)} />
          <div className="modal-panel open">
            <div className="modal-head">
              <div className="modal-title">ثبت معامله جدید</div>
              <button className="nav-close" onClick={() => setNewTradeOpen(false)} aria-label="بستن">×</button>
            </div>
            <div className="modal-body">
              <div className="trade-entry-date-row">
                <span>برای تاریخ:</span>
                <button type="button" className="jdate-btn trade-date-btn" onClick={() => setDatePickerOpen(true)}>
                  {formatJalali(selectedJalali)}
                </button>
              </div>

              <TradeEntryFields value={form} onChange={patchForm} />

              <button
                className="small"
                onClick={async () => { await addTrade(); setNewTradeOpen(false); }}
                style={{ marginTop: 10, borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                ثبت معامله
              </button>
            </div>
          </div>
        </>
      )}

      {datePickerOpen && (
        <JalaliDatePicker
          initial={selectedJalali}
          disableFuture
          onPick={(d) => {
            setSelectedIso(isoLocal(jalaliToGregorianApprox(d[0], d[1], d[2])));
            setDatePickerOpen(false);
          }}
          onClose={() => setDatePickerOpen(false)}
        />
      )}

      <div className="tm-extra">
        <div className="domain-sub">تقویم معاملات</div>
        <div className="cal-controls">
          <button className="small mono" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }}>‹</button>
          <div className="cal-label">{monthLabel}</div>
          <button className="small mono" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }}>›</button>
        </div>

        <div className="cal-grid">
          {CAL_WEEK_ORDER.map((d) => <div key={d} className="cal-weekday">{FA_WEEKDAY_SHORT[d]}</div>)}
          {cells}
        </div>

        {loading && <div className="item-line" style={{ marginTop: 10 }}>در حال بارگذاری…</div>}
      </div>

      <TradeDayHistory
        title={formatIsoForDisplay(historyIso)}
        entries={byDay[historyIso] || []}
        onDelete={removeTrade}
        onUpdate={updateTrade}
      />

      <div className="disclaimer-note">
        <span className="disclaimer-warn">توجه: </span>
        این ژورنال فقط آمار خام معاملات و یادآوری‌ست، نه توصیه‌ی مالی؛ تصمیم‌های معاملاتی بر عهده‌ی کاربر است.
      </div>
    </div>
  );
}
