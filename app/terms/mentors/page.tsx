import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL, brandName } from "@/lib/brand";
import { isEn, tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { MENTOR_TERMS_PATH, MENTOR_TERMS_UPDATED_LABEL } from "@/lib/mentorTerms";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr("شرایط استفاده از بخش مربی‌ها — آریون", `Terms of use for the mentor section — ${brand}`),
    description: tr(
      "نقش آریون به‌عنوان بستر ارتباط، استقلال و مسئولیت مربی‌ها، بررسی مدارک، سلامت، پرداخت‌ها، گزارش تخلف و حل اختلاف در بخش مربی‌ها.",
      `${brand}'s role as a connecting platform, mentors' independence and responsibility, document checks, health, payments, reporting misconduct and dispute resolution in the mentor section.`,
    ),
    path: MENTOR_TERMS_PATH,
    ogTitle: tr("شرایط استفاده از بخش مربی‌ها", "Terms of use for the mentor section"),
  });
}

// نسخه‌ی انگلیسی تاریخ: برچسب فارسی در lib/mentorTerms.ts است؛ همین‌جا ترجمه می‌شود
const UPDATED_LABEL_EN = "Mehr 1405 (Jalali)";

// نسخه و تاریخ در lib/mentorTerms.ts است. تغییر ماهوی هر بند = عوض‌کردن
// MENTOR_TERMS_VERSION تا منتورها و شاگردها دوباره بپذیرند.
// مبنای حقوقی، منابع و مواردی که وکیل باید تایید کند: docs/mentor-terms-notes.md
//
// به ماده‌های «قوانین و مقررات» با نام ارجاع داده می‌شود نه شماره، تا جابه‌جایی
// شماره‌ها در آن صفحه این متن را نادرست نکند.

type Article = { title: string; intro?: string; clauses: string[] };

