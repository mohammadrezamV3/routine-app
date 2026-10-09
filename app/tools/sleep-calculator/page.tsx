import type { Metadata } from "next";
import { ToolPageShell } from "@/components/ToolPageShell";
import { ToolSleepCalculator } from "@/components/ToolSleepCalculator";
import type { SeoFaq, SeoSection } from "@/components/SeoLanding";
import { brandName } from "@/lib/brand";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";
import { webApplicationJsonLd } from "@/lib/toolsSeo";
import { tr } from "@/lib/i18n";

const PATH = "/tools/sleep-calculator";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: tr(`محاسبه ساعت خواب و بیداری با چرخه‌های خواب | ${brandName()}`, `Sleep and wake-up time calculator using sleep cycles | ${brandName()}`),
    description:
      tr("ماشین‌حساب رایگان ساعت خواب: ساعت بیدار شدن یا خوابیدن را بزن و بهترین زمان خواب و بیداری را بر اساس چرخه‌های 90 دقیقه‌ای ببین.", "Free sleep time calculator: enter your wake-up or bedtime and see the best times to sleep and wake up based on 90-minute cycles."),
    path: PATH,
  });
}

const faqs = (): SeoFaq[] => [
  {
    q: tr("چرا چرخه‌های 90 دقیقه‌ای؟", "Why 90-minute cycles?"),
    a: tr("خواب شبانه از چرخه‌هایی ساخته شده که هرکدام به طور میانگین حدود 90 دقیقه طول می‌کشد و از خواب سبک به عمیق و سپس REM می‌رود. بیدار شدن نزدیک پایان یک چرخه معمولا سبک‌تر از بیدار شدن وسط خواب عمیق است.", "Night sleep is made of cycles that each last about 90 minutes on average, moving from light to deep sleep and then REM. Waking near the end of a cycle is usually easier than waking in the middle of deep sleep."),
  },
  {
    q: tr("چند چرخه خواب برای یک بزرگسال مناسب است؟", "How many sleep cycles are right for an adult?"),
    a: tr("برای بیشتر بزرگسالان 5 تا 6 چرخه، یعنی 7.5 تا 9 ساعت، گزینه‌ی رایج است. نیاز واقعی هر نفر کمی فرق می‌کند؛ اگر با 5 چرخه سرحال هستی، لازم نیست به زور آن را بیشتر کنی.", "For most adults, 5 to 6 cycles, that is 7.5 to 9 hours, is the common choice. Each person's real need differs a little; if you feel fresh with 5 cycles, there is no need to force more."),
  },
  {
    q: tr("اگر ساعت دقیق خوابم را نمی‌دانم چه کنم؟", "What if I do not know exactly when I will fall asleep?"),
    a: tr("حالت «الان یا ساعت مشخص می‌خوابم» را انتخاب کن و فیلد را خالی بگذار؛ ماشین‌حساب ساعت همین لحظه‌ی دستگاهت را می‌گیرد و ساعت‌های بیداری را نشان می‌دهد.", "Choose the I sleep now or at a set time mode and leave the field empty; the calculator takes your device's current time and shows the wake-up times."),
  },
  {
    q: tr("زمان به خواب رفتن را چطور تنظیم کنم؟", "How do I set the time to fall asleep?"),
    a: tr("چند شب ببین از لحظه‌ی دراز کشیدن تا خوابیدن چقدر طول می‌کشد. اگر نمی‌دانی، 15 دقیقه مقدار رایجی است. مقدار درست‌تر، نتیجه‌ی دقیق‌تری می‌دهد.", "Over a few nights, see how long it takes from lying down to falling asleep. If you do not know, 15 minutes is a common value. A more accurate value gives a more accurate result."),
  },
  {
    q: tr("آیا این ابزار جای مشاوره‌ی پزشکی را می‌گیرد؟", "Does this tool replace medical advice?"),
    a: tr("نه. این ماشین‌حساب فقط یک برآورد ساده بر پایه‌ی طول متوسط چرخه‌ها می‌دهد. اگر مشکل مزمن خواب، خروپف شدید یا خواب‌آلودگی روزانه داری، با پزشک مشورت کن.", "No. This calculator only gives a simple estimate based on the average length of cycles. If you have a chronic sleep problem, severe snoring or daytime sleepiness, consult a doctor."),
  },
];

