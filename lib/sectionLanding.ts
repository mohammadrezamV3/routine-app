// متن و تنظیمات لندینگ هر بخش (routine / trade / workout) روی "/" زیردامنه‌ها.
// دامنه‌ی اصلی (section = null) هیچ‌وقت از این فایل متنی نمی‌گیره: کامپوننت‌های لندینگ برای null
// همون متن‌های قبلی خودشون رو نگه می‌دارن. خالص و بدون import سروری؛ هم app/page.tsx هم
// کامپوننت‌های کلاینت از همین‌جا می‌خونن. همه‌ی متن‌ها تابع‌ان (زبان هر درخواست).
import { tr } from "@/lib/i18n";
import { BRAND_EN, BRAND_FA } from "@/lib/brand";
import { SECTION_META, type SectionKey } from "@/lib/sections";

// ─── سئو ────────────────────────────────────────────────────────────────────

export type SectionSeo = {
  title: string;
  description: string;
  keywords: string[];
  /** schema.org applicationCategory */
  category: "ProductivityApplication" | "HealthApplication" | "FinanceApplication";
  /** نام کامل برنامه برای JSON-LD */
  appName: string;
  featureList: string[];
  /** توضیح پیشنهاد (دوره‌ی آزمایشی) برای Offer */
  offerNote: string;
  /** جمله‌ی کوتاه برای تصویر اشتراک‌گذاری */
  ogHeadline: string;
};

