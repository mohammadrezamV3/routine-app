import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { publishToUsers } from "@/lib/realtime";
import { computeAvailability } from "@/lib/mentorAvailability";
import { AVAILABILITY_SELECT, availabilityToday } from "@/lib/mentorManageServer";
import { PUBLIC_USER_SELECT } from "@/lib/mentorServer";
import type { MentorWaitlistRow, MyWaitlist } from "@/lib/mentorTypes";
import { WAITLIST_OFFER_BATCH, WAITLIST_OFFER_HOURS, offerDeadline, planOffers } from "@/lib/mentorWaitlist";
import { faNum } from "@/lib/jalali";

// سمتِ سرورِ صفِ انتظارِ منتورِ پُر (منطقِ خالص: lib/mentorWaitlist.ts).
//
// پیش‌بردنِ صف (advanceWaitlist) idempotent است و به هیچ کرانِ بیرونی نیاز ندارد:
// بعد از هر اتفاقی که صندلی آزاد می‌کند (پایان/رد/لغو/مسدودی، تغییرِ ظرفیت در
// تنظیمات) و روی مسیرهای خواندن (پروفایلِ منتور، صفِ من، صفِ منتور، درخواستِ
// جدید) صدا زده می‌شود؛ زمان‌بندِ داخلی (lib/pushScheduler.ts) هم هر چند دقیقه
// نوبت‌های منقضی را جلو می‌برد. ضدِ مسابقه: پیشنهاد دادن زیرِ قفلِ ردیفیِ
// MentorProfile (update روی waitlistSeq) و هر تغییرِ وضعیت با updateMany روی
// وضعیتِ قبلی (قفلِ خوش‌بینانه) — دو فراخوانیِ هم‌زمان یک صندلی را دو بار نمی‌دهند
// و یک اعلان دو بار نمی‌رود.
//
// متنِ آزادی (پیام/جوابِ پذیرش) این‌جا نیست: پذیرشِ نوبت همان درخواستِ عادیِ
// POST /api/mentorships است و جواب‌ها همان‌جا (رمزشده در حالِ سکون) ذخیره می‌شوند.

type Db = Prisma.TransactionClient | typeof prisma;

const OPEN_STATUSES = ["WAITING", "OFFERED"] as const;

/** نوبتِ زنده یا درخواستِ PENDINGِ آمده از صف — صندلیِ نگه‌داشته برای همان نفر */
function reservedWhere(mentorId: string | { in: string[] }, now: Date, excludeMentorshipId?: string): Prisma.MentorWaitlistEntryWhereInput {
  return {
    mentorId,
    OR: [
      { status: "OFFERED", offerExpiresAt: { gt: now } },
      {
        status: "ACCEPTED",
        mentorship: { is: { status: "PENDING", ...(excludeMentorshipId ? { id: { not: excludeMentorshipId } } : {}) } },
      },
    ],
  };
}

export async function countReservedSeats(mentorId: string, now: Date = new Date(), excludeMentorshipId?: string, db: Db = prisma): Promise<number> {
  return db.mentorWaitlistEntry.count({ where: reservedWhere(mentorId, now, excludeMentorshipId) });
}

/** صندلی‌های رزرو برای چند منتور با یک کوئریِ گروهی (کارت‌های کشف) */
export async function loadReservedSeats(mentorIds: string[], now: Date = new Date()): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (mentorIds.length === 0) return out;
  const rows = await prisma.mentorWaitlistEntry.groupBy({
    by: ["mentorId"],
    where: reservedWhere({ in: mentorIds }, now),
    _count: { _all: true },
  });
  for (const r of rows) out.set(r.mentorId, r._count._all);
  return out;
}

/** شاگردِ فعال + صندلیِ رزرو — همان عددی که «پر بودن» با آن سنجیده می‌شود */
export async function countOccupiedSeats(mentorId: string, now: Date = new Date()): Promise<number> {
  const [active, reserved] = await Promise.all([
    prisma.mentorship.count({ where: { mentorId, status: "ACTIVE" } }),
    countReservedSeats(mentorId, now),
  ]);
  return active + reserved;
}

