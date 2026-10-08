import type { MentorProgramStatus } from "@prisma/client";

// ماشین حالت برنامه‌ی منتور — تک‌منبع تصمیم «کی می‌تونه کدوم انتقال رو بزنه».
// هر روتی که وضعیت رو عوض می‌کنه *باید* از canTransition رد بشه و update رو
// با where: { id, status: from } بزنه (optimistic lock) تا دو درخواست هم‌زمان
// نتونن از یک حالت دو انتقال متفاوت بسازن.
//
// «درخواست تغییر»: شاگرد PENDING → DRAFT می‌زنه با changeRequestNote؛ منتور
// ویرایش و دوباره ارسال می‌کنه (DRAFT → PENDING، version++).

export type ProgramActor = "MENTOR" | "STUDENT";
export type ProgramAction = "send" | "accept" | "reject" | "request_changes" | "activate" | "complete" | "cancel";

type Rule = { from: MentorProgramStatus[]; to: MentorProgramStatus; actor: ProgramActor[] };

export const PROGRAM_TRANSITIONS: Record<ProgramAction, Rule> = {
  send: { from: ["DRAFT"], to: "PENDING", actor: ["MENTOR"] },
  accept: { from: ["PENDING"], to: "ACCEPTED", actor: ["STUDENT"] },
  reject: { from: ["PENDING"], to: "REJECTED", actor: ["STUDENT"] },
  request_changes: { from: ["PENDING"], to: "DRAFT", actor: ["STUDENT"] },
  activate: { from: ["ACCEPTED"], to: "ACTIVE", actor: ["STUDENT", "MENTOR"] },
  complete: { from: ["ACTIVE"], to: "COMPLETED", actor: ["STUDENT", "MENTOR"] },
  cancel: { from: ["DRAFT", "PENDING", "ACCEPTED", "ACTIVE"], to: "CANCELLED", actor: ["STUDENT", "MENTOR"] },
};

export function isProgramAction(v: unknown): v is ProgramAction {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PROGRAM_TRANSITIONS, v);
}

export function canTransition(action: ProgramAction, from: MentorProgramStatus, actor: ProgramActor): MentorProgramStatus | null {
  const r = PROGRAM_TRANSITIONS[action];
  if (!r.actor.includes(actor) || !r.from.includes(from)) return null;
  return r.to;
}

/** فقط پیش‌نویس قابل ویرایشه (محتوا/آیتم‌ها) */
export function isEditable(status: MentorProgramStatus): boolean {
  return status === "DRAFT";
}

/** شاگرد فقط برنامه‌هایی رو می‌بینه که حداقل یک بار براش ارسال شده */
export function visibleToStudent(p: { status: MentorProgramStatus; sentAt: Date | null }): boolean {
  return p.status !== "DRAFT" || p.sentAt !== null;
}

export const PROGRAM_STATUS_LABELS: Record<MentorProgramStatus, string> = {
  DRAFT: "پیش‌نویس",
  PENDING: "در انتظار تایید",
  ACCEPTED: "پذیرفته‌شده",
  REJECTED: "ردشده",
  ACTIVE: "فعال",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغوشده",
};
