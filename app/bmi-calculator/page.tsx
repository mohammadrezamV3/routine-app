import type { Metadata } from "next";
import { SeoToolPage, type ToolSection } from "@/components/SeoToolPage";
import { ToolBmiCalc } from "@/components/ToolBmiCalc";
import type { SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { toolJsonLd } from "@/lib/toolSeo";

const PATH = "/bmi-calculator";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `محاسبه BMI (شاخص توده بدنی) رایگان | ${BRAND_FA}`,
      `Free BMI calculator (body mass index) | ${brand}`,
    ),
    description: tr(
      "ماشین حساب رایگان BMI: با قد و وزن، شاخص توده بدنی، دسته‌بندی سازمان جهانی بهداشت و محدوده‌ی وزن سالم برای قدت را ببین. بدون ثبت نام.",
      "Free BMI calculator: enter height and weight to see your body mass index, the WHO category and the healthy weight range for your height. No sign-up.",
    ),
    path: PATH,
    keywords: tr(
      "محاسبه BMI|ماشین حساب BMI|شاخص توده بدنی|محاسبه شاخص توده بدنی|BMI چیست|BMI نرمال چقدر است|وزن ایده آل|محاسبه وزن ایده آل|جدول BMI|BMI برای زنان|قد و وزن مناسب|محاسبه چاقی|اضافه وزن|محاسبه وزن مناسب با قد|فرمول BMI|محاسبه بی ام آی|بی ام آی چیست|bmi calculator",
      "BMI calculator|body mass index calculator|BMI chart|normal BMI|ideal weight calculator|healthy weight for height|BMI formula|free BMI calculator",
    ).split("|"),
    ownOgImage: true,
    ogTitle: tr("محاسبه BMI (شاخص توده بدنی)", "BMI calculator (body mass index)"),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("BMI نرمال چقدر است؟", "What is a normal BMI?"),
      a: tr(
        "طبق سازمان جهانی بهداشت، BMI بین 18.5 و 24.9 برای بزرگسالان طبیعی است. کمتر از 18.5 کمبود وزن، از 25 تا 29.9 اضافه وزن و از 30 به بالا چاقی حساب می‌شود.",
        "According to the World Health Organization, a BMI between 18.5 and 24.9 is normal for adults. Below 18.5 is underweight, 25 to 29.9 is overweight and 30 or above is obesity.",
      ),
    },
    {
      q: tr("BMI چطور محاسبه می‌شود؟", "How is BMI calculated?"),
      a: tr(
        "وزن به کیلوگرم را بر مجذور قد به متر تقسیم می‌کنیم. مثلا برای 70 کیلوگرم و 175 سانتی‌متر: 70 تقسیم بر 1.75 به توان 2 می‌شود حدود 22.9.",
        "Divide your weight in kilograms by the square of your height in metres. For example, for 70 kg and 175 cm: 70 divided by 1.75 squared is about 22.9.",
      ),
    },
    {
      q: tr("آیا BMI برای ورزشکاران درست است؟", "Is BMI accurate for athletes?"),
      a: tr(
        "نه همیشه. BMI فقط وزن کل را می‌سنجد و عضله را از چربی جدا نمی‌کند، پس یک بدنساز عضلانی ممکن است در محدوده‌ی اضافه وزن قرار بگیرد در حالی که درصد چربی پایینی دارد. در این حالت دور کمر و درصد چربی بدن معیار بهتری هستند.",
        "Not always. BMI only measures total weight and does not separate muscle from fat, so a muscular lifter can land in the overweight range with low body fat. In that case waist circumference and body-fat percentage are better measures.",
      ),
    },
    {
      q: tr("آیا BMI برای کودکان و نوجوانان هم کاربرد دارد؟", "Does BMI apply to children and teens?"),
      a: tr(
        "این ماشین حساب برای بزرگسالان بالای 18 سال است. برای کودکان و نوجوانان باید BMI را با نمودارهای صدکی سن و جنسیت مقایسه کرد و تفسیر آن بر عهده‌ی پزشک است.",
        "This calculator is for adults over 18. For children and teens BMI must be compared with age- and sex-specific percentile charts, and a doctor should interpret it.",
      ),
    },
    {
      q: tr("برای رسیدن به وزن سالم چه کنم؟", "What should I do to reach a healthy weight?"),
      a: tr(
        "هدف را کوچک و واقع‌بینانه بگذار؛ کاهش یا افزایش نیم تا یک کیلوگرم در هفته پایدارتر است. اول کالری روزانه‌ات را با ماشین حساب کالری حساب کن، بعد تغذیه و تمرین را مرحله‌ای تنظیم کن. برای بیماری‌ها یا تغییرات شدید حتما با پزشک مشورت کن.",
        "Set a small, realistic goal; losing or gaining half to one kilogram a week is more sustainable. First work out your daily calories with the calorie calculator, then adjust nutrition and training step by step. See a doctor for medical conditions or large changes.",
      ),
    },
    {
      q: tr("وزن ایده آل با قد 170 چقدر است؟", "What is the ideal weight for a height of 170 cm?"),
      a: tr(
        "برای قد 170 سانتی‌متر، محدوده‌ی BMI سالم (18.5 تا 24.9) تقریبا معادل 53.5 تا 72 کیلوگرم است. این فقط یک محدوده‌ی عمومی است و ترکیب بدن، سن و سلامتی را در نظر نمی‌گیرد؛ ماشین حساب همین صفحه محدوده‌ی دقیق قد تو را نشان می‌دهد.",
        "For a height of 170 cm, the healthy BMI range (18.5 to 24.9) is roughly 53.5 to 72 kg. This is only a general range and ignores body composition, age and health; the calculator on this page shows the exact range for your height.",
      ),
    },
    {
      q: tr("BMI برای زنان با مردان فرق دارد؟", "Is BMI different for women and men?"),
      a: tr(
        "فرمول و دسته‌بندی‌های سازمان جهانی بهداشت برای بزرگسالان زن و مرد یکسان است، ولی درصد چربی بدن در زنان معمولا بیشتر است، پس همان BMI ممکن است ترکیب بدنی متفاوتی را نشان دهد. BMI یک شاخص غربالگری است نه تشخیص پزشکی.",
        "The formula and WHO categories are the same for adult women and men, but body fat percentage is usually higher in women, so the same BMI may reflect a different body composition. BMI is a screening measure, not a medical diagnosis.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("محاسبه BMI", "BMI calculator"), path: PATH },
  ];
  const sections: ToolSection[] = [
    {
      title: tr("BMI یا شاخص توده بدنی چیست؟", "What is BMI, the body mass index?"),
      paragraphs: [
        tr(
          "شاخص توده بدنی یا BMI عددی است که رابطه‌ی وزن و قد را در یک نگاه نشان می‌دهد. پزشکان و سازمان‌های بهداشتی آن را به‌عنوان یک غربالگری ساده برای تشخیص کمبود وزن، اضافه وزن و چاقی به کار می‌برند، چون نیاز به هیچ دستگاهی ندارد.",
          "The body mass index, or BMI, is a number that shows the relationship between weight and height at a glance. Doctors and health organisations use it as a simple screening for underweight, overweight and obesity because it needs no equipment.",
        ),
        tr(
          "نکته‌ی مهم این است که BMI تشخیص نیست، فقط یک نشانه است. دو نفر با BMI یکسان ممکن است ترکیب بدنی کاملا متفاوتی داشته باشند.",
          "The key point is that BMI is not a diagnosis, only an indicator. Two people with the same BMI can have very different body compositions.",
        ),
      ],
    },
    {
      title: tr("فرمول BMI", "The BMI formula"),
      paragraphs: [
        tr(
          "فرمول ساده است: وزن (کیلوگرم) تقسیم بر مجذور قد (متر). برای محدوده‌ی وزن سالم، همین فرمول را برعکس می‌کنیم: وزن سالم = BMI x مجذور قد، که یک بار با 18.5 و یک بار با 24.9 حساب می‌شود.",
          "The formula is simple: weight (kg) divided by height (m) squared. For the healthy range we reverse it: healthy weight = BMI x height squared, calculated once with 18.5 and once with 24.9.",
        ),
      ],
      formula: "BMI = weight (kg) / height (m)^2\nhealthy weight = (18.5 to 24.9) x height (m)^2",
    },
    {
      title: tr("جدول دسته‌بندی WHO", "WHO category table"),
      bullets: [
        { title: tr("کمتر از 18.5", "Below 18.5"), body: tr("کمبود وزن؛ اگر همراه خستگی، ریزش مو یا بی‌نظمی قاعدگی است با پزشک مشورت کن.", "Underweight; see a doctor if it comes with fatigue, hair loss or irregular periods.") },
        { title: tr("18.5 تا 24.9", "18.5 to 24.9"), body: tr("وزن طبیعی؛ کمترین خطر مرتبط با وزن.", "Normal weight; the lowest weight-related risk.") },
        { title: tr("25 تا 29.9", "25 to 29.9"), body: tr("اضافه وزن؛ کمی تغییر در تغذیه و تحرک معمولا کافی است.", "Overweight; small changes in diet and activity are usually enough.") },
        { title: tr("30 و بالاتر", "30 and above"), body: tr("چاقی در سه درجه (30 تا 34.9، 35 تا 39.9 و 40 به بالا)؛ پیگیری پزشکی توصیه می‌شود.", "Obesity in three classes (30 to 34.9, 35 to 39.9 and 40 or more); medical follow-up is recommended.") },
      ],
    },
    {
      title: tr("مثال محاسبه", "Worked example"),
      paragraphs: [
        tr(
          "فردی با قد 175 سانتی‌متر و وزن 70 کیلوگرم: 70 / (1.75 x 1.75) = 70 / 3.0625 = 22.9 که در محدوده‌ی طبیعی است. محدوده‌ی وزن سالم برای قد 175 سانتی‌متر از 56.7 تا 76.3 کیلوگرم است. اگر وزنش 90 کیلوگرم بود، BMI او حدود 29.4 و حدود 13.7 کیلوگرم بالاتر از انتهای محدوده‌ی سالم می‌شد.",
          "A person 175 cm tall and 70 kg: 70 / (1.75 x 1.75) = 70 / 3.0625 = 22.9, which is in the normal range. The healthy weight range for 175 cm is 56.7 to 76.3 kg. At 90 kg the BMI would be about 29.4, roughly 13.7 kg above the end of the healthy range.",
        ),
      ],
    },
    {
      title: tr("محدودیت‌های BMI", "Limits of BMI"),
      bullets: [
        { title: tr("عضله و چربی را جدا نمی‌کند", "It does not separate muscle from fat"), body: tr("ورزشکاران قدرتی ممکن است BMI بالا و چربی کم داشته باشند.", "Strength athletes may have a high BMI with low body fat.") },
        { title: tr("محل چربی را نشان نمی‌دهد", "It ignores where fat sits"), body: tr("چربی دور شکم خطرناک‌تر از چربی ران و باسن است؛ دور کمر را هم اندازه بگیر.", "Belly fat is riskier than hip and thigh fat; measure your waist as well.") },
        { title: tr("سن و جنسیت را در نظر نمی‌گیرد", "It ignores age and sex"), body: tr("در سالمندان کمی BMI بالاتر ممکن است حتی محافظ باشد.", "In older adults a slightly higher BMI can even be protective.") },
      ],
    },
  ];
  return { faqs, breadcrumb, sections, brand };
}

