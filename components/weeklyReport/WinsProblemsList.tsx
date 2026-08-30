"use client";

import { Trophy, AlertTriangle } from "lucide-react";

export function WinsList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="wr-block">
      <div className="wr-block-title"><Trophy size={15} /> بردهای این هفته</div>
      <ul className="wr-list wins">
        {items.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

export function ProblemsList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="wr-block">
      <div className="wr-block-title"><AlertTriangle size={15} /> نقاطِ قابل‌بهبود</div>
      <ul className="wr-list problems">
        {items.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );
}
