import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `برنامه ریزی روزانه آنلاین با تقویم شمسی | اپ برنامه ریز | ${BRAND_FA}`,
      `Online daily planner with a Jalali calendar | Planning app | ${brand}`,
    ),
    description: tr(
      `اپ برنامه ریزی روزانه فارسی: کارهای امروز، کارهای بدون ساعت و یادآوری را در یک صفحه و با تقویم شمسی بچین؛ برنامه هفتگی هم همان‌جاست. 14 روز رایگان.`,
      `A Persian daily planning app: arrange today's tasks, tasks without a time and reminders on one page with a Jalali calendar. Your weekly plan lives there too.`,
    ),
    path: "/daily-planner",
    keywords: tr(
      "برنامه ریزی روزانه|برنامه‌ریزی روزانه|اپلیکیشن برنامه ریزی روزانه|اپ برنامه ریزی روزانه|برنامه ریز روزانه|برنامه روزانه|برنامه روزانه فارسی|جدول برنامه ریزی روزانه|چطور برنامه ریزی روزانه کنیم|دیلی پلنر|برنامه ریزی روزانه آنلاین|برنامه ریزی روزانه رایگان|اپ برنامه ریزی با تقویم شمسی|برنامه هفتگی|برنامه ریزی هفتگی|جدول برنامه هفتگی|پلنر هفتگی|یادآوری کارها|اپ یادآور|مدیریت کارها|برنامه ریز آنلاین|تقویم شمسی",
      "daily planner|daily planner app|online daily planner|daily planning app|weekly planner|Persian daily planner|Jalali calendar planner|task planner|plan my day|reminder app|schedule planner",
    ).split("|"),
    ownOgImage: true,
    ogTitle: tr(`برنامه‌ریزی روزانه با ${BRAND_FA}`, `Daily planning with ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("برنامه‌ریزی روزانه یعنی چه؟", "What does daily planning mean?"),
      a: tr(
        "یعنی قبل از شروع روز (یا شب قبلش) مشخص کنی امروز دقیقا چه کارهایی باید انجام شوند و کدامشان اولویت دارند. فایده‌ی اصلی‌اش این است که در طول روز دیگر انرژی‌ات صرف تصمیم‌گیری درباره‌ی «حالا چه کار کنم» نمی‌شود.",
        "It means deciding before the day starts (or the night before) exactly which tasks need to be done today and which come first. Its main benefit is that during the day you no longer spend energy deciding “what should I do now?”",
      ),
    },
    {
      q: tr("تفاوت برنامه‌ی روزانه با روتین چیست؟", "What is the difference between a daily plan and a routine?"),
      a: tr(
        "روتین کارهای تکرارشونده‌ای است که هر هفته خودبه‌خود برمی‌گردند. برنامه‌ی روزانه ترکیبی است از همان روتین به‌علاوه‌ی کارهای مخصوص همان روز. در آریون هر دو در یک صفحه‌ی واحد کنار هم دیده می‌شوند.",
        "A routine is recurring tasks that come back by themselves every week. A daily plan is that same routine plus the tasks specific to that day. In this app, both appear side by side on one page.",
      ),
    },
    {
      q: tr("آیا می‌توانم کاری را بدون ساعت ثبت کنم؟", "Can I record a task without a time?"),
      a: tr(
        "بله. لازم نیست برای هر کار زمان مشخص بگذاری؛ کارهای بدون ساعت به‌صورت جدا نگه داشته می‌شوند تا هر وقت روز که شد انجام شوند.",
        "Yes. You don't have to set a specific time for each task. Tasks without a time are kept separately so they can be done whenever during the day.",
      ),
    },
    {
      q: tr("برنامه‌ی روزانه با تقویم شمسی کار می‌کند؟", "Does the daily plan work with the Jalali calendar?"),
      a: tr("بله. تاریخ‌ها جلالی‌اند و هفته از شنبه شروع می‌شود.", "Yes. Dates are Jalali and the week starts on Saturday."),
    },
    {
      q: tr("بهترین اپ برنامه ریزی روزانه کدام است؟", "Which is the best daily planner app?"),
      a: tr(
        "اپ مناسب به نیاز تو بستگی دارد. اگر کارهایی داری که هر هفته تکرار می‌شوند، اپی بهتر است که تکرار را خودش مدیریت کند. اگر برنامه‌ات بیشتر کارهای یک‌باره است، یک لیست ساده کافی است. آریون برای کسی ساخته شده که روتین تکرارشونده و کارهای همان روز را می‌خواهد کنار هم و با تقویم شمسی ببیند.",
        "The right app depends on your needs. If you have tasks that repeat every week, an app that manages repetition itself is better. If your plan is mostly one-off tasks, a simple list is enough. Arion is built for someone who wants a recurring routine and that day's tasks side by side with a Jalali calendar.",
      ),
    },
    {
      q: tr("چطور برنامه ریزی روزانه کنیم؟", "How do I plan my day?"),
      a: tr(
        "شب قبل یا صبح زود سه چیز را مشخص کن: کارهای ثابت روز، یک تا سه کار مهم و زمان‌هایی که خالی می‌گذاری. فهرست را کوتاه نگه دار و کارهایی را که ساعت مشخص ندارند بدون ساعت ثبت کن. آخر روز نگاه کن چه چیزی انجام نشد و آن را به روز دیگری ببر.",
        "The night before or early in the morning, settle three things: the fixed tasks of the day, one to three important tasks and the gaps you leave free. Keep the list short and record tasks without a set time as time-free. At the end of the day, see what did not get done and move it to another day.",
      ),
    },
    {
      q: tr("برنامه ریزی روزانه را شب قبل انجام بدهم یا صبح؟", "Should I plan my day the night before or in the morning?"),
      a: tr(
        "هر دو جواب می‌دهد و مهم این است که یک زمان ثابت داشته باشی. برنامه‌ریزی شب قبل صبح را از تصمیم‌گیری آزاد می‌کند، در حالی که برنامه‌ریزی صبح اطلاعات تازه‌تری از وضعیت همان روز دارد. اگر مطمئن نیستی، یک هفته هر دو را امتحان کن.",
        "Both work, and what matters is a fixed time. Planning the night before frees your morning from decisions, while morning planning has fresher information about that day. If you are unsure, try each for a week.",
      ),
    },
    {
      q: tr("برنامه ریزی روزانه رایگان در اپ ممکن است؟", "Can I plan my day for free in the app?"),
      a: tr(
        "هر حساب تازه 14 روز دوره‌ی آزمایشی رایگان «روتین من» دارد که برنامه‌ی روزانه و هفتگی را هم شامل می‌شود. بعد از آن برای ادامه یک پلن پولی لازم است؛ خواندن تاریخچه‌ی قبلی رایگان می‌ماند.",
        "Every new account gets a free 14-day trial of “My Routine”, which includes the daily and weekly plan. After that a paid plan is needed to continue; reading your earlier history stays free.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("روتین روزانه", "Daily routine"), path: "/routine" },
    { name: tr("برنامه‌ریزی روزانه", "Daily planning"), path: "/daily-planner" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function DailyPlannerPage() {
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
          `برنامه‌ریزی روزانه با ${BRAND_FA}؛ کارهای امروزت در یک صفحه`,
          `Daily planning with ${brand}: today's tasks on one page`,
        )}
        lead={tr(
          `${BRAND_FA} روتین تکرارشونده و کارهای مخصوص همان روز را کنار هم نشان می‌دهد، ` +
            `با تقویم شمسی و هفته‌ای که از شنبه شروع می‌شود. این صفحه توضیح می‌دهد یک برنامه‌ی روزانه‌ی ` +
            `قابل‌اجرا چه شکلی است و در آریون چطور ساخته می‌شود.`,
          `${brand} shows your recurring routine and the tasks for that day side by side, with a Jalali calendar and a week that starts on Saturday. This page explains what a workable daily plan looks like and how it is built in ${brand}.`,
        )}
        sections={[
          {
            title: tr("یک برنامه‌ی روزانه‌ی واقع‌بینانه چه شکلی است؟", "What does a realistic daily plan look like?"),
            paragraphs: [
              tr(
                "بیشتر برنامه‌های روزانه به این دلیل شکست می‌خورند که برای یک روز ایده‌آل نوشته شده‌اند، نه یک روز واقعی. روزی که هیچ اتفاق غیرمنتظره‌ای در آن نیست، معمولا وجود ندارد.",
                "Most daily plans fail because they are written for an ideal day, not a real one. A day with no unexpected events usually doesn't exist.",
              ),
              tr(
                "برنامه‌ی قابل‌اجرا معمولا چند کار مشخص و مهم دارد، نه پانزده مورد؛ برای کارهای بدون زمان دقیق جای جدا می‌گذارد؛ و فضایی خالی برای چیزهای پیش‌بینی‌نشده باقی می‌گذارد.",
                "A workable plan usually has a few clear, important tasks rather than fifteen; it gives tasks without an exact time their own space; and it leaves some room for things nobody predicted.",
              ),
            ],
          },
          {
            title: tr(`برنامه‌ی روزانه در ${BRAND_FA}`, `Daily planning in ${brand}`),
            bullets: [
              {
                title: tr("کارهای امروز، یک‌جا", "Today's tasks, in one place"),
                body: tr("روتین تکرارشونده و کارهای همان روز در یک فهرست واحد نشان داده می‌شوند، نه دو جای جدا.", "Your recurring routine and that day's tasks appear in a single list, not in two separate places."),
              },
              {
                title: tr("کار با ساعت و بدون ساعت", "Tasks with and without a time"),
                body: tr("کارهایی که ساعت دارند مرتب می‌شوند و بقیه جدا نگه داشته می‌شوند تا فهرست شلوغ نشود.", "Tasks with a time are sorted, and the rest are kept apart so the list doesn't get crowded."),
              },
              {
                title: tr("پیشرفت امروز", "Today's progress"),
                body: tr("درصد کارهای انجام‌شده‌ی همان روز را می‌بینی.", "You see the percentage of that day's tasks you've completed."),
              },
              {
                title: tr("یادآوری", "Reminders"),
                body: tr("برای کارهایی مثل مصرف دارو که فراموش‌شدنشان هزینه دارد.", "For tasks such as taking medicine, where forgetting has a cost."),
              },
              {
                title: tr("نمای هفتگی", "Weekly view"),
                body: tr("می‌توانی از روز به هفته بروی و ببینی بار کاری‌ات در طول هفته چطور پخش شده.", "You can go from the day view to the week view and see how your workload is spread across the week."),
              },
            ],
          },
          {
            title: tr("چند نکته برای برنامه‌ریزی بهتر", "A few tips for better planning"),
            bullets: [
              {
                title: tr("شب قبل بنویس", "Write it the night before"),
                body: tr("نوشتن برنامه در پایان روز قبل، صبح را از تصمیم‌گیری خالی می‌کند.", "Writing the plan at the end of the previous day clears the morning of decisions."),
              },
              {
                title: tr("سه کار مهم را مشخص کن", "Pick three important tasks"),
                body: tr("اگر فقط همان سه‌تا انجام شوند، روز موفق حساب می‌شود. بقیه اضافه‌اند.", "If just those three get done, the day counts as a success. The rest is extra."),
              },
              {
                title: tr("کارهای مشابه را کنار هم بگذار", "Group similar tasks together"),
                body: tr("جابه‌جاشدن مدام بین نوع‌های مختلف کار، بیشترین وقت را هدر می‌دهد.", "Constantly switching between different types of work wastes the most time."),
              },
              {
                title: tr("آخر روز مرور کن", "Review at the end of the day"),
                body: tr("کاری که انجام نشد یا باید به روز دیگری منتقل شود یا حذف — نه اینکه بی‌صدا در فهرست بماند.", "A task you didn't finish should either move to another day or be removed, not quietly stay on the list."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره برنامه‌ریزی روزانه", "Frequently asked questions about daily planning")}
        related={[
          {
            href: "/routine",
            label: tr("روتین روزانه در آریون", `Daily routine in ${brand}`),
            note: tr("چطور کارهای تکرارشونده را یک‌بار بسازیم و هر هفته استفاده کنیم.", "How to build recurring tasks once and use them every week."),
          },
          {
            href: "/habit-tracker",
            label: tr("مدیریت عادت‌ها در آریون", `Habit management in ${brand}`),
            note: tr("پیگیری عادت‌های روزانه و نگه‌داشتن زنجیره.", "Track daily habits and keep your streak going."),
          },
          {
            href: "/blog/daily-planning-guide",
            label: tr("راهنمای برنامه‌ریزی روزانه", "Daily planning guide"),
            note: tr("مقاله‌ی کامل درباره‌ی چیدن یک برنامه‌ی روزانه‌ی قابل‌اجرا.", "A full article on putting together a workable daily plan."),
          },
          {
            href: "/ai-planner",
            label: tr("برنامه‌ریز هوشمند آریون", `${brand} smart planner`),
            note: tr("پیشنهاد برنامه‌ریزی روزانه با کمک هوش‌مصنوعی.", "Daily planning suggestions with the help of AI."),
          },
        ]}
      />
    </>
  );
}
