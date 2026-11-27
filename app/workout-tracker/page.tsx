import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `ثبت تمرین باشگاه و دفترچه تمرین بدنسازی | ${BRAND_FA}`,
      `Gym workout tracker | Log sets and track bodybuilding progress | ${brand}`,
    ),
    description: tr(
      `اپلیکیشن ثبت تمرین در ${BRAND_FA}: ثبت ست به ست وزنه و تکرار، برنامه تمرینی باشگاه با هوش مصنوعی، ` +
        `روزهای استراحت و ردیابی پیشرفت بدنسازی، به‌جای دفترچه‌ی کاغذی.`,
      `A workout logging app in ${brand}: log weight and reps set by set, an AI gym program, rest days and bodybuilding progress tracking, instead of a paper notebook.`,
    ),
    path: "/workout-tracker",
    ownOgImage: true,
    ogTitle: tr(`ثبت تمرین باشگاه ${BRAND_FA}`, `Gym workout tracker in ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("بهترین اپلیکیشن ثبت تمرین باشگاه چه ویژگی‌هایی دارد؟", "What should the best gym workout tracking app have?"),
      a: tr(
        "ثبت سریع ست و تکرار در همان لحظه‌ی تمرین، دیدن برنامه‌ی امروز بدون جست‌وجو، آموزش حرکات و نمایش پیشرفت در طول هفته‌ها. اگر ثبت کردن زمان‌بر باشد، بعد از چند جلسه رها می‌شود.",
        "Quick logging of sets and reps right during the workout, seeing today's plan without searching, exercise tutorials and a view of progress over weeks. If logging takes too long, it's dropped after a few sessions.",
      ),
    },
    {
      q: tr("چطور تمرین باشگاه را ست به ست ثبت کنم؟", "How do I log a gym workout set by set?"),
      a: tr(
        `برنامه‌ی تمرین امروز را باز می‌کنی و برای هر حرکت ست‌ها را ثبت می‌کنی؛ ${BRAND_FA} یک کرنومتر هم برای زمان تمرین و استراحت بین ست‌ها دارد. روز تمرین را هم شروع و تمام می‌کنی.`,
        `You open today's training plan and log the sets for each exercise. ${brand} also has a timer for the workout and for rest between sets. You start and finish the training day too.`,
      ),
    },
    {
      q: tr("دفترچه تمرین بدنسازی کاغذی بهتر است یا اپ؟", "Is a paper bodybuilding notebook or an app better?"),
      a: tr(
        "هر دو کار می‌کنند، به شرطی که ثبت شود. مزیت اپ این است که برنامه‌ی هفته را همراه داری، گم نمی‌شود و حرکات را با آموزش می‌بینی. اگر دفترچه برایت راحت‌تر است، مهم این است که وزنه‌ها را ثبت کنی.",
        "Both work as long as you actually log. The app's advantages are that you carry the week's plan, it doesn't get lost and you see exercises with tutorials. If a notebook is easier for you, the point is not to skip writing down the weights.",
      ),
    },
    {
      q: tr("برنامه تمرینی باشگاه را چطور بسازم؟", "How do I create a gym training program?"),
      a: tr(
        "می‌توانی دستی بسازی یا از هوش مصنوعی بخواهی؛ هدف (قدرت، حجم، کات یا استقامت)، قد و وزن، ماه تمرین، امکانات و روزهای باشگاهت را می‌گیرد و برنامه را همان روزها می‌چیند. قبل از ذخیره می‌توانی ویرایشش کنی.",
        "You can build it manually or ask the AI. It takes your goal (strength, muscle gain, cutting or endurance), height and weight, training month, equipment and gym days, and places the program on those days. You can edit it before saving.",
      ),
    },
    {
      q: tr("ردیابی پیشرفت بدنسازی چطور انجام می‌شود؟", "How is bodybuilding progress tracked?"),
      a: tr(
        "با ثبت مداوم جلسه‌ها، تیک روزهای تمرین، استریک جلسه‌های پشت‌سرهم و دیدن وزنه و تکرار قبلی هر حرکت. تغییر ظاهر بدن کند است، ولی عددهای ثبت‌شده زودتر نشان می‌دهند که روند درست است.",
        "By logging sessions consistently, ticking training days, keeping a streak of sessions and looking back at the earlier weight and reps of each exercise. Visible body change is slow, but logged numbers show sooner that you're on track.",
      ),
    },
    {
      q: tr("روزهای استراحت چه می‌شوند؟", "What happens to rest days?"),
      a: tr(
        "روزی که در برنامه تمرین ندارد خودکار به‌عنوان استراحت تیک می‌خورد. استراحت زنجیره‌ی جلسه‌ها را نمی‌شکند، ولی چیزی هم به آن اضافه نمی‌کند.",
        "A day with no training in the plan is automatically ticked as rest. Rest doesn't break your session streak, but it doesn't add to it either.",
      ),
    },
    {
      q: tr("برنامه‌ی تمرینی را می‌شود تغییر داد یا حذف کرد؟", "Can I change or delete a training plan?"),
      a: tr(
        "بله. حذف برنامه فقط غیرفعالش می‌کند و تاریخچه‌ی تمرین‌هایت می‌ماند، پس با عوض‌کردن برنامه سابقه‌ات از بین نمی‌رود.",
        "Yes. Deleting a plan only deactivates it and your training history stays, so changing plans doesn't erase your record.",
      ),
    },
    {
      q: tr("آیا بخش تمرین رایگان است؟", "Is the workout section free?"),
      a: tr(
        "بخش بدنسازی ماژول اشتراکی است و هر حساب تازه یک دوره‌ی آزمایشی دارد؛ جزئیات و قیمت در صفحه‌ی پلن‌ها آمده است.",
        "The workout section is a subscription module and each new account gets a trial period. Details and prices are on the plans page.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("برنامه بدنسازی", "Workout plan"), path: "/bodybuilding-program" },
    { name: tr("ثبت تمرین", "Workout tracker"), path: "/workout-tracker" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function WorkoutTrackerPage() {
  const { faqs, breadcrumb: BREADCRUMB, brand } = content();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(BREADCRUMB), faqJsonLd(faqs)]) }}
      />
      <SeoLanding
        breadcrumb={BREADCRUMB}
        h1={tr(
          `ثبت تمرین باشگاه و دفترچه تمرین بدنسازی در ${BRAND_FA}`,
          `Gym workout tracker and bodybuilding log in ${brand}`,
        )}
        lead={tr(
          `کسی که تمرینش را ثبت نمی‌کند، معمولا نمی‌داند پیشرفت کرده یا نه. ${BRAND_FA} جای دفترچه‌ی تمرین کاغذی را می‌گیرد: ` +
            `برنامه‌ی تمرینی باشگاه، ثبت ست به ست، کرنومتر، روزهای استراحت و ردیابی پیشرفت بدنسازی در یک اپ فارسی. ` +
            `این صفحه توضیح می‌دهد چرا و چطور تمرین را ثبت کنی.`,
          `Someone who doesn't log their training usually can't tell whether they've progressed. ${brand} replaces the paper training notebook: a gym training program, set-by-set logging, a timer, rest days and bodybuilding progress tracking in one Persian app. This page explains why and how to log your training.`,
        )}
        sections={[
          {
            title: tr("چرا ثبت تمرین مهم است؟", "Why does logging workouts matter?"),
            paragraphs: [
              tr(
                "پیشرفت در بدنسازی یعنی به‌تدریج وزنه یا تکرار بیشتر در همان حرکت. بدون ثبت، حافظه فقط یک حدس مبهم از جلسه‌ی قبل می‌دهد و نمی‌دانی دفعه‌ی پیش چند کیلو و چند تکرار زده‌ای.",
                "Progress in bodybuilding means gradually more weight or reps in the same exercise. Without a log, memory gives only a vague guess about the last session, and you don't know how many kilos and reps you did last time.",
              ),
              tr(
                "ثبت دو فایده‌ی دیگر هم دارد: جلسه‌های جاافتاده را نشان می‌دهد و وقتی چند هفته بدون پیشرفت گذشت، هشدار می‌دهد که برنامه یا خواب و تغذیه‌ات نیاز به بازبینی دارد.",
                "Logging has two more benefits: it shows missed sessions, and when several weeks pass without progress it signals that your program, sleep or nutrition needs a review.",
              ),
            ],
          },
          {
            title: tr(`ثبت تمرین در ${BRAND_FA} چطور کار می‌کند؟`, `How does workout logging work in ${brand}?`),
            bullets: [
              {
                title: tr("ثبت ست به ست", "Set-by-set logging"),
                body: tr("برای هر حرکت ست‌ها را با وزنه و تکرار ثبت می‌کنی و جلسه را شروع و تمام می‌کنی.", "For each exercise you log sets with weight and reps, and you start and finish the session."),
              },
              {
                title: tr("کرنومتر", "Timer"),
                body: tr("برای زمان تمرین و استراحت بین ست‌ها، تا مجبور نباشی از اپ دیگری استفاده کنی.", "For workout time and rest between sets, so you don't need another app."),
              },
              {
                title: tr("کاتالوگ حرکات", "Exercise catalogue"),
                body: tr("برای هر حرکت، گروه عضلانی، مراحل اجرا و فایده‌اش را می‌بینی؛ مفید وقتی اسم حرکتی برنامه را نمی‌شناسی.", "For each move you see the muscle group, steps and benefits, useful when you don't know an exercise in your plan."),
              },
              {
                title: tr("تیک روز تمرین و استریک", "Training day tick and streak"),
                body: tr("هر جلسه‌ی انجام‌شده ثبت می‌شود و جلسه‌های پشت‌سرهم استریک می‌سازند.", "Each completed session is recorded and consecutive sessions build a streak."),
              },
              {
                title: tr("روزهای استراحت خودکار", "Automatic rest days"),
                body: tr("روزی که در برنامه تمرین ندارد خودش تیک می‌خورد و زنجیره را نمی‌شکند.", "A day with no training in your plan is ticked automatically and doesn't break the chain."),
              },
            ],
          },
          {
            title: tr("برنامه تمرینی باشگاه: دستی یا با هوش مصنوعی", "Gym training program: manual or AI"),
            bullets: [
              {
                title: tr("هدف و سطح", "Goal and level"),
                body: tr("قدرت، حجم، کات یا استقامت را انتخاب می‌کنی و ماه تمرینت را می‌دهی تا حجم کار با سابقه‌ات جور باشد.", "You choose strength, muscle gain, cutting or endurance and give your training month so the workload fits your experience."),
              },
              {
                title: tr("روزهای واقعی باشگاه", "Your real gym days"),
                body: tr("برنامه روی روزهایی که واقعا می‌توانی بروی چیده می‌شود، نه یک قالب ثابت.", "The program is laid on the days you can really go, not a fixed template."),
              },
              {
                title: tr("محدودیت جسمی", "Physical limitations"),
                body: tr("اگر محدودیتی داری، حرکات پرفشار با نسخه‌ی ملایم‌تر جایگزین می‌شوند.", "If you have a limitation, high-stress moves are replaced by gentler versions."),
              },
              {
                title: tr("ویرایش قبل از ذخیره", "Edit before saving"),
                body: tr("برنامه را می‌بینی و هر چه خواستی عوض می‌کنی. برنامه‌ی حذف‌شده فقط غیرفعال می‌شود و تاریخچه می‌ماند.", "You see the program and change what you want. A deleted plan is only deactivated and its history stays."),
              },
            ],
          },
          {
            title: tr("ردیابی پیشرفت بدنسازی", "Tracking bodybuilding progress"),
            bullets: [
              {
                title: tr("پیشرفت تدریجی بار", "Progressive overload"),
                body: tr("وقتی وزنه و تکرار هر جلسه ثبت باشد، می‌بینی کی آماده‌ی افزودن بار هستی. وزنه‌ی کم‌کم بیشتر، موتور اصلی رشد است.", "When each session's weight and reps are logged, you see when you're ready to add load. Gradually more weight is the main engine of growth."),
              },
              {
                title: tr("نگاه هفتگی", "A weekly look"),
                body: tr("نگاه به جلسه‌های انجام‌شده‌ی چند هفته نشانت می‌دهد که منظم بوده‌ای یا فقط حس می‌کردی منظمی.", "Looking at several weeks of completed sessions shows whether you were consistent or only felt consistent."),
              },
              {
                title: tr("تغذیه و خواب", "Nutrition and sleep"),
                body: tr("ریکاوری با غذا و خواب تعیین می‌شود؛ کالری‌شمار و ردیاب خواب آریون کنار تمرین هستند.", "Recovery is set by food and sleep. Arion's calorie counter and sleep tracker sit next to your training."),
              },
            ],
          },
          {
            title: tr("نکته‌هایی برای ثبت تمرین ماندگار", "Tips for logging that lasts"),
            bullets: [
              {
                title: tr("1. همان لحظه ثبت کن", "1. Log in the moment"),
                body: tr("بعد از هر ست ده ثانیه کافی است؛ شب‌ها از حافظه نوشتن دقیق نیست.", "Ten seconds after each set is enough. Writing from memory at night isn't accurate."),
              },
              {
                title: tr("2. ساده نگه دار", "2. Keep it simple"),
                body: tr("فقط وزنه و تکرار؛ جزئیات اضافه ثبت را کند می‌کند و رهایش می‌کنی.", "Just weight and reps. Extra detail slows logging down and you quit."),
              },
              {
                title: tr("3. هفته‌ای یک بار مرور کن", "3. Review once a week"),
                body: tr("ببین کدام حرکت‌ها جلو رفته‌اند و کدام‌ها ثابت مانده‌اند.", "See which exercises moved forward and which stayed the same."),
              },
              {
                title: tr("4. روز استراحت را جدی بگیر", "4. Take rest days seriously"),
                body: tr("استراحت بخشی از برنامه است نه شکست آن.", "Rest is part of the plan, not a failure of it."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره ثبت تمرین باشگاه", "Frequently asked questions about workout tracking")}
        related={[
          {
            href: "/bodybuilding-program",
            label: tr("برنامه بدنسازی با هوش مصنوعی", "AI workout plan"),
            note: tr("ساخت برنامه‌ی تمرینی متناسب با هدف و روزهایت.", "Build a program that fits your goal and days."),
          },
          {
            href: "/calorie-counter",
            label: tr("کالری‌شمار آریون", `${brand} calorie counter`),
            note: tr("تغذیه‌ات را با تمرین هماهنگ کن.", "Match your nutrition to your training."),
          },
          {
            href: "/habit-tracker",
            label: tr("پیگیری عادت‌ها", "Habit tracking"),
            note: tr("ورزش را به یک عادت پایدار تبدیل کن.", "Turn exercise into a lasting habit."),
          },
          {
            href: "/blog/gym-program-4-days",
            label: tr("برنامه باشگاه 4 روزه", "4-day gym program"),
            note: tr("نمونه‌ی برنامه‌ی تمرینی چهار روزه در هفته.", "A sample four-day-a-week training program."),
          },
          {
            href: "/blog/beginner-gym-program-3-days",
            label: tr("برنامه باشگاه مبتدی 3 روزه", "Beginner 3-day gym program"),
            note: tr("شروع مناسب برای کسی که تازه به باشگاه آمده.", "A good start for someone new to the gym."),
          },
        ]}
      />
    </>
  );
}
