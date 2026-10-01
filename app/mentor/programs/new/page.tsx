"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Copy, Dumbbell, LayoutTemplate, SearchX, Users } from "lucide-react";
import { PROGRAM_TYPE_CATEGORY } from "@/lib/mentorCategories";
import { MentorDashShell, MentorDashError, fa, mentorApi } from "@/components/MentorDashKit";
import { MentorProgramEditor, type ProgramPrefill } from "@/components/MentorProgramEditor";
import { MI, MI_STROKE, MentorEmpty, MentorRow, MentorSection } from "@/components/MentorUI";
import { MentorUserAvatar } from "@/components/MentorUserAvatar";
import { ProgramStatusBadge } from "@/components/ProgramStatusBadge";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { fmtDate } from "@/lib/mentorFormat";
import { isoLocal } from "@/lib/jalali";
import { nextPeriodStart, rangeDuration, shiftedRange } from "@/lib/mentorProgramCopy";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorshipRow, MentorshipsResponse, ProgramDetailResponse, ProgramRow, ProgramsResponse, ProgramType } from "@/lib/mentorTypes";
import type { TemplateResponse, TemplateRow, TemplatesResponse } from "@/lib/mentorToolsTypes";

// پارامترها از window.location خوانده می‌شوند (نه useSearchParams) تا
// Suspense لازم نباشد؛ هم‌الگوی بقیه‌ی صفحه‌های اپ.
//   mentorshipId — شاگرد (بدون آن، اول شاگرد انتخاب می‌شود)
//   templateId   — شروع از این قالب
//   fromProgramId — شروع از کپی این برنامه
function readParams() {
  if (typeof window === "undefined") return { mentorshipId: "", templateId: "", fromProgramId: "" };
  const q = new URLSearchParams(window.location.search);
  return {
    mentorshipId: q.get("mentorshipId")?.trim() || "",
    templateId: q.get("templateId")?.trim() || "",
    fromProgramId: q.get("fromProgramId")?.trim() || "",
  };
}

function setParam(key: string, value: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (value) q.set(key, value); else q.delete(key);
  const s = q.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
}

const ic = (Icon: typeof Copy, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;
const typeIcon = (t: ProgramType) => (t === "WORKOUT" ? ic(Dumbbell, MI.row) : ic(CalendarCheck, MI.row));

type Source = "blank" | "template" | "copy";
type Loaded = { key: string; label: string; prefill: ProgramPrefill };

function allowedTypesFor(row: MentorshipRow): ProgramType[] {
  return (["ROUTINE", "WORKOUT"] as const).filter(
    (t) => row.categories.length === 0 || row.categories.includes(PROGRAM_TYPE_CATEGORY[t]),
  );
}

export default function NewMentorProgramPage() {
  const [rows, setRows] = useState<MentorshipRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mentorshipId, setMentorshipId] = useState("");
  const [source, setSource] = useState<Source>("blank");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [initialPick, setInitialPick] = useState<{ templateId: string; fromProgramId: string }>({ templateId: "", fromProgramId: "" });

  const load = useCallback(async () => {
    const p = readParams();
    setMentorshipId(p.mentorshipId);
    setInitialPick({ templateId: p.templateId, fromProgramId: p.fromProgramId });
    if (p.templateId) setSource("template");
    else if (p.fromProgramId) setSource("copy");
    setLoadError(null);
    const r = await mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor");
    if (!r.ok) { setLoadError(r.error); return; }
    setRows((r.data.mentorships || []).filter((m) => m.status === "ACTIVE"));
  }, []);

  useEffect(() => { load(); }, [load]);

  const row = rows?.find((m) => m.id === mentorshipId) ?? null;
  const back = row
    ? { href: `/mentor/students/${row.counterpart.id}`, label: publicUserName(row.counterpart) }
    : { href: "/mentor", label: "پنل مربی" };

  let body: React.ReactNode;
  if (loadError) body = <MentorDashError message={loadError} onRetry={load} />;
  else if (!rows) body = <LoadingBlock />;
  else if (!mentorshipId || !row) {
    body = (
      <StudentPicker
        rows={rows}
        missing={!!mentorshipId && !row}
        onPick={(id) => { setMentorshipId(id); setParam("mentorshipId", id); }}
      />
    );
  } else {
    const allowedTypes = allowedTypesFor(row);
    if (allowedTypes.length === 0) {
      body = <MentorDashError message="حوزه‌ی همکاری با این شاگرد نوع برنامه ندارد؛ از گفت‌وگو و بازخورد استفاده کن" />;
    } else {
      body = (
        <>
          <MentorSection title="نقطه‌ی شروع" icon={ic(LayoutTemplate, MI.section)}>
            <div className="mentor-tabs" style={{ marginBottom: loaded || source !== "blank" ? "var(--m-3)" : 0 }}>
              <SegmentedTabs<Source>
                active={source}
                onChange={(v) => { setSource(v); setLoaded(null); setParam("templateId", null); setParam("fromProgramId", null); }}
                options={[
                  { value: "blank", label: "برنامه‌ی خالی" },
                  { value: "template", label: "از قالب" },
                  { value: "copy", label: "کپی برنامه" },
                ]}
              />
            </div>
            {source === "template" && (
              <TemplateSource
                allowedTypes={allowedTypes}
                loaded={loaded}
                preselect={initialPick.templateId}
                onLoaded={(l) => { setLoaded(l); setParam("templateId", l?.prefill.templateId ?? null); }}
              />
            )}
            {source === "copy" && (
              <CopySource
                row={row}
                allowedTypes={allowedTypes}
                loaded={loaded}
                preselect={initialPick.fromProgramId}
                onLoaded={(l) => { setLoaded(l); setParam("fromProgramId", l ? l.key.slice(2) : null); }}
              />
            )}
          </MentorSection>

          {(source === "blank" || loaded) && (
            <MentorProgramEditor
              key={`${row.id}:${loaded?.key ?? "blank"}`}
              mode="new"
              mentorshipId={row.id}
              student={row.counterpart}
              allowedTypes={allowedTypes}
              initial={loaded?.prefill ?? null}
            />
          )}
        </>
      );
    }
  }

  return (
    <MentorDashShell
      title="برنامه‌ی جدید"
      back={back}
    >
      {body}
    </MentorDashShell>
  );
}

