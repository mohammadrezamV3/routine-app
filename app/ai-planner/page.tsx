import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { brandName, BRAND_FA } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { fillPriceCopy } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `برنامه ریزی با هوش مصنوعی | دستیار برنامه‌ریزی و آنالیز هفتگی | ${BRAND_FA}`,
      `AI planning | Schedule assistant and weekly review | ${brand}`,
    ),
    description: tr(
      `در ${BRAND_FA} با زبان خودت به دستیار هوش مصنوعی بگو چه می‌خواهی و برنامه‌ی ` +
        `هفتگی‌ات را بچین، و با آنالیز هفتگی هوشمند ببین کدام بخش‌های زندگی‌ات واقعا پیش رفته‌اند.`,
      `In ${brand}, tell the AI assistant what you want in your own words and it builds your weekly schedule. ` +
        `The smart weekly review then shows which parts of your life have really moved forward.`,
    ),
    path: "/ai-planner",
    ownOgImage: true,
    ogTitle: tr(`برنامه‌ریزی با هوش مصنوعی | ${BRAND_FA}`, `AI planning | ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("دستیار برنامه‌ریزی با هوش مصنوعی چطور کار می‌کند؟", "How does the AI planning assistant work?"),
      a: tr(
        "یک گوی گفت‌وگو در صفحه‌ی روتین است که با زبان خودت به آن می‌گویی چه می‌خواهی — مثلا «هر روز صبح یک ساعت ورزش اضافه کن» یا «چهارشنبه‌ام را خالی کن». مدل زبانی پیشنهاد می‌دهد، ولی هیچ تغییری بدون اعتبارسنجی روی برنامه‌ی واقعی‌ات اعمال نمی‌شود.",
        "It is a chat bubble on the routine page. You tell it what you want in your own words, for example “add an hour of exercise every morning” or “keep Wednesday free”. The language model suggests changes, but nothing is applied to your real schedule without validation.",
      ),
    },
    {
      q: tr("چرا نتیجه‌ی هوش مصنوعی مستقیم روی برنامه‌ام اعمال نمی‌شود؟", "Why isn't the AI result applied straight to my schedule?"),
      a: tr(
        "چون خروجی یک مدل زبانی همیشه قابل‌اعتماد نیست — ممکن است ساعت نامعتبر بدهد یا با برنامه‌ی دیگری تداخل پیدا کند. برای همین همان اعتبارسنجی‌هایی که فرم‌های دستی دارند (تداخل ساعت، سقف تعداد برنامه) روی پیشنهاد مدل هم اجرا می‌شود.",
        "Because a language model's output is not always reliable. It may return an invalid time or overlap with another item. That is why the same checks the manual forms use (time overlaps, the maximum number of items) also run on the model's suggestion.",
      ),
    },
    {
      q: tr("آنالیز هفتگی چیست؟", "What is the weekly review?"),
      a: tr(
        "صفحه‌ای است که عملکرد هفته‌ات را در حوزه‌های مختلف (روتین، خواب، کارها و در صورت فعال‌بودن، تمرین و تغذیه) نشان می‌دهد: چه‌قدر پایبند بوده‌ای، روند نسبت به هفته‌های قبل چطور بوده، و یک مربی هوشمند با درخواست خودت توصیه‌های عملی می‌سازد.",
        "It is a page that shows how your week went across areas (routine, sleep, tasks and, if enabled, workouts and nutrition): how consistent you were, how the trend compares with earlier weeks, and a smart coach that writes practical advice when you ask for it.",
      ),
    },
    {
      q: tr("آنالیز هفتگی رایگان است؟", "Is the weekly review free?"),
      a: tr(
        "آنالیز هفتگی هوشمند بخشی از ماژول تحلیل هوشمند (AI Insight) و جزو بخش‌های اشتراکی است. دستیار گفت‌وگویی روتین («نومو») برای کاربر بدون اشتراک 10 پیام رایگان دارد و در پلن‌های پولی نامحدود است؛ «روتین من» 14 روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند.",
        "The smart weekly review is part of the AI Insight module and is a paid feature. The routine chat assistant “Nomo” gives users without a subscription 10 free messages and is unlimited on paid plans. “My Routine” is free for 14 days and then continues with the “My Routine” plan ({{routine_monthly}}).",
      ),
    },
    {
      q: tr("رودمپ یادگیری با هوش مصنوعی هم همین‌جاست؟", "Is the AI learning roadmap here too?"),
      a: tr(
        "رودمپ یادگیری یک ابزار جدا برای ساختن مسیر یادگیری یک مهارت است و فعلا در حال تکمیل و فقط برای تست داخلی فعال است؛ به‌زودی برای همه باز می‌شود. جزئیاتش را در صفحه‌ی رودمپ یادگیری توضیح داده‌ایم.",
        "The learning roadmap is a separate tool for building a learning path for a skill. It is still being completed and is only active for internal testing for now; it will open to everyone soon. We explain the details on the learning roadmap page.",
      ),
    },
    {
      q: tr("چه درخواست‌هایی به دستیار برنامه‌ریزی می‌شود گفت؟", "What can I ask the planning assistant to do?"),
      a: tr(
        "اضافه‌کردن یک برنامه‌ی تکرارشونده به روزهای مشخص، جابه‌جاکردن یا حذف یک روز خاص، تنظیم یادآوری، یا تکرار درون‌روزی مثل «هر یک ساعت پنج دقیقه استراحت». هر درخواست به چند عملیات مشخص تبدیل و قبل از اعمال بررسی می‌شود.",
        "Add a recurring item on set days, move or remove a single day, set a reminder, or repeat within the day, such as “every hour, five minutes of rest”. Each request is turned into a few specific operations and checked before it is applied.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("برنامه ریزی با هوش مصنوعی", "AI planning"), path: "/ai-planner" },
  ];
  return { faqs, breadcrumb, brand };
}

// قیمت «روتین من» داخل FAQ از پنل ادمین (/admin/pricing) پر می‌شه؛ ISR تا تغییر قیمت بدون دیپلوی برسه
export const revalidate = 300;

export default async function AiPlannerPage() {
  const { faqs: rawFaqs, breadcrumb: BREADCRUMB, brand } = content();
  const faqs = fillPriceCopy(rawFaqs, await getPricingConfig());
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
        h1={tr(
          `برنامه ریزی با هوش مصنوعی — دستیار و آنالیز هفتگی ${BRAND_FA}`,
          `AI planning — assistant and weekly review in ${brand}`,
        )}
        lead={tr(
          `${BRAND_FA} دو ابزار هوش مصنوعی برای برنامه‌ریزی دارد: یک دستیار گفت‌وگویی که با ` +
            `زبان خودت برنامه‌ی هفتگی‌ات را می‌چیند، و یک آنالیز هفتگی هوشمند که بعد از یک هفته نشان می‌دهد ` +
            `کجا واقعا پیش رفته‌ای. این صفحه توضیح می‌دهد هرکدام چطور کار می‌کنند.`,
          `${brand} has two AI tools for planning: a chat assistant that builds your weekly schedule in your own ` +
            `language, and a smart weekly review that shows, after a week, where you really made progress. ` +
            `This page explains how each one works.`,
        )}
        ctaNote={tr("شروع رایگان", "Start free")}
        sections={[
          {
            title: tr("چرا برنامه‌ریزی دستی خسته‌کننده است؟", "Why is manual planning tiring?"),
            paragraphs: [
              tr(
                "ثبت هر برنامه‌ی جدید معمولا چند مرحله دارد: انتخاب روزها، تنظیم ساعت، بررسی تداخل با برنامه‌های قبلی. برای یک تغییر ساده مثل «صبح‌ها ورزش اضافه کن»، این مراحل بیشتر از خود تصمیم وقت می‌گیرند.",
                "Adding a new item usually takes several steps: choosing days, setting the time, and checking for overlaps with earlier items. For a simple change like “add exercise in the mornings”, these steps take longer than the decision itself.",
              ),
              tr(
                "دستیار هوش مصنوعی همین کار را با یک جمله انجام می‌دهد — تو تصمیم را می‌گویی، جزئیات فنی (کدام روزها، چه ساعتی، آیا تداخل دارد) را سیستم حل می‌کند.",
                "The AI assistant does the same in one sentence. You say the decision, and the system handles the details (which days, what time, whether there is an overlap).",
              ),
            ],
          },
          {
            title: tr(`دستیار برنامه‌ریزی ${BRAND_FA} چه کارهایی بلد است؟`, `What can the ${brand} planning assistant do?`),
            bullets: [
              {
                title: tr("افزودن برنامه‌ی تکرارشونده", "Add a recurring item"),
                body: tr("مثلا «هر شنبه و دوشنبه و چهارشنبه ساعت هفت صبح دویدن» — به‌جای پرکردن فرم، فقط با جمله می‌گویی.", "For example, “run at 7 a.m. every Saturday, Monday and Wednesday”. Instead of filling in a form, you just say it."),
              },
              {
                title: tr("جابه‌جایی یا حذف یک روز خاص", "Move or remove a single day"),
                body: tr("«فردا مطالعه رو حذف کن» یا «جلسه‌ی امروز رو بنداز جمعه» بدون به‌هم‌ریختن بقیه‌ی تکرار.", "“Remove tomorrow's study” or “move today's meeting to Friday”, without disturbing the rest of the repetition."),
              },
              {
                title: tr("تکرار درون‌روزی", "Repeat within the day"),
                body: tr("«هر یک ساعت پنج دقیقه از پشت میز بلند شو» را به چند یادآوری منظم در طول روز تبدیل می‌کند.", "“Every hour, stand up from your desk for five minutes” becomes several regular reminders across the day."),
              },
              {
                title: tr("بازچینی یک هفته", "Rearrange a week"),
                body: tr("درخواست‌های بزرگ‌تر مثل بازچیدن کل هفته هم پشتیبانی می‌شود، تا سقف مشخصی از تعداد تغییرات در هر پیام.", "Larger requests, such as rearranging the whole week, are supported too, up to a set number of changes per message."),
              },
              {
                title: tr("بررسی نهایی قبل از اعمال", "Final check before applying"),
                body: tr("خروجی مدل قبل از ثبت، با همان قواعدی که فرم‌های دستی دارند اعتبارسنجی می‌شود — ساعت نامعتبر یا تداخل، رد می‌شود.", "Before it is saved, the model's output is validated with the same rules as the manual forms. An invalid time or an overlap is rejected."),
              },
            ],
          },
          {
            title: tr("آنالیز هفتگی هوشمند چه چیزی نشان می‌دهد؟", "What does the smart weekly review show?"),
            bullets: [
              {
                title: tr("وضعیت هر حوزه", "Status of each area"),
                body: tr("روتین، خواب، کارهای روزمره و در صورت فعال‌بودن ماژول‌های تمرین و تغذیه، هرکدام جدا نمایش داده می‌شوند.", "Routine, sleep, daily tasks and, if enabled, the workout and nutrition modules, each shown separately."),
              },
              {
                title: tr("روند نسبت به هفته‌های قبل", "Trend compared with earlier weeks"),
                body: tr("پیشرفت یا افت هر حوزه نسبت به هفته‌ی قبل، نه فقط عدد یک هفته‌ی تنها.", "Progress or decline in each area compared with the previous week, not just the number for one week on its own."),
              },
              {
                title: tr("نقشه‌ی حرارتی هفته", "Weekly heat map"),
                body: tr("کدام روزها و بخش‌ها پرکارتر یا خالی‌تر بوده‌اند، در یک نگاه.", "Which days and areas were busier or emptier, at a glance."),
              },
              {
                title: tr("مربی هوشمند", "Smart coach"),
                body: tr("با درخواست خودت، توصیه‌های عملی و اولویت‌بندی‌شده برای هفته‌ی بعد می‌سازد — نه خودکار روی هر بار بازکردن صفحه.", "When you ask, it writes practical, prioritised advice for next week. It does not run automatically every time you open the page."),
              },
              {
                title: tr("هدف‌گذاری هفتگی", "Weekly goals"),
                body: tr("می‌توانی از دل توصیه‌ها یا خودت، هدف مشخصی برای هفته ثبت کنی.", "You can set a specific goal for the week, either from the advice or on your own."),
              },
            ],
          },
          {
            title: tr("چطور از برنامه‌ریزی هوشمند بهترین استفاده را ببریم؟", "How to get the most out of smart planning"),
            bullets: [
              {
                title: tr("1. درخواست را مشخص بنویس", "1. Be specific in your request"),
                body: tr("«صبح‌ها ورزش اضافه کن» بهتر از «برنامه‌ام رو بهتر کن» جواب می‌گیرد، چون دستیار جزئیات بی‌ابهام لازم دارد.", "“Add exercise in the mornings” gets a better answer than “improve my schedule”, because the assistant needs unambiguous details."),
              },
              {
                title: tr("2. نتیجه را قبل از قبول‌کردن نگاه کن", "2. Check the result before accepting it"),
                body: tr("پیشنهاد قبل از ثبت نهایی نمایش داده می‌شود؛ اگر چیزی درست نبود، دوباره بگو چه می‌خواهی.", "The suggestion is shown before it is saved for good. If something is wrong, tell it again what you want."),
              },
              {
                title: tr("3. آنالیز هفتگی را هفته‌ای یک‌بار ببین", "3. Look at the weekly review once a week"),
                body: tr("چک‌کردن روزانه‌اش داده‌ی معناداری نمی‌دهد؛ روند هفتگی است که چیزی نشان می‌دهد.", "Checking it every day does not give meaningful data; it is the weekly trend that shows something."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره برنامه‌ریزی با هوش مصنوعی", "Frequently asked questions about AI planning")}
        related={[
          {
            href: "/routine",
            label: tr("روتین آریون", `${brand} routine`),
            note: tr("برنامه‌ی روتین روزانه‌ای که دستیار هوش مصنوعی روی همان کار می‌کند.", "The daily routine plan the AI assistant works on."),
          },
          {
            href: "/learning-roadmap",
            label: tr("رودمپ یادگیری با هوش مصنوعی", "AI learning roadmap"),
            note: tr("ساخت مسیر یادگیری یک مهارت با هوش مصنوعی — فعلا در حال تکمیل.", "Build a learning path for a skill with AI. Still in progress for now."),
          },
          {
            href: "/bodybuilding-program",
            label: tr("برنامه بدنسازی با هوش مصنوعی", "AI workout program"),
            note: tr("همان اصل هوش مصنوعی شخصی‌سازی‌شده، برای برنامه‌ی تمرینی.", "The same personalised AI idea, applied to a training program."),
          },
          {
            href: "/daily-planner",
            label: tr("برنامه‌ریزی روزانه با آریون", `Daily planning with ${brand}`),
            note: tr("کارهای امروز و برنامه‌ی هفتگی در یک صفحه.", "Today's tasks and the weekly plan on one page."),
          },
        ]}
      />
    </>
  );
}
