import { faNum } from "@/lib/jalali";

// ردیف‌های «فعالیت اخیر» داشبورد منتور از ثبت‌های پیشرفت.
//
// پیشرفت خودکار است (lib/mentorProgress.ts): همگام‌سازی تیک‌های چند روز را در
// یک لحظه می‌نویسد، پس «یک ردیف برای هر آیتم با زمان ثبت» فهرستی از
// ردیف‌های تکراری هم‌زمان («پیاده‌روی: انجام شد، ۷ دقیقه پیش» سه بار) می‌ساخت.
// هر (برنامه، روز انجام) یک ردیف می‌شود و خود روز همراهش می‌آید.

export type ActivityLogRow<S> = {
  programId: string;
  status: "COMPLETED" | "PARTIAL" | "MISSED";
  date: Date;
  doneOn: Date | null;
  updatedAt: Date;
  item: { title: string };
  program: { student: S };
};

export type LogActivity<S> = { type: "log"; at: Date; day: string; student: S; text: string; url: string };

const LABEL = { COMPLETED: "انجام شد", PARTIAL: "نیمه‌کاره", MISSED: "انجام نشد" } as const;

export function groupLogActivity<S>(logs: ActivityLogRow<S>[]): LogActivity<S>[] {
  const groups = new Map<string, ActivityLogRow<S>[]>();
  for (const l of logs) {
    const k = `${l.programId}|${(l.doneOn ?? l.date).toISOString().slice(0, 10)}`;
    const g = groups.get(k);
    if (g) g.push(l);
    else groups.set(k, [l]);
  }
  return Array.from(groups.entries()).map(([k, g]) => {
    const at = g.reduce((m, l) => (l.updatedAt > m ? l.updatedAt : m), g[0].updatedAt);
    const done = g.filter((l) => l.status === "COMPLETED").length;
    const partial = g.filter((l) => l.status === "PARTIAL").length;
    const text =
      g.length === 1
        ? `${g[0].item.title}: ${LABEL[g[0].status]}`
        : [done ? `${faNum(done)} آیتم انجام شد` : "", partial ? `${faNum(partial)} آیتم نیمه‌کاره` : ""].filter(Boolean).join("، ");
    return { type: "log" as const, at, day: k.slice(k.indexOf("|") + 1), student: g[0].program.student, text, url: `/mentor-programs/${g[0].programId}` };
  });
}
