import type { Metadata } from "next";
import { ToolPageShell } from "@/components/ToolPageShell";
import { ToolLotSizeCalculator } from "@/components/ToolLotSizeCalculator";
import type { SeoFaq, SeoSection } from "@/components/SeoLanding";
import { brandName } from "@/lib/brand";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";
import { webApplicationJsonLd } from "@/lib/toolsSeo";
import { tr } from "@/lib/i18n";

const PATH = "/tools/lot-size-calculator";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: tr(`محاسبه حجم لات فارکس بر اساس ریسک | ${brandName()}`, `Forex lot size calculator based on risk | ${brandName()}`),
    description:
      tr("ماشین‌حساب رایگان حجم لات فارکس: موجودی، درصد ریسک و حد ضرر به پیپ را وارد کن تا لات مناسب، ریسک واقعی به دلار و ارزش هر پیپ را ببینی.", "Free forex lot size calculator: enter your balance, risk percentage and stop loss in pips to see the right lot size, the actual risk in dollars and the value of each pip."),
    path: PATH,
  });
}

const faqs = (): SeoFaq[] => [
  {
    q: tr("لات در فارکس یعنی چه؟", "What does lot mean in forex?"),
    a: tr("لات واحد حجم معامله است. یک لات استاندارد معمولا برابر 100000 واحد از ارز پایه است. ده صدم آن 0.10 لات و یک صدم آن 0.01 لات (میکرولات) نام دارد.", "A lot is the unit of trade size. One standard lot is usually 100,000 units of the base currency. One tenth of it is 0.10 lot and one hundredth is 0.01 lot (a micro lot)."),
  },
  {
    q: tr("حجم لات چطور از ریسک محاسبه می‌شود؟", "How is lot size calculated from risk?"),
    a: tr("ابتدا مبلغ ریسک را از موجودی و درصد ریسک به دست می‌آوریم. بعد آن را بر حاصل ضرب حد ضرر (به پیپ) در ارزش هر پیپ برای یک لات تقسیم می‌کنیم.", "First we get the risk amount from your balance and risk percentage. Then we divide it by the product of the stop loss (in pips) and the value of each pip for one lot."),
  },
  {
    q: tr("ارزش هر پیپ چقدر است؟", "How much is each pip worth?"),
    a: tr("در جفت‌ارزهایی که دلار ارز دوم آنهاست (مثل EURUSD)، برای یک لات استاندارد هر پیپ حدود 10 دلار ارزش دارد. در جفت‌ارزهای دیگر، ارزش پیپ به قیمت روز بستگی دارد.", "In pairs where the dollar is the second currency (such as EURUSD), each pip is worth about 10 dollars for one standard lot. In other pairs, the pip value depends on the current price."),
  },
  {
    q: tr("درصد ریسک مناسب هر معامله چقدر است؟", "What is a suitable risk percentage per trade?"),
    a: tr("عدد قطعی وجود ندارد، اما بسیاری از معامله‌گران ریسک هر معامله را در حدود 1 تا 2 درصد موجودی نگه می‌دارند تا چند ضرر پشت هم حساب را نابود نکند. این توصیه‌ی سرمایه‌گذاری نیست.", "There is no definitive number, but many traders keep the risk of each trade at about 1 to 2 percent of the balance so that a few losses in a row do not wreck the account. This is not investment advice."),
  },
  {
    q: tr("چرا عدد بروکر من کمی فرق دارد؟", "Why is my broker's number slightly different?"),
    a: tr("اندازه‌ی قرارداد، تعریف پیپ برای طلا و شاخص‌ها، تعداد رقم اعشار و حداقل گام لات در بروکرها فرق می‌کند. همیشه قبل از ورود عدد را با ماشین‌حساب یا مشخصات نماد در بروکر خودت چک کن.", "Contract size, the pip definition for gold and indices, the number of decimal places and the minimum lot step differ between brokers. Always check the number with your own broker's calculator or the symbol specifications before entering."),
  },
];

