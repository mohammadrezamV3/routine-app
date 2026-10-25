"use client";

import "./coach.css";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Spinner } from "./Spinner";

/** یک خط پیشنهاد نومو (جرقه‌ی پر)؛ loading اسپینر نشون می‌ده، action معمولا یک btn-tonal btn-sm */
export function CoachNomoLine({ text, loading, action, className }: { text?: ReactNode; loading?: boolean; action?: ReactNode; className?: string }) {
  return (
    <div className={`ch-nomo${className ? ` ${className}` : ""}`} aria-busy={loading || undefined}>
      <span className="ch-nomo-ico" aria-hidden="true">
        {loading ? <Spinner size={16} label={null} /> : <Sparkles size={16} fill="currentColor" strokeWidth={1.5} />}
      </span>
      {text != null && <span className="ch-nomo-text">{text}</span>}
      {action && <span className="ch-nomo-action">{action}</span>}
    </div>
  );
}
