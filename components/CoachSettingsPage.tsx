"use client";

import "./coach.css";
import "./coach-pages.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import {
  BadgeCheck, Bell, ChevronLeft, Copy, DoorOpen, HelpCircle, LayoutTemplate, MessageSquare, MessageSquareText, Share2, ShieldCheck, Star, Tag, UserRound, Users,
} from "lucide-react";
import { SmartLink } from "./SmartLink";
import { PageLoader } from "./PageLoader";
import { TickOption } from "./TickOption";
import { CoachPanelShell } from "./CoachPanelShell";
import { CoachAvatar } from "./CoachAvatar";
import { CoachEmpty } from "./CoachEmpty";
import { CoachSheet } from "./CoachSheet";
import { MentorDashError, fa, mentorApi } from "./MentorDashKit";
import { setMentorSelf, useMentorSelf } from "./MentorPanelNav";
import { alertToChoice, alertValueText, type AlertChoice } from "./MentorAlertsSettings";
import type { MentorSettingsSection } from "./MentorSettingsForm";
import type { AlertsResponse } from "@/lib/mentorToolsTypes";
import type { MentorSelf, MentorSettingsResponse, StudentLabel } from "@/lib/mentorTypes";
import { tr } from "@/lib/i18n";

// شیت‌های سنگین فقط با باز شدن لود می‌شن
const ProfileForm = dynamic(() => import("./MentorProfileForm").then((m) => m.MentorProfileForm), { ssr: false });
const Verification = dynamic(() => import("./MentorProfileVerification").then((m) => m.MentorProfileVerification), { ssr: false });
const AvailabilityQuick = dynamic(() => import("./MentorAvailabilityQuick").then((m) => m.MentorAvailabilityQuick), { ssr: false });
const SettingsForm = dynamic(() => import("./MentorSettingsForm").then((m) => m.MentorSettingsForm), { ssr: false });
const AlertsSettings = dynamic(() => import("./MentorAlertsSettings").then((m) => m.MentorAlertsSettings), { ssr: false });
const LabelManager = dynamic(() => import("./MentorLabelManager").then((m) => m.MentorLabelManager), { ssr: false });
const TemplatesList = dynamic(() => import("./MentorTemplatesList").then((m) => m.MentorTemplatesList), { ssr: false });
const SavedReplies = dynamic(() => import("./MentorSavedReplies").then((m) => m.MentorSavedRepliesManager), { ssr: false });

type SheetKey = "profile" | "verification" | "availability" | MentorSettingsSection | "alerts" | "labels" | "templates" | "replies";
const SHEET_KEYS: SheetKey[] = ["profile", "verification", "availability", "capacity", "response", "intake", "alerts", "labels", "templates", "replies"];

const sheetTitle = (): Record<SheetKey, string> => ({
  profile: tr("پروفایل", "Profile"),
  verification: tr("تایید هویت", "Identity check"),
  availability: tr("وضعیت پذیرش", "Accepting students"),
  capacity: tr("ظرفیت", "Capacity"),
  response: tr("پیام خوش‌آمد", "Welcome message"),
  intake: tr("سوال‌های اول کار", "Starter questions"),
  alerts: tr("یادآور بی‌خبری", "Inactivity reminder"),
  labels: tr("برچسب‌ها", "Labels"),
  templates: tr("قالب‌ها", "Templates"),
  replies: tr("پیام‌های آماده", "Saved replies"),
});

const identityText = (): Record<MentorSelf["identityStatus"], string> => ({
  VERIFIED: tr("تایید شده", "Verified"),
  PENDING: tr("در حال بررسی", "Under review"),
  REJECTED: tr("رد شد", "Declined"),
  NOT_PROVIDED: tr("نیاز به مدرک", "Document needed"),
});

type Loaded = { settings: MentorSettingsResponse; labels: StudentLabel[]; alert: AlertChoice };
type AccountLite = { username: string | null; name: string | null };

function Row({ icon, title, value, onClick }: { icon: ReactNode; title: string; value?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="ch-row" onClick={onClick} aria-haspopup="dialog">
        <span aria-hidden="true">{icon}</span>
        <span className="ch-row-main">
          <span className="ch-row-title">{title}</span>
          {value && <span className="ch-row-sub">{value}</span>}
        </span>
        <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
      </button>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="chp-group">
      <h2 className="ch-section-title">{title}</h2>
      <ul className="ch-list">{children}</ul>
    </section>
  );
}

