// متن صفحه‌ی «درباره ما» برای هر بخش (routine / trade / workout) روی زیردامنه‌ها.
// دامنه‌ی اصلی (section = null) هیچ‌وقت از این فایل متن نمی‌گیره: کامپوننت‌های درباره برای null همون
// متن‌های قبلی خودشون رو نگه می‌دارن. خالص و بدون import سروری؛ همه‌ی متن‌ها تابع‌ان (زبان هر درخواست).
// آیکون‌ها فقط کلید متنی‌ان و نگاشتشون به lucide در کامپوننت‌هاست.
import type { Metadata } from "next";
import { BRAND_EN, BRAND_FA, OG_BASE } from "@/lib/brand";
import { isEn, tr } from "@/lib/i18n";
import { SECTION_META, sectionOrigin, type SectionKey } from "@/lib/sections";
import { SITE_URL } from "@/lib/seo";

export type AboutIcon =
  | "routine" | "sleep" | "workout" | "calorie" | "trade" | "mentors" | "roadmap" | "nomo" | "streak"
  | "sync" | "calendar" | "clock" | "risk" | "planner" | "habit" | "notes" | "sheet" | "food";

export type AboutMock = "routine" | "streak" | "sleep" | "workout" | "calorie" | "trade" | "mentor" | "numo";

export type SectionAbout = {
  seo: { title: string; description: string; keywords: string[]; ogHeadline: string };
  hero: {
    words: string[];
    accent: string;
    sub: { pre: string; bold: string; post: string };
    trust: { free: string; secure: string; pwa: string };
    orbit: { icon: AboutIcon; label: string }[];
  };
  story: {
    title: string;
    accent: string;
    tools: { icon: AboutIcon; label: string }[];
    unified: { icon: AboutIcon; label: string }[];
    chapters: { step: string; title: string; body: string }[];
  };
  values: { title: string; body: string }[];
  inside: {
    title: string;
    accent: string;
    lead: string;
    tiles: { icon: AboutIcon; title: string; body: string; href?: string; wide?: boolean; mock?: AboutMock }[];
    soon?: { bold: string; pre: string; post: string };
  };
  faq: { q: string; a: string }[];
  final: { title: string; accent: string; sub: string };
};

const PRIVACY_VALUE = () => ({
  title: tr("حریم خصوصی پیش‌فرض", "Private by default"),
  body: tr("اطلاعاتت فروخته نمی‌شود و چت‌ها سرتاسر رمزنگاری‌شده‌اند.", "Your data is never sold and chats are end-to-end encrypted."),
});
const HONEST_VALUE = () => ({
  title: tr("بی‌ادعای اضافه", "No extra claims"),
  body: tr("هرچه در این صفحه می‌خوانی همان کاری است که اپ امروز انجام می‌دهد.", "Everything you read on this page is what the app does today."),
});
const SUPPORT_VALUE = () => ({
  title: tr("پشتیبانی واقعی", "Real support"),
  body: tr(`پیامت را خود تیم ${BRAND_FA} پاسخ می‌دهد.`, `The ${BRAND_EN} team itself answers your message.`),
});
const PERSIAN_VALUE = () => ({
  title: tr("فارسی از پایه", "Persian from the ground up"),
  body: tr("راست‌به‌چپ و با تقویم شمسی ساخته شده، نه ترجمه‌ی یک اپ خارجی.", "Built for Persian speakers with the Jalali calendar, not a translation of a foreign app."),
});

