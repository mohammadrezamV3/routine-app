"use client";

// فصل «هدف‌ها»: هدف‌های همین هفته (فقط‌خواندنی) + فرم هدف هفته‌ی بعد (فقط هفته‌ی جاری).
import { useEffect, useRef, useState } from "react";
import { Check, Sparkles, Target, Trash2, X } from "lucide-react";
import {
  ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type WeeklyGoalDto, type WeeklyGoalStatus,
} from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { useSection } from "./SectionProvider";
import { sectionHasDomain } from "@/lib/weeklyLetter/section";
import { Spinner } from "./Spinner";
import { TickOption } from "./TickOption";
import { TickButton } from "./TickButton";
import { SegmentedTabs } from "./SegmentedTabs";
import { GradientRing } from "./GradientRing";
import { DOMAIN_ICONS, Reveal } from "./WeeklyLetterShared";
import { LiveChapter, useGoalDraftListener, type GoalDraft, type LetterChapterExtra } from "./WeeklyLetterLiveKit";
import type { LetterChapterProps } from "./WeeklyLetterCtx";
import { waFetch } from "./WeeklyAnalysisKit";
import "./wl-medals.css";

const MAX_GOALS = 3;
const STATUS = {
  DONE: { label: () => tr("انجام شد", "Done"), Icon: Check, cls: "is-good" },
  MISSED: { label: () => tr("نشد", "Missed"), Icon: X, cls: "is-bad" },
  ACTIVE: { label: () => tr("در جریان", "In progress"), Icon: Target, cls: "" },
} as const satisfies Record<WeeklyGoalStatus, unknown>;

const DOMAIN_KEYS = Object.keys(ANALYSIS_DOMAIN_LABELS) as AnalysisDomain[];

function GoalRow({ g, live, onDelete, deleting }: { g: WeeklyGoalDto; live: number | null; onDelete?: () => void; deleting?: boolean }) {
  const st = STATUS[g.status] ?? STATUS.ACTIVE;
  const Icon = g.domain ? DOMAIN_ICONS[g.domain] : Target;
  const score = g.achievedScore ?? live;
  const ratio = g.target && score !== null ? Math.min(1, Math.max(0, score / g.target)) : null;
  return (
    <li className="wlg-row">
      <span className="wlg-lead">
        {ratio !== null ? (
          <GradientRing value={ratio} size={44} stroke={4}><Icon size={16} aria-hidden="true" /></GradientRing>
        ) : (
          <TickButton as="span" checked={g.status === "DONE"} state={g.status === "MISSED" ? "missed" : "idle"} size={26} />
        )}
      </span>
      <div className="wlg-body">
        <span className="wlg-title">{g.title}</span>
        <div className="wlg-meta">
          {g.domain && <span>{ANALYSIS_DOMAIN_LABELS[g.domain]}</span>}
          {g.target !== null && score !== null && (
            <span>{tr("رسیدی به", "You reached")} <b>{Math.round(score)}</b> {tr("از", "of")} <b>{Math.round(g.target)}</b></span>
          )}
          {g.target !== null && score === null && <span>{tr("هدف:", "Target:")} <b>{Math.round(g.target)}</b></span>}
        </div>
      </div>
      {onDelete ? (
        <button type="button" className="btn btn-icon btn-ghost btn-sm btn-bare" onClick={onDelete} disabled={deleting} aria-label={tr("حذف هدف", "Delete goal")}>
          {deleting ? <Spinner size={14} label={null} /> : <Trash2 size={16} />}
        </button>
      ) : (
        <span className={`wlg-status ${st.cls}`}><st.Icon size={13} />{st.label()}</span>
      )}
    </li>
  );
}

function readQueryDraft(): GoalDraft | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const title = q.get("goalTitle")?.trim();
    if (!title) return null;
    const dom = q.get("goalDomain");
    const t = Number(q.get("goalTarget"));
    return {
      domain: dom && (DOMAIN_KEYS as string[]).includes(dom) ? (dom as AnalysisDomain) : null,
      title: title.slice(0, 120),
      target: Number.isFinite(t) && t > 0 && t <= 100 ? Math.round(t) : null,
      nonce: 0,
    };
  } catch { return null; }
}

