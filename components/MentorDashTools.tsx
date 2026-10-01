"use client";

import { ClipboardCheck, LayoutTemplate, Wrench } from "lucide-react";
import { MI, MI_STROKE, MentorRow, MentorSection } from "./MentorUI";

const ic = (Icon: typeof Wrench, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * ورودی ابزارهای منتور در داشبورد — فقط ردیف‌های drill-down به صفحه‌ی خود
 * هر ابزار (گزارش هفتگی، قالب‌ها و پاسخ‌های آماده). هر ردیف مستقل حذف‌شدنی است.
 */
export function MentorDashTools() {
  return (
    <MentorSection title="ابزارها" icon={ic(Wrench, MI.section)} flush>
      <MentorRow
        href="/mentor/reports"
        lead={ic(ClipboardCheck, MI.row)}
        title="گزارش هفتگی"
        sub={<span>درصد انجام، انجام‌نشده‌ها و آخرین فعالیت هر شاگرد</span>}
      />
      <MentorRow
        href="/mentor/templates"
        lead={ic(LayoutTemplate, MI.row)}
        title="قالب‌ها"
        sub={<span>قالب برنامه و پاسخ آماده‌ی گفت‌وگو</span>}
      />
    </MentorSection>
  );
}
