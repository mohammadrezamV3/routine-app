import { tr } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { activeDayStreak, countActiveLastDays } from "@/lib/adminUsersView";

// داده‌ی تکمیلی پرونده‌ی کاربر (برچسب، یادداشت، متریک‌ها، خط زمانی) — فقط خوندن.
// استریک/امتیاز هفته «روز فعال» حساب می‌شن (روزی که حداقل یک تیک روتین داشته)
// نه استریک رسمی کاربر که به برنامه‌ی خود کاربر وابسته‌ست (lib/routineStreak.ts).

export type TimelineEvent = { kind: "signup" | "login" | "payment" | "subscription" | "ticket" | "refund"; title: string; at: string; meta?: string };

function providerLabel(provider: string): string {
  const map: Record<string, string> = { credentials: tr("رمز عبور", "Password"), google: tr("گوگل", "Google") };
  return map[provider] || provider;
}

export async function getUserProfileExtras(userId: string, createdAt: Date) {
  const since = new Date(Date.now() - 120 * 86400000);
  const [tags, notes, entries, pays, logins, tickets, subs] = await Promise.all([
    prisma.userTag.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { tag: true } }),
    prisma.adminUserNote.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true, lastName: true, username: true } } },
    }),
    prisma.dailyEntry.findMany({ where: { userId, date: { gte: since } }, select: { date: true, completedItems: true } }),
    prisma.payment.findMany({
      where: { subscription: { userId } }, orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, amount: true, currency: true, provider: true, paidAt: true, refundedAt: true, createdAt: true, subscription: { select: { plan: { select: { nameFa: true } } } } },
    }),
    prisma.loginEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8, select: { provider: true, createdAt: true } }),
    prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8, select: { subject: true, createdAt: true } }),
    prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8, select: { createdAt: true, plan: { select: { nameFa: true } } } }),
  ]);

  const activeDays = entries
    .filter((e) => e.completedItems && typeof e.completedItems === "object" && Object.values(e.completedItems as Record<string, unknown>).some((v) => v === true))
    .map((e) => e.date.toISOString().slice(0, 10));
  const todayIso = new Date().toISOString().slice(0, 10);

  const okPays = pays.filter((p) => p.paidAt && !p.refundedAt);
  const ltvBy = new Map<string, number>();
  okPays.forEach((p) => ltvBy.set(p.currency, (ltvBy.get(p.currency) || 0) + p.amount));

  const events: TimelineEvent[] = [{ kind: "signup", title: tr("ثبت‌نام", "Signed up"), at: createdAt.toISOString() }];
  logins.forEach((l) => events.push({ kind: "login", title: tr(`ورود (${providerLabel(l.provider)})`, `Signed in (${providerLabel(l.provider)})`), at: l.createdAt.toISOString() }));
  pays.forEach((p) => {
    if (p.paidAt) events.push({ kind: "payment", title: tr(`پرداخت پلن ${p.subscription.plan.nameFa}`, `Paid for ${p.subscription.plan.nameFa} plan`), at: p.paidAt.toISOString() });
    if (p.refundedAt) events.push({ kind: "refund", title: tr("بازگشت وجه", "Refunded"), at: p.refundedAt.toISOString() });
  });
  subs.forEach((s) => events.push({ kind: "subscription", title: tr(`شروع اشتراک ${s.plan.nameFa}`, `${s.plan.nameFa} subscription started`), at: s.createdAt.toISOString() }));
  tickets.forEach((t) => events.push({ kind: "ticket", title: tr(`تیکت پشتیبانی: ${t.subject.slice(0, 60)}`, `Support ticket: ${t.subject.slice(0, 60)}`), at: t.createdAt.toISOString() }));
  events.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    tags: tags.map((t) => t.tag),
    notes: notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt, authorId: n.authorId, authorName: [n.author.name, n.author.lastName].filter(Boolean).join(" ") || n.author.username || tr("ادمین", "Admin") })),
    metrics: {
      activeStreak: activeDayStreak(activeDays, todayIso),
      activeDaysWeek: countActiveLastDays(activeDays, todayIso, 7),
      paymentsCount: okPays.length,
      ltv: Array.from(ltvBy.entries()).map(([currency, amount]) => ({ currency, amount })),
    },
    payments: pays.map((p) => ({ id: p.id, amount: p.amount, currency: p.currency, provider: p.provider, plan: p.subscription.plan.nameFa, paidAt: p.paidAt, refundedAt: p.refundedAt, createdAt: p.createdAt })),
    events: events.slice(0, 30),
  };
}
