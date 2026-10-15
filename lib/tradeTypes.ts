// قرارداد داده‌ی ماژول ترید بین کلاینت و API.
//
// عمدا به `@prisma/client` وابسته نیست: این فایل از کامپوننت‌های کلاینتی
// import می‌شود و کشیدن پریزما به باندل مرورگر هم بی‌فایده است هم سنگین.
// پس enumها این‌جا به‌صورت union از رشته تعریف شده‌اند — رشته‌ها باید دقیقا
// با enumهای schema.prisma یکی بمانند.

import { SETTING_KEYS } from "./userSettingKeys";
import { pick } from "./i18n";

// جدول برچسب دوزبانه با همون API قبلی (Record<K,string>): هر خوندن موقع
// استفاده با زبان جاری حل می‌شه، پس هیچ tr() در سطح ماژول اجرا نمی‌شه.
function localizedRecord<K extends string>(pairs: Record<K, [string, string]>): Record<K, string> {
  const resolve = (v: [string, string]) => pick({ fa: v[0], en: v[1] });
  return new Proxy(pairs as unknown as Record<K, string>, {
    get(target, key, receiver) {
      if (typeof key === "string" && Object.prototype.hasOwnProperty.call(target, key)) {
        return resolve((target as unknown as Record<string, [string, string]>)[key]);
      }
      return Reflect.get(target, key, receiver);
    },
    getOwnPropertyDescriptor(target, key) {
      const d = Reflect.getOwnPropertyDescriptor(target, key);
      if (d && typeof key === "string" && "value" in d) {
        return { ...d, value: resolve(d.value as unknown as [string, string]) };
      }
      return d;
    },
  });
}

// ── تنظیمات مشترک با پنل کاربری ─────────────────────────────────────────
export type CalSystem = "jalali" | "gregorian";
export const CAL_SYSTEM_KEY = SETTING_KEYS.tradeCalendarSystem;

// ── enumها ────────────────────────────────────────────────────────────────
export type TradeAccountType = "REAL" | "DEMO" | "PROP" | "BACKTEST";
export type TradeGoalType = "AMOUNT" | "PERCENT";
export type TradeDirection = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED" | "CANCELED";
export type TradeResult = "PROFIT" | "LOSS" | "BREAKEVEN";
export type TradeSession = "SYDNEY" | "TOKYO" | "LONDON" | "NEWYORK";
export type VolumeUnit = "LOT" | "USD";

export type TradeEntryReason =
  | "STRATEGY" | "TECHNICAL_SIGNAL" | "FUNDAMENTAL_SIGNAL" | "NEWS"
  | "INTUITION" | "OTHERS_ADVICE" | "FOMO" | "REVENGE" | "OTHER";

export type TradeExitReason =
  | "TAKE_PROFIT" | "STOP_LOSS" | "MANUAL" | "TRAILING_STOP"
  | "MARKET_CHANGE" | "EMOTIONAL" | "TIME_BASED" | "OTHER";

export type TradeEmotionBefore =
  | "CALM" | "NEUTRAL" | "EXCITED" | "ANXIOUS" | "ANGRY" | "OVERCONFIDENT";

export type TradeEmotionAfter =
  | "SATISFIED" | "RELIEVED" | "INDIFFERENT" | "ANXIOUS" | "REGRET" | "ANGRY";

export const ACCOUNT_TYPE_LABELS: Record<TradeAccountType, string> = localizedRecord({
  REAL: ["واقعی", "Live"],
  DEMO: ["دمو", "Demo"],
  PROP: ["پراپ", "Prop"],
  BACKTEST: ["بک‌تست", "Backtest"],
});

export const DIRECTION_LABELS: Record<TradeDirection, string> = localizedRecord({
  BUY: ["خرید (Buy)", "Buy"],
  SELL: ["فروش (Sell)", "Sell"],
});

export const STATUS_LABELS: Record<TradeStatus, string> = localizedRecord({
  OPEN: ["باز", "Open"],
  CLOSED: ["بسته", "Closed"],
  CANCELED: ["لغو شده", "Canceled"],
});

