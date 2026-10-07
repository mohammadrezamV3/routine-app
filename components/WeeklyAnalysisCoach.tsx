"use client";

import "./wa-cards.css";
import "./wa-bottom.css";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, RotateCw } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AiCoach, type AnalysisDomain } from "@/lib/weeklyAnalysis/types";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { Spinner } from "./Spinner";
import { V_WK_CARD, WK_EASE, waFetch } from "./WeeklyAnalysisKit";

type Rec = NonNullable<AiCoach>["recommendations"][number];

const PRIORITY_LABELS: Record<Rec["priority"], string> = { high: "مهم", medium: "متوسط", low: "سبک" };

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// مربی هوشمند — فقط با درخواست صریح کاربر ساخته می‌شه (GET صفحه هیچ‌وقت
// AI صدا نمی‌زنه). نتیجه سمت سرور کش می‌شه و با «بازسازی» دوباره ساخته می‌شه.
export function WeeklyAnalysisCoach({
  offset, ai, aiAvailable, canAddGoal, onAi, onAddGoal,
}: {
  offset: number;
  ai: AiCoach;
  aiAvailable: boolean;
  canAddGoal: boolean;
  onAi: (ai: AiCoach) => void;
  onAddGoal: (draft: { domain: AnalysisDomain | null; title: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await waFetch<{ ai: AiCoach }>("/api/analysis/weekly/ai", { method: "POST", body: JSON.stringify({ offset }) });
      onAi(data.ai);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const typing = (
    <span className="wc-typing" aria-hidden="true"><i /><i /><i /></span>
  );

  const sparkle = <AiSparkleIcon size={15} still />;
  return (
    <motion.section className="wk-card wb-card wb-coach" variants={V_WK_CARD} aria-label="مربی هوشمند">
      <div className="wb-coach-meta">
        <span className="wb-coach-ic" aria-hidden="true"><AiSparkleIcon size={26} still /></span>
        <h2 className="wb-title">مربی هوشمند</h2>
        <span className="wb-coach-sub">بر اساس داده‌ی همین هفته، برای هفته‌ی بعد</span>
        {ai && aiAvailable && (
          <button type="button" className="account-outline-btn muted wk-small-btn wb-coach-regen" onClick={generate} disabled={busy} aria-label="بازسازی تحلیل مربی">
            {busy ? <Spinner size={13} label={null} /> : <><RotateCw size={13} />تحلیل دوباره</>}
          </button>
        )}
      </div>

      <div className="wb-coach-chat">
        {busy && !ai ? (
          <div className="wb-bubble" role="status" aria-label="در حال ساخت تحلیل">
            {typing}
            <span className="wc-note">مربی داره اعداد هفته رو می‌خونه…</span>
          </div>
        ) : !ai ? (
          aiAvailable ? (
            <>
              <div className="wb-bubble">مربی هوشمند اعداد همین هفته رو می‌خونه و یه جمع‌بندی کوتاه با چند پیشنهاد عملی برای هفته‌ی بعد می‌ده.</div>
              <div>
                <button type="button" className="account-outline-btn wk-coach-cta" onClick={generate} disabled={busy}>
                  {sparkle}ساخت تحلیل مربی
                </button>
              </div>
            </>
          ) : (
            <div className="wk-empty-inline">تحلیل مربی هوشمند فعلا در دسترس نیست.</div>
          )
        ) : (
          <motion.div className="wb-coach-stack" initial={{ opacity: 0 }} animate={{ opacity: busy ? 0.55 : 1 }} transition={{ duration: 0.35 }}>
            <div className="wb-bubble is-sum">{ai.summary}</div>
            <AnimatePresence initial={false}>
              {ai.recommendations.map((r, i) => (
                <motion.div
                  key={`${r.title}-${i}`}
                  className="wb-bubble wb-rec"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.08 * (i + 1), ease: WK_EASE }}
                >
                  <span className={`wb-prio ${r.priority}`}>{PRIORITY_LABELS[r.priority]}</span>
                  <span className="wb-rec-text">
                    <b>{r.title}</b>
                    <span>{r.description}</span>
                    {r.domain && <span className="wk-chip wb-rec-chip">{ANALYSIS_DOMAIN_LABELS[r.domain]}</span>}
                  </span>
                  {canAddGoal && (
                    <button type="button" className="wk-ghost wb-add-goal" onClick={() => onAddGoal({ domain: r.domain, title: r.title })}>
                      <Plus size={12} />به اهداف
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {busy && <div className="wb-bubble">{typing}</div>}
            {ai.generatedAt && <div className="wc-note">ساخته‌شده ساعت <span className="wk-num">{formatGeneratedAt(ai.generatedAt)}</span></div>}
          </motion.div>
        )}
        {error && <div className="wk-error-inline">{error}</div>}
      </div>
    </motion.section>
  );
}
