// کاتالوگ نمادهای قابل‌دنبال‌کردن توی نوار قیمت بازار — کاربر از همین لیست
// انتخاب می‌کنه (حداکثر MAX_TICKER_SYMBOLS تا). نمادها به سبک Yahoo Finance‌ان
// چون API قیمت هم از همون‌جا می‌خونه.

export type TickerSymbol = {
  symbol: string;
  label: string;
  category: "index" | "forex" | "commodity" | "crypto" | "stock";
};

const FOREX: TickerSymbol[] = [
  { symbol: "EURUSD=X", label: "EUR/USD", category: "forex" },
  { symbol: "GBPUSD=X", label: "GBP/USD", category: "forex" },
  { symbol: "USDJPY=X", label: "USD/JPY", category: "forex" },
  { symbol: "USDCHF=X", label: "USD/CHF", category: "forex" },
  { symbol: "USDCAD=X", label: "USD/CAD", category: "forex" },
  { symbol: "AUDUSD=X", label: "AUD/USD", category: "forex" },
  { symbol: "NZDUSD=X", label: "NZD/USD", category: "forex" },
  { symbol: "EURGBP=X", label: "EUR/GBP", category: "forex" },
  { symbol: "EURJPY=X", label: "EUR/JPY", category: "forex" },
  { symbol: "EURCHF=X", label: "EUR/CHF", category: "forex" },
  { symbol: "GBPJPY=X", label: "GBP/JPY", category: "forex" },
  { symbol: "AUDJPY=X", label: "AUD/JPY", category: "forex" },
  { symbol: "USDTRY=X", label: "USD/TRY", category: "forex" },
  { symbol: "USDCNY=X", label: "USD/CNY", category: "forex" },
  { symbol: "USDINR=X", label: "USD/INR", category: "forex" },
  { symbol: "USDRUB=X", label: "USD/RUB", category: "forex" },
  { symbol: "EURAUD=X", label: "EUR/AUD", category: "forex" },
  { symbol: "EURCAD=X", label: "EUR/CAD", category: "forex" },
  { symbol: "GBPCHF=X", label: "GBP/CHF", category: "forex" },
  { symbol: "GBPAUD=X", label: "GBP/AUD", category: "forex" },
  { symbol: "CADJPY=X", label: "CAD/JPY", category: "forex" },
  { symbol: "CHFJPY=X", label: "CHF/JPY", category: "forex" },
  { symbol: "NZDJPY=X", label: "NZD/JPY", category: "forex" },
  { symbol: "AUDNZD=X", label: "AUD/NZD", category: "forex" },
  { symbol: "AUDCAD=X", label: "AUD/CAD", category: "forex" },
  { symbol: "USDZAR=X", label: "USD/ZAR", category: "forex" },
  { symbol: "USDMXN=X", label: "USD/MXN", category: "forex" },
  { symbol: "USDSEK=X", label: "USD/SEK", category: "forex" },
];

const COMMODITIES: TickerSymbol[] = [
  { symbol: "GC=F", label: "طلا", category: "commodity" },
  { symbol: "SI=F", label: "نقره", category: "commodity" },
  { symbol: "CL=F", label: "نفت WTI", category: "commodity" },
  { symbol: "BZ=F", label: "نفت برنت", category: "commodity" },
  { symbol: "NG=F", label: "گاز طبیعی", category: "commodity" },
  { symbol: "HG=F", label: "مس", category: "commodity" },
  { symbol: "PL=F", label: "پلاتین", category: "commodity" },
  { symbol: "PA=F", label: "پالادیوم", category: "commodity" },
  { symbol: "ZC=F", label: "ذرت", category: "commodity" },
  { symbol: "ZW=F", label: "گندم", category: "commodity" },
  { symbol: "ZS=F", label: "سویا", category: "commodity" },
  { symbol: "KC=F", label: "قهوه", category: "commodity" },
  { symbol: "SB=F", label: "شکر", category: "commodity" },
  { symbol: "CT=F", label: "پنبه", category: "commodity" },
  { symbol: "CC=F", label: "کاکائو", category: "commodity" },
];

