"use client";

// شیت‌های تنبل فضای همکاری (یادداشت، برچسب، چیزهایی که می‌بینم، چی می‌بینه). با next/dynamic لود کن.
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
import { TickOption } from "./TickOption";
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

/** «چی می‌بینه؟» برای شاگرد: تیک خواب (ذخیره‌ی فوری) + تنظیمات قبلی برنامه‌ها و جزئیات */
export function CoachMineSheet({ open, onClose, mentorshipId, mentorName, active, shareSleep, onSleepChanged }: {
  open: boolean; onClose: () => void; mentorshipId: string; mentorName: string; active: boolean; shareSleep: boolean; onSleepChanged: (v: boolean) => void;
}) {
  const [sleep, setSleep] = useState(shareSleep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // MentorPrivacySettings کل پیش‌نویسش رو با ذخیره می‌فرسته؛ بعد از تغییر خواب دوباره خونده می‌شه تا مقدار قدیمی رو برنگردونه
  const [rev, setRev] = useState(0);
  useEffect(() => setSleep(shareSleep), [shareSleep]);

  async function toggleSleep(v: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSleep(v);
    const r = await mentorApi<unknown>(`/api/mentorships/${mentorshipId}/privacy`, { method: "PUT", body: { shareSleep: v } });
    setBusy(false);
    if (!r.ok) { setSleep(!v); setError(r.error); return; }
    onSleepChanged(v);
    setRev((n) => n + 1);
  }

  return (
    <CoachSheet open={open} onClose={onClose} title={tr(`${mentorName} چی می‌بینه؟`, `What can ${mentorName} see?`)} size="md">
      <CoachSheetBody>
        <TickOption checked={sleep} onChange={toggleSleep} disabled={busy}>{tr("خواب", "Sleep")}</TickOption>
        {error && <div className="form-inline-error" role="alert">{error}</div>}
        <MentorPrivacySettings key={rev} mentorshipId={mentorshipId} mentorName={mentorName} active={active} />
      </CoachSheetBody>
    </CoachSheet>
  );
}
