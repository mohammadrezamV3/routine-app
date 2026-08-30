// قراردادِ داده‌ی ماژولِ ترید بینِ کلاینت و API.
//
// عمداً به `@prisma/client` وابسته نیست: این فایل از کامپوننت‌های کلاینتی
// import می‌شود و کشیدنِ پریزما به باندلِ مرورگر هم بی‌فایده است هم سنگین.
// پس enumها این‌جا به‌صورت union از رشته تعریف شده‌اند — رشته‌ها باید دقیقاً
// با enumهای schema.prisma یکی بمانند.

import { SETTING_KEYS } from "./userSettingKeys";

// ── تنظیماتِ مشترک با پنل کاربری ─────────────────────────────────────────
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

export const ACCOUNT_TYPE_LABELS: Record<TradeAccountType, string> = {
  REAL: "واقعی", DEMO: "دمو", PROP: "پراپ", BACKTEST: "بک‌تست",
};

export const DIRECTION_LABELS: Record<TradeDirection, string> = {
  BUY: "خرید (Buy)", SELL: "فروش (Sell)",
};

export const STATUS_LABELS: Record<TradeStatus, string> = {
  OPEN: "باز", CLOSED: "بسته", CANCELED: "لغو شده",
};

export const RESULT_LABELS: Record<TradeResult, string> = {
  PROFIT: "سود", LOSS: "ضرر", BREAKEVEN: "سربه‌سر",
};

export const ENTRY_REASON_LABELS: Record<TradeEntryReason, string> = {
  STRATEGY: "طبق استراتژی",
  TECHNICAL_SIGNAL: "سیگنال تکنیکال",
  FUNDAMENTAL_SIGNAL: "سیگنال فاندامنتال",
  NEWS: "اخبار",
  INTUITION: "شهود",
  OTHERS_ADVICE: "توصیه دیگران",
  FOMO: "FOMO (ترس از جاماندن)",
  REVENGE: "انتقام از بازار",
  OTHER: "سایر",
};

export const EXIT_REASON_LABELS: Record<TradeExitReason, string> = {
  TAKE_PROFIT: "رسیدن به حد سود",
  STOP_LOSS: "خوردن حد ضرر",
  MANUAL: "خروج دستی",
  TRAILING_STOP: "تریلینگ استاپ",
  MARKET_CHANGE: "تغییر شرایط بازار",
  EMOTIONAL: "خروج احساسی",
  TIME_BASED: "خروج زمانی",
  OTHER: "سایر",
};

export const EMOTION_BEFORE_LABELS: Record<TradeEmotionBefore, string> = {
  CALM: "آرام", NEUTRAL: "معمولی", EXCITED: "هیجان‌زده",
  ANXIOUS: "مضطرب", ANGRY: "عصبانی", OVERCONFIDENT: "بیش‌ازحد مطمئن",
};

export const EMOTION_AFTER_LABELS: Record<TradeEmotionAfter, string> = {
  SATISFIED: "راضی", RELIEVED: "آسوده", INDIFFERENT: "بی‌تفاوت",
  ANXIOUS: "مضطرب", REGRET: "پشیمان", ANGRY: "عصبانی",
};

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

// پالتِ برچسب — همان ده رنگِ ثابت، تا برچسب‌ها با هم هماهنگ بمانند
export const TAG_COLORS = [
  "#8A9099", "#F08A24", "#16C79A", "#5B6BF5", "#EC4899",
  "#A855F7", "#F5B841", "#22C55E", "#EF4444", "#3E7BFA",
];

// ── سقف‌ها ────────────────────────────────────────────────────────────────
export const MAX_ACCOUNTS = 10;
export const MAX_TAGS = 40;
export const MAX_IMAGES_PER_TRADE = 4;
export const MAX_CHECKLISTS = 20;
export const MAX_CHECKLIST_ITEMS = 40;

// ── شکلِ داده ─────────────────────────────────────────────────────────────
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
  /** خلاصه‌ی محاسبه‌شده سمتِ سرور — برای کارتِ لیستِ حساب‌ها */
  summary?: TradeAccountSummary;
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

// ── فرمِ ثبت/ویرایشِ معامله ───────────────────────────────────────────────
// همه‌چیز رشته است تا مستقیم به inputها بایند شود؛ تبدیل به عدد فقط در
// لحظه‌ی ساختِ بدنه‌ی درخواست انجام می‌شود.
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

/** سود/زیانِ علامت‌دار از «نتیجه + مقدار» — تنها جایی که این علامت ساخته می‌شود */
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

// ── کارت‌های آماریِ صفحه‌ی حساب (قابل انتخاب از پنل کاربری) ───────────────
export type TradeStatKey =
  | "goalRing" | "monthTotal" | "total" | "winRate" | "avgWin" | "avgLoss"
  | "largestGain" | "largestLoss" | "maxWinStreak" | "maxLossStreak"
  | "avgR" | "profitFactor" | "balance" | "maxDrawdown" | "expectancy";

export const TRADE_STAT_LABELS: Record<TradeStatKey, string> = {
  goalRing: "پیشرفت هدف (دایره‌ای)",
  balance: "بالانس حساب",
  monthTotal: "سود/زیان دوره",
  total: "تعداد معاملات",
  winRate: "نرخ برد",
  avgWin: "میانگین سود",
  avgLoss: "میانگین ضرر",
  largestGain: "بیشترین سود",
  largestLoss: "بیشترین ضرر",
  maxWinStreak: "بیشترین برد پشت‌سرهم",
  maxLossStreak: "بیشترین باخت پشت‌سرهم",
  avgR: "میانگین R",
  profitFactor: "فاکتور سود",
  maxDrawdown: "بیشترین افت سرمایه",
  expectancy: "امید ریاضی هر معامله",
};

export const TRADE_STAT_ORDER: TradeStatKey[] = [
  "goalRing", "balance", "monthTotal", "total", "winRate", "avgR", "profitFactor",
  "avgWin", "avgLoss", "expectancy", "largestGain", "largestLoss",
  "maxDrawdown", "maxWinStreak", "maxLossStreak",
];

export const DEFAULT_VISIBLE_TRADE_STATS: TradeStatKey[] = [
  "goalRing", "balance", "monthTotal", "total", "winRate", "avgR", "profitFactor", "avgWin", "avgLoss",
];

export const TRADE_STATS_VISIBILITY_KEY = SETTING_KEYS.tradeVisibleStats;