export const RESULT_LABELS: Record<TradeResult, string> = localizedRecord({
  PROFIT: ["سود", "Profit"],
  LOSS: ["ضرر", "Loss"],
  BREAKEVEN: ["سربه‌سر", "Breakeven"],
});

export const ENTRY_REASON_LABELS: Record<TradeEntryReason, string> = localizedRecord({
  STRATEGY: ["طبق استراتژی", "Followed strategy"],
  TECHNICAL_SIGNAL: ["سیگنال تکنیکال", "Technical signal"],
  FUNDAMENTAL_SIGNAL: ["سیگنال فاندامنتال", "Fundamental signal"],
  NEWS: ["اخبار", "News"],
  INTUITION: ["شهود", "Intuition"],
  OTHERS_ADVICE: ["توصیه دیگران", "Others' advice"],
  FOMO: ["FOMO (ترس از جاماندن)", "FOMO (fear of missing out)"],
  REVENGE: ["انتقام از بازار", "Revenge trade"],
  OTHER: ["سایر", "Other"],
});

export const EXIT_REASON_LABELS: Record<TradeExitReason, string> = localizedRecord({
  TAKE_PROFIT: ["رسیدن به حد سود", "Take profit hit"],
  STOP_LOSS: ["خوردن حد ضرر", "Stop loss hit"],
  MANUAL: ["خروج دستی", "Manual exit"],
  TRAILING_STOP: ["تریلینگ استاپ", "Trailing stop"],
  MARKET_CHANGE: ["تغییر شرایط بازار", "Market conditions changed"],
  EMOTIONAL: ["خروج احساسی", "Emotional exit"],
  TIME_BASED: ["خروج زمانی", "Time-based exit"],
  OTHER: ["سایر", "Other"],
});

export const EMOTION_BEFORE_LABELS: Record<TradeEmotionBefore, string> = localizedRecord({
  CALM: ["آرام", "Calm"],
  NEUTRAL: ["معمولی", "Neutral"],
  EXCITED: ["هیجان‌زده", "Excited"],
  ANXIOUS: ["مضطرب", "Anxious"],
  ANGRY: ["عصبانی", "Angry"],
  OVERCONFIDENT: ["بیش‌ازحد مطمئن", "Overconfident"],
});

export const EMOTION_AFTER_LABELS: Record<TradeEmotionAfter, string> = localizedRecord({
  SATISFIED: ["راضی", "Satisfied"],
  RELIEVED: ["آسوده", "Relieved"],
  INDIFFERENT: ["بی‌تفاوت", "Indifferent"],
  ANXIOUS: ["مضطرب", "Anxious"],
  REGRET: ["پشیمان", "Regretful"],
  ANGRY: ["عصبانی", "Angry"],
});

export const ENTRY_REASON_ORDER: TradeEntryReason[] = [
  "STRATEGY", "TECHNICAL_SIGNAL", "FUNDAMENTAL_SIGNAL", "NEWS",
  "INTUITION", "OTHERS_ADVICE", "FOMO", "REVENGE", "OTHER",
];
export const EXIT_REASON_ORDER: TradeExitReason[] = [
  "TAKE_PROFIT", "STOP_LOSS", "MANUAL", "TRAILING_STOP",
  "MARKET_CHANGE", "EMOTIONAL", "TIME_BASED", "OTHER",
];
export const EMOTION_BEFORE_ORDER: TradeEmotionBefore[] = [
  "CALM", "NEUTRAL", "EXCITED", "ANXIOUS", "ANGRY", "OVERCONFIDENT",
];
export const EMOTION_AFTER_ORDER: TradeEmotionAfter[] = [
  "SATISFIED", "RELIEVED", "INDIFFERENT", "ANXIOUS", "REGRET", "ANGRY",
];

// پالت برچسب — همان ده رنگ ثابت، تا برچسب‌ها با هم هماهنگ بمانند
export const TAG_COLORS = [
  "#8A9099", "#F08A24", "#16C79A", "#5B6BF5", "#EC4899",
  "#A855F7", "#F5B841", "#22C55E", "#EF4444", "#3E7BFA",
];