export function getSectionAbout(section: SectionKey): SectionAbout {
  const label = SECTION_META[section].label;
  if (section === "workout") {
    return {
      seo: {
        title: tr(`درباره ${BRAND_FA} ${label} | برنامه ورزشی، کالری شمار و خواب`, `About ${BRAND_EN} ${label} | workout plan, calorie counter and sleep`),
        description: tr(
          `${BRAND_FA} ${label} چیست و چرا ساخته شد: برنامه ورزشی و بدنسازی با هوش مصنوعی، ثبت تمرین ست به ست، کالری شمار فارسی، ردیابی خواب و مربی ورزش و تغذیه.`,
          `What ${BRAND_EN} ${label} is and why it was built: AI workout and bodybuilding plans, set-by-set logging, a calorie counter, sleep tracking and fitness and nutrition mentors.`,
        ),
        keywords: tr(
          "درباره آریون ورزش|برنامه بدنسازی|کالری شمار فارسی|برنامه ورزشی با هوش مصنوعی|ردیابی خواب|مربی ورزش و تغذیه",
          "about Arion Workout|bodybuilding program|calorie counter|AI workout plan|sleep tracker|fitness and nutrition mentors",
        ).split("|"),
        ogHeadline: tr("درباره ورزش آریون", "About Arion Workout"),
      },
      hero: {
        words: tr("تمرین،|تغذیه|و|خوابت،", "Your|training,|nutrition|and sleep,").split("|"),
        accent: tr("یک‌جا.", "in one place."),
        sub: {
          pre: tr(`${BRAND_FA} ${label} بخشی از آریون برای کسی است که می‌خواهد تمرین و تغذیه‌اش منظم باشد. `, `${BRAND_EN} ${label} is the part of Arion for anyone who wants their training and nutrition to be consistent. `),
          bold: tr("برنامه بدنسازی، کالری‌شمار و خواب", "A workout plan, a calorie counter and sleep tracking"),
          post: tr(" کنار هم‌اند؛ همه‌چیز فارسی و روی موبایل و کامپیوتر یکسان.", " sit side by side; everything in Persian and the same on phone and desktop."),
        },
        trust: {
          free: tr("3 روز رایگان بدنسازی و کالری‌شمار", "3 free days of workouts and the calorie counter"),
          secure: tr("چت‌های سرتاسر رمزنگاری‌شده", "End-to-end encrypted chats"),
          pwa: tr("نصب روی گوشی (PWA)", "Install on your phone (PWA)"),
        },
        orbit: [
          { icon: "workout", label: tr("بدنسازی", "Workout") },
          { icon: "calorie", label: tr("کالری", "Calories") },
          { icon: "sleep", label: tr("خواب", "Sleep") },
          { icon: "streak", label: tr("استریک", "Streak") },
          { icon: "mentors", label: tr("مربی‌ها", "Mentors") },
        ],
      },
      story: {
        title: tr(`چرا ${BRAND_FA} ${label}`, `Why was ${BRAND_EN} ${label}`),
        accent: tr("ساخته شد؟", "built?"),
        tools: [
          { icon: "workout", label: tr("اپ تمرین", "Workout app") },
          { icon: "food", label: tr("اپ کالری", "Calorie app") },
          { icon: "sleep", label: tr("اپ خواب", "Sleep app") },
          { icon: "notes", label: tr("یادداشت تمرین", "Training notes") },
        ],
        unified: [
          { icon: "workout", label: tr("تمرین", "Workout") },
          { icon: "calorie", label: tr("کالری", "Calories") },
          { icon: "sleep", label: tr("خواب", "Sleep") },
          { icon: "mentors", label: tr("مربی", "Mentor") },
        ],
        chapters: [
          {
            step: tr("مشکل", "The problem"),
            title: tr("تمرین یک جا بود، تغذیه جای دیگر.", "Training lived in one place, nutrition in another."),
            body: tr("وقتی برنامه تمرینت در یک اپ است، کالری‌هایت در اپ دیگر و ساعت خوابت در یادداشت گوشی، هیچ‌وقت نمی‌فهمی چرا پیشرفتت کند شده.", "When your workout plan is in one app, your calories in another and your sleep in a phone note, you never find out why progress slowed down."),
          },
          {
            step: tr("اصطکاک", "The friction"),
            title: tr("اپ‌هایی که غذای ما را نمی‌شناختند.", "Apps that did not know our food."),
            body: tr("بیشتر کالری‌شمارها خوراکی‌های ایرانی ندارند و حرکت‌ها را فارسی توضیح نمی‌دهند؛ ثبت یک وعده ساده می‌شد کار نیم ساعته.", "Most calorie counters lack Iranian foods and do not explain exercises in Persian; logging a simple meal became a half-hour job."),
          },
          {
            step: tr("ایده", "The idea"),
            title: tr("برنامه بساز، ست به ست ثبت کن، کالری را ببین.", "Build a plan, log set by set, see your calories."),
            body: tr(`${BRAND_FA} ${label} برای همین ساخته شد: برنامه بدنسازی با هوش مصنوعی یا دستی، ثبت تمرین با کرنومتر و کالری‌شمار با خوراکی‌های آشنا، زیر یک حساب.`, `${BRAND_EN} ${label} was built for exactly this: an AI or manual workout plan, logging with a timer and a calorie counter with familiar foods, under one account.`),
          },
          {
            step: tr("امروز", "Today"),
            title: tr("فارسی، شمسی، روی هر دستگاه.", "Persian, Jalali, on every device."),
            body: tr("کاتالوگ حرکت‌های آموزشی، هدف کالری و ماکرو بر اساس قد و وزن، ردیابی خواب و مربی ورزش و تغذیه؛ همه با تقویم شمسی.", "A catalogue of exercise tutorials, calorie and macro goals from your height and weight, sleep tracking and fitness and nutrition mentors, all with the Jalali calendar."),
          },
        ],
      },
      values: [
        PERSIAN_VALUE(),
        { title: tr("ساخته‌شده برای اجرا", "Built for doing"), body: tr("فقط برنامه‌ریزی نیست؛ هر ست و هر وعده را همان لحظه ثبت می‌کنی.", "It is not only planning; you log every set and every meal the moment it happens.") },
        { title: tr("تمرین و تغذیه کنار هم", "Training and nutrition together"), body: tr("برنامه تمرین، کالری و خواب در یک سیستم، نه سه اپ جدا.", "Your training plan, calories and sleep in one system, not three separate apps.") },
        PRIVACY_VALUE(),
        HONEST_VALUE(),
        SUPPORT_VALUE(),
      ],
      inside: {
        title: tr(`داخل ${BRAND_FA} ${label}`, `What is inside`),
        accent: tr("چه چیزهایی هست؟", `${BRAND_EN} ${label}?`),
        lead: tr("هر بخش یک ابزار کامل است، ولی همه از یک حساب و یک تقویم می‌خوانند؛ پس تصویر تمرین و تغذیه‌ات یک‌جا کنار هم می‌ماند.", "Every part is a complete tool, but all of them read from one account and one calendar, so the picture of your training and nutrition stays together."),
        tiles: [
          { icon: "workout", title: tr("برنامه‌ی بدنسازی با AI", "AI workout plan"), body: tr("برنامه‌ی تمرینی را با هوش مصنوعی یا دستی بساز و هر ست را تیک بزن.", "Build a training plan with AI or by hand and tick off every set."), href: "/bodybuilding-program", wide: true, mock: "workout" },
          { icon: "calorie", title: tr("کالری‌شمار", "Calorie counter"), body: tr("کالری و ماکروها را با پایگاه خوراکی‌های ایرانی ثبت کن و نیاز روزانه‌ات را بدان.", "Log calories and macros with a database of Iranian foods and know your daily need."), href: "/calorie-counter", mock: "calorie" },
          { icon: "sleep", title: tr("پیگیری خواب", "Sleep tracking"), body: tr("ساعت خواب و بیداری هر شب را ثبت کن و الگوی خوابت را ببین.", "Log your bedtime and wake-up time each night and see your sleep pattern."), mock: "sleep" },
          { icon: "streak", title: tr("استریک و ثبات", "Streaks and consistency"), body: tr("زنجیره‌ی روزهای موفق پشت‌سرهم؛ 8 سطح، از 1 تا 365 روز.", "A chain of successful days in a row; 8 levels, from 1 to 365 days."), mock: "streak" },
          { icon: "mentors", title: tr("مربی ورزش و تغذیه", "Fitness and nutrition mentors"), body: tr("مربی احراز هویت‌شده، دریافت برنامه و چت‌های سرتاسر رمزنگاری‌شده.", "Identity-verified mentors, plans delivered to you and end-to-end encrypted chats."), href: "/mentors", wide: true, mock: "mentor" },
        ],
      },
      faq: [
        { q: tr(`${BRAND_FA} ${label} چه کاری انجام می‌دهد؟`, `What does ${BRAND_EN} ${label} do?`), a: tr("برنامه ورزشی و بدنسازی می‌سازد، تمرین را ست به ست ثبت می‌کند، کالری و ماکروهای روزانه را حساب می‌کند و خواب و استریکت را دنبال می‌کند.", "It builds workout and bodybuilding plans, logs training set by set, calculates daily calories and macros and follows your sleep and streak.") },
        { q: tr("برنامه تمرینی را چطور بسازم؟", "How do I build a workout plan?"), a: tr("قد، وزن، هدف و امکاناتت (باشگاه یا خانه) را می‌گویی و هوش مصنوعی برنامه را می‌سازد؛ می‌توانی دستی هم بچینی.", "You give your height, weight, goal and equipment (gym or home) and AI builds the plan; you can also arrange it by hand.") },
        { q: tr("کالری‌شمار خوراکی‌های ایرانی دارد؟", "Does the calorie counter have Iranian foods?"), a: tr("بله، پایگاه خوراکی‌ها غذاهای ایرانی و جهانی را دارد و مقدار هر وعده را با گرم ثبت می‌کنی.", "Yes, the food database includes Iranian and international foods and you log each meal in grams.") },
        { q: tr("آیا رایگان است؟", "Is it free?"), a: tr("ثبت‌نام رایگان است. بدنسازی و کالری‌شمار برای هر حساب تازه 3 روز با استفاده‌ی محدود از هوش مصنوعی باز است و بعد از آن اشتراکی است.", "Sign-up is free. Workouts and the calorie counter are open for 3 days on every new account with limited AI use, and subscription-based after that.") },
      ],
      final: {
        title: tr("از امروز،", "From today,"),
        accent: tr("تمرین کن.", "train."),
        sub: tr("بدنسازی و کالری‌شمار برای هر حساب تازه 3 روز رایگان است؛ هدفت را بگو و از همین امروز شروع کن.", "Workouts and the calorie counter are free for 3 days on every new account; tell it your goal and start today."),
      },
    };
  }
  if (section === "trade") {
    return {
      seo: {
        title: tr(`درباره ${BRAND_FA} ${label} | ژورنال ترید و تقویم اقتصادی`, `About ${BRAND_EN} ${label} | trading journal and economic calendar`),
        description: tr(
          `${BRAND_FA} ${label} چیست و چرا ساخته شد: ژورنال ترید فارسی با چند حساب، اتصال خودکار MT4 و MT5 بدون رمز حساب، چک لیست ورود، تقویم اقتصادی فارکس و مربی ترید.`,
          `What ${BRAND_EN} ${label} is and why it was built: a trading journal with multiple accounts, automatic MT4 and MT5 sync without your account password, an entry checklist, a forex economic calendar and trading mentors.`,
        ),
        keywords: tr(
          "درباره آریون ترید|ژورنال ترید|ژورنال معاملاتی|اتصال متاتریدر|تقویم اقتصادی فارکس|ساعت بازار فارکس|مربی ترید",
          "about Arion Trade|trading journal|forex journal|MetaTrader sync|forex economic calendar|forex market hours|trading mentors",
        ).split("|"),
        ogHeadline: tr("درباره ترید آریون", "About Arion Trade"),
      },
      hero: {
        words: tr("معاملاتت|را", "Your|trading,").split("|"),
        accent: tr("شفاف ببین.", "made clear."),
        sub: {
          pre: tr(`${BRAND_FA} ${label} بخشی از آریون برای تریدری است که می‌خواهد عملکردش را بشناسد. `, `${BRAND_EN} ${label} is the part of Arion for traders who want to understand their own performance. `),
          bold: tr("ژورنال، اتصال متاتریدر و تقویم اقتصادی", "A journal, MetaTrader sync and an economic calendar"),
          post: tr(" کنار هم‌اند؛ همه‌چیز فارسی و بدون نیاز به رمز حساب معاملاتی.", " sit side by side; everything in Persian and without needing your trading account password."),
        },
        trust: {
          free: tr("3 روز رایگان ژورنال ترید", "3 free days of the trading journal"),
          secure: tr("MT4 و MT5 بدون رمز حساب", "MT4 and MT5 without your account password"),
          pwa: tr("نصب روی گوشی (PWA)", "Install on your phone (PWA)"),
        },
        orbit: [
          { icon: "trade", label: tr("ژورنال", "Journal") },
          { icon: "sync", label: tr("متاتریدر", "MetaTrader") },
          { icon: "calendar", label: tr("تقویم اقتصادی", "Calendar") },
          { icon: "risk", label: tr("ریسک", "Risk") },
          { icon: "mentors", label: tr("مربی‌ها", "Mentors") },
        ],
      },
      story: {
        title: tr(`چرا ${BRAND_FA} ${label}`, `Why was ${BRAND_EN} ${label}`),
        accent: tr("ساخته شد؟", "built?"),
        tools: [
          { icon: "sheet", label: tr("اکسل معاملات", "Trades spreadsheet") },
          { icon: "calendar", label: tr("سایت تقویم", "Calendar site") },
          { icon: "clock", label: tr("ساعت سشن‌ها", "Session clock") },
          { icon: "risk", label: tr("ماشین‌حساب ریسک", "Risk calculator") },
        ],
        unified: [
          { icon: "trade", label: tr("ژورنال", "Journal") },
          { icon: "calendar", label: tr("تقویم", "Calendar") },
          { icon: "clock", label: tr("سشن‌ها", "Sessions") },
          { icon: "mentors", label: tr("مربی", "Mentor") },
        ],
        chapters: [
          {
            step: tr("مشکل", "The problem"),
            title: tr("معاملات در اکسل، خبرها در سایت دیگر.", "Trades in a spreadsheet, news on another site."),
            body: tr("وقتی معاملاتت در یک فایل اکسل است، تقویم اقتصادی در یک سایت و چک‌لیستت در ذهنت، هیچ‌وقت نمی‌فهمی کجا و چرا ضرر می‌کنی.", "When your trades are in a spreadsheet, the economic calendar on a site and your checklist in your head, you never learn where and why you lose."),
          },
          {
            step: tr("اصطکاک", "The friction"),
            title: tr("ثبت دستی و رمز حساب.", "Manual entry and account passwords."),
            body: tr("ثبت دستی هر معامله خسته‌کننده است و بعضی ابزارها رمز حساب معاملاتی را می‌خواهند؛ چیزی که نباید به هیچ سرویسی داد.", "Entering every trade by hand is tedious and some tools ask for your trading account password, which you should never give to any service."),
          },
          {
            step: tr("ایده", "The idea"),
            title: tr("وصل کن، بررسی کن، تحلیل کن.", "Connect, check, analyze."),
            body: tr(`${BRAND_FA} ${label} برای همین ساخته شد: معاملات از متاتریدر خودکار می‌آیند، چک‌لیست لحظه‌ی ورود ذخیره می‌شود و آمار هر حساب جدا دیده می‌شود.`, `${BRAND_EN} ${label} was built for exactly this: trades come in automatically from MetaTrader, the checklist is saved at the moment of entry and each account's statistics are seen separately.`),
          },
          {
            step: tr("امروز", "Today"),
            title: tr("فارسی، به وقت ایران، بدون رمز حساب.", "Persian, in Tehran time, without your password."),
            body: tr("ژورنال چند حسابی، اتصال MT4 و MT5 فقط با کد اتصال، تقویم اقتصادی 9 ارز اصلی، ساعت سشن‌های فارکس و مربی ترید.", "A multi-account journal, MT4 and MT5 sync with only a connection code, an economic calendar for 9 major currencies, forex session hours and trading mentors."),
          },
        ],
      },
      values: [
        PERSIAN_VALUE(),
        { title: tr("انضباط، نه فقط آمار", "Discipline, not just statistics"), body: tr("چک‌لیست ورود لحظه‌ی ثبت معامله ذخیره می‌شود تا ببینی قانون‌هایت را رعایت کرده‌ای یا نه.", "The entry checklist is saved at the moment you log a trade so you can see whether you followed your own rules.") },
        { title: tr("رمز حساب هرگز خواسته نمی‌شود", "Your password is never requested"), body: tr("اتصال متاتریدر فقط با کد اتصال و اکسپرت انجام می‌شود و رمز حساب معاملاتی ذخیره نمی‌شود.", "MetaTrader connects only with a connection code and an Expert Advisor, and no trading account password is stored.") },
        PRIVACY_VALUE(),
        HONEST_VALUE(),
        SUPPORT_VALUE(),
      ],
      inside: {
        title: tr(`داخل ${BRAND_FA} ${label}`, `What is inside`),
        accent: tr("چه چیزهایی هست؟", `${BRAND_EN} ${label}?`),
        lead: tr("هر بخش یک ابزار کامل است، ولی همه از یک حساب می‌خوانند؛ پس تصویر معاملاتت یک‌جا کنار هم می‌ماند.", "Every part is a complete tool, but all of them read from one account, so the picture of your trading stays together."),
        tiles: [
          { icon: "trade", title: tr("ژورنال ترید", "Trading journal"), body: tr("معاملات هر حساب با آمار، نرخ برد، سود و زیان و چک‌لیست پیش از ورود.", "Trades for every account with statistics, win rate, profit and loss and a pre-entry checklist."), href: "/trading-journal", wide: true, mock: "trade" },
          { icon: "sync", title: tr("همگام‌سازی متاتریدر", "MetaTrader sync"), body: tr("اکسپرت MT4 و MT5 معاملات را خودکار می‌فرستد؛ فقط کد اتصال لازم است، نه رمز حساب.", "The MT4 and MT5 Expert Advisor sends trades automatically; you only need a connection code, not your account password.") },
          { icon: "calendar", title: tr("تقویم اقتصادی", "Economic calendar"), body: tr("خبرهای 9 ارز اصلی با Actual، Forecast و Previous و شمارش معکوس.", "News for 9 major currencies with Actual, Forecast and Previous, and a countdown."), href: "/economic-calendar" },
          { icon: "clock", title: tr("ساعت بازار فارکس", "Forex market hours"), body: tr("سشن‌های بازار به وقت ایران با درنظرگرفتن تغییر ساعت تابستانی.", "Market sessions in Tehran time with daylight saving taken into account."), href: "/forex-sessions" },
          { icon: "risk", title: tr("ماشین‌حساب ریسک", "Risk calculator"), body: tr("حجم لات را از ریسک درصدی و فاصله‌ی حد ضرر حساب کن.", "Work out lot size from your percentage risk and stop-loss distance.") },
          { icon: "mentors", title: tr("مربی ترید", "Trading mentors"), body: tr("مربی احراز هویت‌شده، دریافت برنامه و چت‌های سرتاسر رمزنگاری‌شده.", "Identity-verified mentors, plans delivered to you and end-to-end encrypted chats."), href: "/mentors", wide: true, mock: "mentor" },
        ],
      },
      faq: [
        { q: tr(`${BRAND_FA} ${label} چه کاری انجام می‌دهد؟`, `What does ${BRAND_EN} ${label} do?`), a: tr("معاملات حساب‌هایت را ثبت و تحلیل می‌کند، با MT4 و MT5 همگام می‌شود و تقویم اقتصادی، ساعت سشن‌ها و ماشین‌حساب ریسک را کنار ژورنال می‌گذارد.", "It logs and analyzes the trades of your accounts, syncs with MT4 and MT5 and puts the economic calendar, session hours and a risk calculator beside the journal.") },
        { q: tr("آیا رمز حساب معاملاتی لازم است؟", "Do you need my trading account password?"), a: tr("نه. اتصال فقط با کد اتصال و اکسپرت انجام می‌شود و رمز حساب هیچ‌وقت خواسته یا ذخیره نمی‌شود.", "No. Connection uses only a connection code and the Expert Advisor, and your account password is never requested or stored.") },
        { q: tr("می‌توانم چند حساب داشته باشم؟", "Can I have several accounts?"), a: tr("بله، هر حساب معاملاتی آمار و معاملات جدا دارد و می‌توانی همه را با هم هم ببینی.", "Yes, each trading account has its own statistics and trades and you can also see them all together.") },
        { q: tr("آیا رایگان است؟", "Is it free?"), a: tr("ثبت‌نام رایگان است. ژورنال ترید برای هر حساب تازه 3 روز باز است و بعد از آن اشتراکی است.", "Sign-up is free. The trading journal is open for 3 days on every new account and subscription-based after that.") },
      ],
      final: {
        title: tr("از امروز،", "From today,"),
        accent: tr("تحلیل کن.", "analyze."),
        sub: tr("ژورنال ترید برای هر حساب تازه 3 روز رایگان است؛ حسابت را وصل کن و معاملاتت را تحلیل کن.", "The trading journal is free for 3 days on every new account; connect your account and analyze your trades."),
      },
    };
  }
  return {
    seo: {
      title: tr(`درباره ${BRAND_FA} ${label} | روتین روزانه، خواب و رودمپ`, `About ${BRAND_EN} ${label} | daily routine, sleep and roadmaps`),
      description: tr(
        `${BRAND_FA} ${label} چیست و چرا ساخته شد: برنامه ریزی روزانه و هفتگی با تقویم شمسی، پیگیری عادت و استریک، ردیابی خواب، رودمپ یادگیری و مربی روتین.`,
        `What ${BRAND_EN} ${label} is and why it was built: daily and weekly planning with the Jalali calendar, habit and streak tracking, sleep tracking, learning roadmaps and routine mentors.`,
      ),
      keywords: tr(
        "درباره آریون روتین|روتین اپ|برنامه ریزی روزانه|پیگیری عادت|استریک|ردیابی خواب|رودمپ یادگیری",
        "about Arion Routine|routine app|daily planner|habit tracker|streak|sleep tracker|learning roadmap",
      ).split("|"),
      ogHeadline: tr("درباره روتین آریون", "About Arion Routine"),
    },
    hero: {
      words: tr("روتینی|که|واقعا", "A|routine|that|actually").split("|"),
      accent: tr("اجرا می‌شود.", "gets done."),
      sub: {
        pre: tr(`${BRAND_FA} ${label} بخشی از آریون برای نظم‌دادن به روزهایت است. `, `${BRAND_EN} ${label} is the part of Arion for bringing order to your days. `),
        bold: tr("برنامه روزانه، عادت، خواب و رودمپ", "A daily plan, habits, sleep and roadmaps"),
        post: tr(" کنار هم‌اند؛ همه‌چیز فارسی، با تقویم شمسی، و روی موبایل و کامپیوتر یکسان.", " sit side by side; everything in Persian, with the Jalali calendar, and the same on phone and desktop."),
      },
      trust: {
        free: tr("«روتین من» 14 روز رایگان", "My Routine free for 14 days"),
        secure: tr("چت‌های سرتاسر رمزنگاری‌شده", "End-to-end encrypted chats"),
        pwa: tr("نصب روی گوشی (PWA)", "Install on your phone (PWA)"),
      },
      orbit: [
        { icon: "routine", label: tr("روتین", "Routine") },
        { icon: "sleep", label: tr("خواب", "Sleep") },
        { icon: "streak", label: tr("استریک", "Streak") },
        { icon: "nomo", label: tr("نومو", "Nomo") },
        { icon: "roadmap", label: tr("رودمپ", "Roadmaps") },
        { icon: "mentors", label: tr("مربی‌ها", "Mentors") },
      ],
    },
    story: {
      title: tr(`چرا ${BRAND_FA} ${label}`, `Why was ${BRAND_EN} ${label}`),
      accent: tr("ساخته شد؟", "built?"),
      tools: [
        { icon: "planner", label: tr("اپ برنامه‌ریزی", "Planner app") },
        { icon: "habit", label: tr("اپ عادت", "Habit app") },
        { icon: "sleep", label: tr("اپ خواب", "Sleep app") },
        { icon: "notes", label: tr("یادداشت‌ها", "Notes") },
      ],
      unified: [
        { icon: "routine", label: tr("روتین", "Routine") },
        { icon: "sleep", label: tr("خواب", "Sleep") },
        { icon: "roadmap", label: tr("رودمپ", "Roadmap") },
        { icon: "mentors", label: tr("مربی", "Mentor") },
      ],
      chapters: [
        {
          step: tr("مشکل", "The problem"),
          title: tr("ابزار کم نبود؛ پخش‌بودن ابزارها بود.", "There was no shortage of tools; they were scattered."),
          body: tr("وقتی برنامه‌ی هفتگی‌ات در یک اپ است، عادت‌هایت در اپ دیگر و ساعت خوابت در یادداشت گوشی، هیچ‌وقت تصویر کاملی از اینکه هفته‌ات چطور گذشته نداری.", "When your weekly plan is in one app, your habits in another and your sleep in a phone note, you never get a full picture of how your week went."),
        },
        {
          step: tr("اصطکاک", "The friction"),
          title: tr("اپ‌هایی که برای ما ساخته نشده بودند.", "Apps that were not built for us."),
          body: tr("بیشتر اپ‌های این حوزه انگلیسی‌اند و با تقویم میلادی کار می‌کنند؛ برای کاربر فارسی‌زبان یعنی هر روز یک اصطکاک کوچک.", "Most apps in this space are English-only and use the Gregorian calendar; for a Persian-speaking user that means a small friction every day."),
        },
        {
          step: tr("ایده", "The idea"),
          title: tr("برنامه بچین، تیک بزن، پیشرفتت را ببین.", "Plan, tick, see your progress."),
          body: tr(`${BRAND_FA} ${label} برای همین ساخته شد: برنامه روزانه و هفتگی، عادت، خواب و رودمپ کنار هم و زیر یک حساب.`, `${BRAND_EN} ${label} was built for exactly this: daily and weekly plans, habits, sleep and roadmaps side by side under one account.`),
        },
        {
          step: tr("امروز", "Today"),
          title: tr("فارسی، شمسی، روی هر دستگاه.", "Persian, Jalali, on every device."),
          body: tr("روتین روزانه و هفتگی، استریک، خواب و چرخه‌های خواب، مدیر برنامه هوشمند «نومو»، آنالیز هفتگی و مربی روتین؛ با تقویم شمسی.", "Daily and weekly routine, streaks, sleep and sleep cycles, the smart plan manager Nomo, a weekly review and routine mentors, with the Jalali calendar."),
        },
      ],
    },
    values: [
      PERSIAN_VALUE(),
      { title: tr("ساخته‌شده برای اجرا", "Built for doing"), body: tr("فقط برای برنامه‌ریزی نیست؛ اجرای روزانه و پیشرفتت را هم دنبال می‌کند.", "It is not only for planning; it also follows your daily execution and progress.") },
      { title: tr("روتین کامل، یک‌جا", "A complete routine, in one place"), body: tr("برنامه روزانه، هفتگی، خواب و رودمپ را در یک سیستم مدیریت کن.", "Manage your daily and weekly plans, sleep and roadmaps in one system.") },
      PRIVACY_VALUE(),
      HONEST_VALUE(),
      SUPPORT_VALUE(),
    ],
    inside: {
      title: tr(`داخل ${BRAND_FA} ${label}`, `What is inside`),
      accent: tr("چه چیزهایی هست؟", `${BRAND_EN} ${label}?`),
      lead: tr("هر بخش یک ابزار کامل است، ولی همه از یک حساب و یک تقویم می‌خوانند؛ پس تصویر روزت یک‌جا کنار هم می‌ماند.", "Every part is a complete tool, but all of them read from one account and one calendar, so the picture of your day stays together."),
      tiles: [
        { icon: "routine", title: tr("روتین روزانه و هفتگی", "Daily and weekly routine"), body: tr("روتینت را برای روز و هفته بچین، کارها را همان لحظه تیک بزن و روند پایبندی‌ات را ببین.", "Lay out your routine for the day and week, tick tasks off the moment you do them and watch your consistency."), href: "/routine", wide: true, mock: "routine" },
        { icon: "streak", title: tr("استریک و ثبات", "Streaks and consistency"), body: tr("زنجیره‌ی روزهای کامل پشت‌سرهم؛ 8 سطح، از 1 تا 365 روز.", "A chain of full days in a row; 8 levels, from 1 to 365 days."), href: "/habit-tracker", mock: "streak" },
        { icon: "sleep", title: tr("پیگیری خواب", "Sleep tracking"), body: tr("ساعت خواب و بیداری هر شب را ثبت کن و الگوی خوابت را ببین.", "Log your bedtime and wake-up time each night and see your sleep pattern."), mock: "sleep" },
        { icon: "mentors", title: tr("مربی روتین", "Routine mentors"), body: tr("مربی احراز هویت‌شده، دریافت برنامه و چت‌های سرتاسر رمزنگاری‌شده.", "Identity-verified mentors, plans delivered to you and end-to-end encrypted chats."), href: "/mentors", wide: true, mock: "mentor" },
        { icon: "nomo", title: tr("«نومو»، مدیر برنامه هوشمند", "Nomo, the smart plan manager"), body: tr("به فارسی بنویس چه می‌خواهی تا برنامه‌های روتینت را بسازد یا جابه‌جا کند.", "Write in plain language what you want and it will create or move your routine plans."), href: "/ai-planner", wide: true, mock: "numo" },
      ],
      soon: {
        pre: tr("و در راه: ", "Coming soon: "),
        bold: tr("رودمپ یادگیری با کمک هوش مصنوعی", "an AI-assisted learning roadmap"),
        post: tr("، که به‌زودی برای عموم کاربران باز می‌شود.", ", which will open to all users shortly."),
      },
    },
    faq: [
      { q: tr(`${BRAND_FA} ${label} چه کاری انجام می‌دهد؟`, `What does ${BRAND_EN} ${label} do?`), a: tr("برنامه روزانه و هفتگی با تقویم شمسی می‌سازد، عادت و استریکت را دنبال می‌کند، خوابت را ثبت می‌کند و آنالیز هفتگی می‌دهد.", "It builds daily and weekly plans with the Jalali calendar, follows your habits and streak, logs your sleep and gives a weekly review.") },
      { q: tr("نومو چیست؟", "What is Nomo?"), a: tr("نومو مدیر برنامه هوشمند است؛ به فارسی می‌نویسی چه می‌خواهی و برنامه‌های روتینت را می‌سازد یا جابه‌جا می‌کند.", "Nomo is the smart plan manager; you write in plain language what you want and it creates or moves your routine plans.") },
      { q: tr("استریک چطور حساب می‌شود؟", "How is the streak calculated?"), a: tr("زنجیره‌ی روزهای کامل پشت‌سرهم از دیروز به عقب، و امروز هم همان لحظه‌ای که کامل شد.", "It is the chain of full days in a row going back from yesterday, and today counts the moment it is complete.") },
      { q: tr("آیا رایگان است؟", "Is it free?"), a: tr("ثبت‌نام رایگان است و «روتین من» برای هر حساب تازه 14 روز رایگان است؛ بعد از آن اشتراکی است.", "Sign-up is free and My Routine is free for 14 days on every new account; subscription-based after that.") },
    ],
    final: {
      title: tr("از امروز،", "From today,"),
      accent: tr("اجرا کن.", "do it."),
      sub: tr("«روتین من» برای هر حساب تازه 14 روز رایگان است؛ روتینت را بچین و از همین امروز اجرا کن.", "My Routine is free for 14 days for every new account; lay out your routine and start today."),
    },
  };
}

