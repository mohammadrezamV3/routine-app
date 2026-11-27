"use client";

// مسیرهای مربی با شناسه‌ی شاگرد (/mentor/students/[studentId] و .../week): اول شناسه‌ی همکاری رو از
// API موجود پیدا می‌کنه، بعد فضا یا گزارش هفته رو نشون می‌ده.
import "./coach.css";
import "./coach-space.css";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { isoLocal } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { AuthGate } from "./AuthGate";
import { CoachEmpty } from "./CoachEmpty";
import { CoachSpace } from "./CoachSpace";
import { CoachWeekPage } from "./CoachWeekPage";
import { mentorApi } from "./MentorDashKit";
import { MentorErrorState } from "./MentorPageShell";
import { SmartLink } from "./SmartLink";
import { LoadingBlock } from "./Spinner";

export function CoachStudentRoute({ studentId, view }: { studentId: string; view: "space" | "week" }) {
  const { status } = useSession();
  const [mentorshipId, setMentorshipId] = useState<string | null>(null);
  const [error, setError] = useState<{ msg: string; status: number } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !studentId) return;
    let dead = false;
    const day = isoLocal(new Date());
    mentorApi<{ mentorshipId: string }>(`/api/mentor/students/${encodeURIComponent(studentId)}?from=${day}&to=${day}`).then((r) => {
      if (dead) return;
      if (r.ok && r.data.mentorshipId) { setError(null); setMentorshipId(r.data.mentorshipId); }
      else if (!r.ok) setError({ msg: r.error, status: r.status });
    });
    return () => { dead = true; };
  }, [status, studentId, attempt]);

  if (status === "loading") return <div className="ch-page cs-page"><LoadingBlock /></div>;
  if (status === "unauthenticated") return <div className="ch-page cs-page"><AuthGate message={tr("برای استفاده از بخش مربی‌ها وارد شو", "Sign in to use the mentors section")} /></div>;
  if (error) {
    return (
      <div className="ch-page cs-page">
        {error.status === 404 || error.status === 403 ? (
          <CoachEmpty
            text={tr("به اطلاعات این شاگرد دسترسی نداری. فقط شاگردهایی که همکاری فعال با تو دارن اینجا دیده می‌شن.", "You don't have access to this student. Only students you are actively working with show up here.")}
            action={<SmartLink href="/mentor/students" className="btn btn-primary">{tr("شاگردها", "Students")}</SmartLink>}
          />
        ) : (
          <MentorErrorState message={error.msg} onRetry={() => setAttempt((n) => n + 1)} />
        )}
      </div>
    );
  }
  if (!mentorshipId) return <div className="ch-page cs-page"><LoadingBlock /></div>;
  return view === "space"
    ? <CoachSpace role="MENTOR" mentorshipId={mentorshipId} />
    : <CoachWeekPage role="MENTOR" mentorshipId={mentorshipId} studentId={studentId} />;
}
