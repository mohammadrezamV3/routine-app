"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MI, MI_STROKE, MentorEmptyState } from "@/components/MentorUI";
import { MentorSettingsForm } from "@/components/MentorSettingsForm";
import { MentorLabelManager } from "@/components/MentorLabelManager";
import { MentorAlertsSettings } from "@/components/MentorAlertsSettings";
import { LoadingBlock } from "@/components/Spinner";
import type { MentorSettingsResponse, StudentLabel } from "@/lib/mentorTypes";

/** /mentor/settings — پذیرش، ظرفیت، عدم حضور، پاسخ‌گویی، سؤال‌های پذیرش و برچسب‌ها */
function MentorSettings() {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error"; msg: string; status: number } | { kind: "ok"; settings: MentorSettingsResponse; labels: StudentLabel[] }
  >({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const [s, l] = await Promise.all([
      mentorApi<MentorSettingsResponse>("/api/mentor/settings"),
      mentorApi<{ labels: StudentLabel[] }>("/api/mentor/labels"),
    ]);
    if (!s.ok) { setState({ kind: "error", msg: s.error, status: s.status }); return; }
    setState({ kind: "ok", settings: s.data, labels: l.ok ? l.data.labels : [] });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.kind === "loading") return <LoadingBlock />;
  if (state.kind === "error") {
    if (state.status === 403) {
      return (
        <MentorEmptyState
          icon={<UserRound size={MI.empty} strokeWidth={MI_STROKE} aria-hidden />}
          title="هنوز پروفایل منتوری نداری"
          action={<Link href="/mentor/profile" className="trade-primary-btn mentor-btn">ساخت پروفایل</Link>}
        />
      );
    }
    return <MentorDashError message={state.msg} onRetry={load} />;
  }
  return (
    <>
      <MentorSettingsForm initial={state.settings} onSaved={(d) => setState((x) => (x.kind === "ok" ? { ...x, settings: d } : x))} />
      <MentorAlertsSettings />
      <MentorLabelManager initial={state.labels} />
    </>
  );
}

export default function MentorSettingsPage() {
  return (
    <MentorDashShell title="تنظیمات منتوری" back={{ href: "/mentor", label: "پنل منتور" }}>
      <MentorSettings />
    </MentorDashShell>
  );
}
