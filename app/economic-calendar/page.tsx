import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `تقویم اقتصادی فارکس به وقت ایران | تقویم شمسی رویدادهای اقتصادی | ${BRAND_FA}`,
      `Forex economic calendar, Tehran time | Jalali calendar of economic events | ${brand}`,
    ),
    description: tr(
      `تقویم اقتصادی فارکس ${BRAND_FA} با تاریخ شمسی و فیلتر بر اساس ارز و میزان تاثیر — ` +
        `رویدادهای مهم اقتصادی، Actual/Forecast/Previous و یادآوری قبل از انتشار.`,
      `The ${brand} forex economic calendar with Jalali dates and filters by currency and impact: major economic events, Actual/Forecast/Previous and reminders before release.`,
    ),
    path: "/economic-calendar",
    ownOgImage: true,
    ogTitle: tr(`تقویم اقتصادی فارکس | ${BRAND_FA}`, `Forex economic calendar | ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("تقویم اقتصادی فارکس چیست؟", "What is a forex economic calendar?"),
      a: tr(
        "فهرستی از رویدادهای اقتصادی مهم (مثل نرخ بهره، تورم، اشتغال) که زمان انتشارشان از قبل مشخص است. این رویدادها معمولا نوسان قیمتی زیادی در جفت‌ارزهای مرتبط ایجاد می‌کنند، پس تریدرها از قبل زمان‌شان را می‌دانند.",
        "A list of major economic events (such as interest rates, inflation and employment) whose release times are known in advance. These events usually cause large price moves in related currency pairs, so traders know their timing ahead of time.",
      ),
    },
    {
      q: tr("چرا تقویم مستقیم از یک سایت خارجی نمایش داده نمی‌شود؟", "Why isn't the calendar shown directly from an external site?"),
      a: tr(
        "به دلایل امنیتی، مرورگر فقط با سرورهای مشخصی ارتباط برقرار می‌کند و اتصال مستقیم به یک سرویس خارجی از داخل مرورگر باز نیست. به‌جایش، رویدادها در جدول خودمان ذخیره و هر روز به‌روزرسانی می‌شوند، بعد از همان‌جا نمایش داده می‌شوند.",
        "For security reasons, the browser only connects to specific servers, and a direct connection to an external service from inside the browser isn't open. Instead, events are stored in our own table, updated every day, and shown from there.",
      ),
    },
    {
      q: tr("داده‌ها از کجا می‌آیند؟", "Where does the data come from?"),
      a: tr(
        "رویدادها به‌صورت خودکار از یک منبع معتبر تقویم اقتصادی همگام‌سازی می‌شوند و علاوه‌بر آن، امکان ورود دستی هم وجود دارد — تا این تقویم هیچ‌وقت به‌خاطر قطعی یک سرویس بیرونی خالی نماند.",
        "Events are synced automatically from a reliable economic calendar source, and manual entry is also possible, so this calendar never goes empty because an outside service is down.",
      ),
    },
    {
      q: tr("Actual و Forecast و Previous یعنی چه؟", "What do Actual, Forecast and Previous mean?"),
      a: tr(
        "Forecast (پیش‌بینی) عددی است که قبل از انتشار رویداد تخمین زده می‌شود، Previous مقدار دوره‌ی قبل است، و Actual همان عدد واقعی است که در لحظه‌ی انتشار اعلام می‌شود. فاصله‌ی Actual از Forecast معمولا واکنش بازار را تعیین می‌کند.",
        "Forecast is the number estimated before the event is released, Previous is the value from the last period, and Actual is the real number announced at the moment of release. The gap between Actual and Forecast usually determines the market's reaction.",
      ),
    },
    {
      q: tr("می‌شود فقط رویدادهای یک ارز خاص را دید؟", "Can I see only the events for one currency?"),
      a: tr(
        "بله، تقویم قابل فیلتر بر اساس ارز (دلار، یورو، پوند، ین و بقیه‌ی ارزهای اصلی فارکس) و میزان تاثیر (بالا، متوسط، کم) است.",
        "Yes. The calendar can be filtered by currency (dollar, euro, pound, yen and the other major forex currencies) and by impact (high, medium, low).",
      ),
    },
    {
      q: tr("آیا می‌شود قبل از انتشار یک رویداد یادآوری گرفت؟", "Can I get a reminder before an event is released?"),
      a: tr(
        "بله، برای رویدادهای مهم می‌توانی یادآوری فعال کنی تا قبل از زمان انتشار به تو اطلاع داده شود — مفید برای وقتی که می‌خواهی قبل از یک خبر پرنوسان از بازار خارج شوی یا معامله‌ی جدید باز نکنی.",
        "Yes. For important events you can turn on a reminder so you're notified before the release time. It's useful when you want to leave the market before a volatile news event or hold off on opening a new trade.",
      ),
    },
    {
      q: tr("تقویم اقتصادی رایگان است؟", "Is the economic calendar free?"),
      a: tr(
        "تقویم اقتصادی بخشی از ژورنال ترید است که جزو ماژول‌های اشتراکی محسوب می‌شود. هر حساب تازه 3 روز دسترسی به بدنسازی، کالری‌شمار و ژورنال ترید، با استفاده‌ی محدود از هوش مصنوعی می‌گیرد.",
        "The economic calendar is part of the trading journal, which is a subscription module. Every new account gets 3 days of access to workouts, the calorie counter and the trading journal, with limited use of AI.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("تقویم اقتصادی", "Economic calendar"), path: "/economic-calendar" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function EconomicCalendarPage() {
  const { faqs, breadcrumb: BREADCRUMB, brand } = content();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd(BREADCRUMB), faqJsonLd(faqs), softwareApplicationJsonLd()]),
        }}
      />
      <SeoLanding
        breadcrumb={BREADCRUMB}
        h1={tr(`تقویم اقتصادی فارکس به وقت ایران — ${BRAND_FA}`, `Forex economic calendar, Tehran time — ${brand}`)}
        lead={tr(
          `${BRAND_FA} رویدادهای اقتصادی مهم فارکس را با نوار روزهای شمسی، فیلتر بر اساس ارز ` +
            `و میزان تاثیر، و یادآوری قبل از انتشار نمایش می‌دهد. این صفحه توضیح می‌دهد تقویم اقتصادی چیست ` +
            `و چطور می‌شود از آن برای برنامه‌ریزی روز معاملاتی استفاده کرد.`,
          `${brand} shows the major forex economic events with a strip of Jalali days, filters by currency and impact, and reminders before release. This page explains what an economic calendar is and how to use it to plan your trading day.`,
        )}
        ctaNote={tr("3 روز آزمایشی رایگان", "3 days free trial")}
        sections={[
          {
            title: tr("چرا تقویم اقتصادی برای تریدر مهم است؟", "Why does an economic calendar matter to traders?"),
            paragraphs: [
              tr(
                "بخش زیادی از نوسان‌های بزرگ بازار فارکس، تصادفی نیستند — درست هم‌زمان با انتشار یک داده‌ی اقتصادی مهم (مثل تصمیم نرخ بهره یا گزارش اشتغال آمریکا) اتفاق می‌افتند. دانستن زمان دقیق این رویدادها یعنی می‌توانی از قبل تصمیم بگیری: معامله را قبل از خبر ببندی، حجم را کم کنی، یا آماده‌ی نوسان بیشتر باشی.",
                "Many of the big swings in the forex market are not random. They happen right when an important economic figure is released (such as an interest rate decision or the US jobs report). Knowing the exact timing of these events means you can decide in advance: close a trade before the news, reduce your size, or be ready for more volatility.",
              ),
              tr(
                "بدون تقویم، این نوسان‌ها غافلگیرکننده به‌نظر می‌رسند؛ با تقویم، بخشی قابل‌پیش‌بینی می‌شوند.",
                "Without a calendar, these moves seem like surprises. With one, part of them becomes predictable.",
              ),
            ],
          },
          {
            title: tr("میزان تاثیر رویدادها", "How much impact events have"),
            bullets: [
              {
                title: tr("تاثیر بالا", "High impact"),
                body: tr("رویدادهایی مثل تصمیم نرخ بهره، تورم (CPI) و گزارش اشتغال — معمولا بیشترین نوسان قیمتی را ایجاد می‌کنند.", "Events such as interest rate decisions, inflation (CPI) and the employment report usually cause the largest price moves."),
              },
              {
                title: tr("تاثیر متوسط", "Medium impact"),
                body: tr("داده‌های اقتصادی مهم ولی با اثر محدودتر روی بازار، مثل شاخص‌های تولید یا اعتماد مصرف‌کننده.", "Important economic data with a more limited effect on the market, such as production indices or consumer confidence."),
              },
              {
                title: tr("تاثیر کم", "Low impact"),
                body: tr("داده‌های فرعی‌تر که معمولا واکنش کوتاه‌مدت کمی دارند.", "Less central data that usually produces only a small short-term reaction."),
              },
            ],
          },
          {
            title: tr(`تقویم اقتصادی ${BRAND_FA} چه امکاناتی دارد؟`, `What does the ${brand} economic calendar offer?`),
            bullets: [
              {
                title: tr("نوار روزهای شمسی", "Strip of Jalali days"),
                body: tr("حرکت بین روزها با تقویم جلالی، در کنار نمایش تاریخ میلادی خود رویداد.", "Move between days using the Jalali calendar, alongside the Gregorian date of each event."),
              },
              {
                title: tr("فیلتر ارز و تاثیر", "Currency and impact filters"),
                body: tr("فقط رویدادهای دلار، یورو یا هر ارز اصلی دیگر، یا فقط رویدادهای تاثیر بالا را ببین.", "Only see dollar, euro or any other major currency events, or only the high-impact events."),
              },
              {
                title: tr("Actual / Forecast / Previous", "Actual / Forecast / Previous"),
                body: tr("بلافاصله بعد از انتشار، عدد واقعی کنار پیش‌بینی و مقدار دوره‌ی قبل نمایش داده می‌شود.", "Right after release, the actual figure is shown next to the forecast and the previous period's value."),
              },
              {
                title: tr("یادآوری قبل از انتشار", "Reminder before release"),
                body: tr("برای رویدادهای مهم می‌توانی از قبل یادآوری فعال کنی.", "For important events you can turn on a reminder in advance."),
              },
              {
                title: tr("تاریخچه", "History"),
                body: tr("رویدادهای هفته‌های گذشته هم قابل مرور هستند، برای دیدن اینکه یک خبر چطور بازار را حرکت داد.", "Events from past weeks can also be reviewed, to see how a piece of news moved the market."),
              },
            ],
          },
          {
            title: tr("چطور از تقویم اقتصادی در روز معاملاتی استفاده کنیم؟", "How to use the economic calendar on a trading day"),
            bullets: [
              {
                title: tr("1. صبح روز معاملاتی را چک کن", "1. Check the calendar in the morning"),
                body: tr("قبل از باز کردن هر معامله، ببین امروز رویداد تاثیر بالایی برای جفت‌ارز موردنظرت هست یا نه.", "Before opening any trade, check whether there's a high-impact event today for the pair you're looking at."),
              },
              {
                title: tr("2. حجم را حول رویدادهای مهم کم کن", "2. Reduce size around major events"),
                body: tr("نوسان شدید لحظه‌ی انتشار، حد ضررهای معمولی را بی‌معنی می‌کند.", "The sharp swings at the moment of release can make normal stop losses meaningless."),
              },
              {
                title: tr("3. فاصله‌ی Actual از Forecast را ببین", "3. Look at the gap between Actual and Forecast"),
                body: tr("هرچه این فاصله بیشتر باشد، واکنش بازار معمولا شدیدتر است.", "The bigger the gap, the stronger the market's reaction usually is."),
              },
              {
                title: tr("4. تقویم را با ساعت بازار ترکیب کن", "4. Combine the calendar with market hours"),
                body: tr("بیشتر رویدادهای مهم دلاری و یورویی، هم‌زمان با سشن لندن یا نیویورک منتشر می‌شوند.", "Most major dollar and euro events are released during the London or New York session."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره تقویم اقتصادی", "Frequently asked questions about the economic calendar")}
        related={[
          {
            href: "/forex-sessions",
            label: tr("ساعت بازار فارکس", "Forex market hours"),
            note: tr("سشن‌های معاملاتی و بهترین ساعت‌های نقدینگی، به وقت تهران.", "Trading sessions and the best liquidity hours, in Tehran time."),
          },
          {
            href: "/trading-journal",
            label: tr("ژورنال معاملاتی آریون", `${brand} trading journal`),
            note: tr("ثبت معاملات و دیدن آمار عملکرد، در همان بخش ترید.", "Log trades and see your performance stats, in the same trading section."),
          },
          {
            href: "/ai-planner",
            label: tr("برنامه‌ریزی با هوش مصنوعی", "Planning with AI"),
            note: tr("هماهنگ‌کردن برنامه‌ی روزانه با ساعت‌های حساس بازار.", "Fit your daily plan around the market's sensitive hours."),
          },
          {
            href: "/blog",
            label: tr("مقاله‌های آریون", `${brand} articles`),
            note: tr("راهنماهای کاربردی درباره‌ی ترید و برنامه‌ریزی.", "Practical guides on trading and planning."),
          },
        ]}
      />
    </>
  );
}
