import type { Metadata } from "next";
import { ToolPageShell } from "@/components/ToolPageShell";
import { ToolCalorieCalculator } from "@/components/ToolCalorieCalculator";
import type { SeoFaq, SeoSection } from "@/components/SeoLanding";
import { brandName } from "@/lib/brand";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";
import { webApplicationJsonLd } from "@/lib/toolsSeo";
import { tr } from "@/lib/i18n";

const PATH = "/tools/calorie-calculator";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: tr(`محاسبه کالری روزانه (BMR و TDEE) آنلاین | ${brandName()}`, `Daily calorie calculator (BMR and TDEE) online | ${brandName()}`),
    description:
      tr("ماشین‌حساب رایگان کالری روزانه: با سن، قد، وزن و سطح فعالیت، BMR و TDEE و کالری هدف برای کاهش، حفظ یا افزایش وزن را همراه با ماکروها ببین.", "Free daily calorie calculator: enter your age, height, weight and activity level to see your BMR, TDEE and target calories for losing, maintaining or gaining weight, along with macros."),
    path: PATH,
  });
}

const faqs = (): SeoFaq[] => [
  {
    q: tr("BMR چیست؟", "What is BMR?"),
    a: tr("BMR یا متابولیسم پایه، کالری‌ای است که بدن در حالت استراحت کامل برای کارهای حیاتی مثل نفس کشیدن و گردش خون مصرف می‌کند. این عدد بدون احتساب فعالیت روزانه است.", "BMR, or basal metabolic rate, is the calories your body burns at complete rest for vital functions such as breathing and circulation. This number does not include daily activity."),
  },
  {
    q: tr("فرق BMR و TDEE چیست؟", "What is the difference between BMR and TDEE?"),
    a: tr("TDEE کل کالری مصرفی روزانه است و از ضرب BMR در ضریب فعالیت به دست می‌آید. اگر هر روز به اندازه‌ی TDEE غذا بخوری، وزنت تقریبا ثابت می‌ماند.", "TDEE is your total daily calorie expenditure and is calculated by multiplying BMR by an activity factor. If you eat the TDEE amount every day, your weight stays roughly the same."),
  },
  {
    q: tr("برای کاهش وزن چقدر کالری کم کنم؟", "How many calories should I cut to lose weight?"),
    a: tr("این ابزار 20 درصد از TDEE کم می‌کند، که کاهش نسبتا ملایمی است. کاهش شدیدتر معمولا پایدار نیست و ممکن است عضله را هم از بین ببرد. ابزار عدد را هیچ‌وقت زیر حداقل ایمن و زیر BMR نمی‌برد.", "This tool subtracts 20 percent from TDEE, which is a fairly gentle deficit. A sharper cut is usually not sustainable and may also cost you muscle. The tool never takes the number below the safe minimum or below your BMR."),
  },
  {
    q: tr("نتیجه چقدر دقیق است؟", "How accurate is the result?"),
    a: tr("فرمول میفلین سنت جئور یک برآورد آماری است و ممکن است برای هر فرد چند ده تا چند صد کیلوکالری خطا داشته باشد. بهترین راه این است که 2 تا 3 هفته روند وزنت را ببینی و عدد را تنظیم کنی.", "The Mifflin-St Jeor formula is a statistical estimate and can be off by tens to hundreds of kilocalories for any individual. The best approach is to watch your weight trend for 2 to 3 weeks and adjust the number."),
  },
  {
    q: tr("ماکروهایی که نشان می‌دهید قطعی هستند؟", "Are the macros you show definitive?"),
    a: tr("نه، پیشنهاد ساده و رایج هستند: پروتئین بر اساس وزن بدن، 25 درصد کالری از چربی و باقی از کربوهیدرات. برای برنامه‌ی دقیق‌تر با متخصص تغذیه مشورت کن.", "No, they are a simple, common suggestion: protein based on body weight, 25 percent of calories from fat and the rest from carbohydrates. For a more precise plan, consult a nutrition specialist."),
  },
];

