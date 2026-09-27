"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorField, MentorSection } from "./MentorUI";
import type { AlertsResponse } from "@/lib/mentorToolsTypes";

type Choice = "off" | "2" | "3" | "5" | "7";
const OPTIONS: { value: Choice; label: string }[] = [
  { value: "off", label: "خاموش" },
  { value: "2", label: "۲ روز" },
  { value: "3", label: "۳ روز" },
  { value: "5", label: "۵ روز" },
  { value: "7", label: "۷ روز" },
];

function toChoice(n: number | null): Choice {
  if (n == null) return "off";
  const s = String(n) as Choice;
  return OPTIONS.some((o) => o.value === s) ? s : "3";
}

/**
 * بخشِ تنظیماتِ «هشدارِ پایبندی» برای /mentor/settings: وقتی شاگرد n روزِ
 * برنامه‌دارِ پشت‌سرهم هیچ آیتمی انجام نداد، اعلانِ درون‌برنامه‌ای برای منتور
 * ساخته می‌شود (با لودِ پنل منتور؛ یک بار برای هر دوره‌ی بی‌کاری). انتخاب
 * همان لحظه ذخیره می‌شود.
 */
export function MentorAlertsSettings() {
  const [value, setValue] = useState<Choice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await mentorApi<AlertsResponse>("/api/mentor/alerts");
    if (!r.ok) { setError(r.error); return; }
    setValue(toChoice(r.data.alertMissedDays));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function change(v: Choice) {
    const prev = value;
    setValue(v);
    setSaving(true);
    setError(null);
    const r = await mentorApi<AlertsResponse>("/api/mentor/alerts", { method: "PUT", body: { alertMissedDays: v === "off" ? null : Number(v) } });
    setSaving(false);
    if (!r.ok) { setValue(prev); setError(r.error); }
  }

  return (
    <MentorSection title="هشدار پایبندی" icon={<BellRing size={MI.section} strokeWidth={MI_STROKE} aria-hidden />} action={saving ? <Spinner size={14} /> : undefined}>
      <MentorField
        label="هشدار وقتی شاگرد چند روز پشت‌سرهم برنامه را انجام نداد"
        hint="فقط روزهایی که طبق برنامه آیتمی داشته‌اند شمرده می‌شوند؛ برای هر دوره یک اعلان"
        error={error}
      >
        {value === null ? (
          error ? null : <Spinner size={14} />
        ) : (
          <SegmentedTabs<Choice> active={value} onChange={change} options={OPTIONS} />
        )}
      </MentorField>
    </MentorSection>
  );
}