function PublicLink({ username }: { username: string | null }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  if (!username) {
    return (
      <SmartLink href="/account/profile" className="ch-row">
        <span className="ch-row-main">
          <span className="ch-row-title">{tr("لینک کوتاه صفحه‌ت", "Your short page link")}</span>
          <span className="ch-row-sub">{tr("اول یک نام کاربری برای خودت انتخاب کن", "Pick a username first")}</span>
        </span>
        <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
      </SmartLink>
    );
  }
  const url = `${origin}/c/${username}`;
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* کلیپ‌بورد در دسترس نیست */ }
  }
  async function share() {
    try {
      if (typeof navigator.share === "function") { await navigator.share({ url }); return; }
    } catch (e) { if ((e as Error)?.name === "AbortError") return; }
    copy();
  }
  return (
    <div className="ch-card chp-link-box">
      <span className="chp-link-url" dir="ltr">{url}</span>
      <button type="button" className="btn btn-ghost btn-icon" onClick={copy} aria-label={copied ? tr("کپی شد", "Copied") : tr("کپی لینک", "Copy link")}>
        {copied ? <BadgeCheck size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
      </button>
      <button type="button" className="btn btn-ghost btn-icon" onClick={share} aria-label={tr("اشتراک‌گذاری", "Share")}>
        <Share2 size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

export function CoachSettingsPage() {
  const { data: session } = useSession();
  const self = useMentorSelf();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error"; msg: string } | { kind: "none" } | ({ kind: "ok" } & Loaded)>({ kind: "loading" });
  const [account, setAccount] = useState<AccountLite | null>(null);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);
  const openedFromUrl = useRef(false);

  const load = useCallback(async () => {
    const [s, l, a, acc] = await Promise.all([
      mentorApi<MentorSettingsResponse>("/api/mentor/settings"),
      mentorApi<{ labels: StudentLabel[] }>("/api/mentor/labels"),
      mentorApi<AlertsResponse>("/api/mentor/alerts"),
      mentorApi<{ user: AccountLite }>("/api/account"),
    ]);
    if (acc.ok) setAccount({ username: acc.data.user?.username ?? null, name: acc.data.user?.name ?? null });
    if (!s.ok) { setState(s.status === 403 ? { kind: "none" } : { kind: "error", msg: s.error }); return; }
    setState({ kind: "ok", settings: s.data, labels: l.ok ? l.data.labels : [], alert: a.ok ? alertToChoice(a.data.alertMissedDays) : "3" });
  }, []);
  useEffect(() => { load(); }, [load]);

  // ?open=<key> بعد از آماده شدن داده شیت رو باز می‌کنه
  useEffect(() => {
    if (openedFromUrl.current || state.kind === "loading" || state.kind === "error") return;
    openedFromUrl.current = true;
    try {
      const k = new URLSearchParams(window.location.search).get("open") as SheetKey | null;
      if (k && SHEET_KEYS.includes(k)) setSheet(k);
      if (k) window.history.replaceState(null, "", window.location.pathname);
    } catch { /* بدون پارامتر */ }
  }, [state.kind]);

  const profile = self.profile;
  const close = () => setSheet(null);
  const patch = (p: Partial<Loaded>) => setState((x) => (x.kind === "ok" ? { ...x, ...p } : x));

  async function setPublished(v: boolean) {
    if (pubBusy) return;
    setPubBusy(true);
    setPubError(null);
    const r = await mentorApi<{ profile: MentorSelf }>("/api/mentors/me", { method: "PUT", body: { published: v } });
    setPubBusy(false);
    if (!r.ok) { setPubError(r.error); return; }
    setMentorSelf(r.data.profile);
  }

  let body: ReactNode;
  if (state.kind === "loading") body = <PageLoader />;
  else if (state.kind === "error") body = <MentorDashError message={state.msg} onRetry={() => { setState({ kind: "loading" }); load(); }} />;
  else if (state.kind === "none") {
    body = (
      <CoachEmpty
        icon={<UserRound size={28} aria-hidden="true" />}
        text={tr("هنوز صفحه‌ی مربی نداری. با ساخت پروفایل شروع کن.", "You do not have a coach page yet. Start by creating your profile.")}
        action={<button type="button" className="btn btn-primary" onClick={() => setSheet("profile")}>{tr("ساخت پروفایل", "Create profile")}</button>}
      />
    );
  } else {
    const { settings: data, labels, alert } = state;
    const s = data.settings;
    const identity = profile?.identityStatus ?? "NOT_PROVIDED";
    const name = account?.name || session?.user?.name || tr("مربی", "Coach");
    const accept = s.awayUntil ? tr("در دسترس نیستم", "Away") : s.acceptingStudents ? tr("می‌پذیرم", "Accepting") : tr("نمی‌پذیرم", "Not accepting");
    const capacity = s.maxActiveStudents != null ? tr(`${fa(data.activeStudents)} از ${fa(s.maxActiveStudents)} نفر`, `${fa(data.activeStudents)} of ${fa(s.maxActiveStudents)}`) : tr("بدون سقف", "No limit");
    const welcome = s.welcomeMessage ? tr("تنظیم شده", "Set") : tr("ندارم", "None");
    const qn = s.intakeQuestions.length;
    body = (
      <>
        <section className="ch-card ch-card-lg chp-preview" aria-label={tr("صفحه‌ی عمومی", "Public page")}>
          <CoachAvatar user={{ id: profile?.userId ?? "me", name, lastName: null, username: account?.username ?? null, avatarUrl: session?.user?.image ?? null }} size={72} />
          <p className="chp-preview-name">{name}</p>
          {profile?.headline && <p className="chp-preview-head">{profile.headline}</p>}
          {profile && profile.ratingCount > 0 && (
            <span className="ch-pill is-accent"><Star size={14} fill="currentColor" aria-hidden="true" />{profile.ratingAvg.toFixed(1)} · {fa(profile.ratingCount)}</span>
          )}
        </section>
        <PublicLink username={account?.username ?? null} />

        <Group title={tr("صفحه‌ی من", "My page")}>
          <Row icon={<UserRound size={20} />} title={tr("پروفایل", "Profile")} value={profile?.bio?.trim() && profile.categories.length > 0 ? tr("کامل", "Complete") : tr("ناقص", "Incomplete")} onClick={() => setSheet("profile")} />
          <Row icon={<ShieldCheck size={20} />} title={tr("تایید هویت", "Identity check")} value={identityText()[identity]} onClick={() => setSheet("verification")} />
          <li>
            <div className="ch-row">
              <TickOption checked={!!profile?.published} onChange={setPublished} disabled={pubBusy || !profile}>
                {tr("نمایش در فهرست مربی‌ها", "Show in the coach listing")}
              </TickOption>
            </div>
            {pubError && <div className="form-inline-error" role="alert">{pubError}</div>}
          </li>
        </Group>

        <Group title={tr("پذیرش", "Taking students")}>
          <Row icon={<DoorOpen size={20} />} title={tr("وضعیت", "Status")} value={accept} onClick={() => setSheet("availability")} />
          <Row icon={<Users size={20} />} title={tr("ظرفیت", "Capacity")} value={capacity} onClick={() => setSheet("capacity")} />
          <Row icon={<MessageSquare size={20} />} title={tr("پیام خوش‌آمد", "Welcome message")} value={welcome} onClick={() => setSheet("response")} />
          <Row icon={<HelpCircle size={20} />} title={tr("سوال‌های اول کار", "Starter questions")} value={qn ? tr(`${fa(qn)} سوال`, `${fa(qn)} ${qn === 1 ? "question" : "questions"}`) : tr("ندارم", "None")} onClick={() => setSheet("intake")} />
        </Group>

        <Group title={tr("کار با شاگردها", "Working with students")}>
          <Row icon={<Bell size={20} />} title={tr("یادآور بی‌خبری", "Inactivity reminder")} value={alertValueText(alert)} onClick={() => setSheet("alerts")} />
          <Row icon={<Tag size={20} />} title={tr("برچسب‌ها", "Labels")} value={labels.length ? tr(`${fa(labels.length)} برچسب`, `${fa(labels.length)} ${labels.length === 1 ? "label" : "labels"}`) : tr("ندارم", "None")} onClick={() => setSheet("labels")} />
          <Row icon={<LayoutTemplate size={20} />} title={tr("قالب‌ها", "Templates")} onClick={() => setSheet("templates")} />
          <Row icon={<MessageSquareText size={20} />} title={tr("پیام‌های آماده", "Saved replies")} onClick={() => setSheet("replies")} />
        </Group>
      </>
    );
  }

  const okData = state.kind === "ok" ? state : null;
  return (
    <CoachPanelShell title={tr("صفحه‌ی من", "My page")}>
      {body}
      <CoachSheet open={sheet !== null} onClose={close} title={sheet ? sheetTitle()[sheet] : undefined} size={sheet === "profile" || sheet === "verification" || sheet === "templates" ? "lg" : "md"}>
        {sheet === "profile" && (
          <ProfileForm profile={profile} onSaved={(p) => { const first = !profile; setMentorSelf(p); if (first) load(); }} />
        )}
        {sheet === "verification" && <Verification profile={profile} onChanged={() => self.reload(true)} />}
        {sheet === "availability" && okData && <AvailabilityQuick bare initial={okData.settings} onChange={(d) => patch({ settings: d })} />}
        {(sheet === "capacity" || sheet === "response" || sheet === "intake") && okData && (
          <SettingsForm key={sheet} section={sheet} initial={okData.settings} onSaved={(d) => patch({ settings: d })} onDone={close} />
        )}
        {sheet === "alerts" && okData && <AlertsSettings initial={okData.alert} onSaved={(v) => patch({ alert: v })} onDone={close} />}
        {sheet === "labels" && okData && <LabelManager initial={okData.labels} onChange={(l) => patch({ labels: l })} />}
        {sheet === "templates" && <TemplatesList />}
        {sheet === "replies" && <SavedReplies />}
      </CoachSheet>
    </CoachPanelShell>
  );
}
