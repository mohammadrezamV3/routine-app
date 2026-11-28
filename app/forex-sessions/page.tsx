import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `ساعت بازار فارکس به وقت تهران | سشن لندن، نیویورک، توکیو | ${BRAND_FA}`,
      `Forex market hours in Tehran time | London, New York, Tokyo sessions | ${brand}`,
    ),
    description: tr(
      `ساعت بازار فارکس به وقت تهران: باز و بسته شدن سشن سیدنی، توکیو، لندن و نیویورک، شمارش معکوس و محاسبه درست ساعت تابستانی در ${BRAND_FA}، مناسب تریدرهای ایرانی.`,
      `Forex market hours in Tehran time: opening and closing of the Sydney, Tokyo, London and New York sessions, with a countdown and correct daylight saving calculation in ${brand}.`,
    ),
    path: "/forex-sessions",
    keywords: tr(
      "ساعت بازار فارکس|ساعت کار بازار فارکس|ساعت بازار فارکس به وقت ایران|ساعت بازار فارکس به وقت تهران|سشن های فارکس|سشن لندن|سشن نیویورک|سشن توکیو|سشن سیدنی|ساعت بازگشایی بازار فارکس|ساعت تعطیلی بازار فارکس|بهترین ساعت معامله فارکس|بهترین زمان معامله طلا|کیل زون|forex market hours|تایم معاملاتی|تغییر ساعت تابستانی فارکس|بازار فارکس چه ساعتی باز است|ساعت اورلپ لندن نیویورک|ساعت بازار فارکس امروز",
      "forex market hours|forex sessions|forex market hours Tehran time|London session time|New York session time|Tokyo session|Sydney session|best time to trade forex|forex session overlap|forex market open close",
    ).split("|"),
    ownOgImage: true,
    ogTitle: tr(`ساعت بازار فارکس | ${BRAND_FA}`, `Forex market hours | ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("سشن‌های معاملاتی فارکس کدامند؟", "Which are the forex trading sessions?"),
      a: tr(
        "بازار فارکس بر اساس ساعت کاری چهار مرکز مالی اصلی به چهار سشن تقسیم می‌شود: سیدنی، توکیو، لندن و نیویورک. چون این چهار شهر در نقاط مختلف جهان‌اند، بازار فارکس عملا شبانه‌روز (از یکشنبه شب تا جمعه شب به وقت نیویورک) باز است.",
        "The forex market is divided into four sessions based on the working hours of four major financial centres: Sydney, Tokyo, London and New York. Because these cities are spread across the world, the forex market is open almost 24 hours (from Sunday night to Friday night New York time).",
      ),
    },
    {
      q: tr("چرا ساعت‌های ثابت UTC برای نمایش سشن‌ها دقیق نیست؟", "Why aren't fixed UTC hours accurate for showing sessions?"),
      a: tr(
        "چون لندن و نیویورک ساعت تابستانی (DST) دارند و تاریخ تغییرشان با هم یکی نیست، و سیدنی چون در نیم‌کره‌ی جنوبی است برعکس آن‌ها جابه‌جا می‌شود. یک عدد ثابت UTC برای «ساعت باز لندن» هرسال چند هفته اشتباه می‌شود؛ محاسبه باید بر اساس ساعت محلی واقعی هر شهر انجام شود تا خودش را با DST تنظیم کند.",
        "Because London and New York observe daylight saving time (DST) on different dates, and Sydney, being in the southern hemisphere, shifts in the opposite direction. A fixed UTC number for “London opening” would be wrong for several weeks each year. The calculation has to use each city's real local time so it adjusts for DST by itself.",
      ),
    },
    {
      q: tr("پرنقدینگی‌ترین ساعت بازار فارکس کی است؟", "When is the most liquid time in the forex market?"),
      a: tr(
        "همپوشانی لندن و نیویورک، که بیشترین حجم معاملات روزانه در آن انجام می‌شود، چون در آن بازه هم اروپا و هم آمریکا هم‌زمان فعال‌اند. همپوشانی سیدنی و توکیو هم برای جفت‌ارزهای ین و دلار استرالیا اهمیت دارد.",
        "The overlap of London and New York, where most of the daily trading volume happens, because Europe and America are both active at the same time in that window. The Sydney–Tokyo overlap also matters for the yen and Australian dollar pairs.",
      ),
    },
    {
      q: tr("آیا ایران هم تغییر ساعت تابستانی دارد؟", "Does Iran also change its clocks for summer time?"),
      a: tr(
        "خیر، ایران از سال 1401 تغییر ساعت تابستانی را برداشته و تمام سال با یک آفست ثابت (UTC+3:30) کار می‌کند. به همین دلیل، فاصله‌ی ساعت تهران با لندن یا نیویورک در طول سال کمی تغییر می‌کند، چون فقط آن‌ها ساعت خود را جابه‌جا می‌کنند.",
        "No. Iran stopped changing its clocks for summer time in 1401 (2022) and works all year on a fixed offset (UTC+3:30). So the time difference between Tehran and London or New York changes a little during the year, because only they move their clocks.",
      ),
    },
    {
      q: tr("بازار فارکس چه زمانی کاملا بسته است؟", "When is the forex market completely closed?"),
      a: tr(
        "از بعد از ساعت 17:00 به وقت نیویورک روز جمعه تا ساعت 17:00 به وقت نیویورک روز یکشنبه — یعنی تعطیلات آخر هفته‌ی بازار.",
        "From 17:00 New York time on Friday until 17:00 New York time on Sunday, which is the market's weekend closure.",
      ),
    },
    {
      q: tr(`ساعت فارکس ${BRAND_FA} چه چیزی نشان می‌دهد؟`, `What does the ${brand} forex clock show?`),
      a: tr(
        "وضعیت باز/بسته‌ی هر چهار سشن به وقت محلی خودت، شمارش معکوس تا باز یا بسته‌شدن بعدی، و اینکه همین حالا کدام سشن‌ها هم‌پوشانی دارند — همه بر اساس محاسبه‌ی واقعی منطقه‌ی زمانی، نه عدد ثابت.",
        "The open/closed status of each of the four sessions in your local time, a countdown to the next opening or closing, and which sessions are overlapping right now. Everything is based on the real time zone calculation, not a fixed number.",
      ),
    },
    {
      q: tr("بازار فارکس چه ساعتی باز است؟", "What time is the forex market open?"),
      a: tr(
        "بازار فارکس از یکشنبه‌شب تا جمعه‌شب به وقت نیویورک تقریبا شبانه‌روز باز است، چون ساعت کاری سیدنی، توکیو، لندن و نیویورک پشت سر هم می‌آیند. ساعت دقیق به وقت تهران بسته به تغییر ساعت تابستانی هر کشور کمی جابه‌جا می‌شود، برای همین بهتر است از یک ساعت زنده‌ی سشن استفاده کنی.",
        "The forex market is open almost 24 hours from Sunday night to Friday night New York time, because the working hours of Sydney, Tokyo, London and New York follow one another. The exact hours in Tehran time shift a little with each country's daylight saving, which is why a live session clock helps.",
      ),
    },
    {
      q: tr("ساعت سشن لندن و نیویورک به وقت ایران چند است؟", "What are the London and New York session times in Iran time?"),
      a: tr(
        "ساعت دقیق به فصل بستگی دارد، چون لندن و نیویورک در تاریخ‌های متفاوتی ساعتشان را تغییر می‌دهند. به همین دلیل یک عدد ثابت درست نیست و آریون ساعت هر سشن را از روی ساعت محلی واقعی شهرش و برای وقت تو حساب می‌کند. ساعت فعلی را در همین صفحه یا بخش ترید ببین.",
        "The exact time depends on the season, because London and New York change their clocks on different dates. A fixed number is therefore not correct, and Arion works out each session's hours from its city's real local time and for your time. See the current hours on this page or in the trading section.",
      ),
    },
    {
      q: tr("بهترین ساعت معامله فارکس چه زمانی است؟", "What is the best time to trade forex?"),
      a: tr(
        "معمولا ساعت‌هایی که دو سشن هم‌پوشانی دارند، مخصوصا هم‌پوشانی لندن و نیویورک، نقدینگی و نوسان بیشتری دارند. ولی بهترین ساعت به جفت‌ارز و سبک معاملاتی تو بستگی دارد؛ بهتر است در ژورنال ثبت کنی در چه ساعت‌هایی بهتر عمل کرده‌ای.",
        "Hours when two sessions overlap, especially London and New York, usually have more liquidity and movement. But the best time depends on the pair and your style; it is better to log in your journal at which hours you perform best.",
      ),
    },
    {
      q: tr("سشن توکیو و سیدنی چه ساعتی است؟", "When are the Tokyo and Sydney sessions?"),
      a: tr(
        "این دو سشن در ساعت‌های اول بازار هفته و شب به وقت ایران فعال‌اند و نوسان کمتری نسبت به لندن و نیویورک دارند، مگر برای جفت‌ارزهایی که ین یا دلار استرالیا و نیوزیلند در آن‌هاست. ساعت دقیق امروز را در ساعت سشن‌ها ببین.",
        "These two sessions are active in the first hours of the market week and at night in Iran time, and move less than London and New York, except for pairs that include the yen or the Australian and New Zealand dollars. Check today's exact hours in the session clock.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("ساعت بازار فارکس", "Forex market hours"), path: "/forex-sessions" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function ForexSessionsPage() {
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
        h1={tr(`ساعت بازار فارکس به وقت تهران — ${BRAND_FA}`, `Forex market hours in Tehran time — ${brand}`)}
        lead={tr(
          `${BRAND_FA} ساعت باز و بسته‌ی چهار سشن اصلی فارکس را به وقت محلی‌ات نشان می‌دهد ` +
            `و تغییر ساعت تابستانی لندن، نیویورک و سیدنی را واقعی حساب می‌کند، نه با یک عدد ثابت UTC. ` +
            `این صفحه سشن‌های معاملاتی، هم‌پوشانی‌ها و DST را توضیح می‌دهد.`,
          `${brand} shows the opening and closing times of the four main forex sessions in your local time, and calculates the London, New York and Sydney summer time changes for real, not with a fixed UTC number. This page explains the trading sessions, the overlaps and DST.`,
        )}
        ctaNote={tr("7 روز آزمایشی رایگان", "7 days free trial")}
        sections={[
          {
            title: tr("چهار سشن اصلی بازار فارکس", "The four main forex sessions"),
            bullets: [
              {
                title: tr("سیدنی 🇦🇺", "Sydney 🇦🇺"),
                body: tr("اولین سشنی که هفته را باز می‌کند؛ حجم پایین‌تر نسبت به بقیه، مهم برای دلار استرالیا و نیوزیلند.", "The first session to open the week. Volume is lower than the others, but it matters for the Australian and New Zealand dollars."),
              },
              {
                title: tr("توکیو 🇯🇵", "Tokyo 🇯🇵"),
                body: tr("سشن آسیا؛ بیشترین فعالیت روی ین ژاپن و جفت‌ارزهای آسیایی.", "The Asian session; the most activity is in the Japanese yen and Asian currency pairs."),
              },
              {
                title: tr("لندن 🇬🇧", "London 🇬🇧"),
                body: tr("بزرگ‌ترین سشن از نظر حجم معاملات؛ شروع فعالیت جدی روی یورو و پوند.", "The largest session by trading volume; serious activity starts in the euro and the pound."),
              },
              {
                title: tr("نیویورک 🇺🇸", "New York 🇺🇸"),
                body: tr("سشن آمریکا؛ نیمه‌ی اول آن با لندن هم‌پوشانی دارد که پرنقدینگی‌ترین بازه‌ی روز است.", "The American session; its first half overlaps with London, which is the most liquid window of the day."),
              },
            ],
          },
          {
            title: tr("چرا محاسبه‌ی درست ساعت سشن‌ها سخت است؟", "Why is calculating session times correctly hard?"),
            paragraphs: [
              tr(
                "ساده‌ترین راه این است که بگوییم «لندن ساعت فلان UTC باز می‌شود» و همیشه همان عدد را نشان بدهیم. مشکل این است که لندن در تابستان یک ساعت جلوتر می‌رود (BST) و در زمستان به وقت استاندارد برمی‌گردد (GMT) — پس معادل UTC آن در طول سال دو مقدار دارد، نه یکی.",
                "The simplest approach would be to say “London opens at such-and-such UTC” and always show that number. The problem is that London moves an hour ahead in summer (BST) and goes back to standard time in winter (GMT), so its UTC equivalent has two values during the year, not one.",
              ),
              tr(
                "نیویورک هم همین‌طور، ولی تاریخ تغییر ساعتش با لندن یکی نیست. سیدنی چون در نیم‌کره‌ی جنوبی است، تابستانش با تابستان اروپا و آمریکا هم‌زمان نیست، پس جهت جابه‌جایی ساعتش برعکس آن‌هاست. نتیجه: یک جدول ثابت از اعداد UTC، چند بار در سال اشتباه می‌شود.",
                "New York does the same, but its clock-change dates are not the same as London's. Sydney, being in the southern hemisphere, doesn't have its summer at the same time as Europe and America, so its clock shifts in the opposite direction. The result: a fixed table of UTC numbers is wrong several times a year.",
              ),
              tr(
                "راه درست این است که ساعت باز/بسته را در وقت محلی خود همان شهر نگه داریم و هر بار آن را به یک لحظه‌ی واقعی تبدیل کنیم — این‌طوری تغییر ساعت هرکدام، خودش را خودکار تنظیم می‌کند.",
                "The right approach is to keep the opening and closing times in each city's own local time and convert them to a real moment every time. That way, each city's clock change adjusts automatically.",
              ),
            ],
          },
          {
            title: tr("بهترین ساعت معامله — هم‌پوشانی سشن‌ها", "The best time to trade: session overlaps"),
            bullets: [
              {
                title: tr("لندن × نیویورک", "London × New York"),
                body: tr("پرحجم‌ترین بازه‌ی روز معاملاتی؛ بیشتر جفت‌ارزهای اصلی (یورو/دلار، پوند/دلار) بیشترین نقدینگی و اسپرد پایین‌تر را همین‌جا دارند.", "The highest-volume window of the trading day. Most major pairs (EUR/USD, GBP/USD) have their most liquidity and tightest spreads here."),
              },
              {
                title: tr("سیدنی × توکیو", "Sydney × Tokyo"),
                body: tr("بازه‌ی مهم برای جفت‌ارزهای دلار استرالیا/ین و دلار نیوزیلند/ین.", "An important window for the AUD/JPY and NZD/JPY pairs."),
              },
            ],
          },
          {
            title: tr("ایران و تغییر ساعت تابستانی", "Iran and summer time"),
            paragraphs: [
              tr(
                "ایران از سال 1401 دیگر ساعت رسمی‌اش را تغییر نمی‌دهد و تمام سال روی UTC+3:30 ثابت است. اما لندن، نیویورک و سیدنی همچنان DST دارند — یعنی فاصله‌ی ساعت تهران با هرکدام، دو بار در سال (وقتی آن‌ها ساعتشان را عوض می‌کنند ولی تهران نه) یک ساعت جابه‌جا می‌شود. برای همین نمایش ساعت سشن‌ها باید همیشه بر اساس تاریخ واقعی محاسبه شود، نه یک جدول ثابت که فقط برای یک فصل درست است.",
                "Since 1401 (2022), Iran no longer changes its official time and stays fixed at UTC+3:30 all year. But London, New York and Sydney still observe DST, so the time difference between Tehran and each of them shifts by an hour twice a year (when they change their clocks but Tehran doesn't). That's why session times must always be calculated from the real date, not from a fixed table that is only right for one season.",
              ),
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره ساعت بازار فارکس", "Frequently asked questions about forex market hours")}
        related={[
          {
            href: "/economic-calendar",
            label: tr("تقویم اقتصادی فارکس", "Forex economic calendar"),
            note: tr("رویدادهای مهم اقتصادی، هماهنگ با ساعت سشن‌ها.", "Major economic events, matched to the session times."),
          },
          {
            href: "/trading-journal",
            label: tr("ژورنال معاملاتی آریون", `${brand} trading journal`),
            note: tr("هر معامله با برچسب سشن معاملاتی‌اش ثبت می‌شود.", "Each trade is logged with its trading session label."),
          },
          {
            href: "/ai-planner",
            label: tr("برنامه‌ریزی با هوش مصنوعی", "Planning with AI"),
            note: tr("هماهنگ‌کردن برنامه‌ی روزانه با ساعت‌های فعال بازار.", "Fit your daily plan around the market's active hours."),
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
