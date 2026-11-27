import type { Metadata } from "next";
import { SeoToolPage, type ToolSection } from "@/components/SeoToolPage";
import { ToolSleepCalc } from "@/components/ToolSleepCalc";
import type { SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { toolJsonLd } from "@/lib/toolSeo";

const PATH = "/sleep-calculator";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `محاسبه زمان خواب و بیداری (چرخه خواب) رایگان | ${BRAND_FA}`,
      `Free sleep calculator (sleep cycles) | ${brand}`,
    ),
    description: tr(
      "ماشین حساب رایگان خواب: بر اساس چرخه‌های 90 دقیقه‌ای ببین برای بیدارشدن در ساعت دلخواه چه ساعتی بخوابی، یا اگر الان یا ساعت مشخصی بخوابی کی بیدار شوی.",
      "Free sleep calculator: using 90-minute cycles, see when to go to bed to wake at a chosen time, or when to wake if you sleep now or at a set time.",
    ),
    path: PATH,
    ownOgImage: true,
    ogTitle: tr("محاسبه زمان خواب و بیداری (چرخه خواب)", "Sleep calculator (sleep cycles)"),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("چرخه خواب چیست و چقدر طول می‌کشد؟", "What is a sleep cycle and how long is it?"),
      a: tr(
        "هر شب بدن چند بار مراحل خواب سبک، عمیق و REM را پشت سر هم طی می‌کند. هر دور کامل حدود 90 دقیقه طول می‌کشد (برای هر فرد بین 80 تا 110 دقیقه فرق دارد).",
        "Each night your body cycles several times through light, deep and REM sleep. One full cycle lasts about 90 minutes (between 80 and 110 minutes depending on the person).",
      ),
    },
    {
      q: tr("چرا باید در پایان یک چرخه بیدار شد؟", "Why wake up at the end of a cycle?"),
      a: tr(
        "بیدار شدن وسط خواب عمیق معمولا با گیجی و سنگینی همراه است که به آن اینرسی خواب می‌گویند. بیدار شدن نزدیک پایان چرخه، وقتی خواب سبک است، معمولا سبک‌تر حس می‌شود. البته این یک تخمین است و برای هر نفر کمی فرق دارد.",
        "Waking during deep sleep usually brings grogginess known as sleep inertia. Waking near the end of a cycle, when sleep is light, usually feels easier. This is an estimate and varies a little from person to person.",
      ),
    },
    {
      q: tr("چند ساعت خواب لازم است؟", "How many hours of sleep do I need?"),
      a: tr(
        "بیشتر بزرگسالان به 7 تا 9 ساعت خواب نیاز دارند که تقریبا 5 تا 6 چرخه است. کمتر از 4 چرخه (6 ساعت) در بلندمدت با خستگی، تمرکز پایین و بدهی خواب همراه می‌شود.",
        "Most adults need 7 to 9 hours of sleep, roughly 5 to 6 cycles. Less than 4 cycles (6 hours) is linked in the long run to fatigue, poor focus and sleep debt.",
      ),
    },
    {
      q: tr("زمان به خواب رفتن را چرا باید وارد کنم؟", "Why enter the time it takes to fall asleep?"),
      a: tr(
        "چرخه‌ها از لحظه‌ی خوابیدن شروع می‌شوند، نه لحظه‌ی دراز کشیدن. اگر معمولا 15 دقیقه طول می‌کشد تا خوابت ببرد، این 15 دقیقه باید به ساعت دراز کشیدن اضافه شود. بیشتر آدم‌ها بین 10 تا 20 دقیقه‌اند.",
        "Cycles start when you fall asleep, not when you lie down. If it usually takes 15 minutes to drift off, those 15 minutes must be added to your bedtime. Most people take 10 to 20 minutes.",
      ),
    },
    {
      q: tr("اگر به 90 دقیقه‌ی دقیق پایبند نباشم مشکلی هست؟", "Is it a problem if my cycles are not exactly 90 minutes?"),
      a: tr(
        "نه. ساعت‌های پیشنهادی راهنمای خوبی هستند، نه قانون دقیق. اگر خودت را با یک ساعت پیشنهادی بعد از چند روز خسته‌تر یافتی، چند دقیقه جلو یا عقب ببر و بهترین ساعت خودت را پیدا کن.",
        "No. The suggested times are a good guide, not an exact rule. If you feel more tired after a few days on a suggested time, shift it by a few minutes either way and find your own best time.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("محاسبه زمان خواب", "Sleep calculator"), path: PATH },
  ];
  const sections: ToolSection[] = [
    {
      title: tr("خواب چطور کار می‌کند؟", "How does sleep work?"),
      paragraphs: [
        tr(
          "خواب یک حالت یکنواخت نیست. بدن در طول شب بارها بین خواب سبک، خواب عمیق (ترمیم بدن) و خواب REM (رویاها و تثبیت حافظه) می‌چرخد. هر دور را یک چرخه می‌نامیم و حدود 90 دقیقه طول می‌کشد. در نیمه‌ی اول شب خواب عمیق بیشتر و در نیمه‌ی دوم REM بیشتر است.",
          "Sleep is not uniform. Through the night your body cycles between light sleep, deep sleep (body repair) and REM sleep (dreams and memory consolidation). Each round is a cycle of about 90 minutes. Deep sleep dominates the first half of the night and REM the second.",
        ),
        tr(
          "به همین دلیل 6 ساعت خوابی که وسط یک چرخه تمام می‌شود، گاهی از 5 ساعت و نیم خوابی که درست پایان چرخه بیدار می‌شوی بدتر حس می‌شود.",
          "That is why 6 hours of sleep that ends mid-cycle can feel worse than 5 and a half hours that ends right at the end of a cycle.",
        ),
      ],
    },
    {
      title: tr("فرمول محاسبه ساعت خواب", "The sleep time formula"),
      formula: "wake time = bedtime + time to fall asleep + (cycles x 90 min)\nbedtime = wake time - time to fall asleep - (cycles x 90 min)",
      paragraphs: [
        tr(
          "ماشین حساب برای 3 تا 6 چرخه ساعت‌ها را می‌سازد و ساعتی را که مدت خوابش به 8 ساعت نزدیک‌تر است با برچسب مشخص می‌کند. همان منطق چرخه‌های خواب در بخش خواب آریون استفاده می‌شود.",
          "The calculator builds times for 3 to 6 cycles and flags the one closest to 8 hours of sleep. The same sleep-cycle logic is used in the sleep section of the app.",
        ),
      ],
    },
    {
      title: tr("مثال محاسبه", "Worked example"),
      paragraphs: [
        tr(
          "می‌خواهی ساعت 07:00 بیدار شوی و معمولا 15 دقیقه طول می‌کشد بخوابی. برای 6 چرخه (9 ساعت) باید ساعت 21:45 در تخت باشی، برای 5 چرخه (7.5 ساعت) ساعت 23:15، برای 4 چرخه (6 ساعت) ساعت 00:45 و برای 3 چرخه (4.5 ساعت) ساعت 02:15. پیشنهاد برای بزرگسال، 5 یا 6 چرخه است.",
          "You want to wake at 07:00 and usually take 15 minutes to fall asleep. For 6 cycles (9 hours) be in bed at 21:45, for 5 cycles (7.5 hours) at 23:15, for 4 cycles (6 hours) at 00:45 and for 3 cycles (4.5 hours) at 02:15. For an adult, 5 or 6 cycles is the recommendation.",
        ),
      ],
    },
    {
      title: tr("عادت‌هایی که خواب را بهتر می‌کند", "Habits that improve sleep"),
      bullets: [
        { title: tr("ساعت ثابت", "A fixed schedule"), body: tr("خوابیدن و بیدار شدن در ساعت‌های ثابت، حتی آخر هفته، ساعت درونی بدن را تنظیم می‌کند.", "Going to bed and waking at fixed times, even on weekends, sets your body clock.") },
        { title: tr("نور و صفحه‌ی نمایش", "Light and screens"), body: tr("یک ساعت پیش از خواب نور را کم و صفحه‌ها را کنار بگذار.", "Dim lights and put screens away an hour before bed.") },
        { title: tr("کافئین", "Caffeine"), body: tr("قهوه و چای پررنگ را بعد از عصر محدود کن؛ اثر کافئین تا 6 ساعت می‌ماند.", "Limit coffee and strong tea after the afternoon; caffeine effects can last up to 6 hours.") },
        { title: tr("اتاق خنک و تاریک", "A cool, dark room"), body: tr("دمای حدود 18 تا 20 درجه برای بیشتر آدم‌ها مناسب است.", "A temperature of about 18 to 20 degrees suits most people.") },
      ],
    },
  ];
  return { faqs, breadcrumb, sections, brand };
}

