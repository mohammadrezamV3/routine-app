import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { fillPriceCopy } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

/**
 * صفحه‌ی فرود دسته‌ی «روتین».
 *
 * این صفحه عمدا *توضیح‌دهنده* است نه ابزار: خود ساختن روتین در
 * `/weekly` انجام می‌شود که پشت لاگین است و noindex. کاربری که در گوگل
 * دنبال «روتین اپ» یا «برنامه روتین روزانه» می‌گردد هنوز حساب ندارد، پس
 * صفحه‌ای لازم دارد که اول جواب سوالش را بدهد و بعد دعوتش کند.
 * محتوای زیر همان کاری را توصیف می‌کند که اپ واقعا انجام می‌دهد — هیچ
 * قابلیت نداشته‌ای این‌جا وعده داده نشده.
 */

/** دسته‌ی محصول به زبان جاری (همان BRAND_CATEGORY_FA در فارسی) */
function categoryName(): string {
  return tr("روتین اپ", "Routine app");
}

export function generateMetadata(): Metadata {
  const brand = brandName();
  const category = categoryName();
  return pageMetadata({
    title: tr(
      `${category} چیست؟ راهنمای ساخت روتین روزانه با ${BRAND_FA}`,
      `What is a ${category}? A guide to building a daily routine with ${brand}`,
    ),
    description: tr(
      `روتین روزانه یعنی چه، چطور یک برنامه‌ی روتین بسازیم که رها نشود، و ${BRAND_FA} ` +
        `به‌عنوان یک ${category} فارسی با تقویم شمسی چطور کمک می‌کند.`,
      `What a daily routine is, how to build a routine plan that you actually stick to, and how ${brand} ` +
        `helps as a ${category} with a Persian (Jalali) calendar.`,
    ),
    path: "/routine",
    ownOgImage: true,
    ogTitle: tr(`${category} ${BRAND_FA} — برنامه‌ی روتین روزانه`, `${category} ${brand} — daily routine plan`),
  });
}

