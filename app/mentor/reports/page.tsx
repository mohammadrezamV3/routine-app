import { redirect } from "next/navigation";

// گزارش هفتگی داخل صفحه‌ی شاگردها میاد (components/MentorWeeklyReport.tsx)
export default function MentorReportsPage() {
  redirect("/mentor/students?view=report");
}
