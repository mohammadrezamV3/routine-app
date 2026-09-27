"use client";

import { useCallback, useEffect, useState } from "react";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorProfileForm } from "@/components/MentorProfileForm";
import { MentorProfileVerification } from "@/components/MentorProfileVerification";
import { LoadingBlock } from "@/components/Spinner";
import type { MentorSelf } from "@/lib/mentorTypes";

function MentorProfileContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MentorSelf | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const r = await mentorApi<{ profile: MentorSelf | null }>("/api/mentors/me");
    if (!r.ok) { if (!silent) setError(r.error); setLoading(false); return; }
    setProfile(r.data.profile);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // پرش به بخش احراز وقتی از داشبورد با #verification اومده
  useEffect(() => {
    if (loading || typeof window === "undefined" || window.location.hash !== "#verification") return;
    document.getElementById("verification")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  if (loading) return <LoadingBlock />;
  if (error) return <MentorDashError message={error} onRetry={() => load()} />;

  return (
    <>
      <MentorProfileForm profile={profile} onSaved={setProfile} />
      <MentorProfileVerification profile={profile} onChanged={() => load(true)} />
    </>
  );
}

export default function MentorProfilePage() {
  return (
    <MentorDashShell
      title="پروفایل منتوری"
      hint="معرفی، دسته‌ها و وضعیت نمایش پروفایل — به‌علاوه‌ی احراز هویت و مدارک"
      back={{ href: "/mentor", label: "پنل منتور" }}
    >
      <MentorProfileContent />
    </MentorDashShell>
  );
}
