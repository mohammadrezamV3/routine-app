import type { Mentorship } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/userSettingKeys";

// حریم خصوصی شاگرد در برابر هر منتور — *فقط* این‌جا تصمیم گرفته می‌شه و
// روت‌ها خروجی این توابع رو برمی‌گردونن، نه داده‌ی خام. مخفی‌کردن سمت
// کلاینت کافی نیست: چیزی که منتور اجازه‌ش رو نداره اصلا از سرور خارج نمی‌شه.
//
// «برنامه»ی شاگرد در آریون = گروه occurrenceهای روتین با یک برچسب (tag)،
// یا اگه برچسب نداشت، با یک اسم. به‌علاوه‌ی ماژول‌های بدنسازی و کالری.
// کلیدها: "routine:<tag یا name>" | "module:EXERCISE" | "module:CALORIE".
// برنامه‌هایی که خود منتور ساخته همیشه برای *همون* منتور قابل‌دیدنه و هیچ
// منتور دیگه‌ای هرگز اون‌ها رو نمی‌بینه (این‌جا نیستن، با mentorId فیلتر می‌شن).

export const MODULE_SCOPES = [
  { key: "module:EXERCISE", label: "برنامه تمرینی (بدنسازی)" },
  { key: "module:CALORIE", label: "کالری‌شمار" },
] as const;

export const MAX_SHARED_PROGRAMS = 100;
const SCOPE_RE = /^(routine:[^\n]{1,120}|module:(EXERCISE|CALORIE))$/;

export type PrivacySettings = Pick<
  Mentorship,
  "shareAllPrograms" | "sharedPrograms" | "showSchedule" | "showProgramName" | "showTaskName" | "showTaskDetails" | "showProgress"
>;

export type StudentOccurrence = {
  id: string;
  name: string;
  jsDay: number;
  time: string;
  startDate?: string;
  endDate?: string;
  importance?: string;
  tag?: string;
  mentorProgramId?: string;
  mentorItemId?: string;
};

export function routineScopeKey(o: { name: string; tag?: string }): string {
  const label = (o.tag && o.tag.trim()) || (o.name || "").trim();
  return "routine:" + label.slice(0, 120);
}

export function sanitizeSharedPrograms(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const k of v) {
    if (typeof k === "string" && SCOPE_RE.test(k)) out.add(k);
    if (out.size >= MAX_SHARED_PROGRAMS) break;
  }
  return Array.from(out);
}

export function canSeeScope(p: Pick<PrivacySettings, "shareAllPrograms" | "sharedPrograms">, key: string): boolean {
  return p.shareAllPrograms || p.sharedPrograms.includes(key);
}

export async function loadStudentOccurrences(studentId: string): Promise<StudentOccurrence[]> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: studentId, key: SETTING_KEYS.customOccurrences } },
    select: { value: true },
  });
  const arr = Array.isArray(row?.value) ? (row!.value as any[]) : [];
  return arr.filter(
    (o): o is StudentOccurrence => o && typeof o.id === "string" && typeof o.name === "string" && typeof o.jsDay === "number" && typeof o.time === "string"
  );
}

/** لیست برنامه‌هایی که شاگرد می‌تونه برای یک منتور تیک بزنه (فقط برای خود شاگرد) */
export async function listStudentScopes(studentId: string): Promise<{ key: string; label: string; kind: "routine" | "module" }[]> {
  const occ = await loadStudentOccurrences(studentId);
  const seen = new Map<string, string>();
  // برنامه‌هایی که از برنامه‌ی یک منتور آینه شدن جزو «برنامه‌های خود شاگرد» نیستن
  for (const o of occ) if (!o.mentorProgramId) seen.set(routineScopeKey(o), routineScopeKey(o).slice("routine:".length));
  return [
    ...Array.from(seen, ([key, label]) => ({ key, label, kind: "routine" as const })),
    ...MODULE_SCOPES.map((m) => ({ key: m.key, label: m.label, kind: "module" as const })),
  ];
}

export type MentorRoutineSlot = {
  jsDay: number;
  time: string;
  program: string | null; // null = اسم برنامه مخفی
  title: string; // «مشغول» وقتی اسم تسک مخفیه
  details: { importance?: string } | null;
  done: Record<string, boolean> | null; // dateIso → انجام‌شده؛ null = پیشرفت مخفی
};

/**
 * نمای روتین شاگرد برای یک منتور، در بازه‌ی [fromIso, toIso].
 * showSchedule=false → هیچ اسلاتی برنمی‌گرده (فقط اعلام مخفی‌بودن).
 */
export async function projectRoutineForMentor(
  studentId: string,
  p: PrivacySettings,
  dates: string[]
): Promise<{ scheduleHidden: boolean; slots: MentorRoutineSlot[] }> {
  if (!p.showSchedule) return { scheduleHidden: true, slots: [] };
  const occ = (await loadStudentOccurrences(studentId)).filter((o) => !o.mentorProgramId && canSeeScope(p, routineScopeKey(o)));
  if (occ.length === 0) return { scheduleHidden: false, slots: [] };

  let daily: Map<string, Record<string, boolean>> = new Map();
  if (p.showProgress && dates.length > 0) {
    const rows = await prisma.dailyEntry.findMany({
      where: { userId: studentId, date: { in: dates.map((d) => new Date(d + "T00:00:00.000Z")) } },
      select: { date: true, completedItems: true },
    });
    daily = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), (r.completedItems ?? {}) as Record<string, boolean>]));
  }

  const slots: MentorRoutineSlot[] = occ.map((o) => {
    let done: Record<string, boolean> | null = null;
    if (p.showProgress) {
      done = {};
      for (const d of dates) {
        const js = new Date(d + "T00:00:00.000Z").getUTCDay();
        if (js !== o.jsDay) continue;
        if (o.startDate && d < o.startDate) continue;
        if (o.endDate && d > o.endDate) continue;
        done[d] = !!daily.get(d)?.[o.id];
      }
    }
    // اسم برنامه وقتی برچسب نداره همون اسم تسکه — پس اگه اسم تسک مخفیه،
    // نمایش «اسم برنامه» نباید از در پشتی اسم تسک رو لو بده.
    const hasTag = !!(o.tag && o.tag.trim());
    const program = p.showProgramName && (hasTag || p.showTaskName) ? routineScopeKey(o).slice("routine:".length) : null;
    return {
      jsDay: o.jsDay,
      time: o.time,
      program,
      title: p.showTaskName ? o.name : "مشغول",
      details: p.showTaskDetails ? { importance: o.importance } : null,
      done,
    };
  });
  slots.sort((a, b) => a.jsDay - b.jsDay || a.time.localeCompare(b.time));
  return { scheduleHidden: false, slots };
}