// ── ارز حساب ─────────────────────────────────────────────────────────────
// قبلا یک input آزاد بود و کاربر باید خودش «USD» تایپ می‌کرد؛ حالا انتخابی‌ست
// تا بالانس اولیه بتواند دلار/یورو/تومان (یا هر کدام از این‌ها) باشد. کد ارز
// همان چیزی‌ست که در دیتابیس ذخیره می‌شود، `CURRENCY_SYMBOLS` فقط برای نمایش.
export const ACCOUNT_CURRENCIES = ["USD", "EUR", "IRT", "IRR", "AED", "TRY", "GBP", "USDT"] as const;

export const CURRENCY_LABELS: Record<string, string> = localizedRecord<string>({
  USD: ["دلار آمریکا", "US dollar"],
  EUR: ["یورو", "Euro"],
  IRT: ["تومان", "Toman"],
  IRR: ["ریال", "Rial"],
  AED: ["درهم امارات", "UAE dirham"],
  TRY: ["لیر ترکیه", "Turkish lira"],
  GBP: ["پوند انگلیس", "British pound"],
  USDT: ["تتر", "Tether"],
});

export const CURRENCY_SYMBOLS: Record<string, string> = localizedRecord<string>({
  USD: ["$", "$"],
  EUR: ["€", "€"],
  IRT: ["تومان", "Toman"],
  IRR: ["ریال", "Rial"],
  AED: ["درهم", "AED"],
  TRY: ["₺", "₺"],
  GBP: ["£", "£"],
  USDT: ["₮", "₮"],
});

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

// ── سقف‌ها ────────────────────────────────────────────────────────────────
export const MAX_ACCOUNTS = 10;
export const MAX_TAGS = 40;
export const MAX_IMAGES_PER_TRADE = 2;
export const MAX_CHECKLISTS = 20;
export const MAX_CHECKLIST_ITEMS = 40;
// چک‌لیست بدون آیتم یا با فقط یک آیتم عملا هیچ ارزش چک‌کردنی نداره —
// حداقل دو مورد باید باشه تا واقعا «چک‌لیست» به‌حساب بیاد.
export const MIN_CHECKLIST_ITEMS = 2;

// ── شکل داده ─────────────────────────────────────────────────────────────
export type TradeTag = { id: string; name: string; color: string };

export type TradeAccount = {
  id: string;
  name: string;
  broker: string | null;
  type: TradeAccountType;
  currency: string;
  initialBalance: number;
  leverage: number | null;
  color: string;
  note: string | null;
  goalType: TradeGoalType;
  goalValue: number;
  archived: boolean;
  order: number;
  tags: TradeTag[];
  /** خلاصه‌ی محاسبه‌شده سمت سرور — برای کارت لیست حساب‌ها */
  summary?: TradeAccountSummary;
  /** وضعیت اتصال متاتریدر همین حساب — در همان درخواست حساب‌ها می‌آید */
  mtConnected?: boolean;
  mtLastSyncAt?: string | null;
  /** گردش پول غیرمعاملاتی از EA متاتریدر: واریز/برداشت و هزینه‌های بدون معامله */
  cashFunding?: number;
  cashCharges?: number;
  /** true یعنی initialBalance همون اولین واریز متاتریدره، نه عدد دستی (lib/tradeCashflowServer.ts) */
  initialFromMt?: boolean;
};

export type TradeAccountSummary = {
  tradeCount: number;
  closedCount: number;
  netPnl: number;
  balance: number;
  winRate: number | null;
  goalProgress: number | null; // ۰ تا ۱
};

export type TradeEntry = {
  id: string;
  accountId: string;
  symbol: string;
  direction: TradeDirection;
  timeframe: string | null;
  openedAt: string;
  closedAt: string | null;
  volume: number;
  volumeUnit: VolumeUnit;
  result: TradeResult;
  pnl: number;
  riskFree: boolean;
  status: TradeStatus;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  commission: number | null;
  swap: number | null;
  riskAmount: number | null;
  rMultiple: number | null;
  sessions: TradeSession[];
  setup: string | null;
  entryReasons: TradeEntryReason[];
  exitReasons: TradeExitReason[];
  entryReasonNote: string | null;
  exitReasonNote: string | null;
  note: string | null;
  emotionBefore: TradeEmotionBefore | null;
  emotionAfter: TradeEmotionAfter | null;
  confidence: number | null;
  followedPlan: boolean | null;
  checklistId: string | null;
  checklistName: string | null;
  checklistDone: number | null;
  checklistTotal: number | null;
  tags: TradeTag[];
  imageCount: number;
};