/** نوبتِ زنده‌ی این کاربر پیشِ این منتور (برای POST /api/mentorships) */
export async function findLiveOffer(mentorId: string, userId: string, now: Date = new Date()): Promise<{ id: string } | null> {
  return prisma.mentorWaitlistEntry.findFirst({
    where: { mentorId, userId, status: "OFFERED", offerExpiresAt: { gt: now } },
    select: { id: true },
  });
}

export class WaitlistOfferGoneError extends Error {
  constructor() {
    super("waitlist offer gone");
  }
}

/**
 * نوبت → ACCEPTED و گره به رابطه‌ی PENDINGِ تازه، هم‌تراکنش با ساختِ درخواست.
 * اگر هم‌زمان منقضی/لغو شده باشد خطا می‌دهد تا کلِ تراکنش برگردد.
 */
export async function claimOffer(tx: Prisma.TransactionClient, offerId: string, mentorshipId: string, now: Date): Promise<void> {
  const r = await tx.mentorWaitlistEntry.updateMany({
    where: { id: offerId, status: "OFFERED", offerExpiresAt: { gt: now } },
    data: { status: "ACCEPTED", acceptedAt: now, mentorshipId },
  });
  if (r.count === 0) throw new WaitlistOfferGoneError();
}

/** کاربری که (بدونِ نوبت) مستقیم درخواست داد دیگر لازم نیست در صف بماند */
export async function closeWaitingEntry(mentorId: string, userId: string, now: Date = new Date()): Promise<void> {
  await prisma.mentorWaitlistEntry.updateMany({
    where: { mentorId, userId, status: "WAITING" },
    data: { status: "CANCELLED", closedBy: "SYSTEM", closedAt: now },
  });
}

async function mentorName(mentorId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: mentorId }, select: PUBLIC_USER_SELECT });
  return displayName(u);
}

/**
 * صف را جلو می‌برد: نوبت‌های منقضی → EXPIRED، پیوندِ درخواست‌های بسته‌شده آزاد،
 * و به‌ازای هر صندلیِ آزاد نفرِ بعدیِ WAITING → OFFERED (با اعلان و پوش).
 * خطا را نمی‌پراکند — شکستِ صف نباید اقدامِ اصلی را خراب کند.
 */
export async function advanceWaitlist(mentorId: string, now: Date = new Date()): Promise<void> {
  try {
    await advanceWaitlistUnsafe(mentorId, now);
  } catch (err: any) {
    console.error(`[mentor-waitlist] advance failed: ${err?.message || err}`);
  }
}

