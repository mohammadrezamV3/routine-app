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
      `ساخت برنامه بدنسازی با هوش مصنوعی | برنامه تمرینی شخصی‌سازی‌شده | ${BRAND_FA}`,
      `Build a workout plan with AI | Personalised training program | ${brand}`,
    ),
    description: tr(
      `برنامه بدنسازی متناسب با هدف، سطح و روزهای باشگاهت را در ${BRAND_FA} با هوش ` +
        `مصنوعی بساز — قدرت، حجم، کات یا استقامت، با توضیح اجرای هر حرکت.`,
      `Build a workout plan that fits your goal, level and gym days in ${brand} with AI: strength, muscle gain, cutting or endurance, with instructions for each exercise.`,
    ),
    path: "/bodybuilding-program",
    ownOgImage: true,
    ogTitle: tr(`برنامه بدنسازی با هوش مصنوعی | ${BRAND_FA}`, `Workout plan with AI | ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("برنامه بدنسازی با هوش مصنوعی یعنی چه؟", "What does an AI workout plan mean?"),
      a: tr(
        "به‌جای یک برنامه‌ی ثابت و یکسان برای همه، هدف، سطح تمرینی، قد و وزن، تعداد روزهای باشگاه و امکانات (باشگاه یا خانه) را می‌گیرد و بر اساس آن‌ها یک برنامه‌ی تمرینی می‌سازد. اگر محدودیت جسمی داشته باشی، حرکات پرفشار خودکار با معادل ملایم‌تر جایگزین می‌شوند.",
        "Instead of one fixed plan for everyone, it takes your goal, training level, height and weight, the number of gym days and your equipment (gym or home) and builds a training program from them. If you have a physical limitation, high-stress exercises are automatically replaced with gentler alternatives.",
      ),
    },
    {
      q: tr(`چطور در ${BRAND_FA} برنامه تمرینی بسازم؟`, `How do I build a training program in ${brand}?`),
      a: tr(
        "در بخش بدنسازی، قد و وزن، هدفت را با متن آزاد (مثلا «می‌خوام حجم بگیرم و شکمم آب بشه»)، چندمین ماه تمرینت، امکانات و روزهای باشگاهت را وارد می‌کنی. برنامه بر اساس همین‌ها ساخته می‌شود؛ می‌توانی توضیح اضافه هم بنویسی.",
        "In the workout section, you enter your height and weight, your goal in free text (for example “I want to build muscle and get a flat stomach”), which month of training you are in, your equipment and your gym days. The program is built from these; you can also add extra notes.",
      ),
    },
    {
      q: tr("برنامه بر چه اصولی ساخته می‌شود؟", "What principles is the program based on?"),
      a: tr(
        "بر اساس اصول شناخته‌شده‌ی تمرین مقاومتی: برنامه‌ی قدرت با تکرار پایین (3 تا 6) و بار سنگین، حجم با تکرار 8 تا 12 و فرکانس حدود دو بار در هفته برای هر گروه عضلانی، کات با ترکیب مقاومتی و کاردیو برای کسری کالری، و استقامت عمدتا هوازی.",
        "On well-known resistance training principles: a strength program with low reps (3 to 6) and heavy loads; muscle building with 8 to 12 reps and about two sessions a week for each muscle group; cutting with resistance training plus cardio for a calorie deficit; and endurance, mainly aerobic.",
      ),
    },
    {
      q: tr("اگر هدفم واقع‌بینانه نباشد چه می‌شود؟", "What if my goal is not realistic?"),
      a: tr(
        "قبل از ساخت برنامه، هوش مصنوعی بررسی می‌کند خواسته منطقی است یا نه؛ اگر نه، به‌جای ساختن یک برنامه‌ی گمراه‌کننده، توضیح می‌دهد چرا و می‌توانی توضیحت را اصلاح کنی.",
        "Before building the program, the AI checks whether the goal is reasonable. If not, instead of producing a misleading plan, it explains why, and you can revise your description.",
      ),
    },
    {
      q: tr("آیا نحوه‌ی اجرای حرکات هم توضیح داده می‌شود؟", "Are the exercises explained too?"),
      a: tr(
        `بله، ${BRAND_FA} یک کاتالوگ حرکات دارد که برای هر حرکت گروه عضلانی درگیر، مراحل اجرا و فایده‌اش را نشان می‌دهد — برای وقتی که اسم حرکتی در برنامه‌ات آشنا نیست.`,
        `Yes. ${brand} has an exercise catalogue that shows, for each move, the muscle groups involved, the steps to perform it and its benefits, for when an exercise name in your program is unfamiliar.`,
      ),
    },
    {
      q: tr("بخش بدنسازی رایگان است؟", "Is the workout section free?"),
      a: tr(
        "بخش تمرین بدنسازی جزو ماژول‌های اشتراکی است. هر حساب تازه 3 روز دسترسی به بدنسازی، کالری‌شمار و ژورنال ترید، با استفاده‌ی محدود از هوش مصنوعی می‌گیرد. «روتین من» (روتین و کارهای روزانه) 14 روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند.",
        "The workout section is a subscription module. Every new account gets 3 days of access to workouts, the calorie counter and the trading journal, with limited use of AI. “My Routine” (routine and daily tasks) is free for 14 days and then continues with the “My Routine” plan ({{routine_monthly}}).",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("برنامه بدنسازی", "Workout plan"), path: "/bodybuilding-program" },
  ];
  return { faqs, breadcrumb, brand };
}

// قیمت «روتین من» داخل FAQ از پنل ادمین (/admin/pricing) پر می‌شه؛ ISR تا تغییر قیمت بدون دیپلوی برسه
export const revalidate = 300;

export default async function BodybuildingProgramPage() {
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
        h1={tr(`برنامه بدنسازی با هوش مصنوعی — ${BRAND_FA}`, `Workout plan with AI — ${brand}`)}
        lead={tr(
          `${BRAND_FA} برنامه‌ی تمرینی‌ات را بر اساس هدف، سطح، قد و وزن و روزهای واقعی ` +
            `باشگاهت با هوش مصنوعی می‌سازد — نه یک قالب ثابت که به همه داده می‌شود. این صفحه توضیح می‌دهد ` +
            `یک برنامه بدنسازی خوب چه اصولی دارد و در آریون چطور ساخته می‌شود.`,
          `${brand} builds your training program with AI, based on your goal, level, height and weight and the real days you can get to the gym, not a fixed template given to everyone. This page explains what makes a good workout plan and how it is built in ${brand}.`,
        )}
        ctaNote={tr("3 روز آزمایشی رایگان", "3 days free trial")}
        sections={[
          {
            title: tr("چرا یک برنامه‌ی ثابت برای همه جواب نمی‌دهد؟", "Why doesn't one fixed plan work for everyone?"),
            paragraphs: [
              tr(
                "برنامه‌ای که برای یک فرد پیشرفته با هدف قدرت نوشته شده، برای یک مبتدی با هدف کاهش چربی نه‌تنها بی‌فایده که می‌تواند خطرناک باشد. حجم تمرین، شدت و نوع حرکات باید با هدف، سطح تجربه و شرایط بدنی فرد هماهنگ باشد.",
                "A plan written for an advanced lifter aiming for strength can be not just useless but risky for a beginner aiming to lose fat. Training volume, intensity and exercise type need to match the goal, experience level and physical condition of the person.",
              ),
              tr(
                "به همین دلیل، ساختن یک برنامه‌ی درست چند متغیر را هم‌زمان در نظر می‌گیرد: هدف چیست، چند وقت است تمرین می‌کنی، چند روز در هفته وقت داری، و چه امکاناتی در دسترس‌ات است.",
                "That is why building a correct plan takes several variables into account at once: what your goal is, how long you have been training, how many days a week you have, and what equipment you have access to.",
              ),
            ],
          },
          {
            title: tr("چهار مسیر اصلی برنامه‌ی تمرینی", "The four main training paths"),
            bullets: [
              {
                title: tr("قدرت", "Strength"),
                body: tr("تکرار پایین (3 تا 6) با بار نسبتا سنگین، تمرکز روی حرکات چندمفصلی مثل اسکوات، پرس سینه و ددلیفت.", "Low reps (3 to 6) with fairly heavy loads, focused on compound moves such as squats, bench press and deadlifts."),
              },
              {
                title: tr("حجم (هایپرتروفی)", "Muscle gain (hypertrophy)"),
                body: tr("تکرار میانی (8 تا 12) با حجم هفتگی بالاتر — هر گروه عضلانی حدود دو بار در هفته کار می‌کند.", "Medium reps (8 to 12) with a higher weekly volume. Each muscle group works about twice a week."),
              },
              {
                title: tr("کات (کاهش چربی)", "Cutting (fat loss)"),
                body: tr("ترکیب تمرین مقاومتی با تکرار متوسط برای حفظ عضله، به‌علاوه‌ی کاردیوی تناوبی یا پیوسته برای کمک به کسری کالری.", "Resistance training with moderate reps to keep muscle, plus interval or steady cardio to support a calorie deficit."),
              },
              {
                title: tr("استقامت", "Endurance"),
                body: tr("عمدتا کاردیوی پیوسته و تناوبی، با یک یا دو جلسه‌ی تقویتی سبک برای جلوگیری از آسیب.", "Mainly steady and interval cardio, with one or two light strength sessions to help prevent injury."),
              },
            ],
          },
          {
            title: tr(`برنامه‌ساز بدنسازی ${BRAND_FA} چطور کار می‌کند؟`, `How does the ${brand} workout builder work?`),
            bullets: [
              {
                title: tr("قد، وزن و ماه تمرین", "Height, weight and training month"),
                body: tr("برای تناسب حجم تمرین با سابقه‌ی واقعی‌ات — برنامه‌ی ماه اول با ماه دوازدهم فرق دارد.", "So the training volume fits your real experience. The plan for month one is different from month twelve."),
              },
              {
                title: tr("هدف با متن آزاد", "Goal in free text"),
                body: tr("به‌جای انتخاب از چند گزینه‌ی محدود، هدفت را با جمله‌ی خودت می‌نویسی؛ هوش مصنوعی همان متن را می‌خواند.", "Instead of picking from a few limited options, you write your goal in your own sentence, and the AI reads that text."),
              },
              {
                title: tr("امکانات و روزهای باشگاه", "Equipment and gym days"),
                body: tr("برنامه دقیقا روی همان روزهایی می‌نشیند که تو انتخاب کرده‌ای، نه روزهای پیش‌فرض یک قالب.", "The program is placed exactly on the days you chose, not on a template's default days."),
              },
              {
                title: tr("محدودیت جسمی", "Physical limitations"),
                body: tr("اگر بگویی محدودیت داری، حرکات پرفشار و پرضربه (مثل برپی یا پرش جعبه) با نسخه‌ی ملایم‌تر جایگزین می‌شوند.", "If you say you have a limitation, high-stress and high-impact moves (such as burpees or box jumps) are replaced with gentler versions."),
              },
              {
                title: tr("بازبینی قبل از ثبت", "Review before saving"),
                body: tr("قبل از ذخیره‌شدن نهایی، برنامه را می‌بینی و می‌توانی اصلاحش کنی.", "Before it is finally saved, you see the program and can edit it."),
              },
              {
                title: tr("کاتالوگ حرکات", "Exercise catalogue"),
                body: tr("برای هر حرکت، گروه عضلانی، مراحل اجرا و فایده‌اش قابل مشاهده است.", "For each move, you can see the muscle group, the steps and its benefits."),
              },
            ],
          },
          {
            title: tr("چطور یک برنامه‌ی بدنسازی را واقعا دنبال کنیم؟", "How to really stick to a workout plan?"),
            bullets: [
              {
                title: tr("1. هدف را مشخص کن", "1. Set a clear goal"),
                body: tr("قدرت، حجم، کات یا استقامت — ترکیب هر چهارتا هم‌زمان معمولا هیچ‌کدام را خوب پیش نمی‌برد.", "Strength, muscle gain, cutting or endurance. Combining all four at once usually moves none of them forward well."),
              },
              {
                title: tr("2. روزهای واقعی را انتخاب کن، نه ایده‌آل", "2. Pick real days, not ideal ones"),
                body: tr("برنامه‌ای که روی روزهایی نوشته شود که واقعا در دسترس نیستند، از همان هفته‌ی اول عقب می‌افتد.", "A plan written for days you are not really free will fall behind from the first week."),
              },
              {
                title: tr("3. فرم حرکت را قبل از افزایش وزنه یاد بگیر", "3. Learn good form before adding weight"),
                body: tr("به‌خصوص در حرکات چندمفصلی، فرم درست از وزنه‌ی بیشتر مهم‌تر است.", "Especially in compound moves, correct form matters more than heavier weight."),
              },
              {
                title: tr("4. پیشرفت را ثبت کن", "4. Record your progress"),
                body: tr("بدون ثبت وزنه و تکرار هر جلسه، فهمیدن اینکه واقعا پیشرفت کرده‌ای یا نه ممکن نیست.", "Without recording the weight and reps of each session, you can't tell whether you're really improving."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره برنامه بدنسازی", "Frequently asked questions about workout plans")}
        related={[
          {
            href: "/calorie-counter",
            label: tr("کالری‌شمار آریون", `${brand} calorie counter`),
            note: tr("محاسبه‌ی کالری روزانه و ثبت غذا و درشت‌مغذی‌ها، برای هماهنگی تغذیه با تمرین.", "Daily calorie calculation and logging of food and macros, to match your nutrition to your training."),
          },
          {
            href: "/ai-planner",
            label: tr("برنامه‌ریزی با هوش مصنوعی", "Planning with AI"),
            note: tr("دستیار هوشمند برنامه‌ی هفتگی و آنالیز هفتگی روتین.", "The smart assistant for your weekly plan and the routine's weekly review."),
          },
          {
            href: "/routine",
            label: tr("روتین آریون", `${brand} routine`),
            note: tr("روتین روزانه و هفتگی، برای هماهنگ‌کردن تمرین با بقیه‌ی برنامه‌ات.", "A daily and weekly routine, to fit your training around the rest of your plan."),
          },
          {
            href: "/blog",
            label: tr("مقاله‌های آریون", `${brand} articles`),
            note: tr("راهنماهای کاربردی درباره‌ی تمرین، تغذیه و برنامه‌ریزی.", "Practical guides on training, nutrition and planning."),
          },
        ]}
      />
    </>
  );
}