const sections = (): SeoSection[] => [
  {
    title: tr("ماشین‌حساب ساعت خواب چطور کار می‌کند؟", "How does the sleep calculator work?"),
    paragraphs: [
      tr("خواب شبانه یک خط صاف نیست؛ از چرخه‌های پشت سر هم ساخته شده. هر چرخه شامل خواب سبک، خواب عمیق و مرحله‌ی REM است و به طور میانگین حدود 90 دقیقه طول می‌کشد. اگر زنگ ساعتت وسط خواب عمیق بخورد، احتمال گیجی و سنگینی صبح بیشتر است؛ اگر نزدیک پایان یک چرخه باشد، بیدار شدن معمولا راحت‌تر است.", "Night sleep is not a straight line; it is made of cycles one after another. Each cycle includes light sleep, deep sleep and a REM stage and lasts about 90 minutes on average. If your alarm goes off in the middle of deep sleep, morning grogginess and heaviness are more likely; if it is near the end of a cycle, waking is usually easier."),
      tr("این ابزار همین منطق را به حساب ساده تبدیل می‌کند. وقتی ساعت بیدار شدن را می‌دهی، از آن ساعت به عقب می‌شمارد: ساعت بیداری منهای زمان به خواب رفتن منهای مضربی از 90 دقیقه. وقتی ساعت خوابیدن را می‌دهی، زمان به خواب رفتن را به ساعت اضافه می‌کند و بعد مضرب‌های 90 دقیقه را جلو می‌برد.", "This tool turns that logic into simple arithmetic. When you give a wake-up time, it counts backwards from it: wake-up time minus the time to fall asleep minus a multiple of 90 minutes. When you give a bedtime, it adds the time to fall asleep to it and then moves forward by multiples of 90 minutes."),
    ],
  },
  {
    title: tr("فرمول محاسبه", "Calculation formula"),
    bullets: [
      { title: tr("ساعت خوابیدن", "Bedtime"), body: tr("ساعت بیدار شدن منهای (تعداد چرخه ضرب در 90 دقیقه) منهای زمان به خواب رفتن.", "Wake-up time minus (number of cycles times 90 minutes) minus the time to fall asleep.") },
      { title: tr("ساعت بیدار شدن", "Wake-up time"), body: tr("ساعت دراز کشیدن به اضافه‌ی زمان به خواب رفتن به اضافه‌ی (تعداد چرخه ضرب در 90 دقیقه).", "Time you lie down plus the time to fall asleep plus (number of cycles times 90 minutes).") },
      { title: tr("مثال", "Example"), body: tr("اگر ساعت 07:00 بیدار می‌شوی، زمان به خواب رفتنت 15 دقیقه است و 5 چرخه می‌خواهی، باید حدود ساعت 23:15 دراز بکشی؛ چون 5 چرخه برابر 7 ساعت و 30 دقیقه است.", "If you wake up at 07:00, your time to fall asleep is 15 minutes and you want 5 cycles, you should lie down around 23:15, because 5 cycles equal 7 hours and 30 minutes.") },
    ],
  },
  {
    title: tr("نتیجه را چطور بخوانیم؟", "How to read the result"),
    paragraphs: [
      tr("ابزار برای هر حالت از 3 تا 6 چرخه گزینه می‌دهد. گزینه‌های 5 و 6 چرخه، یعنی 7.5 و 9 ساعت خواب، با برچسب «پیشنهادی» مشخص شده‌اند چون برای بیشتر بزرگسالان در محدوده‌ی خواب کافی هستند. گزینه‌های 3 و 4 چرخه برای شبی است که ناچاری کمتر بخوابی؛ بهتر است عادت همیشگی نباشند.", "For each mode the tool gives options from 3 to 6 cycles. The 5 and 6 cycle options, that is 7.5 and 9 hours of sleep, are marked Recommended because they fall in the adequate-sleep range for most adults. The 3 and 4 cycle options are for a night when you have to sleep less; they are best not made a habit."),
      tr("ساعت‌ها حدودی‌اند. اگر چند دقیقه دیرتر یا زودتر بخوابی، دنیا تمام نمی‌شود؛ مهم‌تر از دقت دقیقه‌ای، ثابت بودن ساعت بیدار شدن در طول هفته است.", "The times are approximate. If you fall asleep a few minutes later or earlier, it is not the end of the world; more important than accuracy to the minute is keeping your wake-up time consistent through the week."),
    ],
  },
  {
    title: tr("محدودیت‌ها", "Limitations"),
    bullets: [
      { body: tr("طول چرخه برای هر فرد و هر شب فرق می‌کند و عدد 90 دقیقه فقط میانگین است.", "Cycle length differs for each person and each night, and 90 minutes is only an average.") },
      { body: tr("ابزار کیفیت خواب، مصرف کافئین، نور صفحه‌ی موبایل یا بیماری‌های خواب را در نظر نمی‌گیرد.", "The tool does not consider sleep quality, caffeine intake, phone screen light or sleep disorders.") },
      { body: tr("برای کودکان، نوجوانان و افراد دارای اختلال خواب، نیاز خواب متفاوت است.", "Children, teenagers and people with sleep disorders have different sleep needs.") },
    ],
  },
  {
    title: tr("چند نکته برای خواب بهتر", "A few tips for better sleep"),
    paragraphs: [
      tr("ساعت بیدار شدن را حتی آخر هفته‌ها زیاد جابه‌جا نکن. شب‌ها نور را کم کن و استفاده از موبایل را کنار بگذار. کافئین را در ساعت‌های پایانی روز محدود کن. اگر می‌خواهی خواب شبانه‌ات را ثبت و روند هفتگی‌اش را ببینی، بخش خواب در برنامه‌ی روتین آریون برای همین ساخته شده است.", "Do not shift your wake-up time much, even on weekends. Dim the lights at night and put your phone away. Limit caffeine in the late hours of the day. If you want to log your nightly sleep and see its weekly trend, the sleep section in Arion's My Routine is made for this."),
    ],
  },
];