async function advanceWaitlistUnsafe(mentorId: string, now: Date): Promise<void> {
  // مسیرِ داغ: بیشترِ منتورها صفی ندارند — یک count ارزان و تمام
  const pending = await prisma.mentorWaitlistEntry.count({
    where: { mentorId, OR: [{ status: { in: [...OPEN_STATUSES] } }, { status: "ACCEPTED", mentorshipId: { not: null } }] },
  });
  if (pending === 0) return;

  // ۱) نوبت‌های منقضی — هر کدام با قفلِ وضعیتِ خودش تا اعلانِ انقضا یک‌بار برود
  const stale = await prisma.mentorWaitlistEntry.findMany({
    where: { mentorId, status: "OFFERED", offerExpiresAt: { lte: now } },
    select: { id: true, userId: true },
  });
  const expired: string[] = [];
  for (const s of stale) {
    const r = await prisma.mentorWaitlistEntry.updateMany({
      where: { id: s.id, status: "OFFERED", offerExpiresAt: { lte: now } },
      data: { status: "EXPIRED", closedBy: "SYSTEM", closedAt: now },
    });
    if (r.count > 0) expired.push(s.userId);
  }

  // ۲) درخواستِ آمده از صف که دیگر PENDING نیست (قبول/رد/لغو) صندلی نگه نمی‌دارد؛
  //    پیوند آزاد می‌شود تا درخواستِ بعدیِ همان جفت بی‌صدا «رزرو» حساب نشود
  await prisma.mentorWaitlistEntry.updateMany({
    where: { mentorId, status: "ACCEPTED", mentorshipId: { not: null }, mentorship: { is: { status: { not: "PENDING" } } } },
    data: { mentorshipId: null },
  });

  // ۳) پیشنهادِ صندلی‌های آزاد زیرِ قفلِ ردیفیِ پروفایل
  const offered = await prisma.$transaction(async (tx) => {
    const locked = await tx.mentorProfile.updateMany({ where: { userId: mentorId }, data: { waitlistSeq: { increment: 1 } } });
    if (locked.count === 0) return [] as string[];
    const p = await tx.mentorProfile.findUnique({
      where: { userId: mentorId },
      select: { ...AVAILABILITY_SELECT, published: true, suspendedAt: true, identityStatus: true, user: { select: { isBlocked: true, deletedAt: true } } },
    });
    if (!p) return [] as string[];

    const waitingRows = await tx.mentorWaitlistEntry.findMany({
      where: { mentorId, status: "WAITING" },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      take: WAITLIST_OFFER_BATCH * 2,
      select: { id: true, userId: true, user: { select: { isBlocked: true, deletedAt: true } } },
    });
    if (waitingRows.length === 0) return [] as string[];

    // کسی که دیگر نمی‌تواند شاگرد شود (حسابِ مسدود/حذف، رابطه‌ی فعال/در انتظار/مسدود،
    // بلاکِ دوطرفه) نوبتِ بقیه را نگه ندارد
    const ids = waitingRows.map((w) => w.userId);
    const [rels, blocks] = await Promise.all([
      tx.mentorship.findMany({
        where: { mentorId, studentId: { in: ids }, status: { in: ["ACTIVE", "PENDING", "BLOCKED"] } },
        select: { studentId: true },
      }),
      tx.userBlock.findMany({
        where: { OR: [{ blockerId: mentorId, blockedId: { in: ids } }, { blockedId: mentorId, blockerId: { in: ids } }] },
        select: { blockerId: true, blockedId: true },
      }),
    ]);
    const ineligible = new Set<string>([
      ...rels.map((r) => r.studentId),
      ...blocks.map((b) => (b.blockerId === mentorId ? b.blockedId : b.blockerId)),
      ...waitingRows.filter((w) => w.user.isBlocked || w.user.deletedAt).map((w) => w.userId),
    ]);
    const drop = waitingRows.filter((w) => ineligible.has(w.userId)).map((w) => w.id);
    if (drop.length) {
      await tx.mentorWaitlistEntry.updateMany({
        where: { id: { in: drop }, status: "WAITING" },
        data: { status: "CANCELLED", closedBy: "SYSTEM", closedAt: now },
      });
    }
    const eligible = waitingRows.filter((w) => !ineligible.has(w.userId));

    const active = await tx.mentorship.count({ where: { mentorId, status: "ACTIVE" } });
    const reserved = await countReservedSeats(mentorId, now, undefined, tx);
    const a = computeAvailability(p, active + reserved, availabilityToday());
    const chosen = planOffers({
      acceptingStudents: p.acceptingStudents,
      discoverable: p.published && !p.suspendedAt && p.identityStatus === "VERIFIED" && !p.user.isBlocked && !p.user.deletedAt,
      awayPaused: a.away && p.awayPausesRequests,
      maxActiveStudents: p.maxActiveStudents,
      active,
      reserved,
      waiting: eligible.map((w) => w.id),
    });

    const out: string[] = [];
    const deadline = offerDeadline(now);
    for (const id of chosen) {
      const r = await tx.mentorWaitlistEntry.updateMany({
        where: { id, status: "WAITING" },
        data: { status: "OFFERED", offeredAt: now, offerExpiresAt: deadline },
      });
      if (r.count > 0) out.push(eligible.find((w) => w.id === id)!.userId);
    }
    return out;
  });

  if (offered.length === 0 && expired.length === 0) return;
  const name = await mentorName(mentorId);
  const url = `/mentors/${mentorId}`;
  for (const userId of offered) {
    await notifyUser(userId, {
      type: "mentor.waitlist.offer",
      title: "نوبتت رسید!",
      body: `یه جا پیش ${name} خالی شد. تا ${faNum(WAITLIST_OFFER_HOURS)} ساعت وقت داری درخواستت رو بفرستی.`,
      url,
    });
  }
  for (const userId of expired) {
    await notifyUser(userId, {
      type: "mentor.waitlist.expired",
      title: "مهلت نوبتت تموم شد",
      body: `نوبتت پیش ${name} به نفر بعدی رسید. هر وقت خواستی دوباره بیا توی صف.`,
      url,
    });
  }
  void publishToUsers([mentorId, ...offered, ...expired], { type: "mentor.mentorship", data: { mentorId } });
}

