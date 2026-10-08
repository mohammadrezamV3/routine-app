"use client";

import { MentorDashShell, MentorDashError } from "@/components/MentorDashKit";
import { MentorDashOnboarding } from "@/components/MentorDashOnboarding";
import { MentorDashBoard } from "@/components/MentorDashBoard";
import { useMentorSelf } from "@/components/MentorPanelNav";
import { LoadingBlock } from "@/components/Spinner";

/**
 * /mentor — بدون پروفایل منتوری: مراحل شروع (ساخت پروفایل، احراز هویت،
 * انتشار)؛ با پروفایل: داشبورد منتور. پروفایل از همان درخواست مشترک
 * نوار پنل خوانده می‌شود (useMentorSelf).
 */
function MentorHome() {
  const self = useMentorSelf();
  if (self.status === "unknown" || (self.status === "loading" && !self.profile)) return <LoadingBlock />;
  if (self.status === "error" && !self.profile) {
    return <MentorDashError message={self.error || "پنل دریافت نشد؛ دوباره تلاش کن"} onRetry={() => self.reload()} />;
  }
  if (!self.profile) return <MentorDashOnboarding />;
  return <MentorDashBoard self={self.profile} />;
}

export default function MentorPage() {
  return (
    <MentorDashShell title="">
      <MentorHome />
    </MentorDashShell>
  );
}
