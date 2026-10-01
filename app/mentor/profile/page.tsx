"use client";

import { useEffect } from "react";
import { MentorDashShell, MentorDashError } from "@/components/MentorDashKit";
import { MentorProfileForm } from "@/components/MentorProfileForm";
import { MentorProfileVerification } from "@/components/MentorProfileVerification";
import { setMentorSelf, useMentorSelf } from "@/components/MentorPanelNav";
import { LoadingBlock } from "@/components/Spinner";

function MentorProfileContent() {
  const self = useMentorSelf();
  const loading = self.status === "unknown" || (self.status === "loading" && !self.profile);

  // با #verification (از اطلاعیه‌ی داشبورد) مستقیم به بخش احراز می‌رود؛ بدون پیمایش نرم
  useEffect(() => {
    if (loading || typeof window === "undefined" || window.location.hash !== "#verification") return;
    const t = setTimeout(() => document.getElementById("verification")?.scrollIntoView({ block: "start" }), 60);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) return <LoadingBlock />;
  if (self.status === "error" && !self.profile) return <MentorDashError message={self.error || "پروفایل دریافت نشد؛ دوباره تلاش کن"} onRetry={() => self.reload()} />;

  return (
    <>
      <MentorProfileForm profile={self.profile} onSaved={setMentorSelf} />
      <MentorProfileVerification profile={self.profile} onChanged={() => self.reload(true)} />
    </>
  );
}

export default function MentorProfilePage() {
  const self = useMentorSelf();
  // بدون پروفایل (مرحله‌ی شروع) بازگشت به پنل؛ با پروفایل این صفحه زیر «تنظیمات» است
  const back = self.status === "ready" && !self.profile
    ? { href: "/mentor", label: "پنل مربی" }
    : { href: "/mentor/settings", label: "تنظیمات" };
  return (
    <MentorDashShell title="پروفایل مربی‌گری" back={back}>
      <MentorProfileContent />
    </MentorDashShell>
  );
}
