import type { DoseSlot } from "./medicationDoses";

// ادغام برنامه‌های امروز و نوبت‌های دارویی در یک خط زمانی. منطق خالص و تست‌دار.
// تیک دارو جدا از روتینه (medicationDoses) و روی تکمیل روز و استریک اثر نداره.

export type MergeProgram = { startMin: number | null };
export type MergedItem<P extends MergeProgram> =
  | { kind: "program"; program: P }
  | { kind: "dose"; dose: DoseSlot };

/** ترتیب بر اساس ساعت؛ هم‌ساعت: برنامه قبل از دارو؛ بدون ساعت ته لیست به ترتیب اولیه */
export function mergeTodayItems<P extends MergeProgram>(programs: P[], doses: DoseSlot[]): MergedItem<P>[] {
  const all: { it: MergedItem<P>; at: number; order: number }[] = [];
  programs.forEach((p, i) => all.push({ it: { kind: "program", program: p }, at: p.startMin ?? Number.POSITIVE_INFINITY, order: i }));
  doses.forEach((d, i) => all.push({ it: { kind: "dose", dose: d }, at: d.minutes, order: programs.length + i }));
  return all.sort((a, b) => a.at - b.at || a.order - b.order).map((x) => x.it);
}

export type DoseState = "done" | "missed" | "upcoming";

/** وضعیت یک نوبت: خورده، یا بیش از 30 دقیقه گذشته و نخورده، یا پیش‌رو */
export function doseState(minutes: number, taken: boolean, nowMin: number | null): DoseState {
  if (taken) return "done";
  if (nowMin !== null && minutes < nowMin - 30) return "missed";
  return "upcoming";
}