function content() {
  const brand = brandName();
  const category = categoryName();
  const faqs: SeoFaq[] = [
    {
      q: tr("روتین اپ چیست؟", "What is a routine app?"),
      a: tr(
        "روتین اپ به اپلیکیشنی گفته می‌شود که کارهای تکرارشونده‌ی روزانه یا هفتگی‌ات را نگه می‌دارد، سر وقت یادآوری می‌کند و نشان می‌دهد چند روز پشت‌سرهم انجامشان داده‌ای. تفاوتش با یک لیست کارهای ساده این است که آیتم‌ها یک‌بارمصرف نیستند و خودشان تکرار می‌شوند.",
        "A routine app is an app that keeps your daily or weekly recurring tasks, reminds you on time and shows how many days in a row you have done them. The difference from a simple to-do list is that items are not one-off; they repeat on their own.",
      ),
    },
    {
      q: tr("چطور با آریون یک روتین روزانه بسازم؟", `How do I build a daily routine with ${brand}?`),
      a: tr(
        "بعد از ساخت حساب رایگان، در بخش برنامه‌ی هفتگی هر کار را با روزهای تکرارش (مثلا شنبه تا چهارشنبه) و در صورت نیاز ساعتش ثبت می‌کنی. از آن به بعد همان کار هر هفته سر جای خودش می‌آید و فقط کافی است تیک بزنی.",
        "After creating a free account, in the weekly plan section you add each task with its repeat days (for example Saturday to Wednesday) and, if needed, its time. From then on the same task appears in its place every week, and you only need to tick it off.",
      ),
    },
    {
      q: tr("آیا روتین در آریون رایگان است؟", `Is the routine free in ${brand}?`),
      a: tr(
        "«روتین من» (روتین و کارهای روزانه) 14 روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند؛ دستیار هوشمند «نومو» 10 پیام رایگان دارد و در پلن‌های پولی نامحدود است. بخش‌های ورزش و تغذیه، ژورنال ترید و رودمپ یادگیری اشتراکی‌اند و هر حساب تازه 3 روز دسترسی به بدنسازی، کالری‌شمار و ژورنال ترید، با استفاده‌ی محدود از هوش مصنوعی می‌گیرد.",
        "“My Routine” (routine and daily tasks) is free for 14 days and then continues with the “My Routine” plan ({{routine_monthly}}). The smart assistant “Nomo” gets 10 free messages and is unlimited on paid plans. The workout and nutrition sections, the trading journal and the learning roadmap are subscription features, and every new account gets 3 days of access to workouts, the calorie counter and the trading journal, with limited use of AI.",
      ),
    },
    {
      q: tr("اگر یک روز روتینم را انجام ندهم چه می‌شود؟", "What happens if I skip a day of my routine?"),
      a: tr(
        "هیچ اتفاق بدی نمی‌افتد؛ فقط آن روز بدون تیک می‌ماند. می‌توانی یک آیتم را به روز دیگری منتقل کنی یا فقط همان تکرار یک روز را حذف کنی، بدون اینکه کل برنامه‌ی تکرارشونده به‌هم بخورد.",
        "Nothing bad happens; that day just stays unticked. You can move an item to another day, or remove only that day's repeat, without breaking the whole recurring plan.",
      ),
    },
    {
      q: tr("آریون تقویم شمسی دارد؟", `Does ${brand} have a Jalali (Persian) calendar?`),
      a: tr(
        "بله. برنامه‌ی روزانه و هفتگی با تقویم شمسی (جلالی) کار می‌کند و روزهای هفته هم از شنبه شروع می‌شوند.",
        "Yes. The daily and weekly plan works with the Jalali (Persian) calendar, and the week starts on Saturday.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("روتین روزانه", "Daily routine"), path: "/routine" },
  ];
  return { faqs, breadcrumb, brand, category };
}

// قیمت «روتین من» داخل FAQ از پنل ادمین (/admin/pricing) پر می‌شه؛ ISR تا تغییر قیمت بدون دیپلوی برسه
export const revalidate = 300;

export default async function RoutinePage() {
  const { faqs: rawFaqs, breadcrumb: BREADCRUMB, brand, category } = content();
  const faqs = fillPriceCopy(rawFaqs, await getPricingConfig());
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd(BREADCRUMB), faqJsonLd(faqs)]),
        }}
      />
      <SeoLanding
        breadcrumb={BREADCRUMB}
        h1={tr(
          `${category} ${BRAND_FA}؛ برنامه‌ی روتین روزانه که رها نمی‌شود`,
          `${category} ${brand}: a daily routine plan you won't drop`,
        )}
        lead={tr(
          `${BRAND_FA} یک ${category} فارسی است: کارهای تکرارشونده‌ات را یک‌بار ثبت می‌کنی، ` +
            `هر روز سر جای خودش می‌آید و پیشرفتت را می‌بینی. این صفحه توضیح می‌دهد روتین روزانه چیست، ` +
            `چرا بیشتر برنامه‌ها بعد از چند روز رها می‌شوند و در آریون چطور می‌شود این را حل کرد.`,
          `${brand} is a ${category} in Persian: you record your recurring tasks once, each day they show up ` +
            `in their place and you see your progress. This page explains what a daily routine is, why most plans ` +
            `are dropped after a few days, and how ${brand} helps you solve this.`,
        )}
        ctaNote={tr("«روتین من» 14 روز رایگان است", "“My Routine” is free for 14 days")}
        sections={[
          {
            title: tr("روتین روزانه یعنی چه؟", "What is a daily routine?"),
            paragraphs: [
              tr(
                "روتین روزانه مجموعه‌ای از کارهای مشخص و تکرارشونده است که در ساعت یا بازه‌ی معینی از روز انجام می‌دهی — از ورزش صبحگاهی و مطالعه گرفته تا مرور کارهای فردا. فرقش با «لیست کارها» این است که لیست کارها یک‌بارمصرف است و بعد از انجام‌شدن پاک می‌شود، ولی روتین باید فردا دوباره برگردد.",
                "A daily routine is a set of specific, recurring tasks you do at a certain time or within a certain part of the day, from morning exercise and reading to going over tomorrow's tasks. Unlike a to-do list, which is one-off and disappears once done, a routine has to come back tomorrow.",
              ),
              tr(
                "همین تکرار است که روتین را سخت می‌کند: نگه‌داشتن دستی یک برنامه‌ی تکرارشونده روی کاغذ یا در یادداشت گوشی، بعد از چند هفته به هم می‌ریزد. برای همین ابزاری لازم است که خودش تکرار را مدیریت کند.",
                "It is this repetition that makes routines hard: keeping a recurring plan by hand on paper or in a phone note falls apart after a few weeks. That is why you need a tool that manages the repetition for you.",
              ),
            ],
          },
          {
            title: tr("چرا بیشتر روتین‌ها بعد از چند روز رها می‌شوند؟", "Why do most routines get dropped after a few days?"),
            bullets: [
              {
                title: tr("برنامه‌ی بیش‌ازحد بلند", "A plan that is too long"),
                body: tr("شروع با ده کار جدید در یک روز تقریبا همیشه شکست می‌خورد. دو یا سه کار که واقعا هر روز انجام می‌شوند، از یک برنامه‌ی کامل که فقط روی کاغذ است ارزش بیشتری دارد.", "Starting with ten new tasks on one day almost always fails. Two or three tasks you really do every day are worth more than a full plan that only exists on paper."),
              },
              {
                title: tr("نبود بازخورد", "No feedback"),
                body: tr("وقتی نمی‌بینی چند روز پشت‌سرهم موفق بوده‌ای، انگیزه‌ای برای ادامه نمی‌ماند. دیدن پیشرفت، خودش بخشی از کار است.", "If you don't see how many days in a row you succeeded, there is no motivation to continue. Seeing your progress is part of the work itself."),
              },
              {
                title: tr("برنامه‌ی غیرقابل‌تغییر", "A plan that can't change"),
                body: tr("زندگی واقعی به هم می‌ریزد. اگر نشود یک کار را به روز دیگری منتقل کرد یا فقط یک روز را رد کرد، اولین روز به‌هم‌ریخته کل برنامه را از اعتبار می‌اندازد.", "Real life gets disrupted. If you can't move a task to another day or skip a single day, the first messed-up day discredits the whole plan."),
              },
              {
                title: tr("پراکندگی ابزارها", "Scattered tools"),
                body: tr("وقتی ورزش در یک اپ است، کارها در اپ دیگر و یادداشت‌ها جای سوم، هیچ‌وقت یک تصویر کامل از روزت نداری.", "When workouts are in one app, tasks in another and notes in a third place, you never have a full picture of your day."),
              },
            ],
          },
          {
            title: tr(`روتین در ${BRAND_FA} چطور کار می‌کند؟`, `How does the routine work in ${brand}?`),
            bullets: [
              {
                title: tr("برنامه‌ی هفتگی تکرارشونده", "Recurring weekly plan"),
                body: tr("هر کار را با روزهای تکرارش ثبت می‌کنی؛ از آن به بعد خودکار در همان روزها می‌آید. لازم نیست هر هفته دوباره بسازی‌اش.", "You record each task with its repeat days, and from then on it appears on those days automatically. You don't have to rebuild it every week."),
              },
              {
                title: tr("برنامه‌ی بدون ساعت", "Plans without a time"),
                body: tr("هر کاری ساعت مشخص ندارد. کارهایی مثل «مطالعه» را می‌شود بدون زمان ثبت کرد تا هر وقت روز انجام شوند.", "Not every task needs a set time. Tasks like “study” can be recorded without a time, so they get done whenever during the day."),
              },
              {
                title: tr("تیک‌زدن و استریک", "Ticking and streaks"),
                body: tr("هر روز کارهای انجام‌شده را تیک می‌زنی و می‌بینی چند روز پشت‌سرهم پایبند بوده‌ای.", "Each day you tick the tasks you've done and see how many days in a row you've kept up."),
              },
              {
                title: tr("انتقال یا حذف یک روز", "Move or remove a single day"),
                body: tr("می‌توانی فقط تکرار یک روز خاص را حذف کنی یا به روز دیگری ببری، بدون به‌هم‌ریختن کل برنامه‌ی تکرارشونده.", "You can remove the repeat for one specific day or move it to another day, without disturbing the whole recurring plan."),
              },
              {
                title: tr("یادآوری دارو و کارها", "Reminders for medicine and tasks"),
                body: tr("برای داروها یا کارهایی که فراموش‌شدنشان هزینه دارد، یادآوری جدا وجود دارد.", "There are separate reminders for medicine or for tasks where forgetting costs something."),
              },
              {
                title: tr("تقویم شمسی", "Jalali calendar"),
                body: tr("همه‌چیز با تقویم جلالی و هفته‌ای که از شنبه شروع می‌شود کار می‌کند — نه یک تقویم میلادی ترجمه‌شده.", "Everything works with the Jalali calendar and a week that starts on Saturday, not a translated Gregorian calendar."),
              },
            ],
          },
          {
            title: tr("چطور یک روتین بسازیم که دوام بیاورد؟", "How to build a routine that lasts?"),
            bullets: [
              {
                title: tr("1. کوچک شروع کن", "1. Start small"),
                body: tr("با دو یا سه کار شروع کن که مطمئنی می‌توانی انجامشان بدهی. بعد از دو هفته‌ی پایدار، یکی اضافه کن.", "Start with two or three tasks you are sure you can do. After two steady weeks, add one more."),
              },
              {
                title: tr("2. کار را به یک نقطه‌ی مشخص از روز بچسبان", "2. Attach the task to a fixed point in the day"),
                body: tr("«بعد از صبحانه» یا «قبل از خواب» خیلی بهتر از «یک وقتی در روز» جواب می‌دهد، چون یک نشانه‌ی مشخص دارد.", "“After breakfast” or “before bed” works much better than “sometime during the day”, because it has a clear cue."),
              },
              {
                title: tr("3. برای روزهای بد هم برنامه داشته باش", "3. Have a plan for bad days too"),
                body: tr("از قبل تصمیم بگیر اگر روزی نشد، نسخه‌ی کوتاه‌ترش چیست — پنج دقیقه مطالعه به‌جای نیم‌ساعت. همین، زنجیره را نگه می‌دارد.", "Decide in advance what the shorter version is for a day that doesn't go to plan: five minutes of reading instead of half an hour. That alone keeps the chain going."),
              },
              {
                title: tr("4. هفته‌ای یک‌بار مرور کن", "4. Review once a week"),
                body: tr("آخر هفته نگاه کن کدام کارها واقعا انجام شدند و کدام‌ها همیشه جا ماندند. کاری که سه هفته انجام نشده، یا باید کوچک‌تر شود یا حذف.", "At the end of the week, look at which tasks were really done and which were always left behind. A task you haven't done for three weeks should either get smaller or be removed."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره روتین", "Frequently asked questions about routines")}
        related={[
          {
            href: "/habit-tracker",
            label: tr("پیگیری عادت‌ها در آریون", `Habit tracking in ${brand}`),
            note: tr("چطور یک عادت جدید را تا جاافتادن دنبال کنیم و استریک را نگه داریم.", "How to track a new habit until it sticks, and keep the streak going."),
          },
          {
            href: "/daily-planner",
            label: tr("برنامه‌ریزی روزانه با آریون", `Daily planning with ${brand}`),
            note: tr("برنامه‌ی امروز، کارهای بدون ساعت و یادآوری‌ها در یک صفحه.", "Today's plan, tasks without a time and reminders on one page."),
          },
          {
            href: "/ai-planner",
            label: tr("برنامه‌ریز هوشمند آریون", `${brand} smart planner`),
            note: tr("پیشنهاد برنامه‌ریزی روزانه با کمک هوش‌مصنوعی.", "Daily planning suggestions with the help of AI."),
          },
          {
            href: "/blog",
            label: tr("مقاله‌های آریون درباره نظم و برنامه‌ریزی", `${brand} articles on routine and planning`),
            note: tr("راهنماهای کاربردی برای ساختن روتین، عادت و برنامه‌ی روزانه.", "Practical guides to building a routine, habits and a daily plan."),
          },
          {
            href: "/about",
            label: tr("درباره آریون", `About ${brand}`),
            note: tr("آریون چیست، چرا ساخته شد و چه بخش‌هایی دارد.", `What ${brand} is, why it was built and what it includes.`),
          },
        ]}
      />
    </>
  );
}