const sections = (): SeoSection[] => [
  {
    title: tr("کالری روزانه چطور محاسبه می‌شود؟", "How is daily calorie need calculated?"),
    paragraphs: [
      tr("محاسبه در سه گام انجام می‌شود. اول BMR با فرمول میفلین سنت جئور به دست می‌آید که امروزه از دقیق‌ترین فرمول‌های رایج برای برآورد متابولیسم پایه است. دوم، BMR در ضریب فعالیت ضرب می‌شود تا کل مصرف روزانه (TDEE) به دست بیاید. سوم، بر اساس هدف تو، کالری هدف تنظیم می‌شود.", "The calculation happens in three steps. First, BMR is found with the Mifflin-St Jeor formula, one of the most accurate common formulas for estimating basal metabolism today. Second, BMR is multiplied by an activity factor to get total daily expenditure (TDEE). Third, the target calories are adjusted according to your goal."),
    ],
  },
  {
    title: tr("فرمول‌ها", "Formulas"),
    bullets: [
      { title: tr("BMR مردان", "Male BMR"), body: tr("10 ضرب در وزن (کیلوگرم) به اضافه‌ی 6.25 ضرب در قد (سانتی‌متر) منهای 5 ضرب در سن، به اضافه‌ی 5.", "10 times weight (kg) plus 6.25 times height (cm) minus 5 times age, plus 5.") },
      { title: tr("BMR زنان", "Female BMR"), body: tr("همان عبارت بالا، اما به جای 5+ مقدار 161- اضافه می‌شود.", "The same expression as above, but subtract 161 instead of adding 5.") },
      { title: tr("ضریب فعالیت", "Activity factor"), body: tr("کم‌تحرک 1.2، فعالیت سبک 1.375، متوسط 1.55، زیاد 1.725 و خیلی زیاد 1.9.", "Sedentary 1.2, light activity 1.375, moderate 1.55, high 1.725 and very high 1.9.") },
      { title: tr("تنظیم هدف", "Goal adjustment"), body: tr("کاهش وزن: 20 درصد کمتر از TDEE. حفظ وزن: همان TDEE. افزایش وزن: 15 درصد بیشتر از TDEE.", "Weight loss: 20 percent below TDEE. Maintenance: the same as TDEE. Weight gain: 15 percent above TDEE.") },
    ],
  },
  {
    title: tr("نتیجه را چطور بخوانیم؟", "How to read the result"),
    paragraphs: [
      tr("عدد بزرگ بالای نتیجه، کالری پیشنهادی روزانه برای هدف انتخاب‌شده است. BMR و TDEE کنار آن آمده‌اند تا ببینی عدد از کجا آمده. ماکروها هم یک تقسیم ساده‌اند: پروتئین بر اساس وزن بدن (حدود 1.6 گرم به ازای هر کیلوگرم، و 2 گرم در هدف کاهش وزن)، چربی 25 درصد کالری و باقی‌مانده کربوهیدرات.", "The big number at the top of the result is the suggested daily calories for the goal you chose. BMR and TDEE are shown beside it so you can see where the number comes from. The macros are a simple split too: protein based on body weight (about 1.6 grams per kilogram, and 2 grams for a weight-loss goal), fat at 25 percent of calories and the remainder as carbohydrates."),
      tr("این اعداد آغاز راه هستند. وزنت را هفته‌ای یکی دو بار در شرایط مشابه ثبت کن. اگر بعد از چند هفته روند مطابق انتظار نبود، کالری را حدود 100 تا 150 کیلوکالری تغییر بده.", "These numbers are a starting point. Log your weight once or twice a week under similar conditions. If after a few weeks the trend is not what you expected, change the calories by about 100 to 150 kcal."),
    ],
  },
  {
    title: tr("محدودیت‌ها", "Limitations"),
    bullets: [
      { body: tr("ترکیب بدن (درصد چربی و عضله) در فرمول نیست؛ ورزشکاران عضلانی ممکن است نیاز بیشتری داشته باشند.", "Body composition (fat and muscle percentage) is not in the formula; muscular athletes may need more.") },
      { body: tr("ابزار بیماری‌ها، دارو، بارداری و شیردهی را در نظر نمی‌گیرد.", "The tool does not account for illness, medication, pregnancy or breastfeeding.") },
      { body: tr("برای زیر 18 سال مناسب نیست.", "It is not suitable for people under 18.") },
      { body: tr("نتیجه توصیه‌ی پزشکی یا رژیم درمانی نیست.", "The result is not medical advice or a therapeutic diet.") },
    ],
  },
  {
    title: tr("بعد از دانستن کالری چه کنیم؟", "What to do after knowing your calories"),
    paragraphs: [
      tr("عدد کالری فقط وقتی فایده دارد که غذای واقعی روزانه‌ات را با آن مقایسه کنی. برای شروع، چند روز هرچه می‌خوری را ثبت کن و ببین به عدد هدف چقدر نزدیکی. کالری‌شمار آریون برای همین ساخته شده است.", "A calorie number is only useful when you compare it with your real daily food. To start, log everything you eat for a few days and see how close you are to the target. Arion's calorie counter was built for exactly this."),
    ],
  },
];