const breadcrumb = () => [
  { name: brandName(), path: "/" },
  { name: tr("ابزارهای رایگان", "Free tools"), path: "/tools" },
  { name: tr("محاسبه ساعت خواب", "Sleep time calculator"), path: PATH },
];

export default function SleepCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(breadcrumb()),
            faqJsonLd(faqs()),
            webApplicationJsonLd({
              name: tr("محاسبه ساعت خواب", "Sleep time calculator"),
              description: tr("ماشین‌حساب ساعت خواب و بیداری بر اساس چرخه‌های 90 دقیقه‌ای", "Sleep and wake-up time calculator based on 90-minute cycles"),
              path: PATH,
              category: "HealthApplication",
            }),
          ]),
        }}
      />
      <ToolPageShell
        breadcrumb={breadcrumb()}
        h1={tr("محاسبه ساعت خواب و بیداری", "Sleep and wake-up time calculator")}
        lead={tr("ساعت بیدار شدنت را بزن تا بهترین ساعت خوابیدن را ببینی، یا بگو کی می‌خوابی تا ساعت‌های مناسب بیدار شدن را پیدا کنی. محاسبه بر پایه‌ی چرخه‌های 90 دقیقه‌ای خواب است و همه‌چیز در مرورگر خودت انجام می‌شود.", "Enter your wake-up time to see the best bedtime, or say when you go to sleep to find suitable wake-up times. The calculation is based on 90-minute sleep cycles and everything happens in your own browser.")}
        sections={sections()}
        faqs={faqs()}
        related={[
          { href: "/blog/sleep-cycles-best-time-to-wake-up", label: tr("چرخه‌های خواب و بهترین زمان بیدار شدن", "Sleep cycles and the best time to wake up"), note: tr("توضیح کامل مراحل خواب و دلیل 90 دقیقه بودن چرخه‌ها.", "A full explanation of the sleep stages and why cycles are 90 minutes.") },
          { href: "/blog/how-many-hours-of-sleep", label: tr("هر شب چند ساعت خواب لازم است؟", "How many hours of sleep do you need each night?"), note: tr("نیاز خواب در سنین مختلف.", "Sleep needs at different ages.") },
          { href: "/blog/category/sleep", label: tr("همه‌ی مقاله‌های خواب", "All sleep articles"), note: tr("فهرست مقاله‌های دسته‌ی خواب.", "A list of articles in the sleep category.") },
          { href: "/routine", label: tr("روتین روزانه در آریون", "Daily routine in Arion"), note: tr("خواب و برنامه‌ی روزانه‌ات را کنار هم ثبت کن.", "Log your sleep and daily plan side by side.") },
          { href: "/tools/bmi-calculator", label: tr("محاسبه BMI", "BMI calculator"), note: tr("شاخص توده بدنی و بازه‌ی وزن طبیعی.", "Body mass index and the normal weight range.") },
          { href: "/tools", label: tr("همه‌ی ابزارهای رایگان", "All free tools"), note: tr("فهرست ماشین‌حساب‌های آریون.", "A list of Arion's calculators.") },
        ]}
        cta={{
          title: tr("خواب و روتینت را در آریون ثبت کن", "Log your sleep and routine in Arion"),
          body: tr("در بخش «روتین من» آریون می‌توانی ساعت خواب هر شب را ثبت کنی و روند هفتگی‌ات را ببینی. هر حساب تازه 14 روز دوره‌ی آزمایشی دارد.", "In Arion's My Routine section you can log each night's sleep time and see your weekly trend. Every new account gets a 14-day trial."),
          label: tr("ساخت حساب در آریون", "Create an Arion account"),
        }}
      >
        <ToolSleepCalculator />
      </ToolPageShell>
    </>
  );
}
