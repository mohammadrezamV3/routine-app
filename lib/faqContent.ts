// سوال‌وجواب‌های واقعی صفحه‌ی /faq — یک منبع واحد. هم app/faq/page.tsx و
// هم app/llms-full.txt/route.ts (برای ChatGPT/Claude/Perplexity و…) از
// همین آرایه می‌خونن، تا این دو هیچ‌وقت از هم واگرا نشن. (این آرایه قبلا
// مستقیم export یک page.tsx بود، ولی Next.js فقط export های خاصی رو از
// یک فایل page.tsx قبول می‌کنه — پس به یک ماژول lib جدا منتقل شد.)
import { isEn } from "./i18n";

export const FAQS: { q: string; a: string }[] = [
  {
    q: "آریون چیست؟",
    a: "آریون یک اپ فارسی برای مدیریت زندگی روزمره است: برنامه‌ی هفتگی و پیگیری کارها، برنامه‌ی ورزشی و کالری‌شماری، و ژورنال معاملات ترید — همه در یک حساب کاربری، بدون نیاز به چند اپ جدا. رودمپ یادگیری با هوش‌مصنوعی هم در حال تکمیل و به‌زودی برای عموم است.",
  },
  {
    q: "آریون با اپ‌های تک‌منظوره (فقط ورزش یا فقط ترید) چه فرقی دارد؟",
    a: "به‌جای نصب چند اپ جدا برای هرکدوم از این بخش‌ها، آریون همه‌شون رو زیر یک حساب کاربری کنار هم می‌ذاره. اینکه کدوم انتخاب برای شما بهتره به نیاز خودتون بستگی داره — اگه فقط یک بخش (مثلا فقط ترید) لازم دارید، شاید یک اپ تخصصی همون بخش مناسب‌تر باشه.",
  },
  {
    q: "آیا استفاده از آریون رایگان است؟",
    a: "«روتین من» (روتین و کارهای روزانه) 14 روز رایگانه و بعدش با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کنه؛ دستیار هوشمند «نومو» 10 پیام رایگان داره و توی پلن‌های پولی نامحدوده. بخش‌های ورزش/کالری، ترید، رودمپ و تحلیل هوشمند اشتراکی‌اند و هر حساب تازه 3 روز دسترسی به بدنسازی، کالری‌شمار و ژورنال ترید، با استفاده‌ی محدود از هوش مصنوعی می‌گیره.",
  },
  {
    q: "آریون برای چه کسانی مناسب است؟",
    a: "برای کسی که می‌خواد روتین روزانه، ورزش، تغذیه یا معاملات ترید خودش رو در یک‌جا پیگیری کنه، بدون جابه‌جا شدن بین چند اپ مختلف.",
  },
  {
    q: "آیا اطلاعات من در آریون امن است؟",
    a: "رمز عبور با bcrypt هش می‌شه، نشست ورود با JWT امضاشده مدیریت می‌شه، و ارتباط با سایت روی HTTPS رمزنگاری‌شده است. اطلاعات هر کاربر فقط برای خودش قابل مشاهده‌ست.",
  },
  {
    q: "چطور در آریون ثبت‌نام کنم؟",
    a: "از صفحه‌ی ثبت‌نام با شماره‌موبایل یا حساب گوگل می‌تونید یک حساب رایگان بسازید و بلافاصله از بخش‌های پایه (روتین، کارها) استفاده کنید.",
  },
  {
    q: "آریون تقویم شمسی دارد؟",
    a: "بله. برنامه‌ی روزانه و هفتگی و ژورنال ترید همگی با تقویم شمسی (جلالی) کار می‌کنند. در بخش ترید می‌توانید بین تقویم شمسی و میلادی جابه‌جا شوید، چون بعضی معامله‌گرها گزارش‌هایشان را میلادی نگه می‌دارند.",
  },
  {
    q: "چطور یک روتین روزانه بسازم که نصفه‌کاره رها نشود؟",
    a: "با کم شروع کنید: دو یا سه کار کوچک و مشخص برای هر روز، نه یک لیست بلند. در آریون کارهای هفتگی را یک‌بار تعریف می‌کنید و هر روز فقط تیک می‌زنید؛ استریک و درصد پیشرفت هم نشان می‌دهد چند روز پشت‌سرهم پایبند بوده‌اید. همین دیدن پیوستگی معمولا بیشتر از خود لیست کمک می‌کند.",
  },
  {
    q: "ژورنال ترید چیست و چرا لازم است؟",
    a: "ژورنال ترید یعنی ثبت منظم هر معامله: نماد، جهت، قیمت ورود و خروج، حجم، سود یا زیان، و دلیل تصمیم. بدون آن، الگوهای تکرارشونده‌ی اشتباه دیده نمی‌شوند. آریون علاوه بر ثبت معاملات، آمار برد و باخت و یک چک‌لیست پیش از ورود دارد تا قبل از باز کردن پوزیشن شرایط خودتان را مرور کنید.",
  },
  {
    q: "برنامه‌ی بدنسازی آریون چطور ساخته می‌شود؟",
    a: "بر اساس هدف (کاهش وزن، افزایش حجم، تناسب عمومی)، تعداد روزهای تمرین در هفته و سطح تجربه، یک برنامه‌ی تفکیک‌شده ساخته می‌شود. تمرین‌ها، ست‌ها و تکرارها مشخص‌اند و می‌توانید وزن و اندازه‌های بدن را در طول زمان ثبت کنید تا روند را ببینید. این برنامه جایگزین مربی یا توصیه‌ی پزشکی نیست.",
  },
  {
    q: "کالری‌شماری آریون با غذای ایرانی کار می‌کند؟",
    a: "بله. پایگاه غذایی آریون شامل غذاهای رایج ایرانی است، و نیاز روزانه‌ی کالری بر اساس قد، وزن، سن، جنسیت و سطح فعالیت محاسبه می‌شود. می‌توانید وعده‌های روز را ثبت کنید و باقی‌مانده‌ی کالری روزتان را ببینید.",
  },
  {
    q: "رودمپ یادگیری آریون چه کار می‌کند؟",
    a: "موضوعی که می‌خواهید یاد بگیرید وارد می‌شود و آریون با کمک هوش مصنوعی یک مسیر گام‌به‌گام می‌سازد: از چه چیزی شروع کنید، بعدش چه، و هر مرحله تقریبا چقدر طول می‌کشد. این بخش هنوز در حال تکمیل است و به‌زودی برای عموم کاربران باز می‌شود.",
  },
  {
    q: "آریون روی گوشی نصب می‌شود؟",
    a: "آریون یک وب‌اپ است و نیازی به نصب از فروشگاه ندارد. کافی است سایت را در مرورگر گوشی باز کنید و از منوی مرورگر گزینه‌ی «افزودن به صفحه‌ی اصلی» را بزنید؛ بعد از آن مثل یک اپ معمولی با آیکون خودش باز می‌شود و تمام‌صفحه اجرا می‌شود.",
  },
  {
    q: "اگر اینترنتم قطع شود اطلاعاتم از بین می‌رود؟",
    a: "خیر. اطلاعات حساب شما روی سرور ذخیره می‌شود و با ورود مجدد از هر دستگاهی در دسترس است. بنابراین با عوض‌کردن گوشی یا کامپیوتر هم چیزی از دست نمی‌رود.",
  },
  {
    q: "چطور اشتراکم را لغو کنم؟",
    a: "اشتراک آریون تمدید خودکار ندارد؛ در پایان دوره‌ای که خریده‌اید به‌صورت خودکار متوقف می‌شود و مبلغی دوباره کسر نمی‌شود. اگر سوالی درباره‌ی صورتحساب دارید از راه‌های تماس (ایمیل یا تلگرام پشتیبانی) در ارتباط باشید.",
  },
];