export type TradeImage = { id: string; dataUrl: string; caption: string | null; order: number };

export type TradeChecklistSnapshotItem = { text: string; checked: boolean };

export type TradeEntryDetail = TradeEntry & {
  images: TradeImage[];
  checklistSnapshot: TradeChecklistSnapshotItem[] | null;
};

// ── فرم ثبت/ویرایش معامله ───────────────────────────────────────────────
// همه‌چیز رشته است تا مستقیم به inputها بایند شود؛ تبدیل به عدد فقط در
// لحظه‌ی ساخت بدنه‌ی درخواست انجام می‌شود.
export type TradeFormState = {
  accountId: string;
  symbol: string;
  direction: TradeDirection;
  timeframe: string;
  openedAt: string;   // ISO محلی: YYYY-MM-DDTHH:mm
  closedAt: string;
  volume: string;
  volumeUnit: VolumeUnit;
  result: TradeResult;
  pnlAmount: string;  // همیشه مثبت — علامت از result می‌آید
  riskFree: boolean;
  status: TradeStatus;
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  takeProfit: string;
  commission: string;
  swap: string;
  riskAmount: string;
  setup: string;
  entryReasons: TradeEntryReason[];
  exitReasons: TradeExitReason[];
  entryReasonNote: string;
  exitReasonNote: string;
  note: string;
  emotionBefore: TradeEmotionBefore | null;
  emotionAfter: TradeEmotionAfter | null;
  confidence: string;
  followedPlan: boolean | null;
  checklistId: string | null;
  checklistState: Record<string, boolean>; // itemId → تیک‌خورده
  tagIds: string[];
  images: { dataUrl: string; caption?: string }[];
};

export function emptyTradeForm(accountId: string, nowLocal: string): TradeFormState {
  return {
    accountId,
    symbol: "",
    direction: "BUY",
    timeframe: "1h",
    openedAt: nowLocal,
    closedAt: "",
    volume: "",
    volumeUnit: "LOT",
    result: "PROFIT",
    pnlAmount: "",
    riskFree: false,
    status: "CLOSED",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    commission: "",
    swap: "",
    riskAmount: "",
    setup: "",
    entryReasons: [],
    exitReasons: [],
    entryReasonNote: "",
    exitReasonNote: "",
    note: "",
    emotionBefore: null,
    emotionAfter: null,
    confidence: "",
    followedPlan: null,
    checklistId: null,
    checklistState: {},
    tagIds: [],
    images: [],
  };
}

const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

/** سود/زیان علامت‌دار از «نتیجه + مقدار» — تنها جایی که این علامت ساخته می‌شود */
export function signedPnl(result: TradeResult, amount: number | null): number {
  const v = Math.abs(amount || 0);
  if (result === "PROFIT") return v;
  if (result === "LOSS") return -v;
  return 0;
}

export function formStateToBody(v: TradeFormState) {
  return {
    accountId: v.accountId,
    symbol: v.symbol.trim().toUpperCase(),
    direction: v.direction,
    timeframe: v.timeframe || null,
    openedAt: v.openedAt,
    closedAt: v.closedAt || null,
    volume: num(v.volume),
    volumeUnit: v.volumeUnit,
    result: v.result,
    pnl: signedPnl(v.result, num(v.pnlAmount)),
    riskFree: v.riskFree,
    status: v.status,
    entryPrice: num(v.entryPrice),
    exitPrice: num(v.exitPrice),
    stopLoss: num(v.stopLoss),
    takeProfit: num(v.takeProfit),
    commission: num(v.commission),
    swap: num(v.swap),
    riskAmount: num(v.riskAmount),
    setup: v.setup.trim() || null,
    entryReasons: v.entryReasons,
    exitReasons: v.exitReasons,
    entryReasonNote: v.entryReasonNote.trim() || null,
    exitReasonNote: v.exitReasonNote.trim() || null,
    note: v.note.trim() || null,
    emotionBefore: v.emotionBefore,
    emotionAfter: v.emotionAfter,
    confidence: num(v.confidence),
    followedPlan: v.followedPlan,
    checklistId: v.checklistId,
    checklistState: v.checklistState,
    tagIds: v.tagIds,
    images: v.images,
  };
}

