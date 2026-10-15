import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { fillPriceCopy } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(`ژورنال معاملاتی فارسی | ثبت و تحلیل معاملات | ${BRAND_FA}`, `Trading journal | Log and analyse your trades | ${brand}`),
    description: tr(
      `معاملاتت را در ${BRAND_FA} ثبت کن و عملکردت را ببین: سود و زیان، نرخ برد، ` +
        `میانگین R، تقویم معاملات و چک‌لیست ورود — یک ژورنال معاملاتی منظم و فارسی.`,
      `Log your trades in ${brand} and see how you're doing: profit and loss, win rate, average R, a trade calendar and an entry checklist — an organised trading journal.`,
    ),
    path: "/trading-journal",
    ownOgImage: true,
    ogTitle: tr(`ژورنال معاملاتی ${BRAND_FA}`, `Trading journal ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("ژورنال معاملاتی چیست؟", "What is a trading journal?"),
      a: tr(
        "دفتری که در آن هر معامله را با جزئیاتش ثبت می‌کنی: نماد، جهت، حجم، قیمت ورود و خروج، نتیجه و دلیل تصمیم. هدفش پیش‌بینی بازار نیست؛ هدفش این است که بعد از چند ده معامله بتوانی الگوهای تکرارشونده‌ی خودت را ببینی.",
        "A log where you record each trade with its details: symbol, direction, size, entry and exit prices, result and the reason for the decision. Its aim is not to predict the market; it's so that after several dozen trades you can see your own recurring patterns.",
      ),
    },
    {
      q: tr("چرا ثبت معاملات مهم است؟", "Why does logging trades matter?"),
      a: tr(
        "حافظه در مورد معاملات سوگیری دارد — معامله‌های خوب بیشتر یادت می‌مانند. وقتی همه‌چیز ثبت شده باشد، به‌جای حدس، داده داری: مثلا اینکه ضررهای بزرگ‌ات بیشتر در چه ساعتی یا با کدام ستاپ اتفاق می‌افتند.",
        "Memory is biased about trades: good trades stick in your mind more. When everything is recorded, you have data instead of guesses, for example which hours or which setups your big losses tend to come from.",
      ),
    },
    {
      q: tr("در آریون چه چیزهایی برای هر معامله ثبت می‌شود؟", `What is recorded for each trade in ${brand}?`),
      a: tr(
        "نماد، جهت خرید یا فروش، حجم، تاریخ و ساعت ورود و خروج، قیمت‌ها، حد ضرر و حد سود، کمیسیون و سواپ، ریسک اولیه، جلسه‌ی معاملاتی، ستاپ، دلایل ورود و خروج، احساس قبل و بعد، تصویر چارت و وضعیت چک‌لیست در لحظه‌ی ثبت.",
        "Symbol, buy or sell direction, size, entry and exit date and time, prices, stop loss and take profit, commission and swap, initial risk, trading session, setup, reasons for entry and exit, how you felt before and after, a chart screenshot and the checklist status at the time of logging.",
      ),
    },
    {
      q: tr("چه آمارهایی از معاملاتم می‌بینم؟", "What stats can I see for my trades?"),
      a: tr(
        "سود و زیان خالص، نرخ برد، میانگین سود و ضرر، میانگین R، فاکتور سود، بیشترین برد و باخت پشت‌سرهم، بیشترین افت سرمایه و تقویم ماهانه‌ی سود و زیان.",
        "Net profit and loss, win rate, average win and loss, average R, profit factor, longest winning and losing streaks, maximum drawdown and a monthly profit and loss calendar.",
      ),
    },
    {
      q: tr("آیا ژورنال ترید رایگان است؟", "Is the trading journal free?"),
      a: tr(
        "بخش ترید جزو بخش‌های اشتراکی است. هر حساب تازه 3 روز دسترسی به بدنسازی، کالری‌شمار و ژورنال ترید، با استفاده‌ی محدود از هوش مصنوعی می‌گیرد. «روتین من» (روتین و کارهای روزانه) 14 روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند.",
        "The trading section is a subscription section. Every new account gets 3 days of access to workouts, the calorie counter and the trading journal, with limited use of AI. “My Routine” (routine and daily tasks) is free for 14 days and then continues with the “My Routine” plan ({{routine_monthly}}).",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("ژورنال معاملاتی", "Trading journal"), path: "/trading-journal" },
  ];
  return { faqs, breadcrumb, brand };
}

// قیمت «روتین من» داخل FAQ از پنل ادمین (/admin/pricing) پر می‌شه؛ ISR تا تغییر قیمت بدون دیپلوی برسه
export const revalidate = 300;

export default async function TradingJournalPage() {
  const { faqs: rawFaqs, breadcrumb: BREADCRUMB, brand } = content();
  const faqs = fillPriceCopy(rawFaqs, await getPricingConfig());
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(BREADCRUMB), faqJsonLd(faqs)]) }}
      />
      <SeoLanding
        breadcrumb={BREADCRUMB}
        h1={tr(
          `ژورنال معاملاتی ${BRAND_FA}؛ معاملاتت را ثبت کن و عملکردت را ببین`,
          `Trading journal in ${brand}: log your trades and see how you're doing`,
        )}
        lead={tr(
          `${BRAND_FA} یک ژورنال معاملاتی فارسی دارد: هر معامله را با جزئیاتش ثبت می‌کنی و ` +
            `آمار واقعی عملکردت را می‌بینی — نرخ برد، میانگین R، تقویم سود و زیان و بیشتر. ` +
            `این صفحه توضیح می‌دهد ژورنال معاملاتی چیست و چه چیزی را باید ثبت کرد.`,
          `${brand} has a trading journal: you log each trade with its details and see your real performance: win rate, average R, a profit and loss calendar and more. This page explains what a trading journal is and what you should record.`,
        )}
        ctaNote={tr("3 روز آزمایشی رایگان", "3 days free trial")}
        sections={[
          {
            title: tr("ژورنال معاملاتی به چه دردی می‌خورد؟", "What is a trading journal good for?"),
            paragraphs: [
              tr(
                "بیشتر معامله‌گرها می‌دانند نتیجه‌ی کلی‌شان چقدر است، ولی نمی‌دانند آن نتیجه از کجا آمده. وقتی معامله‌ها ثبت نشده باشند، تحلیل بعدی فقط حدس است.",
                "Most traders know their overall result, but not where it came from. When trades aren't recorded, any later analysis is just a guess.",
              ),
              tr(
                "ژورنال این را عوض می‌کند: بعد از چند ده معامله می‌توانی ببینی کدام ستاپ‌ها واقعا سودده بوده‌اند، کدام ساعت‌ها بدترین نتیجه را داده‌اند، و آیا خارج‌شدن از پلن الگوی تکرارشونده دارد یا نه.",
                "A journal changes that: after several dozen trades you can see which setups really made money, which hours gave the worst results, and whether leaving your plan follows a repeating pattern.",
              ),
            ],
          },
          {
            title: tr("چه چیزی را باید در هر معامله ثبت کرد؟", "What should you record for each trade?"),
            bullets: [
              {
                title: tr("اطلاعات پایه", "Basic details"),
                body: tr("نماد، جهت، حجم، زمان ورود و خروج، قیمت‌ها و نتیجه‌ی نهایی.", "Symbol, direction, size, entry and exit time, prices and the final result."),
              },
              {
                title: tr("ریسک", "Risk"),
                body: tr("حد ضرر، حد سود و مقدار ریسک اولیه — بدون این‌ها محاسبه‌ی R ممکن نیست.", "Stop loss, take profit and the initial risk amount. Without these, R can't be calculated."),
              },
              {
                title: tr("دلیل تصمیم", "Reason for the decision"),
                body: tr("چرا وارد شدی و چرا خارج شدی. همین بخش است که بعدا بیشترین ارزش را دارد.", "Why you entered and why you exited. This is the part that ends up being the most valuable later."),
              },
              {
                title: tr("وضعیت روانی", "Mental state"),
                body: tr("حال قبل و بعد از معامله و اینکه طبق پلن عمل کردی یا نه.", "How you felt before and after the trade, and whether you followed your plan."),
              },
              {
                title: tr("تصویر چارت", "Chart screenshot"),
                body: tr("یک اسکرین‌شات از لحظه‌ی ورود، مرور بعدی را خیلی دقیق‌تر می‌کند.", "A screenshot from the moment of entry makes later review much more precise."),
              },
            ],
          },
          {
            title: tr(`ژورنال ترید ${BRAND_FA} چه امکاناتی دارد؟`, `What does the ${brand} trading journal offer?`),
            bullets: [
              {
                title: tr("چند حساب معاملاتی", "Several trading accounts"),
                body: tr("هر حساب با ارز، بالانس اولیه و هدف سود خودش — دلار، یورو یا تومان.", "Each account has its own currency, starting balance and profit target: dollars, euros or toman."),
              },
              {
                title: tr("آمار کامل", "Full stats"),
                body: tr("سود و زیان، نرخ برد، میانگین سود و ضرر، میانگین R، فاکتور سود، استریک‌ها و بیشترین افت سرمایه.", "Profit and loss, win rate, average win and loss, average R, profit factor, streaks and maximum drawdown."),
              },
              {
                title: tr("تقویم سود و زیان", "Profit and loss calendar"),
                body: tr("تقویم ماهانه که نتیجه‌ی هر روز را رنگی نشان می‌دهد؛ شمسی یا میلادی، قابل انتخاب.", "A monthly calendar that colour-codes each day's result. Jalali or Gregorian, your choice."),
              },
              {
                title: tr("چک‌لیست ورود", "Entry checklist"),
                body: tr("چک‌لیست خودت را می‌سازی و وضعیتش در لحظه‌ی ثبت هر معامله ذخیره می‌شود — نه به‌صورت ارجاع زنده، بلکه همان عکس لحظه.", "You build your own checklist, and its status is saved when each trade is logged. It's a snapshot of that moment, not a live link."),
              },
              {
                title: tr("تقویم اقتصادی و ساعت بازار", "Economic calendar and market hours"),
                body: tr("رویدادهای مهم و ساعت جلسه‌های معاملاتی، برای برنامه‌ریزی روز معاملاتی.", "Major events and trading session hours, to plan your trading day."),
              },
              {
                title: tr("اتصال متاتریدر", "MetaTrader connection"),
                body: tr("امکان همگام‌سازی معاملات. رمز حساب معاملاتی هیچ‌وقت خواسته یا ذخیره نمی‌شود.", "Sync your trades. Your trading account password is never requested or stored."),
              },
            ],
          },
          {
            title: tr("چطور از ژورنال استفاده کنیم؟", "How to use the journal"),
            bullets: [
              {
                title: tr("1. همان روز ثبت کن", "1. Log it the same day"),
                body: tr("ثبت‌کردن یک هفته بعد یعنی جزئیات تصمیم فراموش شده‌اند و همان بخش مهم از دست می‌رود.", "Logging a week later means you've forgotten the details of the decision, and that's the most important part lost."),
              },
              {
                title: tr("2. همه‌ی معامله‌ها را بنویس", "2. Write down every trade"),
                body: tr("ثبت‌نکردن معامله‌های بد، آمار را بی‌معنی می‌کند.", "Leaving out the bad trades makes the stats meaningless."),
              },
              {
                title: tr("3. هفتگی یا ماهانه مرور کن", "3. Review weekly or monthly"),
                body: tr("دنبال الگو بگرد، نه دنبال یک معامله‌ی خاص.", "Look for patterns, not for one specific trade."),
              },
              {
                title: tr("4. یک چیز را در هر دوره اصلاح کن", "4. Fix one thing per period"),
                body: tr("تغییردادن هم‌زمان چند چیز باعث می‌شود نفهمی کدام تغییر اثر داشته.", "Changing several things at once means you won't know which change made the difference."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره ژورنال معاملاتی", "Frequently asked questions about the trading journal")}
        related={[
          {
            href: "/blog/what-is-a-trading-journal",
            label: tr("ژورنال معاملاتی چیست و چطور بنویسیم؟", "What is a trading journal and how do you keep one?"),
            note: tr("مقاله‌ی کامل درباره‌ی ساختن و مرورکردن ژورنال.", "A full article on setting up and reviewing a journal."),
          },
          {
            href: "/economic-calendar",
            label: tr("تقویم اقتصادی آریون", `${brand} economic calendar`),
            note: tr("رویدادهای مهم اقتصادی، برای برنامه‌ریزی روز معاملاتی.", "Major economic events, to plan your trading day."),
          },
          {
            href: "/forex-sessions",
            label: tr("ساعت جلسه‌های بازار فارکس", "Forex session hours"),
            note: tr("زمان باز و بسته‌شدن بازارهای آسیا، اروپا و آمریکا.", "Opening and closing times of the Asian, European and American markets."),
          },
          {
            href: "/routine",
            label: tr("روتین روزانه در آریون", `Daily routine in ${brand}`),
            note: tr("نظم روزانه و برنامه‌ی تکرارشونده، در همان حساب کاربری.", "Daily discipline and a recurring plan, in the same account."),
          },
          {
            href: "/faq",
            label: tr("سوالات متداول آریون", `${brand} FAQ`),
            note: tr("جواب سوال‌های رایج درباره‌ی همه‌ی بخش‌های اپ.", "Answers to common questions about every section of the app."),
          },
        ]}
      />
    </>
  );
}
