import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { hasPermission } from "@/lib/adminPermissions";
import { checkRateLimit } from "@/lib/rateLimit";
import { tr } from "@/lib/i18n";

// جست‌وجوی سراسری پنل (Ctrl K). هر نوع نتیجه فقط وقتی برمی‌گرده که ادمین
// دسترسی همون بخش رو داره. حداقل 2 حرف، حداکثر 5 نتیجه برای هر نوع، و هیچ
// فیلد حساسی (هش، توکن، متن پیام) برنمی‌گرده.
export const dynamic = "force-dynamic";

const MAX = 5;

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const ok = await checkRateLimit(`admin-search:${guard.userId}`, 60, 60_000);
  if (!ok) return NextResponse.json({ error: tr("تعداد درخواست زیاده، کمی صبر کن", "Too many requests, please wait a moment") }, { status: 429 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 64);
  if (q.length < 2) return NextResponse.json({ users: [], transactions: [], codes: [], tickets: [] });
  const contains = { contains: q, mode: "insensitive" as const };
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(guard, p);

  const [users, transactions, codes, tickets] = await Promise.all([
    can("users.view")
      ? prisma.user.findMany({
          where: { OR: [{ name: contains }, { username: contains }, { phone: contains }, { email: contains }] },
          orderBy: { createdAt: "desc" }, take: MAX,
          select: { id: true, name: true, username: true, phone: true, email: true },
        })
      : [],
    can("finance")
      ? prisma.payment.findMany({
          where: { OR: [{ id: contains }, { providerRef: contains }] },
          orderBy: { createdAt: "desc" }, take: MAX,
          select: { id: true, providerRef: true, amount: true, paidAt: true, refundedAt: true },
        })
      : [],
    can("discounts")
      ? prisma.discountCode.findMany({ where: { code: contains }, orderBy: { createdAt: "desc" }, take: MAX, select: { id: true, code: true, percentOff: true, active: true } })
      : [],
    can("support")
      ? prisma.supportTicket.findMany({ where: { subject: contains }, orderBy: { updatedAt: "desc" }, take: MAX, select: { id: true, subject: true, status: true } })
      : [],
  ]);

  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, title: u.name?.trim() || u.username || tr("بدون نام", "No name"), sub: [u.username && `@${u.username}`, u.phone, u.email].filter(Boolean).join(" · "), href: `/admin/users/${u.id}` })),
    transactions: transactions.map((t) => ({
      id: t.id, title: t.providerRef || t.id.slice(-8), sub: `${t.amount.toLocaleString("en-US")} · ${t.refundedAt ? tr("بازپرداخت", "Refunded") : t.paidAt ? tr("پرداخت‌شده", "Paid") : tr("در انتظار", "Pending")}`,
      href: `/admin/transactions?q=${encodeURIComponent(t.providerRef || t.id)}`,
    })),
    codes: codes.map((c) => ({ id: c.id, title: c.code, sub: `${c.percentOff}% · ${c.active ? tr("فعال", "Active") : tr("غیرفعال", "Inactive")}`, href: `/admin/discount-codes?q=${encodeURIComponent(c.code)}` })),
    tickets: tickets.map((t) => ({ id: t.id, title: t.subject, sub: t.status === "OPEN" ? tr("باز", "Open") : t.status === "ANSWERED" ? tr("پاسخ داده‌شده", "Answered") : tr("بسته", "Closed"), href: `/admin/support/${t.id}` })),
  });
}
