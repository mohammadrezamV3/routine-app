// سؤالات متداول لندینگ — هم LandingFAQ (کلاینت) و هم JSON-LD صفحه‌ی اصلی
// (سرور، app/page.tsx) از همین فایل غیرکلاینتی می‌خونن.
import { isEn } from "./i18n";

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

export function getFaqItems(): { q: string; a: string }[] {
  return isEn() ? FAQ_ITEMS_EN : FAQ_ITEMS;
}