export function tradeToFormState(e: TradeEntryDetail, toLocalInput: (iso: string) => string): TradeFormState {
  const s = (n: number | null) => (n === null || n === undefined ? "" : String(n));
  return {
    accountId: e.accountId,
    symbol: e.symbol,
    direction: e.direction,
    timeframe: e.timeframe || "",
    openedAt: toLocalInput(e.openedAt),
    closedAt: e.closedAt ? toLocalInput(e.closedAt) : "",
    volume: String(e.volume),
    volumeUnit: e.volumeUnit,
    result: e.result,
    pnlAmount: String(Math.abs(e.pnl)),
    riskFree: e.riskFree,
    status: e.status,
    entryPrice: s(e.entryPrice),
    exitPrice: s(e.exitPrice),
    stopLoss: s(e.stopLoss),
    takeProfit: s(e.takeProfit),
    commission: s(e.commission),
    swap: s(e.swap),
    riskAmount: s(e.riskAmount),
    setup: e.setup || "",
    entryReasons: e.entryReasons,
    exitReasons: e.exitReasons,
    entryReasonNote: e.entryReasonNote || "",
    exitReasonNote: e.exitReasonNote || "",
    note: e.note || "",
    emotionBefore: e.emotionBefore,
    emotionAfter: e.emotionAfter,
    confidence: s(e.confidence),
    followedPlan: e.followedPlan,
    checklistId: e.checklistId,
    checklistState: {},
    tagIds: e.tags.map((t) => t.id),
    images: e.images.map((i) => ({ dataUrl: i.dataUrl, caption: i.caption || undefined })),
  };
}

// ── کارت‌های آماری صفحه‌ی حساب (قابل انتخاب از پنل کاربری) ───────────────
export type TradeStatKey =
  | "goalRing" | "monthTotal" | "total" | "winRate" | "avgWin" | "avgLoss"
  | "largestGain" | "largestLoss" | "maxWinStreak" | "maxLossStreak"
  | "avgR" | "profitFactor" | "balance" | "maxDrawdown" | "expectancy";

export const TRADE_STAT_LABELS: Record<TradeStatKey, string> = localizedRecord({
  goalRing: ["پیشرفت هدف (دایره‌ای)", "Goal progress (ring)"],
  balance: ["بالانس حساب", "Account balance"],
  monthTotal: ["سود/زیان دوره", "Period P/L"],
  total: ["تعداد معاملات", "Number of trades"],
  winRate: ["نرخ برد", "Win rate"],
  avgWin: ["میانگین سود", "Average win"],
  avgLoss: ["میانگین ضرر", "Average loss"],
  largestGain: ["بیشترین سود", "Largest win"],
  largestLoss: ["بیشترین ضرر", "Largest loss"],
  maxWinStreak: ["بیشترین برد پشت‌سرهم", "Longest win streak"],
  maxLossStreak: ["بیشترین باخت پشت‌سرهم", "Longest losing streak"],
  avgR: ["میانگین R", "Average R"],
  profitFactor: ["فاکتور سود", "Profit factor"],
  maxDrawdown: ["بیشترین افت سرمایه", "Max drawdown"],
  expectancy: ["امید ریاضی هر معامله", "Expectancy per trade"],
});

export const TRADE_STAT_ORDER: TradeStatKey[] = [
  "goalRing", "balance", "monthTotal", "total", "winRate", "avgR", "profitFactor",
  "avgWin", "avgLoss", "expectancy", "largestGain", "largestLoss",
  "maxDrawdown", "maxWinStreak", "maxLossStreak",
];

export const DEFAULT_VISIBLE_TRADE_STATS: TradeStatKey[] = [
  "goalRing", "balance", "monthTotal", "total", "winRate", "avgR", "profitFactor", "avgWin", "avgLoss",
];

