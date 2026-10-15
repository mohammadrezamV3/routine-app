// سؤالات متداول لندینگ — هم LandingFAQ (کلاینت) و هم JSON-LD صفحه‌ی اصلی
// (سرور، app/page.tsx) از همین فایل غیرکلاینتی می‌خونن.
import { isEn } from "./i18n";
import type { SectionKey } from "./sections";

export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: "آریون رایگان است؟", a: "شروع آریون رایگان است. «روتین من» برای هر حساب تازه 14 روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند. بدنسازی، کالری‌شمار و ژورنال ترید هم 3 روز با استفاده‌ی محدود از AI باز است. ثبت‌نام در کمتر از یک دقیقه انجام می‌شود." },
  { q: "بعد از دوره‌ی آزمایشی چه می‌شود؟", a: "برای ادامه، پلنی متناسب با نیازت انتخاب می‌کنی. پلن «روتین من» روتین، برنامه هفتگی، خواب و کارها را پوشش می‌دهد؛ پلن‌های بدنسازی، ترید و مکس امکانات بیشتری اضافه می‌کنند و همه‌ی آن‌ها «روتین من» را هم شامل می‌شوند. قیمت‌ها در بخش پلن‌های همین صفحه آمده است." },
  { q: "اطلاعاتم امن است؟", a: "رمز عبور با bcrypt ذخیره می‌شود و اطلاعاتت فروخته نمی‌شود. چت‌ها سرتاسر رمزنگاری‌شده‌اند؛ متنشان را جز خودتان کسی نمی‌بیند." },
  { q: "روی گوشی نصب می‌شود (PWA)؟", a: "بله. آریون یک وب‌اپ PWA است؛ در مرورگر «افزودن به صفحه‌ی اصلی» را بزن تا مثل یک اپ با آیکون خودش باز شود و یادآوری‌ها را هم دریافت کنی." },
  { q: "متاتریدر چطور وصل می‌شود؟", a: "با یک کد اتصال و یک اکسپرت (EA) که روی حساب معاملاتی‌ات نصب می‌کنی. MT4 و MT5 پشتیبانی می‌شوند و معاملات بدون تکرار وارد ژورنال می‌شوند. رمز حساب معاملاتی هرگز خواسته یا ذخیره نمی‌شود." },
  { q: "مربی‌ها چطورند؟", a: "مربی‌ها باید هویتشان احراز شود و شرایط مربی‌گری را بپذیرند. می‌توانی مربی انتخاب کنی، برنامه بگیری، آن را تایید کنی یا درخواست تغییر بدهی و با مربی گفت‌وگو کنی. پیشرفتت از تیک‌های روتین خودت محاسبه می‌شود و رتبه‌بندی مربی‌ها بر پایه‌ی شایستگی است." },
  { q: "«نومو» چیست؟", a: "نومو مدیر برنامه هوشمند آریون است. به فارسی بنویس چه می‌خواهی تا برنامه‌های روتینت را بسازد، جابه‌جا یا حذف کند. بدون اشتراک 10 پیام رایگان داری و در پلن‌های پولی نامحدود است؛ برای استفاده باید وارد حساب شده باشی." },
  { q: "بدون اینترنت هم کار می‌کند؟", a: "آریون برای همگام‌سازی به اینترنت نیاز دارد. بدون اینترنت فقط صفحه‌ی آفلاین و بخش‌هایی که مرورگر ذخیره کرده در دسترس‌اند." },
];

