"use client";

import { useEffect, useState } from "react";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { calcLotByPips, LOT_SYMBOLS, lotSymbolLabel, needsPrice, type LotResult } from "@/lib/lotTool";
import { fmtNum } from "@/lib/riskCalc";
import { tr } from "@/lib/i18n";

const LS_KEY = "arion:tool:lot";
type Mode = "percent" | "amount";

function Ltr({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr" className="tl-ltr">{children}</bdi>;
}

export function ToolLotSizeCalculator() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [balance, setBalance] = useState("");
  const [mode, setMode] = useState<Mode>("percent");
  const [riskValue, setRiskValue] = useState("1");
  const [sl, setSl] = useState("");
  const [price, setPrice] = useState("");
  const [res, setRes] = useState<LotResult | null>(null);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
      if (LOT_SYMBOLS.some((s) => s.code === p.symbol)) setSymbol(p.symbol);
      if (typeof p.balance === "string") setBalance(p.balance);
      if (p.mode === "percent" || p.mode === "amount") setMode(p.mode);
      if (typeof p.riskValue === "string") setRiskValue(p.riskValue);
      if (typeof p.sl === "string") setSl(p.sl);
    } catch { /* نادیده */ }
  }, []);

  function calculate(e?: React.FormEvent) {
    e?.preventDefault();
    setRes(calcLotByPips({
      symbol, balance: Number(balance), mode, riskValue: Number(riskValue), slPips: Number(sl),
      price: price ? Number(price) : null,
    }));
    try { localStorage.setItem(LS_KEY, JSON.stringify({ symbol, balance, mode, riskValue, sl })); } catch { /* نادیده */ }
  }

  const ok = res && res.ok ? res : null;
  const unitFa = tr("پیپ", "pips");
  return (
    <form className="tl-calc" onSubmit={calculate} noValidate>
      <div className="tl-form">
        <div>
          <label className="exercise-form-label" htmlFor="tl-lot-sym">{tr("نماد", "Symbol")}</label>
          <select id="tl-lot-sym" className="wsearch-newform-name trade-glass-field" value={symbol}
            onChange={(e) => { setSymbol(e.target.value); setRes(null); }}>
            {LOT_SYMBOLS.map((s) => <option key={s.code} value={s.code}>{lotSymbolLabel(s)}</option>)}
          </select>
        </div>
        <div className="tl-row">
          <div>
            <label className="exercise-form-label" htmlFor="tl-lot-bal">{tr("موجودی حساب (دلار)", "Account balance ($)")}</label>
            <NumberInput id="tl-lot-bal" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={balance} onChange={setBalance} placeholder="10000" />
          </div>
          <div>
            <label className="exercise-form-label" htmlFor="tl-lot-sl">{tr("حد ضرر", "Stop loss")} ({unitFa})</label>
            <NumberInput id="tl-lot-sl" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={sl} onChange={setSl} placeholder="20" />
          </div>
        </div>
        <div>
          <span className="exercise-form-label">{tr("ریسک هر معامله", "Risk per trade")}</span>
          <SegmentedTabs<Mode>
            active={mode}
            onChange={(m) => { setMode(m); setRiskValue(m === "percent" ? "1" : "100"); }}
            ariaLabel={tr("نوع ریسک", "Risk type")}
            options={[{ value: "percent", label: tr("درصد از موجودی", "% of balance") }, { value: "amount", label: tr("مبلغ ثابت (دلار)", "Fixed amount ($)") }]}
          />
          <NumberInput decimal dir="ltr" className="wsearch-newform-name trade-glass-field" style={{ marginTop: 8 }}
            value={riskValue} onChange={setRiskValue} placeholder={mode === "percent" ? "1" : "100"}
            aria-label={mode === "percent" ? tr("درصد ریسک", "Risk percentage") : tr("مبلغ ریسک به دلار", "Risk amount in dollars")} />
        </div>
        {needsPrice(symbol) && (
          <div>
            <label className="exercise-form-label" htmlFor="tl-lot-price">{tr("قیمت فعلی", "Current price of")} {symbol} {tr("(اختیاری، برای دقت بیشتر)", "(optional, for better accuracy)")}</label>
            <NumberInput id="tl-lot-price" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={price} onChange={setPrice} placeholder={symbol === "USDJPY" ? "150.00" : "1.0000"} />
          </div>
        )}
        {res && !res.ok && <div className="trade-form-error" role="alert">{res.error}</div>}
        <button type="submit" className="trade-primary-btn tl-btn">{tr("محاسبه", "Calculate")}</button>
      </div>

      <div className="tl-out" aria-live="polite">
        {!ok && <p className="tl-note">{tr("اطلاعات را وارد کن و روی محاسبه بزن. ارز حساب دلار فرض شده است.", "Enter the details, then press Calculate. The account currency is assumed to be USD.")}</p>}
        {ok && (
          <div className="tl-fade" key={`${ok.lots}-${ok.riskWanted}`}>
            <div className="tl-tiles">
              <div className="trade-stat-tile tl-tile strong wide">
                <div className="tl-tile-label">{tr("حجم پیشنهادی (لات)", "Suggested size (lots)")}</div>
                <div className="tl-tile-value"><Ltr>{ok.belowMin ? "0.00" : fmtNum(ok.lots, 2)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">{tr("ریسک واقعی (دلار)", "Actual risk ($)")}</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.riskActual, 2)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">{tr("ارزش هر پیپ برای 1 لات (دلار)", "Value per pip for 1 lot ($)")}</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.pipValue, 2)}</Ltr></div>
              </div>
            </div>
            {ok.belowMin && <p className="tl-warn" style={{ marginTop: 10 }}>{tr("با این ریسک و حد ضرر، حجم از حداقل رایج (0.01 لات) کمتر می‌شود؛ ریسک یا حد ضرر را تغییر بده.", "With this risk and stop loss the size falls below the usual minimum (0.01 lot); change the risk or the stop loss.")}</p>}
            {ok.approx && <p className="tl-warn" style={{ marginTop: 10 }}>{tr("قیمت وارد نشده و از قیمت تقریبی استفاده شد؛ برای عدد دقیق‌تر قیمت فعلی را بنویس.", "No price was entered so an approximate price was used; enter the current price for a more accurate number.")}</p>}
            <p className="tl-note" style={{ marginTop: 10 }}>
              {tr("اندازه‌ی قرارداد و تعریف پیپ در بروکرها فرق دارد؛ قبل از ورود، عدد را با ماشین‌حساب بروکر خودت چک کن. کمیسیون، اسپرد و سواپ حساب نشده‌اند.", "Contract size and pip definition differ between brokers; check the number with your own broker's calculator before entering. Commission, spread and swap are not included.")}
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
