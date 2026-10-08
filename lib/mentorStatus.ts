// متن وضعیت انسانی شاگرد و برنامه در پنل مربی (طرح نسخه‌ی 2، docs/mentor-panel-v2.md)
// خالص و بدون وابستگی؛ تن‌ها هم‌نام MentorTone در components/MentorUI.tsx.
import type { ProgramStatus } from "@/lib/mentorTypes";

export type MentorStatusTone = "neutral" | "accent" | "info" | "ok" | "warn" | "danger";
export type MentorStatusText = { text: string; tone: MentorStatusTone };

/** ارقام لاتین (قانون ثابت اپ) */
const n = (v: number) => String(Math.round(v));

/**
 * اولویت: متوقف > N روزه خبری نیست > داده‌ای نیست > درصد انجام هفته.
 * rate بین 0..1 یا 0..100 (مثل normRate) و null = هنوز داده‌ای نیست.
 */
export function studentStatusText(o: { rate: number | null | undefined; idleDays?: number | null; paused?: boolean }): MentorStatusText {
  if (o.paused) return { text: "متوقف", tone: "neutral" };
  const idle = o.idleDays ?? 0;
  if (idle >= 2) return { text: `${n(idle)} روزه خبری نیست`, tone: "warn" };
  if (o.rate == null || !Number.isFinite(o.rate)) return { text: "هنوز داده‌ای نیست", tone: "neutral" };
  const r = o.rate > 1 ? o.rate / 100 : o.rate;
  if (r >= 0.8) return { text: "عالی پیش می‌ره", tone: "ok" };
  if (r >= 0.5) return { text: "خوبه", tone: "info" };
  return { text: "نیاز به حمایت", tone: "warn" };
}

/**
 * وضعیت برنامه به زبان مربی. DRAFT با changeRequested (یادداشت درخواست
 * تغییر شاگرد) یعنی «شاگرد تغییر خواسته»؛ DRAFT ساده یعنی هنوز فرستاده نشده.
 */
export function programStatusText(status: ProgramStatus, opts: { changeRequested?: boolean } = {}): MentorStatusText {
  switch (status) {
    case "DRAFT":
      return opts.changeRequested
        ? { text: "شاگرد تغییر خواسته", tone: "warn" }
        : { text: "ساخته شده، فرستاده نشده", tone: "neutral" };
    case "PENDING": return { text: "منتظر جواب شاگرد", tone: "info" };
    case "ACCEPTED": return { text: "قبول شد، منتظر شروع", tone: "accent" };
    case "ACTIVE": return { text: "در حال اجرا", tone: "ok" };
    case "COMPLETED": return { text: "تمام شده", tone: "neutral" };
    case "REJECTED": return { text: "شاگرد قبول نکرد", tone: "danger" };
    case "CANCELLED": return { text: "لغو شده", tone: "neutral" };
    default: return { text: "نامشخص", tone: "neutral" };
  }
}
