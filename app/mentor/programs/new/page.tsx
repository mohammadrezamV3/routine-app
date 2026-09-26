"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorProgramEditor } from "@/components/MentorProgramEditor";
import { LoadingBlock } from "@/components/Spinner";
import type { MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";

// mentorshipId از window.location خونده می‌شه (نه useSearchParams) تا
// Suspense لازم نباشه — هم‌الگوی بقیه‌ی صفحه‌های اپ.
function readMentorshipId(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("mentorshipId")?.trim() || "";
}

function NewProgramContent() {
  const [state, setState] = useState<{ loading: boolean; error: string | null; row: MentorshipRow | null; missing: boolean }>({ loading: true, error: null, row: null, missing: false });

  const load = useCallback(async () => {
    const id = readMentorshipId();
    if (!id) { setState({ loading: false, error: null, row: null, missing: true }); return; }
    setState((s) => ({ ...s, loading: true, error: null }));
    const r = await mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor");
    if (!r.ok) { setState({ loading: false, error: r.error, row: null, missing: false }); return; }
    const row = (r.data.mentorships || []).find((m) => m.id === id && m.status === "ACTIVE") || null;
    setState({ loading: false, error: null, row, missing: !row });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <MentorDashError message={state.error} onRetry={load} />;
  if (state.missing || !state.row) {
    return (
      <MentorDashError
        message="رابطه‌ی فعالی با این شاگرد پیدا نشد. فقط برای شاگردهای فعالت می‌تونی برنامه بسازی."
        action={<Link href="/mentor" className="text-[12.5px] font-bold text-dash-green no-underline">بازگشت به پنل منتور</Link>}
      />
    );
  }
  return <MentorProgramEditor mode="new" mentorshipId={state.row.id} student={state.row.counterpart} />;
}

export default function NewMentorProgramPage() {
  return (
    <MentorDashShell title="برنامه‌ی جدید" hint="برنامه اول به‌صورت پیش‌نویس ذخیره می‌شه؛ هر وقت آماده بود برای شاگرد بفرست." back={{ href: "/mentor", label: "پنل منتور" }}>
      <NewProgramContent />
    </MentorDashShell>
  );
}