/** انتخاب شاگرد وقتی صفحه بدون mentorshipId باز شده (مثلا «ساخت برنامه» از صفحه‌ی قالب‌ها) */
function StudentPicker({ rows, missing, onPick }: { rows: MentorshipRow[]; missing: boolean; onPick: (id: string) => void }) {
  return (
    <MentorSection title="شاگرد" icon={ic(Users, MI.section)} count={rows.length ? fa(rows.length) : undefined} flush>
      {missing && (
        <div className="form-inline-error" role="alert" style={{ margin: "0 var(--m-4) var(--m-2)" }}>
          رابطه‌ی فعالی با شاگرد انتخاب‌شده پیدا نشد؛ برنامه فقط برای شاگرد فعال ساخته می‌شود
        </div>
      )}
      {rows.length === 0 ? (
        <MentorEmpty>شاگرد فعالی نداری</MentorEmpty>
      ) : rows.map((r) => {
        const name = publicUserName(r.counterpart);
        return (
          <MentorRow
            key={r.id}
            lead={<MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={name} size={36} />}
            title={name}
            sub={<span>{r.activePrograms > 0 ? `${fa(r.activePrograms)} برنامه‌ی فعال` : "بدون برنامه‌ی فعال"}</span>}
            end={
              <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => onPick(r.id)}>
                انتخاب شاگرد
              </button>
            }
          />
        );
      })}
    </MentorSection>
  );
}

/** ردیف «بر پایه‌ی …» پس از انتخاب مبدا، با امکان تغییر */
function LoadedRow({ loaded, onClear }: { loaded: Loaded; onClear: () => void }) {
  const p = loaded.prefill;
  return (
    <MentorRow
      lead={typeIcon(p.type)}
      title={loaded.label}
      sub={
        <>
          <span>{fa(p.items.length)} {p.type === "WORKOUT" ? "حرکت" : "آیتم"}</span>
          {p.startDate && <span>شروع {fmtDate(p.startDate)}</span>}
          {p.endDate && <span>پایان {fmtDate(p.endDate)}</span>}
        </>
      }
      end={<button type="button" className="mentor-text-btn" onClick={onClear}>تغییر مبدا</button>}
    />
  );
}

