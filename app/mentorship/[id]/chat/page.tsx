"use client";

import { useParams } from "next/navigation";
import { MentorChatScreen } from "@/components/MentorChatScreen";

// گفت‌وگوی یک رابطه به‌صورت صفحه‌ی کامل (components/MentorChatScreen.tsx)
export default function MentorshipChatPage() {
  const { id } = useParams<{ id: string }>();
  return <MentorChatScreen id={id} />;
}
