import type { Metadata } from "next";
import { ToolPageShell } from "@/components/ToolPageShell";
import { ToolBmiCalculator } from "@/components/ToolBmiCalculator";
import type { SeoFaq, SeoSection } from "@/components/SeoLanding";
import { brandName } from "@/lib/brand";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";
import { webApplicationJsonLd } from "@/lib/toolsSeo";
import { tr } from "@/lib/i18n";

const PATH = "/tools/bmi-calculator";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: tr(`محاسبه BMI و شاخص توده بدنی آنلاین | ${brandName()}`, `BMI and body mass index calculator online | ${brandName()}`),
    description:
      tr("ماشین‌حساب رایگان BMI: قد و وزنت را وارد کن و شاخص توده بدنی، وضعیت بر اساس جدول سازمان جهانی بهداشت و بازه‌ی وزن طبیعی قدت را ببین.", "Free BMI calculator: enter your height and weight to see your body mass index, your status according to the World Health Organization table, and the normal weight range for your height."),
    path: PATH,
  });
}

const faqs = (): SeoFaq[] => [
  {
    q: tr("BMI چیست؟", "What is BMI?"),
    a: tr("BMI یا شاخص توده بدنی عددی است که از تقسیم وزن (کیلوگرم) بر مجذور قد (متر) به دست می‌آید. این عدد نشان می‌دهد وزن نسبت به قد در چه محدوده‌ای است.", "BMI, or body mass index, is a number calculated by dividing weight (kg) by the square of height (m). It shows where your weight falls relative to your height."),
  },
  {
    q: tr("BMI طبیعی چه عددی است؟", "What is a normal BMI?"),
    a: tr("طبق جدول سازمان جهانی بهداشت برای بزرگسالان، عدد بین 18.5 تا 24.9 در محدوده‌ی وزن طبیعی قرار می‌گیرد. زیر 18.5 کم‌وزن و از 25 به بالا اضافه‌وزن حساب می‌شود.", "According to the World Health Organization table for adults, a number between 18.5 and 24.9 is in the normal weight range. Below 18.5 is underweight and 25 and above is overweight."),
  },
  {
    q: tr("آیا BMI برای ورزشکاران دقیق است؟", "Is BMI accurate for athletes?"),
    a: tr("نه همیشه. BMI فقط وزن کل را می‌بیند و بین عضله و چربی فرق نمی‌گذارد. فردی با عضله‌ی زیاد ممکن است BMI بالایی داشته باشد بدون اینکه چربی زیادی داشته باشد.", "Not always. BMI only sees total weight and does not distinguish between muscle and fat. A very muscular person may have a high BMI without having much fat."),
  },
  {
    q: tr("این ابزار برای کودکان هم کاربرد دارد؟", "Does this tool work for children?"),
    a: tr("نه. جدول این صفحه برای بزرگسالان است. برای کودکان و نوجوانان BMI با نمودارهای سن و جنس تفسیر می‌شود و بهتر است پزشک بررسی کند.", "No. The table on this page is for adults. For children and teenagers, BMI is interpreted with age and gender charts and should be reviewed by a doctor."),
  },
  {
    q: tr("برای رسیدن به وزن سالم چه کار کنم؟", "What should I do to reach a healthy weight?"),
    a: tr("عدد BMI فقط نقطه‌ی شروع است. برای برنامه‌ی تغذیه و تمرین، کالری روزانه‌ات را حساب کن و در صورت نیاز با پزشک یا متخصص تغذیه مشورت کن.", "Your BMI is only a starting point. For a nutrition and training plan, work out your daily calories and, if needed, consult a doctor or nutritionist."),
  },
];

