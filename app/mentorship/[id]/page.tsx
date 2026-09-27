"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Ban, CalendarCheck, Check, ClipboardList, Dumbbell, Eye, Inbox, LogOut, Plus, ShieldCheck, X } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { MentorChat } from "@/components/MentorChat";
import { MentorshipStatusBadge, ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { ProgramRespondModal } from "@/components/ProgramRespondModal";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { AccountSaveBar } from "@/components/AccountUI";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { getCustomOccurrences, IMPORTANCE_LABELS, type CustomOccurrence, type Importance } from "@/lib/storage";
import type {
  MentorshipAction, MentorshipRow, MentorshipsResponse, PrivacyResponse, PrivacyScope, PrivacySettings, ProgramRow, ProgramsResponse,
} from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { categoryLabel } from "@/components/MentorBadges";
import { fmtDate, fmtDay, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";

type Role = "student" | "mentor";
type Tab = "chat" | "programs" | "privacy";
type Back = { href: string; label: string };

const SECTION = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;
const ROW = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;
const BTN_SM = { size: 14, strokeWidth: 1.75, "aria-hidden": true } as const;

const STUDENT_BACK: Back = { href: "/mentorship", label: "منتورهای من" };
const MENTOR_BACK: Back = { href: "/mentor", label: "پنل منتور" };

// سرِ صفحه (بازگشت + آواتار/نام/وضعیت) به نقشِ بیننده بستگی دارد که فقط
// بعد از بارگذاریِ رابطه معلوم است؛ پس بدنه آن را بالا می‌فرستد.
export default function MentorshipPage() {
  const [head, setHead] = useState<{ back: Back | null; node: React.ReactNode } | null>(null);
  return (
    <MentorPageShell back={head?.back ?? null} head={head?.node}>
      <Relationship onHead={setHead} />
    </MentorPageShell>
  );
}

function Relationship({ onHead }: { onHead: (h: { back: Back | null; node: React.ReactNode } | null) => void }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rel, setRel] = useState<{ row: MentorshipRow; role: Role } | null>(null);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [confirm, setConfirm] = useState<"end" | "block" | "cancel" | null>(null);
  const { pendingKey, error: actionError, run, clearError } = useAsyncAction();

  // قرارداد یک GET تکیِ رابطه ندارد — دو لیستِ «شاگرد/منتور» خوانده می‌شود و
  // همین id پیدا می‌شود؛ نقش هم از همان‌جا معلوم است (هر دو طرف این صفحه را
  // می‌بینند: اعلانِ «درخواست پذیرفته شد» منتور را هم به همین‌جا می‌آورد).
  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, m] = await Promise.all([
        fetch("/api/mentorships?role=student", { cache: "no-store" }),
        fetch("/api/mentorships?role=mentor", { cache: "no-store" }),
      ]);
      if (!s.ok && !m.ok) { setError({ msg: await readApiError(s, "اطلاعات رابطه دریافت نشد؛ دوباره تلاش کن"), retry: s.status >= 500 }); return; }
      const sd: MentorshipsResponse | null = s.ok ? await s.json() : null;
      const md: MentorshipsResponse | null = m.ok ? await m.json() : null;
      const asStudent = sd?.mentorships.find((r) => r.id === id);
      const asMentor = md?.mentorships.find((r) => r.id === id);
      if (asStudent) setRel({ row: asStudent, role: "student" });
      else if (asMentor) setRel({ row: asMentor, role: "mentor" });
      else setError({ msg: "این رابطه پیدا نشد یا به آن دسترسی نداری", retry: false });
    } catch {
      setError({ msg: NETWORK_ERROR, retry: true });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "programs" || t === "privacy" || t === "chat") setTab(t);
  }, []);

  // سرِ صفحه: آواتار ۴۸ + نام + نقش + چیپِ وضعیت
  useEffect(() => {
    if (!rel) { onHead(error ? { back: STUDENT_BACK, node: null } : null); return; }
    const { row, role } = rel;
    const name = publicUserName(row.counterpart);
    onHead({
      back: role === "mentor" ? MENTOR_BACK : STUDENT_BACK,
      node: (
        <div className="mentor-head-custom">
          <MentorUserAvatar name={name} avatarUrl={row.counterpart.avatarUrl} size={48} />
          <div className="mentor-rel-id">
            <h1>{name}</h1>
            <div className="mentor-rel-sub">
              <span>{role === "student" ? "منتور تو" : "شاگرد تو"}</span>
              <MentorshipStatusBadge status={row.status} />
              {row.startedAt && <span>از {fmtDate(row.startedAt)}</span>}
            </div>
          </div>
        </div>
      ),
    });
  }, [rel, error, onHead]);

  useEffect(() => () => onHead(null), [onHead]);

  function changeTab(t: Tab) {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  }

  async function act(action: MentorshipAction) {
    const ok = await run(action, () =>
      fetch(`/api/mentorships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
    );
    if (!ok) return;
    setConfirm(null);
    if (action === "block" || action === "cancel") {
      router.push(rel?.role === "mentor" ? MENTOR_BACK.href : STUDENT_BACK.href);
      return;
    }
    load();
  }

  if (error) return <MentorErrorState message={error.msg} onRetry={error.retry ? load : undefined} />;
  if (!rel) return <LoadingBlock />;

  const { row, role } = rel;
  const name = publicUserName(row.counterpart);
  const isPending = row.status === "PENDING";
  // کسی که درخواست به او رسیده همین‌جا پاسخ می‌دهد؛ فرستنده فقط می‌تواند لغو کند
  const iMustAnswer = isPending && ((role === "student" && row.initiatedBy === "MENTOR") || (role === "mentor" && row.initiatedBy === "STUDENT"));
  const iInitiated = isPending && !iMustAnswer;
  const tabs: { value: Tab; label: string }[] = [
    { value: "chat", label: "گفت‌وگو" },
    { value: "programs", label: "برنامه‌ها" },
    ...(role === "student" ? [{ value: "privacy" as Tab, label: "دسترسی‌ها" }] : []),
  ];
  const activeTab = tabs.some((t) => t.value === tab) ? tab : "chat";

  return (
    <>
      {iMustAnswer && (
        <MentorSection
          title={role === "student" ? "دعوت منتوری" : "درخواست منتوری"}
          icon={<Inbox {...SECTION} />}
          desc={role === "student" ? "پس از پذیرش، منتور فقط بخش‌هایی را می‌بیند که در دسترسی‌ها اجازه بدهی." : undefined}
        >
          <div className="mentor-form" style={{ gap: 12 }}>
            {row.categories.length > 0 && (
              <div className="mentor-chips">
                {row.categories.map((c) => <span key={c} className="mentor-chip is-cat"><span>{categoryLabel(c)}</span></span>)}
              </div>
            )}
            {row.message && <p className="mentor-quote">{row.message}</p>}
            {actionError && !confirm && <div className="form-inline-error" role="alert" style={{ marginTop: 0 }}>{actionError}</div>}
            <div className="mentor-btn-group is-end">
              <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => act("reject")} disabled={!!pendingKey}>
                {pendingKey === "reject" ? <Spinner size={14} /> : <><X {...BTN_SM} /> رد درخواست</>}
              </button>
              <button type="button" className="trade-primary-btn mentor-btn is-sm" onClick={() => act("accept")} disabled={!!pendingKey}>
                {pendingKey === "accept" ? <Spinner size={14} /> : <><Check {...BTN_SM} /> پذیرفتن</>}
              </button>
            </div>
          </div>
        </MentorSection>
      )}

      <div className="mentor-tabs">
        <SegmentedTabs options={tabs} active={activeTab} onChange={changeTab} />
      </div>

      {activeTab === "chat" && (
        row.status === "ACTIVE" || row.status === "ENDED" ? (
          <MentorChat mentorshipId={row.id} />
        ) : (
          <MentorEmpty>{isPending ? "گفت‌وگو پس از پذیرش درخواست باز می‌شود" : "این رابطه گفت‌وگو ندارد"}</MentorEmpty>
        )
      )}
      {activeTab === "programs" && <ProgramsTab mentorshipId={row.id} role={role} relActive={row.status === "ACTIVE"} />}
      {activeTab === "privacy" && role === "student" && <PrivacyTab mentorshipId={row.id} mentorName={name} active={row.status === "ACTIVE"} />}

      {(row.status === "ACTIVE" || isPending || row.status === "ENDED") && (
        <div className="mentor-danger-zone">
          {row.status === "ACTIVE" && (
            <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { clearError(); setConfirm("end"); }}>
              <LogOut {...BTN_SM} /> پایان رابطه
            </button>
          )}
          {iInitiated && (
            <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => { clearError(); setConfirm("cancel"); }}>
              <X {...BTN_SM} /> لغو درخواست
            </button>
          )}
          <button type="button" className="trade-danger-btn mentor-btn is-sm" onClick={() => { clearError(); setConfirm("block"); }}>
            <Ban {...BTN_SM} /> مسدود کردن
          </button>
        </div>
      )}

      {confirm && (
        <MentorConfirmDialog
          message={
            confirm === "end" ? `رابطه با ${name} پایان یابد؟`
              : confirm === "cancel" ? `درخواست به ${name} لغو شود؟`
              : `${name} مسدود شود؟`
          }
          hint={
            confirm === "end" ? "برنامه‌های در جریان لغو می‌شوند؛ گفت‌وگو فقط‌خواندنی می‌ماند."
              : confirm === "cancel" ? "بعداً می‌توانی دوباره درخواست بدهی."
              : "رابطه قطع و برنامه‌های در جریان لغو می‌شوند؛ دیگر درخواست یا پیامی از او نمی‌رسد."
          }
          confirmLabel={confirm === "end" ? "پایان رابطه" : confirm === "cancel" ? "لغو درخواست" : "مسدود کردن"}
          busy={pendingKey === confirm}
          error={actionError}
          onConfirm={() => act(confirm)}
          onCancel={() => { setConfirm(null); clearError(); }}
        />
      )}
    </>
  );
}

// ───────────────────────── برنامه‌ها ─────────────────────────

function ProgramsTab({ mentorshipId, role, relActive }: { mentorshipId: string; role: Role; relActive: boolean }) {
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [respond, setRespond] = useState<{ id: string; action: "reject" | "request_changes" } | null>(null);
  const [acceptFor, setAcceptFor] = useState<string | null>(null);
  const { pendingKey, run, error: runError } = useAsyncAction();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/mentor-programs?role=${role}&mentorshipId=${encodeURIComponent(mentorshipId)}`, { cache: "no-store" });
      if (!res.ok) { setError(await readApiError(res, "برنامه‌ها دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: ProgramsResponse = await res.json();
      setPrograms(d.programs || []);
    } catch {
      setError(NETWORK_ERROR);
    }
  }, [mentorshipId, role]);

  useEffect(() => { load(); }, [load]);

  async function accept(p: ProgramRow) {
    setAcceptFor(p.id);
    const ok = await run(`accept:${p.id}`, () =>
      fetch(`/api/mentor-programs/${p.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      })
    );
    if (ok) { setAcceptFor(null); load(); }
  }

  if (error) return <MentorErrorState message={error} onRetry={load} />;

  return (
    <>
      <MentorSection
        title="برنامه‌ها"
        icon={<ClipboardList {...SECTION} />}
        count={programs && programs.length ? faNum(programs.length) : undefined}
        action={
          role === "mentor" && relActive ? (
            <Link href={`/mentor/programs/new?mentorshipId=${encodeURIComponent(mentorshipId)}`} className="mentor-text-btn">
              <Plus {...BTN_SM} /> برنامه‌ی جدید
            </Link>
          ) : undefined
        }
        flush
      >
        {programs === null ? (
          <LoadingBlock />
        ) : programs.length === 0 ? (
          <MentorEmpty>{role === "student" ? "هنوز برنامه‌ای از این منتور نرسیده است" : "هنوز برنامه‌ای برای این شاگرد نساخته‌ای"}</MentorEmpty>
        ) : (
          programs.map((p) => {
            const needsAnswer = role === "student" && p.status === "PENDING";
            return (
              <MentorRow
                key={p.id}
                href={`/mentor-programs/${p.id}`}
                lead={p.type === "WORKOUT" ? <Dumbbell {...ROW} /> : <CalendarCheck {...ROW} />}
                title={p.title}
                sub={
                  <>
                    <span>{p.type === "WORKOUT" ? "تمرینی" : "روتین"}</span>
                    {p.version > 1 && <span>نسخه‌ی {faNum(p.version)}</span>}
                    {p.startDate && <span>{p.endDate ? `${fmtDay(p.startDate)} تا ${fmtDay(p.endDate)}` : `از ${fmtDay(p.startDate)}`}</span>}
                    {(p.status === "ACTIVE" || p.status === "COMPLETED") && <span>{faNum(p.progress.rate)}٪ پایبندی</span>}
                  </>
                }
                end={<ProgramStatusBadge status={p.status} />}
                below={
                  needsAnswer ? (
                    <>
                      {acceptFor === p.id && runError && <p className="mentor-field-error" role="alert">{runError}</p>}
                      <div className="mentor-btn-group is-end">
                        <button type="button" className="account-outline-btn muted mentor-btn is-sm" onClick={() => setRespond({ id: p.id, action: "reject" })} disabled={!!pendingKey}>
                          <X {...BTN_SM} /> رد
                        </button>
                        <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setRespond({ id: p.id, action: "request_changes" })} disabled={!!pendingKey}>
                          درخواست تغییر
                        </button>
                        <button type="button" className="trade-primary-btn mentor-btn is-sm" onClick={() => accept(p)} disabled={!!pendingKey}>
                          {pendingKey === `accept:${p.id}` ? <Spinner size={14} /> : <><Check {...BTN_SM} /> پذیرفتن</>}
                        </button>
                      </div>
                    </>
                  ) : undefined
                }
              />
            );
          })
        )}
      </MentorSection>
      {respond && (
        <ProgramRespondModal
          programId={respond.id}
          action={respond.action}
          onClose={() => setRespond(null)}
          onDone={() => { setRespond(null); load(); }}
        />
      )}
    </>
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
