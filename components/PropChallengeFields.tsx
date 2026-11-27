"use client";

import { SegmentedTabs } from "./SegmentedTabs";
import { NumberInput } from "./NumberInput";
import { TickOption } from "./TickOption";
import {
  parsePropConfig, propPreset, presetOfConfig,
  type PropChallengeConfig, type PropPresetKey,
} from "@/lib/propChallenge";
import { propPhaseName, propPresetLabel } from "@/lib/propChallengeLabels";
import { tr } from "@/lib/i18n";

// بخش «چالش پراپ» فرم حساب. همه‌ی مقدارها رشته‌ان تا مستقیم به NumberInput وصل بشن؛
// تبدیل و سنجش نهایی با parsePropConfig (همون سنجش سرور) انجام می‌شه.

type PhaseForm = { target: string; daily: string; overall: string; trailing: boolean; minDays: string; timeLimit: string };
type FundedForm = { daily: string; overall: string; trailing: boolean };
export type PropForm = { preset: PropPresetKey | "NONE"; phases: PhaseForm[]; funded: FundedForm };

const s = (n: number) => (n ? String(n) : "");

export function configToForm(c: PropChallengeConfig): PropForm {
  return {
    preset: presetOfConfig(c),
    phases: c.phases.map((p) => ({
      target: s(p.profitTargetPct), daily: s(p.maxDailyLossPct), overall: s(p.maxOverallLossPct),
      trailing: p.trailing, minDays: s(p.minTradingDays), timeLimit: s(p.timeLimitDays),
    })),
    funded: { daily: s(c.funded.maxDailyLossPct), overall: s(c.funded.maxOverallLossPct), trailing: c.funded.trailing },
  };
}

export const emptyPropForm = (): PropForm => ({ ...configToForm(propPreset("TWO")), preset: "NONE" });

/** فرم → config تمیز، یا متن خطا */
export function formToConfig(f: PropForm): PropChallengeConfig | string {
  return parsePropConfig({
    phases: f.phases.map((p) => ({
      profitTargetPct: p.target, maxDailyLossPct: p.daily, maxOverallLossPct: p.overall,
      trailing: p.trailing, minTradingDays: p.minDays, timeLimitDays: p.timeLimit,
    })),
    funded: { maxDailyLossPct: f.funded.daily, maxOverallLossPct: f.funded.overall, trailing: f.funded.trailing },
  });
}

const PRESET_ORDER: (PropPresetKey | "NONE")[] = ["NONE", "ONE", "TWO", "THREE", "INSTANT"];

export function PropChallengeFields({ value, onChange }: { value: PropForm; onChange: (v: PropForm) => void }) {
  const setPhase = (i: number, patch: Partial<PhaseForm>) =>
    onChange({ ...value, phases: value.phases.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const total = value.phases.length;

  return (
    <div className="pc-fields">
      <label className="exercise-form-label">{tr("چالش پراپ", "Prop challenge")}</label>
      <SegmentedTabs
        active={value.preset}
        onChange={(k) => onChange(k === "NONE" ? { ...value, preset: "NONE" } : configToForm(propPreset(k)))}
        options={PRESET_ORDER.map((k) => ({ value: k, label: propPresetLabel(k) }))}
      />

      {value.preset !== "NONE" && (
        <>
          {value.phases.map((p, i) => (
            <div className="pc-phase" key={i}>
              <div className="pc-phase-title">{propPhaseName(i, total)}</div>
              <div className="pc-grid">
                <Field label={tr("هدف سود (%)", "Profit target (%)")}>
                  <NumberInput limit="propTargetPct" className="wsearch-newform-name trade-glass-field" value={p.target} onChange={(v) => setPhase(i, { target: v })} />
                </Field>
                <Field label={tr("حد ضرر روزانه (%)", "Max daily loss (%)")}>
                  <NumberInput limit="propLossPct" className="wsearch-newform-name trade-glass-field" value={p.daily} onChange={(v) => setPhase(i, { daily: v })} placeholder={tr("بدون حد", "No limit")} />
                </Field>
                <Field label={tr("حد ضرر کلی (%)", "Max overall loss (%)")}>
                  <NumberInput limit="propLossPct" className="wsearch-newform-name trade-glass-field" value={p.overall} onChange={(v) => setPhase(i, { overall: v })} placeholder={tr("بدون حد", "No limit")} />
                </Field>
                <Field label={tr("حداقل روز معاملاتی", "Min trading days")}>
                  <NumberInput limit="propMinDays" className="wsearch-newform-name trade-glass-field" value={p.minDays} onChange={(v) => setPhase(i, { minDays: v })} placeholder="0" />
                </Field>
                <Field label={tr("مهلت (روز)", "Time limit (days)")}>
                  <NumberInput limit="propTimeLimitDays" className="wsearch-newform-name trade-glass-field" value={p.timeLimit} onChange={(v) => setPhase(i, { timeLimit: v })} placeholder={tr("بدون مهلت", "No limit")} />
                </Field>
              </div>
              <TickOption checked={p.trailing} onChange={(v) => setPhase(i, { trailing: v })}>
                {tr("حد ضرر کلی تریلینگ (از بالاترین موجودی)", "Trailing overall loss (from the equity peak)")}
              </TickOption>
            </div>
          ))}

          <div className="pc-phase">
            <div className="pc-phase-title">{propPhaseName(total, total)}</div>
            <div className="pc-grid">
              <Field label={tr("حد ضرر روزانه (%)", "Max daily loss (%)")}>
                <NumberInput limit="propLossPct" className="wsearch-newform-name trade-glass-field" value={value.funded.daily} onChange={(v) => onChange({ ...value, funded: { ...value.funded, daily: v } })} placeholder={tr("بدون حد", "No limit")} />
              </Field>
              <Field label={tr("حد ضرر کلی (%)", "Max overall loss (%)")}>
                <NumberInput limit="propLossPct" className="wsearch-newform-name trade-glass-field" value={value.funded.overall} onChange={(v) => onChange({ ...value, funded: { ...value.funded, overall: v } })} placeholder={tr("بدون حد", "No limit")} />
              </Field>
            </div>
            <TickOption checked={value.funded.trailing} onChange={(v) => onChange({ ...value, funded: { ...value.funded, trailing: v } })}>
              {tr("حد ضرر کلی تریلینگ", "Trailing overall loss")}
            </TickOption>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="exercise-form-label">{label}</label>
      {children}
    </div>
  );
}
