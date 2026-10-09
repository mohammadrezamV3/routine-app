import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { fillPriceCopy } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `کالری شمار فارسی | محاسبه کالری روزانه و ثبت غذا | ${BRAND_FA}`,
      `Calorie counter | Daily calorie calculator and food log | ${brand}`,
    ),
    description: tr(
      `کالری شمار فارسی ${BRAND_FA}: کالری روزانه‌ات را با فرمول علمی محاسبه کن، بین وعده‌ها تقسیم کن ` +
        `و غذاها را از فهرست غذاهای ایرانی یا به‌صورت دستی با پروتئین، کربوهیدرات و چربی ثبت کن.`,
      `Calorie counter in ${brand}: calculate your daily calories with a scientific formula, split them across meals, ` +
        `and log foods from the Iranian food list or by hand with protein, carbs and fat.`,
    ),
    path: "/calorie-counter",
    ownOgImage: true,
    ogTitle: tr(`کالری‌شمار ${BRAND_FA}`, `${brand} calorie counter`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("کالری شمار چطور کالری روزانه‌ام را حساب می‌کند؟", "How does the calorie counter work out my daily calories?"),
      a: tr(
        "با فرمول Mifflin-St Jeor، ابتدا میزان کالری پایه‌ی بدنت در حال استراحت (BMR) از روی جنسیت، قد، وزن و سن محاسبه می‌شود، بعد بر اساس تعداد روزهای فعالیتت در هفته ضریب فعالیت اعمال می‌شود تا کالری نگهداری (TDEE) به‌دست بیاید.",
        "With the Mifflin-St Jeor formula, your resting baseline calories (BMR) are first calculated from your sex, height, weight and age. Then an activity factor based on how many days a week you are active is applied to get your maintenance calories (TDEE).",
      ),
    },
    {
      q: tr("برای کاهش یا افزایش وزن چقدر باید کم یا زیاد کرد؟", "How much should I cut or add to lose or gain weight?"),
      a: tr(
        `${BRAND_FA} برای هدف کاهش وزن حدود 20٪ کسری و برای افزایش وزن حدود 15٪ مازاد روی کالری نگهداری اعمال می‌کند. یک کف ایمنی هم رعایت می‌شود: هدف روزانه هیچ‌وقت زیر BMR یا زیر حداقل بالینی رایج (1200 برای زن و 1500 برای مرد) نمی‌رود.`,
        `${brand} applies about a 20% deficit for weight loss and about a 15% surplus over maintenance calories for weight gain. A safety floor also applies: the daily target never goes below your BMR or the common clinical minimum (1200 for women and 1500 for men).`,
      ),
    },
    {
      q: tr("غذا را چطور در کالری‌شمار ثبت کنم؟", "How do I log food in the calorie counter?"),
      a: tr(
        "نام غذا را جست‌وجو می‌کنی و از فهرست غذاهای رایج ایرانی (مثل برنج، نان‌ها، خورش‌ها و میوه‌ها) انتخابش می‌کنی، مقدار را به گرم یا واحد دلخواه وارد می‌کنی و کالری و درشت‌مغذی‌هایش خودکار حساب می‌شود.",
        "You search for the food name, pick it from the common Iranian food list (such as rice, breads, stews and fruit), enter the amount in grams or your chosen unit, and its calories and macros are calculated automatically.",
      ),
    },
    {
      q: tr("کالری هر وعده چطور تقسیم می‌شود؟", "How are calories split across meals?"),
      a: tr(
        "بر اساس تعداد وعده‌های روزانه‌ات (از 2 تا 6 وعده)، کالری روزانه با نسبت‌های متفاوت بین صبحانه، ناهار، شام و میان‌وعده‌ها تقسیم می‌شود — مثلا برای سه وعده، صبحانه 30٪، ناهار 40٪ و شام 30٪.",
        "Based on how many meals you eat a day (2 to 6), your daily calories are split between breakfast, lunch, dinner and snacks in different ratios. For example, with three meals: breakfast 30%, lunch 40% and dinner 30%.",
      ),
    },
    {
      q: tr("آیا می‌توانم غذای دلخواه را دستی ثبت کنم؟", "Can I log a food by hand?"),
      a: tr(
        "بله، اگر غذایی در فهرست نبود، نام و کالری آن را دستی وارد می‌کنی و پروتئین، کربوهیدرات و چربی را هم (به‌صورت اختیاری) ثبت می‌کنی.",
        "Yes. If a food isn't on the list, you enter its name and calories by hand, and you can optionally add protein, carbs and fat.",
      ),
    },
    {
      q: tr("کالری‌شمار رایگان است؟", "Is the calorie counter free?"),
      a: tr(
        "بخش تغذیه/کالری جزو ماژول‌های اشتراکی است. هر حساب تازه 3 روز دسترسی به بدنسازی، کالری‌شمار و ژورنال ترید، با استفاده‌ی محدود از هوش مصنوعی می‌گیرد. «روتین من» (روتین و کارهای روزانه) 14 روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند.",
        "The nutrition/calorie section is a subscription module. Every new account gets 3 days of access to workouts, the calorie counter and the trading journal, with limited use of AI. “My Routine” (routine and daily tasks) is free for 14 days and then continues with the “My Routine” plan ({{routine_monthly}}).",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("کالری شمار", "Calorie counter"), path: "/calorie-counter" },
  ];
  return { faqs, breadcrumb, brand };
}