const ARTICLES_FA: Article[] = [
  {
    title: "تعاریف و جایگاه این شرایط",
    clauses: [
      "«بخش مربی‌ها»: امکاناتی از آریون که به کاربران اجازه می‌دهد پروفایل مربی‌گری بسازند، مربی جستجو کنند، درخواست شاگردی بدهند، برنامه دریافت کنند، پیشرفت خود را به اشتراک بگذارند، گفت‌وگو کنند و نظر ثبت کنند.",
      "«مربی»: کاربری که پروفایل مربی‌گری ساخته و به کاربران دیگر راهنمایی، آموزش یا مربیگری ارائه می‌کند.",
      "«شاگرد»: کاربری که به مربی درخواست شاگردی داده یا دعوت مربی را پذیرفته است.",
      "«خدمات مربی»: هر راهنمایی، برنامه، توصیه، پاسخ، محتوا یا خدمتی که مربی به شاگرد ارائه می‌کند، چه در آریون و چه بیرون از آن.",
      "این شرایط مکمل «قوانین و مقررات آریون» و جزء جدایی‌ناپذیر آن است. در موضوعات مربوط به بخش مربی‌ها، در صورت تعارض، این شرایط مقدم است و در سایر موارد قوانین و مقررات عمومی آریون حاکم است.",
      "ساخت یا ویرایش پروفایل مربی‌گری و ارسال درخواست شاگردی منوط به پذیرش صریح این شرایط است. تاریخ و نسخه‌ی پذیرش در حساب کاربر ثبت می‌شود.",
    ],
  },
  {
    title: "نقش آریون: فقط بستر ارتباط",
    clauses: [
      "آریون در بخش مربی‌ها صرفا بستر فنی واسط است و امکان معرفی مربی‌ها، جستجو و ارتباط میان مربی و شاگرد را فراهم می‌کند. آریون خود ارائه‌دهنده‌ی خدمات مربی نیست و مربی‌ها را برای ارائه‌ی خدمت به شاگردان انتخاب، استخدام یا تضمین نمی‌کند.",
      "مربی‌ها کارمند، کارگر، نماینده، وکیل، شریک یا عامل آریون نیستند. میان آریون و مربی هیچ رابطه‌ی استخدامی، کارگری و کارفرمایی، نمایندگی، وکالت، شراکت یا مشارکت وجود ندارد و ساخت پروفایل، انتشار آن، یا نمایش امتیاز، رتبه یا نشان احراز چنین رابطه‌ای ایجاد نمی‌کند.",
      "آریون بابت فعالیت مربی به او حقوق، دستمزد یا کمیسیون نمی‌پردازد و ساعت کار، شیوه‌ی کار یا قیمت خدمات او را تعیین نمی‌کند.",
      "مربی حق ندارد خود را کارمند، نماینده یا مربی رسمی آریون معرفی کند یا از طرف آریون وعده یا تعهدی بدهد. گفته‌ها و تعهدات مربی فقط به نام خود اوست.",
      "ترتیب نمایش و رتبه‌بندی مربی‌ها با معیارهای خودکار (مانند فعالیت، پایبندی شاگردان، نظرات تاییدشده و وضعیت احراز) انجام می‌شود و توصیه، تایید صلاحیت یا ضمانت آریون درباره‌ی هیچ مربی‌ای نیست.",
    ],
  },
  {
    title: "استقلال و مسئولیت مربی",
    clauses: [
      "مربی به‌طور مستقل و با تشخیص خود فعالیت می‌کند و به‌تنهایی مسئول محتوا، توصیه‌ها، برنامه‌ها، رفتار، صلاحیت، ادعاها و کیفیت خدمات خود است.",
      "خسارتی که از خطا، تقصیر، سهل‌انگاری، ادعای خلاف واقع یا رفتار مربی به شاگرد یا دیگران وارد شود، مطابق قواعد عمومی مسئولیت مدنی بر عهده‌ی خود مربی است.",
      "اگر شخصی به سبب خدمات یا رفتار مربی علیه آریون ادعایی مطرح کند، مربی متعهد است در رفع ادعا همکاری کند و خسارتی را که در نتیجه‌ی تخلف او به آریون وارد شده جبران کند.",
      "این ماده مسئولیت آریون را در حدود تکالیف قانونی خودش به‌عنوان بستر (ماده‌ی «محدودیت مسئولیت آریون» همین شرایط) از بین نمی‌برد.",
    ],
  },
  {
    title: "پرداخت‌ها و توافق‌های میان مربی و شاگرد",
    clauses: [
      "آریون در حال حاضر هیچ وجهی بابت خدمات مربی دریافت، نگهداری یا پردازش نمی‌کند. هر مبلغی که کاربر به آریون می‌پردازد فقط بابت امکانات خود آریون است و شامل خدمات هیچ مربی‌ای نیست.",
      "هر قرار، قیمت، پرداخت، تخفیف یا بازگشت وجهی که میان مربی و شاگرد توافق شود، رابطه‌ای مستقیم میان خود آن دو است و آریون طرف آن نیست. اجرای تعهد و بازگرداندن هر وجه بر عهده‌ی کسی است که آن را دریافت کرده یا متعهد شده است.",
      "پیش از هر پرداخت به مربی، مبلغ، مدت، آنچه ارائه می‌شود و شرایط بازگشت وجه را به‌صورت مکتوب مشخص کنید و از روش پرداخت قابل پیگیری استفاده کنید. آریون هیچ‌گاه از شما نمی‌خواهد به نام آریون وجهی به حساب مربی یا شخص دیگری واریز کنید.",
      "اگر آریون در آینده امکان پرداخت به مربی را در خود سایت ارائه کند، شرایط آن جداگانه اعلام می‌شود و فقط پس از پذیرش صریح کاربر اعمال می‌شود.",
      "مربی مسئول صدور رسید برای دریافتی‌های خود، رعایت قوانین مالیاتی و سایر تکالیف قانونی مربوط به درآمد و فعالیتش است.",
    ],
  },
  {
    title: "بررسی مدارک و نشان احراز",
    clauses: [
      "آریون ممکن است مدارک هویتی یا تخصصی‌ای را که مربی بارگذاری می‌کند بررسی کند. این بررسی محدود به تطبیق ظاهری مدرک با اطلاعات پروفایل در زمان بررسی است و، مگر آنکه صریحا خلاف آن اعلام شود، از طریق استعلام از مرجع صادرکننده انجام نمی‌شود.",
      "نشان «احراز شده» فقط نشان می‌دهد که مدرکی با شرایط بند 1 همین ماده دیده شده است. این نشان تایید صلاحیت علمی، حرفه‌ای یا اخلاقی مربی، اصالت قطعی مدرک یا تضمین کیفیت خدمات او نیست. مدرک ممکن است پس از بررسی باطل، منقضی یا تعلیق شده باشد.",
      "آریون می‌تواند در هر زمان مدارک را دوباره بررسی کند و در صورت تردید، نشان احراز را بردارد.",
      "بارگذاری مدرک جعلی، متعلق به دیگری یا گمراه‌کننده تخلف شدید است و علاوه بر تعلیق، ممکن است به مراجع صالح اعلام شود.",
    ],
  },
  {
    title: "تعهدات مربی",
    intro: "مربی با ساخت پروفایل متعهد می‌شود:",
    clauses: [
      "حداقل 18 سال تمام داشته باشد.",
      "اطلاعات پروفایل خود، از جمله نام، عنوان، سوابق، تخصص‌ها و مدارک، را صادقانه، دقیق و به‌روز نگه دارد و ادعایی درباره‌ی تجربه، مدرک یا نتیجه‌ی کار نکند که نتواند اثبات کند.",
      "فقط مدارک معتبر و متعلق به خود را بارگذاری کند و اگر مدرکی باطل، منقضی یا تعلیق شد، آن را از پروفایل بردارد.",
      "قوانین جمهوری اسلامی ایران و مقررات صنفی و حرفه‌ای حوزه‌ی کار خود را رعایت کند و هر مجوز یا پروانه‌ای را که قانون برای خدمت او لازم می‌داند داشته باشد.",
      "در حدود تخصص خود بماند و شاگرد را در موضوعات خارج از تخصصش، به‌ویژه موضوعات پزشکی، به متخصص مربوط ارجاع دهد.",
      "به شاگرد وعده‌ی نتیجه‌ی قطعی، مانند کاهش وزن معین در زمان معین، قبولی قطعی یا سود تضمینی، ندهد.",
      "اطلاعاتی را که شاگرد در اختیارش می‌گذارد، از جمله برنامه‌ها، پیشرفت و اطلاعات سلامت، محرمانه نگه دارد، فقط برای همان راهنمایی به کار ببرد و بدون رضایت صریح شاگرد منتشر نکند یا به دیگری ندهد.",
      "با شاگردان رفتار محترمانه و حرفه‌ای داشته باشد.",
    ],
  },
  {
    title: "مسئولیت شاگرد",
    clauses: [
      "شروع همکاری با یک مربی، ادامه یا پایان رابطه و عمل به توصیه‌های او با تصمیم خود شاگرد است.",
      "پیش از شروع رابطه، و به‌ویژه پیش از هر پرداخت، سوابق، مدارک، نظرات و شرایط مربی را خودتان بررسی کنید. امتیاز، رتبه و نظرات دیگران بازتاب تجربه‌ی آن‌هاست و برای شما تضمین نیست.",
      "هر زمان رابطه را مفید ندانستید، می‌توانید آن را از همین بخش پایان دهید، مربی را مسدود کنید یا آنچه با او به اشتراک گذاشته‌اید را تغییر دهید.",
      "آنچه با مربی به اشتراک می‌گذارید با تصمیم خود شماست. فقط به اندازه‌ای که برای راهنمایی لازم است اطلاعات بدهید.",
    ],
  },
  {
    title: "سلامت، تغذیه و امور مالی",
    clauses: [
      "راهنمایی مربی درباره‌ی ورزش، تغذیه، خواب، سلامت روان یا هر موضوع مرتبط با سلامت، توصیه، تشخیص یا درمان پزشکی نیست و جایگزین پزشک، متخصص تغذیه، روان‌شناس یا سایر صاحبان حرف پزشکی دارای پروانه نمی‌شود.",
      "پیش از شروع هر برنامه‌ی ورزشی یا غذایی، به‌ویژه در صورت بیماری، بارداری، آسیب‌دیدگی یا مصرف دارو، با پزشک مشورت کنید. اگر هنگام اجرای برنامه دچار درد، علائم غیرعادی یا مشکل سلامتی شدید، برنامه را متوقف کنید و به پزشک یا اورژانس (115) مراجعه کنید.",
      "مربی‌ای که پروانه‌ی لازم را ندارد، حق تشخیص یا درمان بیماری، تجویز دارو یا مکمل، یا معرفی خود به‌عنوان پزشک یا متخصص را ندارد.",
      "راهنمایی مربی درباره‌ی بازارهای مالی یا سرمایه‌گذاری، مشاوره‌ی سرمایه‌گذاری آریون نیست و تصمیم مالی و سود و زیان آن با خود کاربر است.",
    ],
  },
  {
    title: "رفتارهای ممنوع",
    intro: "در بخش مربی‌ها موارد زیر ممنوع است و موجب اقدام مطابق ماده‌ی «تعلیق و خاتمه» می‌شود:",
    clauses: [
      "درخواست یا دریافت وجه به نام آریون، یا این ادعا که آریون پرداخت یا خدمات مربی را تضمین می‌کند.",
      "کلاهبرداری، دریافت پیش‌پرداخت بدون قصد ارائه‌ی خدمت، یا وادار کردن طرف مقابل به پرداخت بیرون از توافق روشن.",
      "دریافت وجه یا دسترسی به حساب بانکی، کارگزاری یا معاملاتی شاگرد برای مدیریت سرمایه یا وعده‌ی سود.",
      "درخواست رمز عبور، کد تایید یا اطلاعات کارت بانکی از طرف مقابل.",
      "آزار، تهدید، توهین، تبعیض، مزاحمت، ارسال محتوای جنسی یا نامناسب، یا ادامه‌ی تماس پس از مسدود شدن یا درخواست قطع ارتباط.",
      "انتشار یا افشای اطلاعات شخصی طرف مقابل، از جمله شماره‌ی تماس، نشانی، تصویر، اطلاعات سلامت یا متن گفت‌وگو، بدون رضایت صریح او.",
      "ثبت نظر جعلی، خرید یا مبادله‌ی نظر، ساخت حساب‌های متعدد یا هر روش دیگری برای دستکاری امتیاز و رتبه.",
      "ارائه‌ی خدمتی که قانون برای آن پروانه لازم دانسته، بدون داشتن پروانه.",
      "جعل هویت یا استفاده از نام یا مدرک دیگری.",
    ],
  },
  {
    title: "حریم خصوصی، گفت‌وگو و گزارش تخلف",
    clauses: [
      "گفت‌وگو، پیام گروهی و یادداشت خصوصی مربی در آریون رمزگذاری سرتاسری دارد: متن آن‌ها فقط روی دستگاه طرفین خوانده می‌شود و آریون و مدیران آن به متن پیام‌ها دسترسی ندارند و نمی‌توانند آن را بازیابی کنند.",
      "به همین دلیل آریون محتوای گفت‌وگوها را پایش نمی‌کند و از آن آگاه نیست. تنها استثنا پیام‌هایی است که یکی از طرفین گفت‌وگو خودش گزارش کند؛ در این حالت متن همان پیام‌ها، همراه با اثبات فنی اینکه واقعا فرستاده شده‌اند، برای رسیدگی در اختیار آریون قرار می‌گیرد.",
      "اطلاعات غیرمحتوایی، مانند طرفین رابطه، زمان پیام‌ها، وضعیت رابطه، برنامه‌ها و گزارش‌ها، برای ارائه‌ی خدمت و امنیت نگهداری می‌شود و فقط مطابق ماده‌ی «حریم خصوصی و حفاظت از داده‌ها» در قوانین و مقررات آریون، از جمله به دستور مراجع صالح، افشا می‌شود.",
      "برای گزارش تخلف از گزینه‌ی گزارش در پروفایل مربی، رابطه، برنامه یا پیام، یا از پشتیبانی استفاده کنید. آریون گزارش‌ها را بررسی می‌کند و متناسب با شدت موضوع اقدام می‌کند، از جمله با حذف محتوا، خارج کردن پروفایل از جستجو یا تعلیق حساب.",
      "هرگاه آریون از وجود محتوای مجرمانه آگاه شود یا مرجع صالح دستور دهد، مطابق قانون دسترسی به آن را قطع می‌کند و در صورت لزوم موضوع را به مراجع ذی‌صلاح اعلام می‌کند.",
      "اگر با تهدید، اخاذی یا کلاهبرداری روبه‌رو شدید، علاوه بر گزارش در آریون، به پلیس فتا یا مراجع قضایی مراجعه کنید.",
    ],
  },
  {
    title: "اختلاف میان مربی و شاگرد",
    clauses: [
      "اختلاف درباره‌ی کیفیت خدمات، پرداخت، بازگشت وجه یا هر تعهد دیگر میان مربی و شاگرد، اختلافی میان خود آن دو است و آریون طرف آن نیست.",
      "آریون می‌تواند به درخواست هر یک از طرفین و با حسن نیت برای حل دوستانه‌ی اختلاف کمک کند، اما داوری نمی‌کند، تصمیم الزام‌آور نمی‌گیرد و تعهدی به نتیجه ندارد. این کمک به معنای پذیرش مسئولیت یا ورود آریون به توافق طرفین نیست.",
      "طرفین می‌توانند برای پیگیری حق خود به مراجع صالح قضایی یا سایر مراجع قانونی مراجعه کنند. آریون به دستور مرجع صالح، اطلاعات موجود را مطابق قانون ارائه می‌کند؛ متن گفت‌وگوهای رمزگذاری‌شده، جز پیام‌های گزارش‌شده، نزد آریون نیست.",
    ],
  },
  {
    title: "محدودیت مسئولیت آریون",
    clauses: [
      "از آنجا که آریون طرف رابطه‌ی مربی و شاگرد نیست، مسئولیتی در قبال خدمات مربی، محتوا و توصیه‌های او، رفتار او، یا توافق‌ها و پرداخت‌های میان مربی و شاگرد ندارد.",
      "مسئولیت آریون در این بخش، انجام تکالیف خودش به‌عنوان بستر است: ارائه‌ی امکانات بخش مربی‌ها مطابق توضیحات اعلام‌شده، حفاظت متعارف از داده‌ها، رسیدگی به گزارش‌ها مطابق این شرایط، و اجرای دستورهای قانونی مراجع صالح.",
      "این ماده و ماده‌ی «محدودیت مسئولیت» قوانین و مقررات آریون شامل خسارت ناشی از تقصیر عمدی یا تقصیر سنگین آریون نمی‌شود و حقوقی را که قوانین آمره، از جمله قوانین حمایت از مصرف‌کننده و قانون تجارت الکترونیکی، برای کاربر شناخته‌اند سلب نمی‌کند.",
    ],
  },
  {
    title: "تعلیق و خاتمه",
    clauses: [
      "در صورت نقض این شرایط، گزارش معتبر، مدرک خلاف واقع یا خطر برای کاربران، آریون می‌تواند متناسب با شدت موضوع اخطار دهد، نشان احراز را بردارد، پروفایل را از جستجو خارج کند، پذیرش شاگرد را متوقف کند، حساب مربی‌گری را تعلیق کند یا دسترسی کاربر را مطابق قوانین و مقررات آریون محدود کند.",
      "در موارد فوری، مانند کلاهبرداری، تهدید یا خطر جانی، این اقدام ممکن است بدون اخطار قبلی و به‌طور موقت تا پایان بررسی انجام شود. دلیل اقدام، تا جایی که امنیت دیگران یا روند رسیدگی را به خطر نیندازد، به کاربر اعلام می‌شود و او می‌تواند از طریق پشتیبانی اعتراض کند.",
      "مربی و شاگرد می‌توانند در هر زمان رابطه را پایان دهند و مربی می‌تواند در هر زمان پروفایل خود را از جستجو خارج کند. پایان رابطه یا تعلیق، تعهداتی را که پیش‌تر میان مربی و شاگرد ایجاد شده از بین نمی‌برد.",
    ],
  },
  {
    title: "کاربران کمتر از 18 سال",
    clauses: [
      "ساخت پروفایل مربی‌گری فقط برای اشخاص دارای حداقل 18 سال تمام مجاز است.",
      "شاگرد کمتر از 18 سال فقط با اطلاع، رضایت و نظارت ولی یا سرپرست قانونی خود از این بخش استفاده می‌کند و بدون رضایت او پرداختی انجام نمی‌دهد.",
      "مربی‌ای که می‌داند شاگردش کمتر از 18 سال است، نباید بدون اطلاع ولی یا سرپرست او وجهی دریافت کند یا با او بیرون از آریون ارتباط برقرار کند.",
    ],
  },
  {
    title: "تغییر این شرایط",
    clauses: [
      "آریون می‌تواند این شرایط را به‌روزرسانی کند. نسخه‌ی جدید با تاریخ آخرین بازنگری در همین صفحه منتشر می‌شود.",
      "پس از هر تغییر ماهوی، مربی برای ذخیره‌ی بعدی پروفایل و شاگرد برای درخواست شاگردی بعدی باید نسخه‌ی جدید را دوباره بپذیرد. مربی‌ای که نسخه‌ی جدید را نمی‌پذیرد، بدون نیاز به پذیرش می‌تواند پروفایل خود را از جستجو خارج کند و پذیرش شاگرد را متوقف کند.",
      "توافق‌هایی که پیش از تغییر میان مربی و شاگرد شکل گرفته، تابع توافق خود آن‌هاست و تغییر این شرایط در آن‌ها دخالت نمی‌کند، مگر در قواعد استفاده از خود آریون.",
    ],
  },
  {
    title: "قانون حاکم و مرجع رسیدگی",
    clauses: [
      "این شرایط تابع قوانین جمهوری اسلامی ایران است.",
      "اختلاف میان کاربر و آریون درباره‌ی این شرایط مطابق ماده‌ی «قانون حاکم و حل اختلاف» قوانین و مقررات آریون حل می‌شود: ابتدا مذاکره از طریق پشتیبانی و سپس مراجع صالح قضایی جمهوری اسلامی ایران. این بند مانع مراجعه‌ی کاربر به مراجع رسمی حمایت از مصرف‌کننده نیست.",
      "اختلاف میان مربی و شاگرد در مراجع صالح قضایی جمهوری اسلامی ایران یا هر مرجعی که خود طرفین به‌طور قانونی توافق کنند رسیدگی می‌شود.",
      "اگر بندی از این شرایط به حکم مرجع صالح باطل یا غیرقابل اجرا شناخته شود، سایر بندها معتبر می‌ماند.",
      `راه‌های رسمی ارتباط با آریون درباره‌ی این شرایط، سامانه‌ی تیکت پشتیبانی داخل حساب کاربری و ایمیل ${SUPPORT_EMAIL} است.`,
    ],
  },
];

