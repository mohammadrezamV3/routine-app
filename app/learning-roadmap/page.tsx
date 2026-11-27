import type { Metadata } from "next";
import { SeoLanding, type SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `رودمپ یادگیری با هوش مصنوعی | نقشه راه یادگیری مهارت | ${BRAND_FA}`,
      `AI learning roadmap | Skill learning path planner | ${brand}`,
    ),
    description: tr(
      `رودمپ یادگیری ${BRAND_FA} با دو سوال ساده (چه می‌خواهی یاد بگیری و برای چه هدفی) یک نقشه راه مرحله به مرحله با هوش مصنوعی می‌سازد. فعلا در حال تکمیل است.`,
      `The ${brand} learning roadmap builds a step-by-step learning path with AI from two simple questions: what you want to learn and why. Still being completed, and coming to everyone soon.`,
    ),
    path: "/learning-roadmap",
    keywords: tr(
      "رودمپ یادگیری|نقشه راه یادگیری|رودمپ|رودمپ با هوش مصنوعی|رودمپ چیست|چطور رودمپ بسازیم|نقشه راه مهارت|برنامه یادگیری|رودمپ آموزشی|ساخت رودمپ|رودمپ شخصی|مسیر یادگیری|برنامه ریزی یادگیری|یادگیری با هوش مصنوعی|رود مپ|رودمپ برنامه نویسی",
      "learning roadmap|AI learning roadmap|learning path planner|skill roadmap|roadmap generator|study roadmap|personalised learning path|how to learn a new skill",
    ).split("|"),
    ownOgImage: true,
    ogTitle: tr(`رودمپ یادگیری با هوش مصنوعی | ${BRAND_FA}`, `AI learning roadmap | ${brand}`),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("رودمپ یادگیری چیست؟", "What is a learning roadmap?"),
      a: tr(
        "نقشه‌ی راهی است که یادگیری یک مهارت را به مراحل مشخص و ترتیب‌دار تقسیم می‌کند — چه چیزی را اول یاد بگیری، چه منابعی مناسب‌اند و چه ابزارهایی لازم داری، به‌جای اینکه خودت از صفر بین صدها منبع پراکنده انتخاب کنی.",
        "It is a map that breaks learning a skill into clear, ordered steps: what to learn first, which resources suit you and which tools you need, so you don't have to pick from hundreds of scattered sources from scratch.",
      ),
    },
    {
      q: tr(`رودمپ در ${BRAND_FA} چطور ساخته می‌شود؟`, `How is a roadmap built in ${brand}?`),
      a: tr(
        "با دو سوال: چه چیزی می‌خواهی یاد بگیری، و برای چه هدفی (مثلا استخدام، ارتقا شغلی، یک پروژه‌ی شخصی یا صرفا علاقه). هوش مصنوعی بر اساس همین دو جواب، مسیر را به مراحل، منابع و ابزار پیشنهادی می‌شکند.",
        "With two questions: what you want to learn, and why (for example getting hired, a career step up, a personal project or simply interest). Based on these two answers, the AI breaks the path into steps, resources and suggested tools.",
      ),
    },
    {
      q: tr("چرا فقط دو سوال پرسیده می‌شود؟", "Why are only two questions asked?"),
      a: tr(
        "نسخه‌های قبلی هفت مرحله می‌پرسیدند (سطح، ددلاین، بودجه، سبک یادگیری و…) که بیشترشان حدسی بودند و مسیر نهایی را واقعا عوض نمی‌کردند. آنچه مسیر را از ریشه تغییر می‌دهد همان «چی» و «برای چی» است؛ بقیه را مدل از دل همین دو جواب استنتاج می‌کند.",
        "Earlier versions asked seven steps (level, deadline, budget, learning style and so on). Most of those were guesses and didn't really change the final path. What fundamentally changes the path is the “what” and the “why”; the model infers the rest from these two answers.",
      ),
    },
    {
      q: tr("الان می‌شود از رودمپ یادگیری استفاده کرد؟", "Can I use the learning roadmap now?"),
      a: tr(
        "این بخش فعلا در مرحله‌ی تکمیل است و فقط برای تیم داخلی فعال است — هنوز برای همه‌ی کاربران باز نشده. به‌زودی برای همه در دسترس قرار می‌گیرد.",
        "This section is still being completed and is only active for the internal team. It isn't open to all users yet. It will be available to everyone soon.",
      ),
    },
    {
      q: tr("چرا این صفحه الان منتشر شده اگر ابزار هنوز باز نیست؟", "Why is this page live if the tool isn't open yet?"),
      a: tr(
        "چون توضیح‌دادن اینکه این قابلیت چیست و چه زمانی می‌آید، از خالی‌گذاشتن سوال کاربر بهتر است. وقتی رودمپ یادگیری برای همه باز شود، همین صفحه به‌روزرسانی می‌شود.",
        "Because explaining what this feature is and when it's coming is better than leaving the user's question unanswered. When the learning roadmap opens to everyone, this page will be updated.",
      ),
    },
    {
      q: tr("چطور برای یادگیری یک مهارت رودمپ بسازیم؟", "How do I build a roadmap for learning a skill?"),
      a: tr(
        "اول هدفت را روشن کن (استخدام، پروژه‌ی شخصی یا علاقه)، بعد مهارت را به مرحله‌های کوچک و ترتیب‌دار بشکن: مفاهیم پایه، تمرین کوچک، پروژه‌ی عملی و مرور. برای هر مرحله یک یا دو منبع انتخاب کن، نه ده‌ها منبع. رودمپ آریون همین کار را از روی دو سوال ساده با هوش مصنوعی پیشنهاد می‌دهد، ولی این بخش هنوز در حال تکمیل است.",
        "First clarify your goal (getting hired, a personal project or interest), then break the skill into small ordered steps: basic concepts, a small exercise, a practical project and review. Pick one or two resources per step, not dozens. Arion's roadmap proposes this from two simple questions using AI, but this section is still being completed.",
      ),
    },
    {
      q: tr("رودمپ یادگیری برنامه نویسی از کجا شروع می‌شود؟", "Where does a programming learning roadmap start?"),
      a: tr(
        "معمولا از انتخاب یک زبان و هدف مشخص (وب، داده، موبایل)، یادگیری مفاهیم پایه مثل متغیر و شرط و حلقه و بعد ساختن پروژه‌های کوچک. ترتیب دقیق به هدف تو بستگی دارد، و دلیل اینکه رودمپ بر اساس هدف ساخته می‌شود همین است.",
        "Usually from choosing one language and a clear goal (web, data, mobile), learning basics like variables, conditions and loops, and then building small projects. The exact order depends on your goal, which is why a roadmap is built around your goal.",
      ),
    },
    {
      q: tr("تفاوت رودمپ و برنامه درسی چیست؟", "What is the difference between a roadmap and a study plan?"),
      a: tr(
        "رودمپ مسیر کلی و ترتیب مراحل را نشان می‌دهد (چه چیزی بعد از چه چیزی)، ولی برنامه‌ی درسی زمان‌بندی روزانه و هفتگی است. این دو مکمل‌اند: رودمپ می‌گوید چه چیزی را یاد بگیر و برنامه‌ی روزانه می‌گوید کی.",
        "A roadmap shows the overall path and order of steps (what comes after what), while a study plan is the daily and weekly timing. They complement each other: the roadmap says what to learn and the daily plan says when.",
      ),
    },
    {
      q: tr("آیا ساخت رودمپ با هوش مصنوعی رایگان است؟", "Is building an AI roadmap free?"),
      a: tr(
        "این بخش فعلا فقط برای تیم داخلی فعال است و هنوز برای همه باز نشده، پس هنوز قیمت یا سهمیه‌ی عمومی‌ای برایش اعلام نشده. هر وقت باز شود، همین صفحه به‌روز می‌شود.",
        "This section is currently only active for the internal team and is not open to everyone yet, so no public price or quota has been announced. This page will be updated when it opens.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("رودمپ یادگیری", "Learning roadmap"), path: "/learning-roadmap" },
  ];
  return { faqs, breadcrumb, brand };
}

