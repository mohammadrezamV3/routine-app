import { CoachWeekPage } from "@/components/CoachWeekPage";

/** گزارش هفته برای شاگرد (?w=YYYY-MM-DD) */
export default function MentorshipWeekPage({ params }: { params: { id: string } }) {
  return <CoachWeekPage role="STUDENT" mentorshipId={params.id} />;
}
