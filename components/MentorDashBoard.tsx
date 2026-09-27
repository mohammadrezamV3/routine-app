"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, Ban, BadgeCheck, CalendarCheck, CalendarDays, Check, CircleSlash,
  ClipboardList, Dumbbell, Eye, EyeOff, Hourglass, Inbox, MessageCircle, Pencil, Send, UserPlus, UserRound, Users, X, XCircle,
} from "lucide-react";
import { LoadingBlock, Spinner } from "./Spinner";
import { ProgramStatusBadge } from "./ProgramStatusBadge";
import { MentorDashBar, MentorDashError, fa, mentorApi, pct } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmpty, MentorField, MentorNotice, MentorRow, MentorSection } from "./MentorUI";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { MentorAvailabilityQuick } from "./MentorAvailabilityQuick";
import { MentorIntakeAnswers } from "./MentorIntakeAnswers";
import { MentorDashTools } from "./MentorDashTools";
import { MentorBroadcast } from "./MentorBroadcast";
import { categoryLabel } from "./MentorBadges";
import { fmtDate, fmtRelative, fmtWeekday } from "@/lib/mentorFormat";
import { isValidUsername } from "@/lib/validate";
import { VERIFICATION_LABELS } from "@/lib/mentorCategories";
import { publicUserName } from "@/lib/mentorTypes";
import type {
  MentorDashboard, MentorSelf, MentorshipAction, MentorshipRow, MentorshipsResponse, VerificationStatus,
} from "@/lib/mentorTypes";

/** تعداد ردیف‌های «فعالیت اخیر» پیش از بازکردنِ کامل */
const ACTIVITY_PREVIEW = 5;

