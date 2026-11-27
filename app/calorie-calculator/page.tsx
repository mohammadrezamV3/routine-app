import type { Metadata } from "next";
import { SeoToolPage, type ToolSection } from "@/components/SeoToolPage";
import { ToolCalorieCalc } from "@/components/ToolCalorieCalc";
import type { SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { toolJsonLd } from "@/lib/toolSeo";

const PATH = "/calorie-calculator";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `محاسبه کالری روزانه (TDEE و BMR) رایگان | ${BRAND_FA}`,
      `Free daily calorie calculator (TDEE and BMR) | ${brand}`,
    ),
    description: tr(
      "ماشین حساب رایگان کالری روزانه با فرمول Mifflin-St Jeor: BMR، TDEE، کالری مناسب کاهش، حفظ یا افزایش وزن و پروتئین پیشنهادی را در چند ثانیه و بدون ثبت نام ببین.",
      "Free daily calorie calculator using the Mifflin-St Jeor formula: see your BMR, TDEE, calories for losing, maintaining or gaining weight, and suggested protein in seconds, no sign-up.",
    ),
    path: PATH,
    ownOgImage: true,
    ogTitle: tr("محاسبه کالری روزانه (TDEE و BMR)", "Daily calorie calculator (TDEE and BMR)"),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("تفاوت BMR و TDEE چیست؟", "What is the difference between BMR and TDEE?"),
      a: tr(
        "BMR کالری‌ای است که بدنت در حالت استراحت کامل برای نفس کشیدن، گردش خون و کارکرد اندام‌ها می‌سوزاند. TDEE همان BMR است که در ضریب فعالیت روزانه ضرب شده و کالری کل مصرفی یک روز را نشان می‌دهد. اگر هر روز به اندازه‌ی TDEE بخوری، وزنت تقریبا ثابت می‌ماند.",
        "BMR is the energy your body burns at complete rest for breathing, circulation and organ function. TDEE is your BMR multiplied by a daily activity factor and shows the total calories you burn in a day. If you eat your TDEE every day, your weight stays roughly stable.",
      ),
    },
    {
      q: tr("برای کاهش وزن روزانه چند کالری بخورم؟", "How many calories should I eat a day to lose weight?"),
      a: tr(
        "در این ماشین حساب برای کاهش وزن حدود 20 درصد کمتر از TDEE در نظر گرفته می‌شود. این کسری معمولا کاهش آهسته و پایدار حدود نیم تا یک کیلوگرم در هفته می‌دهد. عدد هرگز زیر BMR یا زیر حداقل ایمن (1200 برای زن و 1500 برای مرد) نمی‌رود.",
        "For weight loss this calculator uses about 20 percent below your TDEE. That deficit usually gives a slow, sustainable loss of roughly half to one kilogram per week. The number never goes below your BMR or the safe minimum (1200 for women, 1500 for men).",
      ),
    },
    {
      q: tr("فرمول Mifflin-St Jeor چقدر دقیق است؟", "How accurate is the Mifflin-St Jeor formula?"),
      a: tr(
        "در مطالعه‌های مقایسه‌ای، این فرمول برای بیشتر بزرگسالان از فرمول قدیمی هریس-بندیکت دقیق‌تر بوده است. با این حال هر فرمول فقط تخمین می‌زند و ممکن است حدود 10 درصد با مصرف واقعی تو فرق داشته باشد. بهترین راه، دنبال کردن روند وزن در دو تا سه هفته و تنظیم عدد است.",
        "In comparison studies this formula has been more accurate than the older Harris-Benedict equation for most adults. Still, every formula is only an estimate and may differ from your real burn by about 10 percent. The best approach is to track your weight trend for two to three weeks and adjust.",
      ),
    },
    {
      q: tr("سطح فعالیتم را چطور انتخاب کنم؟", "How do I choose my activity level?"),
      a: tr(
        "فقط به تعداد روزهایی نگاه کن که در هفته تمرین جدی یا فعالیت سنگین داری. بیشتر آدم‌ها فعالیتشان را بیشتر از واقعیت تخمین می‌زنند، پس اگر مطمئن نیستی گزینه‌ی پایین‌تر را بزن و بعد از چند هفته بر اساس وزنت اصلاح کن.",
        "Count only the days per week with serious training or heavy activity. Most people overestimate their activity, so if you are unsure, pick the lower option and correct it after a few weeks based on your weight.",
      ),
    },
    {
      q: tr("پروتئین روزانه چقدر باید باشد؟", "How much protein do I need per day?"),
      a: tr(
        "برای بیشتر افراد فعال حدود 1.6 تا 2.2 گرم به‌ازای هر کیلوگرم وزن در دوره‌ی کاهش وزن یا عضله‌سازی و حدود 1.2 تا 1.8 گرم برای حفظ وزن مناسب است. افراد با بیماری کلیوی پیش از افزایش پروتئین باید با پزشک مشورت کنند.",
        "For most active people, about 1.6 to 2.2 grams per kilogram of body weight suits fat loss or muscle gain, and about 1.2 to 1.8 grams suits maintenance. People with kidney disease should talk to a doctor before raising protein.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("محاسبه کالری روزانه", "Daily calorie calculator"), path: PATH },
  ];
  const sections: ToolSection[] = [
    {
      title: tr("BMR و TDEE یعنی چه؟", "What do BMR and TDEE mean?"),
      paragraphs: [
        tr(
          "بدن تو حتی وقتی تمام روز را در تخت بمانی انرژی مصرف می‌کند: قلب می‌تپد، ریه‌ها کار می‌کنند و دمای بدن ثابت می‌ماند. به این مقدار انرژی BMR یا متابولیسم پایه می‌گویند و برای بیشتر آدم‌ها 60 تا 70 درصد کل کالری مصرفی روز را می‌سازد.",
          "Even if you stay in bed all day your body uses energy: your heart beats, your lungs work and your temperature stays stable. This is your BMR, or basal metabolic rate, and for most people it makes up 60 to 70 percent of the calories burned in a day.",
        ),
        tr(
          "وقتی راه رفتن، کار، تمرین و هضم غذا را به BMR اضافه کنی به TDEE می‌رسی، یعنی کل انرژی مصرفی روزانه. TDEE نقطه‌ی شروع هر برنامه‌ی تغذیه است: کمتر از آن بخوری وزن کم می‌کنی، بیشتر بخوری وزن اضافه می‌کنی.",
          "Add walking, work, training and digesting food to your BMR and you get your TDEE, the total energy you burn per day. TDEE is the starting point of any nutrition plan: eat less and you lose weight, eat more and you gain.",
        ),
      ],
    },
    {
      title: tr("فرمول محاسبه کالری", "The calorie formula"),
      paragraphs: [
        tr(
          "این ماشین حساب از فرمول Mifflin-St Jeor استفاده می‌کند که یکی از دقیق‌ترین فرمول‌های BMR بدون نیاز به دستگاه ترکیب بدن است. بعد BMR در ضریب فعالیت ضرب می‌شود: 1.2 بدون ورزش، 1.375 برای یک تا دو روز، 1.55 برای سه تا چهار روز، 1.725 برای پنج تا شش روز و 1.9 برای فعالیت هر روزه.",
          "This calculator uses the Mifflin-St Jeor formula, one of the most accurate BMR formulas that needs no body-composition device. BMR is then multiplied by an activity factor: 1.2 for no training, 1.375 for one to two days, 1.55 for three to four days, 1.725 for five to six days and 1.9 for daily activity.",
        ),
      ],
      formula: "BMR = 10 x kg + 6.25 x cm - 5 x age + 5 (male) | - 161 (female)\nTDEE = BMR x activity factor",
    },
    {
      title: tr("مثال محاسبه", "Worked example"),
      paragraphs: [
        tr(
          "مردی 30 ساله با قد 180 سانتی‌متر و وزن 80 کیلوگرم را در نظر بگیر: BMR = 800 + 1125 - 150 + 5 = 1780 کیلوکالری. اگر هفته‌ای سه تا چهار روز تمرین کند، TDEE = 1780 x 1.55 = حدود 2759 کیلوکالری.",
          "Take a 30-year-old man, 180 cm and 80 kg: BMR = 800 + 1125 - 150 + 5 = 1780 kcal. If he trains three to four days a week, TDEE = 1780 x 1.55 = about 2759 kcal.",
        ),
        tr(
          "برای کاهش وزن هدفش حدود 2210 کیلوکالری (20 درصد کمتر) و برای افزایش عضله حدود 3170 کیلوکالری (15 درصد بیشتر) می‌شود. پروتئین پیشنهادی او برای حفظ وزن حدود 96 تا 144 گرم در روز است.",
          "For fat loss his target is about 2210 kcal (20 percent less) and for muscle gain about 3170 kcal (15 percent more). His suggested protein for maintenance is about 96 to 144 grams per day.",
        ),
      ],
    },
    {
      title: tr("بعد از محاسبه چه کنم؟", "What to do after calculating"),
      bullets: [
        {
          title: tr("عدد را دو تا سه هفته امتحان کن", "Test the number for two to three weeks"),
          body: tr("میانگین وزن هفتگی‌ات را ببین. اگر مطابق هدف تغییر نکرد، حدود 100 تا 150 کیلوکالری کم یا زیاد کن.", "Watch your weekly average weight. If it does not move toward your goal, add or remove about 100 to 150 kcal."),
        },
        {
          title: tr("کالری را بین وعده‌ها تقسیم کن", "Split calories across meals"),
          body: tr("سه وعده‌ی اصلی و یک یا دو میان‌وعده معمولا برای رعایت کردن راحت‌تر است؛ زمان‌بندی دقیق از کل کالری روز مهم‌تر نیست.", "Three main meals plus one or two snacks are usually easier to stick to; exact timing matters less than the daily total."),
        },
        {
          title: tr("کیفیت غذا را فراموش نکن", "Do not ignore food quality"),
          body: tr("پروتئین کافی، سبزی، میوه و غلات کامل سیری را بالا نگه می‌دارد و رعایت برنامه را ساده‌تر می‌کند.", "Enough protein, vegetables, fruit and whole grains keep you full and make the plan easier to follow."),
        },
      ],
    },
  ];
  return { faqs, breadcrumb, sections, brand };
}

