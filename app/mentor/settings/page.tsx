"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgeCheck, Bell, DoorOpen, Eye, MessageSquare, ShieldCheck, Tag, UserRound, Users, HelpCircle } from "lucide-react";
import { MentorDashShell, MentorDashError, fa, mentorApi } from "@/components/MentorDashKit";
import { MI, MI_STROKE, MentorEmptyState } from "@/components/MentorUI";
import { MentorSettingsForm, type MentorSettingsSection } from "@/components/MentorSettingsForm";
import { MentorLabelManager } from "@/components/MentorLabelManager";
import { MentorAlertsSettings, alertToChoice, alertValueText, type AlertChoice } from "@/components/MentorAlertsSettings";
import { MentorAvailabilityQuick } from "@/components/MentorAvailabilityQuick";
import { MentorAvatarRing } from "@/components/MentorAvatarRing";
import { MentorSettingsGroup, MentorSettingsRow } from "@/components/MentorSettingsRow";
import { MentorSheet } from "@/components/MentorSheet";
import { TickOption } from "@/components/TickOption";
import { setMentorSelf, useMentorSelf } from "@/components/MentorPanelNav";
import { LoadingBlock } from "@/components/Spinner";
import type { AlertsResponse } from "@/lib/mentorToolsTypes";
import type { MentorSelf, MentorSettingsResponse, StudentLabel } from "@/lib/mentorTypes";

const ic = (Icon: typeof UserRound) => <Icon size={MI.row} strokeWidth={MI_STROKE} aria-hidden />;

type SheetKey = "availability" | MentorSettingsSection | "alerts" | "labels" | null;

const IDENTITY_TEXT: Record<MentorSelf["identityStatus"], string> = {
  VERIFIED: "تایید شده",
  PENDING: "در حال بررسی",
  REJECTED: "رد شد",
  NOT_PROVIDED: "نیاز به مدرک",
};

const SHEET_TITLE: Record<Exclude<SheetKey, null>, string> = {
  availability: "وضعیت پذیرش",
  capacity: "ظرفیت",
  response: "پیام خوش‌آمد و زمان جواب",
  intake: "سوال‌های اول کار",
  alerts: "یادآور بی‌خبری شاگرد",
  labels: "برچسب‌ها",
};

type Loaded = { settings: MentorSettingsResponse; labels: StudentLabel[]; alert: AlertChoice };

