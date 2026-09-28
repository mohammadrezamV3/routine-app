"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarCheck, Check, ChevronLeft, ClipboardList, Dumbbell, Eye, Inbox, Lock, MessageCircle, Pencil, Plus, ShieldCheck, X,
} from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorList, MentorListItem, MentorSwap } from "@/components/MentorMotion";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorshipStateNote } from "@/components/MentorshipStateNote";
import { MentorshipStatusBadge, ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { ProgramRespondModal } from "@/components/ProgramRespondModal";
import { MentorKebabMenu } from "@/components/MentorKebabMenu";
import { useMentorshipActions } from "@/components/MentorshipActions";
import { useMentorshipRelation, type Relation } from "@/components/useMentorshipRelation";
import { MentorTermsAcceptance, isMentorTermsError, mentorTermsPayload, useMentorTermsStatus } from "@/components/MentorTermsAcceptance";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { AccountSaveBar } from "@/components/AccountUI";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { getCustomOccurrences, IMPORTANCE_LABELS, type CustomOccurrence, type Importance } from "@/lib/storage";
import type { PrivacyResponse, PrivacyScope, PrivacySettings, ProgramRow, ProgramsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { categoryLabel } from "@/components/MentorBadges";
import { fmtDate, fmtDay, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";

type Role = "student" | "mentor";
type Tab = "programs" | "privacy";

const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const ROW = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * صفحه‌ی یک رابطه‌ی منتوری (هر دو طرف). ترتیب عمداً بر اساسِ «چه کاری الان
 * با توست»:
 *   ۱. پاسخ به دعوت/درخواست (اگر منتظرِ توست)
 *   ۲. برنامه‌های تازه‌ای که منتظرِ پاسخِ تو هستند، با یادداشتِ منتور و دکمه‌های پذیرش
 *   ۳. ورود به گفت‌وگو (صفحه‌ی جدا: /mentorship/[id]/chat)
 *   ۴. برنامه‌ها (هر کدام با یادداشتِ منتور) و برای شاگرد «دسترسی‌ها»
 * اقدام‌های مخرب (پایان، لغو، مسدودی، گزارشِ گفت‌وگو) فقط در منوی سه‌نقطه‌ی سر.
 */
export default function MentorshipPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { rel, error, reload } = useMentorshipRelation(id);
  const { actions, dialogs } = useMentorshipActions({
    rel,
    onChanged: reload,
    onReportConversation: () => router.push(`/mentorship/${id}/chat?report=1`),
  });

  const back = rel?.role === "mentor"
    ? { href: `/mentor/students/${rel.row.counterpart.id}`, label: publicUserName(rel.row.counterpart) }
    : { href: "/mentorship", label: "منتورهای من" };
  const name = rel ? publicUserName(rel.row.counterpart) : "";

  const head = rel ? (
    <div className="mentor-head-custom">
      <MentorUserAvatar name={name} avatarUrl={rel.row.counterpart.avatarUrl} size={48} />
      <div className="mentor-rel-id">
        <h1>{name}</h1>
        <div className="mentor-rel-sub">
          <span>{rel.role === "student" ? "منتور تو" : "شاگرد تو"}</span>
          <MentorshipStatusBadge status={rel.row.status} />
          {rel.row.startedAt && <span>از {fmtDate(rel.row.startedAt)}</span>}
        </div>
      </div>
      <MentorKebabMenu actions={actions} label="گزینه‌های رابطه" />
    </div>
  ) : null;

  return (
    <MentorPageShell back={rel || error ? back : null} head={head} surface={!!rel}>
      {error ? (
        <MentorErrorState message={error.msg} onRetry={error.retry ? reload : undefined} />
      ) : !rel ? (
        <LoadingBlock />
      ) : (
        <Relationship rel={rel} reload={reload} />
      )}
      {dialogs}
    </MentorPageShell>
  );
}

function Relationship({ rel, reload }: { rel: Relation; reload: () => void }) {
  const { row, role } = rel;
  const name = publicUserName(row.counterpart);
  const [tab, setTab] = useState<Tab>("programs");
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [respond, setRespond] = useState<{ id: string; action: "reject" | "request_changes" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ key: string; msg: string } | null>(null);
  const terms = useMentorTermsStatus();
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [forceTerms, setForceTerms] = useState(false);

  const isPending = row.status === "PENDING";
  const iMustAnswer = isPending && ((role === "student" && row.initiatedBy === "MENTOR") || (role === "mentor" && row.initiatedBy === "STUDENT"));
  const chatOpen = row.status === "ACTIVE" || row.status === "ENDED";
  const needTerms = role === "student" && iMustAnswer && (forceTerms || (!terms.loading && !terms.studentAccepted));

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "privacy" && role === "student") setTab("privacy");
  }, [role]);

  const loadPrograms = useCallback(async () => {
    setProgramsError(null);
    try {
      const res = await fetch(`/api/mentor-programs?role=${role}&mentorshipId=${encodeURIComponent(row.id)}`, { cache: "no-store" });
      if (!res.ok) { setProgramsError(await readApiError(res, "برنامه‌ها دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: ProgramsResponse = await res.json();
      setPrograms(d.programs || []);
    } catch {
      setProgramsError(NETWORK_ERROR);
    }
  }, [row.id, role]);
  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  function changeTab(t: Tab) {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "programs") url.searchParams.delete("tab"); else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  }

  async function answer(action: "accept" | "reject") {
    if (action === "accept" && needTerms && !termsChecked) { setTermsError("برای پذیرش، شرایط را بپذیر"); return; }
    setBusy(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/mentorships/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "accept" ? mentorTermsPayload(needTerms && termsChecked) : {}) }),
      });
      if (!res.ok) {
        const j = await res.clone().json().catch(() => null);
        if (isMentorTermsError(j)) { setForceTerms(true); setTermsChecked(false); setTermsError(j?.error ?? null); return; }
        setActionError({ key: "rel", msg: await readApiError(res) });
        return;
      }
      if (action === "accept") terms.refresh();
      reload();
      loadPrograms();
    } catch {
      setActionError({ key: "rel", msg: NETWORK_ERROR });
    } finally {
      setBusy(null);
    }
  }

  async function acceptProgram(p: ProgramRow) {
    setBusy(`accept:${p.id}`);
    setActionError(null);
    try {
      const res = await fetch(`/api/mentor-programs/${p.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) { setActionError({ key: p.id, msg: await readApiError(res) }); return; }
      loadPrograms();
    } catch {
      setActionError({ key: p.id, msg: NETWORK_ERROR });
    } finally {
      setBusy(null);
    }
  }

  const waiting = useMemo(() => (role === "student" ? (programs ?? []).filter((p) => p.status === "PENDING") : []), [programs, role]);
  const others = useMemo(() => (programs ?? []).filter((p) => !waiting.includes(p)), [programs, waiting]);

  const programsSection = (
    <MentorSection
      title="برنامه‌ها"
      icon={<ClipboardList {...SECTION} />}
      count={others.length ? faNum(others.length) : undefined}
      action={
        role === "mentor" && row.status === "ACTIVE" ? (
          <Link href={`/mentor/programs/new?mentorshipId=${encodeURIComponent(row.id)}`} className="mentor-text-btn">
            <Plus {...BTN_SM} /> برنامه‌ی جدید
          </Link>
        ) : undefined
      }
      flush
    >
      {programsError ? (
        <MentorErrorState message={programsError} onRetry={loadPrograms} />
      ) : programs === null ? (
        <LoadingBlock />
      ) : others.length === 0 ? (
        <MentorEmpty>
          {waiting.length ? "برنامه‌ی دیگری نیست" : role === "student" ? "هنوز برنامه‌ای از این منتور نرسیده است" : "هنوز برنامه‌ای برای این شاگرد نساخته‌ای"}
        </MentorEmpty>
      ) : (
        <MentorList>
          {others.map((p) => (
            <MentorListItem key={p.id}>
              <MentorRow
                href={`/mentor-programs/${p.id}`}
                lead={p.type === "WORKOUT" ? <Dumbbell {...ROW} /> : <CalendarCheck {...ROW} />}
                title={p.title}
                sub={<ProgramFacts p={p} />}
                end={<ProgramStatusBadge status={p.status} />}
                below={p.note?.trim() ? <MentorNote note={p.note} role={role} /> : undefined}
              />
            </MentorListItem>
          ))}
        </MentorList>
      )}
    </MentorSection>
  );

  return (
    <>
      {iMustAnswer && (
        <MentorSection title={role === "student" ? "دعوت منتوری" : "درخواست منتوری"} icon={<Inbox {...SECTION} />}>
          <div className="mentor-form mentor-decision">
            {row.categories.length > 0 && (
              <div className="mentor-chips">
                {row.categories.map((c) => <span key={c} className="mentor-chip is-cat"><span>{categoryLabel(c)}</span></span>)}
              </div>
            )}
            {row.message && <p className="mentor-quote">{row.message}</p>}
            {needTerms && (
              <MentorTermsAcceptance role="student" checked={termsChecked} onChange={(v) => { setTermsChecked(v); setTermsError(null); }} error={termsError} />
            )}
            {actionError?.key === "rel" && <div className="form-inline-error" role="alert">{actionError.msg}</div>}
            <div className="mentor-form-actions">
              <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => answer("reject")} disabled={!!busy}>
                {busy === "reject" ? <Spinner size={14} /> : <><X {...BTN} /> رد {role === "student" ? "دعوت" : "درخواست"}</>}
              </button>
              <button type="button" className="trade-primary-btn mentor-btn" onClick={() => answer("accept")} disabled={!!busy || (needTerms && !termsChecked)}>
                {busy === "accept" ? <Spinner size={14} /> : <><Check {...BTN} /> پذیرفتن</>}
              </button>
            </div>
          </div>
        </MentorSection>
      )}

      <MentorshipStateNote row={row} role={role} />

      {waiting.length > 0 && (
        <MentorSection title="برنامه‌ی تازه؛ منتظر پاسخ تو" icon={<Inbox {...SECTION} />} count={faNum(waiting.length)}>
          <MentorList>
            {waiting.map((p) => (
              <MentorListItem key={p.id}>
                <div className="mentor-decision-card">
                  <Link href={`/mentor-programs/${p.id}`} className="mentor-decision-title">
                    {p.type === "WORKOUT" ? <Dumbbell {...ROW} /> : <CalendarCheck {...ROW} />}
                    <span>{p.title}</span>
                    <ChevronLeft size={16} strokeWidth={1.75} className="mentor-row-chevron" aria-hidden />
                  </Link>
                  <div className="mentor-row-sub"><ProgramFacts p={p} /></div>
                  {p.note?.trim() && <MentorNote note={p.note} role={role} />}
                  {actionError?.key === p.id && <div className="form-inline-error" role="alert">{actionError.msg}</div>}
                  <div className="mentor-form-actions">
                    <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => setRespond({ id: p.id, action: "reject" })} disabled={!!busy}>
                      <X {...BTN} /> رد
                    </button>
                    <button type="button" className="account-outline-btn mentor-btn" onClick={() => setRespond({ id: p.id, action: "request_changes" })} disabled={!!busy}>
                      <Pencil {...BTN} /> درخواست تغییر
                    </button>
                    <button type="button" className="trade-primary-btn mentor-btn" onClick={() => acceptProgram(p)} disabled={!!busy}>
                      {busy === `accept:${p.id}` ? <Spinner size={14} /> : <><Check {...BTN} /> پذیرفتن برنامه</>}
                    </button>
                  </div>
                </div>
              </MentorListItem>
            ))}
          </MentorList>
        </MentorSection>
      )}

      {chatOpen && (
        <MentorSection flush>
          <MentorRow
            href={`/mentorship/${row.id}/chat`}
            lead={<MessageCircle {...ROW} />}
            title="گفت‌وگو"
            sub={
              row.unread > 0
                ? <span>{faNum(row.unread)} پیام تازه</span>
                : <span><Lock size={12} strokeWidth={1.75} aria-hidden /> رمزگذاری سرتاسری{row.status === "ENDED" ? "؛ فقط‌خواندنی" : ""}</span>
            }
            end={row.unread > 0 ? <span className="mentor-unread" aria-label={`${faNum(row.unread)} پیام خوانده‌نشده`}>{faNum(row.unread)}</span> : undefined}
          />
        </MentorSection>
      )}

      {role === "student" ? (
        <>
          <div className="mentor-tabs">
            <SegmentedTabs
              options={[{ value: "programs" as Tab, label: "برنامه‌ها" }, { value: "privacy" as Tab, label: "دسترسی‌ها" }]}
              active={tab}
              onChange={changeTab}
            />
          </div>
          <MentorSwap swapKey={tab}>
            {tab === "programs" ? programsSection : <PrivacyTab mentorshipId={row.id} mentorName={name} active={row.status === "ACTIVE"} />}
          </MentorSwap>
        </>
      ) : (
        programsSection
      )}

      {respond && (
        <ProgramRespondModal
          programId={respond.id}
          action={respond.action}
          onClose={() => setRespond(null)}
          onDone={() => { setRespond(null); loadPrograms(); }}
        />
      )}
    </>
  );
}

function ProgramFacts({ p }: { p: ProgramRow }) {
  return (
    <>
      <span>{p.type === "WORKOUT" ? "تمرینی" : "روتین"}</span>
      {p.version > 1 && <span>نسخه‌ی {faNum(p.version)}</span>}
      {p.startDate && <span>{p.endDate ? `${fmtDay(p.startDate)} تا ${fmtDay(p.endDate)}` : `از ${fmtDay(p.startDate)}`}</span>}
      {(p.status === "ACTIVE" || p.status === "COMPLETED") && !p.progress.hidden && <span>{faNum(p.progress.rate)}٪ پایبندی</span>}
      {p.status === "PENDING" && p.sentAt && <span>ارسال {fmtRelative(p.sentAt)}</span>}
    </>
  );
}

/** یادداشتِ منتور روی برنامه — برچسب‌دار تا با توضیحِ برنامه اشتباه نشود */
function MentorNote({ note, role }: { note: string; role: Role }) {
  return (
    <div className="mentor-note-box mentor-program-note">
      <b>{role === "student" ? "یادداشت منتور" : "یادداشت تو برای شاگرد"}</b>
      <div>{note.trim()}</div>
    </div>
  );
}

// ───────────────────────── دسترسی‌ها ─────────────────────────

/** همان کلیدِ lib/mentorPrivacy.ts (routineScopeKey) — نسخه‌ی کلاینتیِ بی‌وابستگی به سرور */
function scopeKeyOf(o: { name: string; tag?: string }): string {
  const label = (o.tag && o.tag.trim()) || (o.name || "").trim();
  return "routine:" + label.slice(0, 120);
}

const DETAIL_TOGGLES: { key: keyof Omit<PrivacySettings, "shareAllPrograms" | "sharedPrograms">; title: string; desc: string }[] = [
  { key: "showSchedule", title: "زمان‌بندی", desc: "روزها و ساعت‌هایی که مشغولی؛ خاموش باشد، هیچ بخشی از روتین دیده نمی‌شود" },
  { key: "showProgramName", title: "نام برنامه", desc: "برچسب هر بازه‌ی زمانی، مثلاً «دانشگاه»" },
  { key: "showTaskName", title: "نام کار", desc: "عنوان هر کار؛ خاموش باشد، فقط «مشغول» دیده می‌شود" },
  { key: "showTaskDetails", title: "جزئیات کار", desc: "میزان اهمیت هر کار" },
  { key: "showProgress", title: "پیشرفت", desc: "انجام شدن یا نشدن هر کار در هر روز" },
];

function PrivacyTab({ mentorshipId, mentorName, active }: { mentorshipId: string; mentorName: string; active: boolean }) {
  const [data, setData] = useState<{ privacy: PrivacySettings; scopes: PrivacyScope[] } | null>(null);
  const [draft, setDraft] = useState<PrivacySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [occs, setOccs] = useState<CustomOccurrence[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/privacy`, { cache: "no-store" });
      if (!res.ok) { setError(await readApiError(res, "تنظیمات دسترسی دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: PrivacyResponse = await res.json();
      setData(d);
      setDraft(d.privacy);
    } catch {
      setError(NETWORK_ERROR);
    }
  }, [mentorshipId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getCustomOccurrences().then((arr) => setOccs(arr.filter((o) => !(o as { mentorProgramId?: string }).mentorProgramId))).catch(() => setOccs([]));
  }, []);

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    const a = data.privacy, b = draft;
    return (
      a.shareAllPrograms !== b.shareAllPrograms || a.showSchedule !== b.showSchedule || a.showProgramName !== b.showProgramName ||
      a.showTaskName !== b.showTaskName || a.showTaskDetails !== b.showTaskDetails || a.showProgress !== b.showProgress ||
      a.sharedPrograms.length !== b.sharedPrograms.length || a.sharedPrograms.some((k) => !b.sharedPrograms.includes(k))
    );
  }, [data, draft]);

  if (error) return <MentorErrorState message={error} onRetry={load} />;
  if (!data || !draft) return <LoadingBlock />;

  function patch(p: Partial<PrivacySettings>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setSaved(false);
    setSaveError(null);
  }
  function toggleScope(key: string) {
    if (!draft) return;
    const has = draft.sharedPrograms.includes(key);
    patch({ sharedPrograms: has ? draft.sharedPrograms.filter((k) => k !== key) : [...draft.sharedPrograms, key] });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/mentorships/${mentorshipId}/privacy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) { setSaveError(await readApiError(res, "دسترسی‌ها ذخیره نشد؛ دوباره تلاش کن")); return; }
      const d: { privacy: PrivacySettings } = await res.json();
      setData((prev) => (prev ? { ...prev, privacy: d.privacy } : prev));
      setDraft(d.privacy);
      setSaved(true);
    } catch {
      setSaveError(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  }

  const allOn = draft.shareAllPrograms;
  const routineScopes = data.scopes.filter((s) => s.kind === "routine");
  const moduleScopes = data.scopes.filter((s) => s.kind === "module");
  const scopeChecked = (k: string) => allOn || draft.sharedPrograms.includes(k);

  return (
    <>
      <MentorSection
        title="برنامه‌های قابل مشاهده"
        icon={<ShieldCheck {...SECTION} />}
        desc={`این تنظیمات فقط برای ${mentorName} است. آنچه اجازه ندهی از سرور برای منتور فرستاده نمی‌شود.${active ? "" : " تا رابطه فعال نشود، منتور چیزی نمی‌بیند."}`}
      >
        <label className="mentor-check">
          <input type="checkbox" checked={allOn} onChange={(e) => patch({ shareAllPrograms: e.target.checked })} />
          <span className="mentor-check-label">
            <b>همه‌ی برنامه‌ها</b>
            <div className="mentor-check-kind">برنامه‌هایی که بعداً بسازی هم خودکار دیده می‌شوند</div>
          </span>
        </label>
        {routineScopes.length === 0 && <MentorEmpty>هنوز برنامه‌ای در روتینت نیست</MentorEmpty>}
        {[...routineScopes, ...moduleScopes].map((s) => (
          <label key={s.key} className={`mentor-check${allOn ? " is-disabled" : ""}`}>
            <input type="checkbox" checked={scopeChecked(s.key)} disabled={allOn} onChange={() => toggleScope(s.key)} />
            <span className="mentor-check-label">
              {s.label}
              <div className="mentor-check-kind">{s.kind === "module" ? "ماژول" : "برنامه‌ی روتین"}</div>
            </span>
          </label>
        ))}
      </MentorSection>

      <MentorSection title="جزئیات قابل مشاهده" icon={<Eye {...SECTION} />}>
        {DETAIL_TOGGLES.map((t) => {
          const disabled = t.key !== "showSchedule" && !draft.showSchedule;
          return (
            <div key={t.key} className="mentor-toggle-row" style={disabled ? { opacity: 0.55 } : undefined}>
              <div className="mentor-toggle-text">
                <div className="mentor-toggle-title">{t.title}</div>
                <div className="mentor-toggle-desc">{t.desc}</div>
              </div>
              <ToggleSwitch checked={draft[t.key]} onChange={(v) => patch({ [t.key]: v } as Partial<PrivacySettings>)} label={t.title} disabled={disabled} />
            </div>
          );
        })}

        <div className="mentor-field" style={{ marginTop: 16 }}>
          <span className="mentor-field-label">پیش‌نمایش</span>
          <PrivacyPreview draft={draft} occs={occs} />
        </div>

        <AccountSaveBar onSave={save} saving={saving} saved={saved && !dirty} error={saveError} disabled={!dirty} label="ذخیره‌ی دسترسی‌ها" />
      </MentorSection>
    </>
  );
}

