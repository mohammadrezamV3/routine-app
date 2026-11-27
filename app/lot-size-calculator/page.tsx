import type { Metadata } from "next";
import { SeoToolPage, type ToolSection } from "@/components/SeoToolPage";
import { ToolLotCalc } from "@/components/ToolLotCalc";
import type { SeoFaq } from "@/components/SeoLanding";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { toolJsonLd } from "@/lib/toolSeo";

const PATH = "/lot-size-calculator";

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(
      `محاسبه حجم لات فارکس (لات سایز) رایگان | ${BRAND_FA}`,
      `Free forex lot size calculator | ${brand}`,
    ),
    description: tr(
      "ماشین حساب رایگان حجم لات فارکس: موجودی، درصد ریسک، حد ضرر به پیپ و نماد (EURUSD، XAUUSD، USDJPY و ...) را بده و حجم لات، مبلغ ریسک و ارزش پیپ را ببین.",
      "Free forex lot size calculator: enter balance, risk percent, stop loss in pips and symbol (EURUSD, XAUUSD, USDJPY and more) to get lot size, risk amount and pip value.",
    ),
    path: PATH,
    keywords: tr(
      "محاسبه حجم لات|ماشین حساب لات|حجم لات|لات سایز|lot size calculator|محاسبه لات فارکس|محاسبه لات طلا|محاسبه لات xauusd|محاسبه پیپ|ارزش هر پیپ|ماشین حساب پیپ|مدیریت سرمایه در فارکس|مدیریت ریسک|حد ضرر|position size|ماشین حساب ریسک فارکس|یک لات چند دلار است|حجم معامله|اندازه پوزیشن|قانون 2 درصد",
      "lot size calculator|forex lot size calculator|position size calculator|pip value calculator|forex risk calculator|gold lot size calculator|XAUUSD lot size|risk management forex|how to calculate lot size|stop loss pips calculator",
    ).split("|"),
    ownOgImage: true,
    ogTitle: tr("محاسبه حجم لات فارکس", "Forex lot size calculator"),
  });
}

