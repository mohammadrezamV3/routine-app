"use client";

import "./coach.css";
import "./coach-pages.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { PageLoader } from "./PageLoader";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { CoachPanelShell } from "./CoachPanelShell";
import { CoachAvatar } from "./CoachAvatar";
import { CoachEmpty } from "./CoachEmpty";
import { MentorDashError, mentorApi } from "./MentorDashKit";
import { MentorProgramEditor, type ProgramPrefill } from "./MentorProgramEditor";
import { MentorProgramStart, type StartLoaded, type StartSource } from "./MentorProgramStart";
import { PROGRAM_TYPE_CATEGORY } from "@/lib/mentorCategories";
import { publicUserName } from "@/lib/mentorTypes";
import type { Item, ItemInput, MentorshipRow, MentorshipsResponse, Program, ProgramType } from "@/lib/mentorTypes";
import type { CoachNomoProgramDraft, CoachNomoQuota } from "@/lib/coachTypes";
import { tr, iso } from "@/lib/i18n";

type Tab = "nomo" | "template" | "blank";

// پارامترها از window.location (نه useSearchParams) تا Suspense لازم نشه
//   student      — شناسه‌ی کاربر شاگرد (لینک‌های v3)
//   mentorshipId — قدیمی
//   templateId / fromProgramId — شروع از قالب یا کپی
function readParams() {
  if (typeof window === "undefined") return { student: "", mentorshipId: "", templateId: "", fromProgramId: "" };
  const q = new URLSearchParams(window.location.search);
  const g = (k: string) => q.get(k)?.trim() || "";
  return { student: g("student"), mentorshipId: g("mentorshipId"), templateId: g("templateId"), fromProgramId: g("fromProgramId") };
}

function setParam(key: string, value: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (value) q.set(key, value); else q.delete(key);
  const s = q.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
}

function allowedTypesFor(row: MentorshipRow): ProgramType[] {
  return (["ROUTINE", "WORKOUT"] as const).filter((t) => row.categories.length === 0 || row.categories.includes(PROGRAM_TYPE_CATEGORY[t]));
}

let draftSeq = 0;

/** پیش‌نویس نومو به قالب پر شدن ویرایشگر */
function draftToPrefill(d: CoachNomoProgramDraft): ProgramPrefill {
  const items: Item[] = d.items.map((it, i) => {
    const daily = it.days.length === 0 || it.days.length === 7;
    return {
      id: `nomo-${draftSeq++}-${i}`, order: i, title: it.title, details: it.details,
      repeat: daily ? "DAILY" : "WEEKLY", days: daily ? [0, 1, 2, 3, 4, 5, 6] : [...it.days],
      startTime: it.startTime, durationMin: it.durationMin, sets: it.sets, reps: it.reps != null ? String(it.reps) : null, weightKg: null, restSec: null,
    };
  });
  return { type: d.type, title: d.title, description: null, note: null, startDate: null, endDate: null, items };
}

function draftToInputs(d: CoachNomoProgramDraft): ItemInput[] {
  return d.items.map((it) => {
    const daily = it.days.length === 0 || it.days.length === 7;
    const o: ItemInput = { title: it.title, repeat: daily ? "DAILY" : "WEEKLY", days: daily ? [0, 1, 2, 3, 4, 5, 6] : [...it.days].sort((a, b) => a - b) };
    if (it.details) o.details = it.details;
    if (it.startTime) o.startTime = it.startTime;
    if (it.durationMin != null) o.durationMin = it.durationMin;
    if (d.type === "WORKOUT") {
      if (it.sets != null) o.sets = it.sets;
      if (it.reps != null) o.reps = String(it.reps);
    }
    return o;
  });
}

function itemDetail(it: CoachNomoProgramDraft["items"][number]): string {
  if (it.sets != null && it.reps != null) return `${it.sets}×${it.reps}`;
  if (it.durationMin != null) return tr(`${it.durationMin} دقیقه`, `${it.durationMin} min`);
  return it.startTime ?? "";
}