/** /mentor/settings — فهرست گروه‌بندی‌شده به سبک تنظیمات گوشی؛ هر موضوع در برگه‌ی خودش */
function MentorSettings() {
  const { data: session } = useSession();
  const self = useMentorSelf();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error"; msg: string; status: number } | ({ kind: "ok" } & Loaded)>({ kind: "loading" });
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const [s, l, a] = await Promise.all([
      mentorApi<MentorSettingsResponse>("/api/mentor/settings"),
      mentorApi<{ labels: StudentLabel[] }>("/api/mentor/labels"),
      mentorApi<AlertsResponse>("/api/mentor/alerts"),
    ]);
    if (!s.ok) { setState({ kind: "error", msg: s.error, status: s.status }); return; }
    setState({
      kind: "ok", settings: s.data, labels: l.ok ? l.data.labels : [],
      alert: a.ok ? alertToChoice(a.data.alertMissedDays) : "3",
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.kind === "loading") return <LoadingBlock />;
  if (state.kind === "error") {
    if (state.status === 403) {
      return (
        <MentorEmptyState
          icon={<UserRound size={MI.empty} strokeWidth={MI_STROKE} aria-hidden />}
          title="هنوز پروفایل مربی نداری"
          action={<Link href="/mentor/profile" className="trade-primary-btn mentor-btn">ساخت پروفایل</Link>}
        />
      );
    }
    return <MentorDashError message={state.msg} onRetry={load} />;
  }

  const { settings: data, labels, alert } = state;
  const s = data.settings;
  const profile = self.profile;
  const patch = (p: Partial<Loaded>) => setState((x) => (x.kind === "ok" ? { ...x, ...p } : x));
  const close = () => setSheet(null);

  const user = session?.user;
  const displayName = user?.name || "مربی";
  const complete = !!(profile && profile.bio?.trim() && profile.categories.length > 0);
  const identity = profile?.identityStatus ?? "NOT_PROVIDED";

  const accept = s.awayUntil ? "در دسترس نیستم" : s.acceptingStudents ? "می‌پذیرم" : "نمی‌پذیرم";
  const capacity = s.maxActiveStudents != null ? `${fa(data.activeStudents)} از ${fa(s.maxActiveStudents)} نفر` : "بدون سقف";
  const response = s.responseTimeHours ? `تا ${fa(s.responseTimeHours)} ساعت` : "اعلام نشده";

  async function setPublished(v: boolean) {
    if (pubBusy) return;
    setPubBusy(true);
    setPubError(null);
    const r = await mentorApi<{ profile: MentorSelf }>("/api/mentors/me", { method: "PUT", body: { published: v } });
    setPubBusy(false);
    if (!r.ok) { setPubError(r.error); return; }
    setMentorSelf(r.data.profile);
  }

  return (
    <div className="mv2-set">
      <div className="mv2-set-id">
        <MentorAvatarRing name={displayName} avatarUrl={user?.image ?? null} progress={null} size={64} />
        <div className="mv2-set-id-text">
          <div className="mv2-set-id-name">
            <span>{displayName}</span>
            {identity === "VERIFIED" && (
              <BadgeCheck size={18} strokeWidth={MI_STROKE} className="mv2-set-verified" aria-label="تایید شده" role="img" />
            )}
          </div>
          {profile?.headline && <div className="mv2-set-id-title">{profile.headline}</div>}
        </div>
      </div>

      <MentorSettingsGroup title="پروفایل من">
        <MentorSettingsRow icon={ic(UserRound)} title="پروفایل عمومی" value={complete ? "کامل" : "ناقص"} href="/mentor/profile" />
        <MentorSettingsRow icon={ic(ShieldCheck)} title="تایید هویت" value={IDENTITY_TEXT[identity]} href="/mentor/profile#verification" />
        <div className="mv2-set-tick">
          <span className="mv2-srow-icon" aria-hidden><Eye size={MI.row} strokeWidth={MI_STROKE} /></span>
          <TickOption checked={!!profile?.published} onChange={setPublished} disabled={pubBusy || !profile} className="mv2-set-tickopt">
            نمایش در فهرست مربی‌ها
          </TickOption>
        </div>
        {pubError && <div className="form-inline-error mv2-set-pub-error" role="alert">{pubError}</div>}
      </MentorSettingsGroup>

      <MentorSettingsGroup title="پذیرش شاگرد">
        <MentorSettingsRow icon={ic(DoorOpen)} title="وضعیت پذیرش" value={accept} onClick={() => setSheet("availability")} ariaHasPopup />
        <MentorSettingsRow icon={ic(Users)} title="ظرفیت" value={capacity} onClick={() => setSheet("capacity")} ariaHasPopup />
        <MentorSettingsRow icon={ic(MessageSquare)} title="پیام خوش‌آمد و زمان جواب" value={response} onClick={() => setSheet("response")} ariaHasPopup />
        <MentorSettingsRow
          icon={ic(HelpCircle)} title="سوال‌های اول کار"
          value={s.intakeQuestions.length ? `${fa(s.intakeQuestions.length)} سوال` : "ندارم"}
          onClick={() => setSheet("intake")} ariaHasPopup
        />
      </MentorSettingsGroup>

      <MentorSettingsGroup title="کار با شاگردها">
        <MentorSettingsRow icon={ic(Bell)} title="یادآور بی‌خبری شاگرد" value={alertValueText(alert)} onClick={() => setSheet("alerts")} ariaHasPopup />
        <MentorSettingsRow icon={ic(Tag)} title="برچسب‌ها" value={labels.length ? `${fa(labels.length)} برچسب` : "ندارم"} onClick={() => setSheet("labels")} ariaHasPopup />
      </MentorSettingsGroup>

      <MentorSheet open={sheet !== null} onClose={close} title={sheet ? SHEET_TITLE[sheet] : undefined} size="sm">
        {sheet === "availability" && (
          <MentorAvailabilityQuick bare initial={data} onChange={(d) => patch({ settings: d })} />
        )}
        {(sheet === "capacity" || sheet === "response" || sheet === "intake") && (
          <MentorSettingsForm
            key={sheet} section={sheet} initial={data}
            onSaved={(d) => patch({ settings: d })} onDone={close}
          />
        )}
        {sheet === "alerts" && <MentorAlertsSettings initial={alert} onSaved={(v) => patch({ alert: v })} onDone={close} />}
        {sheet === "labels" && <MentorLabelManager initial={labels} onChange={(l) => patch({ labels: l })} />}
      </MentorSheet>
    </div>
  );
}

export default function MentorSettingsPage() {
  return (
    <MentorDashShell title="تنظیمات">
      <MentorSettings />
    </MentorDashShell>
  );
}
