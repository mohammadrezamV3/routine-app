"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, X } from "lucide-react";
import { MentorDashShell, MentorDashError, fa, mentorApi } from "@/components/MentorDashKit";
import { MI, MI_STROKE, MentorField, MentorRow, MentorSection } from "@/components/MentorUI";
import { JalaliDatePicker } from "@/components/JalaliDatePicker";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { PROGRAM_TYPE_CATEGORY } from "@/lib/mentorCategories";
import { fmtDate } from "@/lib/mentorFormat";
import { formatJalali, isoLocal, jalaliToIso, toJalali, type JalaliDate } from "@/lib/jalali";
import { nextPeriodStart, rangeDuration, shiftedRange } from "@/lib/mentorProgramCopy";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorshipRow, MentorshipsResponse, Program, ProgramDetailResponse } from "@/lib/mentorTypes";
import { tr } from "@/lib/i18n";

const ic = (Icon: typeof Copy, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;
const TITLE_MAX = 120;

function isoToJalali(iso: string | null): JalaliDate | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? toJalali(+m[1], +m[2], +m[3]) : null;
}

type Data = { program: Program; itemCount: number; students: MentorshipRow[] };

/**
 * /mentor/programs/[id]/duplicate — کپی برنامه به‌صورت پیش‌نویس تازه برای
 * همان شاگرد (دوره‌ی بعد) یا شاگرد دیگر، با جابه‌جایی تاریخ.
 */