const FAQ_ITEMS_EN: { q: string; a: string }[] = [
  { q: "Is Arion free?", a: "Getting started with Arion is free. My Routine is free for 14 days for every new account, then continues with the My Routine plan ({{routine_monthly}}). Workouts, the calorie counter and the trading journal are also open for 3 days with limited AI use. Sign-up takes less than a minute." },
  { q: "What happens after the trial?", a: "To continue, you pick a plan that fits your needs. The My Routine plan covers routine, weekly plan, sleep and tasks; the Workout, Trading and Max plans add more features, and all of them include My Routine. Prices are in the plans section of this page." },
  { q: "Is my data safe?", a: "Your password is stored with bcrypt and your data is never sold. Chats are end-to-end encrypted; nobody but you can see their text." },
  { q: "Can I install it on my phone (PWA)?", a: "Yes. Arion is a PWA web app; choose Add to Home Screen in your browser so it opens like an app with its own icon and you can receive reminders too." },
  { q: "How does MetaTrader connect?", a: "With a connection code and an Expert Advisor (EA) that you install on your trading account. MT4 and MT5 are supported and trades enter the journal without duplicates. Your trading account password is never requested or stored." },
  { q: "How do mentors work?", a: "Mentors must have their identity verified and accept the mentoring terms. You can choose a mentor, get a plan, approve it or ask for changes, and chat with your mentor. Your progress is calculated from your own routine ticks, and mentors are ranked on merit." },
  { q: "What is Nomo?", a: "Nomo is Arion's smart plan manager. Write in plain language what you want and it will create, move or delete your routine plans. You get 10 free messages without a subscription and it is unlimited on paid plans; you need to be signed in to use it." },
  { q: "Does it work offline?", a: "Arion needs the internet to sync. Offline, only the offline page and the parts your browser has cached are available." },
];

// ─── سؤالات متداول هر بخش (زیردامنه‌ها) ────────────────────────────────────
// همون سازوکار نشانه‌ی قیمت: {{routine_monthly}} با fillPriceCopy پر می‌شه.
// سؤال‌های عمومی (امنیت، PWA) از لیست اصلی گرفته می‌شن تا متنشون یک جا بمونه.
type Faq = { q: string; a: string };

const pick = (list: Faq[], ...idx: number[]): Faq[] => idx.map((i) => list[i]);

