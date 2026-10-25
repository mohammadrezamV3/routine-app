import { CoachStudentRoute } from "@/components/CoachStudentRoute";

/** گزارش هفته‌ی یک شاگرد برای مربی (?w=YYYY-MM-DD) */
export default function MentorStudentWeekPage({ params }: { params: { studentId: string } }) {
  return <CoachStudentRoute studentId={params.studentId} view="week" />;
}