const sections = (): SeoSection[] => [
  {
    title: tr("BMI چطور محاسبه می‌شود؟", "How is BMI calculated?"),
    paragraphs: [
      tr("فرمول BMI ساده است: وزن به کیلوگرم تقسیم بر مجذور قد به متر. برای نمونه فردی با وزن 70 کیلوگرم و قد 175 سانتی‌متر، قدش 1.75 متر است؛ مجذور آن 3.0625 می‌شود و BMI برابر 22.9 خواهد بود.", "The BMI formula is simple: weight in kilograms divided by the square of height in meters. For example, a person who weighs 70 kg and is 175 cm tall has a height of 1.75 m; its square is 3.0625 and the BMI is 22.9."),
      tr("این ماشین‌حساب همین فرمول را اجرا می‌کند و علاوه بر عدد نهایی، بازه‌ی وزن طبیعی مناسب قد تو را هم نشان می‌دهد. برای این کار BMI های 18.5 و 24.9 را در مجذور قدت ضرب می‌کند تا حداقل و حداکثر وزن در محدوده‌ی طبیعی به دست بیاید.", "This calculator runs the same formula and, besides the final number, shows the normal weight range for your height. To do that it multiplies the BMI values 18.5 and 24.9 by the square of your height to get the minimum and maximum weight in the normal range."),
    ],
  },
  {
    title: tr("جدول دسته‌بندی WHO", "WHO classification table"),
    bullets: [
      { title: tr("کمتر از 18.5", "Below 18.5"), body: tr("کم‌وزن", "Underweight") },
      { title: tr("18.5 تا 24.9", "18.5 to 24.9"), body: tr("وزن طبیعی", "Normal weight") },
      { title: tr("25 تا 29.9", "25 to 29.9"), body: tr("اضافه‌وزن", "Overweight") },
      { title: tr("30 تا 34.9", "30 to 34.9"), body: tr("چاقی درجه 1", "Obesity class 1") },
      { title: tr("35 تا 39.9", "35 to 39.9"), body: tr("چاقی درجه 2", "Obesity class 2") },
      { title: tr("40 و بالاتر", "40 and above"), body: tr("چاقی درجه 3", "Obesity class 3") },
    ],
  },
  {
    title: tr("نتیجه را چطور بخوانیم؟", "How to read the result"),
    paragraphs: [
      tr("نشانگر روی مقیاس افقی، جایگاه BMI تو را بین 15 تا 40 نشان می‌دهد. اگر داخل محدوده‌ی وزن طبیعی باشی، ابزار فقط همین را اعلام می‌کند. اگر بیرون آن باشی، فاصله‌ات تا نزدیک‌ترین مرز بازه‌ی طبیعی را به کیلوگرم می‌نویسد تا یک هدف تقریبی داشته باشی.", "The marker on the horizontal scale shows where your BMI falls between 15 and 40. If you are inside the normal weight range, the tool simply says so. If you are outside it, it writes your distance to the nearest edge of the normal range in kilograms so you have an approximate target."),
      tr("عدد BMI یک تصویر کلی است. توزیع چربی، دور کمر، سن، جنسیت و سلامت عمومی در تفسیر واقعی نقش دارند و هیچ‌کدام در این فرمول نیستند.", "BMI is a general picture. Fat distribution, waist circumference, age, gender and overall health all play a role in a real interpretation, and none of them are in this formula."),
    ],
  },
  {
    title: tr("محدودیت‌های BMI", "Limitations of BMI"),
    bullets: [
      { body: tr("بین وزن عضله و چربی تفاوت نمی‌گذارد؛ ورزشکاران عضلانی ممکن است در محدوده‌ی اضافه‌وزن بیفتند.", "It does not distinguish between muscle weight and fat; muscular athletes may land in the overweight range.") },
      { body: tr("برای کودکان، نوجوانان، زنان باردار و سالمندان معیار مناسبی نیست.", "It is not a suitable measure for children, teenagers, pregnant women and older adults.") },
      { body: tr("محل تجمع چربی (مثلا دور شکم) را نشان نمی‌دهد.", "It does not show where fat is stored (for example around the belly).") },
      { body: tr("نتیجه نباید جای معاینه و تشخیص پزشک را بگیرد.", "The result should not replace a doctor's examination and diagnosis.") },
    ],
  },
  {
    title: tr("قدم بعدی بعد از دانستن BMI", "The next step after knowing your BMI"),
    paragraphs: [
      tr("اگر می‌خواهی وزنت را تغییر بدهی، قدم عملی بعدی دانستن کالری روزانه‌ات است. ماشین‌حساب کالری آریون BMR و کالری هدف را بر اساس سن، قد، وزن و میزان فعالیت می‌دهد.", "If you want to change your weight, the next practical step is knowing your daily calories. Arion's calorie calculator gives you BMR and target calories based on age, height, weight and activity level."),
    ],
  },
];

