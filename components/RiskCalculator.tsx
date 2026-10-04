"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair, Plus, X } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { Spinner } from "./Spinner";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import type { TradeAccount } from "@/lib/tradeTypes";
import {
  calcRisk, crossQuoteCurrency, fmtNum, priceDecimals, yahooSymbolFor,
  type RiskDirection, type RiskMode, type RiskResult,
} from "@/lib/riskCalc";
import "./risk-calc.css";

const LS_KEY = "arion:riskCalc";
const MAX_TPS = 3;

function readPrefs(): { mode?: RiskMode; riskValue?: string; balance?: string } {
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

  useEffect(() => {
    const p = readPrefs();
    if (p.mode) setMode(p.mode);
    if (p.riskValue) setRiskValue(p.riskValue);
    if (p.balance) setBalance(p.balance);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ mode, riskValue, balance })); } catch { /* بدون ذخیره */ }
  }, [mode, riskValue, balance]);

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
    if (!y) { setPriceMsg("برای این نماد قیمت لحظه‌ای نداریم"); return; }
    setPriceBusy(true);
    setPriceMsg(null);
    try {
      const r = await fetch(`/api/market/prices?symbols=${encodeURIComponent(y)}`);
      const d = r.ok ? await r.json() : null;
      const p = d?.quotes?.[0]?.price;
      if (typeof p === "number") setEntry(String(Number(p.toFixed(priceDecimals(symbol) + 1))));
      else setPriceMsg("قیمت لحظه‌ای در دسترس نیست — دستی وارد کن");
    } catch {
      setPriceMsg("قیمت لحظه‌ای در دسترس نیست — دستی وارد کن");
    } finally {
      setPriceBusy(false);
    }
  }, [symbol]);

  const cross = crossQuoteCurrency(symbol);
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const touched = entry !== "" || sl !== "";
  const result = useMemo(
    () =>
      calcRisk({
        symbol, direction,
        balance: num(balance), mode, riskValue: num(riskValue),
        entry: num(entry), stopLoss: num(sl),
        takeProfits: tps.filter((t) => t.trim() !== "").map((t) => ({ price: Number(t) })),
        quoteToUsd: quoteRate ? Number(quoteRate) : null,
      }),
    [symbol, direction, balance, mode, riskValue, entry, sl, tps, quoteRate]
  );
  const ok: RiskResult | null = result.ok ? result : null;
  const unit = ok ? (ok.spec.unit === "point" ? "پوینت" : "پیپ") : "پیپ";

  return (
    <div className={`rk-root${compact ? " rk-compact" : ""}`}>
      <div className="rk-form">
        {!symbolProp && (
          <div>
            <label className="exercise-form-label">نماد</label>
            <select className="wsearch-newform-name trade-glass-field" value={symbol}
              onChange={(e) => setSymbolState(e.target.value)} aria-label="نماد">
              {TRADE_PAIRS.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="exercise-form-label">جهت</label>
          <SegmentedTabs
            active={direction}
            onChange={setDirection}
            options={[{ value: "BUY" as const, label: "خرید (Buy)" }, { value: "SELL" as const, label: "فروش (Sell)" }]}
          />
        </div>

        {!!active.length && (
          <div>
            <label className="exercise-form-label">حساب (برای پر شدن موجودی)</label>
            <select className="wsearch-newform-name trade-glass-field" value={accountId}
              onChange={(e) => pickAccount(e.target.value)} aria-label="حساب">
              <option value="">دستی</option>
              {active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        <div className="rk-row">
          <div>
            <label className="exercise-form-label">موجودی حساب (دلار)</label>
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              value={balance} onChange={setBalance} placeholder="10000" />
          </div>
          <div>
            <label className="exercise-form-label">ریسک</label>
            <div className="rk-risk-row">
              <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                value={riskValue} onChange={setRiskValue} placeholder={mode === "percent" ? "1" : "100"} />
              <SegmentedTabs
                active={mode}
                onChange={setMode}
                options={[{ value: "percent" as const, label: "درصد" }, { value: "amount" as const, label: "دلار" }]}
              />
            </div>
          </div>
        </div>

        <div className="rk-row">
          <div>
            <label className="exercise-form-label">قیمت ورود</label>
            <div className="rk-entry-row">
              <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                value={entry} onChange={setEntry} placeholder="0.00000" />
              <button type="button" className="account-outline-btn rk-live-btn" onClick={useLivePrice}
                disabled={priceBusy} title="قیمت لحظه‌ای" aria-label="قیمت لحظه‌ای">
                {priceBusy ? <Spinner size={14} /> : <Crosshair size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="exercise-form-label">حد ضرر (SL)</label>
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              value={sl} onChange={setSl} placeholder="0.00000" />
          </div>
        </div>
        {priceMsg && <div className="rk-note">{priceMsg}</div>}

        <div>
          <label className="exercise-form-label">حد سود (TP) — اختیاری</label>
          <div className="rk-tps">
            {tps.map((t, i) => (
              <div key={i} className="rk-tp-row">
                <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                  value={t} onChange={(v) => setTps((p) => p.map((x, j) => (j === i ? v : x)))}
                  placeholder={`TP${i + 1}`} aria-label={`حد سود ${i + 1}`} />
                {tps.length > 1 && (
                  <button type="button" className="trade-icon-btn" aria-label="حذف هدف"
                    onClick={() => setTps((p) => p.filter((_, j) => j !== i))}><X size={15} /></button>
                )}
              </div>
            ))}
            {tps.length < MAX_TPS && (
              <button type="button" className="account-outline-btn rk-add-tp" onClick={() => setTps((p) => [...p, ""])}>
                <Plus size={14} /> هدف دیگر
              </button>
            )}
          </div>
        </div>

        {cross && (
          <div>
            <label className="exercise-form-label">هر 1 {cross} چند دلار است؟ (اختیاری)</label>
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              value={quoteRate} onChange={setQuoteRate} placeholder="مثلا 0.0067" />
          </div>
        )}
      </div>

      <div className="rk-out">
        {!result.ok && touched && <div className="trade-form-error rk-error" role="alert">{result.error}</div>}
        {!result.ok && !touched && <div className="rk-note">قیمت ورود و حد ضرر را وارد کن تا نتیجه بیاید.</div>}

        {ok && (
          <>
            <div className="rk-tiles">
              <Tile label={`فاصله‌ی حد ضرر (${unit})`} value={<Ltr>{fmtNum(ok.slPips, 1)}</Ltr>} />
              <Tile label="حجم (لات)" value={<Ltr>{fmtNum(ok.lots, 2)}</Ltr>} strong />
              <Tile label="ریسک (دلار)" value={<Ltr>-{fmtNum(ok.riskAmount, 2)}</Ltr>} tone="loss" />
              <Tile label="سود احتمالی (دلار)" value={ok.tps.length ? <Ltr>+{fmtNum(ok.totalProfit, 2)}</Ltr> : "—"} tone={ok.tps.length ? "win" : undefined} />
              <Tile label="ریسک به سود" value={ok.rr === null ? "—" : <Ltr>1 : {fmtNum(ok.rr, 2)}</Ltr>} />
              <Tile label="حداقل درصد برد" value={ok.breakevenWinRate === null ? "—" : <Ltr>{fmtNum(ok.breakevenWinRate * 100, 1)}%</Ltr>} />
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
            <div className="rk-note">ارزش هر {unit} برای 1 لات: <Ltr>{fmtNum(ok.pipValue, 3)}$</Ltr></div>
            {ok.warnings.map((w) => <div key={w} className="rk-warn">{w}</div>)}
            <RiskVisual res={ok} direction={direction} entry={Number(entry)} sl={Number(sl)} unit={unit} dec={priceDecimals(symbol)} />
          </>
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
function RiskVisual({ res, direction, entry, sl, unit, dec }: {
  res: RiskResult; direction: RiskDirection; entry: number; sl: number; unit: string; dec: number;
}) {
  const unitEn = unit === "پوینت" ? "pt" : "pips";
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
    <svg className="rk-visual" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="نمای ورود، حد ضرر و حد سود" style={{ direction: "ltr" }}>
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
