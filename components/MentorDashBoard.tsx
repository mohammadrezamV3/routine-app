"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, BadgeCheck, Ban, CalendarCheck, ClipboardList, EyeOff, Inbox,
  MessageCircle, Send, UserPlus, Users, Hourglass, Pencil, ChevronLeft, AtSign,
} from "lucide-react";
import { AccountBlock } from "./AccountUI";
import { AuthField } from "./AuthField";
import { DashCard } from "./DashCard";
import { LoadingBlock, Spinner } from "./Spinner";
import { ProgramStatusBadge } from "./ProgramStatusBadge";
import {
  MentorDashBar, MentorDashEmpty, MentorDashError, MentorDashNotice,
  fa, mentorApi, pct,
} from "./MentorDashKit";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { categoryLabel } from "./MentorBadges";
import { fmtDate, fmtRelative } from "@/lib/mentorFormat";
import { isValidUsername } from "@/lib/validate";
import { VERIFICATION_LABELS } from "@/lib/mentorCategories";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorDashboard, MentorSelf, MentorshipAction, MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";

const ROW = "flex items-center gap-3 border-b border-dash-border py-3 last:border-b-0";
const DANGER_BTN: React.CSSProperties = { borderColor: "rgba(224,82,82,.55)", color: "#E05252" };
const SMALL_BTN: React.CSSProperties = { padding: "6px 12px", fontSize: 12 };

