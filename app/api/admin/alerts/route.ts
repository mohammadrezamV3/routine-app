import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { hasPermission } from "@/lib/adminPermissions";
import { tr } from "@/lib/i18n";

// شمارنده‌های «نیاز به اقدام» برای زنگوله و نشان‌های سایدبار. هر شمارنده فقط
// وقتی برمی‌گرده که ادمین دسترسی همون بخش رو داره. فقط عدد و زمان — هیچ متن
// کاربری یا اطلاعات حساس برنمی‌گرده.
export const dynamic = "force-dynamic";

const HOUR = 3600_000;
const SLA_HOURS = 48;

export type AdminAlertItem = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: "warn" | "danger" | "info";
  oldestAt?: string | null;
  overdue?: number;
};

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(guard, p);
  const now = Date.now();
  const day = new Date(now - 24 * HOUR);
  const slaCut = new Date(now - SLA_HOURS * HOUR);
  const items: AdminAlertItem[] = [];

  const tasks: Promise<void>[] = [];

  if (can("mentors")) {
    tasks.push((async () => {
      const where = { OR: [{ identityStatus: "PENDING" as const }, { credentials: { some: { status: "PENDING" as const } } }] };
      const [count, oldest] = await Promise.all([
        prisma.mentorProfile.count({ where }),
        prisma.mentorProfile.findFirst({ where, orderBy: { updatedAt: "asc" }, select: { updatedAt: true } }),
      ]);
      items.push({ key: "mentors", label: tr("احراز هویت مربی", "Mentor verification"), count, href: "/admin/mentors?tab=pending", tone: "info", oldestAt: oldest?.updatedAt.toISOString() ?? null });
    })());
  }
  if (can("support")) {
    tasks.push((async () => {
      const [count, overdue, oldest] = await Promise.all([
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
        prisma.supportTicket.count({ where: { status: "OPEN", updatedAt: { lt: slaCut } } }),
        prisma.supportTicket.findFirst({ where: { status: "OPEN" }, orderBy: { updatedAt: "asc" }, select: { updatedAt: true } }),
      ]);
      items.push({ key: "tickets", label: tr("تیکت‌های باز", "Open tickets"), count, href: "/admin/support", tone: overdue > 0 ? "danger" : "warn", oldestAt: oldest?.updatedAt.toISOString() ?? null, overdue });
    })());
  }
  if (can("chat")) {
    tasks.push((async () => {
      const [count, oldest] = await Promise.all([
        prisma.tradeChatReport.count({ where: { status: "OPEN" } }),
        prisma.tradeChatReport.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      ]);
      items.push({ key: "chat", label: tr("گزارش‌های چت بررسی‌نشده", "Unreviewed chat reports"), count, href: "/admin/chat-reports", tone: "danger", oldestAt: oldest?.createdAt.toISOString() ?? null });
    })());
  }
  // پرداخت فقط بعد از تایید ساخته می‌شه؛ شکست پرداخت از ErrorLog سرویس payment میاد
  if (can("finance")) {
    tasks.push((async () => {
      const count = await prisma.errorLog.count({ where: { service: "payment", createdAt: { gte: day } } });
      items.push({ key: "payments", label: tr("پرداخت ناموفق (24 ساعت)", "Failed payments (24 hours)"), count, href: "/admin/transactions", tone: "danger" });
    })());
  }
  if (can("system")) {
    tasks.push((async () => {
      const count = await prisma.errorLog.count({ where: { service: { not: "payment" }, severity: { in: ["ERROR", "CRITICAL"] }, createdAt: { gte: day } } });
      items.push({ key: "errors", label: tr("خطاهای سرور (24 ساعت)", "Server errors (24 hours)"), count, href: "/admin/system/errors", tone: "danger" });
    })());
  }

  await Promise.all(tasks);
  const order = ["mentors", "tickets", "chat", "payments", "errors"];
  items.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const total = items.reduce((s, i) => s + i.count, 0);
  return NextResponse.json({ items, total }, { headers: { "Cache-Control": "no-store" } });
}