// قیمت «روتین من» داخل FAQ از پنل ادمین (/admin/pricing) پر می‌شه؛ ISR تا تغییر قیمت بدون دیپلوی برسه
export const revalidate = 300;

export default async function CalorieCounterPage() {
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
          `کالری شمار فارسی ${BRAND_FA}؛ محاسبه کالری روزانه و ثبت غذا`,
          `Calorie counter in ${brand}: daily calculation and food log`,
        )}
        lead={tr(
          `${BRAND_FA} کالری روزانه‌ی موردنیازت را با فرمول علمی محاسبه می‌کند، آن را بین وعده‌ها ` +
            `تقسیم می‌کند و ثبت غذا را با فهرست غذاهای ایرانی ساده می‌کند. این صفحه توضیح می‌دهد محاسبه‌ی کالری ` +
            `چطور کار می‌کند و ثبت روزانه‌ی غذا چه چیزی به تو می‌دهد.`,
          `${brand} calculates the calories you need with a scientific formula, splits them across your meals, and makes food logging easier with a list of Iranian foods. This page explains how the calorie calculation works and what logging your food daily gives you.`,
        )}
        ctaNote={tr("3 روز آزمایشی رایگان", "3 days free trial")}
        sections={[
          {
            title: tr("کالری روزانه از کجا می‌آید؟", "Where do daily calories come from?"),
            paragraphs: [
              tr(
                "بدنت حتی در حال استراحت کامل هم انرژی مصرف می‌کند — به این عدد BMR (متابولیسم پایه) می‌گویند. با اضافه‌کردن انرژی فعالیت روزانه و تمرین به آن، به TDEE (کالری نگهداری) می‌رسی: عددی که اگر همان‌قدر بخوری، وزنت تقریبا ثابت می‌ماند.",
                "Even when you are completely at rest, your body uses energy. This number is your BMR (basal metabolic rate). Add the energy from your daily activity and training, and you reach your TDEE (maintenance calories): the amount that keeps your weight roughly stable if you eat that much.",
              ),
              tr(
                "برای کاهش یا افزایش وزن، این عدد پایه است — نه یک عدد دلخواه یا رژیم‌های خیلی سختگیرانه که معمولا به کمبود انرژی و ریزش عضله ختم می‌شوند.",
                "For losing or gaining weight, this number is the starting point, not an arbitrary figure or very strict diets that usually end in low energy and muscle loss.",
              ),
            ],
          },
          {
            title: tr("محاسبه کالری در آریون چطور انجام می‌شود؟", `How is the calorie calculation done in ${brand}?`),
            bullets: [
              {
                title: tr("فرمول Mifflin-St Jeor", "The Mifflin-St Jeor formula"),
                body: tr("دقیق‌ترین فرمول رایج برای محاسبه‌ی BMR بدون نیاز به ابزار تخصصی (مثل دستگاه اندازه‌گیری ترکیب بدن).", "The most accurate common formula for calculating BMR without specialised equipment (such as a body composition scale)."),
              },
              {
                title: tr("ضریب فعالیت", "Activity factor"),
                body: tr("بر اساس تعداد روزهای تمرینت در هفته، از کم‌تحرک تا خیلی فعال، ضریب مناسب روی BMR اعمال می‌شود.", "Based on how many training days you have a week, from sedentary to very active, the matching factor is applied to your BMR."),
              },
              {
                title: tr("تنظیم بر اساس هدف", "Adjusted to your goal"),
                body: tr("کاهش وزن، حفظ وزن یا افزایش وزن/عضله — هرکدام درصد تعدیل متفاوتی روی TDEE می‌گیرند.", "Weight loss, maintenance or weight/muscle gain each use a different adjustment percentage on your TDEE."),
              },
              {
                title: tr("کف ایمنی", "Safety floor"),
                body: tr("هدف روزانه هیچ‌وقت زیر BMR یا زیر حداقل بالینی رایج نمی‌رود، حتی برای افراد ریزاندام و کم‌تحرک.", "The daily target never goes below your BMR or the common clinical minimum, even for small, sedentary people."),
              },
            ],
          },
          {
            title: tr("ثبت غذا و درشت‌مغذی‌ها", "Logging food and macros"),
            paragraphs: [
              tr(
                "ثبت دستی هر وعده — جست‌وجوی نام دقیق غذا و محاسبه‌ی کالری — یکی از رایج‌ترین دلایلی است که آدم‌ها بعد از چند روز ثبت‌کردن غذا را رها می‌کنند؛ برای همین ثبت غذا در آریون تا حد ممکن کوتاه شده است.",
                "Logging each meal by hand, searching for the exact food name and working out the calories, is one of the most common reasons people stop logging food after a few days. That is why logging food in this app has been kept as short as possible.",
              ),
            ],
            bullets: [
              {
                title: tr("فهرست غذاهای ایرانی", "Iranian food list"),
                body: tr("برنج، انواع نان، خورش‌ها، لبنیات، میوه‌ها و ده‌ها غذای رایج دیگر با کالری مشخص.", "Rice, types of bread, stews, dairy, fruit and dozens of other common foods with set calories."),
              },
              {
                title: tr("مقدار به گرم یا واحد", "Amount in grams or units"),
                body: tr("مقدار را وارد می‌کنی و کالری، پروتئین، کربوهیدرات و چربی خودکار محاسبه می‌شود.", "You enter the amount and the calories, protein, carbs and fat are calculated automatically."),
              },
              {
                title: tr("ثبت دستی", "Manual entry"),
                body: tr("اگر غذایی در فهرست نبود، نام و کالری‌اش را خودت وارد می‌کنی.", "If a food isn't on the list, you enter its name and calories yourself."),
              },
              {
                title: tr("تاریخچه و روند", "History and trend"),
                body: tr("مجموع هر روز در برابر هدفت و روند 30 روز اخیر، یک‌جا دیده می‌شود.", "Each day's total against your target, and the trend over the last 30 days, are shown in one place."),
              },
            ],
          },
          {
            title: tr("چطور کالری‌شمار را ادامه بدهیم؟", "How to keep up with the calorie counter?"),
            bullets: [
              {
                title: tr("1. هدف واقع‌بینانه انتخاب کن", "1. Choose a realistic goal"),
                body: tr("کسری یا مازاد شدید، در بلندمدت قابل‌ادامه نیست و معمولا با بازگشت وزن تمام می‌شود.", "A severe deficit or surplus is not sustainable long term and usually ends with the weight coming back."),
              },
              {
                title: tr("2. وعده‌ها را متناسب با روزت تقسیم کن", "2. Split meals to suit your day"),
                body: tr("اگر صبح‌ها گرسنه نیستی، سهم صبحانه را کم و سهم ناهار/شام را بیشتر کن.", "If you're not hungry in the mornings, give breakfast a smaller share and lunch or dinner a bigger one."),
              },
              {
                title: tr("3. همه‌چیز را ثبت کن، حتی میان‌وعده‌ها", "3. Log everything, even snacks"),
                body: tr("کالری‌های کوچک و پراکنده در طول روز، جمعشان بیشتر از چیزی است که فکر می‌کنی.", "Small scattered calories during the day add up to more than you think."),
              },
              {
                title: tr("4. هفتگی مرور کن، نه روزانه قضاوت کن", "4. Review weekly, don't judge daily"),
                body: tr("یک روز پرکالری، مسیر هفته را خراب نمی‌کند؛ روند هفتگی مهم است.", "One high-calorie day doesn't ruin the week's path; the weekly trend is what matters."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره کالری‌شمار", "Frequently asked questions about the calorie counter")}
        related={[
          {
            href: "/bodybuilding-program",
            label: tr("برنامه بدنسازی با هوش مصنوعی", "Workout plan with AI"),
            note: tr("برنامه‌ی تمرینی متناسب با هدف و سطح، برای هماهنگی با تغذیه.", "A training program that fits your goal and level, to match your nutrition."),
          },
          {
            href: "/ai-planner",
            label: tr("برنامه‌ریزی با هوش مصنوعی", "Planning with AI"),
            note: tr("دستیار هوشمند برنامه‌ی هفتگی.", "The smart assistant for your weekly plan."),
          },
          {
            href: "/routine",
            label: tr("روتین آریون", `${brand} routine`),
            note: tr("ثبت وعده‌های غذایی به‌عنوان بخشی از روتین روزانه.", "Logging meals as part of your daily routine."),
          },
          {
            href: "/blog",
            label: tr("مقاله‌های آریون", `${brand} articles`),
            note: tr("راهنماهای کاربردی درباره‌ی تغذیه و تمرین.", "Practical guides on nutrition and training."),
          },
        ]}
      />
    </>
  );
}