function NomoPanel({ row, allowedTypes, onEdit }: { row: MentorshipRow; allowedTypes: ProgramType[]; onEdit: (d: CoachNomoProgramDraft) => void }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<ProgramType>(allowedTypes[0] ?? "ROUTINE");
  const [draft, setDraft] = useState<CoachNomoProgramDraft | null>(null);
  const [quota, setQuota] = useState<CoachNomoQuota | null>(null);
  const [busy, setBusy] = useState<"gen" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = row.counterpart.name || publicUserName(row.counterpart);

  async function generate() {
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy("gen");
    setError(null);
    const r = await mentorApi<{ draft: CoachNomoProgramDraft; quota: CoachNomoQuota }>("/api/mentor/nomo/program", { method: "POST", body: { mentorshipId: row.id, prompt: p, type } });
    setBusy(null);
    if (!r.ok) {
      setError(r.status === 429 ? tr("سهمیه‌ی نومو برای امروز تموم شده؛ از قالب یا خالی شروع کن", "Nomo's limit for today is used up. Start from a template or from scratch.") : r.error);
      return;
    }
    setDraft(r.data.draft);
    setQuota(r.data.quota);
  }

  async function send() {
    if (!draft || busy) return;
    setBusy("send");
    setError(null);
    const c = await mentorApi<{ program: Program }>("/api/mentor-programs", { method: "POST", body: { mentorshipId: row.id, type: draft.type, title: draft.title, note: null, items: draftToInputs(draft) } });
    if (!c.ok) { setBusy(null); setError(c.error); return; }
    const id = c.data.program.id;
    const t = await mentorApi<unknown>(`/api/mentor-programs/${id}/transition`, { method: "POST", body: { action: "send" } });
    if (!t.ok) { router.replace(`/mentor/programs/${id}/edit?saved=1`); return; }
    router.push(`/mentor-programs/${id}`);
  }

  const quotaLine = quota && !quota.unlimited ? tr(`${quota.remaining} پیشنهاد دیگه برای امروز مونده`, `${quota.remaining} more ${quota.remaining === 1 ? "suggestion" : "suggestions"} left today`) : null;

  return (
    <div className="ch-stack">
      {allowedTypes.length > 1 && (
        <SegmentedTabs<ProgramType>
          active={type} onChange={setType} ariaLabel={tr("نوع برنامه", "Program type")}
          options={allowedTypes.map((v) => ({ value: v, label: v === "ROUTINE" ? tr("روتین", "Routine") : tr("تمرین ورزشی", "Workout") }))}
        />
      )}
      <form className="chp-nomo-form" onSubmit={(e) => { e.preventDefault(); generate(); }}>
        <input
          value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={300}
          aria-label={tr("چی می‌خوای؟", "What do you want?")} placeholder={tr("مثلا مرحله‌ی 2 پا، سه روز در هفته", "For example: leg phase 2, three days a week")}
        />
        <button type="submit" className="chp-nomo-go" disabled={!prompt.trim() || !!busy} aria-label={tr("بساز", "Create")}>
          {busy === "gen" ? <Spinner size={16} label={null} /> : <Sparkles size={16} fill="currentColor" aria-hidden="true" />}
        </button>
      </form>
      <p className="chp-hint">{quotaLine ?? tr(`نومو هدف و هفته‌های قبل ${first} رو هم در نظر می‌گیره`, `Nomo also considers ${iso(first)}'s goal and past weeks`)}</p>
      {error && <div className="form-inline-error" role="alert">{error}</div>}

      {draft && (
        <>
          <section className="ch-card ch-card-lg ch-stack" aria-label={tr("پیش‌نمایش برنامه", "Program preview")}>
            <div className="chp-rowwrap">
              <h2 className="chp-draft-title" style={{ flex: 1 }}>{draft.title}{draft.weeks ? ` · ${tr(`${draft.weeks} هفته`, `${draft.weeks} ${draft.weeks === 1 ? "week" : "weeks"}`)}` : ""}</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={generate} disabled={!!busy}>{tr("یکی دیگه", "Another one")}</button>
            </div>
            <ol className="chp-draft-list">
              {draft.items.map((it, i) => (
                <li key={i}>
                  <span className="chp-draft-n">{i + 1}</span>
                  <span className="chp-draft-t">{it.title}</span>
                  <span className="chp-draft-d">{itemDetail(it)}</span>
                </li>
              ))}
            </ol>
          </section>
          <div className="chp-foot">
            <button type="button" className="btn btn-ghost" onClick={() => onEdit(draft)} disabled={!!busy}>{tr("ویرایش", "Edit")}</button>
            <button type="button" className="btn btn-primary" onClick={send} disabled={!!busy || draft.items.length === 0}>
              {busy === "send" ? <Spinner size={16} label={null} /> : tr(`بفرست برای ${first}`, `Send to ${iso(first)}`)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CoachProgramNewPage() {
  const [rows, setRows] = useState<MentorshipRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mentorshipId, setMentorshipId] = useState("");
  const [tab, setTab] = useState<Tab>("nomo");
  const [source, setSource] = useState<StartSource>("blank");
  const [loaded, setLoaded] = useState<StartLoaded | null>(null);
  const [initialPick, setInitialPick] = useState({ templateId: "", fromProgramId: "" });
  const [nomoDraft, setNomoDraft] = useState<{ key: number; prefill: ProgramPrefill } | null>(null);

  const load = useCallback(async () => {
    const p = readParams();
    setInitialPick({ templateId: p.templateId, fromProgramId: p.fromProgramId });
    if (p.templateId) { setTab("template"); setSource("template"); }
    else if (p.fromProgramId) { setTab("template"); setSource("copy"); }
    setLoadError(null);
    const r = await mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor");
    if (!r.ok) { setLoadError(r.error); return; }
    const active = (r.data.mentorships || []).filter((m) => m.status === "ACTIVE");
    setRows(active);
    const byStudent = p.student ? active.find((m) => m.counterpart.id === p.student) : undefined;
    if (byStudent) setMentorshipId(byStudent.id);
    else if (p.mentorshipId) setMentorshipId(p.mentorshipId);
    else if (active.length === 1) setMentorshipId(active[0].id);
  }, []);
  useEffect(() => { load(); }, [load]);

  const row = rows?.find((m) => m.id === mentorshipId) ?? null;
  const back = row ? { href: `/mentor/students/${row.counterpart.id}`, label: tr("برگشت", "Back") } : { href: "/mentor/students", label: tr("شاگردها", "Students") };
  const title = row ? tr(`برنامه‌ی تازه برای ${row.counterpart.name || publicUserName(row.counterpart)}`, `New program for ${iso(row.counterpart.name || publicUserName(row.counterpart))}`) : tr("برنامه‌ی تازه", "New program");

  function pick(id: string) {
    setMentorshipId(id);
    const r = rows?.find((m) => m.id === id);
    setParam("student", r ? r.counterpart.id : null);
    setParam("mentorshipId", null);
  }

  let body: React.ReactNode;
  if (loadError) body = <MentorDashError message={loadError} onRetry={load} />;
  else if (!rows) body = <PageLoader />;
  else if (rows.length === 0) body = <CoachEmpty text={tr("هنوز شاگرد فعالی نداری. برنامه فقط برای شاگرد فعال ساخته می‌شه.", "You have no active students yet. Programs can only be made for active students.")} />;
  else if (!row) {
    body = (
      <ul className="ch-list">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" className="ch-row" onClick={() => pick(r.id)}>
              <CoachAvatar user={r.counterpart} size={44} />
              <span className="ch-row-main"><span className="ch-row-title">{publicUserName(r.counterpart)}</span></span>
              <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  } else {
    const allowedTypes = allowedTypesFor(row);
    if (allowedTypes.length === 0) {
      body = <MentorDashError message={tr("حوزه‌ی همکاری با این شاگرد برنامه نداره؛ از گفت‌وگو و بازخورد استفاده کن", "The field you work on with this student has no programs. Use the chat and feedback instead.")} />;
    } else {
      const startSlot = (src: StartSource) => (
        <MentorProgramStart
          rows={rows} missing={false} row={row} allowedTypes={allowedTypes} source={src} loaded={loaded} initialPick={initialPick} hideSources
          onPickStudent={pick} onClearStudent={() => { setMentorshipId(""); setParam("student", null); setLoaded(null); }}
          onSource={setSource}
          onLoaded={(l) => { setLoaded(l); setParam("templateId", l?.prefill.templateId ?? null); setParam("fromProgramId", l && l.key.startsWith("p:") ? l.key.slice(2) : null); }}
        />
      );
      const tabs = (
        <SegmentedTabs<Tab>
          active={nomoDraft ? null : tab} ariaLabel={tr("شروع برنامه", "Start a program")}
          onChange={(v) => { setNomoDraft(null); setTab(v); setLoaded(null); if (v === "template") setSource(initialPick.fromProgramId && !initialPick.templateId ? "copy" : "template"); else if (v === "blank") setSource("blank"); }}
          options={[
            { value: "nomo", label: tr("با نومو", "With Nomo") },
            { value: "template", label: tr("از قالب", "From template") },
            { value: "blank", label: tr("خالی", "Blank") },
          ]}
        />
      );
      if (nomoDraft) {
        body = (
          <div className="ch-stack">
            {tabs}
            <MentorProgramEditor
              mode="new" mentorshipId={row.id} student={row.counterpart} allowedTypes={allowedTypes}
              initial={nomoDraft.prefill} prefillKey={`nomo:${nomoDraft.key}`} locked={false} startSlot={null}
            />
          </div>
        );
      } else if (tab === "nomo") {
        body = (
          <div className="ch-stack">
            {tabs}
            <NomoPanel row={row} allowedTypes={allowedTypes} onEdit={(d) => setNomoDraft({ key: Date.now(), prefill: draftToPrefill(d) })} />
          </div>
        );
      } else {
        const src: StartSource = tab === "blank" ? "blank" : source === "blank" ? "template" : source;
        const ready = src === "blank" || !!loaded;
        body = (
          <div className="ch-stack">
            {tabs}
            <MentorProgramEditor
              mode="new" mentorshipId={row.id} student={row.counterpart} allowedTypes={allowedTypes}
              initial={loaded?.prefill ?? null} prefillKey={`${row.id}:${loaded?.key ?? "blank"}`} locked={!ready} startSlot={startSlot(src)}
            />
          </div>
        );
      }
    }
  }

  return (
    <CoachPanelShell title={title} back={back}>
      {body}
    </CoachPanelShell>
  );
}