const sections = (): SeoSection[] => [
  {
    title: tr("حجم لات چطور حساب می‌شود؟", "How is lot size calculated?"),
    paragraphs: [
      tr("مدیریت سرمایه یعنی قبل از ورود بدانی اگر حد ضرر خورد، چقدر از حسابت کم می‌شود. حجم لات ابزاری است که این ریسک را کنترل می‌کند: حد ضرر دورتر یعنی لات کمتر، حد ضرر نزدیک‌تر یعنی لات بیشتر، اما مبلغ ریسک ثابت می‌ماند.", "Money management means knowing before you enter how much your account will lose if the stop loss is hit. Lot size is the tool that controls this risk: a wider stop loss means a smaller lot, a closer stop loss means a bigger lot, but the risk amount stays fixed."),
      tr("این ابزار حجم را بر پایه‌ی ریسک می‌سازد، نه بر پایه‌ی حدس. ورودی‌ها موجودی حساب (به دلار)، ریسک (درصد یا مبلغ ثابت)، حد ضرر به پیپ و نماد هستند.", "This tool builds the size on risk, not on guesswork. The inputs are the account balance (in dollars), the risk (a percentage or a fixed amount), the stop loss in pips and the symbol."),
    ],
  },
  {
    title: tr("فرمول", "Formula"),
    bullets: [
      { title: tr("مبلغ ریسک", "Risk amount"), body: tr("موجودی ضرب در درصد ریسک تقسیم بر 100. یا اگر مبلغ ثابت انتخاب کنی، خود آن مبلغ.", "Balance times the risk percentage divided by 100. Or, if you choose a fixed amount, that amount itself.") },
      { title: tr("حجم لات", "Lot size"), body: tr("مبلغ ریسک تقسیم بر (حد ضرر به پیپ ضرب در ارزش هر پیپ برای یک لات).", "The risk amount divided by (stop loss in pips times the value of each pip for one lot).") },
      { title: tr("مثال", "Example"), body: tr("موجودی 10000 دلار، ریسک 1 درصد (یعنی 100 دلار)، حد ضرر 20 پیپ روی EURUSD با ارزش پیپ 10 دلار: 100 تقسیم بر 200 برابر 0.50 لات.", "A balance of 10,000 dollars, 1 percent risk (that is 100 dollars), a 20-pip stop loss on EURUSD with a pip value of 10 dollars: 100 divided by 200 equals 0.50 lot.") },
    ],
  },
  {
    title: tr("نتیجه را چطور بخوانیم؟", "How to read the result"),
    paragraphs: [
      tr("عدد اصلی حجم پیشنهادی است که به پایین و به گام 0.01 گرد می‌شود تا ریسک واقعی هرگز از ریسک خواسته‌شده بیشتر نشود. ریسک واقعی و ارزش هر پیپ برای یک لات هم کنار آن نشان داده می‌شود.", "The main number is the suggested size, rounded down to a step of 0.01 so the actual risk never exceeds the requested risk. The actual risk and the value of each pip for one lot are shown beside it."),
      tr("اگر نماد دلار پایه باشد (مثل USDJPY یا USDCAD)، ارزش پیپ به قیمت فعلی وابسته است. قیمت را در فیلد مربوط بنویس؛ در غیر این صورت از قیمت تقریبی استفاده می‌شود و ابزار به تو هشدار می‌دهد.", "If the symbol has the dollar as its base (such as USDJPY or USDCAD), the pip value depends on the current price. Enter the price in its field; otherwise an approximate price is used and the tool warns you."),
    ],
  },
  {
    title: tr("محدودیت‌ها و نکات بروکر", "Limitations and broker notes"),
    bullets: [
      { body: tr("ارز حساب دلار فرض شده است؛ برای حساب‌های یورو یا ارزهای دیگر باید تبدیل انجام شود.", "The account currency is assumed to be dollars; for euro or other currency accounts you need to convert.") },
      { body: tr("اندازه‌ی قرارداد در بروکرها یکسان نیست. برای طلا معمولا 100 اونس است، اما همیشه مشخصات نماد را در بروکر خودت ببین. در این ابزار هر پیپ طلا برابر 0.10 دلار حرکت قیمت گرفته شده است.", "Contract size is not the same across brokers. For gold it is usually 100 ounces, but always check the symbol specifications at your own broker. In this tool each gold pip is taken as a 0.10 dollar price move.") },
      { body: tr("کمیسیون، اسپرد، سواپ و لغزش قیمت محاسبه نمی‌شوند.", "Commission, spread, swap and slippage are not calculated.") },
      { body: tr("این ابزار توصیه‌ی سرمایه‌گذاری نیست و سودی را تضمین نمی‌کند. معامله در بازار فارکس ریسک زیان دارد.", "This tool is not investment advice and does not guarantee profit. Trading the forex market carries a risk of loss.") },
    ],
  },
  {
    title: tr("از حجم لات تا ژورنال معاملات", "From lot size to a trading journal"),
    paragraphs: [
      tr("تعیین لات فقط یک بخش از انضباط معاملاتی است. ثبت هر معامله با دلیل ورود، ریسک و نتیجه به تو نشان می‌دهد قانون‌های مدیریت سرمایه‌ات را واقعا رعایت می‌کنی یا نه. ژورنال ترید آریون برای همین کار است.", "Setting the lot is only one part of trading discipline. Logging each trade with its entry reason, risk and result shows you whether you really follow your money management rules. Arion's trading journal is made for this."),
    ],
  },
];

