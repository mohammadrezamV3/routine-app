import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ModuleKey, SubscriptionStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminFlags } from "@/lib/adminFlag";
import { checkRateLimit } from "@/lib/rateLimit";
import { featureBlocked, resolveFeaturesFor } from "@/lib/featureFlagsServer";
import {
  activeModuleSet, buildAnnouncements, buildCalendar, buildCalorie, buildExercise, buildMentors,
  buildNotifications, buildRoadmaps, buildTrade, resolveDay, safe,
} from "@/lib/dashboardServer";
import type { DashboardData } from "@/lib/dashboardTypes";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard?date=YYYY-MM-DD&tz=<دقیقه شرقِ UTC>
 *
 * همه‌ی خلاصه‌های داشبورد در یک درخواست (یک چکِ سشن + کوئری‌های موازی) —
 * همون منطقِ /api/bootstrap: تعدادِ درخواست گلوگاهه، نه دیتابیس.
 * پشتِ فلگِ `dashboard` (فعلا فقط ادمین‌ها). هر بخشِ پولی جدا با دسترسیِ
 * واقعیِ دیتابیسی گیت می‌شه و بدونِ دسترسی null برمی‌گرده (lib/dashboardServer.ts).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const blocked = await featureBlocked("dashboard", userId);
  if (blocked) return blocked;

  const [user, flags, features] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        isBlocked: true, name: true, lastName: true, username: true, avatarUrl: true, createdAt: true,
        moduleAccess: { select: { module: true, active: true, expiresAt: true } },
        subscriptions: {
          where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }, currentPeriodEnd: { gt: new Date() } },
          orderBy: { currentPeriodEnd: "desc" },
          take: 1,
          select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, key: true } } },
        },
      },
    }),
    getAdminFlags(userId),
    resolveFeaturesFor(userId),
  ]);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (user.isBlocked) return NextResponse.json({ error: "حساب کاربری مسدود شده است" }, { status: 403 });

  const isSuperAdmin = !!flags?.isSuperAdmin;
  if (!isSuperAdmin && !(await checkRateLimit(`dashboard:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const { date, tz } = resolveDay(req.nextUrl.searchParams.get("date"), req.nextUrl.searchParams.get("tz"));
  const ctx = { userId, date, tz };
  const mods = activeModuleSet(isSuperAdmin, user.moduleAccess);
  const has = (m: ModuleKey) => mods.has(m);
  const errors: string[] = [];
  const none = Promise.resolve(null);

  const [exercise, calorie, trade, calendar, roadmaps, mentors, notifications, announcements] = await Promise.all([
    has(ModuleKey.EXERCISE) ? safe("exercise", errors, () => buildExercise(ctx)) : none,
    has(ModuleKey.CALORIE) ? safe("calorie", errors, () => buildCalorie(ctx)) : none,
    has(ModuleKey.TRADE) ? safe("trade", errors, () => buildTrade(ctx)) : none,
    has(ModuleKey.TRADE) ? safe("calendar", errors, () => buildCalendar()) : none,
    has(ModuleKey.ROADMAP) && features.roadmaps ? safe("roadmaps", errors, () => buildRoadmaps(ctx)) : none,
    features.mentors ? safe("mentors", errors, () => buildMentors(ctx)) : none,
    safe("notifications", errors, () => buildNotifications(ctx)),
    safe("announcements", errors, () => buildAnnouncements(ctx)),
  ]);

  const sub = user.subscriptions[0];
  const data: DashboardData = {
    generatedAt: new Date().toISOString(),
    user: {
      name: [user.name, user.lastName].filter(Boolean).join(" ") || user.username || "کاربر",
      avatarUrl: user.avatarUrl ?? null,
      isAdmin: !!flags?.isAdmin || isSuperAdmin,
      isSuperAdmin,
      memberSince: user.createdAt.toISOString(),
    },
    plan: sub ? { name: sub.plan.nameFa, key: sub.plan.key, status: sub.status as "ACTIVE" | "TRIAL", endsAt: sub.currentPeriodEnd.toISOString() } : null,
    modules: Array.from(mods),
    features,
    exercise,
    calorie,
    trade,
    calendar,
    roadmaps,
    mentors,
    notifications: notifications ?? { unread: 0, latest: [] },
    announcements: announcements ?? [],
    errors,
  };
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
