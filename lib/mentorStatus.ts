// متن وضعیت انسانی شاگرد و برنامه در پنل مربی (طرح نسخه‌ی 2، docs/mentor-panel-v2.md)
// خالص و بدون وابستگی؛ تن‌ها هم‌نام MentorTone در components/MentorUI.tsx.
import type { ProgramStatus } from "@/lib/mentorTypes";
import { tr } from "@/lib/i18n";

export type MentorStatusTone = "neutral" | "accent" | "info" | "ok" | "warn" | "danger";
export type MentorStatusText = { text: string; tone: MentorStatusTone };

/** ارقام لاتین (قانون ثابت اپ) */
const n = (v: number) => String(Math.round(v));

/**
 * اولویت: متوقف > N روزه خبری نیست > داده‌ای نیست > درصد انجام هفته.
 * rate بین 0..1 یا 0..100 (مثل normRate) و null = هنوز داده‌ای نیست.
 */
export function studentStatusText(o: { rate: number | null | undefined; idleDays?: number | null; paused?: boolean }): MentorStatusText {
  if (o.paused) return { text: tr("متوقف", "Paused"), tone: "neutral" };
  const idle = o.idleDays ?? 0;
  if (idle >= 2) return { text: tr(`${n(idle)} روزه خبری نیست`, `No news for ${n(idle)} ${idle === 1 ? "day" : "days"}`), tone: "warn" };
  if (o.rate == null || !Number.isFinite(o.rate)) return { text: tr("هنوز داده‌ای نیست", "No data yet"), tone: "neutral" };
  const r = o.rate > 1 ? o.rate / 100 : o.rate;
  if (r >= 0.8) return { text: tr("عالی پیش می‌ره", "Going great"), tone: "ok" };
  if (r >= 0.5) return { text: tr("خوبه", "Doing well"), tone: "info" };
  return { text: tr("نیاز به حمایت", "Needs support"), tone: "warn" };
}

/**
 * وضعیت برنامه به زبان مربی. DRAFT با changeRequested (یادداشت درخواست
 * تغییر شاگرد) یعنی «شاگرد تغییر خواسته»؛ DRAFT ساده یعنی هنوز فرستاده نشده.
 */
export function programStatusText(status: ProgramStatus, opts: { changeRequested?: boolean } = {}): MentorStatusText {
  switch (status) {
    case "DRAFT":
      return opts.changeRequested
        ? { text: tr("شاگرد تغییر خواسته", "Student asked for changes"), tone: "warn" }
        : { text: tr("ساخته شده، فرستاده نشده", "Created, not sent"), tone: "neutral" };
    case "PENDING": return { text: tr("منتظر جواب شاگرد", "Waiting for the student"), tone: "info" };
    case "ACCEPTED": return { text: tr("قبول شد، منتظر شروع", "Accepted, waiting to start"), tone: "accent" };
    case "ACTIVE": return { text: tr("در حال اجرا", "In progress"), tone: "ok" };
    case "COMPLETED": return { text: tr("تمام شده", "Finished"), tone: "neutral" };
    case "REJECTED": return { text: tr("شاگرد قبول نکرد", "Student declined"), tone: "danger" };
    case "CANCELLED": return { text: tr("لغو شده", "Cancelled"), tone: "neutral" };
    default: return { text: tr("نامشخص", "Unknown"), tone: "neutral" };
  }
}
