"use client";

// شیت هدف همکاری: مربی هدف می‌سازه یا هدف فعال رو تموم می‌کنه، شاگرد پیشرفت رو می‌بینه.
// پیشرفت سمت سرور از داده‌ی واقعی حساب می‌شه؛ اینجا هیچ‌چیزی دستی ثبت نمی‌شه.
import "./coach.css";
import "./coach-space.css";
import { useEffect, useMemo, useState } from "react";
import type { CoachGoal, CoachGoalMetric } from "@/lib/coachTypes";
import { GOAL_TITLE_MAX } from "@/lib/coachGoal";
import { readTyped } from "@/lib/numberLimits";
import { mentorApi } from "./MentorDashKit";
import { fmtDay } from "@/lib/mentorFormat";
import { tr } from "@/lib/i18n";
import { CoachSheet, CoachSheetActions, CoachSheetBody } from "./CoachSheet";
import { CoachGoalCard } from "./CoachGoalCard";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { NumberInput } from "./NumberInput";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";

const FIELD = "wsearch-newform-name";

/** عنوان خودکار هدف، مثلا «هفته‌ای 4 جلسه تمرین، 12 هفته» */
export function coachGoalTitle(metric: CoachGoalMetric, target: number, weeks: number): string {
  const base = metric === "WORKOUT_SESSIONS"
    ? tr(`هفته‌ای ${target} جلسه تمرین`, `${target} workouts a week`)
    : tr(`هفته‌ای ${target}% روتین`, `${target}% of the routine every week`);
  return `${base}${tr("، ", ", ")}${tr(`${weeks} هفته`, `${weeks} ${weeks === 1 ? "week" : "weeks"}`)}`.slice(0, GOAL_TITLE_MAX);
}

function weekValueText(goal: CoachGoal, v: number | null): string {
  if (v == null) return tr("بدون داده", "No data");
  const n = Math.round(v);
  return goal.metric === "WORKOUT_SESSIONS" ? tr(`${n} از ${goal.target} جلسه`, `${n} of ${goal.target} sessions`) : `${n}%`;
}

export type CoachGoalSheetProps = {
  open: boolean;
  onClose: () => void;
  mentorshipId: string;
  role: "MENTOR" | "STUDENT";
  goal: CoachGoal | null;
  /** مربی با «هدف تازه» از منو مستقیم به فرم ساخت می‌رسه */
  startCreate?: boolean;
  onChanged: () => void;
  onShare?: () => void;
};

