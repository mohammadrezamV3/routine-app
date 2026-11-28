"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { Spinner } from "./Spinner";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import type { TradeAccount } from "@/lib/tradeTypes";
import { fmtNum, positionSize, priceDecimals, symbolSpec, yahooSymbolFor } from "@/lib/riskCalc";
import { tr } from "@/lib/i18n";
import "./risk-calc.css";

// کلید و شکل ذخیره با داشبورد (DashboardTradeTools) مشترکه: mode + riskValue
const LS_KEY = "arion:riskCalc";
const RISK_CHIPS = ["0.5", "1", "1.5", "2"] as const;
const RR_OPTIONS = ["1", "2", "3"] as const;

type SlMode = "pips" | "price";

function readPrefs(): { riskValue?: string; balance?: string; rr?: string } {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; } catch { return {}; }
}

/** عدد همیشه چپ‌به‌راست تا در متن فارسی جابه‌جا نشود */
function Ltr({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr" className="rk-ltr">{children}</bdi>;
}

/**
 * ماشین‌حساب حجم پوزیشن: موجودی، درصد ریسک و حد ضرر را می‌دهی، لات و مبلغ
 * ریسک همان لحظه می‌آید. هم صفحه‌ی /trade/risk و هم پنل داخل چارت از همین
 * استفاده می‌کنند؛ اگر `symbol` از بیرون بیاید (چارت)، نماد از همان پیروی می‌کند.
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
  const [balance, setBalance] = useState("");
  const [accountId, setAccountId] = useState("");
  const [riskValue, setRiskValue] = useState("1");
  const [slMode, setSlMode] = useState<SlMode>("pips");
  const [pips, setPips] = useState("");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [rr, setRr] = useState<string>("2");
  const [pipOverride, setPipOverride] = useState("");
  const [priceBusy, setPriceBusy] = useState(false);
  const [priceMsg, setPriceMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = readPrefs();
    if (p.riskValue) setRiskValue(p.riskValue);
    if (p.balance) setBalance(p.balance);
    if (p.rr && (RR_OPTIONS as readonly string[]).includes(p.rr)) setRr(p.rr);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ mode: "percent", riskValue, balance, rr })); } catch { /* بدون ذخیره */ }
  }, [riskValue, balance, rr]);

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

  // نماد عوض شد، قیمت‌ها و ارزش پیپ دستی قبلی بی‌معنی‌اند
  useEffect(() => { setEntry(""); setSl(""); setPipOverride(""); setPriceMsg(null); }, [symbol]);

  const useLivePrice = useCallback(async () => {
    const y = yahooSymbolFor(symbol);
    const fail = tr("قیمت لحظه‌ای در دسترس نیست — دستی وارد کن", "Live price is unavailable. Enter it manually");
    if (!y) { setPriceMsg(tr("برای این نماد قیمت لحظه‌ای نداریم", "No live price is available for this symbol")); return; }
    setPriceBusy(true);
    setPriceMsg(null);
    try {
      const r = await fetch(`/api/market/prices?symbols=${encodeURIComponent(y)}`);
      const d = r.ok ? await r.json() : null;
      const p = d?.quotes?.[0]?.price;
      if (typeof p === "number") setEntry(String(Number(p.toFixed(priceDecimals(symbol) + 1))));
      else setPriceMsg(fail);
    } catch {
      setPriceMsg(fail);
    } finally {
      setPriceBusy(false);
    }
  }, [symbol]);

  const spec = symbolSpec(symbol);
  const unit = spec.unit === "point" ? tr("پوینت", "points") : tr("پیپ", "pips");
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

  const slFilled = slMode === "pips" ? pips.trim() !== "" : entry.trim() !== "" && sl.trim() !== "";
  const ready = balance.trim() !== "" && riskValue.trim() !== "" && slFilled;
  const res = useMemo(() => {
    if (!ready) return null;
    return positionSize({
      symbol, balance: num(balance), riskPercent: num(riskValue),
      slPips: slMode === "pips" ? num(pips) : null,
      entry: entry.trim() !== "" ? num(entry) : null,
      stopLoss: slMode === "price" ? num(sl) : null,
      pipValueOverride: pipOverride.trim() !== "" ? num(pipOverride) : null,
      rewardRatios: [Number(rr)],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, symbol, balance, riskValue, slMode, pips, entry, sl, pipOverride, rr]);
  const ok = res && res.ok ? res : null;
  const err = res && !res.ok ? res.error : null;
  const reward = ok?.rewards[0] ?? null;
  const dec = priceDecimals(symbol);

  return (
    <div className={`rk-root${compact ? " rk-compact" : ""}`}>
      <div className="rk-form">
        {!symbolProp ? (
          <div>
            <label className="exercise-form-label">{tr("نماد", "Symbol")}</label>
            <select className="wsearch-newform-name trade-glass-field" value={symbol}
              onChange={(e) => setSymbolState(e.target.value)} aria-label={tr("نماد", "Symbol")}>
              {TRADE_PAIRS.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="exercise-form-label">{tr("نماد", "Symbol")}</label>
            <input className="wsearch-newform-name trade-glass-field" dir="ltr" value={symbol} readOnly aria-label={tr("نماد", "Symbol")} />
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

        <div>
          <label className="exercise-form-label">{tr("موجودی حساب (دلار)", "Account balance (USD)")}</label>
          <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
            limit="accountBalance" value={balance} onChange={setBalance} placeholder="10000"
            aria-label={tr("موجودی حساب", "Account balance")} />
        </div>

        <div>
          <label className="exercise-form-label">{tr("ریسک (درصد از موجودی)", "Risk (% of balance)")}</label>
          <div className="rk-risk-row">
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              limit="riskPercent" value={riskValue} onChange={setRiskValue} placeholder="1"
              aria-label={tr("درصد ریسک", "Risk percent")} />
            <SegmentedTabs
              active={(RISK_CHIPS as readonly string[]).includes(riskValue) ? riskValue : null}
              onChange={setRiskValue}
              options={RISK_CHIPS.map((v) => ({ value: v, label: `${v}%` }))}
            />
          </div>
        </div>

        <div>
          <label className="exercise-form-label">{tr("حد ضرر", "Stop loss")}</label>
          <div className="rk-sl-block">
            <SegmentedTabs
              active={slMode}
              onChange={setSlMode}
              options={[
                { value: "pips" as const, label: spec.unit === "point" ? tr("پوینت", "Points") : tr("پیپ", "Pips") },
                { value: "price" as const, label: tr("قیمت ورود و SL", "Entry & SL price") },
              ]}
            />
            {slMode === "pips" ? (
              <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                limit="pips" value={pips} onChange={setPips} placeholder="30"
                aria-label={tr("فاصله‌ی حد ضرر", "Stop loss distance")} />
            ) : (
              <div className="rk-row">
                <div className="rk-entry-row">
                  <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                    limit="tradePrice" value={entry} onChange={setEntry} placeholder={tr("ورود", "Entry")}
                    aria-label={tr("قیمت ورود", "Entry price")} />
                  <button type="button" className="btn btn-outline btn-icon btn-sm" onClick={useLivePrice}
                    disabled={priceBusy} title={tr("قیمت لحظه‌ای", "Live price")} aria-label={tr("قیمت لحظه‌ای", "Live price")}>
                    {priceBusy ? <Spinner size={14} /> : <Crosshair size={15} />}
                  </button>
                </div>
                <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
                  limit="tradePrice" value={sl} onChange={setSl} placeholder="SL"
                  aria-label={tr("قیمت حد ضرر", "Stop loss price")} />
              </div>
            )}
            {priceMsg && <div className="rk-note">{priceMsg}</div>}
          </div>
        </div>

        <details className="rk-more">
          <summary>{tr("ارزش پیپ (اختیاری)", "Pip value (optional)")}</summary>
          <div className="rk-more-body">
            <NumberInput decimal className="wsearch-newform-name trade-glass-field" dir="ltr"
              limit="quoteRate" value={pipOverride} onChange={setPipOverride}
              placeholder={ok ? fmtNum(ok.pipValue, 3) : "10"}
              aria-label={tr("ارزش هر پیپ برای 1 لات (دلار)", "Value per pip for 1 lot (USD)")} />
            <div className="rk-note">{tr("حساب دلاری فرض می‌شود. اگر حسابت ارز دیگری دارد یا بروکرت عدد متفاوتی می‌دهد، ارزش هر پیپ برای 1 لات را به دلار وارد کن.", "A USD account is assumed. If your account uses another currency or your broker differs, enter the value per pip for 1 lot in USD.")}</div>
          </div>
        </details>
      </div>

      <div className="rk-out" aria-live="polite">
        {!ok && !err && <div className="rk-note">{tr("موجودی، درصد ریسک و حد ضرر را وارد کن؛ حجم همین‌جا ظاهر می‌شود.", "Enter balance, risk % and stop loss. The lot size appears here.")}</div>}
        {err && <div className="trade-form-error rk-error" role="alert">{err}</div>}
        {ok && (
          <div className="rk-res">
            <div className="trade-stat-tile rk-hero">
              <div className="rk-tile-label">{tr("حجم پوزیشن (لات)", "Position size (lots)")}</div>
              <div className="rk-hero-value" data-testid="rk-lots"><Ltr>{ok.lots.toFixed(2)}</Ltr></div>
            </div>
            <div className="rk-tiles">
              <div className="trade-stat-tile rk-tile loss">
                <div className="rk-tile-label">{tr("مبلغ ریسک (دلار)", "Amount at risk (USD)")}</div>
                <div className="rk-tile-value" data-testid="rk-risk"><Ltr>{fmtNum(ok.riskAmount, 2)}</Ltr></div>
              </div>
              <div className="trade-stat-tile rk-tile">
                <div className="rk-tile-label">{tr(`فاصله‌ی حد ضرر (${unit})`, `Stop loss distance (${unit})`)}</div>
                <div className="rk-tile-value"><Ltr>{fmtNum(ok.slPips, 1)}</Ltr></div>
              </div>
            </div>
            <div className="rk-rr">
              <span className="rk-note">{tr("هدف با ریسک به سود", "Target at reward ratio")}</span>
              <SegmentedTabs active={rr} onChange={setRr} options={RR_OPTIONS.map((v) => ({ value: v, label: `1:${v}` }))} />
            </div>
            {reward && (
              <div className="rk-note" data-testid="rk-reward">
                {tr("سود احتمالی", "Potential profit")} <Ltr>+{fmtNum(reward.profit, 2)} USD</Ltr>
                {" · "}<Ltr>{fmtNum(reward.pips, 1)} {spec.unit === "point" ? "pt" : "pips"}</Ltr>
                {reward.price !== null && <>{" · TP "}<Ltr>{reward.price.toFixed(dec)}</Ltr></>}
              </div>
            )}
            <div className="rk-note">{tr("ارزش هر پیپ برای 1 لات:", "Value per pip for 1 lot:")} <Ltr>{fmtNum(ok.pipValue, 3)} USD</Ltr></div>
            {ok.warnings.map((w) => <div key={w} className="rk-warn">{w}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
