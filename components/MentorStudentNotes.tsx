"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorSection } from "./MentorUI";
import { fmtDateTime } from "@/lib/mentorFormat";
import { NOTE_MAX } from "@/lib/mentorAvailability";
import type { StudentNote } from "@/lib/mentorTypes";
import type { Identity } from "@/lib/e2ee/client";
import { openNote, sealNote, type OpenedNote } from "@/lib/e2ee/notes";
import { MentorE2EEGate } from "./MentorE2EEGate";

const ic = (Icon: typeof Pencil, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * یادداشت‌های خصوصیِ منتور درباره‌ی یک شاگرد — فهرستِ زمان‌دار، تازه‌ترین
 * بالا. فقط خودِ منتور می‌بیند؛ شاگرد هیچ راهی به این داده ندارد.
 *
 * رمزگذاریِ سرتاسری «فقط برای خودم» (agent D — lib/e2ee/notes.ts): متن روی همین
 * دستگاه با کلیدِ منتور رمز می‌شود و سرور فقط پاکتِ رمزشده می‌گیرد. تا کلید روی
 * دستگاه باز نشده، MentorE2EEGate فرمِ باز کردن را نشان می‌دهد.
 */
export function MentorStudentNotes({ studentId, initial }: { studentId: string; initial: StudentNote[] }) {
  return (
    <MentorE2EEGate context="notes">
      {(identity) => <NotesBody key={`${identity.userId}:${identity.version}`} identity={identity} studentId={studentId} initial={initial} />}
    </MentorE2EEGate>
  );
}

function NotesBody({ identity, studentId, initial }: { identity: Identity; studentId: string; initial: StudentNote[] }) {
  const base = `/api/mentor/students/${encodeURIComponent(studentId)}/notes`;
  const [notes, setNotes] = useState<StudentNote[]>(initial);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [confirm, setConfirm] = useState<StudentNote | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<string, OpenedNote>>({});
  const migrating = useRef(false);

  // رمزگشاییِ یادداشت‌ها روی همین دستگاه
  useEffect(() => {
    let cancelled = false;
    const todo = notes.filter((n) => !opened[n.id] || opened[n.id].kind === "failed");
    if (todo.length === 0) return;
    (async () => {
      const out: Record<string, OpenedNote> = {};
      for (const n of todo) out[n.id] = await openNote(identity, studentId, n.body);
      if (!cancelled) setOpened((prev) => ({ ...prev, ...out }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, identity, studentId]);

  // یادداشت‌های قدیمیِ متن‌ساده (پیش از رمزگذاری) بی‌صدا بازرمز می‌شوند
  useEffect(() => {
    if (migrating.current) return;
    const legacy = notes.filter((n) => opened[n.id]?.kind === "legacy");
    if (legacy.length === 0) return;
    migrating.current = true;
    (async () => {
      for (const n of legacy) {
        const text = (opened[n.id] as { text: string }).text;
        const r = await mentorApi<{ note: StudentNote }>(`${base}/${n.id}`, { method: "PATCH", body: { body: await sealNote(identity, studentId, text) } });
        if (!r.ok) break;
        setOpened((prev) => ({ ...prev, [n.id]: { kind: "text", text } }));
        setNotes((xs) => xs.map((x) => (x.id === n.id ? r.data.note : x)));
      }
      migrating.current = false;
    })();
  }, [notes, opened, base, identity, studentId]);

  const textOf = (n: StudentNote): string | null => {
    const o = opened[n.id];
    return o && (o.kind === "text" || o.kind === "legacy") ? o.text : null;
  };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    if (body.length > NOTE_MAX) { setError(`یادداشت حداکثر ${fa(NOTE_MAX)} نویسه است`); return; }
    setBusy("add");
    setError(null);
    const r = await mentorApi<{ note: StudentNote }>(base, { method: "POST", body: { body: await sealNote(identity, studentId, body) } });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setOpened((prev) => ({ ...prev, [r.data.note.id]: { kind: "text", text: body } }));
    setNotes((xs) => [r.data.note, ...xs]);
    setDraft("");
  }

  async function saveEdit() {
    if (!editing || busy) return;
    const body = editing.body.trim();
    if (!body) { setError("متن یادداشت را بنویس"); return; }
    setBusy(editing.id);
    setError(null);
    const r = await mentorApi<{ note: StudentNote }>(`${base}/${editing.id}`, { method: "PATCH", body: { body: await sealNote(identity, studentId, body) } });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setOpened((prev) => ({ ...prev, [r.data.note.id]: { kind: "text", text: body } }));
    setNotes((xs) => xs.map((n) => (n.id === r.data.note.id ? r.data.note : n)));
    setEditing(null);
  }

  async function remove(n: StudentNote) {
    setBusy(n.id);
    setError(null);
    const r = await mentorApi<{ ok: true }>(`${base}/${n.id}`, { method: "DELETE" });
    setBusy(null);
    if (!r.ok && r.status !== 404) { setError(r.error); return; }
    setNotes((xs) => xs.filter((x) => x.id !== n.id));
    setConfirm(null);
  }

  return (
    <MentorSection
      title="یادداشت‌های خصوصی" icon={ic(NotebookPen, MI.section)} count={notes.length ? fa(notes.length) : undefined}
      desc="فقط خودت می‌بینی؛ روی دستگاه تو رمز می‌شود و شاگرد، آریون و ادمین‌ها به آن دسترسی ندارند"
    >
      <form onSubmit={add} noValidate className="mentor-form" style={{ gap: "var(--m-2)" }}>
        <textarea
          className="wsearch-newform-name trade-glass-field" rows={2} maxLength={NOTE_MAX + 50} aria-label="یادداشت جدید"
          value={draft} placeholder="مثلاً «هفته‌ی امتحانات؛ حجم برنامه را کم کن»"
          onChange={(e) => { setDraft(e.target.value); setError(null); }}
        />
        <div className="mentor-btn-group is-end">
          <button type="submit" className="account-outline-btn mentor-btn is-sm" disabled={!draft.trim() || !!busy}>
            {busy === "add" ? <Spinner size={14} /> : <>{ic(Plus, MI.btnSm)} افزودن یادداشت</>}
          </button>
        </div>
      </form>
      {error && !confirm && <div className="form-inline-error" role="alert">{error}</div>}

      {notes.length === 0 ? (
        <MentorEmpty>هنوز یادداشتی ننوشته‌ای</MentorEmpty>
      ) : (
        <div className="mentor-list mentor-notes">
          {notes.map((n) => (
            <div key={n.id} className="mentor-feedback">
              <div className="mentor-feedback-head">
                <span>{fmtDateTime(n.createdAt)}</span>
                {n.updatedAt && new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime() > 60_000 && <span>ویرایش‌شده</span>}
                {editing?.id !== n.id && (
                  <span className="mentor-note-actions">
                    {textOf(n) !== null && (
                      <button type="button" className="trade-icon-btn" aria-label="ویرایش یادداشت" onClick={() => { setError(null); setEditing({ id: n.id, body: textOf(n) ?? "" }); }}>
                        {ic(Pencil, MI.btnSm)}
                      </button>
                    )}
                    <button type="button" className="trade-icon-btn" aria-label="حذف یادداشت" onClick={() => { setError(null); setConfirm(n); }}>
                      {ic(Trash2, MI.btnSm)}
                    </button>
                  </span>
                )}
              </div>
              {editing?.id === n.id ? (
                <div className="mentor-form" style={{ gap: "var(--m-2)", marginTop: "var(--m-2)" }}>
                  <textarea
                    className="wsearch-newform-name trade-glass-field" rows={3} maxLength={NOTE_MAX + 50} aria-label="متن یادداشت" autoFocus
                    value={editing.body} onChange={(e) => setEditing({ id: n.id, body: e.target.value })}
                  />
                  <div className="mentor-btn-group is-end">
                    <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { setEditing(null); setError(null); }}>انصراف</button>
                    <button type="button" className="trade-primary-btn mentor-btn is-sm" onClick={saveEdit} disabled={!!busy}>
                      {busy === n.id ? <Spinner size={14} /> : "ذخیره"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mentor-feedback-body">
                  {!opened[n.id] ? <Spinner size={14} />
                    : textOf(n) !== null ? textOf(n)
                    : opened[n.id].kind === "old-key" ? <span className="mentor-msg-unreadable">این یادداشت با کلید قبلی رمز شده و دیگر خوانده نمی‌شود</span>
                    : <span className="mentor-msg-unreadable">این یادداشت رمزگشایی نشد</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <MentorConfirmDialog
          message="این یادداشت حذف شود؟"
          hint="یادداشت حذف‌شده برنمی‌گردد."
          confirmLabel="حذف یادداشت"
          danger
          busy={busy === confirm.id}
          error={error}
          onConfirm={() => remove(confirm)}
          onCancel={() => { setConfirm(null); setError(null); }}
        />
      )}
    </MentorSection>
  );
}
