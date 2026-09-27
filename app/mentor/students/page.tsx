"use client";

import { useCallback, useEffect, useState } from "react";
import { MentorDashShell, MentorDashError, fa, mentorApi } from "@/components/MentorDashKit";
import { MentorStudentsList } from "@/components/MentorStudentsList";
import { LoadingBlock } from "@/components/Spinner";
import type { StudentIndexResponse } from "@/lib/mentorTypes";

/** /mentor/students — همه‌ی شاگردهای فعال با جست‌وجو، فیلتر برچسب و مرتب‌سازی */
export default function MentorStudentsPage() {
  const [data, setData] = useState<StudentIndexResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await mentorApi<StudentIndexResponse>("/api/mentor/students");
    if (!r.ok) { setError(r.error); return; }
    setData(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const hint = data && data.capacity != null ? `${fa(data.students.length)} از ${fa(data.capacity)} ظرفیت` : undefined;

  return (
    <MentorDashShell title="شاگردها" hint={hint} back={{ href: "/mentor", label: "پنل منتور" }}>
      {error ? <MentorDashError message={error} onRetry={load} /> : !data ? <LoadingBlock /> : <MentorStudentsList data={data} />}
    </MentorDashShell>
  );
}