const ic = (Icon: typeof Users, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/** چیپ وضعیت احراز هویت (یک خط؛ PENDING هرگز جعبه/اطلاعیه نیست) */
function IdentityChip({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "PENDING": return <MentorChip tone="info" icon={ic(Hourglass, MI.chip)}>{VERIFICATION_LABELS.PENDING}</MentorChip>;
    case "VERIFIED": return <MentorChip tone="accent" icon={ic(BadgeCheck, MI.chip)}>{VERIFICATION_LABELS.VERIFIED}</MentorChip>;
    case "REJECTED": return <MentorChip tone="danger" icon={ic(XCircle, MI.chip)}>{VERIFICATION_LABELS.REJECTED}</MentorChip>;
    default: return <MentorChip tone="neutral" icon={ic(CircleSlash, MI.chip)}>{VERIFICATION_LABELS.NOT_PROVIDED}</MentorChip>;
  }
}

/** داشبورد منتور: وضعیت‌های نیازمند اقدام، شاگردها، درخواست‌ها، برنامه‌ها. */
export function MentorDashBoard({ self }: { self: MentorSelf }) {
  const [dash, setDash] = useState<MentorDashboard | null>(null);
  const [rows, setRows] = useState<MentorshipRow[]>([]);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allActivity, setAllActivity] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const [d, m] = await Promise.all([
      mentorApi<MentorDashboard>("/api/mentor/dashboard"),
      mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor"),
    ]);
    setLoading(false);
    if (!d.ok) { setError(d.error); return; }
    setDash(d.data);
    if (m.ok) { setRows(m.data.mentorships || []); setRowsError(null); }
    else setRowsError(m.error);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !dash) return <LoadingBlock />;
  if (!dash) return <MentorDashError message={error || "داشبورد دریافت نشد؛ دوباره تلاش کن"} onRetry={() => load()} />;

  const profile = dash.profile;
  const suspended = !!(profile?.suspendedAt ?? self.suspendedAt);
  const published = profile?.published ?? self.published;
  const identity = profile?.identityStatus ?? self.identityStatus;
  const active = rows.filter((r) => r.status === "ACTIVE");
  // همکاریِ متوقف‌شده هشدارِ پایبندی نمی‌گیرد
  const pausedIds = new Set(active.filter((r) => r.pausedAt).map((r) => r.counterpart.id));
  const attention = dash.attention.filter((a) => !pausedIds.has(a.studentId));
  // دعوت‌هایی که خود منتور فرستاده و هنوز بی‌پاسخ‌اند
  const sentInvites = rows.filter((r) => r.status === "PENDING" && r.initiatedBy === "MENTOR");
  const incoming = dash.requests.filter((r) => r.status === "PENDING" && r.initiatedBy === "STUDENT");

  // اطلاعیه‌ها فقط برای وضعیت‌هایی که اقدام می‌خواهند؛ حداکثر دو مورد، به‌ترتیب شدت
  const notices: React.ReactNode[] = [];
  if (suspended) {
    notices.push(
      <MentorNotice key="susp" tone="danger" icon={ic(Ban, MI.row)} title="حساب منتوری معلق است">
        {self.suspendedReason || "تا رفع تعلیق، شاگرد جدید و ارسال برنامه ممکن نیست"}
      </MentorNotice>,
    );
  }
  if (identity === "REJECTED") {
    notices.push(
      <MentorNotice
        key="idrej" tone="danger" icon={ic(XCircle, MI.row)} title="مدرک شناسایی رد شد"
        action={<Link href="/mentor/profile#verification" className="mentor-link">ارسال دوباره</Link>}
      >
        {self.identityRejectReason || "مدرک واضح‌تری بفرست"}
      </MentorNotice>,
    );
  }
  if (!published && !suspended) {
    notices.push(
      <MentorNotice
        key="unpub" tone="warn" icon={ic(EyeOff, MI.row)} title="پروفایل منتشر نشده"
        action={<Link href="/mentor/profile" className="mentor-link">تکمیل پروفایل</Link>}
      >
        شاگردها تا انتشار آن را نمی‌بینند
      </MentorNotice>,
    );
  }
  if (identity === "NOT_PROVIDED") {
    notices.push(
      <MentorNotice
        key="idnone" tone="warn" icon={ic(AlertCircle, MI.row)} title="احراز هویت انجام نشده"
        action={<Link href="/mentor/profile#verification" className="mentor-link">ارسال مدرک</Link>}
      >
        پس از تأیید، نشان «هویت تأییدشده» روی پروفایلت نمایش داده می‌شود
      </MentorNotice>,
    );
  }

  return (
    <>
      {notices.slice(0, 2)}

      <div className="mentor-stats" style={{ marginTop: 0, marginBottom: "var(--m-4)" }}>
        <div className="mentor-stat"><b>{fa(dash.stats.students)}</b><span>{ic(Users, MI.chip)} کل شاگردها</span></div>
        <div className="mentor-stat"><b>{fa(dash.stats.activeStudents)}</b><span>{ic(Activity, MI.chip)} شاگرد فعال</span></div>
        <div className="mentor-stat"><b>{fa(dash.stats.pendingRequests)}</b><span>{ic(Inbox, MI.chip)} درخواست بی‌پاسخ</span></div>
        <div className="mentor-stat"><b>{fa(dash.stats.pendingPrograms)}</b><span>{ic(Hourglass, MI.chip)} برنامه‌ی منتظر پاسخ</span></div>
      </div>

      <MentorAvailabilityQuick />

      {attention.length > 0 && (
        <MentorSection title="نیازمند توجه" icon={ic(AlertCircle, MI.section)} count={fa(attention.length)} flush>
          {attention.map((a) => (
            <MentorRow
              key={a.studentId + a.reason}
              href={`/mentor/students/${a.studentId}`}
              lead={<MentorUserAvatar avatarUrl={a.avatarUrl} name={a.name} size={36} />}
              title={a.name}
              sub={<span>{a.reason}</span>}
            />
          ))}
        </MentorSection>
      )}

      <MentorDashRequests incoming={incoming} sent={sentInvites} suspended={suspended} onChanged={() => load(true)} />

      <MentorSection
        title="شاگردهای فعال" icon={ic(Users, MI.section)} count={active.length ? fa(active.length) : undefined} flush
        action={active.length > 0 ? <Link href="/mentor/students" className="mentor-link">همه</Link> : undefined}
      >
        {rowsError ? (
          <MentorEmpty>فهرست شاگردها دریافت نشد؛ صفحه را تازه کن</MentorEmpty>
        ) : active.length === 0 ? (
          <MentorEmpty>هنوز شاگرد فعالی نداری</MentorEmpty>
        ) : active.map((r) => {
          const name = publicUserName(r.counterpart);
          return (
            <MentorRow
              key={r.id}
              href={`/mentor/students/${r.counterpart.id}`}
              lead={<MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={name} size={36} />}
              title={name}
              sub={
                <>
                  {r.startedAt && <span>از {fmtDate(r.startedAt)}</span>}
                  <span>{r.activePrograms > 0 ? `${fa(r.activePrograms)} برنامه‌ی فعال` : "بدون برنامه‌ی فعال"}</span>
                  {r.categories.length > 0 && <span>{r.categories.map(categoryLabel).join("، ")}</span>}
                </>
              }
              end={r.unread > 0 || r.pausedAt ? (
                <>
                  {r.pausedAt && <MentorChip tone="neutral" icon={ic(CircleSlash, MI.chip)}>متوقف</MentorChip>}
                  {r.unread > 0 && (
                    <span className="mentor-unread" title={`${fa(r.unread)} پیام خوانده‌نشده`} aria-label={`${fa(r.unread)} پیام خوانده‌نشده`}>{fa(r.unread)}</span>
                  )}
                </>
              ) : undefined}
            />
          );
        })}
      </MentorSection>

      {/* ارسالِ گروهیِ رمزگذاری‌شده (agent D) — خودکفا در MentorBroadcast.tsx */}
      {!suspended && !rowsError && <MentorBroadcast activeCount={active.length} />}

      <MentorSection title="منتظر پاسخ شاگرد" icon={ic(ClipboardList, MI.section)} count={dash.pendingPrograms.length ? fa(dash.pendingPrograms.length) : undefined} flush>
        {dash.pendingPrograms.length === 0 ? (
          <MentorEmpty>برنامه‌ای منتظر پاسخ شاگرد نیست</MentorEmpty>
        ) : dash.pendingPrograms.map((p) => (
          <MentorRow
            key={p.id}
            href={`/mentor-programs/${p.id}`}
            lead={p.type === "WORKOUT" ? ic(Dumbbell, MI.row) : ic(CalendarCheck, MI.row)}
            title={p.title}
            sub={
              <>
                <span>{publicUserName(p.counterpart)}</span>
                {p.sentAt && <span>ارسال {fmtRelative(p.sentAt)}</span>}
                {p.version > 1 && <span>نسخه‌ی {fa(p.version)}</span>}
              </>
            }
            end={<ProgramStatusBadge status={p.status} />}
          />
        ))}
      </MentorSection>

      <MentorSection
        title="پایبندی 7 روز اخیر" icon={ic(CalendarDays, MI.section)} flush
        desc="فقط برنامه‌هایی که فرستاده‌ای و شاگرد فعال کرده است"
      >
        {dash.completion.length === 0 ? (
          <MentorEmpty>در 7 روز اخیر ثبتی نیست</MentorEmpty>
        ) : dash.completion.map((c) => (
          <MentorRow
            key={c.studentId}
            href={`/mentor/students/${c.studentId}`}
            lead={<MentorUserAvatar avatarUrl={c.avatarUrl} name={c.name} size={36} />}
            title={c.name}
            sub={c.completed + c.partial + c.missed === 0 ? (
              <span>در این 7 روز آیتم سررسیدی نداشت</span>
            ) : (
              <>
                <span>{fa(c.completed)} انجام‌شده</span>
                <span>{fa(c.partial)} ناقص</span>
                <span>{fa(c.missed)} انجام‌نشده</span>
              </>
            )}
            end={c.completed + c.partial + c.missed === 0 ? (
              // «0٪» برای کسی که هنوز چیزی برای سنجیدن ندارد گمراه‌کننده است
              <MentorChip tone="neutral" icon={ic(CircleSlash, MI.chip)}>بدون ثبت</MentorChip>
            ) : (
              <span className="mentor-progress" style={{ marginTop: 0, width: 96 }}>
                <MentorDashBar rate={c.rate} />
                <span className="mentor-progress-value">{pct(c.rate)}</span>
              </span>
            )}
          />
        ))}
      </MentorSection>

      <MentorSection
        title="فعالیت اخیر" icon={ic(Activity, MI.section)} flush
        action={dash.recentActivity.length > ACTIVITY_PREVIEW ? (
          <button type="button" className="mentor-text-btn" onClick={() => setAllActivity((v) => !v)} aria-expanded={allActivity}>
            {allActivity ? "نمایش کمتر" : `همه (${fa(dash.recentActivity.length)})`}
          </button>
        ) : undefined}
      >
        {dash.recentActivity.length === 0 ? (
          <MentorEmpty>فعالیتی ثبت نشده است</MentorEmpty>
        ) : (allActivity ? dash.recentActivity : dash.recentActivity.slice(0, ACTIVITY_PREVIEW)).map((a, i) => {
          const lead = a.type === "message" ? ic(MessageCircle, MI.row) : a.type === "program" ? ic(ClipboardList, MI.row) : ic(CalendarCheck, MI.row);
          // url فقط مسیر داخلی؛ هر چیز دیگری لینک نمی‌شود
          const internal = typeof a.url === "string" && a.url.startsWith("/") && !a.url.startsWith("//");
          return (
            <MentorRow
              key={i}
              href={internal ? a.url : undefined}
              lead={lead}
              title={a.studentName}
              sub={<><span>{a.text}</span><span>{a.day ? fmtWeekday(a.day) : fmtRelative(a.at)}</span></>}
            />
          );
        })}
      </MentorSection>

      <MentorDashInvite suspended={suspended} categories={self.categories} onSent={() => load(true)} />

      <MentorDashTools />

      <MentorSection
        title="پروفایل" icon={ic(UserRound, MI.section)} flush
        action={<Link href="/mentor/profile" className="mentor-link">{ic(Pencil, MI.btnSm)} ویرایش</Link>}
      >
        <MentorRow
          title="نمایش در فهرست منتورها"
          end={suspended
            ? <MentorChip tone="danger" icon={ic(Ban, MI.chip)}>معلق</MentorChip>
            : published
              ? <MentorChip tone="accent" icon={ic(Eye, MI.chip)}>منتشرشده</MentorChip>
              : <MentorChip tone="neutral" icon={ic(EyeOff, MI.chip)}>منتشرنشده</MentorChip>}
        />
        <MentorRow title="احراز هویت" end={<IdentityChip status={identity} />} />
      </MentorSection>
    </>
  );
}