export default function SleepCalculatorPage() {
  const { faqs, breadcrumb, sections, brand } = content();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            toolJsonLd({
              path: PATH,
              name: tr("محاسبه زمان خواب و بیداری (چرخه خواب)", "Sleep calculator (sleep cycles)"),
              description: tr("ماشین حساب رایگان ساعت خواب و بیداری بر اساس چرخه‌های 90 دقیقه‌ای", "Free bedtime and wake-up calculator based on 90-minute sleep cycles"),
              category: "HealthApplication",
              breadcrumb,
              faqs,
            }),
          ),
        }}
      />
      <SeoToolPage
        breadcrumb={breadcrumb}
        h1={tr("محاسبه زمان خواب و بیداری (چرخه خواب)", "Sleep calculator (sleep cycles)")}
        lead={tr(
          "ساعت بیداری یا ساعت خوابت را وارد کن، یا بزن «الان بخوابم»، تا بر اساس چرخه‌های 90 دقیقه‌ای بهترین ساعت‌ها را ببینی. رایگان و بدون ثبت نام.",
          "Enter your wake-up time or bedtime, or tap “Sleep now”, to see the best times based on 90-minute cycles. Free, no sign-up.",
        )}
        toolTitle={tr("ماشین حساب چرخه خواب", "Sleep cycle calculator")}
        tool={<ToolSleepCalc />}
        sections={sections}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره چرخه خواب", "Frequently asked questions about sleep cycles")}
        related={[
          { href: "/blog/sleep-cycles-best-time-to-wake-up", label: tr("چرخه خواب و بهترین زمان بیداری", "Sleep cycles and the best time to wake up"), note: tr("توضیح کامل‌تر مراحل خواب و اینرسی خواب.", "A fuller look at sleep stages and sleep inertia.") },
          { href: "/blog/how-many-hours-of-sleep", label: tr("چند ساعت خواب لازم است؟", "How many hours of sleep do you need?"), note: tr("نیاز خواب در سن‌های مختلف.", "Sleep needs at different ages.") },
          { href: "/routine", label: tr("روتین روزانه", "Daily routine"), note: tr("ساعت خواب و بیداری ثابت را در روتین روزانه‌ات بساز.", "Build a fixed sleep and wake time into your daily routine.") },
        ]}
        ctaText={tr(
          `در ${brand} خوابت را هر شب ثبت کن و روند بدهی خواب و چرخه‌هایت را ببین.`,
          `Log your sleep every night in ${brand} and see your sleep-debt and cycle trends.`,
        )}
      />
    </>
  );
}
