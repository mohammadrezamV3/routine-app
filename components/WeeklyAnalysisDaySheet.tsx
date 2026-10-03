"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type DomainResult, type WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { LockBodyScroll } from "./LockBodyScroll";
import { GradientRing } from "./GradientRing";
import {
  DOMAIN_HREFS, DOMAIN_ICONS, DeltaChip, Liquid, WK_EASE, domainGrad, formatDayDetail, jalaliShort, scoreGrad, useMounted,
} from "./WeeklyAnalysisKit";

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

function DayBody({ analysis, index }: { analysis: WeeklyAnalysis; index: number }) {
  const day = analysis.days[index];
  const prev = analysis.prevDays[index];
  const ready = useMounted();
  const rows = useMemo(
    () => analysis.domains.map((d: DomainResult) => ({ d, v: d.daily[index] ?? null, text: formatDayDetail(d.domain, day.details) })),
    [analysis.domains, day.details, index]
  );
  const delta = day.score !== null && prev !== null && prev !== undefined ? day.score - prev : null;
  const withData = rows.filter((r) => r.v !== null || r.text);
  const without = rows.filter((r) => r.v === null && !r.text);

  return (
    <div className="wk-sheet-body">
      <div className="wk-sheet-hero">
        <GradientRing key={day.date} value={(day.score ?? 0) / 100} size={72} stroke={8} grad={scoreGrad(day.score)}>
          <span className="wk-sheet-score wk-num">{day.score === null ? "—" : Math.round(day.score)}</span>
        </GradientRing>
        <div className="wk-sheet-hero-text">
          <b>{day.isFuture ? "هنوز نرسیده" : day.score === null ? "بدون داده" : "امتیاز این روز"}</b>
          {prev !== null && prev !== undefined && (
            <span className="wk-muted-sm">
              همین روز هفته‌ی قبل <span className="wk-num">{Math.round(prev)}</span>{" "}
              {delta !== null && <DeltaChip delta={delta} size="sm" />}
            </span>
          )}
        </div>
      </div>

      {day.isFuture ? (
        <div className="wk-empty-inline">این روز هنوز نرسیده.</div>
      ) : withData.length === 0 ? (
        <div className="wk-empty-inline">برای این روز چیزی ثبت نشده بود.</div>
      ) : (
        <ul className="wk-sheet-list">
          {withData.map(({ d, v, text }, i) => {
            const Icon = DOMAIN_ICONS[d.domain as AnalysisDomain];
            return (
              <motion.li
                key={d.domain}
                className="wk-sheet-row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04 * i, ease: WK_EASE }}
              >
                <span className="wk-sheet-ic" style={{ color: `var(--wk-d-${d.domain}-a)` }}><Icon size={16} /></span>
                <span className="wk-sheet-row-main">
                  <span className="wk-sheet-row-top">
                    <span className="wk-sheet-dname">{ANALYSIS_DOMAIN_LABELS[d.domain]}</span>
                    <span className="wk-sheet-dscore wk-num">{v === null ? "—" : Math.round(v)}</span>
                  </span>
                  <Liquid pct={v} grad={domainGrad(d.domain)} ready={ready} delay={60 * i} className="is-h wk-sheet-bar" />
                  {text && <span className="wk-sheet-text wk-num">{text}</span>}
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}

      {!day.isFuture && without.length > 0 && withData.length > 0 && (
        <div className="wk-sheet-missing">
          ثبت نشده:{" "}
          {without.map((r, i) => (
            <span key={r.d.domain}>
              <Link href={DOMAIN_HREFS[r.d.domain]} className="wk-inline-link" prefetch={false}>{ANALYSIS_DOMAIN_LABELS[r.d.domain]}</Link>
              {i < without.length - 1 ? "، " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// برگه‌ی «جزئیات روز»: روی موبایل از پایین بالا میاد (با کشیدن به پایین
// بسته می‌شه)، روی دسکتاپ پنجره‌ی وسط. فلش‌های بالا بین روزهای همین هفته
// جابه‌جا می‌کنن. Escape و کلیک بیرون = بستن.
export function WeeklyAnalysisDaySheet({
  analysis, index, onClose, onIndex,
}: { analysis: WeeklyAnalysis; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const narrow = useIsNarrow();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); prev?.focus?.({ preventScroll: true }); };
  }, [open, onClose]);

  if (!mounted) return null;
  const day = index !== null ? analysis.days[index] : null;
  const from = narrow ? { opacity: 1, y: "100%" } : { opacity: 0, y: 10, scale: 0.98 };
  const to = narrow ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 };

  return createPortal(
    <AnimatePresence>
      {open && day && index !== null && (
        <div className={`wk-sheet-wrap${narrow ? " is-bottom" : ""}`} key="wk-sheet">
          <LockBodyScroll />
          <motion.div
            className="wk-sheet-backdrop"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="جزئیات روز"
            className="modal-panel open wk-sheet"
            initial={from}
            animate={{ ...to, transition: { duration: narrow ? 0.34 : 0.26, ease: WK_EASE } }}
            exit={{ ...from, transition: { duration: 0.2, ease: WK_EASE } }}
            drag={narrow ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 600) onClose(); }}
          >
            {narrow && <span className="wk-sheet-grip" aria-hidden />}
            <div className="wk-sheet-head">
              <button type="button" className="wk-ghost wk-icon-btn" onClick={() => index > 0 && onIndex(index - 1)} disabled={index <= 0} aria-label="روز قبل">
                <ChevronRight size={18} />
              </button>
              <div className="wk-sheet-title">
                <b>{day.weekday}{day.isToday ? " · امروز" : ""}</b>
                <span className="wk-num">{jalaliShort(day.date)}</span>
              </div>
              <button type="button" className="wk-ghost wk-icon-btn" onClick={() => index < 6 && onIndex(index + 1)} disabled={index >= 6} aria-label="روز بعد">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="wk-ghost wk-icon-btn wk-sheet-close" onClick={onClose} aria-label="بستن">
                <X size={17} />
              </button>
            </div>
            <DayBody analysis={analysis} index={index} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
