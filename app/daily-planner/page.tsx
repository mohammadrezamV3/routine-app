import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `برنامه‌ریزی روزانه و مدیریت کارها با تقویم شمسی | ${BRAND_FA}`,
      `Daily planner and task management with a Jalali calendar | ${brand}`,
    ),
    description: tr(
      `برنامه‌ی روزانه‌ات را در ${BRAND_FA} بچین: کارهای امروز، کارهای بدون ساعت، ` +
        `یادآوری و تقویم شمسی — بدون شلوغی و در یک صفحه.`,
      `Plan your day in ${brand}: today's tasks, tasks without a time, reminders and a Jalali calendar, uncluttered and on one page.`,
    ),
    path: "/daily-planner",
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
