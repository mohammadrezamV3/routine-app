"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, LayoutTemplate, Wrench } from "lucide-react";
import { MI, MI_STROKE, MentorSection } from "./MentorUI";
import { MentorTemplateSaveDialog } from "./MentorTemplateSaveDialog";
import { exportCsvUrl } from "@/lib/mentorToolsTypes";

const ic = (Icon: typeof Copy, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * ابزارهای یک برنامه برای منتورِ سازنده‌اش: ذخیره به‌عنوان قالب، کپی برای
 * شاگرد (همان شاگرد برای دوره‌ی بعد یا شاگردِ دیگر) و دریافتِ CSVِ پیشرفت.
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
    <MentorSection title="ابزار برنامه" icon={ic(Wrench, MI.section)}>
      <div className="mentor-btn-group">
        <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setSaving(true)}>
          {saved ? <>{ic(Check, MI.btnSm)} قالب ذخیره شد</> : <>{ic(LayoutTemplate, MI.btnSm)} ذخیره به‌عنوان قالب</>}
        </button>
        <Link href={`/mentor/programs/${programId}/duplicate`} prefetch={false} className="account-outline-btn mentor-btn is-sm">
          {ic(Copy, MI.btnSm)} کپی برای شاگرد
        </Link>
        {showExport && studentId && (
          <a href={exportCsvUrl(studentId)} download className="account-outline-btn mentor-btn is-sm">
            {ic(Download, MI.btnSm)} خروجی CSV
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
    </MentorSection>
  );
}
