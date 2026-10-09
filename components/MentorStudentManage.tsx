"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "./Spinner";
import { mentorApi } from "./MentorDashKit";
import { MentorEmpty } from "./MentorUI";
import { MentorSheet } from "./MentorSheet";
import type { StudentManageResponse } from "@/lib/mentorTypes";
import { tr } from "@/lib/i18n";

/** داده مدیریتی خصوصی مربی برای یک شاگرد: یک بار برای کل صفحه */
export function useStudentManage(studentId: string) {
  const [data, setData] = useState<StudentManageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!studentId) return;
    const r = await mentorApi<StudentManageResponse>(`/api/mentor/students/${encodeURIComponent(studentId)}/manage`);
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setData(r.data);
  }, [studentId]);
  useEffect(() => { load(); }, [load]);
  return { data, error, reload: load, setData };
}

/** برگه‌ی برچسب‌های شاگرد؛ هر زدن فورا ذخیره می‌شه. شاگرد برچسب‌ها رو نمی‌بینه. */
export function MentorStudentManage({
  studentId, data, onChange, open, onClose,
}: { studentId: string; data: StudentManageResponse; onChange: (d: StudentManageResponse) => void; open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    if (busy) return;
    const next = data.labelIds.includes(id) ? data.labelIds.filter((x) => x !== id) : [...data.labelIds, id];
    setBusy(id);
    setError(null);
    const r = await mentorApi<{ labelIds: string[] }>(`/api/mentor/students/${encodeURIComponent(studentId)}/labels`, { method: "PUT", body: { labelIds: next } });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    onChange({ ...data, labelIds: r.data.labelIds });
  }

  return (
    <MentorSheet open={open} onClose={onClose} title={tr("برچسب‌ها", "Labels")} size="sm">
      {data.labels.length === 0 ? (
        <MentorEmpty>{tr("هنوز برچسبی نساختی", "You have not created any labels yet")}</MentorEmpty>
      ) : (
        <div className="trade-choice-grid" role="group" aria-label={tr("برچسب‌های این شاگرد", "Labels for this student")}>
          {data.labels.map((l) => {
            const on = data.labelIds.includes(l.id);
            return (
              <button key={l.id} type="button" className={`trade-choice${on ? " active" : ""}`} aria-pressed={on} disabled={!!busy} onClick={() => toggle(l.id)}>
                {busy === l.id ? <Spinner size={14} /> : l.name}
              </button>
            );
          })}
        </div>
      )}
      {error && <div className="form-inline-error" role="alert">{error}</div>}
      <p className="mentor-muted"><Link href="/mentor/settings#labels" className="mentor-link">{tr("مدیریت برچسب‌ها", "Manage labels")}</Link></p>
    </MentorSheet>
  );
}
