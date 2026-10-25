import { CoachSpace } from "@/components/CoachSpace";

/** فضای همکاری، نقش شاگرد (آدرس اعلان‌ها هم همین) */
export default function MentorshipSpacePage({ params }: { params: { id: string } }) {
  return <CoachSpace role="STUDENT" mentorshipId={params.id} />;
}
