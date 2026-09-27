"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import type { Program, ProgramTransitionAction } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { LockBodyScroll } from "./LockBodyScroll";

const NOTE_MAX = 1000;

const COPY: Record<"reject" | "request_changes" | "cancel", { title: string; hint: string; label: string; required: boolean; confirm: string }> = {
  reject: {
    title: "ردِ برنامه",
    hint: "برنامه کنار گذاشته می‌شود و منتور دلیلت را می‌بیند.",
    label: "دلیل (اختیاری)",
    required: false,
    confirm: "رد کن",
  },
  request_changes: {
    title: "درخواستِ تغییر",
    hint: "برنامه به منتور برمی‌گردد تا اصلاحش کند و نسخه‌ی تازه بفرستد. بنویس دقیقا چه چیزی باید عوض شود.",
    label: "چه چیزی باید تغییر کند؟",
    required: true,
    confirm: "ارسالِ درخواست",
  },
  cancel: {
    title: "لغوِ برنامه",
    hint: "برنامه متوقف می‌شود و اگر در روتینت آمده بود از آن برداشته می‌شود. این کار برگشت‌پذیر نیست.",
    label: "",
    required: false,
    confirm: "لغوِ برنامه",
  },
};

/**
 * پاسخ به یک برنامه با یادداشت (رد / درخواستِ تغییر / لغو) —
 * POST /api/mentor-programs/[id]/transition. برای «درخواست تغییر» یادداشت
 * اجباری است و بدونش دکمه خطای اعتبارسنجی نشان می‌دهد، نه درخواستِ بی‌فایده.
 */
export function ProgramRespondModal({
  programId,
  action,
  onClose,
  onDone,
}: {
  programId: string;
  action: "reject" | "request_changes" | "cancel";
  onClose: () => void;
  onDone: (program: Program | null) => void;
}) {
  const copy = COPY[action];
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const n = note.trim();
    if (copy.required && !n) { setError("این بخش را خالی نگذار — منتور باید بداند چه چیزی را عوض کند"); return; }
    if (n.length > NOTE_MAX) { setError("یادداشت خیلی طولانی است"); return; }
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
      <div className="modal-panel open mentor-modal" role="dialog" aria-modal="true" style={{ zIndex: 91, maxWidth: 440 }}>
        <div className="modal-head">
          <div className="modal-title">{copy.title}</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن" disabled={busy}><X size={16} /></button>
        </div>
        <p className="mentor-muted" style={{ margin: 0 }}>{copy.hint}</p>
        {copy.label && (
          <>
            <label className="exercise-form-label" htmlFor="program-note">{copy.label}</label>
            <textarea
              id="program-note"
              className="wsearch-newform-name trade-glass-field"
              rows={4}
              value={note}
              maxLength={NOTE_MAX + 50}
              onChange={(e) => { setNote(e.target.value); setError(null); }}
              aria-invalid={!!error}
            />
          </>
        )}
        {error && <div className="trade-form-error">{error}</div>}
        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose} disabled={busy}>انصراف</button>
          <button type="button" className={action === "request_changes" ? "trade-primary-btn" : "trade-danger-btn"} onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={14} className="trade-spin" /> : copy.confirm}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
