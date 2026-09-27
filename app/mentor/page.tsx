"use client";

import { useCallback, useEffect, useState } from "react";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorDashOnboarding } from "@/components/MentorDashOnboarding";
import { MentorDashBoard } from "@/components/MentorDashBoard";
import { LoadingBlock } from "@/components/Spinner";
import type { MentorSelf } from "@/lib/mentorTypes";

/**
 * /mentor — بدون پروفایل منتوری: معرفی کوتاه و ساخت پروفایل؛
 * با پروفایل: داشبورد منتور.
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
  return (
    <MentorDashShell title="پنل منتور">
      <MentorHome />
    </MentorDashShell>
  );
}