export function getSectionSeo(section: SectionKey): SectionSeo {
  const label = SECTION_META[section].label;
  const appName = tr(`${BRAND_FA} ${label}`, `${BRAND_EN} ${label}`);
  if (section === "workout") {
    return {
      title: tr(
        `برنامه ورزشی و بدنسازی با هوش مصنوعی، کالری شمار و رژیم | ${appName}`,
        `AI workout plan and bodybuilding program, calorie tracker and diet | ${appName}`,
      ),
      description: tr(
        `ساخت برنامه ورزشی و برنامه بدنسازی با هوش مصنوعی برای باشگاه یا خانه، ثبت تمرین ست به ست با 149 حرکت آموزشی، کالری شمار فارسی با 264 خوراکی ایرانی و جهانی و ردیابی خواب. رایگان شروع کن.`,
        `Build an AI workout plan and bodybuilding program for the gym or home, log training set by set with 149 exercises and tutorials, count calories with 264 Iranian and international foods and track your sleep. Start free.`,
      ),
      keywords: tr(
        "برنامه ورزشی|برنامه بدنسازی|برنامه تمرینی با هوش مصنوعی|برنامه ورزشی در خانه|برنامه بدنسازی رایگان|برنامه تمرینی باشگاه|کالری شمار|کالری شمار فارسی|رژیم و کالری|محاسبه کالری غذا|ثبت تمرین|ردیابی خواب|آریون ورزش",
        "workout plan|bodybuilding program|AI workout plan|home workout plan|gym training program|calorie tracker|calorie counter|diet and calories|workout log|sleep tracker|Arion Workout",
      ).split("|"),
      category: "HealthApplication",
      appName,
      featureList: [
        tr("ساخت برنامه ورزشی و بدنسازی با هوش مصنوعی یا دستی", "AI or manual workout and bodybuilding plans"),
        tr("کاتالوگ 149 حرکت با آموزش و سطح سختی", "A catalogue of 149 exercises with tutorials and difficulty levels"),
        tr("ثبت تمرین ست به ست با کرنومتر", "Set-by-set workout logging with a timer"),
        tr("کالری شمار فارسی با 264 خوراکی ایرانی و جهانی", "Calorie counter with 264 Iranian and international foods"),
        tr("هدف کالری و ماکروها بر اساس قد، وزن، سن و هدف", "Calorie and macro goals from height, weight, age and goal"),
        tr("ردیابی خواب و چرخه‌های خواب", "Sleep and sleep-cycle tracking"),
      ],
      offerNote: tr(
        "بدنسازی و کالری‌شمار برای هر حساب تازه 3 روز با استفاده‌ی محدود از هوش مصنوعی رایگان است و بعد از آن اشتراکی است.",
        "Workouts and the calorie counter are free for 3 days on every new account, with limited AI use, and subscription-based after that.",
      ),
      ogHeadline: tr("برنامه ورزشی، بدنسازی و کالری‌شماری", "Workout plans, bodybuilding and calorie counting"),
    };
  }
  if (section === "trade") {
    return {
      title: tr(
        `ژورنال ترید و معاملاتی با اتصال متاتریدر، تقویم اقتصادی فارکس | ${appName}`,
        `Trading journal with MetaTrader sync, forex economic calendar | ${appName}`,
      ),
      description: tr(
        `ژورنال ترید فارسی با چند حساب معاملاتی، آمار کامل و چک لیست ورود، اتصال خودکار MT4 و MT5 بدون رمز حساب، تقویم اقتصادی فارکس با Actual و Forecast، ساعت بازار فارکس و ماشین حساب مدیریت ریسک.`,
        `A trading journal with multiple accounts, full statistics and an entry checklist, automatic MT4 and MT5 sync without your account password, a forex economic calendar with Actual and Forecast, forex market hours and a risk management calculator.`,
      ),
      keywords: tr(
        "ژورنال ترید|ژورنال معاملاتی|ژورنال فارکس|اتصال متاتریدر|ژورنال ترید متاتریدر|تقویم اقتصادی فارکس|ساعت بازار فارکس|سشن های فارکس|مدیریت ریسک|ماشین حساب ریسک|چک لیست ترید|آمار معاملات|آریون ترید",
        "trading journal|forex journal|MetaTrader journal|MT4 MT5 sync|forex economic calendar|forex market hours|forex sessions|risk management|risk calculator|trading checklist|trade statistics|Arion Trade",
      ).split("|"),
      category: "FinanceApplication",
      appName,
      featureList: [
        tr("ژورنال ترید با چند حساب و آمار کامل", "A trading journal with multiple accounts and full statistics"),
        tr("همگام‌سازی خودکار معاملات با MT4 و MT5 بدون رمز حساب", "Automatic trade sync with MT4 and MT5 without your account password"),
        tr("چک‌لیست ورود که لحظه‌ی ثبت معامله ذخیره می‌شود", "An entry checklist saved at the moment you log a trade"),
        tr("تقویم اقتصادی 9 ارز اصلی با Actual، Forecast و Previous", "Economic calendar for 9 major currencies with Actual, Forecast and Previous"),
        tr("ساعت سشن‌های فارکس به وقت خودت", "Forex session hours in your own time"),
        tr("ماشین حساب ریسک و سود", "Risk and profit calculator"),
      ],
      offerNote: tr(
        "ژورنال ترید برای هر حساب تازه 3 روز رایگان است و بعد از آن اشتراکی است.",
        "The trading journal is free for 3 days on every new account and subscription-based after that.",
      ),
      ogHeadline: tr("ژورنال ترید، تقویم اقتصادی و متاتریدر", "Trading journal, economic calendar and MetaTrader"),
    };
  }
  return {
    title: tr(
      `روتین اپ و برنامه ریزی روزانه، عادت ساز و ردیابی خواب | ${appName}`,
      `Routine app and daily planner, habit tracker and sleep tracking | ${appName}`,
    ),
    description: tr(
      `برنامه ریزی روزانه و هفتگی با تقویم شمسی، پیگیری عادت و استریک، یادآوری برنامه و دارو، ردیابی خواب و رودمپ یادگیری با هوش مصنوعی. روتین اپ فارسی؛ 14 روز رایگان.`,
      `Daily and weekly planning with the Jalali calendar, habit and streak tracking, plan and medication reminders, sleep tracking and AI learning roadmaps. A routine app built for Persian speakers; free for 14 days.`,
    ),
    keywords: tr(
      "روتین روزانه|روتین اپ|برنامه ریزی روزانه|اپ برنامه ریزی روزانه|برنامه هفتگی|عادت ساز|پیگیری عادت|استریک|ردیابی خواب|رودمپ یادگیری|یادآوری دارو|آریون روتین",
      "daily routine|routine app|daily planner|weekly planner|habit tracker|streak tracker|sleep tracker|learning roadmap|medication reminder|Arion Routine",
    ).split("|"),
    category: "ProductivityApplication",
    appName,
    featureList: [
      tr("برنامه ریزی روزانه و هفتگی با تقویم شمسی", "Daily and weekly planning with the Jalali calendar"),
      tr("پیگیری عادت و استریک روزانه", "Habit tracking and daily streaks"),
      tr("یادآوری برنامه و دارو", "Plan and medication reminders"),
      tr("ثبت و پیگیری خواب", "Sleep tracking"),
      tr("نومو، مدیر برنامه هوشمند", "Nomo, the smart plan manager"),
      tr("رودمپ یادگیری با هوش مصنوعی", "AI learning roadmaps"),
    ],
    offerNote: tr(
      "هر حساب تازه 14 روز دوره‌ی آزمایشی رایگان «روتین من» دارد و بعد از آن برای ادامه، پلن پولی لازم است.",
      "Every new account gets a 14-day free trial of My Routine; a paid plan is needed to continue after that.",
    ),
    ogHeadline: tr("روتین روزانه، عادت و ردیابی خواب", "Daily routine, habits and sleep tracking"),
  };
}