export default function CalorieCalculatorPage() {
  const { faqs, breadcrumb, sections, brand } = content();
  const name = tr("محاسبه کالری روزانه (TDEE و BMR)", "Daily calorie calculator (TDEE and BMR)");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            toolJsonLd({
              path: PATH,
              name,
              description: tr("ماشین حساب رایگان کالری روزانه، BMR و TDEE با فرمول Mifflin-St Jeor", "Free daily calorie, BMR and TDEE calculator using the Mifflin-St Jeor formula"),
              category: "HealthApplication",
              breadcrumb,
              faqs,
            }),
          ),
        }}
      />
      <SeoToolPage
        breadcrumb={breadcrumb}
        h1={tr("محاسبه کالری روزانه (TDEE و BMR)", "Daily calorie calculator (TDEE and BMR)")}
        lead={tr(
          "جنسیت، سن، قد، وزن و میزان فعالیتت را وارد کن تا کالری پایه‌ی بدنت، کالری نگهداری و کالری مناسب کاهش، حفظ یا افزایش وزن را ببینی. رایگان است و نیازی به ثبت نام ندارد.",
          "Enter your sex, age, height, weight and activity to see your basal calories, maintenance calories and the right calories for losing, maintaining or gaining weight. It is free and needs no sign-up.",
        )}
        toolTitle={tr("ماشین حساب کالری", "Calorie calculator")}
        tool={<ToolCalorieCalc />}
        sections={sections}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره محاسبه کالری", "Frequently asked questions about calorie calculation")}
        related={[
          { href: "/calorie-counter", label: tr("کالری‌شمار فارسی", "Calorie counter"), note: tr("هدفت را بساز و غذاهای روزانه را با درشت‌مغذی‌ها ثبت کن.", "Set your goal and log daily foods with macros.") },
          { href: "/blog/how-to-count-daily-calories", label: tr("روش شمارش کالری روزانه", "How to count daily calories"), note: tr("راهنمای گام‌به‌گام شمردن کالری بدون سخت‌گیری بی‌دلیل.", "A step-by-step guide to counting calories without needless strictness.") },
          { href: "/bmi-calculator", label: tr("محاسبه BMI", "BMI calculator"), note: tr("شاخص توده بدنی و محدوده‌ی وزن سالم برای قدت.", "Your body mass index and healthy weight range for your height.") },
        ]}
        ctaText={tr(
          `با ${brand} هدف کالری‌ات را ذخیره کن و هر روز غذاهایت را در چند ثانیه ثبت کن.`,
          `Save your calorie goal in ${brand} and log your meals in seconds every day.`,
        )}
      />
    </>
  );
}
