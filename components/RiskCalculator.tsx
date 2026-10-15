"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair, Plus, X } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { Spinner } from "./Spinner";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import type { TradeAccount } from "@/lib/tradeTypes";
import {
  calcRisk, crossQuoteCurrency, fmtNum, nonUsdQuote, priceDecimals, simplePipCalc, symbolSpec, yahooSymbolFor,
  type RiskDirection, type RiskMode, type RiskResult, type SimplePipResult,
} from "@/lib/riskCalc";
import { tr } from "@/lib/i18n";
import "./risk-calc.css";

const LS_KEY = "arion:riskCalc";
const MAX_TPS = 3;

type UiMode = "simple" | "advanced";

type Snapshot = {
  ui: UiMode;
  key: string;
  adv: RiskResult | { ok: false; error: string } | null;
  simple: SimplePipResult | { ok: false; error: string } | null;
  direction: RiskDirection;
  entry: number;
  sl: number;
  symbol: string;
};

function readPrefs(): { ui?: UiMode; mode?: RiskMode; riskValue?: string; balance?: string } {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; } catch { return {}; }
}

/** عدد با علامت/اعشار همیشه چپ‌به‌راست تا در متن فارسی جابه‌جا نشود */
function Ltr({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr" className="rk-ltr">{children}</bdi>;
}

/**
 * ماشین‌حساب ریسک و سود. هم صفحه‌ی /trade/risk و هم پنل داخل چارت از همین
 * استفاده می‌کنند. اگر `symbol` از بیرون بیاید (چارت)، نماد از همان پیروی
 * می‌کند و انتخابگر نماد پنهان می‌ماند.
 */
export function RiskCalculator({
  accounts = [],
  symbol: symbolProp,
  compact = false,
}: {
  accounts?: TradeAccount[];
  symbol?: string;
  compact?: boolean;
}) {
  const [symbolState, setSymbolState] = useState("EURUSD");
  const symbol = symbolProp || symbolState;
  const [direction, setDirection] = useState<RiskDirection>("BUY");
  const [mode, setMode] = useState<RiskMode>("percent");
  const [riskValue, setRiskValue] = useState("1");
  const [balance, setBalance] = useState("");
  const [accountId, setAccountId] = useState("");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tps, setTps] = useState<string[]>([""]);
  const [quoteRate, setQuoteRate] = useState("");
  const [priceBusy, setPriceBusy] = useState(false);
  const [priceMsg, setPriceMsg] = useState<string | null>(null);
  const [ui, setUi] = useState<UiMode>("advanced");
  const [pips, setPips] = useState("");
  const [lots, setLots] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const p = readPrefs();
    if (p.ui === "simple" || p.ui === "advanced") setUi(p.ui);
    if (p.mode) setMode(p.mode);
    if (p.riskValue) setRiskValue(p.riskValue);
    if (p.balance) setBalance(p.balance);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ui, mode, riskValue, balance })); } catch { /* بدون ذخیره */ }
  }, [ui, mode, riskValue, balance]);

  const active = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);
  // اولین حساب فعال خودکار انتخاب می‌شود تا موجودی از همان پر شود
  useEffect(() => {
    if (!accountId && active.length) {
      const a = active[0];
      setAccountId(a.id);
      setBalance(String(Math.round((a.summary?.balance ?? a.initialBalance) * 100) / 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  function pickAccount(id: string) {
    setAccountId(id);
    const a = active.find((x) => x.id === id);
    if (a) setBalance(String(Math.round((a.summary?.balance ?? a.initialBalance) * 100) / 100));
  }

  // نماد عوض شد، قیمت‌های قبلی بی‌معنی‌اند
  useEffect(() => { setEntry(""); setSl(""); setTps([""]); setPriceMsg(null); }, [symbol]);

  const useLivePrice = useCallback(async () => {
    const y = yahooSymbolFor(symbol);
    if (!y) { setPriceMsg(tr("برای این نماد قیمت لحظه‌ای نداریم", "No live price is available for this symbol")); return; }
    setPriceBusy(true);
    setPriceMsg(null);
    try {
      const r = await fetch(`/api/market/prices?symbols=${encodeURIComponent(y)}`);
      const d = r.ok ? await r.json() : null;
      const p = d?.quotes?.[0]?.price;
      if (typeof p === "number") setEntry(String(Number(p.toFixed(priceDecimals(symbol) + 1))));
      else setPriceMsg(tr("قیمت لحظه‌ای در دسترس نیست — دستی وارد کن", "Live price is unavailable. Enter it manually"));
    } catch {
      setPriceMsg(tr("قیمت لحظه‌ای در دسترس نیست — دستی وارد کن", "Live price is unavailable. Enter it manually"));
    } finally {
      setPriceBusy(false);
    }
  }, [symbol]);

  const cross = crossQuoteCurrency(symbol);
  const simpleQuote = nonUsdQuote(symbol);
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const inputKey = JSON.stringify(
    ui === "simple"
      ? [ui, symbol, pips, lots, balance, simpleQuote ? quoteRate : ""]
      : [ui, symbol, direction, balance, mode, riskValue, entry, sl, tps, quoteRate]
  );

  function calculate() {
    const base = { ui, key: inputKey, direction, entry: num(entry), sl: num(sl), symbol };
    if (ui === "simple") {
      setSnap({
        ...base, adv: null,
        simple: simplePipCalc({
          symbol, pips: num(pips), lots: num(lots), balance: num(balance),
          quoteRate: quoteRate ? Number(quoteRate) : null,
        }),
      });
    } else {
      setSnap({
        ...base, simple: null,
        adv: calcRisk({
          symbol, direction,
          balance: num(balance), mode, riskValue: num(riskValue),
          entry: num(entry), stopLoss: num(sl),
          takeProfits: tps.filter((t) => t.trim() !== "").map((t) => ({ price: Number(t) })),
          quoteToUsd: quoteRate ? Number(quoteRate) : null,
        }),
      });
    }
  }

  const shown = snap && snap.ui === ui ? snap : null;
  const stale = !!shown && shown.key !== inputKey;
  const advRes = shown?.adv ?? null;
  const ok: RiskResult | null = advRes && advRes.ok ? advRes : null;
  const simpleRes = shown?.simple ?? null;
  const sOk: SimplePipResult | null = simpleRes && simpleRes.ok ? simpleRes : null;
  const err = advRes && !advRes.ok ? advRes.error : simpleRes && !simpleRes.ok ? simpleRes.error : null;
  const isPoint = !!ok && ok.spec.unit === "point";
  const unit = isPoint ? tr("پوینت", "points") : tr("پیپ", "pips");
  const sUnit = sOk && sOk.spec.unit === "point" ? tr("پوینت", "point") : tr("پیپ", "pip");

  return (
    <div className={`rk-root${compact ? " rk-compact" : ""}`}>
      <div className="rk-form">
        <SegmentedTabs
          active={ui}
          onChange={setUi}
          options={[{ value: "simple" as const, label: tr("ساده", "Simple") }, { value: "advanced" as const, label: tr("پیشرفته", "Advanced") }]}
        />

        {!symbolProp && (
          <div>
            <label className="exercise-form-label">{tr("نماد", "Symbol")}</label>
            <select className="wsearch-newform-name trade-glass-field" value={symbol}
              onChange={(e) => setSymbolState(e.target.value)} aria-label={tr("نماد", "Symbol")}>
              {TRADE_PAIRS.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
            </select>
          </div>
        )}

        {symbolProp && ui === "simple" && (
          <div>
            <label className="exercise-form-label">{tr("نماد", "Symbol")}</label>
            <input className="wsearch-newform-name trade-glass-field" dir="ltr" value={symbol} readOnly aria-label={tr("نماد", "Symbol")} />
          </div>
        )}

        {ui === "advanced" && (
        <div>
          <label className="exercise-form-label">{tr("جهت", "Direction")}</label>
          <SegmentedTabs
            active={direction}
            onChange={setDirection}
            options={[{ value: "BUY" as const, label: tr("خرید (Buy)", "Buy") }, { value: "SELL" as const, label: tr("فروش (Sell)", "Sell") }]}
          />
        </div>
        )}

        {!!active.length && (
          <div>
            <label className="exercise-form-label">{tr("حساب (برای پر شدن موجودی)", "Account (to fill in the balance)")}</label>
            <select className="wsearch-newform-name trade-glass-field" value={accountId}
              onChange={(e) => pickAccount(e.target.value)} aria-label={tr("حساب", "Account")}>
              <option value="">{tr("دستی", "Manual")}</option>
              {active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {ui === "simple" && (
          <>
            <div className="rk-row">
              <div>
                <label className="exercise-form-label">{symbolSpec(symbol).unit === "point" ? tr("تعداد پوینت", "Number of points") : tr("تعداد پیپ", "Number of pips")}</label>
                <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                  value={pips} onChange={setPips} placeholder="10" aria-label={tr("تعداد پیپ", "Number of pips")} />
              </div>
              <div>
                <label className="exercise-form-label">{tr("حجم (لات)", "Volume (lots)")}</label>
                <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                  value={lots} onChange={setLots} placeholder="0.10" aria-label={tr("حجم", "Volume")} />
              </div>
            </div>
            <div>
              <label className="exercise-form-label">{tr("موجودی حساب (دلار) — اختیاری", "Account balance (USD) — optional")}</label>
              <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                value={balance} onChange={setBalance} placeholder="10000" />
            </div>
            {simpleQuote && (
              <div>
                <label className="exercise-form-label">{tr(`هر 1 ${simpleQuote} چند دلار است؟ (اختیاری)`, `How many USD is 1 ${simpleQuote}? (optional)`)}</label>
                <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                  value={quoteRate} onChange={setQuoteRate} placeholder={tr("مثلا 0.0067", "e.g. 0.0067")} />
              </div>
            )}
          </>
        )}

        {ui === "advanced" && (<>
        <div className="rk-row">
          <div>
            <label className="exercise-form-label">{tr("موجودی حساب (دلار)", "Account balance (USD)")}</label>
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              value={balance} onChange={setBalance} placeholder="10000" />
          </div>
          <div>
            <label className="exercise-form-label">{tr("ریسک", "Risk")}</label>
            <div className="rk-risk-row">
              <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                value={riskValue} onChange={setRiskValue} placeholder={mode === "percent" ? "1" : "100"} />
              <SegmentedTabs
                active={mode}
                onChange={setMode}
                options={[{ value: "percent" as const, label: tr("درصد", "Percent") }, { value: "amount" as const, label: tr("دلار", "USD") }]}
              />
            </div>
          </div>
        </div>

        <div className="rk-row">
          <div>
            <label className="exercise-form-label">{tr("قیمت ورود", "Entry price")}</label>
            <div className="rk-entry-row">
              <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                value={entry} onChange={setEntry} placeholder="0.00000" />
              <button type="button" className="account-outline-btn rk-live-btn" onClick={useLivePrice}
                disabled={priceBusy} title={tr("قیمت لحظه‌ای", "Live price")} aria-label={tr("قیمت لحظه‌ای", "Live price")}>
                {priceBusy ? <Spinner size={14} /> : <Crosshair size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="exercise-form-label">{tr("حد ضرر (SL)", "Stop loss (SL)")}</label>
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              value={sl} onChange={setSl} placeholder="0.00000" />
          </div>
        </div>
        {priceMsg && <div className="rk-note">{priceMsg}</div>}

        <div>
          <label className="exercise-form-label">{tr("حد سود (TP) — اختیاری", "Take profit (TP) — optional")}</label>
          <div className="rk-tps">
            {tps.map((t, i) => (
              <div key={i} className="rk-tp-row">
                <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                  value={t} onChange={(v) => setTps((p) => p.map((x, j) => (j === i ? v : x)))}
                  placeholder={`TP${i + 1}`} aria-label={tr(`حد سود ${i + 1}`, `Take profit ${i + 1}`)} />
                {tps.length > 1 && (
                  <button type="button" className="trade-icon-btn" aria-label={tr("حذف هدف", "Remove target")}
                    onClick={() => setTps((p) => p.filter((_, j) => j !== i))}><X size={15} /></button>
                )}
              </div>
            ))}
            {tps.length < MAX_TPS && (
              <button type="button" className="account-outline-btn rk-add-tp" onClick={() => setTps((p) => [...p, ""])}>
                <Plus size={14} /> {tr("هدف دیگر", "Another target")}
              </button>
            )}
          </div>
        </div>

        {cross && (
          <div>
            <label className="exercise-form-label">{tr(`هر 1 ${cross} چند دلار است؟ (اختیاری)`, `How many USD is 1 ${cross}? (optional)`)}</label>
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              value={quoteRate} onChange={setQuoteRate} placeholder={tr("مثلا 0.0067", "e.g. 0.0067")} />
          </div>
        )}
        </>)}

        <button type="button" className="trade-primary-btn rk-calc-btn" onClick={calculate}>{tr("محاسبه", "Calculate")}</button>
      </div>

      <div className="rk-out">
        {!shown && <div className="rk-note">{tr("مقادیر را وارد کن و محاسبه را بزن.", "Enter the values and press Calculate.")}</div>}
        {err && <div className="trade-form-error rk-error" role="alert">{err}</div>}
        {stale && (ok || sOk) && <div className="rk-note rk-stale-note">{tr("برای به‌روزرسانی دوباره محاسبه را بزن", "Press Calculate again to update")}</div>}

        {sOk && (
          <div className={stale ? "rk-stale" : undefined}>
            <div className="rk-tiles">
              <Tile label={tr(`ارزش هر ${sUnit} برای 1 لات (دلار)`, `Value per ${sUnit} for 1 lot (USD)`)} value={<Ltr>{fmtNum(sOk.pipValuePerLot, 3)}</Ltr>} />
              <Tile label={tr("ارزش هر پیپ برای حجم شما (دلار)", "Pip value for your volume (USD)")} value={<Ltr>{fmtNum(sOk.pipValueForLots, 3)}</Ltr>} />
              <Tile label={tr("مبلغ کل (دلار)", "Total amount (USD)")} value={<Ltr>{fmtNum(sOk.total, 2)}</Ltr>} strong />
              <Tile label={tr("درصد از موجودی", "Percent of balance")} value={sOk.percent === null ? "—" : <Ltr>{fmtNum(sOk.percent, 2)}%</Ltr>} />
            </div>
            {sOk.approxQuoteRate && <div className="rk-warn">{tr("نرخ تبدیل ارز دوم تقریبی است — برای عدد دقیق‌تر نرخ را وارد کن", "The conversion rate of the second currency is approximate. Enter the rate for a more accurate number")}</div>}
          </div>
        )}

        {ok && (
          <div className={`rk-res${stale ? " rk-stale" : ""}`}>
            <div className="rk-tiles">
              <Tile label={tr(`فاصله‌ی حد ضرر (${unit})`, `Stop loss distance (${unit})`)} value={<Ltr>{fmtNum(ok.slPips, 1)}</Ltr>} />
              <Tile label={tr("حجم (لات)", "Volume (lots)")} value={<Ltr>{fmtNum(ok.lots, 2)}</Ltr>} strong />
              <Tile label={tr("ریسک (دلار)", "Risk (USD)")} value={<Ltr>-{fmtNum(ok.riskAmount, 2)}</Ltr>} tone="loss" />
              <Tile label={tr("سود احتمالی (دلار)", "Potential profit (USD)")} value={ok.tps.length ? <Ltr>+{fmtNum(ok.totalProfit, 2)}</Ltr> : "—"} tone={ok.tps.length ? "win" : undefined} />
              <Tile label={tr("ریسک به سود", "Risk to reward")} value={ok.rr === null ? "—" : <Ltr>1 : {fmtNum(ok.rr, 2)}</Ltr>} />
              <Tile label={tr("حداقل درصد برد", "Minimum win rate")} value={ok.breakevenWinRate === null ? "—" : <Ltr>{fmtNum(ok.breakevenWinRate * 100, 1)}%</Ltr>} />
            </div>
            {ok.tps.length > 1 && (
              <div className="rk-tp-list">
                {ok.tps.map((t, i) => (
                  <div key={i} className="rk-tp-item">
                    <span>TP{i + 1}</span>
                    <Ltr>{fmtNum(t.pips, 1)} {unit} · 1:{fmtNum(t.rr, 2)} · +{fmtNum(t.profit, 2)}$</Ltr>
                  </div>
                ))}
              </div>
            )}
            <div className="rk-note">{tr(`ارزش هر ${unit} برای 1 لات:`, `Value per ${unit.replace(/s$/, "")} for 1 lot:`)} <Ltr>{fmtNum(ok.pipValue, 3)}$</Ltr></div>
            {ok.warnings.map((w) => <div key={w} className="rk-warn">{w}</div>)}
            <RiskVisual res={ok} direction={shown!.direction} entry={shown!.entry} sl={shown!.sl} isPoint={isPoint} dec={priceDecimals(shown!.symbol)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, tone, strong }: { label: string; value: React.ReactNode; tone?: "win" | "loss"; strong?: boolean }) {
  return (
    <div className={`trade-stat-tile rk-tile${tone ? ` ${tone}` : ""}${strong ? " strong" : ""}`}>
      <div className="rk-tile-label">{label}</div>
      <div className="rk-tile-value">{value}</div>
    </div>
  );
}

/** نمای عمودی ورود/SL/TP شبیه ابزار پوزیشن تریدینگ‌ویو: بالا قیمت بیشتر */
function RiskVisual({ res, direction, entry, sl, isPoint, dec }: {
  res: RiskResult; direction: RiskDirection; entry: number; sl: number; isPoint: boolean; dec: number;
}) {
  const unitEn = isPoint ? "pt" : "pips";
  const W = 260, H = 220, top = 14, bot = 14, x0 = 8, x1 = 150;
  const prices = [entry, sl, ...res.tps.map((t) => t.price)];
  const hi = Math.max(...prices), lo = Math.min(...prices);
  const span = hi - lo || 1;
  const y = (p: number) => top + ((hi - p) / span) * (H - top - bot);
  const fmtP = (p: number) => p.toFixed(dec);
  const lines: { p: number; label: string; sub: string; color: string }[] = [
    { p: entry, label: `Entry ${fmtP(entry)}`, sub: "", color: "var(--muted)" },
    { p: sl, label: `SL ${fmtP(sl)}`, sub: `${fmtNum(res.slPips, 1)} ${unitEn} · -${fmtNum(res.riskAmount, 2)}$`, color: "var(--pnl-loss)" },
    ...res.tps.map((t, i) => ({
      p: t.price, label: `TP${res.tps.length > 1 ? i + 1 : ""} ${fmtP(t.price)}`,
      sub: `${fmtNum(t.pips, 1)} ${unitEn} · +${fmtNum(t.profit, 2)}$`, color: "var(--pnl-win)",
    })),
  ];
  const tpFar = res.tps.length ? (direction === "BUY" ? Math.max(...res.tps.map((t) => t.price)) : Math.min(...res.tps.map((t) => t.price))) : null;
  return (
    <svg className="rk-visual" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr("نمای ورود، حد ضرر و حد سود", "Entry, stop loss and take profit view")} style={{ direction: "ltr" }}>
      {tpFar !== null && (
        <rect x={x0} y={Math.min(y(entry), y(tpFar))} width={x1 - x0} height={Math.abs(y(entry) - y(tpFar))}
          fill="var(--pnl-win)" fillOpacity=".22" />
      )}
      <rect x={x0} y={Math.min(y(entry), y(sl))} width={x1 - x0} height={Math.abs(y(entry) - y(sl))}
        fill="var(--pnl-loss)" fillOpacity=".22" />
      {lines.map((l, i) => (
        <g key={i}>
          <line x1={x0} x2={x1} y1={y(l.p)} y2={y(l.p)} stroke={l.color} strokeWidth="1.5" />
          <text x={x1 + 6} y={y(l.p) + (l.sub ? -1 : 4)} fontSize="10.5" fontWeight="700" fill="currentColor">{l.label}</text>
          {l.sub && <text x={x1 + 6} y={y(l.p) + 11} fontSize="9" fill="currentColor" opacity=".65">{l.sub}</text>}
        </g>
      ))}
    </svg>
  );
}
