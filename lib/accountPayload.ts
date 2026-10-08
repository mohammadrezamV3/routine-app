import { ModuleKey, SubscriptionStatus, type Prisma } from "@prisma/client";
import { nameFlags } from "@/lib/nameStyle";

// شکل واحد `user` در پاسخ حساب — /api/account، /api/bootstrap و InlineBootstrap
// هر سه از همین select و همین تبدیل استفاده می‌کنن. قبلا هرکدوم select خودش رو
// داشت و دو مسیر bootstrap فیلد firstName (و gender/قد/وزن/…) رو نمی‌فرستادن؛
// صفحه‌ی پروفایل که بار اول از bootstrap می‌خونه نام رو خالی نشون می‌داد و
// کاربر فکر می‌کرد اطلاعات ذخیره‌شده‌اش پاک شده.

export function accountUserSelect() {
  return {
    email: true,
    username: true,
    phone: true,
    name: true,
    lastName: true,
    bio: true,
    birthDate: true,
    gender: true,
    heightCm: true,
    weightKg: true,
    discoverable: true,
    sharePhone: true,
    twoFactorEnabled: true,
    phoneVerifiedAt: true,
    market: true,
    createdAt: true,
    isSuperAdmin: true,
    avatarUrl: true,
    goldenSince: true,
    adminPermissions: true,
    walletBalance: true,
    referralCode: { select: { code: true } },
    moduleAccess: { select: { module: true, active: true, expiresAt: true } },
    // فقط اشتراک واقعا فعال — نه صرفا «آخرین ردیف ساخته‌شده»
    subscriptions: {
      where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }, currentPeriodEnd: { gt: new Date() } },
      orderBy: { currentPeriodEnd: "desc" as const },
      take: 1,
      select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, key: true } } },
    },
  } satisfies Prisma.UserSelect;
}

type AccountRow = Prisma.UserGetPayload<{ select: ReturnType<typeof accountUserSelect> }>;

/** ردیف دیتابیس → `user` پاسخ (بدون avatarUrl، که جدا برمی‌گرده) */
export function toAccountUser(user: AccountRow) {
  // سوپریوزر همیشه به همه ماژول‌ها دسترسی داره
  const moduleAccess = user.isSuperAdmin
    ? Object.values(ModuleKey).map((m) => ({ module: m, active: true, expiresAt: null }))
    : user.moduleAccess;
  const fullName = [user.name, user.lastName].filter(Boolean).join(" ") || null;
  const { avatarUrl: _avatar, goldenSince, adminPermissions, ...rest } = user;
  return {
    ...rest,
    ...nameFlags({ goldenSince, isSuperAdmin: user.isSuperAdmin, adminPermissions }),
    firstName: user.name,
    name: fullName,
    moduleAccess,
  };
}
