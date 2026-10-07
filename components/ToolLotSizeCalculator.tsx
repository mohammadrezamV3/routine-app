"use client";

import { useEffect, useState } from "react";
import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { calcLotByPips, LOT_SYMBOLS, needsPrice, type LotResult } from "@/lib/lotTool";
import { fmtNum } from "@/lib/riskCalc";

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
  const unitFa = "پیپ";
  return (
    <form className="tl-calc" onSubmit={calculate} noValidate>
      <div className="tl-form">
        <div>
          <label className="exercise-form-label" htmlFor="tl-lot-sym">نماد</label>
          <select id="tl-lot-sym" className="wsearch-newform-name trade-glass-field" value={symbol}
            onChange={(e) => { setSymbol(e.target.value); setRes(null); }}>
            {LOT_SYMBOLS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        </div>
        <div className="tl-row">
          <div>
            <label className="exercise-form-label" htmlFor="tl-lot-bal">موجودی حساب (دلار)</label>
            <NumberInput id="tl-lot-bal" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={balance} onChange={setBalance} placeholder="10000" />
          </div>
          <div>
            <label className="exercise-form-label" htmlFor="tl-lot-sl">حد ضرر ({unitFa})</label>
            <NumberInput id="tl-lot-sl" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={sl} onChange={setSl} placeholder="20" />
          </div>
        </div>
        <div>
          <span className="exercise-form-label">ریسک هر معامله</span>
          <SegmentedTabs<Mode>
            active={mode}
            onChange={(m) => { setMode(m); setRiskValue(m === "percent" ? "1" : "100"); }}
            ariaLabel="نوع ریسک"
            options={[{ value: "percent", label: "درصد از موجودی" }, { value: "amount", label: "مبلغ ثابت (دلار)" }]}
          />
          <NumberInput decimal dir="ltr" className="wsearch-newform-name trade-glass-field" style={{ marginTop: 8 }}
            value={riskValue} onChange={setRiskValue} placeholder={mode === "percent" ? "1" : "100"}
            aria-label={mode === "percent" ? "درصد ریسک" : "مبلغ ریسک به دلار"} />
        </div>
        {needsPrice(symbol) && (
          <div>
            <label className="exercise-form-label" htmlFor="tl-lot-price">قیمت فعلی {symbol} (اختیاری، برای دقت بیشتر)</label>
            <NumberInput id="tl-lot-price" decimal dir="ltr" className="wsearch-newform-name trade-glass-field"
              value={price} onChange={setPrice} placeholder={symbol === "USDJPY" ? "150.00" : "1.0000"} />
          </div>
        )}
        {res && !res.ok && <div className="trade-form-error" role="alert">{res.error}</div>}
        <button type="submit" className="trade-primary-btn tl-btn">محاسبه</button>
      </div>

      <div className="tl-out" aria-live="polite">
        {!ok && <p className="tl-note">اطلاعات را وارد کن و روی محاسبه بزن. ارز حساب دلار فرض شده است.</p>}
        {ok && (
          <div className="tl-fade" key={`${ok.lots}-${ok.riskWanted}`}>
            <div className="tl-tiles">
              <div className="trade-stat-tile tl-tile strong wide">
                <div className="tl-tile-label">حجم پیشنهادی (لات)</div>
                <div className="tl-tile-value"><Ltr>{ok.belowMin ? "0.00" : fmtNum(ok.lots, 2)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">ریسک واقعی (دلار)</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.riskActual, 2)}</Ltr></div>
              </div>
              <div className="trade-stat-tile tl-tile">
                <div className="tl-tile-label">ارزش هر پیپ برای 1 لات (دلار)</div>
                <div className="tl-tile-value"><Ltr>{fmtNum(ok.pipValue, 2)}</Ltr></div>
              </div>
            </div>
            {ok.belowMin && <p className="tl-warn" style={{ marginTop: 10 }}>با این ریسک و حد ضرر، حجم از حداقل رایج (0.01 لات) کمتر می‌شود؛ ریسک یا حد ضرر را تغییر بده.</p>}
            {ok.approx && <p className="tl-warn" style={{ marginTop: 10 }}>قیمت وارد نشده و از قیمت تقریبی استفاده شد؛ برای عدد دقیق‌تر قیمت فعلی را بنویس.</p>}
            <p className="tl-note" style={{ marginTop: 10 }}>
              اندازه‌ی قرارداد و تعریف پیپ در بروکرها فرق دارد؛ قبل از ورود، عدد را با ماشین‌حساب بروکر خودت چک کن. کمیسیون، اسپرد و سواپ حساب نشده‌اند.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
