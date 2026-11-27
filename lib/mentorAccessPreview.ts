import type { PrivacySettings } from "./mentorTypes";

// منطق خالص پیش‌نمای «تنظیم سطح دسترسی مربی» — همون قاعده‌ی projectRoutineForMentor
// (lib/mentorPrivacy.ts) روی یک برنامه‌ی نمونه، بدون هیچ متنی (متن‌ها در کامپوننت با tr می‌آن).

export type AccessKey = "programs" | "schedule" | "programName" | "taskName" | "taskDetails" | "progress" | "sleep";

export type AccessExample = { name: string; tag?: string; time: string; importance?: string; sample: boolean };

export type AccessLine = {
  key: AccessKey;
  visible: boolean;
  /** چرا بسته‌ست وقتی کلید خودش روشنه ولی چیز دیگه‌ای جلوش رو گرفته */
  blockedBy: "programs" | "schedule" | "name" | "importance" | null;
  /** مقدار نمونه‌ای که مربی می‌بینه (null = متن ثابت کامپوننت) */
  value: string | null;
};

export type CoachPart = { t: "program" | "title" | "busy" | "importance" | "done"; v?: string };

type Draft = Pick<PrivacySettings, "shareAllPrograms" | "sharedPrograms" | "showSchedule" | "showProgramName" | "showTaskName" | "showTaskDetails" | "showProgress"> & { shareSleep?: boolean };

/** کلید برنامه (هم‌قاعده با routineScopeKey سرور) */
export function scopeKeyOf(o: { name: string; tag?: string }): string {
  const label = (o.tag && o.tag.trim()) || (o.name || "").trim();
  return "routine:" + label.slice(0, 120);
}

export function programVisible(d: Pick<Draft, "shareAllPrograms" | "sharedPrograms">, o: { name: string; tag?: string }): boolean {
  return d.shareAllPrograms || d.sharedPrograms.includes(scopeKeyOf(o));
}

export function buildAccessPreview(d: Draft, ex: AccessExample, hasAnyProgram: boolean): { lines: AccessLine[]; coachParts: CoachPart[] | null } {
  // برنامه‌ی نمونه برای مربی دیده می‌شه یا نه؛ نمونه‌ی ساختگی وقتی کاربر برنامه‌ای نداره از روی انتخاب «همه»/«بعضی» تصمیم می‌گیره
  const progOn = ex.sample ? hasAnyProgram || d.shareAllPrograms || d.sharedPrograms.length > 0 : programVisible(d, ex);
  const schedOn = progOn && d.showSchedule;
  const hasTag = !!ex.tag?.trim();
  const nameOk = hasTag || d.showTaskName;
  const imp = ex.importance || null;

  const blocked = (own: boolean): AccessLine["blockedBy"] => (own ? (!progOn ? "programs" : !d.showSchedule ? "schedule" : null) : null);
  const lines: AccessLine[] = [
    { key: "programs", visible: progOn, blockedBy: null, value: null },
    { key: "schedule", visible: schedOn, blockedBy: !progOn && d.showSchedule ? "programs" : null, value: ex.time },
    {
      key: "programName", visible: schedOn && d.showProgramName && nameOk,
      blockedBy: blocked(d.showProgramName) ?? (d.showProgramName && !nameOk ? "name" : null),
      value: (ex.tag?.trim() || ex.name),
    },
    { key: "taskName", visible: schedOn && d.showTaskName, blockedBy: blocked(d.showTaskName), value: ex.name },
    { key: "taskDetails", visible: schedOn && d.showTaskDetails && !!imp, blockedBy: blocked(d.showTaskDetails) ?? (d.showTaskDetails && !imp ? "importance" : null), value: imp },
    { key: "progress", visible: schedOn && d.showProgress, blockedBy: blocked(d.showProgress), value: null },
    { key: "sleep", visible: !!d.shareSleep, blockedBy: null, value: null },
  ];

  let coachParts: CoachPart[] | null = null;
  if (schedOn) {
    coachParts = [];
    if (lines[2].visible) coachParts.push({ t: "program", v: lines[2].value! });
    coachParts.push(d.showTaskName ? { t: "title", v: ex.name } : { t: "busy" });
    if (lines[4].visible) coachParts.push({ t: "importance", v: imp! });
    if (d.showProgress) coachParts.push({ t: "done" });
  }
  return { lines, coachParts };
}