export default function LearningRoadmapPage() {
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
          `رودمپ یادگیری با هوش مصنوعی — ${BRAND_FA} (به‌زودی برای همه)`,
          `AI learning roadmap — ${brand} (coming to everyone soon)`,
        )}
        lead={tr(
          `${BRAND_FA} قرار است با دو سوال ساده — چی می‌خواهی یاد بگیری و برای چه هدفی — ` +
            `یک نقشه‌ی راه یادگیری با هوش مصنوعی بسازد. این بخش هنوز در حال تکمیل است و فعلا فقط برای تیم ` +
            `داخلی فعال است؛ این صفحه توضیح می‌دهد قرار است چطور کار کند و کی برای همه باز می‌شود.`,
          `${brand} will build a learning roadmap with AI from two simple questions: what you want to learn and why. This section is still being completed and is only active for the internal team for now. This page explains how it is meant to work and when it opens to everyone.`,
        )}
        ctaNote={tr("برای اطلاع از باز شدن این بخش، حساب رایگان بساز", "Create a free account to be told when this opens")}
        sections={[
          {
            title: tr("رودمپ یادگیری یعنی چه؟", "What does a learning roadmap mean?"),
            paragraphs: [
              tr(
                "وقتی می‌خواهی یک مهارت تازه یاد بگیری — یک زبان برنامه‌نویسی، یک ابزار، یک حوزه‌ی کاری تازه — بزرگ‌ترین مانع معمولا خود یادگیری نیست، انتخاب مسیر است: از کجا شروع کنم، چه ترتیبی درست است، کدام منبع واقعا به‌درد می‌خورد.",
                "When you want to learn a new skill, such as a programming language, a tool or a new field of work, the biggest obstacle is usually not the learning itself but choosing a path: where to start, what order makes sense, and which resource is actually useful.",
              ),
              tr(
                "یک رودمپ خوب این تصمیم‌ها را از قبل می‌گیرد: مراحل را به ترتیب می‌چیند، برای هر مرحله منبع و ابزار پیشنهاد می‌دهد، و مشخص می‌کند هر بخش چه‌قدر طول می‌کشد.",
                "A good roadmap makes these decisions in advance: it puts the steps in order, suggests resources and tools for each step, and makes clear how long each part takes.",
              ),
            ],
          },
          {
            title: tr("طراحی رودمپ: فقط دو سوال", "Designing the roadmap: just two questions"),
            paragraphs: [
              tr(
                "بیشتر ابزارهای مشابه با یک فرم طولانی شروع می‌شوند: سطح فعلی، ددلاین، بودجه، سبک یادگیری، زبان منابع. تجربه نشان داده بیشتر این جواب‌ها حدسی‌اند و مسیر نهایی را واقعا تغییر نمی‌دهند — فقط فاصله‌ی بین کاربر و جوابش را طولانی‌تر می‌کنند.",
                "Most similar tools start with a long form: current level, deadline, budget, learning style, resource language. Experience shows that most of these answers are guesses and don't really change the final path. They just make the distance between the user and their answer longer.",
              ),
              tr(
                "دو چیزی که واقعا مسیر را از ریشه عوض می‌کنند این‌هایند: چه چیزی می‌خواهی یاد بگیری، و برای چه هدفی (استخدام، ارتقا شغلی، یک پروژه‌ی شخصی، مدرک، یا صرفا کنجکاوی). بقیه‌ی جزئیات را هوش مصنوعی از دل همین دو جواب می‌سازد.",
                "The two things that really change the path at its root are: what you want to learn, and why (getting hired, a career step up, a personal project, a certificate, or simply curiosity). The AI builds the remaining details from these two answers.",
              ),
            ],
          },
          {
            title: tr("وضعیت فعلی این بخش", "Current status of this section"),
            bullets: [
              {
                title: tr("در حال تکمیل", "Being completed"),
                body: tr("رودمپ یادگیری در حال حاضر فقط برای تیم داخلی آریون فعال است و هنوز برای کاربران عمومی باز نشده.", `The learning roadmap is currently only active for the internal ${brand} team and isn't open to general users yet.`),
              },
              {
                title: tr("به‌زودی برای همه", "Coming to everyone soon"),
                body: tr("هدف این است که این بخش به‌زودی به بقیه‌ی ماژول‌های اشتراکی (مثل تمرین، تغذیه و ترید) اضافه شود.", "The goal is for this section to join the other subscription modules (such as workouts, nutrition and trading) soon."),
              },
              {
                title: tr("چرا الان نه", "Why not now"),
                body: tr("قبل از باز شدن برای همه، کیفیت مسیرهای تولیدشده و مرور مراحل باید کامل تست شود — تا رودمپی که به کاربر داده می‌شود واقعا قابل‌اتکا باشد.", "Before it opens to everyone, the quality of the generated paths and the review of the steps need full testing, so the roadmap given to a user is truly reliable."),
              },
            ],
          },
          {
            title: tr("چطور یک مسیر یادگیری خوب انتخاب کنیم (تا آن‌موقع)", "How to choose a good learning path (until then)"),
            bullets: [
              {
                title: tr("1. هدف را مشخص کن، نه فقط موضوع را", "1. Define the goal, not just the topic"),
                body: tr("«یادگیری پایتون» مبهم است؛ «یادگیری پایتون برای تحلیل داده در شغل فعلی» مسیر مشخصی می‌سازد.", "“Learning Python” is vague; “learning Python for data analysis in my current job” gives a clear path."),
              },
              {
                title: tr("2. با کمترین منبع ممکن شروع کن", "2. Start with as few resources as possible"),
                body: tr("جمع‌کردن ده منبع قبل از شروع، معمولا جای یادگیری واقعی را می‌گیرد.", "Gathering ten resources before you start usually takes the place of real learning."),
              },
              {
                title: tr("3. پروژه‌ی کوچک، نه فقط تئوری", "3. A small project, not just theory"),
                body: tr("یک پروژه‌ی واقعی هرچند کوچک، چیزهایی را نشان می‌دهد که هیچ آموزشی به‌تنهایی نشان نمی‌دهد.", "A real project, however small, shows things no course alone can show."),
              },
              {
                title: tr("4. مسیر را دوره‌ای مرور کن", "4. Review the path from time to time"),
                body: tr("بعد از هر چند هفته ببین آیا مسیر اولیه هنوز درست است یا باید تنظیم شود.", "After every few weeks, check whether the original path still makes sense or needs adjusting."),
              },
            ],
          },
        ]}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره رودمپ یادگیری", "Frequently asked questions about the learning roadmap")}
        related={[
          {
            href: "/ai-planner",
            label: tr("برنامه‌ریزی با هوش مصنوعی", "Planning with AI"),
            note: tr("دستیار هوشمند برنامه‌ی هفتگی و آنالیز هفتگی — همین حالا در دسترس.", "The smart assistant for your weekly plan and weekly review, available right now."),
          },
          {
            href: "/routine",
            label: tr("روتین آریون", `${brand} routine`),
            note: tr("روتین روزانه، برای وقتی که یادگیری را به یک برنامه‌ی مشخص تبدیل کردی.", "A daily routine, for when you've turned learning into a specific plan."),
          },
          {
            href: "/bodybuilding-program",
            label: tr("برنامه بدنسازی با هوش مصنوعی", "Workout plan with AI"),
            note: tr("همان اصل هوش مصنوعی شخصی‌سازی‌شده، برای برنامه‌ی تمرینی.", "The same personalised AI idea, applied to a training program."),
          },
          {
            href: "/blog",
            label: tr("مقاله‌های آریون", `${brand} articles`),
            note: tr("راهنماهای کاربردی درباره‌ی برنامه‌ریزی و یادگیری.", "Practical guides on planning and learning."),
          },
        ]}
      />
    </>
  );
}
