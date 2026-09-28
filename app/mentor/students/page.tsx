"use client";

import { useCallback, useEffect, useState } from "react";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorStudentsList } from "@/components/MentorStudentsList";
import { MentorWaitlistSection } from "@/components/MentorWaitlistSection";
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

  return (
    <MentorDashShell title="شاگردها">
      {error ? <MentorDashError message={error} onRetry={load} /> : !data ? <LoadingBlock /> : (
        <>
          <MentorStudentsList data={data} />
          {/* صفِ انتظار (lib/mentorWaitlistServer.ts) — خالی باشد چیزی نمی‌آید */}
          <MentorWaitlistSection />
        </>
      )}
    </MentorDashShell>
  );
}
