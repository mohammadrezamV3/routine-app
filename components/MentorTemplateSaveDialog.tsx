"use client";

import { useState } from "react";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorField } from "./MentorUI";
import { mentorApi } from "./MentorDashKit";
import type { TemplateRow } from "@/lib/mentorToolsTypes";

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
    if (!n) { setError("نام قالب لازم است"); return; }
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
      message="ذخیره به‌عنوان قالب"
      hint="آیتم‌ها، توضیح و یادداشت ذخیره می‌شود؛ شاگرد و تاریخ‌ها نه"
      confirmLabel="ذخیره‌ی قالب"
      danger={false}
      busy={busy}
      error={error}
      onConfirm={save}
      onCancel={onClose}
    >
      <div className="mentor-form" style={{ marginTop: "var(--m-3)" }}>
        <MentorField label="نام قالب" htmlFor="tpl-save-name">
          <input
            id="tpl-save-name" type="text" className="wsearch-newform-name trade-glass-field" maxLength={NAME_MAX}
            value={name} placeholder="مثلا حجم 8 هفته‌ای مبتدی" autoFocus
            onChange={(e) => { setName(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
          />
        </MentorField>
      </div>
    </MentorConfirmDialog>
  );
}
