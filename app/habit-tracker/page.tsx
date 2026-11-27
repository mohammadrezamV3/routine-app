import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `عادت ساز و هبیت ترکر فارسی | پیگیری عادت و استریک | ${BRAND_FA}`,
      `Habit tracker | Track your habits and streaks | ${brand}`,
    ),
    description: tr(
      `اپ عادت ساز فارسی: عادت‌های روزانه را در هبیت ترکر ${BRAND_FA} ثبت کن، با تیک روزانه و استریک پیگیری کن و راهنمای ساخت و نگه‌داشتن یک عادت جدید را بخوان.`,
      `Record and track your daily habits in ${brand} with weekly repeats, daily ticks and streaks, plus a guide to building a new habit and keeping it.`,
    ),
    path: "/habit-tracker",
    keywords: tr(
      "عادت ساز|عادت‌ساز|اپ عادت ساز|اپلیکیشن عادت ساز|هبیت ترکر|habit tracker فارسی|ردیاب عادت|پیگیری عادت|اپ ردیابی عادت|چطور عادت بسازیم|ساخت عادت جدید|عادت سازی|عادت های خوب|ترک عادت بد|چالش 21 روزه|چالش 30 روزه|استریک|اپ استریک|چک لیست عادت|عادت روزانه",
      "habit tracker|habit tracker app|Persian habit tracker|build a habit|habit streak|daily habits|break a bad habit|21 day habit challenge|habit builder app|track daily habits",
    ).split("|"),
    ownOgImage: true,
    ogTitle: tr(`عادت‌ساز فارسی ${BRAND_FA}`, `Habit tracker in ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("هبیت ترکر (Habit Tracker) چیست؟", "What is a habit tracker?"),
      a: tr(
        "ابزاری که هر روز نشان می‌دهد یک عادت مشخص را انجام داده‌ای یا نه و زنجیره‌ی روزهای پشت‌سرهم را نگه می‌دارد. فایده‌اش این است که پیشرفت را قابل‌دیدن می‌کند؛ چیزی که فقط در ذهن باشد، خیلی زود از یاد می‌رود.",
        "A tool that shows each day whether you did a particular habit, and keeps a chain of days in a row. Its benefit is that it makes progress visible. Something that only lives in your head is forgotten very quickly.",
      ),
    },
    {
      q: tr("چطور در آریون عادت جدید ثبت کنم؟", `How do I record a new habit in ${brand}?`),
      a: tr(
        "عادت را مثل یک آیتم تکرارشونده در برنامه‌ی هفتگی اضافه می‌کنی و روزهای تکرارش را مشخص می‌کنی. هر روز که انجامش دادی تیک می‌زنی و پیشرفتت ثبت می‌شود.",
        "You add the habit like a recurring item in the weekly plan and set the days it repeats. Each day you do it, you tick it off and your progress is recorded.",
      ),
    },
    {
      q: tr("ساختن یک عادت چقدر طول می‌کشد؟", "How long does it take to build a habit?"),
      a: tr(
        "عدد ثابتی ندارد و به خود عادت و شرایط فرد بستگی دارد؛ پژوهش‌ها بازه‌ی نسبتا وسیعی را گزارش کرده‌اند. چیزی که عملا کمک می‌کند، تکرار پیوسته و کوچک‌نگه‌داشتن عادت در هفته‌های اول است.",
        "There's no fixed number. It depends on the habit itself and on the person, and research reports a fairly wide range. What really helps is repeating it consistently and keeping it small in the first few weeks.",
      ),
    },
    {
      q: tr("اگر زنجیره‌ام قطع شد باید از اول شروع کنم؟", "If my streak breaks, do I have to start from the beginning?"),
      a: tr(
        "نه. یک روز ازدست‌رفته عادت را از بین نمی‌برد؛ چیزی که آسیب می‌زند رهاکردن بعد از آن یک روز است. کافی است روز بعد دوباره ادامه بدهی.",
        "No. One missed day doesn't erase a habit. What does the damage is giving up after that day. Just carry on the next day.",
      ),
    },
    {
      q: tr("بهترین اپلیکیشن عادت ساز کدام است؟", "Which is the best habit building app?"),
      a: tr(
        "اپ خوب برای عادت‌سازی ساده است: ثبت عادت در چند ثانیه، تیک روزانه، نمایش زنجیره‌ی روزهای پشت‌سرهم و امکان ادامه‌دادن بعد از یک روز ازدست‌رفته. آریون همین‌ها را دارد و عادت‌ها را کنار روتین و کارهای روزانه نگه می‌دارد؛ اگر فقط یک ردیاب جداگانه می‌خواهی، خودت چند روز امتحان کن.",
        "A good habit app is simple: adding a habit in seconds, a daily tick, a visible chain of consecutive days and the ability to carry on after a missed day. Arion has these and keeps habits next to your routine and daily tasks; if you only want a separate tracker, try it for a few days yourself.",
      ),
    },
    {
      q: tr("چالش 21 روزه واقعا کار می‌کند؟", "Does the 21-day challenge really work?"),
      a: tr(
        "عدد 21 روز یک قاعده‌ی علمی ثابت نیست؛ پژوهش‌ها بازه‌ی نسبتا وسیعی برای جاافتادن یک عادت گزارش کرده‌اند و به نوع عادت و فرد بستگی دارد. اما یک چالش کوتاه با تیک روزانه می‌تواند شروع خوبی باشد، به شرط اینکه عادت را کوچک نگه داری.",
        "21 days is not a fixed scientific rule; research reports a fairly wide range for a habit to settle and it depends on the habit and the person. Still, a short challenge with a daily tick can be a good start, as long as you keep the habit small.",
      ),
    },
    {
      q: tr("چطور یک عادت بد را ترک کنیم؟", "How do I break a bad habit?"),
      a: tr(
        "معمولا ترک مستقیم سخت‌تر از جایگزین‌کردن است: نشانه‌ی عادت بد را پیدا کن، کار دسترسی به آن را سخت‌تر کن و یک رفتار کوچک و جایگزین برایش تعریف کن. می‌توانی آن رفتار جایگزین را در آریون به‌عنوان یک آیتم تکرارشونده ثبت کنی و هر روز تیک بزنی تا پیشرفتت دیده شود.",
        "Direct quitting is usually harder than replacing: find the cue for the bad habit, make it harder to reach and define a small replacement behaviour. You can record that replacement in Arion as a recurring item and tick it every day so your progress is visible.",
      ),
    },
    {
      q: tr("آیا هبیت ترکر فارسی رایگان است؟", "Is the Persian habit tracker free?"),
      a: tr(
        "پیگیری عادت در بخش «روتین من» است که برای هر حساب تازه 14 روز رایگان است و بعد برای ادامه به یک پلن پولی نیاز دارد. می‌توانی بدون پرداخت امتحانش کنی و تصمیم بگیری.",
        "Habit tracking lives in the “My Routine” section, which is free for 14 days on every new account and needs a paid plan to continue after that. You can try it without paying and then decide.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("روتین روزانه", "Daily routine"), path: "/routine" },
    { name: tr("پیگیری عادت‌ها", "Habit tracking"), path: "/habit-tracker" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function HabitTrackerPage() {
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
          `عادت‌ساز فارسی ${BRAND_FA}؛ عادت‌هایت را روز به روز پیگیری کن`,
          `Habit tracker in ${brand}: track your habits day by day`,
        )}
        lead={tr(
          `پیگیری عادت یعنی هر روز ببینی کاری را که برایش تصمیم گرفته‌ای انجام داده‌ای یا نه. ` +
            `در ${BRAND_FA} عادت‌ها بخشی از همان برنامه‌ی هفتگی‌اند: یک‌بار ثبتشان می‌کنی، ` +
            `هر روز تیک می‌زنی و زنجیره‌ات را می‌بینی.`,
          `Habit tracking means seeing each day whether you did what you decided to do. In ${brand}, habits are part of the same weekly plan: you record them once, tick them off each day and see your chain grow.`,
        )}
        ctaNote={tr("بدون اشتراک", "No subscription needed")}
        sections={[
          {
            title: tr("چرا پیگیری عادت جواب می‌دهد؟", "Why does tracking habits work?"),
            paragraphs: [
              tr(
                "بیشتر تصمیم‌های «از فردا شروع می‌کنم» به این دلیل شکست نمی‌خورند که آدم تنبل است؛ شکست می‌خورند چون هیچ‌جا ثبت نمی‌شوند. وقتی انجام‌دادن یا ندادن یک کار هیچ ردی باقی نمی‌گذارد، ذهن خیلی راحت خودش را قانع می‌کند که «تقریبا همیشه» انجامش داده — در حالی که واقعیت چیز دیگری است.",
                "Most “I'll start tomorrow” decisions don't fail because someone is lazy. They fail because they're not recorded anywhere. When doing or not doing something leaves no trace, the mind easily convinces you that you “almost always” did it, when the reality is different.",
              ),
              tr(
                "یک رد ساده‌ی روزانه دو کار می‌کند: تصویر واقعی می‌دهد و زنجیره‌ای می‌سازد که دل‌ت نمی‌خواهد بشکند.",
                "A simple daily mark does two things: it gives you an accurate picture, and it builds a chain you don't want to break.",
              ),
            ],
          },
          {
            title: tr(`عادت‌ساز ${BRAND_FA} چه چیزی دارد؟`, `What does the ${brand} habit tracker include?`),
            bullets: [
              {
                title: tr("تکرار دلخواه", "Custom repeats"),
                body: tr("عادت را می‌توانی برای همه‌ی روزها یا فقط روزهای مشخصی از هفته تنظیم کنی — مثلا ورزش شنبه، دوشنبه، چهارشنبه.", "Set a habit for every day or only certain days of the week, for example exercise on Saturday, Monday and Wednesday."),
              },
              {
                title: tr("تیک روزانه و استریک", "Daily ticks and streaks"),
                body: tr("هر روز که انجام شد تیک می‌زنی و تعداد روزهای پشت‌سرهم را می‌بینی.", "Tick it off on each day you do it and see how many days in a row you've kept it up."),
              },
              {
                title: tr("عادت‌های بدون ساعت", "Habits without a time"),
                body: tr("لازم نیست برای هر عادت ساعت بگذاری؛ بعضی کارها فقط باید «امروز» انجام شوند.", "You don't have to set a time for every habit; some just need to be done “today”."),
              },
              {
                title: tr("یادآوری", "Reminders"),
                body: tr("برای عادت‌هایی که فراموش می‌شوند — مثل مصرف دارو — یادآوری جداگانه وجود دارد.", "For habits that get forgotten, such as taking medicine, there are separate reminders."),
              },
              {
                title: tr("آمار هفتگی", "Weekly stats"),
                body: tr("در پایان هفته می‌بینی کدام عادت‌ها پایدار بوده‌اند و کدام‌ها همیشه جا مانده‌اند.", "At the end of the week you see which habits held up and which were always left behind."),
              },
            ],
          },
          {
            title: tr("چطور یک عادت جدید بسازیم؟", "How do you build a new habit?"),
            bullets: [
              {
                title: tr("1. عادت را تا حد ممکن کوچک کن", "1. Keep the habit as small as possible"),
                body: tr("«روزی ده دقیقه مطالعه» شانس خیلی بیشتری از «روزی یک ساعت مطالعه» دارد. بعد از جاافتادن می‌شود بزرگش کرد.", "“Ten minutes of reading a day” has a much better chance than “an hour of reading a day”. Once it's settled, you can make it bigger."),
              },
              {
                title: tr("2. به یک کار موجود بچسبانش", "2. Attach it to something you already do"),
                body: tr("عادت جدید را بعد از کاری بگذار که از قبل هر روز انجام می‌دهی؛ همان کار قبلی نشانه‌ی شروع می‌شود.", "Put the new habit after something you already do every day. That existing action becomes the cue to start."),
              },
              {
                title: tr("3. فقط یکی دو عادت هم‌زمان", "3. Only one or two habits at a time"),
                body: tr("شروع هم‌زمان پنج عادت جدید تقریبا همیشه به رهاشدن هر پنج‌تا ختم می‌شود.", "Starting five new habits at once almost always ends with all five being dropped."),
              },
              {
                title: tr("4. زنجیره را ببین", "4. Look at your chain"),
                body: tr("هفته‌ای یک‌بار به روزهای تیک‌خورده نگاه کن. همین نگاه‌کردن، خودش انگیزه‌ی ادامه است.", "Once a week, look at the ticked days. Just looking is itself a reason to keep going."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره عادت‌ها", "Frequently asked questions about habits")}
        related={[
          {
            href: "/routine",
            label: tr("روتین روزانه در آریون", `Daily routine in ${brand}`),
            note: tr("روتین روزانه چیست و چطور یک برنامه‌ی تکرارشونده بسازیم.", "What a daily routine is and how to build a recurring plan."),
          },
          {
            href: "/daily-planner",
            label: tr("برنامه‌ریزی روزانه با آریون", `Daily planning with ${brand}`),
            note: tr("کارهای امروز، ساعت‌ها و یادآوری‌ها در یک نگاه.", "Today's tasks, times and reminders at a glance."),
          },
          {
            href: "/blog/how-to-build-a-habit",
            label: tr("راهنمای ساختن عادت جدید", "Guide to building a new habit"),
            note: tr("مقاله‌ی کامل درباره‌ی مراحل ساختن و نگه‌داشتن یک عادت.", "A full article on the steps to build and keep a habit."),
          },
          {
            href: "/bodybuilding-program",
            label: tr("برنامه‌ی بدنسازی هوشمند آریون", `${brand} smart workout plan`),
            note: tr("عادت ورزش‌کردن را با یک برنامه‌ی تمرینی واقعی نگه دار.", "Keep the exercise habit going with a real training plan."),
          },
        ]}
      />
    </>
  );
}
