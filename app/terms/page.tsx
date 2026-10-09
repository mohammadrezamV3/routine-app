import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL, brandName } from "@/lib/brand";
import { isEn, tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { MENTOR_TERMS_PATH } from "@/lib/mentorTerms";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: tr("قوانین و مقررات آریون", `Terms and conditions | ${brandName()}`),
    description: tr(
      "شرایط و قوانین استفاده از آریون — حساب کاربری، اشتراک و پرداخت، انصراف و بازگشت وجه، حریم خصوصی، سلب مسئولیت پزشکی و مالی، و حل اختلاف.",
      `The terms of use for ${brandName()}: accounts, subscriptions and payments, cancellations and refunds, privacy, medical and financial disclaimers, and dispute resolution.`,
    ),
    path: "/terms",
    ogTitle: tr("قوانین و مقررات", "Terms and conditions"),
  });
}

// تاریخ آخرین بازنگری — با هر تغییر ماهوی متن باید عوض شود (بند ۱۹-۲).
const LAST_UPDATED = { fa: "مهر 1405", en: "Mehr 1405 (Jalali)" };

type Article = { title: string; intro?: string; clauses: string[]; link?: { href: string; label: string } };

// متن عمدا رسمی و بندبه‌بند است (نه لحن محاوره‌ای بقیه‌ی سایت): هر بند
// باید به‌تنهایی قابل استناد باشد و در اختلاف، «ماده‌ی X بند Y» ارجاع‌پذیر.
const ARTICLES_FA: Article[] = [
  {
    title: "تعاریف",
    clauses: [
      "«آریون» یا «ما»: مجموعه‌ی Arion Group، ارائه‌دهنده و بهره‌بردار وب‌سایت، اپلیکیشن و کلیه‌ی خدمات مرتبط با نام تجاری آریون.",
      "«کاربر» یا «شما»: هر شخص حقیقی که در آریون حساب کاربری ایجاد می‌کند یا از هر بخشی از خدمات استفاده می‌کند.",
      "«خدمات»: کلیه‌ی امکانات ارائه‌شده در آریون، از جمله روتین روزانه و هفتگی، پیگیری عادت و خواب، کارهای روزمره، برنامه‌ی تمرینی، کالری‌شمار، ژورنال ترید و ابزارهای وابسته (تقویم اقتصادی، اتصال متاتریدر، چک‌لیست و یادداشت)، رودمپ آموزشی هوشمند، تحلیل هوشمند، ویژگی‌های اجتماعی و بخش مربی‌ها.",
      "«ماژول پولی»: هر بخشی از خدمات که دسترسی به آن منوط به داشتن اشتراک فعال است.",
      "«اشتراک»: حق استفاده‌ی محدود به زمان از یک یا چند ماژول پولی، مطابق پلنی که کاربر خریداری کرده است.",
      "«محتوای کاربر»: هر داده‌ای که کاربر در آریون وارد، بارگذاری یا همگام‌سازی می‌کند.",
      "«محتوای تولیدشده با هوش مصنوعی»: هر خروجی که به‌صورت خودکار توسط مدل‌های هوش مصنوعی برای کاربر تولید می‌شود، از جمله رودمپ، برنامه‌ی تمرینی و گزارش تحلیلی.",
    ],
  },
  {
    title: "پذیرش شرایط و اهلیت",
    clauses: [
      "ثبت‌نام، ورود یا هرگونه استفاده از خدمات به منزله‌ی مطالعه، درک و پذیرش کامل و بی‌قیدوشرط این قوانین و مقررات و اصلاحات بعدی آن (مطابق ماده‌ی 19) است. در صورت عدم پذیرش هر بخش از این قوانین، کاربر باید از استفاده از خدمات خودداری کند.",
      "این قوانین در حکم قرارداد الکترونیکی میان کاربر و آریون است و مطابق قانون تجارت الکترونیکی و سایر قوانین جمهوری اسلامی ایران معتبر و لازم‌الاتباع است.",
      "استفاده از خدمات برای اشخاص دارای حداقل 18 سال تمام مجاز است. استفاده‌ی اشخاص کمتر از 18 سال تنها با اطلاع، رضایت و نظارت ولی یا سرپرست قانونی مجاز است و مسئولیت آن بر عهده‌ی ولی یا سرپرست است.",
      "کاربر اقرار می‌کند که اطلاعات هویتی و تماسی واردشده در زمان ثبت‌نام صحیح، کامل و متعلق به خود اوست.",
    ],
  },
  {
    title: "ماهیت خدمات",
    clauses: [
      "آریون ابزاری شخصی برای برنامه‌ریزی، ثبت و پیگیری است. خدمات «همان‌گونه که هست» و «در حد امکان» ارائه می‌شود و آریون تعهدی به تحقق هیچ نتیجه‌ی مشخصی (از جمله کاهش وزن، افزایش توان بدنی، سوددهی معاملات یا یادگیری یک مهارت) ندارد؛ نتیجه‌ی نهایی به عملکرد خود کاربر بستگی دارد.",
      "آریون می‌تواند امکانات خدمات را توسعه دهد، تغییر دهد یا بخشی را متوقف کند. اگر ماژولی که کاربر برای آن اشتراک فعال پرداخت کرده پیش از پایان اشتراک به‌طور کامل متوقف شود، مبلغ مدت استفاده‌نشده‌ی همان ماژول به کاربر بازگردانده می‌شود یا با رضایت کاربر به اشتراک معادل دیگری تبدیل می‌شود.",
      "بخشی از داده‌ها (از جمله تقویم اقتصادی، قیمت بازار و نتایج تحلیل هوش مصنوعی) از منابع و سرویس‌دهندگان ثالث دریافت می‌شود. آریون صحت، کامل‌بودن و به‌موقع‌بودن این داده‌ها را تضمین نمی‌کند و آن‌ها صرفا جنبه‌ی اطلاع‌رسانی دارند.",
    ],
  },
  {
    title: "حساب کاربری و امنیت",
    clauses: [
      "هر کاربر تنها مجاز به داشتن یک حساب کاربری است. ایجاد حساب‌های متعدد برای سوءاستفاده از دوره‌ی آزمایشی، تخفیف، کد معرف یا سهمیه‌ی هوش مصنوعی ممنوع است.",
      "حساب کاربری شخصی و غیرقابل انتقال است. واگذاری، فروش، اجاره یا اشتراک‌گذاری حساب یا اشتراک با دیگران ممنوع است.",
      "حفظ محرمانگی رمز عبور و کلیه‌ی فعالیت‌هایی که از طریق حساب کاربر انجام می‌شود بر عهده‌ی خود اوست. کاربر موظف است در صورت اطلاع از هرگونه دسترسی غیرمجاز، فورا رمز عبور را تغییر دهد و موضوع را از طریق پشتیبانی اطلاع دهد. آریون مسئولیتی در قبال خسارات ناشی از افشای رمز عبور توسط کاربر یا سهل‌انگاری او ندارد.",
      "برای حفاظت از حساب‌ها، تلاش‌های ورود ناموفق و درخواست‌های غیرعادی ممکن است به‌صورت خودکار و موقت محدود شوند.",
      "آریون هیچ‌گاه رمز عبور حساب کاربری یا رمز حساب‌های معاملاتی کاربر را از طریق تلفن، پیام یا ایمیل درخواست نمی‌کند. هر درخواستی از این نوع جعلی است.",
    ],
  },
  {
    title: "تعهدات کاربر و رفتارهای ممنوع",
    intro: "کاربر متعهد است از خدمات تنها برای مقاصد قانونی و شخصی استفاده کند و به‌طور خاص از موارد زیر خودداری نماید:",
    clauses: [
      "هرگونه تلاش برای دسترسی غیرمجاز به حساب دیگران، سرورها، پایگاه داده یا بخش‌های غیرعمومی سامانه، یا دورزدن محدودیت‌های دسترسی و پرداخت.",
      "هرگونه اقدام که موجب اختلال، کندی یا ازکارافتادن خدمات شود، از جمله ارسال درخواست انبوه، استفاده از ربات، خزنده یا اسکریپت خودکار بدون اجازه‌ی کتبی آریون.",
      "مهندسی معکوس، کپی‌برداری، استخراج انبوه داده یا بازفروش خدمات یا محتوای آریون.",
      "ثبت یا انتشار محتوای خلاف قوانین جمهوری اسلامی ایران، توهین‌آمیز، مستهجن، مغایر حقوق دیگران یا حاوی بدافزار، از جمله در نام کاربری، تصویر پروفایل و بخش‌های اجتماعی.",
      "سوءاستفاده از سهمیه یا ورودی‌های سرویس هوش مصنوعی، از جمله تلاش برای تولید محتوای غیرقانونی یا دورزدن محدودیت‌های آن.",
      "جعل هویت دیگران یا ارائه‌ی اطلاعات خلاف واقع.",
      "نقض هر یک از این موارد، علاوه بر اعمال ماده‌ی 18، موجب مسئولیت کاربر در برابر کلیه‌ی خسارات واردشده به آریون یا اشخاص ثالث است.",
    ],
  },
  {
    title: "اشتراک، قیمت و پرداخت",
    clauses: [
      "ترکیب ماژول‌ها، مدت و قیمت هر پلن در صفحه‌ی اشتراک اعلام می‌شود. قیمت نهایی، پیش از پرداخت به کاربر نمایش داده می‌شود و مبنای تعهد طرفین همان مبلغ است.",
      "پرداخت تنها از طریق درگاه‌های پرداخت رسمی و مجاز کشور انجام می‌شود. اطلاعات کارت بانکی کاربر در آریون ذخیره نمی‌شود و فرایند پرداخت تابع قوانین درگاه و بانک مربوط است.",
      "اشتراک پس از تایید موفق پرداخت توسط درگاه فعال می‌شود. اگر مبلغی از حساب کاربر کسر شود اما اشتراک فعال نشود، مبلغ مطابق رویه‌ی بانکی ظرف حداکثر 72 ساعت به‌صورت خودکار بازمی‌گردد؛ در غیر این صورت کاربر می‌تواند با ارائه‌ی شماره‌ی پیگیری به پشتیبانی مراجعه کند.",
      "اشتراک‌ها به‌صورت خودکار تمدید نمی‌شوند و هیچ مبلغی بدون اقدام و تایید صریح کاربر از او دریافت نمی‌شود.",
      "تغییر قیمت پلن‌ها برای آینده مجاز است و بر اشتراک‌هایی که پیش از تغییر خریداری شده‌اند اثری ندارد.",
      "تخفیف‌ها، کدهای تخفیف و پیشنهادهای ویژه دارای شرایط و مهلت اعلام‌شده‌ی خود هستند، قابل تبدیل به وجه نقد نیستند و در صورت کشف سوءاستفاده باطل می‌شوند.",
      "ارتقا به پلن مکس: اگر کاربر پلن ورزش یا ترید فعال داشته باشد و پلن مکس بخرد، کل مبلغی که برای پلن فعلی پرداخت کرده از قیمت مکس کسر می‌شود. پلن مکس جدید هم‌زمان با پلن اول (ورزش یا ترید) به پایان می‌رسد، مگر اینکه مدت خریداری‌شده برای مکس زودتر از انقضای پلن اول تمام شود که در آن صورت همان مدت خریداری‌شده ملاک است. اگر پلن دوم دوباره اشتراک ورزش یا ترید باشد (نه ارتقا به مکس)، مدت کامل و جداگانه‌ی خریداری‌شده به کاربر داده می‌شود.",
      "دوره‌ی آزمایشی رایگان (در صورت ارائه) تنها یک بار برای هر شخص قابل استفاده است و آریون می‌تواند شرایط، مدت یا ارائه‌ی آن را در هر زمان برای کاربران جدید تغییر دهد.",
    ],
  },
  {
    title: "انصراف و بازگشت وجه",
    clauses: [
      "کاربر می‌تواند ظرف 7 روز از تاریخ خرید اشتراک، بدون ذکر دلیل، از خرید انصراف دهد و بازگشت وجه را از طریق پشتیبانی درخواست کند؛ به شرط آنکه در این مدت از خدمات مبتنی بر هوش مصنوعی همان اشتراک (مانند ساخت رودمپ، برنامه‌ی تمرینی هوشمند، تحلیل تصویر غذا یا گزارش تحلیلی) استفاده نکرده باشد. در این حالت کل مبلغ پرداختی، پس از کسر کارمزد قطعی درگاه پرداخت (در صورت وجود)، بازگردانده می‌شود.",
      "اگر کاربر در مهلت 7 روزه از خدمات هوش مصنوعی استفاده کرده باشد، به دلیل هزینه‌ی قطعی و غیرقابل بازگشتی که آن خدمات برای آریون ایجاد کرده‌اند، مبلغ استرداد به نسبت روزهای باقی‌مانده‌ی اشتراک محاسبه می‌شود و هزینه‌ی خدمات هوش مصنوعی مصرف‌شده از آن کسر می‌شود.",
      "پس از گذشت 7 روز از خرید، وجه اشتراک قابل استرداد نیست، مگر در موارد بند 4 همین ماده یا بند 2 ماده‌ی 3 یا بند 4 ماده‌ی 18.",
      "اگر به دلیل نقص فنی ناشی از آریون، ماژول پولی کاربر بیش از 72 ساعت متوالی از دسترس خارج باشد، کاربر به انتخاب خود حق تمدید رایگان اشتراک به مدت ازدست‌رفته یا دریافت وجه مدت ازدست‌رفته را دارد.",
      "مبالغ قابل استرداد ظرف حداکثر 10 روز کاری پس از تایید درخواست، به همان کارت یا حسابی که پرداخت از آن انجام شده واریز می‌شود.",
      "با بازگشت وجه، اشتراک مربوط بلافاصله لغو می‌شود. داده‌های کاربر حذف نمی‌شود و پس از خرید مجدد دوباره در دسترس خواهد بود.",
    ],
  },
  {
    title: "خدمات مبتنی بر هوش مصنوعی",
    clauses: [
      "محتوای تولیدشده با هوش مصنوعی به‌صورت خودکار و بدون بازبینی انسانی تولید می‌شود و ممکن است ناقص، نادرست یا منسوخ باشد (از جمله نام منابع، ترتیب مراحل، برآورد زمان، مقادیر کالری و حرکات ورزشی). این محتوا صرفا پیشنهادی و کمک‌آموزشی است و کاربر موظف است پیش از اتکا به آن، صحت آن را خود بررسی کند.",
      "استفاده از خدمات هوش مصنوعی ممکن است مشمول سهمیه یا محدودیت تعداد باشد که در پلن یا صفحه‌ی مربوط اعلام می‌شود.",
      "ورودی‌هایی که کاربر به این خدمات می‌دهد (مانند موضوع رودمپ یا مشخصات بدنی) برای تولید پاسخ به سرویس‌دهنده‌ی پردازش هوش مصنوعی ارسال می‌شود. کاربر نباید اطلاعات هویتی حساس یا اطلاعات اشخاص دیگر را در این ورودی‌ها وارد کند.",
      "استفاده‌ی شخصی کاربر از محتوای تولیدشده برای خودش آزاد است؛ اما آریون هیچ تضمینی درباره‌ی یکتا بودن یا نداشتن حق مالکیت اشخاص ثالث بر این محتوا نمی‌دهد.",
    ],
  },
  {
    title: "سلب مسئولیت پزشکی، تغذیه‌ای و مالی",
    clauses: [
      "بخش‌های بدنسازی، برنامه‌ی تمرینی، کالری‌شمار و خواب به هیچ عنوان توصیه، تشخیص یا درمان پزشکی یا تغذیه‌ای نیستند و جایگزین مشاوره با پزشک، متخصص تغذیه یا مربی دارای صلاحیت نمی‌شوند. کاربر موظف است پیش از شروع هر برنامه‌ی ورزشی یا رژیم غذایی، به‌ویژه در صورت داشتن بیماری، بارداری، آسیب‌دیدگی یا مصرف دارو، با پزشک مشورت کند.",
      "کاربر می‌پذیرد که فعالیت بدنی ذاتا با خطر آسیب همراه است و انجام هر حرکت یا برنامه با تصمیم و مسئولیت کامل خود اوست. آریون مسئولیتی در قبال آسیب جسمی یا مشکلات سلامتی ناشی از اجرای برنامه‌ها ندارد.",
      "ژورنال ترید، آمار معاملات، تقویم اقتصادی، قیمت‌ها، ساعت بازار و هر ابزار مرتبط، صرفا ابزار ثبت و اطلاع‌رسانی هستند و به هیچ عنوان توصیه، سیگنال، مشاوره‌ی سرمایه‌گذاری یا پیشنهاد خرید و فروش محسوب نمی‌شوند. آریون مشاور سرمایه‌گذاری نیست.",
      "معامله در بازارهای مالی (از جمله فارکس، رمزارز، سهام و کالا) پرخطر است و می‌تواند به از دست رفتن کل سرمایه منجر شود. کلیه‌ی تصمیم‌های معاملاتی و سود و زیان ناشی از آن منحصرا بر عهده‌ی کاربر است و آریون هیچ مسئولیتی در قبال زیان مالی، از جمله زیان ناشی از تاخیر، نادرستی یا قطع داده‌های تقویم اقتصادی یا قیمت‌ها، ندارد.",
      "کاربر مسئول رعایت قوانین کشور خود و قوانین کارگزاری‌ها در خصوص فعالیت معاملاتی خویش است.",
    ],
  },
  {
    title: "اتصال متاتریدر و سرویس‌های ثالث",
    clauses: [
      "اتصال حساب معاملاتی از طریق کد اتصال و اکسپرت انجام می‌شود و آریون هیچ‌گاه رمز حساب معاملاتی کاربر را درخواست یا ذخیره نمی‌کند. این اتصال فقط برای خواندن و ثبت تاریخچه‌ی معاملات است و آریون هیچ دستور معامله‌ای در حساب کاربر صادر نمی‌کند.",
      "نصب و اجرای اکسپرت روی پلتفرم معاملاتی کاربر با تصمیم و مسئولیت خود اوست. کاربر باید پیش از نصب، سازگاری آن را با قوانین کارگزاری خود بررسی کند.",
      "کاربر می‌تواند در هر زمان اتصال را قطع کند. کد اتصال و توکن فقط به‌صورت هش‌شده نگهداری می‌شوند.",
      "استفاده از سرویس‌های ثالث (از جمله ورود با گوگل، درگاه پرداخت و منابع داده) تابع قوانین همان سرویس‌هاست و آریون مسئول عملکرد، قطعی یا سیاست‌های آن‌ها نیست.",
    ],
  },
  {
    title: "مالکیت فکری",
    clauses: [
      "کلیه‌ی حقوق مادی و معنوی نام و نشان تجاری آریون، طراحی، رابط کاربری، کد، متون، تصاویر، ساختار داده و سایر اجزای خدمات متعلق به آریون است و تحت حمایت قوانین مالکیت فکری جمهوری اسلامی ایران قرار دارد.",
      "هرگونه کپی، بازنشر، تقلید طراحی، استفاده‌ی تجاری یا ساخت اثر مشتق از خدمات بدون اجازه‌ی کتبی آریون ممنوع و قابل پیگرد قانونی است.",
      "مالکیت محتوای کاربر متعلق به خود کاربر است. کاربر به آریون اجازه‌ی غیرانحصاری، رایگان و محدود می‌دهد تا صرفا برای ارائه، نگهداری، پشتیبان‌گیری و بهبود خدمات به همان کاربر، محتوای او را ذخیره و پردازش کند. این اجازه با حذف حساب پایان می‌یابد.",
      "آریون می‌تواند از آمار تجمیعی و کاملا ناشناس (که به هیچ وجه قابل انتساب به شخص معین نباشد) برای بهبود خدمات استفاده کند.",
    ],
  },
  {
    title: "حریم خصوصی و حفاظت از داده‌ها",
    clauses: [
      "داده‌های جمع‌آوری‌شده شامل اطلاعات حساب (نام، ایمیل یا شماره‌ی موبایل، نام کاربری)، محتوای کاربر، اطلاعات پرداخت (بدون اطلاعات کارت) و داده‌های فنی لازم برای امنیت و عملکرد سرویس (مانند زمان ورود و نوع دستگاه) است.",
      "این داده‌ها صرفا برای ارائه‌ی خدمات، احراز هویت، پشتیبانی، امنیت، جلوگیری از تقلب و ارسال اعلان‌هایی که کاربر فعال کرده استفاده می‌شوند.",
      "آریون داده‌های کاربر را به هیچ شخص ثالثی نمی‌فروشد، اجاره نمی‌دهد و برای تبلیغات در اختیار دیگران قرار نمی‌دهد. داده‌ها تنها در موارد زیر افشا می‌شوند: به دستور کتبی مراجع قضایی یا قانونی صالح؛ به سرویس‌دهندگانی که برای ارائه‌ی همان خدمت ضروری‌اند (مانند میزبانی، درگاه پرداخت، ارسال پیامک و پردازش هوش مصنوعی) و فقط به همان اندازه‌ی لازم؛ یا با رضایت صریح خود کاربر.",
      "رمز عبور به‌صورت هش‌شده ذخیره می‌شود، ارتباط با سایت رمزنگاری‌شده است و آریون تدابیر فنی متعارف برای حفاظت از داده‌ها اتخاذ می‌کند. با این حال هیچ سامانه‌ای مصون مطلق نیست و آریون در صورت وقوع رخنه‌ی امنیتی مؤثر بر داده‌های کاربران، در اسرع وقت کاربران متاثر را مطلع خواهد کرد.",
      "کاربر حق دارد در هر زمان به داده‌های خود دسترسی داشته باشد، آن‌ها را اصلاح کند و حذف کامل حساب و داده‌هایش را از طریق پشتیبانی درخواست کند. حذف ظرف حداکثر 30 روز انجام می‌شود، به‌جز اطلاعاتی که نگهداری آن‌ها طبق قانون الزامی است (مانند سوابق تراکنش‌های مالی) که فقط به مدت الزام قانونی نگهداری می‌شوند.",
      "آریون از کوکی و ذخیره‌سازی محلی مرورگر فقط برای نگهداری نشست ورود، تنظیمات و عملکرد صحیح سایت استفاده می‌کند.",
    ],
  },
  {
    title: "ویژگی‌های اجتماعی",
    clauses: [
      "در بخش دوستان، کاربرانی که کاربر با آن‌ها ارتباط دوستی برقرار کرده، می‌توانند اطلاعات پروفایل عمومی او (نام، نام کاربری، تصویر پروفایل و بنر، بیوگرافی و نام پلن) و خلاصه‌ی آماری پیشرفتش (مانند استریک، تعداد ستاره‌ها و تعداد مسیرها و برنامه‌های تکمیل‌شده) را ببینند. شماره‌ی موبایل فقط در صورتی نمایش داده می‌شود که خود کاربر آن را در تنظیمات حریم خصوصی فعال کرده باشد. جزئیات محتوای کاربر (مانند معاملات، یادداشت‌ها و برنامه‌ها) به دوستان نمایش داده نمی‌شود.",
      "کاربر می‌تواند در هر زمان ارتباط دوستی را قطع کند. مسئولیت محتوایی که کاربر در بخش‌های قابل‌مشاهده برای دیگران (مانند نام و تصویر پروفایل) قرار می‌دهد بر عهده‌ی خود اوست.",
    ],
  },
  {
    title: "بخش مربی‌ها",
    clauses: [
      "آریون در بخش مربی‌ها فقط بستر ارتباط میان مربی و شاگرد است. مربی‌ها کاربران مستقل‌اند و کارمند، نماینده یا شریک آریون نیستند و آریون آن‌ها را برای ارائه‌ی خدمت انتخاب یا تضمین نمی‌کند.",
      "مسئولیت محتوا، توصیه‌ها، رفتار و صلاحیت مربی و هر توافق یا پرداخت میان مربی و شاگرد با خود آن‌هاست و آریون طرف آن نیست. آریون در حال حاضر هیچ پرداختی میان مربی و شاگرد را پردازش نمی‌کند.",
      "راهنمایی مربی در حوزه‌ی ورزش، تغذیه یا سلامت، توصیه‌ی پزشکی نیست و ماده‌ی 9 درباره‌ی آن نیز جاری است.",
      "شرایط تفصیلی در «شرایط استفاده از بخش مربی‌ها» آمده است که جزء جدایی‌ناپذیر این قوانین است. پذیرش صریح آن برای ساخت پروفایل مربی‌گری و ارسال درخواست شاگردی لازم است.",
    ],
    link: { href: MENTOR_TERMS_PATH, label: "شرایط استفاده از بخش مربی‌ها" },
  },
  {
    title: "کد معرف و همکاری در فروش",
    clauses: [
      "پاداش، تخفیف یا کمیسیون ناشی از کد معرف یا همکاری در فروش تنها طبق شرایط اعلام‌شده در زمان استفاده تعلق می‌گیرد و تا زمان قطعی‌شدن خرید معرفی‌شده (پایان مهلت انصراف) قطعی نیست.",
      "معرفی خود، معرفی از طریق حساب‌های جعلی یا متعدد، تبلیغ گمراه‌کننده یا هر روش متقلبانه‌ی دیگر موجب ابطال کلیه‌ی پاداش‌های مرتبط و در صورت لزوم تعلیق حساب می‌شود.",
      "همکار فروش حق ندارد خود را نماینده‌ی رسمی آریون معرفی کند یا تعهدی خارج از این قوانین از طرف آریون به دیگران بدهد.",
    ],
  },
  {
    title: "دسترس‌پذیری خدمات",
    clauses: [
      "آریون تلاش معقول برای دسترس‌پذیری دائمی خدمات به کار می‌گیرد، اما تضمین نمی‌کند خدمات همواره بدون وقفه، خطا یا تاخیر باشد.",
      "خدمات ممکن است برای نگهداری، به‌روزرسانی یا رفع اشکال به‌طور موقت از دسترس خارج شود. وقفه‌های برنامه‌ریزی‌شده‌ی طولانی، در حد امکان از پیش اطلاع‌رسانی می‌شود.",
      "توصیه می‌شود کاربر از داده‌های مهم خود نسخه‌ی پشتیبان شخصی داشته باشد.",
    ],
  },
  {
    title: "محدودیت مسئولیت",
    clauses: [
      "آریون در هیچ حالتی مسئول خسارات غیرمستقیم، تبعی یا ناشی از عدم‌النفع کاربر نیست، از جمله زیان معاملاتی، از دست رفتن فرصت، آسیب ناشی از اجرای برنامه‌ی ورزشی یا غذایی، یا اتکا به محتوای تولیدشده با هوش مصنوعی و داده‌های اشخاص ثالث.",
      "در هر حال، مجموع مسئولیت آریون در قبال هر کاربر، به هر علت، حداکثر معادل کل مبلغی است که آن کاربر در سه ماه منتهی به وقوع حادثه‌ی موجد مسئولیت به آریون پرداخت کرده است.",
      "محدودیت‌های این ماده شامل خسارات ناشی از تقصیر عمدی یا تقصیر سنگین آریون نمی‌شود و حقوقی را که قوانین آمره‌ی حمایت از مصرف‌کننده برای کاربر به رسمیت شناخته‌اند سلب نمی‌کند.",
    ],
  },
  {
    title: "تعلیق و خاتمه",
    clauses: [
      "کاربر می‌تواند در هر زمان استفاده از خدمات را متوقف کند یا حذف حساب خود را درخواست کند. حذف حساب به‌خودی‌خود موجب بازگشت وجه اشتراک نمی‌شود، مگر در چارچوب ماده‌ی 7.",
      "در صورت نقض این قوانین، آریون می‌تواند متناسب با شدت تخلف، ابتدا به کاربر اخطار دهد یا دسترسی او را به‌طور موقت محدود کند. در تخلفات شدید (از جمله نفوذ یا تلاش برای نفوذ، تقلب در پرداخت، سوءاستفاده‌ی سازمان‌یافته یا فعالیت مجرمانه) حساب بدون اخطار قبلی مسدود می‌شود و آریون حق پیگیری قانونی و مطالبه‌ی خسارت را دارد.",
      "در صورت مسدودی به دلیل تخلف کاربر، مبلغ اشتراک باقی‌مانده بازگردانده نمی‌شود.",
      "اگر آریون بدون تقصیر کاربر، حساب او را ببندد یا ارائه‌ی کل خدمات را متوقف کند، مبلغ مدت استفاده‌نشده‌ی اشتراک‌های فعال به کاربر بازگردانده می‌شود و فرصت معقولی (حداقل 14 روز) برای دریافت نسخه‌ای از داده‌هایش به او داده می‌شود.",
      "کاربری که حسابش به دلیل تخلف مسدود شده، مجاز به ایجاد حساب جدید نیست.",
    ],
  },
  {
    title: "تغییر قوانین",
    clauses: [
      "آریون می‌تواند این قوانین را به‌روزرسانی کند. نسخه‌ی جدید با ذکر تاریخ آخرین بازنگری در همین صفحه منتشر می‌شود.",
      "تغییرات ماهوی که حقوق یا تعهدات کاربر را به ضرر او تغییر می‌دهد، حداقل 7 روز پیش از اجرا از طریق ایمیل یا اعلان داخل سایت به کاربران دارای اشتراک فعال اطلاع داده می‌شود.",
      "کاربری که تغییرات ماهوی را نمی‌پذیرد، می‌تواند پیش از اجرای آن‌ها اشتراک خود را لغو کند و مبلغ مدت استفاده‌نشده را دریافت نماید. ادامه‌ی استفاده پس از تاریخ اجرا به منزله‌ی پذیرش نسخه‌ی جدید است.",
      "اشتراک‌های خریداری‌شده تا پایان مدت خود با همان مزایای زمان خرید (مطابق ماده‌ی 6) ادامه می‌یابند.",
    ],
  },
  {
    title: "قانون حاکم و حل اختلاف",
    clauses: [
      "این قوانین تابع قوانین جمهوری اسلامی ایران است و تفسیر آن بر اساس همین قوانین انجام می‌شود.",
      "در صورت بروز اختلاف، طرفین ابتدا موظف‌اند ظرف 30 روز از طریق مذاکره و پشتیبانی آریون برای حل دوستانه‌ی آن تلاش کنند. کاربر برای این منظور باید موضوع را کتبی (از طریق تیکت پشتیبانی یا ایمیل) مطرح کند.",
      "در صورت عدم حل اختلاف در این مهلت، مرجع رسیدگی، مراجع صالح قضایی جمهوری اسلامی ایران خواهد بود. این بند مانع مراجعه‌ی کاربر به مراجع رسمی حمایت از مصرف‌کننده نیست.",
    ],
  },
  {
    title: "قوه‌ی قاهره",
    clauses: [
      "آریون در قبال تاخیر یا عدم انجام تعهدات ناشی از رویدادهای خارج از کنترل متعارف خود مسئول نیست؛ از جمله بلایای طبیعی، جنگ، قطع یا محدودسازی سراسری اینترنت، اختلال گسترده‌ی زیرساخت یا شبکه‌ی بانکی، تحریم، اعتصاب، حملات سایبری گسترده، یا تصمیمات و دستورات مراجع حاکمیتی.",
      "اگر چنین رویدادی دسترسی کاربر به ماژول پولی را بیش از 7 روز متوالی قطع کند، مدت قطعی پس از رفع آن به اشتراک کاربر اضافه می‌شود.",
    ],
  },
  {
    title: "ارتباط و ابلاغ",
    clauses: [
      `راه‌های رسمی ارتباط با آریون، سامانه‌ی تیکت پشتیبانی داخل حساب کاربری و ایمیل ${SUPPORT_EMAIL} است.`,
      "ابلاغ‌های آریون به نشانی ایمیل یا شماره‌ی موبایل ثبت‌شده در حساب کاربر، یا از طریق اعلان داخل سایت، ابلاغ معتبر محسوب می‌شود. مسئولیت به‌روز نگه داشتن اطلاعات تماس بر عهده‌ی کاربر است.",
      "درخواست‌های کاربر (از جمله انصراف، بازگشت وجه، حذف داده و اعتراض) باید از طریق همین راه‌های رسمی ثبت شود تا تاریخ و محتوای آن قابل استناد باشد.",
    ],
  },
  {
    title: "سایر مقررات",
    clauses: [
      "این قوانین، به همراه شرایط اعلام‌شده در صفحه‌ی هر پلن در زمان خرید، کل توافق میان کاربر و آریون درباره‌ی خدمات است. در صورت تعارض، شرایط خاص پلن در زمان خرید مقدم است.",
      "اگر هر بند از این قوانین به حکم مرجع صالح باطل یا غیرقابل اجرا شناخته شود، سایر بندها به قوت خود باقی است و بند باطل به نزدیک‌ترین شکل قانونی ممکن به مقصود اولیه تفسیر می‌شود.",
      "عدم اعمال یا تاخیر در اعمال هر حقی توسط آریون، به معنای اسقاط آن حق نیست.",
      "کاربر حق انتقال حقوق و تعهدات ناشی از این قوانین را به دیگری ندارد. آریون می‌تواند در صورت انتقال یا ادغام کسب‌وکار، این حقوق و تعهدات را با حفظ کامل حقوق کاربران به جانشین خود منتقل کند.",
      "زبان رسمی این قوانین فارسی است و در صورت وجود ترجمه، متن فارسی ملاک است.",
    ],
  },
];