function content() {
  const brand = brandName();
  const faqs: SeoFaq[] = [
    {
      q: tr("حجم لات چطور محاسبه می‌شود؟", "How is lot size calculated?"),
      a: tr(
        "مبلغ ریسک (موجودی x درصد ریسک) را بر حاصل ضرب حد ضرر به پیپ در ارزش هر پیپ برای یک لات تقسیم می‌کنیم. مثلا برای حساب 5000 دلاری با ریسک 1 درصد، حد ضرر 25 پیپ در EURUSD: 50 تقسیم بر 25 x 10 می‌شود 0.2 لات.",
        "Divide the risk amount (balance x risk percent) by the stop loss in pips times the pip value per lot. For example, on a 5000 dollar account risking 1 percent with a 25 pip stop on EURUSD: 50 divided by 25 x 10 gives 0.2 lots.",
      ),
    },
    {
      q: tr("یک لات، مینی لات و میکرو لات چقدر است؟", "What are a lot, a mini lot and a micro lot?"),
      a: tr(
        "یک لات استاندارد 100000 واحد ارز پایه است. مینی لات 0.1 لات (10000 واحد) و میکرو لات 0.01 لات (1000 واحد) است. در بیشتر بروکرها کوچک‌ترین حجم مجاز 0.01 لات است.",
        "A standard lot is 100000 units of the base currency. A mini lot is 0.1 lot (10000 units) and a micro lot is 0.01 lot (1000 units). At most brokers the smallest allowed size is 0.01 lot.",
      ),
    },
    {
      q: tr("ارزش هر پیپ چقدر است؟", "How much is one pip worth?"),
      a: tr(
        "برای جفت‌ارزهایی که ارز دوم آنها دلار است (مثل EURUSD و GBPUSD) هر پیپ برای یک لات 10 دلار است. برای USDJPY هر پیپ 1000 ین است که با تقسیم بر قیمت روز به دلار تبدیل می‌شود (در قیمت 150 حدود 6.67 دلار).",
        "For pairs quoted in dollars (such as EURUSD and GBPUSD) one pip is worth 10 dollars per lot. For USDJPY one pip is 1000 yen, converted to dollars by dividing by the current price (about 6.67 dollars at 150).",
      ),
    },
    {
      q: tr("چند درصد ریسک برای هر معامله مناسب است؟", "What risk percent per trade is reasonable?"),
      a: tr(
        "بیشتر تریدرهای حرفه‌ای بین 0.5 تا 2 درصد موجودی را در هر معامله ریسک می‌کنند. با ریسک 1 درصد، حتی ده ضرر پشت سر هم فقط حدود 10 درصد حساب را می‌برد و می‌توانی ادامه بدهی.",
        "Most professional traders risk between 0.5 and 2 percent of the balance per trade. At 1 percent risk, even ten losses in a row cost only about 10 percent of the account and you can keep trading.",
      ),
    },
    {
      q: tr("این ماشین حساب برای طلا و شاخص‌ها هم درست است؟", "Does this work for gold and indices?"),
      a: tr(
        "بله، نمادها با اندازه‌ی قرارداد رایج محاسبه می‌شوند (برای طلا هر لات 100 اونس و هر 0.1 دلار حرکت یک پیپ). چون اندازه‌ی قرارداد بین بروکرها فرق می‌کند، پیش از معامله‌ی واقعی با مشخصات نماد در پلتفرم خودت مقایسه کن.",
        "Yes. Symbols use the common contract size (for gold one lot is 100 ounces and each 0.1 dollar move is one pip). Because contract size differs between brokers, compare with your platform's symbol specification before a live trade.",
      ),
    },
    {
      q: tr("حجم لات طلا (XAUUSD) را چطور محاسبه کنم؟", "How do I calculate the lot size for gold (XAUUSD)?"),
      a: tr(
        "همان فرمول است: مبلغ ریسک را بر حد ضرر (به پیپ یا نقطه) ضرب در ارزش هر پیپ تقسیم کن. فقط ارزش پیپ طلا با جفت‌ارزها فرق دارد و بسته به بروکر ممکن است متفاوت باشد؛ در ماشین حساب همین صفحه نماد طلا را انتخاب کن و قبل از معامله مقدار را با مشخصات قرارداد بروکرت مقایسه کن.",
        "It is the same formula: divide the risk amount by the stop loss (in pips or points) times the pip value. Only gold's pip value differs from currency pairs and may vary by broker; pick the gold symbol in this page's calculator and compare the result with your broker's contract specifications before trading.",
      ),
    },
    {
      q: tr("یک لات فارکس چند دلار است؟", "How many dollars is one forex lot?"),
      a: tr(
        "یک لات استاندارد 100,000 واحد از ارز پایه است، نه یک مبلغ ثابت دلاری. ارزش حرکت هر پیپ برای یک لات در جفت‌ارزهایی مثل EURUSD حدود 10 دلار است، و برای ریسک دقیق باید حجم را با ماشین حساب بر اساس حد ضرر حساب کنی.",
        "One standard lot is 100,000 units of the base currency, not a fixed dollar amount. A pip is worth about 10 dollars per lot on pairs like EURUSD, and for exact risk you should compute the size from your stop loss with the calculator.",
      ),
    },
  ];
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("محاسبه حجم لات", "Lot size calculator"), path: PATH },
  ];
  const sections: ToolSection[] = [
    {
      title: tr("حجم لات یعنی چه و چرا مهم است؟", "What is lot size and why does it matter?"),
      paragraphs: [
        tr(
          "حجم لات تعیین می‌کند هر پیپ حرکت قیمت چند دلار برایت سود یا ضرر دارد. بیشتر ضررهای بزرگ حساب‌های کوچک نه از تحلیل غلط، بلکه از حجم بیش از اندازه می‌آیند: همان حد ضرر با لات دو برابر، ضرر دو برابر می‌سازد.",
          "Lot size decides how many dollars each pip of price movement makes or loses for you. Most big losses on small accounts come not from a wrong analysis but from oversized positions: the same stop with double the lots means double the loss.",
        ),
        tr(
          "روش درست این است که اول بپرسی چقدر حاضری در این معامله از دست بدهی (مبلغ ریسک) و بعد حجم را از روی فاصله‌ی حد ضرر حساب کنی، نه برعکس.",
          "The right way is to first ask how much you are willing to lose on this trade (the risk amount) and then work out the size from the stop distance, not the other way round.",
        ),
      ],
    },
    {
      title: tr("فرمول حجم لات", "The lot size formula"),
      formula: "risk amount = balance x risk % / 100\nlots = risk amount / (stop loss in pips x pip value per lot)",
      paragraphs: [
        tr(
          "ارزش پیپ برای یک لات از اندازه‌ی پیپ و اندازه‌ی قرارداد به‌دست می‌آید و برای نمادهایی که ارز دوم‌شان دلار نیست به دلار تبدیل می‌شود. این ماشین حساب همین منطق را با ماشین حساب ریسک ژورنال ترید مشترک دارد و حجم را به پایین تا دو رقم اعشار گرد می‌کند تا ریسک هرگز از هدف بیشتر نشود.",
          "The pip value per lot comes from the pip size and contract size, and is converted to dollars for symbols not quoted in dollars. This calculator shares that logic with the trading journal's risk calculator and rounds the size down to two decimals so risk never exceeds your target.",
        ),
      ],
    },
    {
      title: tr("مثال محاسبه", "Worked example"),
      paragraphs: [
        tr(
          "حساب 5000 دلاری، ریسک 1 درصد: مبلغ ریسک 50 دلار. معامله روی EURUSD با حد ضرر 25 پیپ و ارزش پیپ 10 دلار: 50 / (25 x 10) = 0.2 لات. اگر حد ضرر خورد، دقیقا 50 دلار (1 درصد) از دست می‌دهی.",
          "A 5000 dollar account risking 1 percent: the risk amount is 50 dollars. A EURUSD trade with a 25 pip stop and a 10 dollar pip value: 50 / (25 x 10) = 0.2 lots. If the stop is hit you lose exactly 50 dollars (1 percent).",
        ),
        tr(
          "همین معامله با حد ضرر 50 پیپ فقط 0.1 لات می‌شود: هر چه حد ضرر دورتر باشد، حجم باید کوچک‌تر شود تا ریسک ثابت بماند.",
          "The same trade with a 50 pip stop is only 0.1 lots: the wider the stop, the smaller the size must be to keep risk constant.",
        ),
      ],
    },
    {
      title: tr("نکته‌های کاربردی مدیریت سرمایه", "Practical money management tips"),
      bullets: [
        { title: tr("اول حد ضرر، بعد حجم", "Stop first, then size"), body: tr("حد ضرر را بر اساس ساختار بازار بگذار و حجم را با آن تنظیم کن؛ حد ضرر را برای جا شدن در حجم دلخواه کوچک نکن.", "Place the stop based on market structure and fit the size to it; never tighten a stop just to fit a size you want.") },
        { title: tr("اسپرد و لغزش را حساب کن", "Allow for spread and slippage"), body: tr("در نمادهای پرنوسان و هنگام اخبار، ضرر واقعی می‌تواند کمی از عدد محاسبه‌شده بیشتر شود.", "On volatile symbols and around news, the real loss can be slightly larger than the calculated figure.") },
        { title: tr("هر معامله را ثبت کن", "Log every trade"), body: tr("ثبت حجم، ریسک و نتیجه به تو نشان می‌دهد آیا واقعا به برنامه‌ی ریسکت پایبندی یا نه.", "Logging size, risk and outcome shows whether you actually stick to your risk plan.") },
      ],
    },
  ];
  return { faqs, breadcrumb, sections, brand };
}