function prettyTime(t: string): string {
  return t.replace(/\s*[-–—]\s*/, " – ");
}

/** پیش‌نمایشِ زنده — همان منطقِ projectRoutineForMentor سمتِ سرور، روی یکی از برنامه‌های خودِ کاربر */
function PrivacyPreview({ draft, occs }: { draft: PrivacySettings; occs: CustomOccurrence[] }) {
  const visible = (o: CustomOccurrence) => draft.shareAllPrograms || draft.sharedPrograms.includes(scopeKeyOf(o));
  const real = occs.find(visible) ?? occs[0];
  const sample = !real;
  const ex: { name: string; tag?: string; time: string; importance?: Importance } =
    real ?? { name: "مطالعه‌ی فصل ۳", tag: "دانشگاه", time: "18:00 - 19:00", importance: "high" };

  const actualParts = [ex.tag?.trim() || null, ex.name, ex.importance ? `اهمیت ${IMPORTANCE_LABELS[ex.importance]}` : null].filter((x): x is string => !!x);

  let hiddenLine: string | null = null;
  let mentorParts: string[] | null = null;
  if (!draft.showSchedule) hiddenLine = "هیچ زمان‌بندی‌ای دیده نمی‌شود";
  else if (!sample && !visible(real!)) hiddenLine = "این برنامه برای منتور دیده نمی‌شود";
  else if (sample && !draft.shareAllPrograms && draft.sharedPrograms.length === 0) hiddenLine = "هیچ برنامه‌ای انتخاب نشده؛ چیزی دیده نمی‌شود";
  else {
    const hasTag = !!ex.tag?.trim();
    const program = draft.showProgramName && (hasTag || draft.showTaskName) ? (ex.tag?.trim() || ex.name) : null;
    const parts: string[] = [];
    if (program) parts.push(program);
    parts.push(draft.showTaskName ? ex.name : "مشغول");
    if (draft.showTaskDetails && ex.importance) parts.push(`اهمیت ${IMPORTANCE_LABELS[ex.importance]}`);
    if (draft.showProgress) parts.push("وضعیت انجام");
    mentorParts = parts;
  }

  return (
    <div className="mentor-preview" aria-live="polite">
      <div className="mentor-preview-row">
        <span className="mentor-preview-tag">{sample ? "نمونه" : "برنامه‌ی تو"}</span>
        <span className="mentor-preview-line"><PreviewParts time={ex.time} parts={actualParts} /></span>
      </div>
      <div className="mentor-preview-row">
        <span className="mentor-preview-tag">منتور می‌بیند</span>
        {mentorParts ? (
          <span className="mentor-preview-line is-mentor"><PreviewParts time={ex.time} parts={mentorParts} /></span>
        ) : (
          <span className="mentor-preview-line"><span className="mentor-muted">{hiddenLine}</span></span>
        )}
      </div>
    </div>
  );
}

/**
 * هر بخش جدا ایزوله می‌شود تا ترتیبِ راست‌به‌چپ حفظ شود — بدونِ این، متنی که
 * با ساعت و برچسبِ لاتین (مثلا «Workout») شروع می‌شد کلِ خط را چپ‌به‌راست
 * و ترتیبِ بخش‌ها را برعکس نشان می‌داد. بازه‌ی ساعت خودش چپ‌به‌راست می‌ماند.
 */
function PreviewParts({ time, parts }: { time: string; parts: string[] }) {
  return (
    <>
      <bdi dir="ltr">{prettyTime(time)}</bdi>
      {parts.map((p, i) => (
        <span key={i}>{" · "}<bdi>{p}</bdi></span>
      ))}
    </>
  );
}
