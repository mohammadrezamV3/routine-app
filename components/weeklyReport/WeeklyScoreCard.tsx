"use client";

import { motion } from "framer-motion";

const CONFIDENCE_LABEL: Record<string, string> = { high: "دقتِ بالا", medium: "دقتِ متوسط", low: "دقتِ کم — داده محدود" };

// کارتِ اصلیِ بالای صفحه — امتیازِ کلی + تغییر نسبت به هفته‌ی قبل + خلاصه‌ی
// اجراییِ AI (یا جای‌گزینِ صادقانه اگه AI در دسترس نبود، بندِ ۶۶).
export function WeeklyScoreCard({
  overallScore, previousOverallScore, confidence, aiSummary, status,
}: {
  overallScore: number | null; previousOverallScore: number | null; confidence: string; aiSummary: string | null; status: string;
}) {
  const delta = overallScore != null && previousOverallScore != null ? overallScore - previousOverallScore : null;

  return (
    <motion.div className="wr-score-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {overallScore == null ? (
        <div className="wr-score-empty">هنوز داده‌ی کافی برای امتیازِ این هفته نداریم.</div>
      ) : (
        <>
          <div className="wr-score-row">
            <div className="wr-score-num-wrap">
              <span className="wr-score-num">{overallScore}</span>
              <span className="wr-score-max">از ۱۰۰</span>
            </div>
            {delta != null && (
              <span className={`wr-score-delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}>
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta)}٪ نسبت به هفته‌ی قبل
              </span>
            )}
          </div>
          {confidence === "low" && <div className="wr-confidence-note">این تحلیل بر اساسِ داده‌ی محدود انجام شده است.</div>}
        </>
      )}

      {status === "COLLECTING" && <div className="wr-collecting-note">در حالِ جمع‌آوریِ داده‌ی این هفته — گزارشِ نهایی بعدِ پایانِ هفته آماده می‌شه.</div>}

      <div className="wr-ai-summary">
        {aiSummary ? aiSummary : "تحلیلِ هوشمند برای این هفته در دسترس نیست — آمارِ هفتگی همچنان کامل و آماده‌ست."}
      </div>
    </motion.div>
  );
}
