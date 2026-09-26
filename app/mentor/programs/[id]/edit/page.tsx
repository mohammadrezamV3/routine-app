"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { MentorDashShell, MentorDashError, MentorDashNotice, mentorApi } from "@/components/MentorDashKit";
import { MentorProgramEditor } from "@/components/MentorProgramEditor";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { LoadingBlock } from "@/components/Spinner";
import type { ProgramDetailResponse } from "@/lib/mentorTypes";

function EditProgramContent({ id }: { id: string }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; status: number; data: ProgramDetailResponse | null }>({ loading: true, error: null, status: 200, data: null });
  const [justSaved, setJustSaved] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const r = await mentorApi<ProgramDetailResponse>(`/api/mentor-programs/${encodeURIComponent(id)}`);
    if (!r.ok) { setState({ loading: false, error: r.error, status: r.status, data: null }); return; }
    setState({ loading: false, error: null, status: 200, data: r.data });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ?saved=1 یعنی از صفحه‌ی «برنامه‌ی جدید» با ذخیره‌ی پیش‌نویس اومده
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("saved") === "1") {
      setJustSaved(true);
      window.history.replaceState(null, "", window.location.pathname);
      const t = setTimeout(() => setJustSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return (
      <MentorDashError
        message={state.status === 404 ? "این برنامه پیدا نشد یا به آن دسترسی نداری." : state.error || "برنامه بارگذاری نشد"}
        onRetry={state.status === 404 || state.status === 403 ? undefined : load}
        action={<Link href="/mentor" className="text-[12.5px] font-bold text-dash-green no-underline">بازگشت به پنل منتور</Link>}
      />
    );
  }

  const { program, role, items } = state.data;
  if (role !== "MENTOR") {
    return (
      <MentorDashError
        message="فقط منتوری که این برنامه رو ساخته می‌تونه ویرایشش کنه."
        action={<Link href={`/mentor-programs/${program.id}`} className="text-[12.5px] font-bold text-dash-green no-underline">مشاهده‌ی برنامه</Link>}
      />
    );
  }
  if (program.status !== "DRAFT") {
    return (
      <MentorDashNotice
        tone="info" icon={<Lock size={16} />} title="این برنامه دیگه قابل ویرایش نیست"
        action={<Link href={`/mentor-programs/${program.id}`} className="text-[12px] font-bold text-dash-green no-underline">صفحه‌ی برنامه</Link>}
      >
        <span className="flex flex-wrap items-center gap-2">
          فقط پیش‌نویس قابل ویرایشه. وضعیت فعلی: <ProgramStatusBadge status={program.status} />
        </span>
        <span className="mt-1 block">اگه شاگرد «درخواست تغییر» بده، برنامه دوباره پیش‌نویس می‌شه و می‌تونی ویرایشش کنی.</span>
      </MentorDashNotice>
    );
  }

  return (
    <>
      {justSaved && <div className="mb-3 text-center text-[12px] font-bold text-dash-green" role="status">پیش‌نویس ذخیره شد</div>}
      <MentorProgramEditor mode="edit" program={program} items={items} student={program.counterpart ?? null} />
    </>
  );
}

export default function EditMentorProgramPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  return (
    <MentorDashShell title="ویرایش برنامه" back={{ href: "/mentor", label: "پنل منتور" }}>
      {id ? <EditProgramContent id={id} /> : <LoadingBlock />}
    </MentorDashShell>
  );
}