// ─── هیرو ───────────────────────────────────────────────────────────────────

export type HeroTrustIcon = "spark" | "shield" | "lock";

export type SectionPhoneTask = {
  name: string; time?: string; importance?: "veryHigh" | "high" | "medium" | "low"; tag?: string;
  exercise?: boolean; hideTime?: boolean;
};

export type SectionHero = {
  eyebrow: string;
  /** کلمه‌ی اول h1 (کنار اسم برند)؛ مثلا «برنامه ورزشی» */
  kicker: string;
  main: string;
  rotWords: string[];
  /** متن h1 برای صفحه‌خوان (اولین کلمه‌ی چرخان) */
  sr: string;
  sub: string;
  trust: { icon: HeroTrustIcon; text: string }[];
  links: { href: string; label: string }[];
  /** ماکت گوشی */
  phone: { title: string; sub: string; tasks: SectionPhoneTask[] };
  mentor: { name: string; line: string; since: string };
};

export function getSectionHero(section: SectionKey, brand: string): SectionHero {
  if (section === "workout") {
    return {
      eyebrow: SECTION_META.workout.tagline,
      kicker: tr("برنامه ورزشی", "Workout plan"),
      main: tr("تمرین و تغذیه‌ات را", "Your training and nutrition,"),
      rotWords: [tr("بساز", "planned"), tr("اجرا کن", "logged"), tr("ثبت کن", "tracked"), tr("پیگیری کن", "improving")],
      sr: tr("بساز", "planned"),
      sub: tr(
        `برنامه ورزشی و بدنسازی را با هوش مصنوعی بساز، تمرین را ست به ست ثبت کن و با کالری شمار فارسی تغذیه‌ات را دنبال کن؛ ${brand} پیشرفتت را روز به روز نشان می‌دهد.`,
        `Build a workout and bodybuilding plan with AI, log your training set by set and follow your nutrition with a calorie counter; ${brand} shows your progress day by day.`,
      ),
      trust: [
        { icon: "spark", text: tr("3 روز رایگان بدنسازی و کالری‌شمار", "3 free days of workouts and the calorie counter") },
        { icon: "spark", text: tr("149 حرکت با آموزش و 264 خوراکی آماده", "149 exercises with tutorials and 264 ready-made foods") },
        { icon: "shield", text: tr("روی گوشی و کامپیوتر", "On phone and desktop") },
        { icon: "lock", text: tr("چت‌های سرتاسر رمزنگاری‌شده", "End-to-end encrypted chats") },
      ],
      links: [
        { href: "/bodybuilding-program", label: tr("برنامه بدنسازی", "Workout plan") },
        { href: "/calorie-counter", label: tr("کالری‌شمار", "Calorie counter") },
        { href: "/mentors", label: tr("مربی‌ها", "Mentors") },
        { href: "/blog", label: tr("مقاله‌ها", "Articles") },
      ],
      phone: {
        title: tr("بدنسازی", "Workouts"),
        sub: tr("برنامه تمرین و تغذیه امروزت را مدیریت و پیگیری کن.", "Manage and track today's training and nutrition."),
        tasks: [
          { name: tr("پرس سینه", "Bench press"), time: "4×10", importance: "high", tag: tr("سینه", "Chest") },
          { name: tr("زیربغل سیم‌کش", "Seated cable row"), time: "4×12", importance: "medium", tag: tr("پشت", "Back") },
          { name: tr("جلو بازو دمبل", "Dumbbell curl"), time: "3×12", tag: tr("بازو", "Arms") },
          { name: tr("برنامه تمرینی امروز", "Today's workout plan"), exercise: true },
        ],
      },
      mentor: { name: tr("سارا رحیمی", "Sara Rahimi"), line: tr("مربی تغذیه", "Nutrition mentor"), since: tr("فروردین 1404", "Mar 2025") },
    };
  }
  if (section === "trade") {
    return {
      eyebrow: SECTION_META.trade.tagline,
      kicker: tr("ژورنال ترید", "Trading journal"),
      main: tr("معاملاتت را", "Your trades,"),
      rotWords: [tr("ثبت کن", "logged"), tr("تحلیل کن", "analyzed"), tr("بررسی کن", "reviewed"), tr("بهتر کن", "improved")],
      sr: tr("ثبت کن", "logged"),
      sub: tr(
        `ژورنال ترید فارسی با اتصال خودکار متاتریدر، چک لیست ورود، تقویم اقتصادی فارکس و ماشین حساب ریسک؛ ${brand} عملکرد هر حساب را شفاف نشان می‌دهد.`,
        `A trading journal with automatic MetaTrader sync, an entry checklist, a forex economic calendar and a risk calculator; ${brand} shows the performance of every account clearly.`,
      ),
      trust: [
        { icon: "spark", text: tr("3 روز رایگان ژورنال ترید", "3 free days of the trading journal") },
        { icon: "shield", text: tr("MT4 و MT5 بدون نیاز به رمز حساب", "MT4 and MT5 without your account password") },
        { icon: "spark", text: tr("تقویم اقتصادی 9 ارز اصلی", "Economic calendar for 9 major currencies") },
        { icon: "lock", text: tr("چت‌های سرتاسر رمزنگاری‌شده", "End-to-end encrypted chats") },
      ],
      links: [
        { href: "/trading-journal", label: tr("ژورنال معاملاتی", "Trading journal") },
        { href: "/economic-calendar", label: tr("تقویم اقتصادی", "Economic calendar") },
        { href: "/forex-sessions", label: tr("ساعت بازار فارکس", "Forex market hours") },
        { href: "/mentors", label: tr("مربی‌ها", "Mentors") },
        { href: "/blog", label: tr("مقاله‌ها", "Articles") },
      ],
      phone: {
        title: tr("ژورنال ترید", "Trading journal"),
        sub: tr("حساب‌ها و معاملاتت را بررسی کن.", "Review your accounts and trades."),
        tasks: [
          { name: tr("خبرهای مهم امروز را دیدم", "Checked today's key news"), hideTime: true },
          { name: tr("حد ضرر مشخص است", "Stop loss is set"), hideTime: true },
          { name: tr("ریسک زیر 1 درصد است", "Risk is under 1 percent"), hideTime: true },
        ],
      },
      mentor: { name: tr("امیر کریمی", "Amir Karimi"), line: tr("مربی ترید", "Trading mentor"), since: tr("آذر 1404", "Dec 2025") },
    };
  }
  return {
    eyebrow: SECTION_META.routine.tagline,
    kicker: tr("روتین اپ", "Routine app"),
    main: tr("برنامه روزانه‌ات را", "Your daily plan,"),
    rotWords: [tr("بچین", "planned"), tr("اجرا کن", "done"), tr("تیک بزن", "ticked"), tr("پیگیری کن", "tracked")],
    sr: tr("بچین", "planned"),
    sub: tr(
      `برنامه ریزی روزانه و هفتگی با تقویم شمسی، یادآوری برنامه و دارو، پیگیری عادت و ردیابی خواب؛ ${brand} از همین تیک‌های ساده استریک و آنالیز هفتگی‌ات را می‌سازد.`,
      `Daily and weekly planning with the Jalali calendar, plan and medication reminders, habit tracking and sleep tracking; ${brand} turns those simple ticks into streaks and a weekly review.`,
    ),
    trust: [
      { icon: "spark", text: tr("14 روز رایگان", "14 days free") },
      { icon: "spark", text: tr("تقویم شمسی، یادآوری برنامه و دارو", "Jalali calendar, plan and medication reminders") },
      { icon: "shield", text: tr("روی گوشی و کامپیوتر", "On phone and desktop") },
      { icon: "lock", text: tr("چت‌های سرتاسر رمزنگاری‌شده", "End-to-end encrypted chats") },
    ],
    links: [
      { href: "/routine", label: tr("روتین روزانه", "Daily routine") },
      { href: "/habit-tracker", label: tr("پیگیری عادت", "Habit tracking") },
      { href: "/daily-planner", label: tr("برنامه‌ریزی روزانه", "Daily planning") },
      { href: "/ai-planner", label: tr("مدیر برنامه هوشمند", "Smart plan manager") },
      { href: "/learning-roadmap", label: tr("رودمپ یادگیری", "Learning roadmap") },
    ],
    phone: {
      title: tr("روتین من", "My Routine"),
      sub: tr("برنامه‌های روزانه خود را مدیریت و پیگیری کنید.", "Manage and track your daily plans."),
      tasks: [
        { name: tr("مدیتیشن صبحگاهی", "Morning meditation"), time: "07:00", importance: "medium", tag: tr("سلامتی", "Health") },
        { name: tr("مطالعه", "Reading"), time: "13:30", importance: "high", tag: tr("یادگیری", "Learning") },
        { name: tr("پیاده‌روی عصر", "Evening walk"), time: "18:00" },
        { name: tr("ثبت خواب دیشب", "Log last night's sleep"), time: "21:30" },
      ],
    },
    mentor: { name: tr("نیلوفر احمدی", "Niloufar Ahmadi"), line: tr("مربی روتین", "Routine mentor"), since: tr("مهر 1404", "Oct 2025") },
  };
}