export default function BmiCalculatorPage() {
  const { faqs, breadcrumb, sections, brand } = content();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            toolJsonLd({
              path: PATH,
              name: tr("محاسبه BMI (شاخص توده بدنی)", "BMI calculator (body mass index)"),
              description: tr("ماشین حساب رایگان BMI با دسته‌بندی WHO و محدوده‌ی وزن سالم", "Free BMI calculator with WHO category and healthy weight range"),
              category: "HealthApplication",
              breadcrumb,
              faqs,
            }),
          ),
        }}
      />
      <SeoToolPage
        breadcrumb={breadcrumb}
        h1={tr("محاسبه BMI (شاخص توده بدنی)", "BMI calculator (body mass index)")}
        lead={tr(
          "قد و وزنت را وارد کن تا شاخص توده بدنی، دسته‌بندی سازمان جهانی بهداشت و محدوده‌ی وزن سالم برای قدت را ببینی. رایگان و بدون ثبت نام.",
          "Enter your height and weight to see your body mass index, the World Health Organization category and the healthy weight range for your height. Free, no sign-up.",
        )}
        toolTitle={tr("ماشین حساب BMI", "BMI calculator")}
        tool={<ToolBmiCalc />}
        sections={sections}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره BMI", "Frequently asked questions about BMI")}
        related={[
          { href: "/blog/what-is-bmi", label: tr("BMI چیست و چگونه تفسیر می‌شود", "What is BMI and how to read it"), note: tr("توضیح کامل‌تر درباره‌ی معنی عدد و محدودیت‌هایش.", "A fuller explanation of what the number means and its limits.") },
          { href: "/calorie-calculator", label: tr("محاسبه کالری روزانه", "Daily calorie calculator"), note: tr("بعد از دانستن BMI، کالری مناسب هدفت را حساب کن.", "After knowing your BMI, work out the right calories for your goal.") },
          { href: "/calorie-counter", label: tr("کالری‌شمار فارسی", "Calorie counter"), note: tr("ثبت روزانه‌ی غذا برای رسیدن به وزن هدف.", "Log food daily to reach your target weight.") },
        ]}
        ctaText={tr(
          `با ${brand} وزن، تغذیه و تمرینت را یک‌جا دنبال کن.`,
          `Track your weight, nutrition and training in one place with ${brand}.`,
        )}
      />
    </>
  );
}
