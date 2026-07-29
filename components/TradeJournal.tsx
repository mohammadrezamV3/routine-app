"use client";

import { useEffect, useMemo, useState } from "react";
import {
  J_MONTHS, CAL_WEEK_ORDER, FA_WEEKDAY_SHORT, faNum,
  toJalali, jalaliMonthLength, jalaliToGregorianApprox, isoLocal, formatJalali,
} from "@/lib/jalali";
import { G_MONTHS, gregorianMonthLength } from "@/lib/gregorian";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { TradeDayModal } from "./TradeDayModal";
import { SegmentedTabs } from "./SegmentedTabs";
import { compressImageToDataUrl } from "@/lib/image";
import { getSetting, setSetting } from "@/lib/storage";
import { TradeEntry } from "@/lib/tradeTypes";

type CalSystem = "jalali" | "gregorian";
const CAL_SYSTEM_KEY = "tradeCalendarSystem";

const now = new Date();
const jToday = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
const todayIso = isoLocal(now);

export function TradeJournal() {
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [calYear, setCalYear] = useState(jToday[0]);
  const [calMonth, setCalMonth] = useState(jToday[1]);
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [selectedIso, setSelectedIso] = useState<string>(todayIso);
  const [modalIso, setModalIso] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pair, setPair] = useState("EURUSD");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [pnl, setPnl] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [riskPercent, setRiskPercent] = useState("");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => { getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem); }, []);

  function changeCalSystem(v: CalSystem) {
    setCalSystem(v);
    setSetting(CAL_SYSTEM_KEY, v);
  }

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
    const res = await fetch(`/api/trade/entries?from=${monthStartIso}&to=${monthEndIso}`);
    const data = await res.json();
    setEntries(data.entries || []);
    setLoading(false);
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

  // آمار ماه — بر اساس همون معاملاتی که pnl ثبت‌شده دارن (بسته‌شده‌ها)
  const stats = useMemo(() => {
    const closed = entries.filter((e) => e.pnl !== null) as (TradeEntry & { pnl: number })[];
    const wins = closed.filter((e) => e.pnl > 0);
    const losses = closed.filter((e) => e.pnl < 0);
    return {
      total: entries.length,
      winRate: closed.length ? Math.round((wins.length / closed.length) * 100) : null,
      avgWin: wins.length ? wins.reduce((s, e) => s + e.pnl, 0) / wins.length : 0,
      avgLoss: losses.length ? losses.reduce((s, e) => s + e.pnl, 0) / losses.length : 0,
      winCount: wins.length,
      lossCount: losses.length,
      largestGain: wins.length ? Math.max(...wins.map((e) => e.pnl)) : 0,
      largestLoss: losses.length ? Math.min(...losses.map((e) => e.pnl)) : 0,
    };
  }, [entries]);

  async function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScreenshotError(null);
    setCompressing(true);
    try {
      setScreenshotDataUrl(await compressImageToDataUrl(file));
    } catch (err) {
      setScreenshotError(err instanceof Error ? err.message : "خطا در پردازش عکس");
    } finally {
      setCompressing(false);
    }
  }

  async function addTrade() {
    if (!entryPrice || !lotSize) return;
    const body = {
      pair, direction,
      entryPrice: +entryPrice,
      exitPrice: exitPrice ? +exitPrice : undefined,
      lotSize: +lotSize,
      pnl: pnl ? +pnl : undefined,
      stopLoss: stopLoss ? +stopLoss : undefined,
      takeProfit: takeProfit ? +takeProfit : undefined,
      riskPercent: riskPercent ? +riskPercent : undefined,
      strategy: strategy || undefined,
      screenshotUrl: screenshotDataUrl || undefined,
      openedAt: new Date(selectedIso + "T12:00:00").toISOString(),
      notes: notes || undefined,
    };
    const res = await fetch("/api/trade/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEntryPrice(""); setExitPrice(""); setLotSize(""); setPnl(""); setNotes("");
      setStopLoss(""); setTakeProfit(""); setRiskPercent(""); setStrategy(""); setScreenshotDataUrl(null);
      loadMonth();
    }
  }

  async function removeTrade(id: string) {
    setEntries((e) => e.filter((x) => x.id !== id));
    await fetch(`/api/trade/entries?id=${id}`, { method: "DELETE" });
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
        onClick={() => hasEntries && setModalIso(iso)}
        className={`cal-cell${iso === todayIso ? " today" : ""}${hasEntries ? "" : " empty-day"}`}
        style={hasEntries ? { background: dayTotal >= 0 ? "var(--accent-dim)" : "rgba(224,82,82,.14)", borderColor: dayTotal >= 0 ? "var(--accent)" : "#E05252" } : {}}
      >
        <span className="cal-daynum mono">{faNum(d)}</span>
      </div>
    );
  }

  const selectedJalali = toJalali(+selectedIso.slice(0, 4), +selectedIso.slice(5, 7), +selectedIso.slice(8, 10));

  return (
    <div style={{ marginTop: 10 }}>
      <div className="trade-portfolio-head">
        <div className="domain-sub" style={{ margin: 0 }}>پرتفوی ماهانه</div>
        <SegmentedTabs
          active={calSystem}
          onChange={changeCalSystem}
          options={[
            { value: "jalali", label: "شمسی" },
            { value: "gregorian", label: "میلادی" },
          ]}
        />
      </div>
      <div className="trade-stats-grid">
        <div className="trade-stat-tile trade-stat-tile-wide">
          <div className="trade-stat-label">سود/زیان این ماه</div>
          <div className="trade-stat-value" style={{ color: monthTotal >= 0 ? "var(--accent)" : "#E05252" }}>
            {faNum(monthTotal.toFixed(2))}
          </div>
        </div>
        <div className="trade-stat-tile">
          <div className="trade-stat-label">تعداد معاملات</div>
          <div className="trade-stat-value">{faNum(stats.total)}</div>
        </div>
        <div className="trade-stat-tile">
          <div className="trade-stat-label">نرخ برد</div>
          <div className="trade-stat-value">{stats.winRate === null ? "—" : `${faNum(stats.winRate)}٪`}</div>
        </div>
        <div className="trade-stat-tile">
          <div className="trade-stat-label">میانگین سود</div>
          <div className="trade-stat-value" style={{ color: "var(--accent)" }}>{faNum(stats.avgWin.toFixed(1))}</div>
        </div>
        <div className="trade-stat-tile">
          <div className="trade-stat-label">میانگین ضرر</div>
          <div className="trade-stat-value" style={{ color: "#E05252" }}>{faNum(stats.avgLoss.toFixed(1))}</div>
        </div>
        <div className="trade-stat-tile">
          <div className="trade-stat-label">بیشترین سود</div>
          <div className="trade-stat-value" style={{ color: "var(--accent)" }}>{faNum(stats.largestGain.toFixed(1))}</div>
        </div>
        <div className="trade-stat-tile">
          <div className="trade-stat-label">بیشترین ضرر</div>
          <div className="trade-stat-value" style={{ color: "#E05252" }}>{faNum(stats.largestLoss.toFixed(1))}</div>
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">ثبت معامله جدید</div>
        <div className="trade-entry-date-row">
          <span>برای تاریخ:</span>
          <button type="button" className="jdate-btn" onClick={() => setDatePickerOpen(true)}>
            {formatJalali(selectedJalali)}
          </button>
        </div>

        <div className="day-picker" style={{ marginTop: 10 }}>
          <span className={`day-pill${direction === "long" ? " on" : ""}`} onClick={() => setDirection("long")}>خرید (Long)</span>
          <span className={`day-pill${direction === "short" ? " on" : ""}`} onClick={() => setDirection("short")}>فروش (Short)</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input className="wsearch-newform-name" style={{ flex: "1 1 90px" }} placeholder="جفت‌ارز" value={pair} onChange={(e) => setPair(e.target.value)} />
          <input type="number" className="wsearch-newform-name" style={{ flex: "1 1 90px" }} placeholder="قیمت ورود" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
          <input type="number" className="wsearch-newform-name" style={{ flex: "1 1 90px" }} placeholder="قیمت خروج" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
          <input type="number" className="wsearch-newform-name" style={{ flex: "1 1 70px" }} placeholder="لات" value={lotSize} onChange={(e) => setLotSize(e.target.value)} />
          <input type="number" className="wsearch-newform-name" style={{ flex: "1 1 90px" }} placeholder="سود/زیان" value={pnl} onChange={(e) => setPnl(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input type="number" className="wsearch-newform-name" style={{ flex: "1 1 90px" }} placeholder="حد ضرر" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          <input type="number" className="wsearch-newform-name" style={{ flex: "1 1 90px" }} placeholder="حد سود" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
          <input type="number" className="wsearch-newform-name" style={{ flex: "1 1 90px" }} placeholder="درصد ریسک" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} />
        </div>
        <input className="wsearch-newform-name" style={{ marginTop: 8 }} placeholder="استراتژی/ستاپ (اختیاری)" value={strategy} onChange={(e) => setStrategy(e.target.value)} />
        <input className="wsearch-newform-name" style={{ marginTop: 8 }} placeholder="یادداشت (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="trade-shot-row">
          <label className="trade-shot-btn">
            <input type="file" accept="image/*" onChange={handleScreenshotChange} hidden />
            {compressing ? "در حال پردازش…" : screenshotDataUrl ? "تغییر عکس معامله" : "افزودن عکس معامله"}
          </label>
          {screenshotDataUrl && (
            <span className="trade-shot-preview-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotDataUrl} alt="پیش‌نمایش عکس معامله" className="trade-shot-preview" />
              <button type="button" className="trade-shot-remove" onClick={() => setScreenshotDataUrl(null)} aria-label="حذف عکس">×</button>
            </span>
          )}
        </div>
        {screenshotError && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{screenshotError}</div>}

        <button onClick={addTrade} style={{ marginTop: 10, borderColor: "var(--accent)", color: "var(--accent)" }}>ثبت معامله</button>
      </div>

      {datePickerOpen && (
        <JalaliDatePicker
          initial={selectedJalali}
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

      {modalIso && (
        <TradeDayModal
          title={formatIsoForDisplay(modalIso)}
          entries={byDay[modalIso] || []}
          onClose={() => setModalIso(null)}
          onDelete={removeTrade}
        />
      )}

      <div className="disclaimer-note">
        این ژورنال فقط آمار خام معاملات و یادآوری‌ست، نه توصیه‌ی مالی؛ تصمیم‌های معاملاتی بر عهده‌ی کاربر است.
      </div>
    </div>
  );
}
