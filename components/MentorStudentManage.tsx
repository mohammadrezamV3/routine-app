"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, Tag } from "lucide-react";
import { Spinner } from "./Spinner";
import { mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorSection } from "./MentorUI";
import { MentorIntakeAnswers } from "./MentorIntakeAnswers";
import { MentorStudentNotes } from "./MentorStudentNotes";
import type { StudentLabel, StudentManageResponse } from "@/lib/mentorTypes";

const ic = (Icon: typeof Tag, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/** دادهِ مدیریتیِ خصوصیِ منتور برای یک شاگرد — یک بار برای کلِ صفحه */
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

/**
 * بخش‌های خصوصیِ منتور در صفحه‌ی شاگرد: جواب‌های پذیرش، برچسب‌ها و
 * یادداشت‌ها. شاگرد هیچ‌کدام از برچسب‌ها و یادداشت‌ها را نمی‌بیند.
 */
export function MentorStudentManage({
  studentId, data, onChange,
}: { studentId: string; data: StudentManageResponse; onChange: (d: StudentManageResponse) => void }) {
  return (
    <>
      {data.intakeAnswers.length > 0 && (
        <MentorSection title="جواب‌های پذیرش" icon={ic(Inbox, MI.section)}>
          <MentorIntakeAnswers answers={data.intakeAnswers} />
        </MentorSection>
      )}
      <StudentLabels studentId={studentId} labels={data.labels} value={data.labelIds} onSaved={(labelIds) => onChange({ ...data, labelIds })} />
      <MentorStudentNotes studentId={studentId} initial={data.notes} />
    </>
  );
}

/** انتخابِ چندتاییِ برچسب‌ها؛ هر کلیک فوراً ذخیره می‌شود */
function StudentLabels({
  studentId, labels, value, onSaved,
}: { studentId: string; labels: StudentLabel[]; value: string[]; onSaved: (ids: string[]) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    if (busy) return;
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    setBusy(id);
    setError(null);
    const r = await mentorApi<{ labelIds: string[] }>(`/api/mentor/students/${encodeURIComponent(studentId)}/labels`, { method: "PUT", body: { labelIds: next } });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    onSaved(r.data.labelIds);
  }

  return (
    <MentorSection
      title="برچسب‌ها" icon={ic(Tag, MI.section)}
      action={<Link href="/mentor/settings#labels" className="mentor-link">مدیریت برچسب‌ها</Link>}
    >
      {labels.length === 0 ? (
        <MentorEmpty>هنوز برچسبی نساخته‌ای</MentorEmpty>
      ) : (
        <div className="trade-choice-grid" role="group" aria-label="برچسب‌های این شاگرد">
          {labels.map((l) => {
            const on = value.includes(l.id);
            return (
              <button key={l.id} type="button" className={`trade-choice${on ? " active" : ""}`} aria-pressed={on} disabled={!!busy} onClick={() => toggle(l.id)}>
                {busy === l.id ? <Spinner size={14} /> : l.name}
              </button>
            );
          })}
        </div>
      )}
      {error && <div className="form-inline-error" role="alert">{error}</div>}
    </MentorSection>
  );
}