/** همه‌ی صف‌های باز را جلو می‌برد — از زمان‌بندِ داخلی؛ چند worker هم‌زمان امن است */
export async function sweepWaitlists(now: Date = new Date()): Promise<void> {
  const rows = await prisma.mentorWaitlistEntry.findMany({
    where: { status: { in: [...OPEN_STATUSES] } },
    distinct: ["mentorId"],
    select: { mentorId: true },
    take: 500,
  });
  for (const r of rows) await advanceWaitlist(r.mentorId, now);
}

// ───────────────────────── خواندن ─────────────────────────

export type { MyWaitlist } from "@/lib/mentorTypes";

async function positionOf(mentorId: string, e: { id: string; joinedAt: Date }): Promise<number> {
  const ahead = await prisma.mentorWaitlistEntry.count({
    where: { mentorId, status: "WAITING", OR: [{ joinedAt: { lt: e.joinedAt } }, { joinedAt: e.joinedAt, id: { lt: e.id } }] },
  });
  return ahead + 1;
}

/** وضعیتِ من در صفِ این منتور؛ ACCEPTED/CANCELLED یعنی «در صف نیستی» (null) */
export async function loadMyWaitlist(mentorId: string, userId: string, now: Date = new Date()): Promise<MyWaitlist | null> {
  const e = await prisma.mentorWaitlistEntry.findUnique({
    where: { mentorId_userId: { mentorId, userId } },
    select: { id: true, status: true, joinedAt: true, offerExpiresAt: true },
  });
  const waiting = await prisma.mentorWaitlistEntry.count({ where: { mentorId, status: "WAITING" } });
  if (!e) return null;
  if (e.status === "WAITING") {
    return { status: "WAITING", position: await positionOf(mentorId, e), waiting, offerExpiresAt: null };
  }
  if (e.status === "OFFERED" && e.offerExpiresAt && e.offerExpiresAt > now) {
    return { status: "OFFERED", position: null, waiting, offerExpiresAt: e.offerExpiresAt.toISOString() };
  }
  if (e.status === "EXPIRED" || e.status === "OFFERED") {
    return { status: "EXPIRED", position: null, waiting, offerExpiresAt: null };
  }
  return null;
}

export async function countWaiting(mentorId: string): Promise<number> {
  return prisma.mentorWaitlistEntry.count({ where: { mentorId, status: "WAITING" } });
}


/** صفِ منتور به ترتیبِ ورود (FIFO)؛ نوبت‌دارها اول — بدونِ هیچ متنِ آزادی */
export async function loadMentorWaitlist(mentorId: string, now: Date = new Date()): Promise<MentorWaitlistRow[]> {
  const rows = await prisma.mentorWaitlistEntry.findMany({
    where: {
      mentorId,
      OR: [{ status: "WAITING" }, { status: "OFFERED", offerExpiresAt: { gt: now } }],
      user: { isBlocked: false, deletedAt: null },
    },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    take: 500,
    select: { id: true, status: true, joinedAt: true, offerExpiresAt: true, user: { select: PUBLIC_USER_SELECT } },
  });
  let pos = 0;
  const mapped = rows.map((r) => ({
    id: r.id,
    user: r.user,
    status: r.status as "WAITING" | "OFFERED",
    position: r.status === "WAITING" ? ++pos : null,
    joinedAt: r.joinedAt.toISOString(),
    offerExpiresAt: r.status === "OFFERED" && r.offerExpiresAt ? r.offerExpiresAt.toISOString() : null,
  }));
  return [...mapped.filter((r) => r.status === "OFFERED"), ...mapped.filter((r) => r.status === "WAITING")];
}
