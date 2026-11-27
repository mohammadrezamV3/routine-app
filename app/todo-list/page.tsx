import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `لیست کارهای روزانه و تو دو لیست (To Do List) فارسی | ${BRAND_FA}`,
      `Daily to-do list app in Persian | Checklists and reminders | ${brand}`,
    ),
    description: tr(
      `لیست کارهای روزانه‌ات را در ${BRAND_FA} بساز: چک لیست با آیتم‌های تیک‌خور، کارهای تکرارشونده، ` +
        `یادآوری و تقویم شمسی. یک اپلیکیشن تو دو لیست فارسی برای مدیریت کارها.`,
      `Build your daily to-do list in ${brand}: checklists with tickable items, recurring tasks, reminders and a Jalali calendar. A Persian to-do list app for managing your tasks.`,
    ),
    path: "/todo-list",
    keywords: tr(
      "لیست کارها|لیست کارهای روزانه|todo list فارسی|to do list|تو دو لیست|اپ لیست کار|اپلیکیشن لیست کارها|تسک منیجر|مدیریت کارها|مدیریت وظایف|اپ مدیریت کارها|چک لیست روزانه|لیست کارهای امروز|یادداشت کارهای روزانه|اپ یادآور|یادآوری کارها|برنامه ریزی روزانه|برنامه روزانه|اپ برنامه ریزی روزانه|تقویم شمسی",
      "to-do list app|daily to-do list|Persian to-do list|task manager|task list app|checklist app|daily checklist|reminder app|task management|Jalali calendar planner",
    ).split("|"),
    ownOgImage: true,
    ogTitle: tr(`لیست کارهای روزانه ${BRAND_FA}`, `Daily to-do list in ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("تو دو لیست (To Do List) چیست؟", "What is a to-do list?"),
      a: tr(
        "فهرستی از کارهایی که باید انجام بدهی و کنار هر کدام یک تیک می‌گذاری وقتی تمام شد. ساده‌ترین شکل مدیریت کار است: همه‌چیز را از ذهن بیرون می‌آوری و روی صفحه می‌گذاری تا چیزی فراموش نشود.",
        "A list of things you need to do, with a tick next to each one when it's finished. It's the simplest form of task management: you move everything out of your head and onto the screen so nothing is forgotten.",
      ),
    },
    {
      q: tr("بهترین اپلیکیشن لیست کارهای روزانه فارسی کدام است؟", "What is the best Persian daily to-do list app?"),
      a: tr(
        `بهترین اپ، اپی است که واقعا هر روز بازش کنی. ${BRAND_FA} فارسی و راست‌چین است، تقویم شمسی دارد و لیست کارها را کنار برنامه‌ی هفتگی و یادآوری‌ها نگه می‌دارد تا لازم نباشد بین چند اپ جابه‌جا شوی.`,
        `The best app is the one you actually open every day. ${brand} is Persian and right-to-left, has a Jalali calendar and keeps your task list next to your weekly plan and reminders, so you don't need to jump between apps.`,
      ),
    },
    {
      q: tr("چطور یک چک لیست کارهای روزانه بسازم؟", "How do I build a daily checklist?"),
      a: tr(
        "یک برنامه‌ی جدید اضافه کن، گزینه‌ی لیست‌بودن را روشن کن و آیتم‌هایش را بنویس. هر آیتم تیک جدا دارد و عنوان برنامه وقتی کامل می‌شود که همه‌ی آیتم‌ها انجام شده باشند. ترتیب آیتم‌ها را هم می‌شود با کشیدن عوض کرد.",
        "Add a new program, turn on the list option and write its items. Each item has its own tick, and the program counts as done when all its items are done. You can also reorder items by dragging.",
      ),
    },
    {
      q: tr("می‌شود کارهای تکراری را فقط یک بار نوشت؟", "Can I write recurring tasks only once?"),
      a: tr(
        "بله. هنگام ساخت برنامه روزهای هفته‌ای که تکرار می‌شود را انتخاب می‌کنی، یا آن را فقط برای یک روز مشخص می‌گذاری. دیگر لازم نیست هر هفته همان کارها را دوباره تایپ کنی.",
        "Yes. When you create a program, you pick the weekdays it repeats on, or set it for one specific day only. You no longer need to retype the same tasks every week.",
      ),
    },
    {
      q: tr("آیا برای لیست کارها یادآوری می‌فرستد؟", "Does it send reminders for my tasks?"),
      a: tr(
        "بله، برای هر برنامه می‌توانی اعلان را روشن کنی تا در زمانش یادآوری بگیری. برای کارهای مهمی مثل مصرف دارو هم بخش یادآور جدا وجود دارد.",
        "Yes, you can turn on notifications for each program to get a reminder at its time. For important things like taking medicine there is also a separate reminders section.",
      ),
    },
    {
      q: tr("تفاوت لیست کارها با برنامه‌ریزی روزانه چیست؟", "What's the difference between a to-do list and a daily plan?"),
      a: tr(
        "لیست کارها فقط می‌گوید چه چیزهایی باید انجام شود؛ برنامه‌ریزی روزانه به هر کار یک زمان هم می‌دهد. در آریون هر دو یک‌جا هستند: کارهای ساعت‌دار مرتب می‌شوند و کارهای بدون ساعت جدا نگه داشته می‌شوند.",
        "A to-do list only says what needs doing; a daily plan also gives each task a time. In Arion both live together: tasks with a time are sorted and tasks without a time are kept separately.",
      ),
    },
    {
      q: tr("آیا تاریخ‌ها شمسی هستند؟", "Are the dates Jalali?"),
      a: tr(
        "بله، تقویم اصلی شمسی است و هفته از شنبه شروع می‌شود، پس لازم نیست تاریخ میلادی را در ذهنت تبدیل کنی.",
        "Yes, the main calendar is Jalali and the week starts on Saturday, so you don't need to convert Gregorian dates in your head.",
      ),
    },
    {
      q: tr("کارهای انجام‌نشده‌ی امروز چه می‌شوند؟", "What happens to today's unfinished tasks?"),
      a: tr(
        "هر روز رکورد خودش را دارد؛ کار انجام‌نشده فقط تیک نمی‌خورد و در آمار آن روز به حساب نمی‌آید. می‌توانی همان کار را برای روز دیگری هم بگذاری.",
        "Each day has its own record. An unfinished task simply stays unticked and doesn't count in that day's stats. You can put the same task on another day as well.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("روتین روزانه", "Daily routine"), path: "/routine" },
    { name: tr("لیست کارهای روزانه", "Daily to-do list"), path: "/todo-list" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function TodoListPage() {
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
          `لیست کارهای روزانه و تو دو لیست فارسی در ${BRAND_FA}`,
          `Daily to-do list in ${brand}: checklists, reminders and a Jalali calendar`,
        )}
        lead={tr(
          `یک اپلیکیشن تو دو لیست فارسی که فقط یک فهرست ساده نیست: لیست کارهای روزانه، چک لیست با آیتم‌های جدا، ` +
            `کارهای تکرارشونده، یادآوری و تقویم شمسی در ${BRAND_FA} کنار هم قرار دارند. این صفحه توضیح می‌دهد ` +
            `یک لیست کار خوب چه ویژگی‌هایی دارد و چطور در آریون می‌سازیش.`,
          `A Persian to-do list app that is more than a plain list: a daily task list, checklists with separate items, recurring tasks, reminders and a Jalali calendar sit together in ${brand}. This page explains what makes a good task list and how to build one in Arion.`,
        )}
        sections={[
          {
            title: tr("چرا لیست کارها به آرامش ذهن کمک می‌کند؟", "Why does a task list calm the mind?"),
            paragraphs: [
              tr(
                "وقتی کارهای نیمه‌تمام فقط در ذهن باشند، ذهن مدام آن‌ها را مرور می‌کند؛ همین مرور بی‌پایان بخشی از خستگی ذهنی آخر روز است. نوشتن کارها روی یک لیست، این بار را از ذهن برمی‌دارد و جای آن می‌گذارد که فقط به کار جلوی دستت فکر کنی.",
                "When unfinished tasks live only in your head, your mind keeps replaying them, and that endless replay is part of the mental tiredness at the end of the day. Writing tasks on a list lifts that load and lets you think only about the task in front of you.",
              ),
              tr(
                "لیستی که کار می‌کند چند ویژگی دارد: کوتاه است، هر مورد در آن مشخص و قابل انجام است، و هر روز دیده می‌شود. لیست بلند و مبهم، کم‌کم به یک پوشه‌ی فراموش‌شده تبدیل می‌شود.",
                "A list that works has a few traits: it is short, each item is specific and doable, and it is seen every day. A long, vague list slowly turns into a forgotten folder.",
              ),
            ],
          },
          {
            title: tr(`لیست کارهای روزانه در ${BRAND_FA} چطور کار می‌کند؟`, `How does the daily task list work in ${brand}?`),
            bullets: [
              {
                title: tr("برنامه‌ی لیستی با آیتم‌های جدا", "List programs with separate items"),
                body: tr("هر برنامه می‌تواند چند آیتم داشته باشد، مثلا «خرید هفته» با آیتم‌های نان، میوه و شوینده. هر آیتم تیک خودش را دارد.", "Each program can have several items, for example “weekly shopping” with bread, fruit and detergent. Each item has its own tick."),
              },
              {
                title: tr("تیک کل برنامه", "Ticking the whole program"),
                body: tr("زدن تیک عنوان همه‌ی آیتم‌ها را با هم تیک می‌زند و برداشتنش همه را برمی‌دارد؛ برای وقتی که کل کار را یک‌جا انجام داده‌ای.", "Ticking the title ticks all items at once and unticking clears them all, for when you finished the whole job in one go."),
              },
              {
                title: tr("جابه‌جایی آیتم‌ها با کشیدن", "Reorder items by dragging"),
                body: tr("دستگیره‌ی کنار هر آیتم را بکش تا ترتیب مهم‌ترین کارها را عوض کنی.", "Drag the handle next to an item to reorder your most important tasks."),
              },
              {
                title: tr("کارهای تکرارشونده", "Recurring tasks"),
                body: tr("برنامه را برای روزهای مشخصی از هفته بگذار تا هر هفته خودکار در لیست آن روز بیاید.", "Set a program for chosen weekdays so it shows up on that day's list automatically each week."),
              },
              {
                title: tr("کارهای یک‌روزه", "One-day tasks"),
                body: tr("برای کاری که فقط یک بار لازم است، برنامه‌ی یک‌روزه بساز تا لیست‌های بعدی را شلوغ نکند.", "For something needed only once, make a one-day program so it doesn't clutter later lists."),
              },
              {
                title: tr("تگ‌ها", "Tags"),
                body: tr("برای هر برنامه تگ می‌گذاری (کار، خانه، درس) و تگ‌های قبلی هنگام نوشتن پیشنهاد می‌شوند.", "You give each program a tag (work, home, study), and earlier tags are suggested as you type."),
              },
            ],
          },
          {
            title: tr("یادآوری، ساعت و تقویم شمسی", "Reminders, times and the Jalali calendar"),
            bullets: [
              {
                title: tr("کارهای ساعت‌دار و بدون ساعت", "Timed and untimed tasks"),
                body: tr("کارهایی که ساعت دارند به ترتیب زمان می‌آیند و بقیه جدا نگه داشته می‌شوند. لازم نیست برای همه‌چیز ساعت بگذاری.", "Tasks with a time come in time order and the rest are kept apart. You don't have to set a time for everything."),
              },
              {
                title: tr("اعلان", "Notifications"),
                body: tr("اعلان هر برنامه را جدا روشن می‌کنی تا فقط برای مهم‌ترین‌ها مزاحم نشود.", "You turn notifications on per program, so it only nags you about the ones that matter."),
              },
              {
                title: tr("یادآور مستقل", "Standalone reminders"),
                body: tr("برای چیزهایی مثل دارو یا قبض که فراموش‌شدنشان گران تمام می‌شود، یادآور جدا وجود دارد.", "For things like medicine or bills, where forgetting is costly, there is a separate reminder."),
              },
              {
                title: tr("تقویم شمسی", "Jalali calendar"),
                body: tr("روزها و ماه‌ها شمسی‌اند و هفته از شنبه شروع می‌شود، پس لیست با تقویم واقعی‌ات هماهنگ است.", "Days and months are Jalali and the week starts on Saturday, so your list matches your real calendar."),
              },
            ],
          },
          {
            title: tr("چطور یک لیست کار خوب بنویسیم؟", "How to write a good task list"),
            bullets: [
              {
                title: tr("1. عملی بنویس", "1. Write actionable items"),
                body: tr("به‌جای «پروژه» بنویس «پیش‌نویس اول گزارش را بفرست». آیتمی که با یک فعل شروع شود راحت‌تر شروع می‌شود.", "Instead of “project” write “send the first draft of the report”. An item that starts with a verb is easier to start."),
              },
              {
                title: tr("2. بیشتر از پنج کار مهم نگذار", "2. Keep important tasks to five or fewer"),
                body: tr("لیست پانزده‌تایی در عمل انجام نمی‌شود. چند کار اصلی انتخاب کن و بقیه را به روز دیگری ببر.", "A fifteen-item list doesn't get done in practice. Pick a few main tasks and move the rest to another day."),
              },
              {
                title: tr("3. کارهای بزرگ را تکه کن", "3. Break big tasks down"),
                body: tr("کار بزرگ را به آیتم‌های کوچک در یک برنامه‌ی لیستی تبدیل کن؛ هر تیک یک پیشرفت کوچک است.", "Turn a big task into small items in one list program. Each tick is a small win."),
              },
              {
                title: tr("4. شب قبل بنویس", "4. Write it the night before"),
                body: tr("پنج دقیقه نوشتن لیست فردا، صبح را بدون تصمیم‌گیری شروع می‌کند.", "Five minutes spent writing tomorrow's list lets you begin the morning without deciding anything."),
              },
              {
                title: tr("5. آخر هفته مرور کن", "5. Review at the end of the week"),
                body: tr("ببین کدام کارها همیشه جا می‌مانند؛ یا بیش از حد بزرگ‌اند یا واقعا مهم نیستند.", "See which tasks are always left behind. They are either too big or not really important."),
              },
            ],
          },
          {
            title: tr("لیست کارها به‌علاوه‌ی عادت و آمار", "Your list plus habits and stats"),
            paragraphs: [
              tr(
                `تیک‌ها فقط برای حال خوب نیستند. ${BRAND_FA} درصد کارهای انجام‌شده‌ی هر روز را نشان می‌دهد و روزهای کامل پشت‌سرهم را به‌صورت استریک می‌شمارد، پس لیست کارت کم‌کم به یک تصویر واقعی از رفتارت تبدیل می‌شود.`,
                `Ticks aren't only for feeling good. ${brand} shows the percentage of tasks done each day and counts consecutive complete days as a streak, so your list gradually becomes an honest picture of your behaviour.`,
              ),
              tr(
                "اگر می‌خواهی کارهای تکراری را به عادت تبدیل کنی، صفحه‌ی پیگیری عادت‌ها و برنامه‌ریزی روزانه را هم ببین.",
                "If you want to turn recurring tasks into habits, also see the habit tracking and daily planning pages.",
              ),
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره لیست کارهای روزانه", "Frequently asked questions about daily to-do lists")}
        related={[
          {
            href: "/daily-planner",
            label: tr("برنامه‌ریزی روزانه با آریون", `Daily planning with ${brand}`),
            note: tr("کارهای امروز را با ساعت و اولویت بچین.", "Arrange today's tasks with times and priorities."),
          },
          {
            href: "/routine",
            label: tr("روتین روزانه در آریون", `Daily routine in ${brand}`),
            note: tr("چطور یک روتین تکرارشونده بسازیم.", "How to build a recurring routine."),
          },
          {
            href: "/habit-tracker",
            label: tr("پیگیری عادت‌ها", "Habit tracking"),
            note: tr("تیک روزانه و استریک برای عادت‌هایت.", "Daily ticks and streaks for your habits."),
          },
          {
            href: "/blog/daily-planning-guide",
            label: tr("راهنمای برنامه‌ریزی روزانه", "Daily planning guide"),
            note: tr("مقاله‌ی کامل درباره‌ی چیدن یک روز قابل‌اجرا.", "A full article on arranging a doable day."),
          },
          {
            href: "/study-planner",
            label: tr("برنامه‌ریزی درسی", "Study planner"),
            note: tr("جدول مطالعه‌ی هفتگی برای دانش‌آموز و داوطلب کنکور.", "A weekly study table for students and exam candidates."),
          },
        ]}
      />
    </>
  );
}
