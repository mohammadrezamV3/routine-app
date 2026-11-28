"use client";

// شیت‌های تنبل فضای همکاری (یادداشت، برچسب، چیزهایی که می‌بینم، تنظیم سطح دسترسی مربی). با next/dynamic لود کن.
import "./coach.css";
import "./coach-space.css";
import { useEffect, useState } from "react";
import { isoLocal } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import type { StudentView } from "./MentorStudentTypes";
import { CoachSheet, CoachSheetBody } from "./CoachSheet";
import { MentorStudentManage, useStudentManage } from "./MentorStudentManage";
import { MentorStudentNotes } from "./MentorStudentNotes";
import { MentorStudentPrivacy } from "./MentorStudentPrivacy";
import { MentorPrivacySettings } from "./MentorPrivacySettings";
import { mentorApi } from "./MentorDashKit";
import { LoadingBlock } from "./Spinner";

/** یادداشت خصوصی مربی (رمزگذاری‌شده فقط برای خودش؛ MentorStudentNotes خودش گیت کلید رو داره) */
export function CoachNotesSheet({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId: string }) {
  const manage = useStudentManage(studentId);
  return (
    <CoachSheet open={open} onClose={onClose} title={tr("یادداشت من", "My notes")} size="md">
      <CoachSheetBody>
        {manage.data ? (
          <MentorStudentNotes studentId={studentId} initial={manage.data.notes} />
        ) : manage.error ? (
          <div className="form-inline-error" role="alert">{manage.error}</div>
        ) : (
          <LoadingBlock />
        )}
      </CoachSheetBody>
    </CoachSheet>
  );
}

/** برچسب‌های شاگرد (شیت خودش رو داره؛ تا داده نیومده چیزی نیست) */
export function CoachLabelsSheet({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId: string }) {
  const manage = useStudentManage(studentId);
  if (!manage.data) return null;
  return <MentorStudentManage studentId={studentId} data={manage.data} onChange={manage.setData} open={open} onClose={onClose} />;
}

/** «چیزهایی که می‌بینم»: خلاصه‌ی چیزهایی که شاگرد با این مربی به اشتراک گذاشته */
export function CoachSeesSheet({ open, onClose, studentId, sleepShared }: { open: boolean; onClose: () => void; studentId: string; sleepShared: boolean }) {
  const [view, setView] = useState<StudentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || view) return;
    let dead = false;
    const day = isoLocal(new Date());
    mentorApi<StudentView>(`/api/mentor/students/${encodeURIComponent(studentId)}?from=${day}&to=${day}`).then((r) => {
      if (dead) return;
      if (r.ok) setView(r.data);
      else setError(r.error);
    });
    return () => { dead = true; };
  }, [open, view, studentId]);
  return (
    <CoachSheet open={open} onClose={onClose} title={tr("چیزهایی که می‌بینم", "What I can see")} size="sm">
      <CoachSheetBody>
        {view ? (
          <>
            <MentorStudentPrivacy privacy={view.privacy} modules={view.modules} scheduleHidden={view.routine.scheduleHidden} />
            <p className="cs-muted">{sleepShared ? tr("خواب هم دیده می‌شه", "Sleep is shared too") : tr("خواب خصوصیه", "Sleep is private")}</p>
          </>
        ) : error ? (
          <div className="form-inline-error" role="alert">{error}</div>
        ) : (
          <LoadingBlock />
        )}
      </CoachSheetBody>
    </CoachSheet>
  );
}

/** «تنظیم سطح دسترسی مربی» برای شاگرد: برنامه‌ها، جزئیات و خواب با پیش‌نمای زنده (یک ذخیره برای همه) */
export function CoachMineSheet({ open, onClose, mentorshipId, mentorName, active, onSleepChanged }: {
  open: boolean; onClose: () => void; mentorshipId: string; mentorName: string; active: boolean; shareSleep?: boolean; onSleepChanged: (v: boolean) => void;
}) {
  return (
    <CoachSheet open={open} onClose={onClose} title={tr("تنظیم سطح دسترسی مربی", "Coach access level")} size="lg">
      <CoachSheetBody>
        <MentorPrivacySettings mentorshipId={mentorshipId} mentorName={mentorName} active={active} onSaved={(p) => onSleepChanged(!!p.shareSleep)} />
      </CoachSheetBody>
    </CoachSheet>
  );
}
