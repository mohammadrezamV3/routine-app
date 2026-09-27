"use client";

import "./mentor.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Program, ProgramTransitionAction } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import { LockBodyScroll } from "./LockBodyScroll";
import { Spinner } from "./Spinner";
import { MentorField } from "./MentorUI";

const NOTE_MAX = 1000;

type RespondAction = "reject" | "request_changes" | "cancel";

const COPY: Record<RespondAction, {
  title: string;
  hint: string;
  label: string | null;
  placeholder?: string;
  required: boolean;
  confirm: string;
  danger: boolean;
}> = {
  reject: {
    title: "رد برنامه",
    hint: "برنامه کنار گذاشته می‌شود و منتور دلیل رد را می‌بیند",
    label: "دلیل رد",
    placeholder: "مثلاً «با ساعت کاری‌ام هماهنگ نیست»",
    required: false,
    confirm: "رد برنامه",
    danger: true,
  },
  request_changes: {
    title: "درخواست تغییر",
    hint: "برنامه برای اصلاح به منتور برمی‌گردد و نسخه‌ی تازه دوباره برایت فرستاده می‌شود",
    label: "چه چیزی تغییر کند",
    placeholder: "مثلاً «روزهای تمرین را به ۳ روز در هفته کم کن»",
    required: true,
    confirm: "ارسال درخواست",
    danger: false,
  },
  cancel: {
    title: "لغو برنامه",
    hint: "برنامه متوقف و از روتین برداشته می‌شود؛ این کار برگشت‌پذیر نیست",
    label: null,
    required: false,
    confirm: "لغو برنامه",
    danger: true,
  },
};

/**
 * پاسخ به یک برنامه با یادداشت (رد / درخواستِ تغییر / لغو) —
 * POST /api/mentor-programs/[id]/transition. برای «درخواست تغییر» یادداشت
 * اجباری است و بدونش خطای زیرِ فیلد دیده می‌شود، نه درخواستِ بی‌فایده.
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
  const copy = COPY[action];
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const n = note.trim();
    if (copy.required && !n) { setFieldError("بنویس چه چیزی باید تغییر کند"); return; }
    if (n.length > NOTE_MAX) { setFieldError(`یادداشت حداکثر ${faNum(NOTE_MAX)} نویسه است`); return; }
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
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={() => !busy && onClose()} style={{ zIndex: 90 }} />
      <div className="modal-panel open mentor-modal" role="dialog" aria-modal="true" aria-label={copy.title} style={{ zIndex: 91, maxWidth: 440 }}>
        <div className="modal-head">
          <div className="modal-title">{copy.title}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
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
          <button type="button" className="account-outline-btn mentor-btn" onClick={onClose} disabled={busy}>انصراف</button>
          <button
            type="button"
            className={`${copy.danger ? "trade-danger-btn" : "trade-primary-btn"} mentor-btn`}
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Spinner size={14} /> : copy.confirm}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