const SECTION_FAQ_FA: Record<SectionKey, Faq[]> = {
  routine: [
    { q: "روتین اپ آریون رایگان است؟", a: "ثبت‌نام رایگان است و «روتین من» برای هر حساب تازه 14 روز رایگان است؛ بعد از آن با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند. ثبت‌نام کمتر از یک دقیقه طول می‌کشد." },
    { q: "چطور برنامه ریزی روزانه و هفتگی بسازم؟", a: "کارهای هر روز را با ساعت، تگ و تکرار (هفتگی، یک روز یا دوره) اضافه می‌کنی و می‌توانی برنامه را به‌صورت لیست چندآیتمی هم بسازی. همان لحظه تیک می‌زنی و برنامه‌ها روی تقویم شمسی دیده می‌شوند؛ کل هفته را هم در یک نگاه داری." },
    { q: "پیگیری عادت و استریک چطور کار می‌کند؟", a: "هر روزی که همه‌ی برنامه‌هایت را انجام بدهی به زنجیره‌ی روزهای کامل اضافه می‌شود. استریک 8 سطح از 1 تا 365 روز دارد، پیشرفت دوستانت را هم می‌بینی و آنالیز هفتگی نشان می‌دهد کجا جلو رفته‌ای." },
    { q: "ردیابی خواب هم دارد؟", a: "بله. هر شب ساعت خواب و بیداری را ثبت می‌کنی و امتیاز خواب، هدف خواب، چرخه‌های خواب و روند هفتگی را می‌بینی. ردیابی خواب جزو پلن «روتین من» است." },
    { q: "رودمپ یادگیری چیست؟", a: "موضوع و سطحت را می‌گویی و هوش مصنوعی یک مسیر مرحله‌به‌مرحله با هدف، کارهای عملی و منابع می‌سازد. کارهای هر مرحله را تیک می‌زنی و پیشرفت کل مسیر را می‌بینی." },
    ...pick(FAQ_ITEMS, 6, 3, 2),
  ],
  workout: [
    { q: "برنامه ورزشی آریون رایگان است؟", a: "ثبت‌نام رایگان است. بدنسازی و کالری‌شمار برای هر حساب تازه 3 روز با استفاده‌ی محدود از هوش مصنوعی باز است و بعد از آن با پلن بدنسازی یا مکس ادامه پیدا می‌کند. «روتین من» (روتین روزانه و خواب) هم 14 روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند." },
    { q: "چطور برنامه بدنسازی با هوش مصنوعی بسازم؟", a: "قد و وزن، هدفت (قدرت، حجم، کات یا استقامت)، امکاناتت (باشگاه یا خانه) و روزهای تمرینت را وارد می‌کنی و برنامه ساخته می‌شود. اگر بخواهی، برنامه را دستی هم می‌چینی." },
    { q: "برنامه ورزشی در خانه هم می‌سازد؟", a: "بله. امکاناتت را (باشگاه یا خانه) مشخص می‌کنی و حرکتی که تجهیزاتش را نداری با جایگزین مناسب عوض می‌شود. اگر محدودیت جسمی داشته باشی، حرکات پرفشار هم با معادل ملایم‌تر جایگزین می‌شوند." },
    { q: "هنگام تمرین چه امکاناتی دارم؟", a: "شروع تمرین با کرنومتر، ثبت ست به ست و کاتالوگ 149 حرکت با آموزش اجرا و سطح سختی. روزی را جا انداختی؟ «رد شدن» یا «ماندن» را خودت انتخاب می‌کنی." },
    { q: "کالری شمار آریون چه غذاهایی دارد؟", a: "264 خوراکی ایرانی و جهانی آماده است. هدف کالری و درشت‌مغذی‌هایت از قد، وزن، سن و هدفت محاسبه می‌شود، هر وعده را با گرم ثبت می‌کنی و نمودار هفتگی و ماهانه را می‌بینی." },
    { q: "مربی ورزش و تغذیه هم دارد؟", a: "بله. مربی‌ها باید هویتشان احراز شود و شرایط مربی‌گری را بپذیرند. می‌توانی مربی انتخاب کنی، برنامه بگیری، آن را تایید کنی یا درخواست تغییر بدهی و با مربی گفت‌وگو کنی؛ چت‌ها سرتاسر رمزنگاری‌شده‌اند." },
    ...pick(FAQ_ITEMS, 3, 2),
  ],
  trade: [
    { q: "ژورنال ترید آریون رایگان است؟", a: "ثبت‌نام رایگان است. ژورنال ترید برای هر حساب تازه 3 روز با استفاده‌ی محدود از هوش مصنوعی باز است و بعد از آن با پلن ترید یا مکس ادامه پیدا می‌کند." },
    { q: "ژورنال ترید چه چیزهایی را نشان می‌دهد؟", a: "هر حساب جدا: بالانس، سود و زیان، نرخ برد و هدف. چک‌لیست ورود که وضعیتش لحظه‌ی ثبت معامله ذخیره می‌شود، به‌علاوه‌ی یادداشت و برچسب. کارنامه‌ی روز، هفته یا ماه هر حساب را هم می‌توانی به‌صورت تصویر به اشتراک بگذاری." },
    FAQ_ITEMS[4],
    { q: "تقویم اقتصادی فارکس چه ارزهایی دارد؟", a: "رویدادهای 9 ارز اصلی با Actual، Forecast و Previous، فیلتر تاثیر و ارز و هشدار با نوتیفیکیشن برای خبرهایی که زیر نظر گرفته‌ای." },
    { q: "ساعت بازار فارکس چطور نشان داده می‌شود؟", a: "سشن‌های سیدنی، توکیو، فرانکفورت، لندن و نیویورک به وقت خودت و با ساعت تابستانی واقعی نشان داده می‌شوند، تا بدانی بازار کی باز است و کی شلوغ‌تر." },
    { q: "ماشین حساب ریسک دارد؟", a: "بله. حالت ساده با پیپ و حجم لات و حالت پیشرفته برای محاسبه‌ی ریسک و سود؛ نتیجه با دکمه‌ی «محاسبه» می‌آید و با تغییر ورودی دوباره باید محاسبه شود." },
    ...pick(FAQ_ITEMS, 2, 3),
  ],
};

