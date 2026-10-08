"use client";

import { useCallback, useEffect, useState } from "react";
import { PROGRAM_TYPE_CATEGORY } from "@/lib/mentorCategories";
import { MentorDashShell, MentorDashError, mentorApi } from "@/components/MentorDashKit";
import { MentorProgramEditor } from "@/components/MentorProgramEditor";
import { MentorProgramStart, type StartLoaded, type StartSource } from "@/components/MentorProgramStart";
import { LoadingBlock } from "@/components/Spinner";
import type { MentorshipRow, MentorshipsResponse, ProgramType } from "@/lib/mentorTypes";

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

function allowedTypesFor(row: MentorshipRow): ProgramType[] {
  return (["ROUTINE", "WORKOUT"] as const).filter(
    (t) => row.categories.length === 0 || row.categories.includes(PROGRAM_TYPE_CATEGORY[t]),
  );
}

/** /mentor/programs/new — سازنده‌ی برنامه در یک صفحه (شاگرد + نقطه‌ی شروع + مشخصات + کارها) */
export default function NewMentorProgramPage() {
  const [rows, setRows] = useState<MentorshipRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mentorshipId, setMentorshipId] = useState("");
  const [source, setSource] = useState<StartSource>("blank");
  const [loaded, setLoaded] = useState<StartLoaded | null>(null);
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
    const active = (r.data.mentorships || []).filter((m) => m.status === "ACTIVE");
    setRows(active);
    // فقط یک شاگرد داری: خودش انتخاب می‌شود
    if (!p.mentorshipId && active.length === 1) setMentorshipId(active[0].id);
  }, []);

  useEffect(() => { load(); }, [load]);

  const row = rows?.find((m) => m.id === mentorshipId) ?? null;
  const back = row
    ? { href: `/mentor/students/${row.counterpart.id}`, label: "برگشت" }
    : { href: "/mentor/templates", label: "برنامه‌ها" };

  let body: React.ReactNode;
  if (loadError) body = <MentorDashError message={loadError} onRetry={load} />;
  else if (!rows) body = <LoadingBlock />;
  else {
    const allowedTypes = row ? allowedTypesFor(row) : [];
    if (row && allowedTypes.length === 0) {
      body = <MentorDashError message="حوزه‌ی همکاری با این شاگرد برنامه نداره؛ از گفت‌وگو و بازخورد استفاده کن" />;
    } else {
      const ready = !!row && (source === "blank" || !!loaded);
      body = (
        <MentorProgramEditor
          mode="new"
          mentorshipId={row?.id ?? null}
          student={row?.counterpart ?? null}
          allowedTypes={allowedTypes}
          initial={loaded?.prefill ?? null}
          prefillKey={`${row?.id ?? ""}:${loaded?.key ?? "blank"}`}
          locked={!ready}
          startSlot={
            <MentorProgramStart
              rows={rows}
              missing={!!mentorshipId && !row}
              row={row}
              allowedTypes={allowedTypes}
              source={source}
              loaded={loaded}
              initialPick={initialPick}
              onPickStudent={(id) => { setMentorshipId(id); setParam("mentorshipId", id); setLoaded(null); }}
              onClearStudent={() => { setMentorshipId(""); setParam("mentorshipId", null); setLoaded(null); }}
              onSource={(v) => { setSource(v); setLoaded(null); setParam("templateId", null); setParam("fromProgramId", null); }}
              onLoaded={(l) => {
                setLoaded(l);
                setParam("templateId", l?.prefill.templateId ?? null);
                setParam("fromProgramId", l && l.key.startsWith("p:") ? l.key.slice(2) : null);
              }}
            />
          }
        />
      );
    }
  }

  return (
    <MentorDashShell title="برنامه‌ی تازه" back={back}>
      {body}
    </MentorDashShell>
  );
}
