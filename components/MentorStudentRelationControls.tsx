"use client";

import { useState } from "react";
import { CirclePause, CirclePlay, LogOut } from "lucide-react";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { Spinner } from "./Spinner";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorField } from "./MentorUI";
import { fmtDate } from "@/lib/mentorFormat";
import { END_REASON_MAX, PAUSE_REASON_MAX } from "@/lib/mentorAvailability";

const ic = (Icon: typeof LogOut, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type Dialog = "pause" | "resume" | "end" | null;

/**
 * کنترل‌های رابطه از سمت منتور، پایین صفحه‌ی شاگرد:
 * توقف موقت (با دلیل اختیاری که به شاگرد نشان داده می‌شود)، ادامه، و
 * پایان رابطه با دلیل. پایان برنامه‌های در جریان را لغو می‌کند.
 */
export function MentorStudentRelationControls({
  studentId, mentorshipId, name, pausedAt, pauseReason, onPaused, onEnded,
}: {
  studentId: string;
  mentorshipId: string;
  name: string;
  pausedAt: string | null;
  pauseReason: string | null;
  onPaused: (pausedAt: string | null, reason: string | null) => void;
  onEnded: () => void;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(d: Dialog) { setDialog(d); setReason(""); setError(null); }

  async function confirm() {
    if (busy || !dialog) return;
    const max = dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX;
    if (reason.trim().length > max) { setError(`حداکثر ${fa(max)} نویسه`); return; }
    setBusy(true);
    setError(null);
    const pauseUrl = `/api/mentor/students/${encodeURIComponent(studentId)}/pause`;
    if (dialog === "end") {
      const r = await mentorApi<unknown>(`/api/mentorships/${mentorshipId}`, { method: "PATCH", body: { action: "end", reason: reason.trim() || null } });
      setBusy(false);
      if (!r.ok) { setError(r.error); return; }
      setDialog(null);
      onEnded();
      return;
    }
    const r = dialog === "pause"
      ? await mentorApi<{ pausedAt: string; pauseReason: string | null }>(pauseUrl, { method: "POST", body: { reason: reason.trim() || null } })
      : await mentorApi<{ pausedAt: null; pauseReason: null }>(pauseUrl, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setDialog(null);
    onPaused(r.data.pausedAt, r.data.pauseReason);
  }

  return (
    <>
      <div className="mentor-danger-zone">
        {pausedAt && (
          <div className="mentor-pause-state">
            <MentorChip tone="neutral" icon={ic(CirclePause, MI.chip)} title={pauseReason ?? undefined}>متوقف از {fmtDate(pausedAt)}</MentorChip>
            {pauseReason && <span className="mentor-muted">{pauseReason}</span>}
          </div>
        )}
        {pausedAt ? (
          <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => open("resume")}>
            {ic(CirclePlay, MI.btnSm)} ادامه‌ی همکاری
          </button>
        ) : (
          <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => open("pause")}>
            {ic(CirclePause, MI.btnSm)} توقف موقت
          </button>
        )}
        <button type="button" className="trade-danger-btn mentor-btn is-sm" onClick={() => open("end")}>
          {ic(LogOut, MI.btnSm)} پایان رابطه
        </button>
      </div>

      {dialog && (
        <MentorConfirmDialog
          message={
            dialog === "pause" ? `همکاری با ${name} موقتا متوقف شود؟`
              : dialog === "resume" ? `همکاری با ${name} ادامه پیدا کند؟`
              : `رابطه با ${name} پایان یابد؟`
          }
          hint={
            dialog === "pause" ? "گفت‌وگو و برنامه‌های فعلی می‌مانند؛ به شاگرد اعلام می‌شود که همکاری متوقف است."
              : dialog === "resume" ? "به شاگرد اعلام می‌شود که همکاری از سر گرفته شد."
              : "برنامه‌های در جریان لغو می‌شوند؛ گفت‌وگو فقط‌خواندنی می‌ماند."
          }
          confirmLabel={dialog === "pause" ? "توقف همکاری" : dialog === "resume" ? "ادامه‌ی همکاری" : "پایان رابطه"}
          danger={dialog === "end"}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={() => { if (!busy) { setDialog(null); setError(null); } }}
        >
          {dialog !== "resume" && (
            <MentorField
              label={dialog === "end" ? "دلیل پایان" : "دلیل توقف"} htmlFor="mrc-reason" optional
              hint={`به ${name} نمایش داده می‌شود؛ حداکثر ${fa(dialog === "end" ? END_REASON_MAX : PAUSE_REASON_MAX)} نویسه`}
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
      )}
    </>
  );
}
