"use client";

import { useState } from "react";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { fa, mentorApi } from "./MentorDashKit";
import { MentorField } from "./MentorUI";
import { END_REASON_MAX, PAUSE_REASON_MAX } from "@/lib/mentorAvailability";
import { tr } from "@/lib/i18n";

export type StudentRelationDialog = "pause" | "resume" | "end";

/**
 * تایید توقف موقت، ادامه و پایان همکاری (با دلیل). از منوی سه‌نقطه‌ی صفحه‌ی
 * شاگرد باز می‌شود (open از والد می‌آید). پایان همکاری برنامه‌های در جریان
 * را لغو می‌کند.
 */
export function MentorStudentRelationControls({
  studentId, mentorshipId, name, open, onClose, onPaused, onEnded,
}: {
  studentId: string;
  mentorshipId: string;
  name: string;
  open: StudentRelationDialog | null;
  onClose: () => void;
  onPaused: (pausedAt: string | null, reason: string | null) => void;
  onEnded: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = open;

  function close() { if (!busy) { setReason(""); setError(null); onClose(); } }

  async function confirm() {
    if (busy || !dialog) return;
    const max = dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX;
    if (reason.trim().length > max) { setError(tr(`حداکثر ${fa(max)} حرف`, `At most ${fa(max)} characters`)); return; }
    setBusy(true);
    setError(null);
    const pauseUrl = `/api/mentor/students/${encodeURIComponent(studentId)}/pause`;
    if (dialog === "end") {
      const r = await mentorApi<unknown>(`/api/mentorships/${mentorshipId}`, { method: "PATCH", body: { action: "end", reason: reason.trim() || null } });
      setBusy(false);
      if (!r.ok) { setError(r.error); return; }
      setReason("");
      onClose();
      onEnded();
      return;
    }
    const r = dialog === "pause"
      ? await mentorApi<{ pausedAt: string; pauseReason: string | null }>(pauseUrl, { method: "POST", body: { reason: reason.trim() || null } })
      : await mentorApi<{ pausedAt: null; pauseReason: null }>(pauseUrl, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setReason("");
    onClose();
    onPaused(r.data.pausedAt, r.data.pauseReason);
  }

  if (!dialog) return null;
  return (
    <MentorConfirmDialog
      message={
        dialog === "pause" ? tr(`همکاری با ${name} موقتا متوقف بشه؟`, `Pause working with ${name}?`)
          : dialog === "resume" ? tr(`همکاری با ${name} ادامه پیدا کنه؟`, `Resume working with ${name}?`)
          : tr(`همکاری با ${name} تموم بشه؟`, `End working with ${name}?`)
      }
      hint={
        dialog === "pause" ? tr("گفت‌وگو و برنامه‌های فعلی می‌مونن؛ به شاگرد خبر می‌دیم که همکاری متوقفه.", "The chat and current programs stay. We will let the student know you paused.")
          : dialog === "resume" ? tr("به شاگرد خبر می‌دیم که همکاری ادامه پیدا کرد.", "We will let the student know you are back on.")
          : tr("برنامه‌های در جریان لغو می‌شن و گفت‌وگو فقط برای دیدن پیام‌های قبلی می‌مونه.", "Programs in progress are cancelled, and the chat stays only so you can read earlier messages.")
      }
      confirmLabel={dialog === "pause" ? tr("توقف همکاری", "Pause") : dialog === "resume" ? tr("ادامه‌ی همکاری", "Resume") : tr("پایان همکاری", "End")}
      danger={dialog === "end"}
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={close}
    >
      {dialog !== "resume" && (
        <MentorField
          label={dialog === "end" ? tr("دلیل پایان", "Reason for ending") : tr("دلیل توقف", "Reason for pausing")} htmlFor="mrc-reason" optional
          hint={tr(`به ${name} نشون داده می‌شه؛ حداکثر ${fa(dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX)} حرف`, `${name} will see this; at most ${fa(dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX)} characters`)}
        >
          <textarea
            id="mrc-reason" className="wsearch-newform-name trade-glass-field" rows={2}
            maxLength={(dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX) + 20} value={reason}
            placeholder={dialog === "end" ? tr("مثلا «هدف دوره به نتیجه رسید»", "For example: \"We reached the goal of the course\"") : tr("مثلا «تا پایان امتحانات برنامه‌ی تازه نمی‌فرستم»", "For example: \"No new programs until exams are over\"")}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
          />
        </MentorField>
      )}
    </MentorConfirmDialog>
  );
}
