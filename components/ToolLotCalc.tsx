"use client";

import { useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { fmtNum, nonUsdQuote, simplePipCalc, symbolSpec } from "@/lib/riskCalc";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import { numErr, toolNum } from "@/lib/toolInput";
import { tr } from "@/lib/i18n";

type Result = {
  sig: string;
  symbol: string;
  unit: "pip" | "point";
  balance: number;
  riskPct: number;
  riskAmount: number;
  pipValuePerLot: number;
  lotsExact: number;
  lots: number;
  realRisk: number;
  realPct: number | null;
  approx: boolean;
  quote: string | null;
};

// نمادهای پرکاربرد اول؛ بقیه‌ی فهرست استاندارد سایت بعدش
const TOP = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "USDCAD", "AUDUSD", "GBPJPY", "EURJPY", "US30", "BTCUSD"];

export function ToolLotCalc() {
  const [balance, setBalance] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [pips, setPips] = useState("");
  const [symbol, setSymbol] = useState("EURUSD");
  const [rate, setRate] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sig = [balance, riskPct, pips, symbol, rate].join("|");
  const quote = nonUsdQuote(symbol);
  const unit = symbolSpec(symbol).unit;

  const topPairs = TOP.map((c) => TRADE_PAIRS.find((p) => p.code === c)).filter((p): p is (typeof TRADE_PAIRS)[number] => !!p);
  const restPairs = TRADE_PAIRS.filter((p) => !TOP.includes(p.code));

  function calculate() {
    const err =
      numErr(balance, "accountBalance") || numErr(riskPct, "riskPercent") || numErr(pips, "pips") ||
      (rate.trim() ? numErr(rate, "quoteRate") : null);
    if (err) { setError(err); setRes(null); return; }
    const bal = toolNum(balance), rp = toolNum(riskPct), p = toolNum(pips);
    if (!(bal > 0)) { setError(tr("موجودی حساب را وارد کن", "Enter the account balance")); setRes(null); return; }
    const quoteRate = rate.trim() ? toolNum(rate) : null;
    // ارزش پیپ برای یک لات از همان منطق ماشین‌حساب ریسک سایت
    const one = simplePipCalc({ symbol, pips: p, lots: 1, quoteRate });
    if (!one.ok) { setError(one.error); setRes(null); return; }
    const riskAmount = (bal * rp) / 100;
    const lotsExact = riskAmount / (p * one.pipValuePerLot);
    const lots = Math.floor(lotsExact * 100 + 1e-9) / 100;
    const real = lots > 0 ? simplePipCalc({ symbol, pips: p, lots, quoteRate, balance: bal }) : null;
    setError(null);
    setRes({
      sig, symbol, unit: one.spec.unit, balance: bal, riskPct: rp, riskAmount,
      pipValuePerLot: one.pipValuePerLot, lotsExact, lots,
      realRisk: real && real.ok ? real.total : 0,
      realPct: real && real.ok ? real.percent : 0,
      approx: one.approxQuoteRate, quote: nonUsdQuote(symbol),
    });
  }

  const stale = !!res && res.sig !== sig;
  const unitWord = unit === "point" ? tr("پوینت", "points") : tr("پیپ", "pips");

  return (
    <div>
      <div className="stl-form">
        <div className="stl-field">
          <label className="stl-label" htmlFor="lot-balance">{tr("موجودی حساب (دلار)", "Account balance (USD)")}</label>
          <NumberInput id="lot-balance" className="wsearch-newform-name" dir="ltr" limit="accountBalance" value={balance} onChange={setBalance} placeholder="1000" />
        </div>
        <div className="stl-field">
          <label className="stl-label" htmlFor="lot-risk">{tr("ریسک هر معامله (درصد)", "Risk per trade (%)")}</label>
          <div className="stl-unit">
            <NumberInput id="lot-risk" className="wsearch-newform-name" dir="ltr" limit="riskPercent" value={riskPct} onChange={setRiskPct} placeholder="1" />
            <span>%</span>
          </div>
        </div>
        <div className="stl-field">
          <label className="stl-label" htmlFor="lot-symbol">{tr("نماد", "Symbol")}</label>
          <select id="lot-symbol" className="wsearch-newform-name stl-select" dir="ltr" value={symbol} onChange={(e) => { setSymbol(e.target.value); setRate(""); }}>
            {topPairs.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
            <option disabled>──────────</option>
            {restPairs.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
          </select>
        </div>
        <div className="stl-field">
          <label className="stl-label" htmlFor="lot-pips">{tr(`فاصله‌ی حد ضرر (${unitWord})`, `Stop-loss distance (${unitWord})`)}</label>
          <div className="stl-unit">
            <NumberInput id="lot-pips" className="wsearch-newform-name" dir="ltr" limit="pips" value={pips} onChange={setPips} placeholder="20" />
            <span>{unitWord}</span>
          </div>
        </div>
        {quote && (
          <div className="stl-field wide">
            <label className="stl-label" htmlFor="lot-rate">{tr(`نرخ ${quote} به دلار (اختیاری)`, `${quote} to USD rate (optional)`)}</label>
            <NumberInput id="lot-rate" className="wsearch-newform-name" dir="ltr" limit="quoteRate" value={rate} onChange={setRate} placeholder={tr("مثلا 0.0067", "e.g. 0.0067")} />
            <span className="stl-hint">
              {tr(`این نماد به ${quote} قیمت‌گذاری می‌شود. اگر نرخ را وارد نکنی، یک نرخ تقریبی استفاده می‌شود.`, `This symbol is priced in ${quote}. If you leave the rate empty, an approximate rate is used.`)}
            </span>
          </div>
        )}
      </div>

      <div className="stl-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={calculate}>{tr("محاسبه", "Calculate")}</button>
      </div>
      {error && <p className="stl-error" role="alert">{error}</p>}

      {res && (
        <div className={`stl-result${stale ? " stale" : ""}`} aria-live="polite">
          <div className="stl-tiles three">
            <div className="stl-tile strong">
              <div className="stl-tile-label">{tr("حجم لات پیشنهادی", "Suggested lot size")}</div>
              <div className="stl-tile-value"><span className="stl-ltr">{fmtNum(res.lots, 2)}</span> <small>{tr("لات", "lots")}</small></div>
              <div className="stl-tile-note">{tr(`مقدار دقیق: ${fmtNum(res.lotsExact, 4)}`, `Exact: ${fmtNum(res.lotsExact, 4)}`)}</div>
            </div>
            <div className="stl-tile">
              <div className="stl-tile-label">{tr("مبلغ ریسک", "Risk amount")}</div>
              <div className="stl-tile-value"><span className="stl-ltr">${fmtNum(res.riskAmount, 2)}</span></div>
              <div className="stl-tile-note">
                {tr(`${fmtNum(res.riskPct, 2)}٪ از ${fmtNum(res.balance, 2)} دلار`, `${fmtNum(res.riskPct, 2)}% of $${fmtNum(res.balance, 2)}`)}
              </div>
            </div>
            <div className="stl-tile">
              <div className="stl-tile-label">{tr(`ارزش هر ${res.unit === "point" ? "پوینت" : "پیپ"} برای 1 لات`, `Value of 1 ${res.unit} per 1 lot`)}</div>
              <div className="stl-tile-value"><span className="stl-ltr">${fmtNum(res.pipValuePerLot, 4)}</span></div>
            </div>
          </div>

          {res.lots > 0 ? (
            <p className="stl-note">
              {tr(
                `با ${fmtNum(res.lots, 2)} لات و حد ضرر ${fmtNum(toolNum(pips), 2)} ${unitWord}، اگر حد ضرر بخورد حدود $${fmtNum(res.realRisk, 2)}${res.realPct != null ? ` (${fmtNum(res.realPct, 2)}٪ موجودی)` : ""} از دست می‌دهی. حجم به پایین و تا دو رقم اعشار (حداقل لات رایج) گرد شده تا ریسک هیچ‌وقت از هدف بیشتر نشود. ${fmtNum(res.lots * 100, 0)} میکرولات یا ${fmtNum(res.lots * 10, 1)} مینی‌لات.`,
                `With ${fmtNum(res.lots, 2)} lots and a ${fmtNum(toolNum(pips), 2)} ${unitWord} stop, you lose about $${fmtNum(res.realRisk, 2)}${res.realPct != null ? ` (${fmtNum(res.realPct, 2)}% of balance)` : ""} if the stop is hit. The size is rounded down to two decimals (the usual minimum lot step) so risk never exceeds your target. That is ${fmtNum(res.lots * 100, 0)} micro lots or ${fmtNum(res.lots * 10, 1)} mini lots.`,
              )}
            </p>
          ) : (
            <p className="stl-warn">
              {tr(
                "حجم محاسبه‌شده از حداقل لات (0.01) کمتر است. حد ضرر را کوچک‌تر کن، درصد ریسک را بیشتر کن یا نماد دیگری انتخاب کن.",
                "The calculated size is below the minimum lot (0.01). Use a tighter stop, a higher risk percent, or another symbol.",
              )}
            </p>
          )}
          {res.approx && res.quote && (
            <p className="stl-warn">
              {tr(`نرخ ${res.quote} به دلار تقریبی بوده؛ برای عدد دقیق‌تر نرخ لحظه‌ای را وارد کن.`, `The ${res.quote} to USD rate was approximate; enter the live rate for a more exact figure.`)}
            </p>
          )}
          <p className="stl-note">
            {tr(
              "اندازه‌ی قرارداد بین بروکرها کمی فرق دارد (مثلا طلا یا شاخص‌ها). پیش از معامله‌ی واقعی با مشخصات نماد در پلتفرم خودت مقایسه کن. این ابزار آموزشی است و توصیه‌ی مالی نیست.",
              "Contract size differs slightly between brokers (for example gold or indices). Compare with your platform's symbol specification before a live trade. This tool is educational, not financial advice.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
