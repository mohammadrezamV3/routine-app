"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, RotateCcw, ArrowRightCircle, Settings2 } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { useLiveRefresh } from "@/lib/liveSync";
import { Spinner } from "./Spinner";
import { propFailText, propPhaseName, propStatusLabel } from "@/lib/propChallengeLabels";
import type { PropChallengeView } from "@/lib/propChallengeServer";
import { tr } from "@/lib/i18n";

// کارت «فاز چالش» صفحه‌ی حساب پراپ. همه‌ی اعداد از سرور می‌آیند
// (GET /api/trade/accounts/[id]/challenge)؛ اینجا فقط نمایش و دو دکمه‌ی انتقال.

const n2 = (v: number) => faNum(v.toFixed(2));

export function PropChallengeCard({
  accountId, sym, onConfigure, refreshKey,
}: {
  accountId: string;
  sym: string;
  onConfigure: () => void;
  /** با عوض‌شدنش (مثلا بعد از ذخیره‌ی حساب) دوباره خوانده می‌شود */
  refreshKey?: unknown;
}) {
  const [view, setView] = useState<PropChallengeView | null | undefined>(undefined);
  const [busy, setBusy] = useState<"advance" | "restart" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/trade/accounts/${accountId}/challenge`, { cache: "no-store" });
      if (!res.ok) { setView((v) => (v === undefined ? null : v)); return; }
      setView((await res.json()).challenge ?? null);
    } catch {
      setView((v) => (v === undefined ? null : v));
    }
  }, [accountId]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useLiveRefresh("trade", () => { load(); });

  async function act(action: "advance" | "restart") {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/trade/accounts/${accountId}/challenge`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || tr("انجام نشد", "Could not do that")); await load(); return; }
      setView(data.challenge);
    } catch {
      setError(tr("ارتباط با سرور برقرار نشد", "Could not reach the server"));
    } finally {
      setBusy(null);
    }
  }

  if (view === undefined) return null;
  if (view === null) {
    return (
      <div className="trade-surface pc-card pc-empty">
        <div className="pc-head"><b><Flag size={14} /> {tr("فاز چالش", "Challenge phase")}</b></div>
        <button type="button" className="btn btn-tonal btn-sm" onClick={onConfigure}>
          <Settings2 size={14} /> {tr("تنظیم چالش پراپ", "Set up the prop challenge")}
        </button>
      </div>
    );
  }

  const { config, state, evaluation: ev, history } = view;
  const m = ev.metrics;
  const total = config.phases.length;
  const steps = Array.from({ length: total + 1 }, (_, i) => i);
  const stepClass = (i: number) =>
    i < state.currentPhase ? "done"
    : i === state.currentPhase ? (state.status === "FAILED" ? "failed" : state.status === "PASSED" ? "done" : "current")
    : "";
  const ratio = (used: number, limit: number) => (limit > 0 ? Math.min(1, used / limit) : 0);
  const lossTone = (r: number) => (r >= 0.8 ? "danger" : r >= 0.5 ? "warn" : "");
  const lastIsFunded = state.currentPhase + 1 >= total;
  const showFundedStage = ev.isFundedStage;

  return (
    <div className="trade-surface pc-card">
      <div className="pc-head">
        <b><Flag size={14} /> {tr("فاز چالش", "Challenge phase")}</b>
        <span className={`pc-badge pc-${state.status.toLowerCase()}`}>{propStatusLabel(state.status)}</span>
        <button type="button" className="trade-icon-btn pc-config" onClick={onConfigure} aria-label={tr("ویرایش قوانین چالش", "Edit challenge rules")}>
          <Settings2 size={14} />
        </button>
      </div>

      <ol className="pc-steps" aria-label={tr("مراحل چالش", "Challenge steps")}>
        {steps.map((i) => (
          <li key={i} className={`pc-step ${stepClass(i)}`}>
            <span className="pc-step-dot mono">{i >= total ? <Flag size={11} /> : faNum(i + 1)}</span>
            <span className="pc-step-name">{propPhaseName(i, total)}</span>
          </li>
        ))}
      </ol>

      {!showFundedStage && m.targetProgress !== null && (
        <Meter
          label={tr("هدف سود", "Profit target")}
          value={`${faNum(m.profitPct)}% / ${faNum(m.targetPct)}%`}
          ratio={m.targetProgress}
          caption={m.profit >= m.targetAmount
            ? tr("هدف سود رسیده", "Profit target reached")
            : tr(`${n2(m.targetAmount - m.profit)} ${sym} تا هدف`, `${n2(m.targetAmount - m.profit)} ${sym} to go`)}
        />
      )}

      {m.dailyLimitAmount > 0 && (
        <Meter
          label={tr("ضرر امروز (روز UTC)", "Today's loss (UTC day)")}
          value={`${n2(m.dailyLossUsed)} / ${n2(m.dailyLimitAmount)} ${sym}`}
          ratio={ratio(m.dailyLossUsed, m.dailyLimitAmount)}
          tone={lossTone(ratio(m.dailyLossUsed, m.dailyLimitAmount))}
          caption={tr(
            `باقی‌مانده ${n2(m.dailyRemaining ?? 0)} ${sym} (${faNum(((m.dailyRemaining ?? 0) / m.baseline * 100).toFixed(2))}%)`,
            `${n2(m.dailyRemaining ?? 0)} ${sym} left (${((m.dailyRemaining ?? 0) / m.baseline * 100).toFixed(2)}%)`,
          )}
        />
      )}

      {m.overallLimitAmount > 0 && (
        <Meter
          label={m.trailing ? tr("افت از قله (تریلینگ)", "Drawdown from peak (trailing)") : tr("افت کل", "Overall drawdown")}
          value={`${n2(m.drawdown)} / ${n2(m.overallLimitAmount)} ${sym}`}
          ratio={ratio(m.drawdown, m.overallLimitAmount)}
          tone={lossTone(ratio(m.drawdown, m.overallLimitAmount))}
          caption={tr(
            `باقی‌مانده ${n2(m.overallRemaining ?? 0)} ${sym} (${faNum(((m.overallRemaining ?? 0) / m.baseline * 100).toFixed(2))}%)`,
            `${n2(m.overallRemaining ?? 0)} ${sym} left (${((m.overallRemaining ?? 0) / m.baseline * 100).toFixed(2)}%)`,
          )}
        />
      )}

      {!showFundedStage && (
        <div className="pc-facts">
          <span>
            {tr("روز معاملاتی", "Trading days")}{" "}
            <b className="mono">{faNum(m.tradingDays)}{m.minTradingDays ? ` / ${faNum(m.minTradingDays)}` : ""}</b>
          </span>
          {m.daysLeft !== null && (
            <span>{tr("مهلت باقی‌مانده", "Time left")} <b className="mono">{tr(`${faNum(m.daysLeft)} روز`, `${m.daysLeft} d`)}</b></span>
          )}
        </div>
      )}

      {state.status === "FAILED" && <div className="pc-note pc-note-fail">{propFailText(ev.failReason ?? history[history.length - 1]?.reason ?? null)}</div>}
      {state.status === "PASSED" && (
        <div className="pc-note">{lastIsFunded ? tr("همه‌ی فازها را رد کردی", "You cleared every phase") : tr("این فاز را رد کردی", "You cleared this phase")}</div>
      )}

      {error && <div className="trade-form-error">{error}</div>}

      {(state.status === "PASSED" || state.status === "FAILED") && (
        <div className="pc-actions">
          {state.status === "PASSED" ? (
            <button type="button" className="btn btn-primary" onClick={() => act("advance")} disabled={!!busy}>
              {busy === "advance" ? <Spinner size={14} /> : <ArrowRightCircle size={15} />}
              {lastIsFunded ? tr("رفتن به مرحله‌ی فاند", "Move to funded") : tr("رفتن به فاز بعد", "Go to the next phase")}
            </button>
          ) : (
            <button type="button" className="btn btn-tonal" onClick={() => act("restart")} disabled={!!busy}>
              {busy === "restart" ? <Spinner size={14} /> : <RotateCcw size={15} />}
              {tr("شروع دوباره", "Start over")}
            </button>
          )}
        </div>
      )}

      {!!history.length && (
        <ul className="pc-history">
          {history.slice().reverse().slice(0, 5).map((h, i) => (
            <li key={i}>
              <span>{propPhaseName(h.phase, total)}</span>
              <span className={h.result === "PASSED" ? "pc-pass" : "pc-fail"}>{h.result === "PASSED" ? tr("قبول", "Passed") : tr("شکست", "Failed")}</span>
              <span className="mono">{h.endedAt.slice(0, 10)}</span>
              <span className="mono">{n2(h.profit)} {sym}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meter({ label, value, ratio, caption, tone }: { label: string; value: string; ratio: number; caption: string; tone?: string }) {
  return (
    <div className="pc-meter">
      <div className="pc-meter-row"><span>{label}</span><b className="mono" dir="ltr">{value}</b></div>
      <div className="pc-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label={label}>
        <div className={`pc-fill ${tone || ""}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <div className="pc-caption">{caption}</div>
    </div>
  );
}
