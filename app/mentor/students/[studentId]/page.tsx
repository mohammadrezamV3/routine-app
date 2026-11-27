import { CoachStudentRoute } from "@/components/CoachStudentRoute";

/** فضای همکاری مربی با یک شاگرد (docs/coach-v3.md) */
export default function MentorStudentPage({ params }: { params: { studentId: string } }) {
  return <CoachStudentRoute studentId={params.studentId} view="space" />;
}