const breadcrumb = () => [
  { name: brandName(), path: "/" },
  { name: tr("ابزارهای رایگان", "Free tools"), path: "/tools" },
  { name: tr("محاسبه حجم لات", "Lot size calculator"), path: PATH },
];

export default function LotSizeCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(breadcrumb()),
            faqJsonLd(faqs()),
            webApplicationJsonLd({
              name: tr("محاسبه حجم لات فارکس", "Forex lot size calculator"),
              description: tr("ماشین‌حساب حجم لات بر اساس ریسک و حد ضرر", "Lot size calculator based on risk and stop loss"),
              path: PATH,
              category: "FinanceApplication",
            }),
          ]),
        }}
      />
      <ToolPageShell
        breadcrumb={breadcrumb()}
        h1={tr("محاسبه حجم لات فارکس بر اساس ریسک", "Forex lot size calculator based on risk")}
        lead={tr("موجودی، درصد ریسک و حد ضرر به پیپ را وارد کن تا حجم لات مناسب، ریسک واقعی به دلار و ارزش هر پیپ را ببینی. محاسبه کامل در مرورگر انجام می‌شود و هیچ داده‌ای به سرور نمی‌رود.", "Enter your balance, risk percentage and stop loss in pips to see the right lot size, the actual risk in dollars and the value of each pip. The calculation runs entirely in your browser and no data is sent to a server.")}
        sections={sections()}
        faqs={faqs()}
        related={[
          { href: "/blog/forex-lot-size-calculation", label: tr("حجم لات در فارکس را چطور حساب کنیم؟", "How do we calculate lot size in forex?"), note: tr("آموزش کامل محاسبه‌ی لات.", "A complete guide to calculating lots.") },
          { href: "/blog/forex-money-management", label: tr("مدیریت سرمایه در فارکس", "Money management in forex"), note: tr("قانون‌های ریسک در هر معامله.", "Risk rules for every trade.") },
          { href: "/blog/risk-reward-ratio", label: tr("نسبت ریسک به ریوارد", "Risk to reward ratio"), note: tr("ریسک و سود هر معامله را چطور بسنجیم.", "How to weigh the risk and profit of each trade.") },
          { href: "/blog/category/trading", label: tr("مقاله‌های ترید", "Trading articles"), note: tr("فهرست مقاله‌های دسته‌ی ترید.", "A list of articles in the trading category.") },
          { href: "/trading-journal", label: tr("ژورنال ترید آریون", "Arion trading journal"), note: tr("ثبت معاملات و بررسی آمار.", "Log trades and review statistics.") },
          { href: "/forex-sessions", label: tr("ساعت سشن‌های فارکس", "Forex session hours"), note: tr("بهترین ساعت‌های معامله به وقت ایران.", "The best trading hours in Iran time.") },
        ]}
        cta={{
          title: tr("معاملاتت را در ژورنال آریون ثبت کن", "Log your trades in the Arion journal"),
          body: tr("ژورنال ترید آریون به تو کمک می‌کند ریسک و نتیجه‌ی هر معامله را ثبت و بررسی کنی. هر حساب تازه 3 روز دوره‌ی آزمایشی این بخش را دارد.", "Arion's trading journal helps you log and review the risk and result of each trade. Every new account gets a 3-day trial of this section."),
          label: tr("ساخت حساب در آریون", "Create an Arion account"),
        }}
      >
        <ToolLotSizeCalculator />
      </ToolPageShell>
    </>
  );
}
