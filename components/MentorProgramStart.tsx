"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Copy, Dumbbell, SearchX } from "lucide-react";
import { SegmentedTabs } from "./SegmentedTabs";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { ProgramStatusBadge } from "./ProgramStatusBadge";
import { LoadingBlock, Spinner } from "./Spinner";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorRow } from "./MentorUI";
import type { ProgramPrefill } from "./MentorProgramEditor";
import { fmtDate } from "@/lib/mentorFormat";
import { isoLocal } from "@/lib/jalali";
import { nextPeriodStart, rangeDuration, shiftedRange } from "@/lib/mentorProgramCopy";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorshipRow, ProgramDetailResponse, ProgramRow, ProgramsResponse, ProgramType } from "@/lib/mentorTypes";
import type { TemplateResponse, TemplateRow, TemplatesResponse } from "@/lib/mentorToolsTypes";

const ic = (Icon: typeof Copy, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;
const typeIcon = (t: ProgramType) => (t === "WORKOUT" ? ic(Dumbbell, MI.row) : ic(CalendarCheck, MI.row));

export type StartSource = "blank" | "template" | "copy";
export type StartLoaded = { key: string; label: string; prefill: ProgramPrefill };
type Loaded = StartLoaded;

/**
 * بخش اول سازنده: «برای کی؟». انتخاب شاگرد + نقطه‌ی شروع (از اول / از قالب / کپی برنامه).
 * همه‌ی حالت‌ها همان کارکرد قبلی را دارند؛ فقط در یک صفحه‌اند.
 */
export function MentorProgramStart({
  rows, missing, row, allowedTypes, source, loaded, initialPick, onPickStudent, onClearStudent, onSource, onLoaded,
}: {
  rows: MentorshipRow[];
  missing: boolean;
  row: MentorshipRow | null;
  allowedTypes: ProgramType[];
  source: StartSource;
  loaded: Loaded | null;
  initialPick: { templateId: string; fromProgramId: string };
  onPickStudent: (id: string) => void;
  onClearStudent: () => void;
  onSource: (s: StartSource) => void;
  onLoaded: (l: Loaded | null) => void;
}) {
  if (!row) {
    return (
      <div className="mv2-pg-start">
        {missing && <div className="form-inline-error" role="alert">همکاری فعالی با این شاگرد پیدا نشد؛ برنامه فقط برای شاگرد فعال ساخته می‌شود</div>}
        {rows.length === 0 ? (
          <MentorEmpty>هنوز شاگرد فعالی نداری</MentorEmpty>
        ) : (
          <ul className="mv2-pg-plain">
            {rows.map((r) => {
              const name = publicUserName(r.counterpart);
              return (
                <li key={r.id}>
                  <MentorRow
                    lead={<MentorUserAvatar avatarUrl={r.counterpart.avatarUrl} name={name} size={36} />}
                    title={name}
                    sub={<span>{r.activePrograms > 0 ? `${fa(r.activePrograms)} برنامه‌ی در حال اجرا` : "برنامه‌ی در حال اجرا نداره"}</span>}
                    end={<button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => onPickStudent(r.id)}>انتخاب</button>}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
  const name = publicUserName(row.counterpart);
  return (
    <div className="mv2-pg-start">
      <MentorRow
        lead={<MentorUserAvatar avatarUrl={row.counterpart.avatarUrl} name={name} size={40} />}
        title={name}
        sub={<span>{row.activePrograms > 0 ? `${fa(row.activePrograms)} برنامه‌ی در حال اجرا` : "برنامه‌ی در حال اجرا نداره"}</span>}
        end={rows.length > 1 ? <button type="button" className="mentor-text-btn" onClick={onClearStudent}>عوض کردن</button> : undefined}
      />
      <div className="mentor-tabs">
        <SegmentedTabs<StartSource>
          active={source}
          onChange={onSource}
          options={[
            { value: "blank", label: "از اول" },
            { value: "template", label: "از قالب" },
            { value: "copy", label: "کپی برنامه" },
          ]}
        />
      </div>
      {source === "template" && (
        <TemplateSource allowedTypes={allowedTypes} loaded={loaded} preselect={initialPick.templateId} onLoaded={onLoaded} />
      )}
      {source === "copy" && (
        <CopySource row={row} allowedTypes={allowedTypes} loaded={loaded} preselect={initialPick.fromProgramId} onLoaded={onLoaded} />
      )}
    </div>
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
          <span>{fa(p.items.length)} {p.type === "WORKOUT" ? "حرکت" : "کار"}</span>
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
    return <MentorEmpty icon={ic(SearchX, MI.row)}>{list.length ? "قالبی با نوع مجاز برای این شاگرد نیست" : "هنوز قالبی نساختی"}</MentorEmpty>;
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
              <span>{fa(t.itemCount)} {t.type === "WORKOUT" ? "حرکت" : "کار"}</span>
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
