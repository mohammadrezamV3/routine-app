"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CircleSlash, Eye, EyeOff, Hourglass, UserRound, XCircle } from "lucide-react";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MI, MI_STROKE, MentorEmptyState } from "@/components/MentorUI";
import { MentorSettingsForm } from "@/components/MentorSettingsForm";
import { MentorLabelManager } from "@/components/MentorLabelManager";
import { MentorAlertsSettings } from "@/components/MentorAlertsSettings";
import { MentorAvailabilityQuick } from "@/components/MentorAvailabilityQuick";
import { useMentorSelf } from "@/components/MentorPanelNav";
import { MentorChip, MentorRow, MentorSection } from "@/components/MentorUI";
import { LoadingBlock } from "@/components/Spinner";
import type { MentorSettingsResponse, StudentLabel } from "@/lib/mentorTypes";

const ic = (Icon: typeof UserRound, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/** ردیفِ پروفایلِ منتوری با وضعیتِ انتشار و احراز هویت؛ ورود به /mentor/profile */
function MentorProfileLink() {
  const { profile } = useMentorSelf();
  if (!profile) return null;
  const id = profile.identityStatus;
  return (
    <MentorSection title="پروفایل" icon={ic(UserRound, MI.section)} flush>
      <MentorRow
        href="/mentor/profile"
        lead={ic(UserRound, MI.row)}
        title="پروفایل مربی‌گری و مدارک"
        sub={
          <>
            {id === "VERIFIED" ? <MentorChip tone="accent" icon={ic(BadgeCheck, MI.chip)}>هویت تاییدشده</MentorChip>
              : id === "PENDING" ? <MentorChip tone="info" icon={ic(Hourglass, MI.chip)}>در صف بررسی</MentorChip>
              : id === "REJECTED" ? <MentorChip tone="danger" icon={ic(XCircle, MI.chip)}>مدرک رد شد</MentorChip>
              : <MentorChip tone="warn" icon={ic(CircleSlash, MI.chip)}>بدون احراز</MentorChip>}
            {profile.published
              ? <MentorChip tone="neutral" icon={ic(Eye, MI.chip)}>منتشرشده</MentorChip>
              : <MentorChip tone="neutral" icon={ic(EyeOff, MI.chip)}>منتشرنشده</MentorChip>}
          </>
        }
      />
    </MentorSection>
  );
}

/** /mentor/settings — وضعیت پذیرش، پروفایل، ظرفیت، پاسخ‌گویی، سؤال‌های پذیرش، هشدارها و برچسب‌ها */
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
          title="هنوز پروفایل مربی‌ای نداری"
          action={<Link href="/mentor/profile" className="trade-primary-btn mentor-btn">ساخت پروفایل</Link>}
        />
      );
    }
    return <MentorDashError message={state.msg} onRetry={load} />;
  }
  const setSettings = (d: MentorSettingsResponse) => setState((x) => (x.kind === "ok" ? { ...x, settings: d } : x));
  return (
    <>
      <MentorAvailabilityQuick initial={state.settings} onChange={setSettings} />
      <MentorProfileLink />
      <MentorSettingsForm initial={state.settings} onSaved={setSettings} />
      <MentorAlertsSettings />
      <MentorLabelManager initial={state.labels} />
    </>
  );
}

export default function MentorSettingsPage() {
  return (
    <MentorDashShell title="تنظیمات مربی‌گری">
      <MentorSettings />
    </MentorDashShell>
  );
}