// ─── ویترین و بخش‌های میانی ──────────────────────────────────────────────────

/** تب‌های ویترین (LandingShowcase) به ترتیب نمایش */
export const SECTION_SHOWCASE_KEYS: Record<SectionKey, string[]> = {
  routine: ["routine", "streak", "analysis", "numo", "roadmap", "mentor"],
  workout: ["fitness", "calorie", "streak", "mentor"],
  trade: ["trade", "market", "mentor"],
};

/** کارت‌های بنتو به ترتیب نمایش */
export const SECTION_BENTO_KEYS: Record<SectionKey, string[]> = {
  routine: ["streak", "friends", "e2ee", "pwa"],
  workout: ["food", "streak", "e2ee", "pwa"],
  trade: ["meta", "e2ee", "pwa"],
};

/** آیتم‌های فهرست امکانات (LandingFeatureGrid) به ترتیب نمایش */
export const SECTION_FEATURE_KEYS: Record<SectionKey, string[]> = {
  routine: ["dashboard", "routine", "weekly", "habit", "sleep", "remind", "nomo", "review", "roadmap", "mentors", "friends", "pwa"],
  workout: ["dashboard", "workout", "calorie", "sleep", "habit", "review", "mentors", "friends", "notif", "pwa"],
  trade: ["dashboard", "trade", "meta", "calendar", "sessions", "risk", "share", "review", "mentors", "notif", "pwa"],
};

