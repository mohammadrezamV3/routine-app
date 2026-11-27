"use client";

import { useParams } from "next/navigation";
import { CoachProfileView } from "@/components/CoachProfileView";

// صفحه‌ی مربی (مربی نسخه‌ی 3): همان نمای مشترک لینک کوتاه /c/[username]
export default function MentorProfilePage() {
  const { mentorId } = useParams<{ mentorId: string }>();
  return <CoachProfileView mentorId={mentorId} path={`/mentors/${mentorId}`} />;
}