// نسخه‌ی انگلیسی (همان ترتیب FAQS)
const FAQS_EN: { q: string; a: string }[] = [
  {
    q: "What is Arion?",
    a: "Arion is an app for managing everyday life: a weekly plan with task tracking, a workout plan with calorie counting, and a trading journal, all in one account so you do not need several separate apps. An AI learning roadmap is also being finished and will open to everyone soon.",
  },
  {
    q: "How is Arion different from single-purpose apps (only workouts or only trading)?",
    a: "Instead of installing a separate app for each of these areas, Arion puts them all side by side under one account. Which choice is better depends on your needs. If you only need one area (say, only trading), a dedicated app for it might suit you better.",
  },
  {
    q: "Is Arion free to use?",
    a: "My Routine (routine and daily tasks) is free for 14 days, then continues with the My Routine plan ({{routine_monthly}}). The smart assistant Nomo gets 10 free messages and is unlimited on paid plans. Workout/calories, trading, roadmap and smart insight are subscription features, and every new account gets 3 days of access to workouts, the calorie counter and the trading journal, with limited AI use.",
  },
  {
    q: "Who is Arion for?",
    a: "For anyone who wants to track their daily routine, workouts, nutrition or trading in one place, without switching between several different apps.",
  },
  {
    q: "Is my data safe in Arion?",
    a: "Passwords are hashed with bcrypt, login sessions are managed with signed JWTs, and the connection to the site is encrypted over HTTPS. Each user's data is visible only to that user.",
  },
  {
    q: "How do I sign up for Arion?",
    a: "On the sign-up page you can create a free account with your mobile number or a Google account and start using the basic parts (routine, tasks) right away.",
  },
  {
    q: "Does Arion have a Jalali calendar?",
    a: "Yes. The daily and weekly plans and the trading journal all work with the Jalali (Persian) calendar. In the trading section you can switch between the Jalali and Gregorian calendars, because some traders keep their reports in Gregorian dates.",
  },
  {
    q: "How do I build a daily routine that I will not abandon halfway?",
    a: "Start small: two or three small, specific tasks per day, not a long list. In Arion you define your weekly tasks once and just tick them off each day; the streak and progress percentage show how many days in a row you have stuck with it. Seeing that continuity usually helps more than the list itself.",
  },
  {
    q: "What is a trading journal and why do I need one?",
    a: "A trading journal means logging every trade regularly: symbol, direction, entry and exit price, size, profit or loss, and the reason for the decision. Without it, repeating mistakes go unnoticed. Besides logging trades, Arion has win/loss statistics and a pre-entry checklist so you can review your conditions before opening a position.",
  },
  {
    q: "How is Arion's workout plan built?",
    a: "A split plan is built from your goal (weight loss, muscle gain, general fitness), the number of training days per week and your experience level. Exercises, sets and reps are specified, and you can log your weight and body measurements over time to see the trend. This plan is not a substitute for a coach or medical advice.",
  },
  {
    q: "Does Arion's calorie counter work with Iranian food?",
    a: "Yes. Arion's food database includes common Iranian dishes, and your daily calorie need is calculated from height, weight, age, gender and activity level. You can log your meals and see how many calories you have left for the day.",
  },
  {
    q: "What does Arion's learning roadmap do?",
    a: "You enter a topic you want to learn and Arion uses AI to build a step-by-step path: where to start, what comes next, and roughly how long each stage takes. This feature is still being finished and will open to all users soon.",
  },
  {
    q: "Can I install Arion on my phone?",
    a: "Arion is a web app and needs no app store installation. Just open the site in your phone browser and choose Add to Home Screen from the browser menu; after that it opens like a normal app with its own icon and runs full screen.",
  },
  {
    q: "Will I lose my data if my internet goes down?",
    a: "No. Your account data is stored on the server and is available from any device when you sign in again. So even if you switch phones or computers, nothing is lost.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Arion subscriptions do not renew automatically; they stop on their own at the end of the period you bought and no further charge is made. If you have a billing question, get in touch through the contact options (email or Telegram support).",
  },
];

export function getFaqs(): { q: string; a: string }[] {
  return isEn() ? FAQS_EN : FAQS;
}