// نسخه‌ی انگلیسی بندها: ساختار و شماره‌ی مواد دقیقا با ARTICLES_FA یکی است.
const ARTICLES_EN: Article[] = [
  {
    title: "Definitions and status of these terms",
    clauses: [
      "“Mentor section”: the features of Arion that allow users to create mentoring profiles, search for a mentor, request to be a student, receive programmes, share their progress, chat and leave reviews.",
      "“Mentor”: a user who has created a mentoring profile and offers guidance, training or coaching to other users.",
      "“Student”: a user who has requested to be a student of a mentor or accepted a mentor's invitation.",
      "“Mentor service”: any guidance, programme, recommendation, answer, content or service that a mentor provides to a student, whether on Arion or outside it.",
      "These terms supplement the “Arion Terms and Conditions” and form an integral part of them. On matters relating to the mentor section, in case of conflict these terms prevail; in all other matters the general Arion terms apply.",
      "Creating or editing a mentoring profile and sending a student request requires explicit acceptance of these terms. The date and version of acceptance are recorded on the user's account.",
    ],
  },
  {
    title: "Arion's role: a connecting platform only",
    clauses: [
      "In the mentor section, Arion is only a technical intermediary platform, providing the means to introduce mentors, search and communicate between mentor and student. Arion is not itself a provider of mentor services, and it does not select, hire or guarantee mentors to provide services to students.",
      "Mentors are not employees, workers, representatives, lawyers, partners or agents of Arion. There is no employment, labour or employer relationship, representation, agency, partnership or joint venture between Arion and a mentor, and creating a profile, publishing it, or showing a rating, rank or verification badge does not create any such relationship.",
      "Arion does not pay a mentor salary, wages or commission for their activity, and does not set their working hours, method of work or service prices.",
      "A mentor must not present themselves as an employee, representative or official mentor of Arion, or make any promise or commitment on Arion's behalf. A mentor's statements and commitments are made only in their own name.",
      "The order in which mentors are shown and ranked is determined by automatic criteria (such as activity, student consistency, approved reviews and verification status), and does not amount to a recommendation, confirmation of competence or guarantee by Arion regarding any mentor.",
    ],
  },
  {
    title: "Independence and responsibility of the mentor",
    clauses: [
      "The mentor operates independently and on their own judgement, and is solely responsible for their content, recommendations, programmes, conduct, qualifications, claims and the quality of their services.",
      "Losses arising from error, fault, negligence, a false claim or the mentor's conduct towards a student or others are the mentor's own responsibility under the general rules of civil liability.",
      "If any person brings a claim against Arion because of a mentor's services or conduct, the mentor undertakes to cooperate in resolving the claim and to compensate Arion for any loss caused to it as a result of the mentor's breach.",
      "This article does not remove Arion's liability within the limits of its own legal duties as a platform (as set out in the “Limitation of Arion's liability” article of these terms).",
    ],
  },
  {
    title: "Payments and agreements between mentor and student",
    clauses: [
      "Arion currently does not receive, hold or process any money for mentor services. Any amount a user pays to Arion is solely for Arion's own features and does not include any mentor's services.",
      "Any arrangement, price, payment, discount or refund agreed between a mentor and a student is a direct relationship between those two parties alone, and Arion is not a party to it. Performance of the obligation and the return of any amount is the responsibility of whoever received it or undertook the obligation.",
      "Before any payment to a mentor, specify in writing the amount, the duration, what is being provided and the refund conditions, and use a traceable payment method. Arion will never ask you to transfer money on its behalf to a mentor's account or to any other person's account.",
      "If Arion offers the ability to pay mentors within the site in future, its conditions will be announced separately and will apply only after the user's explicit acceptance.",
      "The mentor is responsible for issuing receipts for their earnings, complying with tax rules and any other legal obligations relating to their income and activity.",
    ],
  },
  {
    title: "Document checks and verification badge",
    clauses: [
      "Arion may check identity or professional documents uploaded by a mentor. This check is limited to comparing the document's appearance with the profile information at the time of review and, unless expressly stated otherwise, does not involve verification with the issuing authority.",
      "The “Verified” badge only shows that a document meeting the conditions of clause 1 of this article has been seen. It is not confirmation of the mentor's scientific, professional or ethical competence, a definitive guarantee that the document is authentic, or a guarantee of the quality of their services. A document may later be voided, expire or be suspended after review.",
      "Arion may review documents again at any time and, if in doubt, remove the verification badge.",
      "Uploading a forged, someone else's or misleading document is a serious breach, and in addition to suspension it may be reported to the competent authorities.",
    ],
  },
  {
    title: "Mentor's obligations",
    intro: "By creating a profile, the mentor undertakes:",
    clauses: [
      "To be at least 18 years of age.",
      "To keep their profile information, including name, title, background, areas of expertise and documents, honest, accurate and up to date, and not to make any claim about experience, qualifications or results that they cannot prove.",
      "To upload only valid documents that belong to them, and if a document is voided, expires or is suspended, to remove it from their profile.",
      "To comply with the laws of the Islamic Republic of Iran and the professional and trade regulations of their field, and to hold any licence or permit that the law requires for their service.",
      "To stay within their area of expertise and to refer students to the relevant specialist for matters outside it, especially medical matters.",
      "Not to promise students a definite result, such as a specific weight loss in a specific time, a guaranteed pass or a guaranteed profit.",
      "To keep confidential the information a student shares, including programmes, progress and health information, to use it only for that guidance, and not to publish it or pass it to anyone else without the student's explicit consent.",
      "To behave respectfully and professionally towards students.",
    ],
  },
  {
    title: "Student's responsibility",
    clauses: [
      "Starting work with a mentor, continuing or ending the relationship, and acting on their recommendations are the student's own decisions.",
      "Before starting a relationship, and especially before any payment, check the mentor's background, documents, reviews and terms yourself. Ratings, ranks and other people's reviews reflect their experience and are not a guarantee for you.",
      "If you feel the relationship is not useful at any time, you may end it from this section, block the mentor, or change what you have shared with them.",
      "What you share with a mentor is your own decision. Give only the information that is necessary for the guidance.",
    ],
  },
  {
    title: "Health, nutrition and finance",
    clauses: [
      "A mentor's guidance on exercise, nutrition, sleep, mental health or any health-related matter is not medical advice, diagnosis or treatment, and does not replace a doctor, a dietitian, a psychologist or other licensed health professionals.",
      "Consult a doctor before starting any exercise or diet programme, especially if you have an illness, are pregnant, have an injury or take medication. If you experience pain, unusual symptoms or a serious health problem while following a programme, stop the programme and see a doctor or go to the emergency service (115).",
      "A mentor who does not hold the required licence has no right to diagnose or treat illness, prescribe medicine or supplements, or present themselves as a doctor or a specialist.",
      "A mentor's guidance on financial markets or investment is not investment advice from Arion, and the financial decision and resulting profit or loss rest with the user.",
    ],
  },
  {
    title: "Prohibited conduct",
    intro: "The following are prohibited in the mentor section and will result in action under the “Suspension and termination” article:",
    clauses: [
      "Requesting or receiving money in Arion's name, or claiming that Arion guarantees payment or a mentor's services.",
      "Fraud, taking advance payment without intending to provide the service, or pressuring the other party into paying outside a clear agreement.",
      "Receiving money, or access to a student's bank, brokerage or trading account, to manage capital or to promise a profit.",
      "Requesting a password, verification code or bank card details from the other party.",
      "Harassment, threats, insults, discrimination, pestering, sending sexual or inappropriate content, or continuing contact after being blocked or asked to stop.",
      "Publishing or disclosing the other party's personal information, including phone number, address, picture, health information or conversation text, without their explicit consent.",
      "Posting fake reviews, buying or trading reviews, creating multiple accounts, or any other method of manipulating ratings and rank.",
      "Providing a service for which the law requires a licence, without holding that licence.",
      "Impersonating another person or using another person's name or qualifications.",
    ],
  },
  {
    title: "Privacy, conversations and reporting misconduct",
    clauses: [
      "Conversations, group messages and a mentor's private notes on Arion are protected by end-to-end encryption: their text is read only on the parties' own devices, and Arion and its administrators cannot access the text of messages or recover it.",
      "For this reason, Arion does not monitor the content of conversations and is not aware of it. The only exception is messages reported by one of the parties to the conversation; in that case the text of those messages, together with technical proof that they were really sent, is made available to Arion for review.",
      "Non-content information, such as who the parties are, when messages were sent, the state of the relationship, programmes and reports, is kept to provide the service and for security. It is disclosed only in line with the “Privacy and data protection” article of the Arion terms and conditions, including on the order of competent authorities.",
      "To report misconduct, use the report option on the mentor's profile, a relationship, a programme or a message, or contact support. Arion reviews reports and acts in proportion to the seriousness of the matter, including by removing content, taking a profile out of search or suspending the account.",
      "Where Arion becomes aware of criminal content or a competent authority orders it, it will restrict access to that content in accordance with the law and, where necessary, report the matter to the competent authorities.",
      "If you face threats, extortion or fraud, report it on Arion and also go to the cyber police (FATA) or the judicial authorities.",
    ],
  },
  {
    title: "Disputes between mentor and student",
    clauses: [
      "A dispute about the quality of services, payment, refunds or any other obligation between a mentor and a student is a dispute between those two alone, and Arion is not a party to it.",
      "At the request of either party, and in good faith, Arion may help to resolve the dispute amicably, but it does not arbitrate, does not make a binding decision and does not undertake to achieve any outcome. Such help does not mean that Arion accepts responsibility or enters into the parties' agreement.",
      "The parties may apply to the competent judicial or other legal authorities to pursue their rights. On the order of a competent authority, Arion provides the information it holds in line with the law; the text of encrypted conversations, except reported messages, is not held by Arion.",
    ],
  },
  {
    title: "Limitation of Arion's liability",
    clauses: [
      "Because Arion is not a party to the mentor–student relationship, it has no liability for the mentor's services, content and recommendations, their conduct, or the agreements and payments between mentor and student.",
      "Arion's responsibility in this section is limited to performing its own duties as a platform: providing the mentor section's features as described, reasonable protection of data, handling reports in line with these terms, and complying with lawful orders of competent authorities.",
      "This article and the “Limitation of liability” article of the Arion terms and conditions do not cover losses caused by Arion's wilful misconduct or gross negligence, and do not remove the rights that mandatory laws, including consumer protection laws and the Electronic Commerce Law, recognise for the user.",
    ],
  },
  {
    title: "Suspension and termination",
    clauses: [
      "If these terms are breached, or a credible report, a false document or a risk to users comes to light, Arion may, in proportion to the seriousness of the matter, issue a warning, remove the verification badge, take the profile out of search, stop student acceptance, suspend the mentoring account or restrict the user's access in line with the Arion terms and conditions.",
      "In urgent cases, such as fraud, threats or risk to life, this action may be taken without prior warning and temporarily until the review is complete. The reason for the action is given to the user, as far as this does not endanger others' safety or the review process, and the user may object through support.",
      "A mentor and a student may end the relationship at any time, and a mentor may take their profile out of search at any time. Ending a relationship or a suspension does not cancel obligations already created between mentor and student.",
    ],
  },
  {
    title: "Users under 18",
    clauses: [
      "Creating a mentoring profile is permitted only for persons who are at least 18 years of age.",
      "A student under 18 may use this section only with the knowledge, consent and supervision of their parent or legal guardian, and no payment is made without their consent.",
      "A mentor who knows their student is under 18 must not receive money, or communicate with that student outside Arion, without the knowledge of the student's parent or guardian.",
    ],
  },
  {
    title: "Changes to these terms",
    clauses: [
      "Arion may update these terms. The new version will be published on this page with the date of the last revision.",
      "After any material change, a mentor must accept the new version before their next profile save, and a student must accept it before their next student request. A mentor who does not accept the new version may, without needing to accept it, take their profile out of search and stop accepting students.",
      "Agreements made between mentor and student before a change are governed by their own agreement, and changes to these terms do not interfere with them, except within the rules for using Arion itself.",
    ],
  },
  {
    title: "Governing law and competent authority",
    clauses: [
      "These terms are subject to the laws of the Islamic Republic of Iran.",
      "A dispute between a user and Arion about these terms is resolved in line with the “Governing law and dispute resolution” article of the Arion terms and conditions: first negotiation through support, and then the competent judicial authorities of the Islamic Republic of Iran. This clause does not prevent the user from applying to the official consumer protection bodies.",
      "A dispute between a mentor and a student is heard by the competent judicial authorities of the Islamic Republic of Iran, or any authority the parties have lawfully agreed on.",
      "If a clause of these terms is declared void or unenforceable by a competent authority, the other clauses remain valid.",
      `The official ways to contact Arion about these terms are the support ticket system inside the user's account and the email address ${SUPPORT_EMAIL}.`,
    ],
  },
];