/** داشبوردِ ساده‌ی منتور — عمدا یک پلتفرمِ آنالیتیکس نیست. */
export function MentorDashBoard({ self }: { self: MentorSelf }) {
  const [dash, setDash] = useState<MentorDashboard | null>(null);
  const [rows, setRows] = useState<MentorshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const [d, m] = await Promise.all([
      mentorApi<MentorDashboard>("/api/mentor/dashboard"),
      mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor"),
    ]);
    if (!d.ok) { setError(d.error); setLoading(false); return; }
    setDash(d.data);
    if (m.ok) setRows(m.data.mentorships || []);
    else setError(m.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !dash) return <LoadingBlock />;
  if (!dash) return <MentorDashError message={error || "داشبورد بارگذاری نشد"} onRetry={() => load()} />;

  const profile = dash.profile;
  const suspended = !!(profile?.suspendedAt ?? self.suspendedAt);
  const published = profile?.published ?? self.published;
  const identity = profile?.identityStatus ?? self.identityStatus;
  const active = rows.filter((r) => r.status === "ACTIVE");
  // درخواست‌هایی که خودِ منتور فرستاده (دعوت) و هنوز بی‌جواب‌اند
  const sentInvites = rows.filter((r) => r.status === "PENDING" && r.initiatedBy === "MENTOR");
  const incoming = dash.requests.filter((r) => r.status === "PENDING" && r.initiatedBy === "STUDENT");

  return (
    <div>
      {/* ── بنرهای وضعیت ── */}
      {suspended && (
        <MentorDashNotice tone="danger" icon={<Ban size={16} />} title="حساب منتوری‌ات معلق شده">
          {self.suspendedReason ? `دلیل: ${self.suspendedReason}. ` : ""}
          تا رفع تعلیق پروفایلت در فهرست منتورها دیده نمی‌شه و نمی‌تونی شاگرد جدید بپذیری یا برنامه بفرستی. برای پیگیری با پشتیبانی در ارتباط باش.
        </MentorDashNotice>
      )}
      {!published && !suspended && (
        <MentorDashNotice
          tone="warn" icon={<EyeOff size={16} />} title="پروفایلت هنوز منتشر نشده"
          action={<Link href="/mentor/profile" className="text-[12px] font-bold text-dash-green no-underline">تکمیل پروفایل</Link>}
        >
          تا منتشر نکنی، شاگردها نمی‌تونن پیدات کنن یا درخواست بدن. حداقل یک دسته و بیوگرافی لازمه.
        </MentorDashNotice>
      )}
      {identity !== "VERIFIED" && (
        <MentorDashNotice
          tone={identity === "REJECTED" ? "danger" : identity === "PENDING" ? "info" : "warn"}
          icon={<BadgeCheck size={16} />}
          title={`احراز هویت: ${VERIFICATION_LABELS[identity]}`}
          action={identity !== "PENDING" ? <Link href="/mentor/profile#verification" className="text-[12px] font-bold text-dash-green no-underline">{identity === "REJECTED" ? "ارسال دوباره" : "ارسال مدرک"}</Link> : undefined}
        >
          {identity === "PENDING"
            ? "مدرکت در صف بررسی ادمین‌های آریونه."
            : identity === "REJECTED"
              ? (self.identityRejectReason ? `دلیل رد: ${self.identityRejectReason}` : "مدرک شناسایی‌ات رد شد؛ لطفا مدرک واضح‌تری بفرست.")
              : "با احراز هویت، نشان «تأییدشده» روی پروفایلت می‌گیری و شاگردها راحت‌تر بهت اعتماد می‌کنن."}
        </MentorDashNotice>
      )}

      {error && <div className="form-inline-error mb-3">{error}</div>}

      {/* ── کاشی‌های آمار ── */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile icon={<Users size={16} />} label="کل شاگردها" value={dash.stats.students} delay={0} />
        <StatTile icon={<Activity size={16} />} label="شاگرد فعال" value={dash.stats.activeStudents} delay={0.04} />
        <StatTile icon={<Inbox size={16} />} label="درخواست در انتظار" value={dash.stats.pendingRequests} delay={0.08} />
        <StatTile icon={<Hourglass size={16} />} label="برنامه در انتظار تأیید" value={dash.stats.pendingPrograms} delay={0.12} />
      </div>

      {/* ── نیازمند توجه ── */}
      {dash.attention.length > 0 && (
        <AccountBlock title="نیازمند توجه" icon={<AlertTriangle size={15} />} index={0}>
          {dash.attention.map((a) => (
            <Link key={a.studentId + a.reason} href={`/mentor/students/${a.studentId}`} className={`${ROW} text-dash-text no-underline`}>
              <MentorUserAvatar avatarUrl={a.avatarUrl} name={a.name} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">{a.name}</span>
                <span className="block text-[11.5px] leading-6" style={{ color: "#e0a636" }}>{a.reason}</span>
              </span>
              <ChevronLeft size={16} className="shrink-0 text-dash-muted" />
            </Link>
          ))}
        </AccountBlock>
      )}

      {/* ── درخواست‌ها + دعوت ── */}
      <MentorDashRequests incoming={incoming} sent={sentInvites} suspended={suspended} categories={self.categories} onChanged={() => load(true)} />

      {/* ── شاگردها ── */}
      <AccountBlock title="شاگردهای فعال" icon={<Users size={15} />} index={2}>
        {active.length === 0 ? (
          <MentorDashEmpty>هنوز شاگرد فعالی نداری. درخواست‌ها رو بپذیر یا یک شاگرد رو با یوزرنیمش دعوت کن.</MentorDashEmpty>
        ) : active.map((r) => (
          <div key={r.id} className={ROW}>
            <Link href={`/mentor/students/${r.counterpart.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-dash-text no-underline">
              <MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={publicUserName(r.counterpart)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">{publicUserName(r.counterpart)}</span>
                <span className="block text-[11px] text-dash-muted">
                  {r.startedAt ? `از ${fmtDate(r.startedAt)}` : ""}
                  {r.activePrograms > 0 ? ` · ${fa(r.activePrograms)} برنامه‌ی فعال` : " · بدون برنامه‌ی فعال"}
                </span>
              </span>
            </Link>
            <Link href={`/mentorship/${r.id}`} className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-dash-green no-underline" aria-label={`چت با ${publicUserName(r.counterpart)}`}>
              <MessageCircle size={15} />
              {r.unread > 0 ? `${fa(r.unread)} پیام جدید` : "چت"}
            </Link>
          </div>
        ))}
      </AccountBlock>

      {/* ── برنامه‌های در انتظار ── */}
      <AccountBlock title="برنامه‌های در انتظار پاسخ شاگرد" icon={<ClipboardList size={15} />} index={3}>
        {dash.pendingPrograms.length === 0 ? (
          <MentorDashEmpty>برنامه‌ای در انتظار تأیید نیست.</MentorDashEmpty>
        ) : dash.pendingPrograms.map((p) => (
          <Link key={p.id} href={`/mentor-programs/${p.id}`} className={`${ROW} text-dash-text no-underline`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold">{p.title}</span>
              <span className="block text-[11px] text-dash-muted">
                {publicUserName(p.counterpart)} · {p.type === "WORKOUT" ? "تمرینی" : "روتین"}
                {p.sentAt ? ` · ارسال ${fmtRelative(p.sentAt)}` : ""}
                {p.version > 1 ? ` · نسخه ${fa(p.version)}` : ""}
              </span>
            </span>
            <ProgramStatusBadge status={p.status} />
          </Link>
        ))}
      </AccountBlock>

      {/* ── ۷ روز اخیر ── */}
      <AccountBlock title="پایبندی ۷ روز اخیر" icon={<CalendarCheck size={15} />} desc="فقط برنامه‌هایی که خودت فرستادی و شاگرد فعالش کرده." index={4}>
        {dash.completion.length === 0 ? (
          <MentorDashEmpty>هنوز داده‌ای برای ۷ روز اخیر ثبت نشده.</MentorDashEmpty>
        ) : dash.completion.map((c) => (
          <Link key={c.studentId} href={`/mentor/students/${c.studentId}`} className={`${ROW} text-dash-text no-underline`}>
            <MentorUserAvatar avatarUrl={c.avatarUrl} name={c.name} size={32} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] font-bold">{c.name}</span>
                <span className="shrink-0 text-[12px] font-bold text-dash-green">{pct(c.rate)}</span>
              </span>
              <span className="mt-1.5 block"><MentorDashBar rate={c.rate} /></span>
              <span className="mt-1 block text-[10.5px] text-dash-muted">
                {fa(c.completed)} انجام‌شده · {fa(c.partial)} ناقص · {fa(c.missed)} انجام‌نشده
              </span>
            </span>
          </Link>
        ))}
      </AccountBlock>

      {/* ── فعالیت اخیر ── */}
      <AccountBlock title="فعالیت اخیر" icon={<Activity size={15} />} index={5}>
        {dash.recentActivity.length === 0 ? (
          <MentorDashEmpty>فعالیتی ثبت نشده.</MentorDashEmpty>
        ) : dash.recentActivity.map((a, i) => {
          const icon = a.type === "message" ? <MessageCircle size={15} /> : a.type === "program" ? <ClipboardList size={15} /> : <CalendarCheck size={15} />;
          const body = (
            <>
              <span className="shrink-0 text-dash-green">{icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-6"><b>{a.studentName}</b> — {a.text}</span>
                <span className="block text-[10.5px] text-dash-muted">{fmtRelative(a.at)}</span>
              </span>
            </>
          );
          // url فقط مسیرِ داخلی — هر چیزِ دیگه لینک نمی‌شه
          return typeof a.url === "string" && a.url.startsWith("/") && !a.url.startsWith("//") ? (
            <Link key={i} href={a.url} className={`${ROW} text-dash-text no-underline`}>{body}</Link>
          ) : (
            <div key={i} className={ROW}>{body}</div>
          );
        })}
      </AccountBlock>

      <div className="mt-2 flex justify-center">
        <Link href="/mentor/profile" className="flex items-center gap-1.5 text-[12.5px] font-bold text-dash-green no-underline">
          <Pencil size={14} /> ویرایش پروفایل منتوری و احراز هویت
        </Link>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, delay }: { icon: React.ReactNode; label: string; value: number; delay: number }) {
  return (
    <DashCard delay={delay} className="!p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-dash-muted">
        <span className="text-dash-green">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-[22px] font-extrabold text-dash-text">{fa(value)}</div>
    </DashCard>
  );
}

/** درخواست‌های ورودی (پذیرش/رد)، دعوت‌های ارسالی (لغو) و فرمِ دعوت با یوزرنیم */
function MentorDashRequests({
  incoming, sent, suspended, categories, onChanged,
}: { incoming: MentorshipRow[]; sent: MentorshipRow[]; suspended: boolean; categories: string[]; onChanged: () => void }) {
  // حوزه‌ی دعوت (مثلا فقط «روتین») — پیش‌فرض همه‌ی حوزه‌های خودِ منتور
  const [cats, setCats] = useState<string[]>(categories);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [inviteState, setInviteState] = useState<{ sending: boolean; error: string | null; ok: string | null }>({ sending: false, error: null, ok: null });

  async function act(id: string, action: MentorshipAction) {
    if (busy) return;
    setBusy(id + action);
    setActionError(null);
    const r = await mentorApi<unknown>(`/api/mentorships/${id}`, { method: "PATCH", body: { action } });
    setBusy(null);
    if (!r.ok) { setActionError(r.error); if (r.status === 409 || r.status === 404) onChanged(); return; }
    onChanged();
  }

  async function invite() {
    const u = username.trim().replace(/^@/, "");
    if (!u) { setInviteState({ sending: false, error: "یوزرنیم شاگرد رو وارد کن", ok: null }); return; }
    if (!isValidUsername(u)) { setInviteState({ sending: false, error: "یوزرنیم باید ۳ تا ۲۰ کاراکتر انگلیسی/عدد/آندرلاین باشه", ok: null }); return; }
    if (categories.length > 0 && cats.length === 0) { setInviteState({ sending: false, error: "حداقل یک حوزه انتخاب کن", ok: null }); return; }
    setInviteState({ sending: true, error: null, ok: null });
    const body: { studentUsername: string; message?: string; categories?: string[] } = { studentUsername: u };
    if (categories.length > 0) body.categories = cats;
    if (message.trim()) body.message = message.trim();
    const r = await mentorApi<unknown>("/api/mentorships", { method: "POST", body });
    if (!r.ok) { setInviteState({ sending: false, error: r.error, ok: null }); return; }
    setUsername("");
    setMessage("");
    setInviteState({ sending: false, error: null, ok: `دعوت برای @${u} فرستاده شد` });
    onChanged();
  }

  return (
    <AccountBlock title="درخواست‌ها و دعوت" icon={<Inbox size={15} />} index={1}>
      {incoming.length === 0 && sent.length === 0 && <MentorDashEmpty>درخواست بی‌پاسخی نداری.</MentorDashEmpty>}

      {incoming.map((r) => (
        <div key={r.id} className="border-b border-dash-border py-3 last:border-b-0">
          <div className="flex items-center gap-3">
            <MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={publicUserName(r.counterpart)} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-dash-text">{publicUserName(r.counterpart)}</div>
              <div className="text-[11px] text-dash-muted">درخواست شاگردی{r.categories.length ? ` · ${r.categories.map(categoryLabel).join("، ")}` : ""} · {fmtRelative(r.createdAt)}</div>
            </div>
          </div>
          {r.message && <p className="mb-0 mt-2 whitespace-pre-line text-[12px] leading-6 text-dash-muted">«{r.message}»</p>}
          <div className="mt-2.5 flex flex-wrap justify-end gap-2">
            <button type="button" className="account-outline-btn" style={SMALL_BTN} disabled={!!busy || suspended} onClick={() => act(r.id, "accept")}>
              {busy === r.id + "accept" ? <Spinner size={13} /> : "پذیرش"}
            </button>
            <button type="button" className="account-outline-btn" style={{ ...SMALL_BTN, ...DANGER_BTN }} disabled={!!busy} onClick={() => act(r.id, "reject")}>
              {busy === r.id + "reject" ? <Spinner size={13} /> : "رد"}
            </button>
          </div>
        </div>
      ))}

      {sent.map((r) => (
        <div key={r.id} className={ROW}>
          <MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={publicUserName(r.counterpart)} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold text-dash-text">{publicUserName(r.counterpart)}</div>
            <div className="text-[11px] text-dash-muted">دعوتت در انتظار پاسخ شاگرده · {fmtRelative(r.createdAt)}</div>
          </div>
          <button type="button" className="account-outline-btn muted" style={SMALL_BTN} disabled={!!busy} onClick={() => act(r.id, "cancel")}>
            {busy === r.id + "cancel" ? <Spinner size={13} /> : "لغو دعوت"}
          </button>
        </div>
      ))}

      {actionError && <div className="form-inline-error">{actionError}</div>}

      <div className="mt-4 border-t border-dash-border pt-4">
        <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-dash-text"><UserPlus size={15} className="text-dash-green" /> دعوت شاگرد با یوزرنیم</div>
        <p className="mb-3 mt-0 text-[11.5px] leading-6 text-dash-muted">شاگرد باید دعوت رو خودش بپذیره؛ تا اون موقع هیچ اطلاعاتی از او نمی‌بینی.</p>
        {suspended ? (
          <MentorDashEmpty>در حالت تعلیق امکان دعوت شاگرد جدید نیست.</MentorDashEmpty>
        ) : (
          <>
            <div className="acc-field-stack" style={{ marginTop: 0 }}>
              <AuthField id="md-invite-user" label="یوزرنیم شاگرد" icon={<AtSign size={16} />} error={inviteState.error && !username.trim() ? inviteState.error : undefined}>
                <input
                  id="md-invite-user" type="text" className="wsearch-newform-name mono" dir="ltr" style={{ textAlign: "right" }}
                  value={username} placeholder="username" autoComplete="off" maxLength={21}
                  onChange={(e) => { setUsername(e.target.value); setInviteState((s) => ({ ...s, error: null, ok: null })); }}
                  onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
                />
              </AuthField>
              {categories.length > 1 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-bold text-dash-text">حوزه</div>
                  <div className="trade-tag-row" role="group" aria-label="حوزه">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`trade-tag-chip${cats.includes(c) ? " active" : ""}`}
                        aria-pressed={cats.includes(c)}
                        onClick={() => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
                      >
                        {categoryLabel(c)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <AuthField id="md-invite-msg" label="پیام (اختیاری)">
                <textarea
                  id="md-invite-msg" className="wsearch-newform-name acc-textarea" rows={2} maxLength={500}
                  value={message} onChange={(e) => setMessage(e.target.value)} placeholder="سلام، خوشحال می‌شم کمکت کنم…"
                />
              </AuthField>
            </div>
            {inviteState.error && username.trim() && <div className="form-inline-error">{inviteState.error}</div>}
            {inviteState.ok && <div className="mt-2.5 text-center text-[12px] font-bold text-dash-green" role="status">{inviteState.ok}</div>}
            <div className="mt-3 flex justify-end">
              <button type="button" className="account-outline-btn" onClick={invite} disabled={inviteState.sending}>
                {inviteState.sending ? <Spinner size={14} /> : <><Send size={14} /> ارسال دعوت</>}
              </button>
            </div>
          </>
        )}
      </div>
    </AccountBlock>
  );
}