export const TRADE_STATS_VISIBILITY_KEY = SETTING_KEYS.tradeVisibleStats;

// ── آمار جمع کل همه‌ی حساب‌ها (صفحه‌ی حساب‌ها) ─────────────────────────
// سه تای اول قابل‌نمایش سرخط‌اند، بقیه پشت «جزئیات بیشتر» — همان مدل
// صفحه‌ی ژورنال‌نویسی یک حساب. کاربر از تنظیمات انتخاب می‌کند کدام‌ها باشند.
export type TradeTotalsStatKey = "balance" | "netPnl" | "winRate" | "trades" | "closed" | "open" | "accounts";

export const TRADE_TOTALS_STAT_LABELS: Record<TradeTotalsStatKey, string> = localizedRecord({
  balance: ["بالانس کل", "Total balance"],
  netPnl: ["سود/زیان خالص", "Net P/L"],
  winRate: ["نرخ برد", "Win rate"],
  trades: ["کل معاملات", "Total trades"],
  closed: ["معاملات بسته‌شده", "Closed trades"],
  open: ["معاملات باز", "Open trades"],
  accounts: ["حساب فعال", "Active accounts"],
});

export const TRADE_TOTALS_STAT_ORDER: TradeTotalsStatKey[] = ["balance", "netPnl", "winRate", "trades", "closed", "open", "accounts"];

export const DEFAULT_VISIBLE_TRADE_TOTALS_STATS: TradeTotalsStatKey[] = [...TRADE_TOTALS_STAT_ORDER];

export const TRADE_TOTALS_VISIBILITY_KEY = SETTING_KEYS.tradeTotalsStats;

// ── جزئیات اولیه‌ی هر ترید در لیست روز ───────────────────────────────────
// این‌ها همان فیلدهایی‌اند که کاربر موقع ثبت پر می‌کند و می‌تواند انتخاب کند
// کدام‌هایشان بدون باز کردن کارت جزئیات، همان‌جا در ردیف ترید دیده شوند.
export type TradeFactKey =
  | "openedAt" | "closedAt" | "volume" | "rMultiple" | "timeframe" | "setup"
  | "entryPrice" | "exitPrice" | "stopLoss" | "takeProfit"
  | "riskAmount" | "commission" | "swap" | "session" | "confidence" | "result";

export const TRADE_FACT_LABELS: Record<TradeFactKey, string> = localizedRecord({
  openedAt: ["ساعت ورود", "Entry time"],
  closedAt: ["ساعت خروج", "Exit time"],
  volume: ["حجم", "Volume"],
  rMultiple: ["R", "R"],
  timeframe: ["تایم‌فریم", "Timeframe"],
  setup: ["ستاپ", "Setup"],
  entryPrice: ["قیمت ورود", "Entry price"],
  exitPrice: ["قیمت خروج", "Exit price"],
  stopLoss: ["حد ضرر", "Stop loss"],
  takeProfit: ["حد سود", "Take profit"],
  riskAmount: ["ریسک اولیه", "Initial risk"],
  commission: ["کمیسیون", "Commission"],
  swap: ["سواپ", "Swap"],
  session: ["جلسه", "Session"],
  confidence: ["میزان اطمینان", "Confidence"],
  result: ["نتیجه", "Result"],
});

export const TRADE_FACT_ORDER: TradeFactKey[] = [
  "openedAt", "closedAt", "volume", "rMultiple", "timeframe", "setup",
  "entryPrice", "exitPrice", "stopLoss", "takeProfit",
  "riskAmount", "commission", "swap", "session", "confidence", "result",
];

export const DEFAULT_VISIBLE_TRADE_FACTS: TradeFactKey[] = [
  "openedAt", "closedAt", "volume", "rMultiple", "timeframe", "setup",
];

/** بیشتر از این تعداد توی یک ردیف جا نمی‌شود — مخصوصا وقتی ردیف تک‌خطی است */
export const MAX_VISIBLE_TRADE_FACTS = 8;

export const TRADE_FACTS_VISIBILITY_KEY = SETTING_KEYS.tradeVisibleFacts;