const breadcrumb = () => [
  { name: brandName(), path: "/" },
  { name: tr("ابزارهای رایگان", "Free tools"), path: "/tools" },
  { name: tr("محاسبه کالری روزانه", "Daily calorie calculator"), path: PATH },
];

export default function CalorieCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(breadcrumb()),
            faqJsonLd(faqs()),
            webApplicationJsonLd({
              name: tr("محاسبه کالری روزانه", "Daily calorie calculator"),
              description: tr("ماشین‌حساب BMR، TDEE و کالری هدف روزانه", "BMR, TDEE and daily target calorie calculator"),
              path: PATH,
              category: "HealthApplication",
            }),
          ]),
        }}
      />
      <ToolPageShell
        breadcrumb={breadcrumb()}
        h1={tr("محاسبه کالری روزانه (BMR و TDEE)", "Daily calorie calculator (BMR and TDEE)")}
        lead={tr("جنسیت، سن، قد، وزن و سطح فعالیتت را وارد کن تا BMR، TDEE و کالری هدف روزانه برای کاهش، حفظ یا افزایش وزن را ببینی. محاسبه با فرمول میفلین سنت جئور و کاملا در مرورگر خودت انجام می‌شود.", "Enter your gender, age, height, weight and activity level to see your BMR, TDEE and daily target calories for losing, maintaining or gaining weight. The calculation uses the Mifflin-St Jeor formula and runs entirely in your browser.")}
        sections={sections()}
        faqs={faqs()}
        related={[
          { href: "/blog/how-to-count-daily-calories", label: tr("کالری روزانه را چطور بشماریم؟", "How do we count daily calories?"), note: tr("راهنمای قدم به قدم شمارش کالری.", "A step-by-step guide to counting calories.") },
          { href: "/blog/how-much-protein-per-day", label: tr("روزانه چقدر پروتئین لازم است؟", "How much protein do I need per day?"), note: tr("نیاز پروتئین بر اساس وزن و هدف.", "Protein needs based on weight and goal.") },
          { href: "/blog/category/nutrition", label: tr("مقاله‌های تغذیه", "Nutrition articles"), note: tr("فهرست مقاله‌های دسته‌ی تغذیه.", "A list of articles in the nutrition category.") },
          { href: "/calorie-counter", label: tr("کالری‌شمار آریون", "Arion calorie counter"), note: tr("ثبت غذا و پیگیری کالری روزانه.", "Log food and track your daily calories.") },
          { href: "/bodybuilding-program", label: tr("برنامه‌ی بدنسازی آریون", "Arion workout plan"), note: tr("برنامه‌ی تمرینی متناسب با هدفت.", "A training plan that fits your goal.") },
          { href: "/tools/bmi-calculator", label: tr("محاسبه BMI", "BMI calculator"), note: tr("شاخص توده بدنی و بازه‌ی وزن طبیعی.", "Body mass index and the normal weight range.") },
        ]}
        cta={{
          title: tr("کالری روزانه‌ات را در آریون ثبت کن", "Track your daily calories in Arion"),
          body: tr("کالری‌شمار و بدنسازی آریون عدد هدفت را به برنامه‌ی روزانه تبدیل می‌کنند. هر حساب تازه 3 روز دوره‌ی آزمایشی این بخش‌ها را دارد.", "Arion's calorie counter and workouts turn your target number into a daily plan. Every new account gets a 3-day trial of these sections."),
          label: tr("ساخت حساب در آریون", "Create an Arion account"),
        }}
      >
        <ToolCalorieCalculator />
      </ToolPageShell>
    </>
  );
}
