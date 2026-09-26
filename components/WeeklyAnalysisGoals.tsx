"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Target, Trash2, X } from "lucide-react";
import {
  ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type DomainResult, type WeeklyGoalDto, type WeeklyGoalStatus,
} from "@/lib/weeklyAnalysis/types";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";
import { Spinner } from "./Spinner";
import { ToggleSwitch } from "./ToggleSwitch";
import { waFetch } from "./WeeklyAnalysisShared";

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
  // امتیازِ فعلی: وقتی هفته تموم شده achievedScore، وگرنه امتیازِ زنده‌ی همون دامنه
  const current = g.achievedScore ?? liveScore;
  const pct = g.target && current !== null ? Math.min(100, (current / g.target) * 100) : 0;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="wa-goal"
    >
      <div className="wa-goal-head">
        <span className={cn("wa-goal-status", meta.cls)}>
          {g.status === "DONE" ? <Check size={11} /> : g.status === "MISSED" ? <X size={11} /> : null}
          {meta.label}
        </span>
        <span className="wa-goal-title">{g.title}</span>
        {onDelete && (
          <button type="button" className="wa-ghost wa-icon-btn danger" onClick={onDelete} disabled={deleting} aria-label="حذف هدف">
            {deleting ? <Spinner size={13} /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
      <div className="wa-goal-meta">
        <span className="wa-tag">{g.domain ? ANALYSIS_DOMAIN_LABELS[g.domain] : "عمومی"}</span>
        {g.target !== null && (
          <span className="wa-muted-sm">
            هدف <span className="mono">{g.target}</span>
            {current !== null && <> · {g.achievedScore !== null ? "رسیدی" : "الان"} <span className="mono">{Math.round(current)}</span></>}
          </span>
        )}
      </div>
      {g.target !== null && current !== null && (
        <div className="wa-goal-bar"><i className={meta.cls} style={{ width: `${pct}%` }} /></div>
      )}
    </motion.li>
  );
}

// اهدافِ هفته — «این هفته» همون‌هایی‌ان که هفته‌ی قبل تعیین شدن؛ هدفِ جدید
// همیشه برای *هفته‌ی بعد* ثبت می‌شه و فقط از هفته‌ی جاری (offset=0).
export function WeeklyAnalysisGoals({
  offset,
  goals,
  nextWeekGoals,
  domains,
  draft,
  onAdded,
  onDeleted,
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
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // پیشنهادِ مربی («+ هدف») فرم رو پر می‌کنه و کاربر رو به همین کارت می‌بره
  useEffect(() => {
    if (!draft) return;
    setDomain(draft.domain ?? "");
    setTitle(draft.title.slice(0, 120));
    setUseTarget(!!draft.domain);
    setError(null);
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 350);
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
    <div ref={rootRef}>
      <DashCard className="wa-goals-card">
        <div className="wa-card-head">
          <h2 className="wa-card-title"><Target size={16} className="wa-title-icon" />اهداف</h2>
        </div>

        <div className="wa-sub-title">اهداف این هفته</div>
        {goals.length === 0 ? (
          <div className="wa-empty-inline">برای این هفته هدفی تعیین نشده بود.</div>
        ) : (
          <ul className="wa-goal-list">
            {goals.map((g) => <GoalRow key={g.id} g={g} liveScore={liveScoreOf(g.domain)} />)}
          </ul>
        )}

        {canEdit && (
          <>
            <div className="wa-sub-title">
              اهداف هفته‌ی بعد <span className="wa-muted-sm mono">{nextWeekGoals.length}/{MAX_GOALS}</span>
            </div>
            {nextWeekGoals.length > 0 && (
              <ul className="wa-goal-list">
                <AnimatePresence initial={false}>
                  {nextWeekGoals.map((g) => (
                    <GoalRow key={g.id} g={g} liveScore={null} onDelete={() => remove(g.id)} deleting={deletingId === g.id} />
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {full ? (
              <div className="wa-empty-inline">حداکثر {MAX_GOALS} هدف برای هر هفته — برای هدف تازه یکی رو حذف کن.</div>
            ) : (
              <form className="wa-goal-form" onSubmit={add}>
                <div className="wa-goal-form-row">
                  <select
                    className="wsearch-newform-name wa-select"
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
                <div className="wa-goal-target-row">
                  <ToggleSwitch checked={useTarget} onChange={setUseTarget} label="هدف امتیازی" />
                  <span className="wa-muted-sm">هدف امتیازی</span>
                  {useTarget && <b className="mono wa-goal-target-num">{target}</b>}
                </div>
                {useTarget && (
                  <input
                    type="range" min={0} max={100} step={5}
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                    className="trade-range"
                    aria-label="امتیاز هدف"
                  />
                )}
                <button type="submit" className="account-outline-btn wa-goal-submit" disabled={saving || !title.trim()}>
                  {saving ? <Spinner size={14} /> : <><Plus size={14} />افزودن هدف برای هفته‌ی بعد</>}
                </button>
              </form>
            )}
          </>
        )}
        {!canEdit && <div className="wa-muted-sm wa-goal-note">هدف تازه فقط از هفته‌ی جاری تعیین می‌شه.</div>}

        {error && <div className="wa-error-inline">{error}</div>}
      </DashCard>
    </div>
  );
}
