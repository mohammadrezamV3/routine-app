import { PrismaClient, Market, Currency, ModuleKey } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// جدول قیمت‌گذاری دقیقا همان چیزی‌ست که در طراحی مدل کسب‌وکار توافق شد.
// واحدها: ایران به ریال (تومان × ۱۰)، بین‌المللی به سنت (دلار × ۱۰۰) —
// تا محاسبات همیشه با عدد صحیح انجام شود و خطای اعشار نداشته باشیم.
const PLANS: {
  key: string;
  nameFa: string;
  nameEn: string;
  market: Market;
  currency: Currency;
  priceMonthly: number;
  modules: ModuleKey[];
}[] = [
  // ---------------- ایران (تومان) ----------------
  {
    key: "basic",
    nameFa: "پایه",
    nameEn: "Basic",
    market: Market.IRAN,
    currency: Currency.IRR,
    priceMonthly: 0, // رایگان
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS],
  },
  {
    key: "exercise",
    nameFa: "Plan Gym",
    nameEn: "Plan Gym",
    market: Market.IRAN,
    currency: Currency.IRR,
    priceMonthly: 1_500_000, // ۱۵۰,۰۰۰ تومان
    // بدنسازی = برنامه ورزشی + شمارش کالری، هر دو با هم؛ ai mapping هم توی همه‌ی پلن‌های پولی هست، نه فقط مکس
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS, ModuleKey.EXERCISE, ModuleKey.CALORIE, ModuleKey.ROADMAP],
  },
  {
    key: "trade",
    nameFa: "Plan Trader",
    nameEn: "Plan Trader",
    market: Market.IRAN,
    currency: Currency.IRR,
    priceMonthly: 1_500_000, // ۱۵۰,۰۰۰ تومان
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS, ModuleKey.TRADE, ModuleKey.ROADMAP],
  },
  {
    key: "max",
    nameFa: "Plan Max",
    nameEn: "Plan Max",
    market: Market.IRAN,
    currency: Currency.IRR,
    priceMonthly: 2_500_000, // ۲۵۰,۰۰۰ تومان
    modules: [
      ModuleKey.ROUTINE,
      ModuleKey.SLEEP,
      ModuleKey.TASKS,
      ModuleKey.EXERCISE,
      ModuleKey.TRADE,
      ModuleKey.CALORIE,
      ModuleKey.ROADMAP,
      ModuleKey.AI_INSIGHT,
    ],
  },
  // ---------------- بین‌المللی (دلار) ----------------
  {
    key: "basic",
    nameFa: "پایه",
    nameEn: "Basic",
    market: Market.INTERNATIONAL,
    currency: Currency.USD,
    priceMonthly: 0, // free
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS],
  },
  {
    key: "exercise",
    nameFa: "Plan Gym",
    nameEn: "Plan Gym",
    market: Market.INTERNATIONAL,
    currency: Currency.USD,
    priceMonthly: 799, // $7.99
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS, ModuleKey.EXERCISE, ModuleKey.CALORIE, ModuleKey.ROADMAP],
  },
  {
    key: "trade",
    nameFa: "Plan Trader",
    nameEn: "Plan Trader",
    market: Market.INTERNATIONAL,
    currency: Currency.USD,
    priceMonthly: 1299, // $12.99
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS, ModuleKey.TRADE, ModuleKey.ROADMAP],
  },
  {
    key: "max",
    nameFa: "Plan Max",
    nameEn: "Plan Max",
    market: Market.INTERNATIONAL,
    currency: Currency.USD,
    priceMonthly: 1799, // $17.99
    modules: [
      ModuleKey.ROUTINE,
      ModuleKey.SLEEP,
      ModuleKey.TASKS,
      ModuleKey.EXERCISE,
      ModuleKey.TRADE,
      ModuleKey.CALORIE,
      ModuleKey.ROADMAP,
      ModuleKey.AI_INSIGHT,
    ],
  },
];

async function main() {
  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { key_market: { key: p.key, market: p.market } },
      create: {
        key: p.key,
        nameFa: p.nameFa,
        nameEn: p.nameEn,
        market: p.market,
        currency: p.currency,
        priceMonthly: p.priceMonthly,
      },
      update: {
        priceMonthly: p.priceMonthly,
        currency: p.currency,
      },
    });

    for (const m of p.modules) {
      await prisma.planModule.upsert({
        where: { planId_module: { planId: plan.id, module: m } },
        create: { planId: plan.id, module: m },
        update: {},
      });
    }
  }

  console.log(`Seeded ${PLANS.length} plans across both markets.`);

  // ---------------- سوپریوزر/ادمین ----------------
  // دسترسی نامحدود به همه ماژول‌ها، بدون نیاز به اشتراک یا انقضا.
  //
  // امنیت: نام‌کاربری و رمز از env خونده می‌شن، نه هاردکد داخل سورس — چون
  // این فایل توی گیت (و روی گیت‌هاب) هست و هر رمز نوشته‌شده اینجا یعنی
  // هر کسی که سورس رو ببینه، رمز ادمین پروداکشن رو داره. اگه این دو تا
  // env ست نشده باشن، ساخت ادمین رو کامل رد می‌کنیم (fail-safe) به‌جای
  // این‌که به یه رمز پیش‌فرض ضعیف برگردیم.
  const adminUsername = process.env.SUPERADMIN_USERNAME;
  const adminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.warn(
      "[seed] SUPERADMIN_USERNAME/SUPERADMIN_PASSWORD تنظیم نشده — ساخت ادمین رد شد. " +
      "برای ساخت سوپریوزر، این دو env رو ست کن و دوباره seed بزن."
    );
    console.log(`Seeded ${PLANS.length} plans across both markets. (no super-admin created)`);
    return;
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    create: {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      name: "محمدرضا",
      market: Market.IRAN,
      isSuperAdmin: true,
    },
    // عمدا passwordHash رو توی update نمی‌ذاریم: اگه ادمین از قبل ساخته شده و
    // رمزشو عوض کرده، یه seed دوباره نباید رمزشو به مقدار env برگردونه/ریست کنه.
    update: {
      isSuperAdmin: true,
    },
  });

  const allModules = Object.values(ModuleKey);
  for (const m of allModules) {
    await prisma.moduleAccess.upsert({
      where: { userId_module: { userId: admin.id, module: m } },
      create: { userId: admin.id, module: m, active: true, expiresAt: null },
      update: { active: true, expiresAt: null },
    });
  }

  console.log(`Super-admin ready: username="${adminUsername}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