export function WeeklyLetterGoals({ ctx, no }: LetterChapterProps & LetterChapterExtra) {
  const a = ctx.analysis;
  const canEdit = ctx.isCurrent;
  const section = useSection();
  const [next, setNext] = useState<WeeklyGoalDto[]>(a.nextWeekGoals);
  useEffect(() => { setNext(a.nextWeekGoals); }, [a.nextWeekGoals]);

  const [domain, setDomain] = useState<AnalysisDomain | "">("");
  const [title, setTitle] = useState("");
  const [useTarget, setUseTarget] = useState(false);
  const [target, setTarget] = useState(70);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function applyDraft(d: GoalDraft, scroll: boolean) {
    // دامنه‌ی بیرون از این بخش (مثلا از لینک) به «عمومی» برمی‌گرده
    const dom = d.domain && sectionHasDomain(section, d.domain) ? d.domain : null;
    setDomain(dom ?? "");
    setTitle(d.title.slice(0, 120));
    setUseTarget(d.target !== null || !!dom);
    if (d.target !== null) setTarget(d.target);
    setError(null);
    if (scroll) setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 450);
  }
  useGoalDraftListener((d) => applyDraft(d, true));
  // پیش‌پر شدن از لینک (داستان، مربی): goalDomain / goalTitle / goalTarget
  const queryDone = useRef(false);
  useEffect(() => {
    if (queryDone.current || !canEdit) return;
    queryDone.current = true;
    const d = readQueryDraft();
    if (!d) return;
    applyDraft(d, true);
    setTimeout(() => document.getElementById("goals")?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const liveOf = (d: AnalysisDomain | null) => (d ? a.domains.find((x) => x.domain === d)?.score ?? null : null);
  const full = next.length >= MAX_GOALS;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (saving || full) return;
    const t = title.trim();
    if (!t) { setError(tr("عنوان هدف رو بنویس", "Write a goal title")); return; }
    setSaving(true);
    setError(null);
    try {
      const data = await waFetch<{ goal: WeeklyGoalDto }>("/api/analysis/weekly/goals", {
        method: "POST",
        body: JSON.stringify({ domain: domain || null, title: t, target: useTarget ? target : null }),
      });
      setNext((l) => [...l, data.goal]);
      setTitle(""); setUseTarget(false); setDomain("");
      ctx.reload();
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
      setNext((l) => l.filter((g) => g.id !== id));
      ctx.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  if (!canEdit && a.goals.length === 0) return null;

  return (
    <LiveChapter id="goals" no={no} title={tr("هدف‌ها", "Goals")} icon={Target}>
      <div className={`wlg${a.goals.length > 0 && canEdit ? " wlg-both" : ""}`}>
        {a.goals.length > 0 && (
          <Reveal className="wl-card wlg-card">
            <div className="wlg-head"><h3>{tr("هدف‌های این هفته", "This week's goals")}</h3></div>
            <ul className="wlg-list">
              {a.goals.map((g) => <GoalRow key={g.id} g={g} live={liveOf(g.domain)} />)}
            </ul>
          </Reveal>
        )}

        {canEdit && (
          <Reveal className="wl-card wlg-card" delay={0.06}>
            <div className="wlg-head">
              <h3>{tr("هدف‌های هفته‌ی بعد", "Next week's goals")}</h3>
              <span className="wlg-count" dir="ltr">{next.length} / {MAX_GOALS}</span>
            </div>
            {next.length > 0 && (
              <ul className="wlg-list">
                {next.map((g) => <GoalRow key={g.id} g={g} live={null} onDelete={() => remove(g.id)} deleting={deletingId === g.id} />)}
              </ul>
            )}
            {full ? (
              <p className="wlg-note">{tr(`حداکثر ${MAX_GOALS} هدف برای هر هفته. برای هدف تازه یکی رو حذف کن.`, `Up to ${MAX_GOALS} goals per week. Delete one to add a new goal.`)}</p>
            ) : (
              <form ref={formRef} className="wlg-form" onSubmit={add}>
                <div className="wlg-domain">
                  <SegmentedTabs<string>
                    ariaLabel={tr("بخش هدف", "Goal area")}
                    active={domain || "general"}
                    onChange={(v) => setDomain(v === "general" ? "" : (v as AnalysisDomain))}
                    options={[
                      { value: "general", label: <Sparkles size={16} aria-label={tr("عمومی", "General")} /> },
                      ...a.domains.map((d) => {
                        const I = DOMAIN_ICONS[d.domain];
                        return { value: d.domain as string, label: <I size={16} aria-label={ANALYSIS_DOMAIN_LABELS[d.domain]} /> };
                      }),
                    ]}
                  />
                  <span className="wlg-domain-name" aria-live="polite">{domain ? ANALYSIS_DOMAIN_LABELS[domain] : tr("عمومی", "General")}</span>
                </div>
                <input
                  ref={titleRef}
                  className="wsearch-newform-name"
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tr("مثلا: هر شب قبل از 12 بخوابم", "e.g. Sleep before 12 every night")}
                  aria-label={tr("عنوان هدف", "Goal title")}
                />
                <div className="wlg-target">
                  <TickOption checked={useTarget} onChange={setUseTarget}>{tr("هدف امتیازی", "Score target")}</TickOption>
                  {useTarget && <b className="wlg-target-num">{target}</b>}
                </div>
                {useTarget && (
                  <input
                    type="range" min={0} max={100} step={5}
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                    className="trade-range"
                    aria-label={tr("امتیاز هدف", "Target score")}
                    data-noswipe
                  />
                )}
                <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving || !title.trim()} aria-busy={saving || undefined}>
                  {saving && <Spinner className="btn-spinner" size={16} label={null} />}{tr("افزودن هدف", "Add goal")}
                </button>
              </form>
            )}
          </Reveal>
        )}
        {error && <div className="wl-live-error" role="alert">{error}</div>}
      </div>
    </LiveChapter>
  );
}
