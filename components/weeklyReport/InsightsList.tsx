"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, ChevronDown } from "lucide-react";

type Insight = { title: string; description: string; evidence: string; confidence: string };

const CONFIDENCE_LABEL: Record<string, string> = { low: "دقتِ کم", medium: "دقتِ متوسط", high: "دقتِ بالا" };

// هر Insight قابل‌بازشدنه — کلیک روی «چرا این را گفتی؟» مبنای عددیش رو نشون می‌ده (بندِ ۳۲).
export function InsightsList({ items }: { items: Insight[] | null }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!items || items.length === 0) return null;

  return (
    <div className="wr-block">
      <div className="wr-block-title"><Lightbulb size={15} /> بینش‌ها</div>
      <div className="wr-insight-list">
        {items.map((insight, i) => {
          const open = openIdx === i;
          return (
            <div key={i} className="wr-insight-card">
              <button type="button" className="wr-insight-head" onClick={() => setOpenIdx(open ? null : i)}>
                <span className="wr-insight-title">{insight.title}</span>
                <ChevronDown size={14} className={`wr-insight-chevron${open ? " open" : ""}`} />
              </button>
              <div className="wr-insight-desc">{insight.description}</div>
              <AnimatePresence>
                {open && (
                  <motion.div className="wr-insight-evidence" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                    <div className="wr-insight-evidence-label">مبنای این تحلیل</div>
                    <div className="wr-insight-evidence-text">{insight.evidence}</div>
                    <div className={`wr-insight-confidence ${insight.confidence}`}>{CONFIDENCE_LABEL[insight.confidence] || insight.confidence}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
