"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, LayoutTemplate } from "lucide-react";
import { MI, MI_STROKE } from "./MentorUI";
import { MentorTemplateSaveDialog } from "./MentorTemplateSaveDialog";
import { exportCsvUrl } from "@/lib/mentorToolsTypes";
import { tr } from "@/lib/i18n";

const ic = (Icon: typeof Copy, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * ابزارهای یک برنامه برای منتور سازنده‌اش: ذخیره به‌عنوان قالب، کپی برای
 * شاگرد (همان شاگرد برای دوره‌ی بعد یا شاگرد دیگر) و دریافت CSV پیشرفت.
 * مستقل است؛ هر صفحه‌ای که برنامه را به منتور نشان می‌دهد می‌تواند سوارش کند:
 *   <MentorProgramTools programId={p.id} title={p.title} studentId={studentId} />
 */
export function MentorProgramTools({
  programId, title, studentId, showExport = true,
}: {
  programId: string;
  title: string;
  studentId?: string | null;
  showExport?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mv2-pg-tools" role="group" aria-label={tr("کارهای بیشتر روی برنامه", "More program actions")}>
      <div className="mentor-btn-group">
        <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setSaving(true)}>
          {saved ? <>{ic(Check, MI.btnSm)} {tr("قالب ذخیره شد", "Template saved")}</> : <>{ic(LayoutTemplate, MI.btnSm)} {tr("ذخیره به‌عنوان قالب", "Save as template")}</>}
        </button>
        <Link href={`/mentor/programs/${programId}/duplicate`} prefetch={false} className="account-outline-btn mentor-btn is-sm">
          {ic(Copy, MI.btnSm)} {tr("کپی برای شاگرد", "Copy for a student")}
        </Link>
        {showExport && studentId && (
          <a href={exportCsvUrl(studentId)} download className="account-outline-btn mentor-btn is-sm">
            {ic(Download, MI.btnSm)} {tr("خروجی CSV", "Export CSV")}
          </a>
        )}
      </div>
      {saving && (
        <MentorTemplateSaveDialog
          defaultName={title}
          programId={programId}
          onClose={() => setSaving(false)}
          onSaved={() => { setSaved(true); setTimeout(() => setSaved(false), 2400); }}
        />
      )}
    </div>
  );
}
