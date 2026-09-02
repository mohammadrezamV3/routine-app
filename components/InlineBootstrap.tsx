import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { ModuleKey } from "@prisma/client";
import { BOOTSTRAP_SETTING_KEYS } from "@/lib/userSettingKeys";
import { AUTH_HINT_COOKIE, INLINE_BOOTSTRAP_ID } from "@/lib/preload";
import { routineStatsForUsers } from "@/lib/friendStats";

/**
 * داده لود اولیه را **داخل خود HTML** می‌فرستد، نه با یک درخواست جدا.
 *
 * چرا: حتی بعد از این‌که همه درخواست‌ها به یک `/api/bootstrap` جمع شدن، و
 * حتی وقتی تأخیر شبکه **صفر** بود، اولین بایت داده ۱۳۲ms بعد می‌رسید —
 * چون مرورگر باید اول HTML را پارس کند، بعد اسکریپت inline را اجرا کند،
 * بعد یک رفت‌وبرگشت کامل دیگر برای داده بزند. آن رفت‌وبرگشت ذاتی نیست:
 * سرور همان لحظه‌ای که HTML را می‌سازد، دسترسی کامل به همان داده دارد.
 *
 * با inline کردن، داده صفحه دقیقا هم‌زمان با HTML می‌رسد — صفر رفت‌وبرگشت
 * اضافه، در هر تأخیر شبکه‌ای.
 *
 * برای مهمان‌ها هیچ کوئری‌ای نمی‌زند و هیچ چیزی رندر نمی‌کند.
 */
export async function InlineBootstrap() {
  const jar = cookies();
  // کوکی راهنما ارزان‌ترین در است: مهمان‌ها اصلا به رمزگشایی JWT هم نمی‌رسند.
  if (jar.get(AUTH_HINT_COOKIE)?.value !== "1") return null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  // getToken همان توکنی را می‌خواند که NextAuth ساخته و **امضا/رمزش را
  // تأیید می‌کند** — این‌جا هم مثل هر روت دیگر، کوکی راهنما هیچ تصمیم
  // امنیتی‌ای نمی‌گیرد؛ فقط جلوی کار بی‌مورد برای مهمان را می‌گیرد.
  let userId: string | undefined;
  try {
    const token = await getToken({
      req: { cookies: Object.fromEntries(jar.getAll().map((c) => [c.name, c.value])) } as any,
      secret,
    });
    userId = (token as any)?.userId;
  } catch {
    return null;
  }
  if (!userId) return null;

  // همان بازه‌ای که lib/preload.ts هم می‌خواست: ۹۰ روز عقب تا ۷ روز جلو.
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const from = new Date(now); from.setDate(from.getDate() - 90);
  const to = new Date(now); to.setDate(to.getDate() + 7);

  let payload: unknown;
  try {
    const [settingRows, user, dailyRows] = await Promise.all([
      prisma.userSetting.findMany({
        where: { userId, key: { in: [...BOOTSTRAP_SETTING_KEYS] } },
        select: { key: true, value: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true, username: true, phone: true, name: true, market: true,
          createdAt: true, isSuperAdmin: true, avatarUrl: true,
          referralCode: { select: { code: true } },
          moduleAccess: { select: { module: true, active: true, expiresAt: true } },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, key: true } } },
          },
        },
      }),
      prisma.dailyEntry.findMany({
        where: { userId, date: { gte: new Date(iso(from)), lte: new Date(iso(to)) } },
        select: { date: true, completedItems: true, wakeUpAt: true },
      }),
    ]);
    if (!user) return null;

    const settings: Record<string, unknown> = {};
    for (const r of settingRows) settings[r.key] = r.value;

    const entries: Record<string, { tasks: unknown; wake: string | null }> = {};
    for (const r of dailyRows) {
      entries[r.date.toISOString().slice(0, 10)] = {
        tasks: r.completedItems,
        wake: r.wakeUpAt ? r.wakeUpAt.toISOString() : null,
      };
    }

    const moduleAccess = user.isSuperAdmin
      ? Object.values(ModuleKey).map((m) => ({ module: m, active: true, expiresAt: null }))
      : user.moduleAccess;

    // کارت دوستان روی داشبوردها همیشه لود می‌شود، پس همین‌جا می‌آید —
    // همان منطق /api/friends، فقط بدون رفت‌وبرگشت شبکه.
    const [friendRows, requestRows] = await Promise.all([
      prisma.friendship.findMany({
        where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
        include: {
          requester: { select: { id: true, name: true, username: true, avatarUrl: true } },
          addressee: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.friendship.findMany({
        where: { addresseeId: userId, status: "PENDING" },
        include: { requester: { select: { id: true, name: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const otherIds = friendRows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
    const stats = await routineStatsForUsers(otherIds);
    const EMPTY = { completed: 0, total: 0, pct: 0, streak: 0 };
    const friends = friendRows
      .map((r) => {
        const isRequester = r.requesterId === userId;
        const other = isRequester ? r.addressee : r.requester;
        return {
          friendshipId: r.id,
          id: other.id,
          name: other.name || other.username || "کاربر",
          username: other.username,
          avatarUrl: other.avatarUrl,
          favorite: isRequester ? r.favoritedByRequester : r.favoritedByAddressee,
          ...(stats.get(other.id) ?? EMPTY),
        };
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite));

    const { avatarUrl, ...userRest } = user;
    payload = {
      settings,
      account: { user: { ...userRest, moduleAccess } },
      avatarUrl: avatarUrl ?? null,
      dailyRange: { from: iso(from), to: iso(to), entries },
      friends,
      friendRequests: requestRows.map((r) => ({
        friendshipId: r.id,
        id: r.requester.id,
        name: r.requester.name || r.requester.username || "کاربر",
        username: r.requester.username,
        avatarUrl: r.requester.avatarUrl,
      })),
    };
  } catch {
    // اگر دیتابیس در دسترس نبود، صفحه نباید بشکند — کلاینت خودش مسیر
    // عادی fetch را می‌رود.
    return null;
  }

  // JSON داخل <script type="application/json"> امن است چون مرورگر محتوایش
  // را اجرا نمی‌کند؛ تنها فرار لازم `<` است تا رشته‌ای مثل `</script>` تگ را
  // زودتر نبندد. `JSON.parse` سمت کلاینت هم دوباره اعتبارسنجی می‌کند.
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");

  return (
    <script
      id={INLINE_BOOTSTRAP_ID}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