export function CoachGoalSheet({ open, onClose, mentorshipId, role, goal, startCreate, onChanged, onShare }: CoachGoalSheetProps) {
  const isMentor = role === "MENTOR";
  const active = goal && goal.status !== "ENDED" ? goal : null;
  const [creating, setCreating] = useState(false);
  const [metric, setMetric] = useState<CoachGoalMetric>("WORKOUT_SESSIONS");
  const [target, setTarget] = useState("4");
  const [weeks, setWeeks] = useState("12");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // با هر بار باز شدن: فرم ساخت فقط وقتی هدفی نیست یا مربی صریح «هدف تازه» خواسته
  useEffect(() => {
    if (!open) return;
    setCreating(isMentor && (!!startCreate || !active));
    setError(null);
    setConfirmEnd(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const tgt = useMemo(() => readTyped(target, metric === "WORKOUT_SESSIONS" ? "coachGoalSessions" : "coachGoalRoutineRate"), [target, metric]);
  const wks = useMemo(() => readTyped(weeks, "coachGoalWeeks"), [weeks]);
  const valid = tgt.ok && tgt.value != null && wks.ok && wks.value != null;
  const title = valid ? coachGoalTitle(metric, tgt.value as number, wks.value as number) : "";

  async function create() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const r = await mentorApi<{ goal: CoachGoal }>(`/api/mentorships/${mentorshipId}/goal`, {
      method: "POST",
      body: { title, metric, target: tgt.value, weeks: wks.value },
    });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    onChanged();
    onClose();
  }

  async function endGoal() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await mentorApi<{ goal: CoachGoal }>(`/api/mentorships/${mentorshipId}/goal`, { method: "PATCH", body: { action: "end" } });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setConfirmEnd(false);
    onChanged();
    onClose();
  }

  return (
    <>
      <CoachSheet open={open} onClose={() => { if (!busy) onClose(); }} title={creating ? tr("هدف تازه", "New goal") : tr("هدف", "Goal")} size="sm" dismissible={!busy}>
        {creating ? (
          <CoachSheetBody>
            <SegmentedTabs<CoachGoalMetric>
              ariaLabel={tr("نوع هدف", "Goal type")}
              options={[
                { value: "WORKOUT_SESSIONS", label: tr("جلسه‌ی تمرین در هفته", "Workouts per week") },
                { value: "ROUTINE_RATE", label: tr("درصد روتین در هفته", "Routine percent per week") },
              ]}
              active={metric}
              onChange={(m) => { setMetric(m); setTarget(m === "WORKOUT_SESSIONS" ? "4" : "80"); }}
            />
            <label className="cs-field">
              <span className="cs-field-label">{metric === "WORKOUT_SESSIONS" ? tr("چند جلسه در هفته", "Workouts per week") : tr("چند درصد روتین", "Routine percent")}</span>
              <NumberInput className={FIELD} value={target} onChange={setTarget} limit={metric === "WORKOUT_SESSIONS" ? "coachGoalSessions" : "coachGoalRoutineRate"} aria-label={tr("مقدار هدف", "Goal value")} />
            </label>
            <label className="cs-field">
              <span className="cs-field-label">{tr("چند هفته", "How many weeks")}</span>
              <NumberInput className={FIELD} value={weeks} onChange={setWeeks} limit="coachGoalWeeks" aria-label={tr("تعداد هفته", "Number of weeks")} />
            </label>
            <p className="cs-goal-preview" aria-live="polite">{title || tr("مقدارها رو کامل کن", "Fill in the values")}</p>
            {error && <div className="form-inline-error" role="alert">{error}</div>}
            <CoachSheetActions>
              {active ? (
                <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)} disabled={busy}>{tr("انصراف", "Cancel")}</button>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{tr("انصراف", "Cancel")}</button>
              )}
              <button type="button" className="btn btn-primary" onClick={create} disabled={!valid || busy} aria-busy={busy || undefined}>
                {busy ? <Spinner size={16} /> : tr("ساخت هدف", "Create goal")}
              </button>
            </CoachSheetActions>
          </CoachSheetBody>
        ) : active ? (
          <CoachSheetBody>
            <CoachGoalCard goal={active} onShare={active.status === "DONE" ? onShare : undefined} />
            <ul className="ch-list cs-goal-weeks" aria-label={tr("هفته‌های هدف", "Goal weeks")}>
              {active.history.map((w) => (
                <li key={w.weekStart} className={`cs-goal-week${w.current ? " is-current" : ""}${w.met ? " is-met" : ""}`}>
                  <span>{fmtDay(w.weekStart)}</span>
                  <span className="cs-goal-week-val">{weekValueText(active, w.value)}</span>
                </li>
              ))}
            </ul>
            {error && <div className="form-inline-error" role="alert">{error}</div>}
            <CoachSheetActions>
              {isMentor && active.status === "ACTIVE" && (
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmEnd(true)} disabled={busy}>{tr("پایان هدف", "End goal")}</button>
              )}
              {isMentor ? (
                <button type="button" className="btn btn-primary" onClick={() => setCreating(true)} disabled={busy}>{tr("هدف تازه", "New goal")}</button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={onClose}>{tr("بستن", "Close")}</button>
              )}
            </CoachSheetActions>
          </CoachSheetBody>
        ) : (
          <CoachSheetBody>
            <p className="cs-muted">{tr("هنوز هدفی ساخته نشده", "No goal yet")}</p>
            <CoachSheetActions>
              <button type="button" className="btn btn-primary" onClick={onClose}>{tr("بستن", "Close")}</button>
            </CoachSheetActions>
          </CoachSheetBody>
        )}
      </CoachSheet>
      {confirmEnd && (
        <MentorConfirmDialog
          message={tr("هدف تموم بشه؟", "End this goal?")}
          hint={tr("پیشرفت تا همین جا نگه داشته می‌شه.", "Progress so far is kept.")}
          confirmLabel={tr("پایان هدف", "End goal")}
          busy={busy}
          error={error}
          onConfirm={endGoal}
          onCancel={() => { if (!busy) setConfirmEnd(false); }}
        />
      )}
    </>
  );
}

export default CoachGoalSheet;
