import { PrismaClient, Market, Currency, ModuleKey } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// جدول قیمت‌گذاری دقیقاً همان چیزی‌ست که در طراحی مدل کسب‌وکار توافق شد.
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
    priceMonthly: 990_000, // ۹۹,۰۰۰ تومان
    // بدنسازی = برنامه ورزشی + شمارش کالری، هر دو با هم؛ ai mapping هم توی همه‌ی پلن‌های پولی هست، نه فقط مکس
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS, ModuleKey.EXERCISE, ModuleKey.CALORIE, ModuleKey.ROADMAP],
  },
  {
    key: "trade",
    nameFa: "Plan Trader",
    nameEn: "Plan Trader",
    market: Market.IRAN,
    currency: Currency.IRR,
    priceMonthly: 1_290_000, // ۱۲۹,۰۰۰ تومان
    modules: [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS, ModuleKey.TRADE, ModuleKey.ROADMAP],
  },
  {
    key: "max",
    nameFa: "Plan Max",
    nameEn: "Plan Max",
    market: Market.IRAN,
    currency: Currency.IRR,
    priceMonthly: 1_990_000, // ۱۹۹,۰۰۰ تومان
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

  // ---------------- سوپریوزر/ادمین ثابت ----------------
  // دسترسی نامحدود به همه ماژول‌ها، بدون نیاز به اشتراک یا انقضا.
  const adminUsername = "mohammadreza";
  const adminPasswordHash = await bcrypt.hash("mohammadmV3", 12);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    create: {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      name: "محمدرضا",
      market: Market.IRAN,
      isSuperAdmin: true,
    },
    update: {
      passwordHash: adminPasswordHash,
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
