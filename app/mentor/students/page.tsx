"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorStudentsList } from "@/components/MentorStudentsList";
import { MentorWaitlistSection } from "@/components/MentorWaitlistSection";
import { LoadingBlock } from "@/components/Spinner";
import type { StudentIndexResponse } from "@/lib/mentorTypes";

function StudentsBody() {
  const params = useSearchParams();
  const [data, setData] = useState<StudentIndexResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await mentorApi<StudentIndexResponse>("/api/mentor/students");
    if (!r.ok) { setError(r.error); return; }
    setData(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <MentorDashError message={error} onRetry={load} />;
  if (!data) return <LoadingBlock />;
  return (
    <>
      <MentorStudentsList data={data} initialReport={params?.get("view") === "report"} />
      {/* صف انتظار: ردیف جمع‌شونده ته فهرست؛ خالی باشد چیزی نمی‌آید */}
      <MentorWaitlistSection />
    </>
  );
}

/** /mentor/students: فهرست شاگردها + گزارش هفتگی (جای تب گزارش‌ها) */
export default function MentorStudentsPage() {
  return (
    <MentorDashShell title="">
      <Suspense fallback={<LoadingBlock />}>
        <StudentsBody />
      </Suspense>
    </MentorDashShell>
  );
}
