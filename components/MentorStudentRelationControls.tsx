"use client";

import { useState } from "react";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { fa, mentorApi } from "./MentorDashKit";
import { MentorField } from "./MentorUI";
import { END_REASON_MAX, PAUSE_REASON_MAX } from "@/lib/mentorAvailability";

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
    if (reason.trim().length > max) { setError(`حداکثر ${fa(max)} حرف`); return; }
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
        dialog === "pause" ? `همکاری با ${name} موقتا متوقف بشه؟`
          : dialog === "resume" ? `همکاری با ${name} ادامه پیدا کنه؟`
          : `همکاری با ${name} تموم بشه؟`
      }
      hint={
        dialog === "pause" ? "گفت‌وگو و برنامه‌های فعلی می‌مونن؛ به شاگرد خبر می‌دیم که همکاری متوقفه."
          : dialog === "resume" ? "به شاگرد خبر می‌دیم که همکاری ادامه پیدا کرد."
          : "برنامه‌های در جریان لغو می‌شن و گفت‌وگو فقط برای دیدن پیام‌های قبلی می‌مونه."
      }
      confirmLabel={dialog === "pause" ? "توقف همکاری" : dialog === "resume" ? "ادامه‌ی همکاری" : "پایان همکاری"}
      danger={dialog === "end"}
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={close}
    >
      {dialog !== "resume" && (
        <MentorField
          label={dialog === "end" ? "دلیل پایان" : "دلیل توقف"} htmlFor="mrc-reason" optional
          hint={`به ${name} نشون داده می‌شه؛ حداکثر ${fa(dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX)} حرف`}
        >
          <textarea
            id="mrc-reason" className="wsearch-newform-name trade-glass-field" rows={2}
            maxLength={(dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX) + 20} value={reason}
            placeholder={dialog === "end" ? "مثلا «هدف دوره به نتیجه رسید»" : "مثلا «تا پایان امتحانات برنامه‌ی تازه نمی‌فرستم»"}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
          />
        </MentorField>
      )}
    </MentorConfirmDialog>
  );
}
