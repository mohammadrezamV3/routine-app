import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `برنامه ریزی درسی و کنکور | جدول مطالعه هفتگی | ${BRAND_FA}`,
      `Study planner | Weekly study schedule for students and exam prep | ${brand}`,
    ),
    description: tr(
      `برنامه ریزی درسی در ${BRAND_FA}: جدول مطالعه‌ی هفتگی، بلوک‌های تکرارشونده‌ی درس، ` +
        `زمان‌بندی به سبک پومودورو، استریک و آنالیز هفتگی برای دانش‌آموز و داوطلب کنکور.`,
      `Study planning in ${brand}: a weekly study table, repeating study blocks, Pomodoro-style timing, streaks and weekly analysis for students and exam candidates.`,
    ),
    path: "/study-planner",
    ownOgImage: true,
    ogTitle: tr(`برنامه ریزی درسی ${BRAND_FA}`, `Study planner in ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("چطور برای کنکور برنامه ریزی کنم؟", "How do I plan for the Konkur exam?"),
      a: tr(
        "اول زمان واقعی در دسترست را مشخص کن، بعد درس‌ها را بر اساس وزن و ضعفت بین هفته تقسیم کن. برنامه‌ی هفتگی با بلوک‌های تکرارشونده بهتر از برنامه‌ی روزبه‌روز جواب می‌دهد، چون هر هفته از صفر شروع نمی‌کنی.",
        "First pin down the time you really have, then split subjects across the week by weight and by your weak spots. A weekly plan with repeating blocks works better than a day-by-day plan, because you don't start from zero each week.",
      ),
    },
    {
      q: tr("جدول برنامه ریزی درسی را چطور بنویسم؟", "How do I write a study schedule table?"),
      a: tr(
        "هر درس را به‌صورت یک برنامه با روز و ساعت مشخص اضافه کن و روزهای تکرارش را انتخاب کن. نتیجه یک جدول هفتگی است که هر هفته خودش برمی‌گردد و لازم نیست دوباره بنویسی‌اش.",
        "Add each subject as a program with a day and a time, and choose its repeat days. The result is a weekly table that returns on its own each week, so you don't rewrite it.",
      ),
    },
    {
      q: tr("بهترین اپلیکیشن برنامه ریزی درسی چه ویژگی‌هایی دارد؟", "What should the best study planning app have?"),
      a: tr(
        "سه چیز: ثبت سریع بلوک‌های مطالعه، دیدن پیشرفت واقعی (نه فقط برنامه)، و تقویم شمسی. آریون یک برنامه‌ریز عمومی است نه ابزار مخصوص کنکور، ولی همین سه مورد را دارد و برای برنامه‌ی درسی خوب کار می‌کند.",
        "Three things: fast entry of study blocks, seeing real progress (not just the plan) and a Jalali calendar. Arion is a general planner, not a Konkur-only tool, but it has these three and works well for a study schedule.",
      ),
    },
    {
      q: tr("می‌شود روش پومودورو را در آریون استفاده کرد؟", "Can I use the Pomodoro technique in Arion?"),
      a: tr(
        "آریون تایمر پومودورو داخلی ندارد. ولی می‌توانی بلوک‌های زمان‌دار بسازی، مثلا 25 دقیقه درس و 5 دقیقه استراحت را به‌صورت برنامه‌های پشت‌سرهم بنویسی و هر کدام را بعد از انجام تیک بزنی.",
        "Arion has no built-in Pomodoro timer. But you can create timed blocks, for example 25 minutes of study and a 5 minute break written as back-to-back programs, and tick each one off when done.",
      ),
    },
    {
      q: tr("برنامه مطالعه روزانه چند ساعت باشد؟", "How many hours should a daily study plan be?"),
      a: tr(
        "عدد جادویی وجود ندارد و به پایه، فاصله تا امتحان و توان تمرکزت بستگی دارد. مهم‌تر از تعداد ساعت، پایداری است: برنامه‌ای که هر روز بتوانی انجامش بدهی از برنامه‌ای که دو روز بعد رها می‌شود بهتر است.",
        "There is no magic number; it depends on your level, the time to the exam and your focus. Consistency matters more than hours: a plan you can do every day beats one you drop after two days.",
      ),
    },
    {
      q: tr("اگر یک روز برنامه‌ی درسی‌ام عقب افتاد چه کنم؟", "What if I fall behind one day?"),
      a: tr(
        "همان کارهای مهم عقب‌افتاده را به روزهای نزدیک ببر و کل برنامه را رها نکن. در آنالیز هفتگی می‌بینی کدام درس‌ها بیشتر جا می‌مانند و می‌توانی زمانشان را بازتنظیم کنی.",
        "Move the important missed items to nearby days and don't abandon the whole plan. In the weekly analysis you can see which subjects get left behind most and rebalance their time.",
      ),
    },
    {
      q: tr("آیا آمار پیشرفت مطالعه را نشان می‌دهد؟", "Does it show study progress stats?"),
      a: tr(
        "درصد برنامه‌های انجام‌شده‌ی هر روز، استریک روزهای کامل و آنالیز هفتگی را می‌بینی. ساعت دقیق مطالعه یا تعداد تست نمی‌شمارد؛ فقط انجام‌شدن برنامه‌هایی که خودت تعریف کرده‌ای را ثبت می‌کند.",
        "You see the percentage of programs done each day, your streak of complete days and a weekly analysis. It doesn't count exact study hours or practice tests; it only records whether the programs you defined were done.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("روتین روزانه", "Daily routine"), path: "/routine" },
    { name: tr("برنامه ریزی درسی", "Study planner"), path: "/study-planner" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function StudyPlannerPage() {
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
          `برنامه ریزی درسی و کنکور با ${BRAND_FA}؛ جدول مطالعه‌ی هفتگی`,
          `Study planner in ${brand}: a weekly study schedule`,
        )}
        lead={tr(
          `یک برنامه‌ی درسی خوب چند کار ساده را هر هفته تکرار می‌کند: درس‌ها را روی روزهای مشخص می‌گذارد، ` +
            `زمان استراحت دارد و پیشرفت را نشان می‌دهد. ${BRAND_FA} برای همین ساخته شده: جدول مطالعه‌ی هفتگی، ` +
            `بلوک‌های تکرارشونده، تیک روزانه، استریک و آنالیز هفتگی. این صفحه راهنمای برنامه ریزی درسی است، ` +
            `برای دانش‌آموز، دانشجو و داوطلب کنکور.`,
          `A good study plan repeats a few simple things every week: it puts subjects on fixed days, has rest time and shows progress. ${brand} is built for that: a weekly study table, repeating blocks, daily ticks, streaks and weekly analysis. This page is a study planning guide for school students, university students and exam candidates.`,
        )}
        sections={[
          {
            title: tr("چرا بیشتر برنامه‌های درسی شکست می‌خورند؟", "Why do most study plans fail?"),
            paragraphs: [
              tr(
                "دلیل معمول، تنبلی نیست؛ برنامه‌هایی که بیش از حد بلند و ایده‌آل نوشته می‌شوند. برنامه‌ی ده ساعت مطالعه‌ی روزانه، در اولین روز عقب می‌افتد و وقتی عقب افتاد، آدم کل برنامه را رها می‌کند.",
                "The usual reason isn't laziness; it's plans written too long and too ideal. A ten-hour daily study plan falls behind on day one, and once behind, people abandon the whole thing.",
              ),
              tr(
                "برنامه‌ی واقع‌بینانه کوتاه‌تر است، استراحت دارد و روی ساعت‌هایی نشسته که واقعا آزادی. بعد از چند هفته می‌توانی کم‌کم سنگینش کنی.",
                "A realistic plan is shorter, includes rest and sits on hours when you are really free. After a few weeks you can make it heavier little by little.",
              ),
            ],
          },
          {
            title: tr(`جدول مطالعه‌ی هفتگی در ${BRAND_FA}`, `The weekly study table in ${brand}`),
            bullets: [
              {
                title: tr("هر درس یک برنامه", "One program per subject"),
                body: tr("ریاضی، زیست یا ادبیات را با نام، روز و ساعت اضافه می‌کنی؛ همه در یک نمای هفتگی دیده می‌شوند.", "You add maths, biology or literature with a name, day and time, and they all show in one weekly view."),
              },
              {
                title: tr("بلوک‌های تکرارشونده", "Repeating blocks"),
                body: tr("روزهای تکرار را یک بار انتخاب می‌کنی (مثلا شنبه، دوشنبه، چهارشنبه) و برنامه هر هفته خودش برمی‌گردد.", "You choose the repeat days once (say Saturday, Monday, Wednesday) and the program returns each week by itself."),
              },
              {
                title: tr("برنامه‌ی دوره‌ای", "Period programs"),
                body: tr("برای بازه‌هایی مثل دو هفته‌ی مرور قبل از امتحان، برنامه‌ی دوره‌ای بگذار تا بعدا لیستت را شلوغ نکند.", "For spans like the two weeks of review before an exam, set a period program so it doesn't clutter your list later."),
              },
              {
                title: tr("لیست مباحث", "Topic checklists"),
                body: tr("یک برنامه را لیستی کن و مباحث فصل را به آیتم‌های جدا بشکن؛ هر آیتم تیک دارد.", "Make a program a checklist and split the chapter topics into separate items, each with a tick."),
              },
              {
                title: tr("تقویم شمسی", "Jalali calendar"),
                body: tr("هفته از شنبه شروع می‌شود و تاریخ‌ها شمسی‌اند، مناسب تقویم مدرسه و امتحان‌های ایران.", "The week starts on Saturday and dates are Jalali, matching school and exam calendars in Iran."),
              },
            ],
          },
          {
            title: tr("بلوک‌های مطالعه و استراحت به سبک پومودورو", "Pomodoro-style study and rest blocks"),
            paragraphs: [
              tr(
                "روش پومودورو یعنی چند بلوک کوتاه تمرکز با استراحت‌های کوتاه بین‌شان. آریون تایمر پومودورو ندارد، ولی چون برنامه‌ها ساعت و مدت دارند، می‌توانی همین ساختار را در جدول خودت بچینی: مثلا یک بلوک ریاضی، بعد یک بلوک استراحت، بعد بلوک بعدی. با تیک‌زدن هر بلوک می‌بینی امروز چند بلوک واقعی انجام داده‌ای.",
                "The Pomodoro method means several short focus blocks with short breaks between them. Arion has no Pomodoro timer, but since programs have a time and duration you can lay out the same structure in your table: a maths block, then a rest block, then the next block. Ticking each block shows how many real blocks you did today.",
              ),
              tr(
                "برای جزئیات روش، مقاله‌ی تکنیک پومودورو را در وبلاگ بخوان.",
                "For details of the method, read the Pomodoro technique article on the blog.",
              ),
            ],
          },
          {
            title: tr("برنامه‌ریزی برای کنکور و امتحان‌ها", "Planning for Konkur and exams"),
            bullets: [
              {
                title: tr("اول زمان واقعی", "Real time first"),
                body: tr("ساعت‌های مدرسه، رفت‌وآمد و خواب را کم کن؛ آنچه می‌ماند ظرفیت واقعی مطالعه‌ی توست.", "Subtract school, commuting and sleep. What remains is your real study capacity."),
              },
              {
                title: tr("درس‌های ضعیف زودتر", "Weak subjects earlier"),
                body: tr("درس‌هایی که سخت‌ترند را در ساعت‌های پرانرژی روز بگذار، نه آخر شب.", "Put harder subjects in your high-energy hours, not late at night."),
              },
              {
                title: tr("مرور را برنامه کن", "Schedule review"),
                body: tr("مرور هفتگی را مثل یک درس جدا در جدول بگذار؛ بدون جای ثابت، همیشه حذف می‌شود.", "Put weekly review in the table like a separate subject. Without a fixed slot it always gets dropped."),
              },
              {
                title: tr("روز استراحت", "A rest day"),
                body: tr("حداقل یک نیم‌روز در هفته خالی بگذار؛ این روز وقتی هم جبران عقب‌افتادگی است.", "Leave at least half a day a week empty. It also serves as catch-up time."),
              },
            ],
          },
          {
            title: tr("دیدن پیشرفت: استریک و آنالیز هفتگی", "Seeing progress: streaks and weekly analysis"),
            bullets: [
              {
                title: tr("درصد انجام روزانه", "Daily completion"),
                body: tr("هر روز می‌بینی چند درصد از برنامه‌های مطالعه را انجام داده‌ای.", "Each day you see what percentage of your study programs you completed."),
              },
              {
                title: tr("استریک", "Streak"),
                body: tr("روزهای کامل پشت‌سرهم شمرده می‌شوند و انگیزه‌ی نشکستن زنجیره می‌دهند.", "Consecutive complete days are counted and give you a reason not to break the chain."),
              },
              {
                title: tr("آنالیز هفتگی", "Weekly analysis"),
                body: tr("در پایان هفته روز به روز و بخش به بخش می‌بینی چه چیزی جا مانده تا هفته‌ی بعد را بهتر ببندی.", "At the end of the week you see day by day and section by section what slipped, to shape next week better."),
              },
            ],
          },
          {
            title: tr("یک هفته‌ی نمونه", "A sample week"),
            paragraphs: [
              tr(
                "برای یک دانش‌آموز: شنبه و دوشنبه ریاضی، یکشنبه و سه‌شنبه زیست، چهارشنبه ادبیات و عربی، پنجشنبه مرور کل هفته و جمعه نیم‌روز استراحت. هر کدام یک بلوک تکرارشونده‌اند و بعد از ساخت اولیه، هفته‌های بعد را دیگر دست نمی‌زنی مگر برای تنظیم.",
                "For a school student: Saturday and Monday maths, Sunday and Tuesday biology, Wednesday literature and Arabic, Thursday review of the whole week, and Friday a half day of rest. Each is a repeating block, and after the first setup you leave later weeks alone except for tuning.",
              ),
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره برنامه ریزی درسی", "Frequently asked questions about study planning")}
        related={[
          {
            href: "/blog/daily-study-schedule",
            label: tr("برنامه مطالعه‌ی روزانه", "Daily study schedule"),
            note: tr("مقاله‌ی کامل درباره‌ی چیدن ساعت‌های مطالعه.", "A full article on arranging study hours."),
          },
          {
            href: "/blog/pomodoro-technique",
            label: tr("تکنیک پومودورو", "The Pomodoro technique"),
            note: tr("بلوک‌های تمرکز و استراحت چطور کار می‌کنند.", "How focus and rest blocks work."),
          },
          {
            href: "/blog/weekly-planning-guide",
            label: tr("راهنمای برنامه‌ریزی هفتگی", "Weekly planning guide"),
            note: tr("هفته را در یک جلسه‌ی کوتاه ببند.", "Set up your week in one short session."),
          },
          {
            href: "/routine",
            label: tr("روتین روزانه در آریون", `Daily routine in ${brand}`),
            note: tr("چطور برنامه‌ی تکرارشونده بسازیم.", "How to build a recurring plan."),
          },
          {
            href: "/todo-list",
            label: tr("لیست کارهای روزانه", "Daily to-do list"),
            note: tr("چک لیست و یادآوری برای کارهای هر روز.", "Checklists and reminders for everyday tasks."),
          },
        ]}
      />
    </>
  );
}
