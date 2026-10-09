"use client";

// فصل «هدف‌ها»: هدف‌های همین هفته (فقط‌خواندنی) + فرم هدف هفته‌ی بعد (فقط هفته‌ی جاری).
import { useEffect, useRef, useState } from "react";
import { Check, Plus, Target, Trash2, X } from "lucide-react";
import {
  ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type WeeklyGoalDto, type WeeklyGoalStatus,
} from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { Spinner } from "./Spinner";
import { TickOption } from "./TickOption";
import { DOMAIN_ICONS, MeterBar, Reveal } from "./WeeklyLetterShared";
import { LiveChapter, useGoalDraftListener, type GoalDraft, type LetterChapterExtra } from "./WeeklyLetterLiveKit";
import type { LetterChapterProps } from "./WeeklyLetterCtx";
import { waFetch } from "./WeeklyAnalysisKit";

const MAX_GOALS = 3;
const STATUS = {
  DONE: { label: () => tr("انجام شد", "Done"), Icon: Check, cls: "is-good" },
  MISSED: { label: () => tr("نشد", "Missed"), Icon: X, cls: "is-bad" },
  ACTIVE: { label: () => tr("در جریان", "In progress"), Icon: Target, cls: "" },
} as const satisfies Record<WeeklyGoalStatus, unknown>;

const DOMAIN_KEYS = Object.keys(ANALYSIS_DOMAIN_LABELS) as AnalysisDomain[];

function GoalCard({ g, live, onDelete, deleting }: { g: WeeklyGoalDto; live: number | null; onDelete?: () => void; deleting?: boolean }) {
  const st = STATUS[g.status] ?? STATUS.ACTIVE;
  const Icon = g.domain ? DOMAIN_ICONS[g.domain] : Target;
  const score = g.achievedScore ?? live;
  const ratio = g.target && score !== null ? Math.min(1, Math.max(0, score / g.target)) : null;
  return (
    <Reveal as="li" className="wl-card wl-goal">
      <span className="wl-goal-ico"><Icon size={17} /></span>
      <div className="wl-goal-body">
        <h3>{g.title}</h3>
        <div className="wl-goal-meta">
          {g.domain && <span className="wl-tag">{ANALYSIS_DOMAIN_LABELS[g.domain]}</span>}
          {g.target !== null && score !== null && (
            <span className="wl-goal-prog">{tr("رسیدی به", "You reached")} <b>{Math.round(score)}</b> {tr("از", "of")} <b>{Math.round(g.target)}</b></span>
          )}
          {g.target !== null && score === null && <span className="wl-goal-prog">{tr("هدف:", "Target:")} <b>{Math.round(g.target)}</b></span>}
        </div>
        {ratio !== null && <MeterBar ratio={ratio} />}
      </div>
      {onDelete ? (
        <button type="button" className="wl-live-ghost wl-live-icon" onClick={onDelete} disabled={deleting} aria-label={tr("حذف هدف", "Delete goal")}>
          {deleting ? <Spinner size={14} label={null} /> : <Trash2 size={16} />}
        </button>
      ) : (
        <span className={`wl-status ${st.cls}`}><st.Icon size={13} />{st.label()}</span>
      )}
    </Reveal>
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
    setDomain(d.domain ?? "");
    setTitle(d.title.slice(0, 120));
    setUseTarget(d.target !== null || !!d.domain);
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
      <div className="wl-live-goals">
        {a.goals.length > 0 && (
          <div className="wl-live-group">
            <h3 className="wl-live-sub">{tr("هدف‌های این هفته", "This week's goals")}</h3>
            <ul className="wl-goals">
              {a.goals.map((g) => <GoalCard key={g.id} g={g} live={liveOf(g.domain)} />)}
            </ul>
          </div>
        )}

        {canEdit && (
          <div className="wl-live-group">
            <div className="wl-live-subrow">
              <h3 className="wl-live-sub">{tr("هدف‌های هفته‌ی بعد", "Next week's goals")}</h3>
              <span className="wl-live-count">{next.length} {tr("از", "of")} {MAX_GOALS}</span>
            </div>
            {next.length > 0 && (
              <ul className="wl-goals">
                {next.map((g) => <GoalCard key={g.id} g={g} live={null} onDelete={() => remove(g.id)} deleting={deletingId === g.id} />)}
              </ul>
            )}
            {full ? (
              <p className="wl-live-note">{tr(`حداکثر ${MAX_GOALS} هدف برای هر هفته. برای هدف تازه یکی رو حذف کن.`, `Up to ${MAX_GOALS} goals per week. Delete one to add a new goal.`)}</p>
            ) : (
              <form ref={formRef} className="wl-card wl-live-form" onSubmit={add}>
                <div className="wl-live-row">
                  <select
                    className="wsearch-newform-name wl-live-sel"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value as AnalysisDomain | "")}
                    aria-label={tr("بخش هدف", "Goal area")}
                  >
                    <option value="">{tr("عمومی", "General")}</option>
                    {a.domains.map((d) => <option key={d.domain} value={d.domain}>{ANALYSIS_DOMAIN_LABELS[d.domain]}</option>)}
                  </select>
                  <input
                    ref={titleRef}
                    className="wsearch-newform-name wl-live-title"
                    value={title}
                    maxLength={120}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={tr("مثلا: هر شب قبل از 12 بخوابم", "e.g. Sleep before 12 every night")}
                    aria-label={tr("عنوان هدف", "Goal title")}
                  />
                </div>
                <div className="wl-live-row wl-live-target">
                  <TickOption checked={useTarget} onChange={setUseTarget}>{tr("هدف امتیازی", "Score target")}</TickOption>
                  {useTarget && <b className="wl-live-targetnum">{target}</b>}
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
                <button type="submit" className="account-outline-btn wl-live-btn" disabled={saving || !title.trim()}>
                  {saving ? <Spinner size={14} label={null} /> : <><Plus size={14} />{tr("افزودن هدف", "Add goal")}</>}
                </button>
              </form>
            )}
          </div>
        )}
        {error && <div className="wl-live-error" role="alert">{error}</div>}
      </div>
    </LiveChapter>
  );
}
