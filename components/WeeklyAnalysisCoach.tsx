"use client";

import "./wa-cards.css";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, RotateCw } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AiCoach, type AnalysisDomain } from "@/lib/weeklyAnalysis/types";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { Spinner } from "./Spinner";
import { SectionHead, V_WK_CARD, WK_EASE, waFetch } from "./WeeklyAnalysisKit";

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

  const typing = (
    <span className="wc-typing" aria-hidden="true"><i /><i /><i /></span>
  );

  return (
    <motion.section className="wk-card wk-coach" variants={V_WK_CARD} aria-label="مربی هوشمند">
      <SectionHead
        icon={<AiSparkleIcon size={15} still />}
        title="مربی هوشمند"
        aside={ai && aiAvailable ? (
          <button type="button" className="account-outline-btn muted wk-small-btn" onClick={generate} disabled={busy} aria-label="بازسازی تحلیل مربی">
            {busy ? <Spinner size={13} label={null} /> : <><RotateCw size={13} />بازسازی</>}
          </button>
        ) : undefined}
      />

      <div className="wc-chat">
        {busy && !ai ? (
          <div className="wc-row" role="status" aria-label="در حال ساخت تحلیل">
            <span className="wc-avatar"><AiSparkleIcon size={16} still /></span>
            <div className="wc-stack">
              <div className="wc-bubble">{typing}</div>
              <span className="wc-note">مربی داره اعداد هفته رو می‌خونه…</span>
            </div>
          </div>
        ) : !ai ? (
          aiAvailable ? (
            <div className="wc-row">
              <span className="wc-avatar"><AiSparkleIcon size={16} still /></span>
              <div className="wc-stack">
                <div className="wc-bubble">مربی هوشمند اعداد همین هفته رو می‌خونه و یه جمع‌بندی کوتاه با چند پیشنهاد عملی برای هفته‌ی بعد می‌ده.</div>
                <div className="wc-cta">
                  <button type="button" className="account-outline-btn wk-coach-cta" onClick={generate} disabled={busy}>
                    <AiSparkleIcon size={15} still />ساخت تحلیل مربی
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="wk-empty-inline">تحلیل مربی هوشمند فعلا در دسترس نیست.</div>
          )
        ) : (
          <motion.div className="wc-row" initial={{ opacity: 0 }} animate={{ opacity: busy ? 0.55 : 1 }} transition={{ duration: 0.35 }}>
            <span className="wc-avatar"><AiSparkleIcon size={16} still /></span>
            <div className="wc-stack">
              <div className="wc-bubble is-sum" style={{ ["--i" as string]: 0 }}>{ai.summary}</div>
              <AnimatePresence initial={false}>
                {ai.recommendations.map((r, i) => (
                  <motion.div
                    key={`${r.title}-${i}`}
                    className="wc-bubble"
                    style={{ animation: "none" }}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, delay: 0.08 * (i + 1), ease: WK_EASE }}
                  >
                    <div className="wc-bubble-head">
                      <span className="wc-bubble-title">{r.title}</span>
                      <span className={`wk-priority ${r.priority}`}>{PRIORITY_LABELS[r.priority]}</span>
                    </div>
                    <div className="wc-bubble-desc">{r.description}</div>
                    <div className="wc-chips">
                      {r.domain && <span className="wk-chip">{ANALYSIS_DOMAIN_LABELS[r.domain]}</span>}
                      {canAddGoal && (
                        <button type="button" className="wk-ghost wc-chip-btn" onClick={() => onAddGoal({ domain: r.domain, title: r.title })}>
                          <Plus size={12} />افزودن به اهداف
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {busy && <div className="wc-bubble">{typing}</div>}
              {ai.generatedAt && <div className="wc-note">ساخته‌شده ساعت <span className="wk-num">{formatGeneratedAt(ai.generatedAt)}</span></div>}
            </div>
          </motion.div>
        )}
      </div>

      {error && <div className="wk-error-inline">{error}</div>}
    </motion.section>
  );
}