export default function DuplicateMentorProgramPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();

  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<{ msg: string; final: boolean } | null>(null);
  const [mentorshipId, setMentorshipId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<JalaliDate | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleErr, setTitleErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    const [p, m] = await Promise.all([
      mentorApi<ProgramDetailResponse>(`/api/mentor-programs/${encodeURIComponent(id)}`),
      mentorApi<MentorshipsResponse>("/api/mentorships?role=mentor"),
    ]);
    if (!p.ok) { setLoadError({ msg: p.error, final: p.status === 404 || p.status === 403 }); return; }
    if (p.data.role !== "MENTOR") { setLoadError({ msg: tr("فقط مربی سازنده‌ی این برنامه می‌تواند آن را کپی کند", "Only the mentor who created this program can copy it"), final: true }); return; }
    if (!m.ok) { setLoadError({ msg: m.error, final: false }); return; }
    const program = p.data.program;
    const students = (m.data.mentorships || []).filter(
      (r) => r.status === "ACTIVE" && (r.categories.length === 0 || r.categories.includes(PROGRAM_TYPE_CATEGORY[program.type])),
    );
    setData({ program, itemCount: p.data.items.length, students });
    setTitle(program.title);
    const same = students.find((s) => s.id === program.mentorshipId);
    const target = same ?? students[0];
    setMentorshipId(target?.id ?? "");
    if (rangeDuration(program.startDate, program.endDate) != null || program.startDate) {
      setStart(isoToJalali(same ? nextPeriodStart(program.endDate, isoLocal(new Date())) : isoLocal(new Date())));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const program = data?.program ?? null;
  const duration = program ? rangeDuration(program.startDate, program.endDate) : null;
  const startIso = start ? jalaliToIso(...start) : null;
  const range = useMemo(() => shiftedRange(duration, startIso), [duration, startIso]);
  const target = data?.students.find((s) => s.id === mentorshipId) ?? null;

  function onStudentChange(v: string) {
    setMentorshipId(v);
    setError(null);
    // همان شاگرد = دوره‌ی بعد؛ شاگرد دیگر = از امروز (اگر مبدا تاریخ داشت)
    if (program && (program.startDate || duration != null)) {
      const today = isoLocal(new Date());
      setStart(isoToJalali(v === program.mentorshipId ? nextPeriodStart(program.endDate, today) : today));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !program) return;
    setError(null);
    const t = title.trim();
    if (!t) { setTitleErr(tr("عنوان برنامه لازم است", "A program title is required")); return; }
    if (!mentorshipId) { setError(tr("شاگرد مقصد را انتخاب کن", "Pick the student to copy it to")); return; }
    setBusy(true);
    const r = await mentorApi<{ program: Program }>(`/api/mentor-programs/${encodeURIComponent(program.id)}/duplicate`, {
      method: "POST",
      body: { mentorshipId, title: t, startDate: startIso },
    });
    if (!r.ok) { setBusy(false); setError(r.error); return; }
    router.replace(`/mentor/programs/${r.data.program.id}/edit?saved=1`);
  }

  let body: React.ReactNode;
  if (!id || (!data && !loadError)) body = <LoadingBlock />;
  else if (loadError || !data || !program) body = <MentorDashError message={loadError?.msg || tr("برنامه دریافت نشد؛ دوباره تلاش کن", "Could not load the program. Try again.")} onRetry={loadError?.final ? undefined : load} />;
  else if (data.students.length === 0) body = <MentorDashError message={tr("شاگرد فعالی با حوزه‌ی این نوع برنامه نداری", "You have no active students in the field of this kind of program")} />;
  else {
    body = (
      <>
        <MentorSection title={tr("برنامه‌ی مبدا", "Original program")} icon={ic(Copy, MI.section)} flush>
          <MentorRow
            title={program.title}
            sub={
              <>
                <span>{publicUserName(program.counterpart)}</span>
                <span>{fa(data.itemCount)} {program.type === "WORKOUT" ? tr("حرکت", data.itemCount === 1 ? "exercise" : "exercises") : tr("کار", data.itemCount === 1 ? "task" : "tasks")}</span>
                {program.startDate && <span>{fmtDate(program.startDate)}{program.endDate ? tr(` تا ${fmtDate(program.endDate)}`, ` to ${fmtDate(program.endDate)}`) : ""}</span>}
              </>
            }
          />
        </MentorSection>

        <MentorSection title={tr("کپی برای", "Copy for")}>
          <form className="mentor-form" onSubmit={submit} noValidate>
            <MentorField label={tr("شاگرد", "Student")} htmlFor="dup-student">
              <select
                id="dup-student" className="wsearch-newform-name trade-glass-field" value={mentorshipId}
                onChange={(e) => onStudentChange(e.target.value)}
              >
                {data.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {publicUserName(s.counterpart)}{s.id === program.mentorshipId ? tr(" (همین شاگرد، دوره‌ی بعد)", " (same student, next period)") : ""}
                  </option>
                ))}
              </select>
            </MentorField>

            <MentorField label={tr("عنوان", "Title")} htmlFor="dup-title" error={titleErr}>
              <input
                id="dup-title" type="text" className="wsearch-newform-name trade-glass-field" maxLength={TITLE_MAX} value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleErr(null); }}
              />
            </MentorField>

            <MentorField
              label={tr("تاریخ شروع", "Start date")} optional
              hint={range.startDate
                ? range.endDate
                  ? tr(`پایان: ${fmtDate(range.endDate)} (همان ${fa((duration ?? 0) + 1)} روز برنامه‌ی مبدا)؛ پس از پذیرش در روز شروع خودکار فعال می‌شود`, `Ends: ${fmtDate(range.endDate)} (the same ${fa((duration ?? 0) + 1)} days as the original). After the student accepts, it starts automatically on the start date.`)
                  : tr("پس از پذیرش در روز شروع خودکار فعال می‌شود", "After the student accepts, it starts automatically on the start date")
                : tr("بدون تاریخ، برنامه از روز پذیرش شاگرد شروع می‌شود", "With no date, the program starts the day the student accepts")}
            >
              <div className="wsearch-date-row" style={{ marginTop: 0 }}>
                <div className="time-field">
                  <button type="button" className={`jdate-btn${start ? "" : " placeholder"}`} aria-label={tr("تاریخ شروع", "Start date")} onClick={() => setPicker(true)}>
                    {start ? formatJalali(start) : tr("روز / ماه / سال", "Day / month / year")}
                  </button>
                </div>
              </div>
              {start && (
                <div>
                  <button type="button" className="mentor-text-btn" onClick={() => setStart(null)}>{ic(X, MI.btnSm)} {tr("بدون تاریخ", "No date")}</button>
                </div>
              )}
            </MentorField>

            {target && target.id !== program.mentorshipId && (
              <p className="mentor-field-hint" style={{ margin: 0 }}>
                {tr("کارها، توضیح و یادداشت کپی می‌شه؛ پیشرفت، بازخورد و وضعیت برنامه‌ی اصلی نه", "Tasks, description and note are copied; progress, feedback and the status of the original are not")}
              </p>
            )}

            {error && <div className="form-inline-error" role="alert">{error}</div>}
            <div className="mentor-form-actions">
              <button type="button" className="account-outline-btn muted mentor-btn" onClick={() => router.back()} disabled={busy}>{tr("انصراف", "Cancel")}</button>
              <button type="submit" className="trade-primary-btn mentor-btn" disabled={busy}>
                {busy ? <Spinner size={14} /> : <>{ic(Copy, MI.btn)} {tr("ساخت کپی", "Make a copy")}</>}
              </button>
            </div>
          </form>
        </MentorSection>

        {picker && (
          <JalaliDatePicker
            initial={start}
            title={tr("تاریخ شروع برنامه", "Program start date")}
            disablePast
            onClose={() => setPicker(false)}
            onPick={(v) => { setStart(v); setPicker(false); setError(null); }}
          />
        )}
      </>
    );
  }

  return (
    <MentorDashShell
      title={tr("کپی برنامه", "Copy program")}
      back={program ? { href: `/mentor-programs/${program.id}`, label: program.title } : { href: "/mentor/templates", label: tr("برنامه‌ها", "Programs") }}
    >
      {body}
    </MentorDashShell>
  );
}