// نسخه‌ی انگلیسی بندها: ساختار و شماره‌ی مواد دقیقا با ARTICLES_FA یکی است
// (ارجاع‌های «ماده‌ی X» در متن هم همین شماره‌ها را دارند).
const ARTICLES_EN: Article[] = [
  {
    title: "Definitions",
    clauses: [
      "“Arion” or “we”: the Arion Group, the provider and operator of the website, the app and all services under the Arion brand.",
      "“User” or “you”: any natural person who creates an Arion account or uses any part of the services.",
      "“Services”: all features offered on Arion, including the daily and weekly routine, habit and sleep tracking, daily tasks, workout plans, the calorie counter, the trading journal and related tools (economic calendar, MetaTrader connection, checklists and notes), the smart learning roadmap, smart analysis, social features and the mentor section.",
      "“Paid module”: any part of the services whose access depends on having an active subscription.",
      "“Subscription”: a time-limited right to use one or more paid modules, according to the plan the user has purchased.",
      "“User content”: any data that the user enters, uploads or syncs on Arion.",
      "“AI-generated content”: any output automatically produced for the user by artificial intelligence models, including roadmaps, workout plans and analytical reports.",
    ],
  },
  {
    title: "Acceptance of terms and eligibility",
    clauses: [
      "Signing up, logging in or using the services in any way means you have read, understood and fully and unconditionally accepted these terms and any later amendments (in accordance with Article 19). If you do not accept any part of these terms, you must not use the services.",
      "These terms constitute an electronic contract between the user and Arion and are valid and binding under the Electronic Commerce Law and other laws of the Islamic Republic of Iran.",
      "Adults aged 18 or over may use the services. People under 18 may only use them with the knowledge, consent and supervision of a parent or legal guardian, who is responsible for that use.",
      "The user confirms that the identity and contact details entered when registering are correct, complete and belong to the user.",
    ],
  },
  {
    title: "Nature of the services",
    clauses: [
      "Arion is a personal tool for planning, recording and tracking. The services are provided “as is” and “as available”, and Arion does not guarantee any specific result (including weight loss, improved physical fitness, trading profits or learning a skill). The final outcome depends on the user's own actions.",
      "Arion may develop, change or discontinue parts of the services. If a module the user has paid for is fully discontinued before the subscription ends, the amount for the unused period of that module will be refunded to the user or, with the user's consent, converted into an equivalent subscription.",
      "Some data (including the economic calendar, market prices and the results of AI analysis) comes from third-party sources and service providers. Arion does not guarantee the accuracy, completeness or timeliness of this data, which is provided for information only.",
    ],
  },
  {
    title: "Account and security",
    clauses: [
      "Each user may only have one account. Creating multiple accounts to abuse a trial period, a discount, a referral code or the AI quota is prohibited.",
      "The user account is personal and non-transferable. Handing over, selling, renting or sharing an account or subscription with others is prohibited.",
      "The user is responsible for keeping their password confidential and for all activity carried out through their account. If the user becomes aware of any unauthorised access, they must change their password immediately and inform support. Arion is not liable for losses caused by the user disclosing their password or being careless with it.",
      "To protect accounts, failed login attempts and unusual requests may be limited automatically and temporarily.",
      "Arion will never ask for your account password or your trading account password by phone, message or email. Any such request is fake.",
    ],
  },
  {
    title: "User obligations and prohibited conduct",
    intro: "The user agrees to use the services only for lawful and personal purposes, and in particular to refrain from the following:",
    clauses: [
      "Any attempt to gain unauthorised access to other people's accounts, servers, databases or non-public parts of the system, or to bypass access or payment restrictions.",
      "Any action that disrupts, slows down or takes down the services, including sending mass requests, or using bots, crawlers or automated scripts without Arion's written permission.",
      "Reverse engineering, copying, mass extraction of data, or reselling the services or Arion's content.",
      "Posting or publishing content that breaks the laws of the Islamic Republic of Iran, is abusive, obscene, infringes others' rights or contains malware, including in usernames, profile pictures and social sections.",
      "Abusing the AI service's quota or inputs, including attempts to generate unlawful content or to bypass its limits.",
      "Impersonating others or providing false information.",
      "A breach of any of these points, in addition to the application of Article 18, makes the user liable for all losses caused to Arion or to third parties.",
    ],
  },
  {
    title: "Subscriptions, prices and payment",
    clauses: [
      "The modules included, the duration and the price of each plan are shown on the subscription page. The final price is displayed before payment, and the amount shown is the basis of both parties' obligations.",
      "Payment is only made through the official and authorised payment gateways in the country. Users' bank card details are not stored by Arion, and the payment process is subject to the rules of the gateway and the relevant bank.",
      "A subscription becomes active once the payment gateway confirms the payment. If an amount is debited from the user's account but the subscription does not activate, the amount will be returned automatically within 72 hours in line with banking procedures. Otherwise, the user can contact support with their tracking number.",
      "Subscriptions do not renew automatically, and no amount is taken from the user without their action and explicit confirmation.",
      "Changes to plan prices apply to the future and do not affect subscriptions purchased before the change.",
      "Discounts, discount codes and special offers are subject to their stated conditions and deadlines, cannot be exchanged for cash, and are void if abuse is discovered.",
      "Upgrading to the Max plan: if a user has an active Workout or Trading plan and buys the Max plan, the full amount paid for the current plan is deducted from the Max price. The new Max plan ends at the same time as the first plan (Workout or Trading), unless the duration purchased for Max expires before the first plan, in which case the purchased duration applies. If the second plan is a new Workout or Trading subscription (not an upgrade to Max), the full and separately purchased duration is given to the user.",
      "A free trial period (where offered) may be used only once per person, and Arion may change its conditions, duration or availability for new users at any time.",
    ],
  },
  {
    title: "Cancellation and refunds",
    clauses: [
      "The user may cancel a subscription purchase within 7 days of the purchase date, without giving a reason, and request a refund through support, provided that they have not used the AI-based services of that same subscription during this period (such as building a roadmap, an intelligent workout plan, food image analysis or an analytical report). In this case, the full amount paid is refunded after deducting the payment gateway's final fee (if any).",
      "If the user has used the AI services within the 7-day period, the refund is calculated in proportion to the remaining days of the subscription, and the cost of the AI services used is deducted, because those services created a final and non-refundable cost for Arion.",
      "After 7 days from the purchase, the subscription amount is not refundable, except in the cases in clause 4 of this article, clause 2 of Article 3, or clause 4 of Article 18.",
      "If, because of a technical fault on Arion's side, a user's paid module is unavailable for more than 72 consecutive hours, the user may choose either a free extension of the subscription for the lost period, or a refund for the lost period.",
      "Refundable amounts are paid within a maximum of 10 business days after the request is approved, to the same card or account the payment was made from.",
      "Once a refund is made, the related subscription is cancelled immediately. The user's data is not deleted and will be available again after a new purchase.",
    ],
  },
  {
    title: "AI-based services",
    clauses: [
      "AI-generated content is produced automatically, without human review, and may be incomplete, inaccurate or out of date (including source names, the order of steps, time estimates, calorie values and exercise moves). This content is only a suggestion and educational aid, and the user must check its accuracy themselves before relying on it.",
      "Use of the AI services may be subject to a quota or limit on the number of uses, as stated in the relevant plan or page.",
      "The inputs the user gives these services (such as a roadmap topic or body measurements) are sent to the AI processing provider to generate a response. The user must not enter sensitive personal information or information about other people in these inputs.",
      "The user's personal use of the AI-generated content for themselves is free. However, Arion gives no guarantee that this content is unique or free from third-party intellectual property rights.",
    ],
  },
  {
    title: "Medical, nutritional and financial disclaimers",
    clauses: [
      "The workout, training plan, calorie counter and sleep sections are in no way medical, nutritional or therapeutic advice, diagnosis or treatment, and they do not replace consultation with a doctor, a qualified dietitian or a qualified coach. Before starting any exercise programme or diet, especially if you have an illness, are pregnant, have an injury or take medication, the user must consult a doctor.",
      "The user accepts that physical activity carries an inherent risk of injury, and that performing any movement or programme is entirely at the user's own decision and responsibility. Arion is not liable for physical injury or health problems arising from following the programmes.",
      "The trading journal, trade statistics, the economic calendar, prices, market hours and any related tools are only tools for recording and information. They are in no way recommendations, signals, investment advice or buy and sell suggestions. Arion is not an investment advisor.",
      "Trading in financial markets (including forex, cryptocurrencies, stocks and commodities) is high risk and can lead to the loss of all capital. All trading decisions and the resulting profits and losses are solely the user's responsibility. Arion has no liability for financial loss, including losses caused by delays, errors or interruptions in economic calendar data or prices.",
      "The user is responsible for complying with the laws of their own country and with the rules of their brokers regarding their trading activity.",
    ],
  },
  {
    title: "MetaTrader connection and third-party services",
    clauses: [
      "A trading account is connected through a connection code and an Expert Advisor. Arion never requests or stores the user's trading account password. The connection is only for reading and recording trade history, and Arion does not place any trade orders in the user's account.",
      "Installing and running the Expert Advisor on the user's trading platform is the user's own decision and responsibility. Before installing it, the user must check that it complies with the rules of their broker.",
      "The user may disconnect at any time. The connection code and token are only stored in hashed form.",
      "The use of third-party services (including Google sign-in, payment gateways and data sources) is subject to the terms of those services, and Arion is not responsible for their performance, outages or policies.",
    ],
  },
  {
    title: "Intellectual property",
    clauses: [
      "All economic and moral rights in the Arion name and trademark, the design, user interface, code, text, images, data structure and other components of the services belong to Arion and are protected by the intellectual property laws of the Islamic Republic of Iran.",
      "Any copying, republishing, imitation of the design, commercial use or creation of derivative works from the services without Arion's written permission is prohibited and may be pursued legally.",
      "Ownership of user content belongs to the user. The user grants Arion a non-exclusive, royalty-free and limited permission to store and process their content solely to provide, maintain, back up and improve the services for that user. This permission ends when the account is deleted.",
      "Arion may use aggregated and fully anonymous statistics (which cannot in any way be attributed to a specific person) to improve the services.",
    ],
  },
  {
    title: "Privacy and data protection",
    clauses: [
      "The data collected includes account information (name, email or mobile number, username), user content, payment information (without card details) and the technical data needed for security and the operation of the service (such as login times and device type).",
      "This data is used only to provide the services, verify identity, provide support, ensure security, prevent fraud and send the notifications the user has turned on.",
      "Arion does not sell, rent or provide users' data to any third party for advertising. Data is disclosed only in the following cases: on the written order of a competent judicial or legal authority; to service providers who are essential for providing the same service (such as hosting, payment gateways, SMS delivery and AI processing), and only to the extent necessary; or with the user's explicit consent.",
      "Passwords are stored in hashed form, the connection to the site is encrypted, and Arion takes reasonable technical measures to protect data. However, no system is completely secure, and if a security breach affecting users' data occurs, Arion will inform the affected users as soon as possible.",
      "The user has the right at any time to access their data, correct it, and request the complete deletion of their account and data through support. Deletion is carried out within a maximum of 30 days, except for information that must be kept by law (such as financial transaction records), which is kept only for the period required by law.",
      "Arion uses cookies and local browser storage only to keep the login session, settings and the correct functioning of the site.",
    ],
  },
  {
    title: "Social features",
    clauses: [
      "In the friends section, users with whom the user has formed a friendship can see the user's public profile information (name, username, profile picture and banner, biography and plan name) and a summary of their progress statistics (such as streaks, the number of stars and the number of completed paths and programmes). A mobile number is only shown if the user has enabled it in their privacy settings. Details of the user's content (such as trades, notes and plans) are not shown to friends.",
      "The user may end a friendship at any time. The user is responsible for content they place in areas visible to others (such as their name and profile picture).",
    ],
  },
  {
    title: "Mentor section",
    clauses: [
      "In the mentor section, Arion is only the medium through which a mentor and a student communicate. Mentors are independent users and are not employees, agents or partners of Arion, and Arion does not select or guarantee them to provide a service.",
      "Responsibility for the content, recommendations, conduct and qualifications of a mentor, and for any agreement or payment between a mentor and a student, lies with those parties, and Arion is not a party to it. Arion does not currently process any payment between a mentor and a student.",
      "Mentor guidance in the fields of exercise, nutrition or health is not medical advice, and Article 9 also applies to it.",
      "The detailed conditions are set out in “Terms of use for the mentor section”, which forms an integral part of these terms. Explicit acceptance of it is required to create a mentor profile and to send a student request.",
    ],
    link: { href: MENTOR_TERMS_PATH, label: "Terms of use for the mentor section" },
  },
  {
    title: "Referral codes and sales cooperation",
    clauses: [
      "Rewards, discounts or commissions arising from a referral code or sales cooperation are only due under the conditions stated at the time of use, and are not final until the referred purchase is finalised (the end of the cancellation period).",
      "Referring yourself, referring through fake or multiple accounts, misleading advertising or any other fraudulent method will void all related rewards and, where necessary, suspend the account.",
      "A sales partner has no right to present themselves as an official representative of Arion or to make any commitment on Arion's behalf to others that falls outside these terms.",
    ],
  },
  {
    title: "Availability of the services",
    clauses: [
      "Arion makes reasonable efforts to keep the services permanently available, but does not guarantee that the services will always be free of interruptions, errors or delays.",
      "The services may be temporarily unavailable for maintenance, updates or bug fixes. Long planned outages are announced in advance where possible.",
      "Users are advised to keep a personal backup of their important data.",
    ],
  },
  {
    title: "Limitation of liability",
    clauses: [
      "Arion is in no circumstances liable for indirect, consequential or lost-profit losses of the user, including trading losses, lost opportunities, injury arising from following an exercise or diet programme, or reliance on AI-generated content and third-party data.",
      "In any case, Arion's total liability to each user, for any reason, is limited to the total amount that user paid to Arion in the three months before the event giving rise to the liability.",
      "The limitations in this article do not cover losses caused by Arion's wilful misconduct or gross negligence, and do not remove the rights that mandatory consumer protection laws recognise for the user.",
    ],
  },
  {
    title: "Suspension and termination",
    clauses: [
      "The user may stop using the services at any time or request the deletion of their account. Deleting the account does not by itself lead to a refund of the subscription, except within the framework of Article 7.",
      "If these terms are breached, Arion may, in proportion to the seriousness of the breach, first warn the user or temporarily restrict their access. For serious breaches (including intrusion or attempted intrusion, payment fraud, organised abuse or criminal activity), the account will be blocked without prior warning, and Arion has the right to pursue legal action and claim damages.",
      "If the account is blocked because of the user's breach, the remaining subscription amount is not refunded.",
      "If Arion closes the user's account or stops providing all services without the user's fault, the amount for the unused period of active subscriptions will be refunded to the user, and the user will be given a reasonable opportunity (at least 14 days) to obtain a copy of their data.",
      "A user whose account has been blocked for a breach is not permitted to create a new account.",
    ],
  },
  {
    title: "Changes to these terms",
    clauses: [
      "Arion may update these terms. A new version will be published on this page, with the date of the last revision.",
      "Material changes that alter the user's rights or obligations to their detriment will be notified to users with an active subscription by email or in-site notification at least 7 days before they take effect.",
      "A user who does not accept material changes may cancel their subscription before they take effect and receive the amount for the unused period. Continuing to use the services after the effective date means accepting the new version.",
      "Subscriptions purchased continue until the end of their term with the benefits they had at the time of purchase (in accordance with Article 6).",
    ],
  },
  {
    title: "Governing law and dispute resolution",
    clauses: [
      "These terms are subject to the laws of the Islamic Republic of Iran, and they are interpreted on the basis of those laws.",
      "If a dispute arises, the parties must first try for 30 days to resolve it amicably through negotiation and Arion support. For this purpose, the user must raise the matter in writing (through a support ticket or email).",
      "If the dispute is not resolved within this period, the competent judicial authorities of the Islamic Republic of Iran will have jurisdiction. This clause does not prevent the user from applying to the official consumer protection bodies.",
    ],
  },
  {
    title: "Force majeure",
    clauses: [
      "Arion is not liable for delay in, or failure to perform, its obligations arising from events beyond its reasonable control, including natural disasters, war, nationwide internet outages or restrictions, widespread disruption of infrastructure or the banking network, sanctions, strikes, large-scale cyberattacks, or decisions and orders of government authorities.",
      "If such an event cuts the user's access to a paid module for more than 7 consecutive days, the outage period will be added to the user's subscription after it is resolved.",
    ],
  },
  {
    title: "Contact and notices",
    clauses: [
      `The official ways to contact Arion are the support ticket system inside the user's account and the email address ${SUPPORT_EMAIL}.`,
      "Notices from Arion sent to the email address or mobile number registered on the user's account, or given through an in-site notification, are considered valid notice. Keeping contact details up to date is the user's responsibility.",
      "The user's requests (including cancellation, refunds, data deletion and objections) must be submitted through these official channels so that their date and content can be relied upon.",
    ],
  },
  {
    title: "Other provisions",
    clauses: [
      "These terms, together with the conditions stated on each plan's page at the time of purchase, form the entire agreement between the user and Arion regarding the services. In the event of conflict, the specific conditions of the plan at the time of purchase take precedence.",
      "If any clause of these terms is declared void or unenforceable by a competent authority, the other clauses remain in force, and the void clause is interpreted in the closest legally possible way to its original purpose.",
      "Failure or delay by Arion in exercising any right does not waive that right.",
      "The user has no right to transfer their rights and obligations under these terms to another party. In the event of a transfer or merger of the business, Arion may transfer these rights and obligations to its successor, while fully preserving users' rights.",
      "The official language of these terms is Persian, and where a translation exists, the Persian text is the reference.",
    ],
  },
];

