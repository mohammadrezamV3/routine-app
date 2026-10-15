"use client";

import { useState } from "react";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorField } from "./MentorUI";
import { mentorApi } from "./MentorDashKit";
import type { TemplateRow } from "@/lib/mentorToolsTypes";
import { tr } from "@/lib/i18n";

const NAME_MAX = 80;

/**
 * «ذخیره به‌عنوان قالب» — نام قالب را می‌گیرد و از یک برنامه‌ی ذخیره‌شده
 * (`programId`) یا محتوای فعلی ویرایشگر (`program`) قالب می‌سازد. تاریخ‌ها
 * در قالب نمی‌مانند؛ فقط طول بازه.
 */
export function MentorTemplateSaveDialog({
  defaultName, programId, program, onClose, onSaved,
}: {
  defaultName: string;
  programId?: string;
  program?: Record<string, unknown>;
  onClose: () => void;
  onSaved?: (t: TemplateRow) => void;
}) {
  const [name, setName] = useState(defaultName.slice(0, NAME_MAX));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    const n = name.trim();
    if (!n) { setError(tr("اسم قالب لازمه", "A template name is required")); return; }
    setBusy(true);
    setError(null);
    const r = await mentorApi<{ template: TemplateRow }>("/api/mentor/templates", {
      method: "POST",
      body: programId ? { name: n, programId } : { name: n, program },
    });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    onSaved?.(r.data.template);
    onClose();
  }

  return (
    <MentorConfirmDialog
      message={tr("ذخیره به‌عنوان قالب", "Save as template")}
      hint={tr("کارها، توضیح و یادداشت ذخیره می‌شه؛ شاگرد و تاریخ‌ها نه", "Tasks, description and note are saved; the student and dates are not")}
      confirmLabel={tr("ذخیره‌ی قالب", "Save template")}
      danger={false}
      busy={busy}
      error={error}
      onConfirm={save}
      onCancel={onClose}
    >
      <div className="mentor-form" style={{ marginTop: "var(--m-3)" }}>
        <MentorField label={tr("اسم قالب", "Template name")} htmlFor="tpl-save-name">
          <input
            id="tpl-save-name" type="text" className="wsearch-newform-name trade-glass-field" maxLength={NAME_MAX}
            value={name} placeholder={tr("مثلا حجم 8 هفته‌ای مبتدی", "For example: 8-week beginner volume")} autoFocus
            onChange={(e) => { setName(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
          />
        </MentorField>
      </div>
    </MentorConfirmDialog>
  );
}
