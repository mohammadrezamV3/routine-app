"use client";

import "./wa-cards.css";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Target, Trash2 } from "lucide-react";
import {
  ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type DomainResult, type WeeklyGoalDto, type WeeklyGoalStatus,
} from "@/lib/weeklyAnalysis/types";
import { Spinner } from "./Spinner";
import { TickButton } from "./TickButton";
import { TickOption } from "./TickOption";
import { LineMeter, Num, SectionHead, V_WK_CARD, WK_EASE, useCalmMotion, useSeen, waFetch } from "./WeeklyAnalysisKit";

export type GoalDraft = { domain: AnalysisDomain | null; title: string; nonce: number };

const MAX_GOALS = 3;

const STATUS_META: Record<WeeklyGoalStatus, { label: string; cls: string }> = {
  ACTIVE: { label: "در جریان", cls: "active" },
  DONE: { label: "انجام شد", cls: "done" },
  MISSED: { label: "نرسیدی", cls: "missed" },
};

function GoalRow({
  g, liveScore, onDelete, deleting,
}: { g: WeeklyGoalDto; liveScore: number | null; onDelete?: () => void; deleting?: boolean }) {
  const meta = STATUS_META[g.status];
  const calm = useCalmMotion();
  const [ref, seen] = useSeen<HTMLLIElement>("0px 0px -20px 0px");
  // امتیاز فعلی: وقتی هفته تموم شده achievedScore، وگرنه امتیاز زنده‌ی همون دامنه
  const current = g.achievedScore ?? liveScore;
  const pct = g.target && current !== null ? Math.min(100, (current / g.target) * 100) : null;
  return (
    <motion.li
      ref={ref}
      layout={calm ? false : "position"}
      initial={calm ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={calm ? { opacity: 0 } : { opacity: 0, x: -24, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: WK_EASE }}
      className={`wc-goal${g.status === "DONE" ? " is-done" : ""}`}
    >
      <TickButton as="span" checked={g.status === "DONE"} state={g.status === "MISSED" ? "missed" : "idle"} size={24} label={meta.label} />
      <div className="wc-goal-main">
        <div className="wc-goal-title">{g.title}</div>
        <div className="wc-goal-meta">
          <span className="wk-chip">{g.domain ? ANALYSIS_DOMAIN_LABELS[g.domain] : "عمومی"}</span>
          <span className={`wc-goal-status ${meta.cls}`}>{meta.label}</span>
          {g.target !== null && (
            <span className="wk-muted-sm">
              هدف <span className="wk-num">{g.target}</span>
              {current !== null && <> · {g.achievedScore !== null ? "رسیدی" : "الان"} <span className="wk-num">{Math.round(current)}</span></>}
            </span>
          )}
        </div>
        {pct !== null && <div className="wc-goal-meter"><LineMeter pct={pct} ready={seen} /></div>}
      </div>
      {onDelete && (
        <button type="button" className="wk-ghost wk-icon-btn danger" onClick={onDelete} disabled={deleting} aria-label="حذف هدف">
          {deleting ? <Spinner size={13} label={null} /> : <Trash2 size={14} />}
        </button>
      )}
    </motion.li>
  );
}

// اهداف هفته — «این هفته» همون‌هایی‌ان که هفته‌ی قبل تعیین شدن؛ هدف جدید
// همیشه برای *هفته‌ی بعد* ثبت می‌شه و فقط از هفته‌ی جاری (offset=0).
export function WeeklyAnalysisGoals({
  offset, goals, nextWeekGoals, domains, draft, onAdded, onDeleted,
}: {
  offset: number;
  goals: WeeklyGoalDto[];
  nextWeekGoals: WeeklyGoalDto[];
  domains: DomainResult[];
  draft: GoalDraft | null;
  onAdded: (g: WeeklyGoalDto) => void;
  onDeleted: (id: string) => void;
}) {
  const canEdit = offset === 0;
  const full = nextWeekGoals.length >= MAX_GOALS;
  const [domain, setDomain] = useState<AnalysisDomain | "">("");
  const [title, setTitle] = useState("");
  const [useTarget, setUseTarget] = useState(false);
  const [target, setTarget] = useState(70);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // پیشنهاد مربی («افزودن به اهداف») فرم رو پر می‌کنه و کاربر رو به همین کارت می‌بره
  useEffect(() => {
    if (!draft) return;
    setDomain(draft.domain ?? "");
    setTitle(draft.title.slice(0, 120));
    setUseTarget(!!draft.domain);
    setError(null);
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 450);
    return () => clearTimeout(t);
  }, [draft]);

  const liveScoreOf = (d: AnalysisDomain | null) => (d ? domains.find((x) => x.domain === d)?.score ?? null : null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (saving || full) return;
    const t = title.trim();
    if (!t) { setError("عنوان هدف رو بنویس"); return; }
    setSaving(true);
    setError(null);
    try {
      const data = await waFetch<{ goal: WeeklyGoalDto }>("/api/analysis/weekly/goals", {
        method: "POST",
        body: JSON.stringify({ domain: domain || null, title: t, target: useTarget ? target : null }),
      });
      onAdded(data.goal);
      setTitle("");
      setUseTarget(false);
      setDomain("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      await waFetch<{ ok: boolean }>(`/api/analysis/weekly/goals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      onDeleted(id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <motion.section id="goals" ref={rootRef} className="wk-card wc-goals" variants={V_WK_CARD} aria-label="اهداف">
      <SectionHead icon={<Target size={15} />} title="اهداف" />

      <div className="wk-sub-title wc-goal-sec">اهداف این هفته</div>
      {goals.length === 0 ? (
        <div className="wk-empty-inline">برای این هفته هدفی تعیین نشده بود.</div>
      ) : (
        <ul className="wc-goal-list">
          <AnimatePresence initial={false}>
            {goals.map((g) => <GoalRow key={g.id} g={g} liveScore={liveScoreOf(g.domain)} />)}
          </AnimatePresence>
        </ul>
      )}

      {canEdit ? (
        <>
          <div className="wk-sub-title">
            اهداف هفته‌ی بعد <span className="wk-muted-sm wk-num">{nextWeekGoals.length}/{MAX_GOALS}</span>
          </div>
          {nextWeekGoals.length > 0 && (
            <ul className="wc-goal-list">
              <AnimatePresence initial={false}>
                {nextWeekGoals.map((g) => (
                  <GoalRow key={g.id} g={g} liveScore={null} onDelete={() => remove(g.id)} deleting={deletingId === g.id} />
                ))}
              </AnimatePresence>
            </ul>
          )}

          {full ? (
            <div className="wk-empty-inline">حداکثر {MAX_GOALS} هدف برای هر هفته — برای هدف تازه یکی رو حذف کن.</div>
          ) : (
            <form className="wc-form" onSubmit={add}>
              <div className="wc-form-row">
                <select
                  className="wsearch-newform-name wk-select wc-sel"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as AnalysisDomain | "")}
                  aria-label="بخش"
                >
                  <option value="">عمومی</option>
                  {domains.map((d) => <option key={d.domain} value={d.domain}>{ANALYSIS_DOMAIN_LABELS[d.domain]}</option>)}
                </select>
                <input
                  ref={titleRef}
                  className="wsearch-newform-name"
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلا: هر شب قبل از 12 بخوابم"
                  aria-label="عنوان هدف"
                />
              </div>
              <div className="wc-target-row">
                <TickOption checked={useTarget} onChange={setUseTarget}>هدف امتیازی</TickOption>
                {useTarget && <b className="wc-target-num"><Num value={target} duration={0.2} /></b>}
              </div>
              <AnimatePresence initial={false}>
                {useTarget && (
                  <motion.div
                    key="range"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: WK_EASE }}
                  >
                    <input
                      type="range" min={0} max={100} step={5}
                      value={target}
                      onChange={(e) => setTarget(Number(e.target.value))}
                      className="trade-range"
                      aria-label="امتیاز هدف"
                      data-noswipe
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <button type="submit" className="account-outline-btn wk-goal-submit" disabled={saving || !title.trim()}>
                {saving ? <Spinner size={14} label={null} /> : <><Plus size={14} />افزودن هدف برای هفته‌ی بعد</>}
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="wk-muted-sm wk-goal-note">هدف تازه فقط از هفته‌ی جاری تعیین می‌شه.</div>
      )}

      {error && <div className="wk-error-inline">{error}</div>}
    </motion.section>
  );
}
