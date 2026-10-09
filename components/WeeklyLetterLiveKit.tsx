"use client";

// ابزار مشترک فصل‌های تعاملی هفته‌نامه‌ی زنده (مربی، هدف‌ها، یادداشت).
import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { AnalysisDomain } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { Reveal, WL_EASE, useLite } from "./WeeklyLetterShared";
import "./weekly-letter.css";

export type LetterChapterExtra = {
  /** شماره‌ی فصل برای سرفصل؛ اگه نیاد، فقط آیکون نشون داده می‌شه */
  no?: number;
};

/** سرفصل فصل با همون ظاهر Chapter خواننده، بدون وابستگی به شماره‌ی فصل. */
export function LiveChapter({ id, no, title, icon: Icon, children }: { id: string; no?: number; title: string; icon: LucideIcon; children: ReactNode }) {
  const lite = useLite();
  return (
    <section id={id} className="wl-ch">
      <Reveal className="wl-ch-head">
        <span className="wl-ch-badge" aria-hidden="true"><Icon size={19} /></span>
        <span className="wl-ch-txt">
          {no ? <span className="wl-ch-k" aria-hidden="true">{tr("فصل", "Chapter")} {String(no).padStart(2, "0")}</span> : null}
          <h2 className="wl-ch-title">{title}</h2>
        </span>
        <motion.span
          className="wl-ch-line"
          aria-hidden="true"
          initial={{ scaleX: lite ? 1 : 0, opacity: lite ? 0 : 1 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: lite ? 0.25 : 1.1, ease: WL_EASE as never, delay: lite ? 0 : 0.25 }}
        />
      </Reveal>
      {children}
    </section>
  );
}

// ---- پیش‌نویس هدف: مربی و لینک‌های بیرونی فرم هدف‌ها رو پر می‌کنن ----
export type GoalDraft = { domain: AnalysisDomain | null; title: string; target: number | null; nonce: number };
const DRAFT_EVENT = "wl-live-goal-draft";

export function sendGoalDraft(d: { domain: AnalysisDomain | null; title: string; target?: number | null }) {
  window.dispatchEvent(new CustomEvent(DRAFT_EVENT, { detail: d }));
}

export function useGoalDraftListener(on: (d: GoalDraft) => void) {
  useEffect(() => {
    let nonce = 0;
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as { domain: AnalysisDomain | null; title: string; target?: number | null } | undefined;
      if (d?.title) on({ domain: d.domain ?? null, title: d.title, target: d.target ?? null, nonce: ++nonce });
    };
    window.addEventListener(DRAFT_EVENT, h);
    return () => window.removeEventListener(DRAFT_EVENT, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** پیام خطای انسانی برای محدودیت نرخ/سهمیه‌ی مربی. */
export function humanAiError(message: string): string {
  if (/محدود|بار|ساعت|مجاز|rate|limit|too many|try again/i.test(message)) return message;
  return message || tr("ساخت تحلیل ممکن نشد. کمی بعد دوباره امتحان کن.", "Could not build the analysis. Please try again in a moment.");
}
