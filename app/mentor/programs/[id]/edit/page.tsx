"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorProgramEditor } from "@/components/MentorProgramEditor";
import { MentorProgramTools } from "@/components/MentorProgramTools";
import { MI, MI_STROKE, MentorEmptyState } from "@/components/MentorUI";
import { LoadingBlock } from "@/components/Spinner";
import { publicUserName } from "@/lib/mentorTypes";
import type { ProgramDetailResponse } from "@/lib/mentorTypes";

type State = { loading: boolean; error: string | null; status: number; data: ProgramDetailResponse | null };

export default function EditMentorProgramPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const [state, setState] = useState<State>({ loading: true, error: null, status: 200, data: null });
  // ?saved=1 یعنی از «برنامه‌ی جدید» با ذخیره‌ی پیش‌نویس آمده؛ روی دکمه نشان داده می‌شود
  const [justSaved, setJustSaved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const r = await mentorApi<ProgramDetailResponse>(`/api/mentor-programs/${encodeURIComponent(id)}`);
    if (!r.ok) { setState({ loading: false, error: r.error, status: r.status, data: null }); return; }
    setState({ loading: false, error: null, status: 200, data: r.data });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("saved") === "1") {
      setJustSaved(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const data = state.data;
  const student = data?.role === "MENTOR" ? data.program.counterpart ?? null : null;
  const back = student
    ? { href: `/mentor/students/${student.id}`, label: publicUserName(student) }
    : { href: "/mentor", label: "پنل منتور" };

  let body: React.ReactNode;
  if (!id || state.loading) body = <LoadingBlock />;
  else if (state.error || !data) {
    const final = state.status === 404 || state.status === 403;
    body = <MentorDashError message={state.error || "برنامه دریافت نشد؛ دوباره تلاش کن"} onRetry={final ? undefined : load} />;
  } else if (data.role !== "MENTOR") {
    body = (
      <MentorDashError
        message="فقط منتور سازنده‌ی این برنامه می‌تواند آن را ویرایش کند"
        action={<Link href={`/mentor-programs/${data.program.id}`} className="account-outline-btn mentor-btn is-sm">مشاهده‌ی برنامه</Link>}
      />
    );
  } else if (data.program.status !== "DRAFT") {
    body = (
      <>
      <MentorEmptyState
        icon={<ClipboardList size={MI.empty} strokeWidth={MI_STROKE} aria-hidden />}
        title="این برنامه ارسال شده و دیگر ویرایش نمی‌شود"
        text="اگر شاگرد درخواست تغییر بدهد، برنامه دوباره پیش‌نویس می‌شود"
        action={<Link href={`/mentor-programs/${data.program.id}`} className="account-outline-btn mentor-btn">مشاهده‌ی برنامه</Link>}
      />
      <MentorProgramTools programId={data.program.id} title={data.program.title} studentId={student?.id} />
      </>
    );
  } else {
    body = <MentorProgramEditor mode="edit" program={data.program} items={data.items} student={student} initiallySaved={justSaved} />;
  }

  return (
    <MentorDashShell title="ویرایش برنامه" back={back}>
      {body}
    </MentorDashShell>
  );
}