/** آمارهای بالای صفحه (کلیدهای PublicStats) */
export const SECTION_STATS_KEYS: Record<SectionKey, ("users" | "routinePrograms" | "exercisePlans" | "journalEntries")[]> = {
  routine: ["users", "routinePrograms"],
  workout: ["users", "exercisePlans"],
  trade: ["users", "journalEntries"],
};

export type SectionCopy = {
  showcaseTitle: { before: string; accent: string; after: string };
  howTitle: { title: string; accent: string };
  steps: { title: string; body: string }[];
  dashTitle: { title: string; accent: string };
  dashIntro: string;
  featuresTitle: { title: string; accent: string };
  /** جایگزین دو آیتم عمومی «همه‌چیز کنار هم» و «قابل توسعه» */
  whyTogether: { title: string; body: string };
  whyMentor: { title: string; body: string };
  ctaChip: string;
  ctaSub: string;
};

export function getSectionCopy(section: SectionKey): SectionCopy {
  if (section === "workout") {
    return {
      showcaseTitle: {
        before: tr("تمرین و تغذیه‌ات، از برنامه تا", "Your training and nutrition, from plan to"),
        accent: tr("نتیجه", "result"),
        after: ".",
      },
      howTitle: { title: tr("برنامه، تمرین،", "Plan, train,"), accent: tr("پیشرفت", "progress") },
      steps: [
        {
          title: tr("برنامه‌ات را بساز", "Build your plan"),
          body: tr("قد، وزن، هدف و امکاناتت (باشگاه یا خانه) را بگو تا هوش مصنوعی برنامه‌ی بدنسازی بسازد؛ یا خودت دستی بچین.", "Tell it your height, weight, goal and equipment (gym or home) and AI builds a workout plan, or arrange one by hand."),
        },
        {
          title: tr("تمرین کن و ثبت کن", "Train and log"),
          body: tr("با کرنومتر تمرین ست به ست ثبت کن و غذای هر وعده را با گرم بنویس.", "Log set by set with the workout timer and write down each meal in grams."),
        },
        {
          title: tr("پیشرفتت را ببین", "See your progress"),
          body: tr("استریک روزهای موفق، نمودار کالری و آنالیز هفتگی نشان می‌دهند مسیرت چطور پیش می‌رود.", "Your streak of successful days, calorie charts and weekly review show how you are doing."),
        },
      ],
      dashTitle: { title: tr("تمرین و کالری امروزت،", "Today's training and calories,"), accent: tr("یک‌جا", "in one place") },
      dashIntro: tr("از برنامه تمرین امروز تا کالری مصرف‌شده؛ مهم‌ترین چیزها را بدون جابه‌جایی بین چند ابزار ببین.", "From today's workout to the calories you have eaten; see the most important things without switching between several tools."),
      featuresTitle: { title: tr("هر چیزی که برای", "Everything you need for"), accent: tr("تمرین و تغذیه لازم داری", "training and nutrition") },
      whyTogether: {
        title: tr("تمرین، تغذیه و خواب", "Training, nutrition and sleep"),
        body: tr("برنامه ورزشی، کالری شمار و ردیابی خواب را در یک حساب مدیریت کن.", "Manage your workout plan, calorie counter and sleep tracking in one account."),
      },
      whyMentor: {
        title: tr("مربی ورزش و تغذیه", "Fitness and nutrition mentors"),
        body: tr("از مربی برنامه بگیر و گفت‌وگو کن؛ چت‌ها سرتاسر رمزنگاری‌شده‌اند.", "Get a plan from a mentor and chat with them; chats are end-to-end encrypted."),
      },
      ctaChip: tr("3 روز رایگان", "3 days free"),
      ctaSub: tr("هدفت را بگو، برنامه ورزشی‌ات را بساز و از امروز تمرین کن.", "Tell it your goal, build your workout plan and start training today."),
    };
  }
  if (section === "trade") {
    return {
      showcaseTitle: {
        before: tr("هر معامله را ثبت کن و", "Log every trade and see"),
        accent: tr("الگوی خودت را ببین", "your own pattern"),
        after: ".",
      },
      howTitle: { title: tr("وصل کن، بررسی کن،", "Connect, review,"), accent: tr("بهتر شو", "improve") },
      steps: [
        {
          title: tr("حسابت را وصل کن", "Connect your account"),
          body: tr("حساب معاملاتی بساز و با اکسپرت MT4 یا MT5 وصلش کن؛ رمز حساب هرگز خواسته نمی‌شود.", "Create a trading account and connect it with the MT4 or MT5 Expert Advisor; your account password is never requested."),
        },
        {
          title: tr("قبل از معامله بررسی کن", "Check before you trade"),
          body: tr("تقویم اقتصادی و ساعت سشن‌ها را ببین و چک‌لیست ورودت را اجرا کن.", "See the economic calendar and session hours and run your entry checklist."),
        },
        {
          title: tr("عملکردت را بررسی کن", "Review your performance"),
          body: tr("آمار هر حساب، نرخ برد، سود و زیان و یادداشت‌هایت نشان می‌دهند کجا باید بهتر شوی.", "Each account's statistics, win rate, profit and loss and your notes show where to improve."),
        },
      ],
      dashTitle: { title: tr("کل معاملاتت،", "All your trading,"), accent: tr("یک‌جا", "in one place") },
      dashIntro: tr("از عملکرد حساب‌ها تا معاملات اخیر؛ مهم‌ترین چیزها را بدون جابه‌جایی بین چند ابزار ببین.", "From account performance to recent trades; see the most important things without switching between several tools."),
      featuresTitle: { title: tr("هر چیزی که برای", "Everything you need for"), accent: tr("ترید منظم لازم داری", "disciplined trading") },
      whyTogether: {
        title: tr("ژورنال و تقویم در یک جا", "Journal and calendar together"),
        body: tr("ثبت معامله، چک لیست، تقویم اقتصادی و ساعت بازار را کنار هم داشته باش.", "Keep trade logging, your checklist, the economic calendar and market hours side by side."),
      },
      whyMentor: {
        title: tr("مربی ترید", "Trading mentors"),
        body: tr("از مربی ترید برنامه بگیر و گفت‌وگو کن؛ چت‌ها سرتاسر رمزنگاری‌شده‌اند.", "Get a plan from a trading mentor and chat with them; chats are end-to-end encrypted."),
      },
      ctaChip: tr("3 روز رایگان", "3 days free"),
      ctaSub: tr("حسابت را وصل کن، ژورنالت را بساز و از امروز معاملاتت را تحلیل کن.", "Connect your account, build your journal and start analyzing your trades today."),
    };
  }
  return {
    showcaseTitle: {
      before: tr("روتینی که", "A routine that"),
      accent: tr("واقعا اجرا می‌شود", "actually gets done"),
      after: ".",
    },
    howTitle: { title: tr("برنامه، اجرا،", "Plan, do,"), accent: tr("پیشرفت", "progress") },
    steps: [
      {
        title: tr("برنامه‌ات را بساز", "Build your plan"),
        body: tr("ثبت‌نام کن و روتینت را بچین؛ یا به «نومو» بگو چه می‌خواهی. «روتین من» 14 روز رایگان است.", "Sign up and lay out your routine, or tell Nomo what you want. My Routine is free for 14 days."),
      },
      {
        title: tr("اجرا کن", "Do it"),
        body: tr("کارهای امروزت را انجام بده و همان لحظه تیک بزن.", "Do today's tasks and tick them off the moment you finish."),
      },
      {
        title: tr("پیشرفتت را ببین", "See your progress"),
        body: tr("استریک، تاریخچه، خواب و آنالیز هفتگی نشان می‌دهند مسیرت چطور پیش می‌رود.", "Your streak, history, sleep and weekly review show how your journey is going."),
      },
    ],
    dashTitle: { title: tr("کل روزت،", "Your whole day,"), accent: tr("یک‌جا", "in one place") },
    dashIntro: tr("از برنامه امروز تا میزان پیشرفتت؛ مهم‌ترین چیزها را بدون جابه‌جایی بین چند ابزار ببین.", "From today's plan to how far you have come; see the most important things without switching between several tools."),
    featuresTitle: { title: tr("هر چیزی که برای", "Everything you need for"), accent: tr("روتین روزانه لازم داری", "your daily routine") },
    whyTogether: {
      title: tr("روتین کامل، یک‌جا", "A complete routine, in one place"),
      body: tr("برنامه روزانه، هفتگی، خواب و رودمپ کنار هم؛ بدون جابه‌جایی بین چند ابزار.", "Daily and weekly plans, sleep and roadmaps side by side, without switching between several tools."),
    },
    whyMentor: {
      title: tr("مربی روتین", "Routine mentors"),
      body: tr("از مربی برنامه بگیر و گفت‌وگو کن؛ پیشرفتت از تیک‌های روتین خودت خودکار حساب می‌شود.", "Get a plan from a mentor and chat with them; your progress is calculated automatically from your own routine ticks."),
    },
    ctaChip: tr("14 روز رایگان", "14 days free"),
    ctaSub: tr("مسیرت را مشخص کن، برنامه‌ات را بساز و از امروز اجرا کن.", "Set your direction, build your plan and start today."),
  };
}