export default function LotSizeCalculatorPage() {
  const { faqs, breadcrumb, sections, brand } = content();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            toolJsonLd({
              path: PATH,
              name: tr("محاسبه حجم لات فارکس", "Forex lot size calculator"),
              description: tr("ماشین حساب رایگان حجم لات، مبلغ ریسک و ارزش پیپ", "Free lot size, risk amount and pip value calculator"),
              category: "FinanceApplication",
              breadcrumb,
              faqs,
            }),
          ),
        }}
      />
      <SeoToolPage
        breadcrumb={breadcrumb}
        h1={tr("محاسبه حجم لات فارکس", "Forex lot size calculator")}
        lead={tr(
          "موجودی، درصد ریسک، فاصله‌ی حد ضرر و نماد را وارد کن تا حجم لات مناسب، مبلغ ریسک و ارزش هر پیپ را ببینی. رایگان و بدون ثبت نام.",
          "Enter your balance, risk percent, stop-loss distance and symbol to see the right lot size, risk amount and pip value. Free, no sign-up.",
        )}
        toolTitle={tr("ماشین حساب لات سایز", "Lot size calculator")}
        tool={<ToolLotCalc />}
        sections={sections}
        faqs={faqs}
        faqTitle={tr("سوال‌های رایج درباره حجم لات", "Frequently asked questions about lot size")}
        related={[
          { href: "/blog/forex-lot-size-calculation", label: tr("آموزش محاسبه حجم لات", "How to calculate lot size"), note: tr("توضیح گام‌به‌گام با مثال‌های بیشتر.", "A step-by-step explanation with more examples.") },
          { href: "/blog/forex-money-management", label: tr("مدیریت سرمایه در فارکس", "Forex money management"), note: tr("قاعده‌های ریسک و ساخت یک برنامه‌ی ریسک ساده.", "Risk rules and how to build a simple risk plan.") },
          { href: "/trading-journal", label: tr("ژورنال معاملاتی", "Trading journal"), note: tr("ثبت معاملات و آمار عملکرد با ماشین حساب ریسک کامل.", "Log trades and performance stats with the full risk calculator.") },
        ]}
        ctaText={tr(
          `در ${brand} معاملاتت را ثبت کن و ریسک هر معامله را با ماشین حساب کامل ریسک دنبال کن.`,
          `Log your trades in ${brand} and track the risk of each one with the full risk calculator.`,
        )}
      />
    </>
  );
}