const breadcrumb = () => [
  { name: brandName(), path: "/" },
  { name: tr("ابزارهای رایگان", "Free tools"), path: "/tools" },
  { name: tr("محاسبه BMI", "BMI calculator"), path: PATH },
];

export default function BmiCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(breadcrumb()),
            faqJsonLd(faqs()),
            webApplicationJsonLd({
              name: tr("محاسبه BMI", "BMI calculator"),
              description: tr("ماشین‌حساب شاخص توده بدنی با بازه‌ی وزن طبیعی", "Body mass index calculator with the normal weight range"),
              path: PATH,
              category: "HealthApplication",
            }),
          ]),
        }}
      />
      <ToolPageShell
        breadcrumb={breadcrumb()}
        h1={tr("محاسبه BMI (شاخص توده بدنی)", "BMI calculator (body mass index)")}
        lead={tr("قد و وزنت را وارد کن تا BMI، وضعیتت بر اساس جدول سازمان جهانی بهداشت و بازه‌ی وزن طبیعی مناسب قدت را ببینی. محاسبه کاملا در مرورگر انجام می‌شود و چیزی ذخیره نمی‌شود.", "Enter your height and weight to see your BMI, your status according to the World Health Organization table, and the normal weight range for your height. The calculation runs entirely in your browser and nothing is stored.")}
        sections={sections()}
        faqs={faqs()}
        related={[
          { href: "/blog/what-is-bmi", label: tr("BMI چیست و چقدر قابل اتکاست؟", "What is BMI and how reliable is it?"), note: tr("مقاله‌ی کامل درباره‌ی معنی و محدودیت‌های شاخص توده بدنی.", "A full article on the meaning and limits of body mass index.") },
          { href: "/tools/calorie-calculator", label: tr("محاسبه کالری روزانه", "Daily calorie calculator"), note: tr("BMR، TDEE و کالری هدف را حساب کن.", "Work out BMR, TDEE and target calories.") },
          { href: "/blog/how-to-count-daily-calories", label: tr("کالری روزانه را چطور بشماریم؟", "How do we count daily calories?"), note: tr("راهنمای شروع کالری‌شماری.", "A guide to getting started with calorie counting.") },
          { href: "/blog/category/fitness", label: tr("مقاله‌های تناسب اندام", "Fitness articles"), note: tr("فهرست مقاله‌های بدنسازی و تمرین.", "A list of workout and training articles.") },
          { href: "/calorie-counter", label: tr("کالری‌شمار آریون", "Arion calorie counter"), note: tr("ثبت غذای روزانه و پیگیری کالری.", "Log daily food and track calories.") },
          { href: "/tools", label: tr("همه‌ی ابزارهای رایگان", "All free tools"), note: tr("فهرست ماشین‌حساب‌های آریون.", "A list of Arion's calculators.") },
        ]}
        cta={{
          title: tr("کالری و تمرینت را در آریون پیگیری کن", "Track your calories and training in Arion"),
          body: tr("بخش‌های کالری‌شمار و بدنسازی آریون به تو کمک می‌کنند غذا و تمرین روزانه را ثبت کنی. هر حساب تازه 3 روز دوره‌ی آزمایشی این بخش‌ها را دارد.", "Arion's calorie counter and workout sections help you log daily food and training. Every new account gets a 3-day trial of these sections."),
          label: tr("ساخت حساب در آریون", "Create an Arion account"),
        }}
      >
        <ToolBmiCalculator />
      </ToolPageShell>
    </>
  );
}