const SECTION_FAQ_EN: Record<SectionKey, Faq[]> = {
  routine: [
    { q: "Is the Arion routine app free?", a: "Sign-up is free and My Routine is free for 14 days on every new account; after that it continues with the My Routine plan ({{routine_monthly}}). Sign-up takes less than a minute." },
    { q: "How do I build a daily and weekly plan?", a: "You add each day's tasks with a time, a tag and a repeat (weekly, one day or a period), and you can make a plan a multi-item list too. You tick tasks the moment you finish them, plans show on the Jalali calendar and you see the whole week at a glance." },
    { q: "How do habit tracking and streaks work?", a: "Every day you complete all your plans is added to your chain of full days. Streaks have 8 levels from 1 to 365 days, you can see your friends' progress and the weekly review shows where you moved ahead." },
    { q: "Does it track sleep too?", a: "Yes. You log your sleep and wake times each night and see your sleep score, sleep goal, sleep cycles and weekly trend. Sleep tracking is part of the My Routine plan." },
    { q: "What is the learning roadmap?", a: "You tell it your topic and level and AI builds a stage-by-stage path with goals, practical tasks and resources. You tick off each stage's tasks and see the progress of the whole path." },
    ...pick(FAQ_ITEMS_EN, 6, 3, 2),
  ],
  workout: [
    { q: "Is the Arion workout plan free?", a: "Sign-up is free. Workouts and the calorie counter are open for 3 days on every new account with limited AI use, then continue with the Workout or Max plan. My Routine (daily routine and sleep) is free for 14 days and then continues with the My Routine plan ({{routine_monthly}})." },
    { q: "How do I build a bodybuilding plan with AI?", a: "You enter your height and weight, your goal (strength, muscle gain, cutting or endurance), your equipment (gym or home) and your training days, and the plan is built. You can also arrange a plan by hand." },
    { q: "Can it build a home workout plan?", a: "Yes. You choose your equipment (gym or home) and any exercise you lack the equipment for is replaced with a suitable alternative. If you have a physical limitation, high-stress exercises are replaced with gentler ones too." },
    { q: "What do I get during a workout?", a: "Start a workout with a timer, log set by set, and use a catalogue of 149 exercises with tutorials and difficulty levels. Missed a day? You choose Skip or Stay yourself." },
    { q: "Which foods does the calorie counter have?", a: "264 Iranian and international foods are ready. Your calorie and macro goals are calculated from your height, weight, age and goal, you log each meal in grams and see weekly and monthly charts." },
    { q: "Are there fitness and nutrition mentors?", a: "Yes. Mentors must have their identity verified and accept the mentoring terms. You can choose a mentor, get a plan, approve it or ask for changes and chat with your mentor; chats are end-to-end encrypted." },
    ...pick(FAQ_ITEMS_EN, 3, 2),
  ],
  trade: [
    { q: "Is the Arion trading journal free?", a: "Sign-up is free. The trading journal is open for 3 days on every new account with limited AI use, then continues with the Trading or Max plan." },
    { q: "What does the trading journal show?", a: "Each account separately: balance, profit and loss, win rate and goal. An entry checklist whose state is saved at the moment you log a trade, plus notes and tags. You can also share the report of a day, week or month of any account as an image." },
    FAQ_ITEMS_EN[4],
    { q: "Which currencies does the forex economic calendar cover?", a: "Events for 9 major currencies with Actual, Forecast and Previous, filters for impact and currency, and notification alerts for the news events you are watching." },
    { q: "How are forex market hours shown?", a: "The Sydney, Tokyo, Frankfurt, London and New York sessions are shown in your own time with real daylight saving, so you know when the market is open and when it is busiest." },
    { q: "Is there a risk calculator?", a: "Yes. A simple mode with pips and lot size and an advanced mode for calculating risk and profit; the result comes with the Calculate button and has to be recalculated when you change an input." },
    ...pick(FAQ_ITEMS_EN, 2, 3),
  ],
};

export function getFaqItems(section?: SectionKey | null): { q: string; a: string }[] {
  if (section) return isEn() ? SECTION_FAQ_EN[section] : SECTION_FAQ_FA[section];
  return isEn() ? FAQ_ITEMS_EN : FAQ_ITEMS;
}
