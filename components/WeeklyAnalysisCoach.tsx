"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, RotateCw } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AiCoach, type AnalysisDomain } from "@/lib/weeklyAnalysis/types";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { Spinner } from "./Spinner";
import { V_WK_CARD, WK_EASE, waFetch } from "./WeeklyAnalysisKit";

type Rec = NonNullable<AiCoach>["recommendations"][number];

const PRIORITY_LABELS: Record<Rec["priority"], string> = { high: "اولویت بالا", medium: "اولویت متوسط", low: "اولویت کم" };

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

  return (
    <motion.section className="wk-card wk-coach" variants={V_WK_CARD} aria-label="مربی هوشمند">
      <header className="wk-card-head">
        <h2 className="wk-card-title"><AiSparkleIcon size={17} still />مربی هوشمند</h2>
        {ai && aiAvailable && (
          <button type="button" className="account-outline-btn muted wk-small-btn" onClick={generate} disabled={busy} aria-label="بازسازی تحلیل مربی">
            {busy ? <Spinner size={13} label={null} /> : <><RotateCw size={13} />بازسازی</>}
          </button>
        )}
      </header>

      {busy && !ai ? (
        <div className="wk-coach-wait" role="status" aria-label="در حال ساخت تحلیل">
          <span className="wk-skel" style={{ width: "92%" }} />
          <span className="wk-skel" style={{ width: "78%" }} />
          <span className="wk-skel" style={{ width: "64%" }} />
          <span className="wk-coach-wait-note"><Spinner size={13} label={null} />مربی داره اعداد هفته رو می‌خونه…</span>
        </div>
      ) : !ai ? (
        aiAvailable ? (
          <div className="wk-coach-empty">
            <p>مربی هوشمند اعداد همین هفته رو می‌خونه و یه جمع‌بندی کوتاه با چند پیشنهاد عملی برای هفته‌ی بعد می‌ده.</p>
            <button type="button" className="account-outline-btn wk-coach-cta" onClick={generate} disabled={busy}>
              <AiSparkleIcon size={15} still />ساخت تحلیل مربی
            </button>
          </div>
        ) : (
          <div className="wk-empty-inline">تحلیل مربی هوشمند فعلا در دسترس نیست.</div>
        )
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: busy ? 0.5 : 1 }} transition={{ duration: 0.35 }}>
          <p className="wk-coach-summary">{ai.summary}</p>
          {ai.recommendations.length > 0 && (
            <ul className="wk-rec-list">
              <AnimatePresence initial={false}>
                {ai.recommendations.map((r, i) => (
                  <motion.li
                    key={`${r.title}-${i}`}
                    className="wk-rec"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.06 * i, ease: WK_EASE }}
                  >
                    <div className="wk-rec-head">
                      <span className="wk-rec-title">{r.title}</span>
                      <span className={`wk-priority ${r.priority}`}>{PRIORITY_LABELS[r.priority]}</span>
                    </div>
                    <div className="wk-rec-desc">{r.description}</div>
                    <div className="wk-rec-foot">
                      {r.domain ? <span className="wk-chip">{ANALYSIS_DOMAIN_LABELS[r.domain]}</span> : <span />}
                      {canAddGoal && (
                        <button type="button" className="wk-ghost wk-link-btn" onClick={() => onAddGoal({ domain: r.domain, title: r.title })}>
                          <Plus size={13} />افزودن به اهداف
                        </button>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          {ai.generatedAt && <div className="wk-muted-sm wk-coach-meta">ساخته‌شده ساعت <span className="wk-num">{formatGeneratedAt(ai.generatedAt)}</span></div>}
        </motion.div>
      )}

      {error && <div className="wk-error-inline">{error}</div>}
    </motion.section>
  );
}