export default function MentorTermsPage() {
  const articles = isEn() ? ARTICLES_EN : ARTICLES_FA;
  const brand = brandName();
  return (
    <section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: brand, path: "/" }, { name: tr("قوانین و مقررات", "Terms and conditions"), path: "/terms" }, { name: tr("شرایط بخش مربی‌ها", "Terms of use for the mentor section"), path: MENTOR_TERMS_PATH }])) }} />
      <h1>{tr("شرایط استفاده از بخش مربی‌ها", "Terms of use for the mentor section")}</h1>
      <div className="dateline" style={{ marginBottom: 6 }}>
        {tr("آخرین بازنگری: ", "Last updated: ")}{isEn() ? UPDATED_LABEL_EN : MENTOR_TERMS_UPDATED_LABEL}
      </div>
      <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--muted)", lineHeight: isEn() ? 1.7 : 2 }}>
        {tr(
          "آریون فقط بستر ارتباط میان مربی و شاگرد است. مربی‌ها کاربران مستقل‌اند، از طرف آریون کار نمی‌کنند و مسئولیت خدماتشان با خودشان است. این شرایط مکمل",
          "Arion is only the connecting platform between mentor and student. Mentors are independent users, do not work on Arion's behalf, and are responsible for their own services. These terms supplement the",
        )}{" "}
        <Link href="/terms" style={{ color: "var(--accent)" }}>
          {tr("قوانین و مقررات آریون", "Arion Terms and Conditions")}
        </Link>{" "}
        {tr("است.", ".")}
      </p>

      {articles.map((a, i) => (
        <article key={a.title} style={{ marginTop: 26 }}>
          <h2>{tr("ماده‌ی", "Article")} {i + 1} — {a.title}</h2>
          {a.intro && (
            <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--muted)", lineHeight: isEn() ? 1.7 : 2 }}>{a.intro}</p>
          )}
          <ol style={{ marginTop: 8, paddingInlineStart: 22, listStyleType: isEn() ? "decimal" : "persian" }}>
            {a.clauses.map((c, j) => (
              <li key={j} style={{ marginTop: 7, fontSize: 13.5, color: "var(--muted)", lineHeight: isEn() ? 1.7 : 2 }}>{c}</li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