/** درخواست‌های ورودی (پذیرش/رد) و دعوت‌های ارسالیِ بی‌پاسخ (لغو) */
function MentorDashRequests({
  incoming, sent, suspended, onChanged,
}: { incoming: MentorshipRow[]; sent: MentorshipRow[]; suspended: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(id: string, action: MentorshipAction) {
    if (busy) return;
    setBusy(id + action);
    setActionError(null);
    const r = await mentorApi<unknown>(`/api/mentorships/${id}`, { method: "PATCH", body: { action } });
    setBusy(null);
    if (!r.ok) { setActionError(r.error); if (r.status === 409 || r.status === 404) onChanged(); return; }
    onChanged();
  }

  const total = incoming.length + sent.length;
  return (
    <MentorSection title="درخواست‌ها" icon={ic(Inbox, MI.section)} count={total ? fa(total) : undefined} flush>
      {total === 0 && <MentorEmpty>درخواست بی‌پاسخی نیست</MentorEmpty>}

      {incoming.map((r) => {
        const name = publicUserName(r.counterpart);
        return (
          <MentorRow
            key={r.id}
            lead={<MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={name} size={36} />}
            title={name}
            sub={
              <>
                <span>درخواست شاگردی</span>
                {r.categories.length > 0 && <span>{r.categories.map(categoryLabel).join("، ")}</span>}
                <span>{fmtRelative(r.createdAt)}</span>
              </>
            }
            below={
              <>
                {r.message && <p className="mentor-quote">{r.message}</p>}
                <MentorIntakeAnswers answers={r.intakeAnswers} />
                <div className="mentor-btn-group is-end">
                  <button type="button" className="account-outline-btn muted mentor-btn is-sm" disabled={!!busy} onClick={() => act(r.id, "reject")}>
                    {busy === r.id + "reject" ? <Spinner size={14} /> : <>{ic(X, MI.btnSm)} رد درخواست</>}
                  </button>
                  <button
                    type="button" className="trade-primary-btn mentor-btn is-sm" disabled={!!busy || suspended}
                    title={suspended ? "در حالت تعلیق، شاگرد جدید پذیرفته نمی‌شود" : undefined}
                    onClick={() => act(r.id, "accept")}
                  >
                    {busy === r.id + "accept" ? <Spinner size={14} /> : <>{ic(Check, MI.btnSm)} پذیرفتن</>}
                  </button>
                </div>
              </>
            }
          />
        );
      })}

      {sent.map((r) => {
        const name = publicUserName(r.counterpart);
        return (
          <MentorRow
            key={r.id}
            lead={<MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={name} size={36} />}
            title={name}
            sub={<><span>{ic(Hourglass, MI.chip)} منتظر پاسخ شاگرد</span><span>دعوت {fmtRelative(r.createdAt)}</span></>}
            end={
              <button type="button" className="account-outline-btn muted mentor-btn is-sm" disabled={!!busy} onClick={() => act(r.id, "cancel")}>
                {busy === r.id + "cancel" ? <Spinner size={14} /> : "لغو دعوت"}
              </button>
            }
          />
        );
      })}

      {actionError && (
        <div style={{ padding: "0 var(--m-4) var(--m-4)" }}>
          <div className="form-inline-error" role="alert">{actionError}</div>
        </div>
      )}
    </MentorSection>
  );
}

/** دعوت شاگرد با یوزرنیم */
function MentorDashInvite({
  suspended, categories, onSent,
}: { suspended: boolean; categories: string[]; onSent: () => void }) {
  // حوزه‌ی دعوت (مثلاً فقط «روتین»)؛ پیش‌فرض همه‌ی حوزه‌های خود منتور
  const [cats, setCats] = useState<string[]>(categories);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [userErr, setUserErr] = useState<string | null>(null);
  const [catErr, setCatErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function invite(e?: React.FormEvent) {
    e?.preventDefault();
    if (sending) return;
    setError(null);
    setSent(false);
    const u = username.trim().replace(/^@/, "");
    if (!u) { setUserErr("یوزرنیم شاگرد را وارد کن"); return; }
    if (!isValidUsername(u)) { setUserErr("یوزرنیم 3 تا 20 نویسه است: حرف انگلیسی، عدد یا زیرخط"); return; }
    if (categories.length > 0 && cats.length === 0) { setCatErr("حداقل یک حوزه انتخاب کن"); return; }
    setSending(true);
    const body: { studentUsername: string; message?: string; categories?: string[] } = { studentUsername: u };
    if (categories.length > 0) body.categories = cats;
    if (message.trim()) body.message = message.trim();
    const r = await mentorApi<unknown>("/api/mentorships", { method: "POST", body });
    setSending(false);
    if (!r.ok) { setError(r.error); return; }
    setUsername("");
    setMessage("");
    setSent(true);
    setTimeout(() => setSent(false), 2400);
    onSent();
  }

  return (
    <MentorSection title="دعوت شاگرد" icon={ic(UserPlus, MI.section)}>
      {suspended ? (
        <MentorEmpty>در حالت تعلیق، دعوت شاگرد جدید ممکن نیست</MentorEmpty>
      ) : (
        <form onSubmit={invite} noValidate>
          <div className="mentor-form">
            <MentorField
              label="یوزرنیم شاگرد" htmlFor="md-invite-user" error={userErr}
              hint="شاگرد تا پذیرش دعوت، اطلاعاتی با تو به اشتراک نمی‌گذارد"
            >
              <input
                id="md-invite-user" type="text" className="wsearch-newform-name trade-glass-field mono" dir="ltr"
                style={{ textAlign: "right" }} value={username} placeholder="username" autoComplete="off" maxLength={21}
                onChange={(e) => { setUsername(e.target.value); setUserErr(null); setError(null); setSent(false); }}
              />
            </MentorField>
            {categories.length > 1 && (
              <MentorField label="حوزه‌ی همکاری" error={catErr}>
                <div className="trade-choice-grid" role="group" aria-label="حوزه‌ی همکاری">
                  {categories.map((c) => {
                    const on = cats.includes(c);
                    return (
                      <button
                        key={c} type="button" className={`trade-choice${on ? " active" : ""}`} aria-pressed={on}
                        onClick={() => { setCats((p) => (on ? p.filter((x) => x !== c) : [...p, c])); setCatErr(null); }}
                      >
                        {categoryLabel(c)}
                      </button>
                    );
                  })}
                </div>
              </MentorField>
            )}
            <MentorField label="پیام" htmlFor="md-invite-msg" optional>
              <textarea
                id="md-invite-msg" className="wsearch-newform-name trade-glass-field" rows={2} maxLength={500}
                value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="مثلاً «برای برنامه‌ی تمرینی این فصل با هم کار کنیم»"
              />
            </MentorField>
          </div>
          {error && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="mentor-form-actions">
            <button type="submit" className="trade-primary-btn mentor-btn" disabled={sending}>
              {sending ? <Spinner size={14} /> : sent ? <>{ic(Check, MI.btn)} دعوت ارسال شد</> : <>{ic(Send, MI.btn)} ارسال دعوت</>}
            </button>
          </div>
        </form>
      )}
    </MentorSection>
  );
}
