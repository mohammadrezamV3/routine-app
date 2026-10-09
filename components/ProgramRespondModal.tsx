"use client";

import "./mentor.css";
import { useEffect, useState } from "react";
import type { Program, ProgramTransitionAction } from "@/lib/mentorTypes";
import { networkError, readApiError } from "@/lib/mentorFormat";
import { tr } from "@/lib/i18n";
import { faNum } from "@/lib/jalali";
import { Spinner } from "./Spinner";
import { MentorField } from "./MentorUI";
import { MentorSheet } from "./MentorMotion";

const NOTE_MAX = 1000;

type RespondAction = "reject" | "request_changes" | "cancel";

const copyFor = (): Record<RespondAction, {
  title: string;
  hint: string;
  label: string | null;
  placeholder?: string;
  required: boolean;
  confirm: string;
  danger: boolean;
}> => ({
  reject: {
    title: tr("نه، این برنامه رو نمی‌خوام", "No, I don't want this program"),
    hint: tr("برنامه کنار گذاشته می‌شه و مربی دلیلش رو می‌بینه", "The program is set aside and your mentor sees your reason"),
    label: tr("دلیلش چیه", "What's the reason"),
    placeholder: tr("مثلا «با ساعت کاری‌ام هماهنگ نیست»", "For example: \"It doesn't fit my work hours\""),
    required: false,
    confirm: tr("نه، نمی‌خوام", "No, I don't want it"),
    danger: true,
  },
  request_changes: {
    title: tr("تغییر بخواه", "Ask for changes"),
    hint: tr("برنامه برای اصلاح پیش مربی برمی‌گرده و دوباره برات فرستاده می‌شه", "The program goes back to your mentor to be adjusted and is then sent to you again"),
    label: tr("چی عوض بشه", "What should change"),
    placeholder: tr("مثلا «روزهای تمرین را به 3 روز در هفته کم کن»", "For example: \"Reduce training to 3 days a week\""),
    required: true,
    confirm: tr("ارسال درخواست", "Send request"),
    danger: false,
  },
  cancel: {
    title: tr("لغو برنامه", "Cancel program"),
    hint: tr("برنامه متوقف و از روتینت برداشته می‌شه؛ برگشتی نداره", "The program is stopped and removed from your routine. This can't be undone"),
    label: null,
    required: false,
    confirm: tr("لغو برنامه", "Cancel program"),
    danger: true,
  },
});

/**
 * پاسخ به یک برنامه با یادداشت (رد / درخواست تغییر / لغو) —
 * POST /api/mentor-programs/[id]/transition. برای «درخواست تغییر» یادداشت
 * اجباری است و بدونش خطای زیر فیلد دیده می‌شود، نه درخواست بی‌فایده.
 */
export function ProgramRespondModal({
  programId,
  action,
  onClose,
  onDone,
}: {
  programId: string;
  action: RespondAction;
  onClose: () => void;
  onDone: (program: Program | null) => void;
}) {
  const copy = copyFor()[action];
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // بستن با انیمیشن شیت؛ والد پس از پایان آن باخبر می‌شود
  const [open, setOpen] = useState(true);
  const close = () => { if (!busy) setOpen(false); };
  useEffect(() => {
    if (open) return;
    const t = setTimeout(onClose, 180);
    return () => clearTimeout(t);
  }, [open, onClose]);

  async function submit() {
    const n = note.trim();
    if (copy.required && !n) { setFieldError(tr("بنویس چی باید عوض بشه", "Write what should change")); return; }
    if (n.length > NOTE_MAX) { setFieldError(tr(`یادداشت حداکثر ${faNum(NOTE_MAX)} حرف می‌شه`, `The note can be up to ${faNum(NOTE_MAX)} characters`)); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${programId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action as ProgramTransitionAction, note: n || undefined }),
      });
      if (!res.ok) { setError(await readApiError(res)); return; }
      const d = await res.json().catch(() => null);
      onDone(d?.program ?? null);
    } catch {
      setError(networkError());
    } finally {
      setBusy(false);
    }
  }

  return (
    <MentorSheet open={open} onClose={close} title={copy.title} size="sm" dismissible={!busy}>
        <div className="mentor-form">
          <p className="mentor-muted">{copy.hint}</p>
          {copy.label && (
            <MentorField label={copy.label} htmlFor="program-note" optional={!copy.required} error={fieldError}>
              <textarea
                id="program-note"
                className="wsearch-newform-name trade-glass-field"
                rows={4}
                value={note}
                maxLength={NOTE_MAX + 50}
                placeholder={copy.placeholder}
                onChange={(e) => { setNote(e.target.value); setFieldError(null); }}
                aria-invalid={!!fieldError}
              />
            </MentorField>
          )}
        </div>
        {error && <div className="form-inline-error" role="alert">{error}</div>}
        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn mentor-btn" onClick={close} disabled={busy}>{tr("انصراف", "Cancel")}</button>
          <button
            type="button"
            className={`${copy.danger ? "trade-danger-btn" : "trade-primary-btn"} mentor-btn`}
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Spinner size={14} /> : copy.confirm}
          </button>
        </div>
    </MentorSheet>
  );
}