const INDICES: TickerSymbol[] = [
  { symbol: "SPY", label: "S&P 500", category: "index" },
  { symbol: "QQQ", label: "Nasdaq 100", category: "index" },
  { symbol: "DIA", label: "Dow Jones", category: "index" },
  { symbol: "IWM", label: "Russell 2000", category: "index" },
  { symbol: "^VIX", label: "VIX", category: "index" },
  { symbol: "^GSPC", label: "S&P 500 (شاخص)", category: "index" },
  { symbol: "^IXIC", label: "Nasdaq Composite", category: "index" },
  { symbol: "^DJI", label: "Dow Jones (شاخص)", category: "index" },
  { symbol: "^FTSE", label: "FTSE 100", category: "index" },
  { symbol: "^GDAXI", label: "DAX", category: "index" },
  { symbol: "^FCHI", label: "CAC 40", category: "index" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50", category: "index" },
  { symbol: "^N225", label: "Nikkei 225", category: "index" },
  { symbol: "^HSI", label: "Hang Seng", category: "index" },
  { symbol: "000001.SS", label: "Shanghai Composite", category: "index" },
  { symbol: "^BSESN", label: "Sensex", category: "index" },
  { symbol: "^NSEI", label: "Nifty 50", category: "index" },
  { symbol: "^KS11", label: "KOSPI", category: "index" },
  { symbol: "^AXJO", label: "ASX 200", category: "index" },
  { symbol: "^BVSP", label: "Bovespa", category: "index" },
  { symbol: "^TA125.TA", label: "TA-125", category: "index" },
  { symbol: "^RUT", label: "Russell 2000 (شاخص)", category: "index" },
  { symbol: "^TNX", label: "US 10Y Yield", category: "index" },
  { symbol: "DX-Y.NYB", label: "شاخص دلار (DXY)", category: "index" },
  { symbol: "^MERV", label: "Merval", category: "index" },
];

const CRYPTO: TickerSymbol[] = [
  { symbol: "BTC-USD", label: "بیت‌کوین", category: "crypto" },
  { symbol: "ETH-USD", label: "اتریوم", category: "crypto" },
  { symbol: "USDT-USD", label: "تتر", category: "crypto" },
  { symbol: "BNB-USD", label: "بایننس‌کوین", category: "crypto" },
  { symbol: "SOL-USD", label: "سولانا", category: "crypto" },
  { symbol: "USDC-USD", label: "USD Coin", category: "crypto" },
  { symbol: "XRP-USD", label: "ریپل", category: "crypto" },
  { symbol: "DOGE-USD", label: "دوج‌کوین", category: "crypto" },
  { symbol: "TON-USD", label: "تون‌کوین", category: "crypto" },
  { symbol: "ADA-USD", label: "کاردانو", category: "crypto" },
  { symbol: "SHIB-USD", label: "شیبا اینو", category: "crypto" },
  { symbol: "AVAX-USD", label: "آوالانچ", category: "crypto" },
  { symbol: "TRX-USD", label: "ترون", category: "crypto" },
  { symbol: "DOT-USD", label: "پولکادات", category: "crypto" },
  { symbol: "BCH-USD", label: "بیت‌کوین کش", category: "crypto" },
  { symbol: "LINK-USD", label: "چین‌لینک", category: "crypto" },
  { symbol: "MATIC-USD", label: "پالیگان", category: "crypto" },
  { symbol: "NEAR-USD", label: "نیر پروتکل", category: "crypto" },
  { symbol: "LTC-USD", label: "لایت‌کوین", category: "crypto" },
  { symbol: "ICP-USD", label: "اینترنت کامپیوتر", category: "crypto" },
  { symbol: "UNI-USD", label: "یونی‌سواپ", category: "crypto" },
  { symbol: "APT-USD", label: "اپتوس", category: "crypto" },
  { symbol: "XLM-USD", label: "استلار", category: "crypto" },
  { symbol: "ETC-USD", label: "اتریوم کلاسیک", category: "crypto" },
  { symbol: "OKB-USD", label: "OKB", category: "crypto" },
  { symbol: "FIL-USD", label: "فایل‌کوین", category: "crypto" },
  { symbol: "ATOM-USD", label: "کازماس", category: "crypto" },
  { symbol: "HBAR-USD", label: "هدرا", category: "crypto" },
  { symbol: "IMX-USD", label: "ایمیوتیبل", category: "crypto" },
  { symbol: "ARB-USD", label: "آربیتروم", category: "crypto" },
  { symbol: "VET-USD", label: "ویچین", category: "crypto" },
  { symbol: "OP-USD", label: "اپتیمیزم", category: "crypto" },
  { symbol: "MKR-USD", label: "میکردائو", category: "crypto" },
  { symbol: "GRT-USD", label: "گراف", category: "crypto" },
  { symbol: "AAVE-USD", label: "آوه", category: "crypto" },
  { symbol: "ALGO-USD", label: "الگورند", category: "crypto" },
  { symbol: "QNT-USD", label: "کوانت", category: "crypto" },
  { symbol: "STX-USD", label: "استکس", category: "crypto" },
  { symbol: "SAND-USD", label: "سندباکس", category: "crypto" },
  { symbol: "MANA-USD", label: "دیسنترالند", category: "crypto" },
  { symbol: "EOS-USD", label: "ایاس", category: "crypto" },
  { symbol: "THETA-USD", label: "تتا نتورک", category: "crypto" },
  { symbol: "XTZ-USD", label: "تزوس", category: "crypto" },
  { symbol: "AXS-USD", label: "اکسی اینفینیتی", category: "crypto" },
  { symbol: "FLOW-USD", label: "فلو", category: "crypto" },
  { symbol: "CHZ-USD", label: "چیلیز", category: "crypto" },
  { symbol: "KCS-USD", label: "کوکوین توکن", category: "crypto" },
  { symbol: "CRV-USD", label: "کِرو", category: "crypto" },
  { symbol: "RUNE-USD", label: "تورچین", category: "crypto" },
  { symbol: "SNX-USD", label: "سینتتیکس", category: "crypto" },
  { symbol: "KAVA-USD", label: "کاوا", category: "crypto" },
  { symbol: "ZEC-USD", label: "زی‌کش", category: "crypto" },
  { symbol: "DASH-USD", label: "دش", category: "crypto" },
  { symbol: "COMP-USD", label: "کامپاند", category: "crypto" },
  { symbol: "1INCH-USD", label: "وان‌اینچ", category: "crypto" },
  { symbol: "ENJ-USD", label: "انجین‌کوین", category: "crypto" },
  { symbol: "GALA-USD", label: "گالا", category: "crypto" },
  { symbol: "LDO-USD", label: "لیدو", category: "crypto" },
  { symbol: "PEPE-USD", label: "پپه", category: "crypto" },
  { symbol: "WIF-USD", label: "داگ‌ویف‌هت", category: "crypto" },
  { symbol: "SUI-USD", label: "سویی", category: "crypto" },
];

// شرکت‌های آمریکایی بزرگ — بر اساس sector تقسیم شده فقط برای خوانایی خودِ فایل
const US_TECH = [
  ["AAPL", "اپل"], ["MSFT", "مایکروسافت"], ["GOOGL", "گوگل (Alphabet A)"], ["GOOG", "گوگل (Alphabet C)"],
  ["AMZN", "آمازون"], ["META", "متا"], ["NVDA", "انویدیا"], ["TSLA", "تسلا"], ["AVGO", "بروادکام"],
  ["ORCL", "اوراکل"], ["ADBE", "ادوبی"], ["CRM", "سیلزفورس"], ["AMD", "AMD"], ["INTC", "اینتل"],
  ["CSCO", "سیسکو"], ["QCOM", "کوالکام"], ["IBM", "آی‌بی‌ام"], ["TXN", "تگزاس اینسترومنتس"],
  ["INTU", "اینتویت"], ["NOW", "سرویس‌ناو"], ["UBER", "اوبر"], ["PYPL", "پی‌پال"], ["SHOP", "شاپیفای"],
  ["SNOW", "اسنوفلیک"], ["PLTR", "پلانتیر"], ["PANW", "پالو آلتو"], ["MU", "مایکرون"], ["AMAT", "اپلاید متریالز"],
  ["LRCX", "لام ریسرچ"], ["ADI", "آنالوگ دیوایسز"], ["KLAC", "کی‌ال‌ای"], ["SNPS", "سینوپسیس"],
  ["CDNS", "کیدنس"], ["ADSK", "آتودسک"], ["WDAY", "ورک‌دی"], ["TEAM", "آتلاسین"], ["DDOG", "داتاداگ"],
  ["NET", "کلادفلر"], ["ZS", "زی‌اسکیلر"], ["CRWD", "کرادسترایک"], ["MDB", "مونگو‌دی‌بی"],
  ["ABNB", "ایربی‌ان‌بی"], ["SPOT", "اسپاتیفای"], ["DELL", "دل"], ["HPQ", "اچ‌پی"], ["NXPI", "ان‌ایکس‌پی"],
  ["MRVL", "مارول تک"], ["ON", "آن سمی‌کانداکتر"], ["ZM", "زوم"], ["DOCU", "داکوساین"],
] as const;

const US_FINANCE = [
  ["BRK-B", "برکشایر هاثاوی"], ["JPM", "جی‌پی‌مورگان"], ["V", "ویزا"], ["MA", "مسترکارت"],
  ["BAC", "بانک آو آمریکا"], ["WFC", "ولز فارگو"], ["GS", "گلدمن ساکس"], ["MS", "مورگان استنلی"],
  ["AXP", "امریکن اکسپرس"], ["C", "سیتی‌گروپ"], ["SCHW", "چارلز شواب"], ["BLK", "بلک‌راک"],
  ["SPGI", "اس‌اند‌پی گلوبال"], ["CB", "چاب"], ["PGR", "پروگرسیو"], ["MMC", "مارش مک‌لنان"],
  ["ICE", "اینترکانتیننتال اکسچنج"], ["CME", "سی‌ام‌ای گروپ"], ["USB", "یواس بنکورپ"],
  ["PNC", "پی‌ان‌سی"], ["TFC", "ترویست"], ["AIG", "ای‌آی‌جی"], ["MET", "مت‌لایف"], ["PRU", "پرودنشال"],
  ["COF", "کپیتال وان"], ["AON", "آون"], ["TRV", "ترولرز"], ["ALL", "آلستیت"],
] as const;

const US_HEALTH = [
  ["UNH", "یونایتد هلث"], ["LLY", "ایلای لیلی"], ["JNJ", "جانسون اند جانسون"], ["ABBV", "ابوی"],
  ["MRK", "مرک"], ["PFE", "فایزر"], ["TMO", "ترمو فیشر"], ["ABT", "ابوت"], ["DHR", "دنهر"],
  ["BMY", "بریستول مایرز"], ["AMGN", "امجن"], ["GILD", "گیلید"], ["ISRG", "اینتوییتیو سرجیکال"],
  ["CVS", "سی‌وی‌اس هلث"], ["MDT", "مدترونیک"], ["CI", "سیگنا"], ["ELV", "الوانس هلث"],
  ["VRTX", "ورتکس"], ["REGN", "ریجنران"], ["ZTS", "زوئتیس"], ["HCA", "اچ‌سی‌ای"], ["SYK", "استرایکر"],
  ["BSX", "بوستون ساینتیفیک"], ["MRNA", "مدرنا"],
] as const;

const US_CONSUMER = [
  ["WMT", "والمارت"], ["PG", "پی‌اند‌جی"], ["KO", "کوکاکولا"], ["PEP", "پپسی"], ["COST", "کاستکو"],
  ["HD", "هوم دیپو"], ["MCD", "مک‌دونالد"], ["NKE", "نایک"], ["SBUX", "استارباکس"], ["LOW", "لوز"],
  ["TGT", "تارگت"], ["DIS", "دیزنی"], ["CMCSA", "کامکست"], ["NFLX", "نتفلیکس"], ["TJX", "تی‌جی‌ایکس"],
  ["BKNG", "بوکینگ"], ["MDLZ", "موندلیز"], ["CL", "کلگیت"], ["KMB", "کیمبرلی‌کلارک"], ["GIS", "جنرال میلز"],
  ["MO", "آلتریا"], ["PM", "فیلیپ موریس"], ["EL", "استی لادر"], ["YUM", "یوم برندز"], ["CMG", "چیپوتله"],
  ["DG", "دالار جنرال"], ["ROST", "راس استورز"], ["LULU", "لولولمون"], ["MAR", "ماریوت"],
] as const;

const US_INDUSTRIAL_ENERGY = [
  ["XOM", "اکسان موبیل"], ["CVX", "شورون"], ["COP", "کونوکوفیلیپس"], ["SLB", "اشلومبرگر"],
  ["EOG", "ای‌او‌جی ریسورسز"], ["BA", "بوئینگ"], ["CAT", "کاترپیلار"], ["GE", "جنرال الکتریک"],
  ["HON", "هانی‌ول"], ["UPS", "یو‌پی‌اس"], ["RTX", "آر‌تی‌ایکس"], ["LMT", "لاکهید مارتین"],
  ["DE", "جان دیر"], ["UNP", "یونیون پسیفیک"], ["ETN", "ایتون"], ["ADP", "ای‌دی‌پی"],
  ["NOC", "نورثروپ گرومن"], ["GD", "جنرال داینامیکس"], ["MMM", "تری‌ام"], ["FDX", "فدکس"],
  ["EMR", "امرسون"], ["ITW", "آی‌تی‌دبلیو"], ["WM", "وست منجمنت"], ["NEE", "نکست‌اِرا انرژی"],
  ["DUK", "دیوک انرژی"], ["SO", "سادرن کمپانی"], ["AEP", "امریکن الکتریک پاور"],
] as const;

const US_OTHER = [
  ["LIN", "لیندی"], ["APD", "ایر پروداکتس"], ["ECL", "اکولب"], ["SHW", "شروین ویلیامز"],
  ["AMT", "امریکن تاور"], ["PLD", "پرولاجیس"], ["EQIX", "اکوینیکس"], ["PSA", "پابلیک استوریج"],
  ["O", "رئالتی اینکام"], ["SPG", "سایمون پراپرتی"], ["CCI", "کراون کسل"], ["F", "فورد"],
  ["GM", "جنرال موتورز"], ["RIVN", "ریویان"], ["LCID", "لوسید"], ["CHTR", "چارتر کمیونیکیشنز"],
  ["T", "ای‌تی‌اند‌تی"], ["VZ", "ورایزون"], ["TMUS", "تی‌موبایل"], ["PARA", "پارامونت"],
  ["WBD", "وارنر برادرز دیسکاوری"], ["COIN", "کوین‌بیس"], ["SQ", "بلاک (اسکوئر)"], ["SOFI", "سوفای"],
  ["RBLX", "روبلاکس"], ["DKNG", "درافت‌کینگز"], ["PINS", "پینترست"], ["SNAP", "اسنپ"],
  ["ETSY", "اتسی"], ["EBAY", "ای‌بی‌ای"], ["ZG", "زیلو"], ["CVNA", "کارواناz"],
] as const;

// شرکت‌های بزرگ غیرآمریکایی (ADR روی بورس آمریکا یا نماد اصلی)
const GLOBAL_STOCKS = [
  ["TSM", "TSMC"], ["BABA", "علی‌بابا"], ["TCEHY", "تنسنت"], ["ASML", "ASML"],
  ["NVO", "نوو نوردیسک"], ["SAP", "اس‌ای‌پی"], ["TM", "تویوتا"], ["SONY", "سونی"],
  ["SHEL", "شل"], ["BP", "بی‌پی"], ["UL", "یونی‌لیور"], ["HSBC", "اچ‌اس‌بی‌سی"],
  ["RY", "رویال بانک کانادا"], ["TD", "تی‌دی بانک"], ["BHP", "بی‌اچ‌پی"], ["RIO", "ریو تینتو"],
  ["NVS", "نواردیس"], ["AZN", "آسترازنکا"], ["MC.PA", "ال‌وی‌ام‌اچ"], ["OR.PA", "لورآل"],
  ["SIE.DE", "زیمنس"], ["NESN.SW", "نستله"], ["ROG.SW", "روش"], ["005930.KS", "سامسونگ الکترونیکس"],
  ["9988.HK", "علی‌بابا (هنگ‌کنگ)"], ["9999.HK", "نت‌ایز"], ["PDD", "پین‌دو‌دو"], ["JD", "جی‌دی‌کام"],
  ["NTES", "نت‌ایز ADR"], ["INFY", "اینفوسیس"], ["TCS.NS", "تی‌سی‌اس"], ["RELIANCE.NS", "ریلاینس"],
  ["005380.KS", "هیوندای موتور"], ["7203.T", "تویوتا (توکیو)"], ["6758.T", "سونی (توکیو)"],
  ["7974.T", "نینتندو"], ["BIDU", "بایدو"], ["LI", "لی‌آتو"], ["NIO", "نیو"], ["XPEV", "اکس‌پنگ"],
] as const;

function mapWithLabel(rows: readonly (readonly [string, string])[], category: TickerSymbol["category"]): TickerSymbol[] {
  return rows.map(([symbol, label]) => ({ symbol, label, category }));
}

export const TICKER_CATALOG: TickerSymbol[] = [
  ...FOREX,
  ...COMMODITIES,
  ...INDICES,
  ...CRYPTO,
  ...mapWithLabel(US_TECH, "stock"),
  ...mapWithLabel(US_FINANCE, "stock"),
  ...mapWithLabel(US_HEALTH, "stock"),
  ...mapWithLabel(US_CONSUMER, "stock"),
  ...mapWithLabel(US_INDUSTRIAL_ENERGY, "stock"),
  ...mapWithLabel(US_OTHER, "stock"),
  ...mapWithLabel(GLOBAL_STOCKS, "stock"),
];

export const CATEGORY_LABELS: Record<TickerSymbol["category"], string> = {
  forex: "فارکس",
  commodity: "کالا",
  index: "شاخص",
  crypto: "کریپتو",
  stock: "سهام",
};

// بازار ایران عمدتاً فارکس/طلا/کریپتو دنبال می‌کنه؛ بازار بین‌المللی به شاخص‌های آمریکایی نزدیک‌تره
export const DEFAULT_TICKER_SYMBOLS_IRAN = ["GC=F", "EURUSD=X", "GBPUSD=X", "BTC-USD", "ETH-USD"];
export const DEFAULT_TICKER_SYMBOLS_INTERNATIONAL = ["SPY", "QQQ", "^VIX", "DIA", "BTC-USD"];

export const MAX_TICKER_SYMBOLS = 20;
export const MIN_TICKER_SYMBOLS = 1;
export const TICKER_SETTING_KEY = "tradeTickerSymbols";

export function tickerLabelFor(symbol: string): string {
  return TICKER_CATALOG.find((s) => s.symbol === symbol)?.label ?? symbol;
}