// ─── متادیتا و JSON-LD ──────────────────────────────────────────────────────

/** origin میزبان (بخش میزبان، نه بخش موثر کاربر)؛ دامنه‌ی اصلی یا زیردامنه‌ها خاموش = SITE_URL */
function origin(hostSection: SectionKey | null): string {
  return (hostSection && sectionOrigin(hostSection)) || SITE_URL;
}

/**
 * متادیتای /about وقتی بخش موثر `section` ست شده. متن از بخش موثر، ولی canonical و og:url و فید از
 * میزبان (hostSection = getHostSection()) تا کوکی کاربر آدرس‌های سئو رو عوض نکنه.
 */
export function sectionAboutMetadata(section: SectionKey, hostSection: SectionKey | null = section): Metadata {
  const en = isEn();
  const { seo } = getSectionAbout(section);
  const o = origin(hostSection);
  const url = `${o}/about`;
  const image = { url: `${o}/about/opengraph-image`, width: 1200, height: 630, alt: seo.ogHeadline };
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: url,
      languages: { [en ? "en" : "fa-IR"]: url, "x-default": url },
      types: { "application/rss+xml": `${o}/blog/feed.xml` },
    },
    openGraph: { ...OG_BASE, locale: en ? "en_US" : OG_BASE.locale, images: [image], url, title: seo.ogHeadline, description: seo.description },
    twitter: { card: "summary_large_image", title: seo.ogHeadline, description: seo.description, images: [image.url] },
  };
}

/** BreadcrumbList بخش: آدرس‌ها روی میزبان */
export function sectionAboutBreadcrumb(section: SectionKey, hostSection: SectionKey | null = section): Record<string, unknown> {
  const o = origin(hostSection);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: tr(`${BRAND_FA} ${SECTION_META[section].label}`, `${BRAND_EN} ${SECTION_META[section].label}`), item: o },
      { "@type": "ListItem", position: 2, name: tr("درباره", "About"), item: `${o}/about` },
    ],
  };
}