function TemplateSource({
  allowedTypes, loaded, preselect, onLoaded,
}: { allowedTypes: ProgramType[]; loaded: Loaded | null; preselect: string; onLoaded: (l: Loaded | null) => void }) {
  const [list, setList] = useState<TemplateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const pick = useCallback(async (id: string) => {
    setBusy(id);
    setPickError(null);
    const r = await mentorApi<TemplateResponse>(`/api/mentor/templates/${encodeURIComponent(id)}`);
    setBusy(null);
    if (!r.ok) { setPickError(r.error); return; }
    const t = r.data.template;
    if (!allowedTypes.includes(t.type)) { setPickError("نوع این قالب خارج از حوزه‌ی همکاری با این شاگرد است"); return; }
    // قالب تاریخ ندارد؛ اگر طول بازه دارد، از امروز شروع می‌شود و منتور می‌تواند عوضش کند
    const range = t.durationDays != null ? shiftedRange(t.durationDays, isoLocal(new Date())) : { startDate: null, endDate: null };
    onLoaded({
      key: `t:${t.id}`,
      label: `قالب «${t.name}»`,
      prefill: {
        type: t.type, title: t.title, description: t.description, note: t.note, ...range,
        items: t.items.map((it) => ({ ...it, id: "" })), templateId: t.id,
      },
    });
  }, [allowedTypes, onLoaded]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await mentorApi<TemplatesResponse>("/api/mentor/templates");
      if (!alive) return;
      if (!r.ok) { setError(r.error); return; }
      setList(r.data.templates);
      if (preselect && r.data.templates.some((t) => t.id === preselect)) pick(preselect);
    })();
    return () => { alive = false; };
    // فقط بار اول؛ انتخاب بعدی با کلیک است
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loaded) return <LoadedRow loaded={loaded} onClear={() => onLoaded(null)} />;
  if (error) return <MentorEmpty>{error}</MentorEmpty>;
  if (!list) return <LoadingBlock />;
  const usable = list.filter((t) => allowedTypes.includes(t.type));
  if (usable.length === 0) {
    return <MentorEmpty icon={ic(SearchX, MI.row)}>{list.length ? "قالبی با نوع مجاز برای این شاگرد نیست" : "هنوز قالبی نساخته‌ای"}</MentorEmpty>;
  }
  return (
    <div>
      {usable.map((t) => (
        <MentorRow
          key={t.id}
          lead={typeIcon(t.type)}
          title={t.name}
          sub={
            <>
              <span>{fa(t.itemCount)} {t.type === "WORKOUT" ? "حرکت" : "آیتم"}</span>
              {t.durationDays != null && <span>{fa(t.durationDays + 1)} روز</span>}
              {t.usedCount > 0 && <span>{fa(t.usedCount)} بار استفاده</span>}
            </>
          }
          end={
            <button type="button" className="account-outline-btn mentor-btn is-sm" disabled={!!busy} onClick={() => pick(t.id)}>
              {busy === t.id ? <Spinner size={14} /> : "استفاده از قالب"}
            </button>
          }
        />
      ))}
      {pickError && <div className="form-inline-error" role="alert">{pickError}</div>}
    </div>
  );
}

function CopySource({
  row, allowedTypes, loaded, preselect, onLoaded,
}: { row: MentorshipRow; allowedTypes: ProgramType[]; loaded: Loaded | null; preselect: string; onLoaded: (l: Loaded | null) => void }) {
  const [list, setList] = useState<ProgramRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const pick = useCallback(async (id: string) => {
    setBusy(id);
    setPickError(null);
    const r = await mentorApi<ProgramDetailResponse>(`/api/mentor-programs/${encodeURIComponent(id)}`);
    setBusy(null);
    if (!r.ok) { setPickError(r.error); return; }
    const { program: p, items } = r.data;
    if (!allowedTypes.includes(p.type)) { setPickError("نوع این برنامه خارج از حوزه‌ی همکاری با این شاگرد است"); return; }
    const today = isoLocal(new Date());
    const duration = rangeDuration(p.startDate, p.endDate);
    // همان شاگرد = دوره‌ی بعد (روز بعد از پایان مبدا)؛ شاگرد دیگر = از امروز
    const sameStudent = p.counterpart?.id === row.counterpart.id;
    const range = duration != null ? shiftedRange(duration, sameStudent ? nextPeriodStart(p.endDate, today) : today) : { startDate: null, endDate: null };
    onLoaded({
      key: `p:${p.id}`,
      label: `کپی «${p.title}»`,
      prefill: { type: p.type, title: p.title, description: p.description, note: p.note, ...range, items },
    });
  }, [allowedTypes, onLoaded, row.counterpart.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await mentorApi<ProgramsResponse>("/api/mentor-programs?role=mentor");
      if (!alive) return;
      if (!r.ok) { setError(r.error); return; }
      setList(r.data.programs);
      if (preselect && r.data.programs.some((p) => p.id === preselect)) pick(preselect);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // برنامه‌های همین شاگرد اول
  const usable = useMemo(() => {
    const xs = (list ?? []).filter((p) => allowedTypes.includes(p.type));
    return [...xs.filter((p) => p.counterpart.id === row.counterpart.id), ...xs.filter((p) => p.counterpart.id !== row.counterpart.id)];
  }, [list, allowedTypes, row.counterpart.id]);

  if (loaded) return <LoadedRow loaded={loaded} onClear={() => onLoaded(null)} />;
  if (error) return <MentorEmpty>{error}</MentorEmpty>;
  if (!list) return <LoadingBlock />;
  if (usable.length === 0) return <MentorEmpty icon={ic(SearchX, MI.row)}>برنامه‌ای برای کپی نیست</MentorEmpty>;
  return (
    <div>
      {usable.map((p) => (
        <MentorRow
          key={p.id}
          lead={typeIcon(p.type)}
          title={p.title}
          sub={
            <>
              <span>{publicUserName(p.counterpart)}</span>
              {p.startDate && <span>{fmtDate(p.startDate)}</span>}
              <ProgramStatusBadge status={p.status} />
            </>
          }
          end={
            <button type="button" className="account-outline-btn mentor-btn is-sm" disabled={!!busy} onClick={() => pick(p.id)}>
              {busy === p.id ? <Spinner size={14} /> : <>{ic(Copy, MI.btnSm)} کپی</>}
            </button>
          }
        />
      ))}
      {pickError && <div className="form-inline-error" role="alert">{pickError}</div>}
    </div>
  );
}
