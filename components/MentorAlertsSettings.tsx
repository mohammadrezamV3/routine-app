"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorField } from "./MentorUI";
import type { AlertsResponse } from "@/lib/mentorToolsTypes";

export type AlertChoice = "off" | "2" | "3" | "5" | "7";
const OPTIONS: { value: AlertChoice; label: string }[] = [
  { value: "2", label: "2 روز" },
  { value: "3", label: "3 روز" },
  { value: "5", label: "5 روز" },
  { value: "7", label: "7 روز" },
  { value: "off", label: "خاموش" },
];

export function alertToChoice(n: number | null | undefined): AlertChoice {
  if (n == null) return "off";
  const s = String(n) as AlertChoice;
  return OPTIONS.some((o) => o.value === s) ? s : "3";
}

export function alertValueText(c: AlertChoice | null): string {
  if (c === null) return "";
  return c === "off" ? "خاموش" : `بعد از ${c} روز`;
}

/**
 * برگه‌ی «یادآور بی‌خبری شاگرد»: وقتی شاگرد n روز برنامه‌دار پشت سر هم هیچ کاری نکرد،
 * یک اعلان برای مربی ساخته می‌شه (برای هر دوره یک بار). با دکمه‌ی ذخیره ثبت می‌شه.
 */
export function MentorAlertsSettings({
  initial, onSaved, onDone,
}: { initial: AlertChoice; onSaved: (v: AlertChoice) => void; onDone?: () => void }) {
  const [value, setValue] = useState<AlertChoice>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const r = await mentorApi<AlertsResponse>("/api/mentor/alerts", { method: "PUT", body: { alertMissedDays: value === "off" ? null : Number(value) } });
    setSaving(false);
    if (!r.ok) { setError(r.error); return; }
    setSaved(true);
    onSaved(value);
    onDone?.();
  }

  return (
    <form onSubmit={save} noValidate className="mentor-form mv2-set-form">
      <MentorField
        label="وقتی شاگرد چند روز پشت سر هم برنامه رو انجام نداد خبرم کن"
        hint="فقط روزهایی که طبق برنامه کاری داشته شمرده می‌شن؛ برای هر دوره یک اعلان"
        error={error}
      >
        <SegmentedTabs<AlertChoice> active={value} onChange={(v) => { setValue(v); setSaved(false); setError(null); }} options={OPTIONS} />
      </MentorField>
      <div className="mentor-form-actions" style={{ marginTop: 0 }}>
        <button type="submit" className="trade-primary-btn mentor-btn" disabled={saving}>
          {saving ? <Spinner size={14} /> : saved ? <><Check size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> ذخیره شد</> : "ذخیره"}
        </button>
      </div>
    </form>
  );
}
