"use client";

import { useCallback, useEffect, useState } from "react";
import { PROGRAM_TYPE_CATEGORY } from "@/lib/mentorCategories";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorProgramEditor } from "@/components/MentorProgramEditor";
import { LoadingBlock } from "@/components/Spinner";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";

// mentorshipId از window.location خوانده می‌شود (نه useSearchParams) تا
// Suspense لازم نباشد؛ هم‌الگوی بقیه‌ی صفحه‌های اپ.
function readMentorshipId(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("mentorshipId")?.trim() || "";
}

type State = { loading: boolean; error: string | null; row: MentorshipRow | null; missing: boolean };

export default function NewMentorProgramPage() {
  const [state, setState] = useState<State>({ loading: true, error: null, row: null, missing: false });

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

  const row = state.row;
  const back = row
    ? { href: `/mentor/students/${row.counterpart.id}`, label: publicUserName(row.counterpart) }
    : { href: "/mentor", label: "پنل منتور" };

  let body: React.ReactNode;
  if (state.loading) body = <LoadingBlock />;
  else if (state.error) body = <MentorDashError message={state.error} onRetry={load} />;
  else if (state.missing || !row) {
    body = <MentorDashError message="رابطه‌ی فعالی با این شاگرد پیدا نشد؛ برنامه فقط برای شاگرد فعال ساخته می‌شود" />;
  } else {
    const allowedTypes = (["ROUTINE", "WORKOUT"] as const).filter(
      (t) => row.categories.length === 0 || row.categories.includes(PROGRAM_TYPE_CATEGORY[t]),
    );
    body = allowedTypes.length === 0
      ? <MentorDashError message="حوزه‌ی همکاری با این شاگرد نوع برنامه ندارد؛ از گفت‌وگو و بازخورد استفاده کن" />
      : <MentorProgramEditor mode="new" mentorshipId={row.id} student={row.counterpart} allowedTypes={[...allowedTypes]} />;
  }

  return (
    <MentorDashShell
      title="برنامه‌ی جدید"
      hint="برنامه به‌صورت پیش‌نویس ذخیره می‌شود و تا ارسال، شاگرد آن را نمی‌بیند"
      back={back}
    >
      {body}
    </MentorDashShell>
  );
}
