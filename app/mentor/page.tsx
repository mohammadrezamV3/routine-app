"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MentorDashShell } from "@/components/MentorDashKit";
import { MentorDashOnboarding } from "@/components/MentorDashOnboarding";
import { MentorDashBoard } from "@/components/MentorDashBoard";
import { LoadingBlock } from "@/components/Spinner";
import { MentorDashError, mentorApi } from "@/components/MentorDashKit";
import type { MentorSelf } from "@/lib/mentorTypes";

/**
 * /mentor — اگه کاربر هنوز پروفایلِ منتوری نداره، صفحه‌ی «منتور شو»؛
 * وگرنه داشبوردِ ساده‌ی منتور.
 */
function MentorHome() {
  const [state, setState] = useState<{ loading: boolean; error: string | null; profile: MentorSelf | null }>({ loading: true, error: null, profile: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const r = await mentorApi<{ profile: MentorSelf | null }>("/api/mentors/me");
    if (!r.ok) { setState({ loading: false, error: r.error, profile: null }); return; }
    setState({ loading: false, error: null, profile: r.data.profile });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <MentorDashError message={state.error} onRetry={load} />;
  if (!state.profile) return <MentorDashOnboarding />;
  return <MentorDashBoard self={state.profile} />;
}

export default function MentorPage() {
  const { status } = useSession();
  return (
    <MentorDashShell title="پنل منتور" hint={status === "authenticated" ? "شاگردها، درخواست‌ها و برنامه‌هایی که ساختی — یک‌جا" : undefined}>
      <MentorHome />
    </MentorDashShell>
  );
}
