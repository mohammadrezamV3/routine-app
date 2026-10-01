"use client";

import { MentorList, MentorListItem } from "./MentorMotion";
import { useState } from "react";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorField, MentorSection } from "./MentorUI";
import { LABELS_MAX, LABEL_NAME_MAX } from "@/lib/mentorAvailability";
import type { StudentLabel } from "@/lib/mentorTypes";

const ic = (Icon: typeof Tag, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * برچسب‌های خصوصی منتور برای دسته‌بندی شاگردها (ساخت، تغییر نام، حذف).
 * هر اقدام فورا ذخیره می‌شود؛ شاگرد هیچ‌وقت برچسب‌ها را نمی‌بیند.
 */
export function MentorLabelManager({ initial }: { initial: StudentLabel[] }) {
  const [labels, setLabels] = useState<StudentLabel[]>(initial);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState<StudentLabel | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(e?: React.FormEvent) {
    e?.preventDefault();
    const v = name.replace(/\s+/g, " ").trim();
    if (!v || busy) return;
    if (v.length > LABEL_NAME_MAX) { setError(`نام برچسب حداکثر ${fa(LABEL_NAME_MAX)} نویسه است`); return; }
    setBusy("add");
    setError(null);
    const r = await mentorApi<{ labels: StudentLabel[] }>("/api/mentor/labels", { method: "POST", body: { name: v } });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setLabels(r.data.labels);
    setName("");
  }

  async function rename() {
    if (!editing || busy) return;
    const v = editing.name.replace(/\s+/g, " ").trim();
    if (!v) { setError("نام برچسب را بنویس"); return; }
    setBusy(editing.id);
    setError(null);
    const r = await mentorApi<{ labels: StudentLabel[] }>(`/api/mentor/labels/${editing.id}`, { method: "PATCH", body: { name: v } });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setLabels(r.data.labels);
    setEditing(null);
  }

  async function remove(l: StudentLabel) {
    setBusy(l.id);
    setError(null);
    const r = await mentorApi<{ labels: StudentLabel[] }>(`/api/mentor/labels/${l.id}`, { method: "DELETE" });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setLabels(r.data.labels);
    setConfirm(null);
  }

  return (
    <MentorSection
      id="labels" title="برچسب شاگردها" icon={ic(Tag, MI.section)} count={labels.length ? fa(labels.length) : undefined}
    >
      {labels.length === 0 ? (
        <MentorEmpty>هنوز برچسبی نساخته‌ای</MentorEmpty>
      ) : (
        <div className="mentor-list">
          <MentorList>
          {labels.map((l) => <MentorListItem key={l.id}>{editing?.id === l.id ? (
            <div className="mentor-row">
              <input
                type="text" className="wsearch-newform-name trade-glass-field" aria-label="نام برچسب" autoFocus
                maxLength={LABEL_NAME_MAX + 10} value={editing.name}
                onChange={(e) => setEditing({ id: l.id, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); rename(); } if (e.key === "Escape") setEditing(null); }}
              />
              <span className="mentor-row-end">
                <button type="button" className="trade-icon-btn" aria-label="انصراف" onClick={() => { setEditing(null); setError(null); }}>{ic(X, MI.btnSm)}</button>
                <button type="button" className="trade-icon-btn" aria-label="ذخیره‌ی نام" onClick={rename} disabled={!!busy}>
                  {busy === l.id ? <Spinner size={14} /> : ic(Check, MI.btnSm)}
                </button>
              </span>
            </div>
          ) : (
            <div className="mentor-row">
              <span className="mentor-row-body"><span className="mentor-row-title">{l.name}</span></span>
              <span className="mentor-row-end">
                <button type="button" className="trade-icon-btn" aria-label={`تغییر نام ${l.name}`} onClick={() => { setError(null); setEditing({ id: l.id, name: l.name }); }}>
                  {ic(Pencil, MI.btnSm)}
                </button>
                <button type="button" className="trade-icon-btn" aria-label={`حذف ${l.name}`} onClick={() => { setError(null); setConfirm(l); }}>
                  {ic(Trash2, MI.btnSm)}
                </button>
              </span>
            </div>
          )}</MentorListItem>)}
          </MentorList>
        </div>
      )}

      {labels.length < LABELS_MAX && (
        <form onSubmit={add} noValidate className="mentor-form" style={{ paddingTop: "var(--m-3)" }}>
          <MentorField label="برچسب جدید" htmlFor="ml-new" hint={`حداکثر ${fa(LABELS_MAX)} برچسب`}>
            <div className="mentor-inline-add">
              <input
                id="ml-new" type="text" className="wsearch-newform-name trade-glass-field" maxLength={LABEL_NAME_MAX + 10}
                value={name} placeholder="مثلا کنکور 1406"
                onChange={(e) => { setName(e.target.value); setError(null); }}
              />
              <button type="submit" className="account-outline-btn mentor-btn" disabled={!name.trim() || !!busy}>
                {busy === "add" ? <Spinner size={14} /> : <>{ic(Plus, MI.btn)} افزودن</>}
              </button>
            </div>
          </MentorField>
        </form>
      )}
      {error && !confirm && <div className="form-inline-error" role="alert">{error}</div>}

      {confirm && (
        <MentorConfirmDialog
          message={`برچسب «${confirm.name}» حذف شود؟`}
          hint="برچسب از روی همه‌ی شاگردها برداشته می‌شود."
          confirmLabel="حذف برچسب"
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