// ─── فوتر ───────────────────────────────────────────────────────────────────

/** لینک‌های امکانات فوتر برای هر بخش (مسیرهایی که روی همون زیردامنه باز می‌شن) */
export function getSectionFooterFeatures(section: SectionKey): { href: string; label: string }[] {
  if (section === "workout") {
    return [
      { href: "/bodybuilding-program", label: tr("برنامه‌ی بدنسازی", "Workout plan") },
      { href: "/calorie-counter", label: tr("کالری‌شمار", "Calorie counter") },
      { href: "/mentors", label: tr("مربی‌ها", "Mentors") },
    ];
  }
  if (section === "trade") {
    return [
      { href: "/trading-journal", label: tr("ژورنال معاملاتی", "Trading journal") },
      { href: "/economic-calendar", label: tr("تقویم اقتصادی", "Economic calendar") },
      { href: "/forex-sessions", label: tr("ساعت بازار فارکس", "Forex market hours") },
      { href: "/mentors", label: tr("مربی‌ها", "Mentors") },
    ];
  }
  return [
    { href: "/routine", label: tr("روتین روزانه", "Daily routine") },
    { href: "/habit-tracker", label: tr("پیگیری عادت‌ها", "Habit tracking") },
    { href: "/daily-planner", label: tr("برنامه‌ریزی روزانه", "Daily planning") },
    { href: "/ai-planner", label: tr("برنامه‌ریز هوشمند", "Smart planner") },
    { href: "/learning-roadmap", label: tr("رودمپ یادگیری", "Learning roadmap") },
    { href: "/mentors", label: tr("مربی‌ها", "Mentors") },
  ];
}
