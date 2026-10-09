// صف انتظار منتور پر — منطق خالص (بدون Prisma) تا سرور، کلاینت و تست یک
// تعریف داشته باشند. سمت سرور: lib/mentorWaitlistServer.ts.
//
// چرخه: WAITING → (صندلی خالی شد) OFFERED با مهلت WAITLIST_OFFER_HOURS →
//   درخواست عادی فرستاد → ACCEPTED (رابطه‌ی PENDING) · مهلت گذشت → EXPIRED ·
//   خودش یا منتور بیرون برد → CANCELLED.
// «صندلی رزرو»: نوبت زنده (OFFERED و منقضی‌نشده) + درخواست PENDINGی که از
// صف آمده. این‌ها در ظرفیت حساب می‌شوند تا درخواست تازه از صف جلو نزند.
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import type { AvailabilityState } from "@/lib/mentorAvailability";

export const WAITLIST_OFFER_HOURS = 48;
export const WAITLIST_OFFER_MS = WAITLIST_OFFER_HOURS * 60 * 60 * 1000;
/** سقف اندازه‌ی صف هر منتور — صف بی‌انتها برای هیچ‌کس معنا ندارد */
export const WAITLIST_MAX = 200;
/** بیشترین نوبتی که یک بار پیش‌بردن می‌دهد (مثلا وقتی سقف ظرفیت برداشته شد) */
export const WAITLIST_OFFER_BATCH = 20;

export type WaitlistStatus = "WAITING" | "OFFERED" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

/** فقط وقتی ظرفیت پر است می‌شود وارد صف شد؛ بسته/غایب یعنی صفی هم نیست */
export function canJoinWaitlist(state: AvailabilityState): boolean {
  return state === "FULL";
}

export function offerDeadline(now: Date): Date {
  return new Date(now.getTime() + WAITLIST_OFFER_MS);
}

export function isOfferLive(e: { status: string; offerExpiresAt: Date | string | null }, now: Date): boolean {
  if (e.status !== "OFFERED" || !e.offerExpiresAt) return false;
  return new Date(e.offerExpiresAt).getTime() > now.getTime();
}

/** صندلی‌های خالی قابل پیشنهاد؛ بدون سقف = بی‌نهایت */
export function freeSeats(maxActive: number | null, active: number, reserved: number): number {
  if (maxActive == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, maxActive - active - reserved);
}

export type AdvanceInput = {
  acceptingStudents: boolean;
  /** منتور الان در کشف است (منتشر، غیرمعلق، هویت تاییدشده، حساب سالم) */
  discoverable: boolean;
  /** عدم حضور با توقف درخواست‌ها */
  awayPaused: boolean;
  maxActiveStudents: number | null;
  active: number;
  reserved: number;
  /** idهای WAITING به ترتیب صف (FIFO) */
  waiting: string[];
};

/**
 * به چه کسانی الان نوبت بدهیم؟ فقط وقتی منتور واقعا پذیرا است (پذیرش روشن،
 * در کشف، بدون توقف عدم حضور) و صندلی آزاد هست؛ به ترتیب صف.
 */
export function planOffers(p: AdvanceInput): string[] {
  if (!p.acceptingStudents || !p.discoverable || p.awayPaused) return [];
  const seats = freeSeats(p.maxActiveStudents, p.active, p.reserved);
  const n = Math.min(seats, WAITLIST_OFFER_BATCH, p.waiting.length);
  return n > 0 ? p.waiting.slice(0, n) : [];
}

/** جایگاه ۱-مبنا در صف (فقط WAITINGها، مرتب بر اساس joinedAt و بعد id) */
export function queuePosition(
  entries: { id: string; joinedAt: Date | string }[],
  entryId: string
): number | null {
  const sorted = entries
    .slice()
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const i = sorted.findIndex((e) => e.id === entryId);
  return i === -1 ? null : i + 1;
}

/** «نفر N در صف» */
export function positionLabel(position: number): string {
  return tr(`نفر ${faNum(position)} در صف`, `#${faNum(position)} in line`);
}

/** مهلت باقی‌مانده‌ی نوبت، کوتاه و خودمانی؛ `them` برای دید مربی («… وقت داره») */
export function offerRemainingLabel(expiresAt: Date | string, now: Date = new Date(), them = false): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return them ? tr("مهلتش تموم شد", "Their time is up") : tr("مهلتت تموم شد", "Your time is up");
  const tail = them ? tr("وقت داره", "left") : tr("وقت داری", "left");
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return tr(`${faNum(hours)} ساعت ${tail}`, `${faNum(hours)} ${hours === 1 ? "hour" : "hours"} ${tail}`);
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return tr(`${faNum(minutes)} دقیقه ${tail}`, `${faNum(minutes)} ${minutes === 1 ? "minute" : "minutes"} ${tail}`);
}