export default function TermsPage() {
  const articles = isEn() ? ARTICLES_EN : ARTICLES_FA;
  const lastUpdated = isEn() ? LAST_UPDATED.en : LAST_UPDATED.fa;
  const brand = brandName();
  return (
    <section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: brand, path: "/" }, { name: tr("قوانین و مقررات", "Terms and conditions"), path: "/terms" }])) }} />
      <h1>{tr("قوانین و مقررات", "Terms and conditions")}</h1>
      <div className="dateline" style={{ marginBottom: 6 }}>
        {tr("آخرین بازنگری: ", "Last updated: ")}{lastUpdated}
      </div>
      <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--muted)", lineHeight: 2 }}>
        {tr(
          "این قوانین شرایط استفاده از آریون را تعیین می‌کند. لطفا پیش از ثبت‌نام و خرید اشتراک آن را به‌طور کامل مطالعه کنید؛ ثبت‌نام و استفاده از خدمات به معنای پذیرش کامل آن است.",
          "These terms set out the conditions for using Arion. Please read them carefully before signing up and buying a subscription. Signing up and using the services means you fully accept them.",
        )}
      </p>

      {articles.map((a, i) => (
        <article key={a.title} style={{ marginTop: 26 }}>
          <h2>{tr("ماده‌ی", "Article")} {i + 1} — {a.title}</h2>
          {a.intro && (
            <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--muted)", lineHeight: 2 }}>{a.intro}</p>
          )}
          <ol style={{ marginTop: 8, paddingInlineStart: 22, listStyleType: isEn() ? "decimal" : "persian" }}>
            {a.clauses.map((c, j) => (
              <li key={j} style={{ marginTop: 7, fontSize: 13.5, color: "var(--muted)", lineHeight: 2 }}>{c}</li>
            ))}
          </ol>
          {a.link && (
            <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 2 }}>
              <Link href={a.link.href} style={{ color: "var(--accent)" }}>{a.link.label}</Link>
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
