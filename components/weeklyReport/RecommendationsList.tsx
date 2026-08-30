"use client";

import { Target } from "lucide-react";

type Recommendation = { title: string; description: string; priority: string };

const PRIORITY_LABEL: Record<string, string> = { high: "اولویتِ بالا", medium: "اولویتِ متوسط", low: "اولویتِ کم" };

// پیشنهادهای AI برای هفته‌ی بعد — فقط نمایشی در V1 (بدونِ Accept/Reject؛
// اون فلوی اتصال به سیستمِ Goal واقعی توی نسخه‌ی بعدیه).
export function RecommendationsList({ items }: { items: Recommendation[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="wr-block">
      <div className="wr-block-title"><Target size={15} /> تمرکزِ هفته‌ی آینده</div>
      <div className="wr-rec-list">
        {items.map((r, i) => (
          <div key={i} className="wr-rec-card">
            <div className="wr-rec-head">
              <span className="wr-rec-title">{r.title}</span>
              <span className={`wr-rec-priority ${r.priority}`}>{PRIORITY_LABEL[r.priority] || r.priority}</span>
            </div>
            <div className="wr-rec-desc">{r.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
