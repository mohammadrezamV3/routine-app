// قراردادِ API همگام‌سازیِ ماژولِ ترید بینِ بک‌اندِ وب و اپ اندروید —
// /api/mobile/trade/*
//
// این فایل عمدا هیچ import‌ای نداره تا عینا بشه کپی‌اش رو توی
// `mobile/src/lib/trade-contract.ts` گذاشت. نسخه‌ی مرجع همین‌جاست؛ تستِ
// __tests__/mobileTradeContract.test.ts اگه دو نسخه از هم فاصله بگیرن می‌شکنه.
// (عمدا جدا از lib/mobileApiContract.ts — ترید endpointها و نسخه‌ی خودش رو داره.)
//
// قراردادهای کلی (همون قواعدِ /api/mobile/sync):
//   • احرازِ هویت فقط با `Authorization: Bearer <accessToken>`.
//   • همه‌ی زمان‌ها ISO-8601 به UTC‌ان. زمانِ معامله همیشه UTC ذخیره می‌شه؛
//     نمایش به ساعتِ محلی کارِ کلاینته.
//   • شناسه‌ی هر رکوردِ جدید رو خودِ گوشی می‌سازه (cuid: حروفِ کوچکِ لاتین و
//     رقم، با حرف شروع، ۲۰ تا ۳۲ کاراکتر) تا ساختِ آفلاین ممکن باشه.
//   • LWW با `clientUpdatedAt` در برابرِ `editedAt`ِ سرور؛ تساوی به نفعِ سرور.
//   • ماژولِ TRADE پولیه: اگه کاربر دسترسی نداشته باشه pull هیچ داده‌ای
//     برنمی‌گردونه (`moduleLocked: true`) و push همه‌ی تغییرها رو با
//     `code: "module_locked"` رد می‌کنه. صفِ محلی رو دور نریز — بعد از تمدید
//     دوباره بفرست.
//   • عکسِ چارتِ معاملات فعلا همگام نمی‌شه (فقط `imageCount` برای نمایش).

// ─── انواعِ شمارشی (آینه‌ی enumهای prisma/schema.prisma) ──────────────────

export type TradeAccountType = "REAL" | "DEMO" | "PROP" | "BACKTEST";
export type TradeGoalType = "AMOUNT" | "PERCENT";
export type TradeDirection = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED" | "CANCELED";
export type TradeResult = "PROFIT" | "LOSS" | "BREAKEVEN";
export type TradeSession = "SYDNEY" | "TOKYO" | "LONDON" | "NEWYORK";
export type TradeVolumeUnit = "LOT" | "USD";
export type TradeEntryReason =
  | "STRATEGY"
  | "TECHNICAL_SIGNAL"
  | "FUNDAMENTAL_SIGNAL"
  | "NEWS"
  | "INTUITION"
  | "OTHERS_ADVICE"
  | "FOMO"
  | "REVENGE"
  | "OTHER";
export type TradeExitReason =
  | "TAKE_PROFIT"
  | "STOP_LOSS"
  | "MANUAL"
  | "TRAILING_STOP"
  | "MARKET_CHANGE"
  | "EMOTIONAL"
  | "TIME_BASED"
  | "OTHER";
export type TradeEmotionBefore = "CALM" | "NEUTRAL" | "EXCITED" | "ANXIOUS" | "ANGRY" | "OVERCONFIDENT";
export type TradeEmotionAfter = "SATISFIED" | "RELIEVED" | "INDIFFERENT" | "ANXIOUS" | "REGRET" | "ANGRY";

// ─── موجودیت‌ها ───────────────────────────────────────────────────────────

export type TradeSyncEntity = "tradeAccount" | "tradeTag" | "tradeChecklist" | "tradeEntry" | "tradeNote" | "tradeSetting";
/** موجودیت‌هایی که حذفِ واقعی دارن (و tombstone) — حساب آرشیو می‌شه، تنظیم null */
export type TradeDeletableEntity = "tradeTag" | "tradeChecklist" | "tradeEntry" | "tradeNote";

/**
 * کلیدهای تنظیماتِ ترید که با entity "tradeSetting" همگام می‌شن (زیرمجموعه‌ی
 * allowlistِ /api/settings). شکلِ value همونیه که وب می‌نویسه (TradeSettingValues
 * پایین)؛ سرور فقط سقفِ ۶۴KB رو چک می‌کنه، پس کلاینت خودش شکل رو رعایت کنه و
 * مقدارِ ناشناخته/بدشکلِ pullشده رو با پیش‌فرض جایگزین کنه.
 * value=null (یا op=delete) یعنی «برگرد به پیش‌فرض».
 * عمدا نیستن: tradeChatRulesAccepted (چت همگام نمی‌شه) و کلیدهای سرور-مدیریت
 * (tradeChecklistSeeded، tradeNewsAlertLog) — push‌شون rejected/invalid می‌شه.
 */
export const TRADE_SYNC_SETTING_KEYS = [
  "tradeTickerSymbols",
  "tradeCalendarSystem",
  "tradeVisibleStats",
  "tradeVisibleFacts",
  "tradeMarketsOnboarded",
  "tradeNewsAlerts",
  "tradeChartSymbol",
  "tradeChartInterval",
] as const;
export type TradeSyncSettingKey = (typeof TRADE_SYNC_SETTING_KEYS)[number];

/** شکلِ valueِ هر کلید (و پیش‌فرضِ وب وقتی null/نبود) */
export type TradeSettingValues = {
  /** نمادهای نوارِ قیمت (Yahoo، مثلا "GC=F"، "EURUSD=X")، ۱ تا ۲۰ تا. پیش‌فرض بسته به بازار */
  tradeTickerSymbols: string[];
  /** تقویمِ نمایشِ تاریخِ معاملات. پیش‌فرض "jalali" */
  tradeCalendarSystem: "jalali" | "gregorian";
  /** کلیدِ آمارهای قابلِ‌نمایش در صفحه‌ی حساب (TradeStatKeyِ lib/tradeTypes.ts). پیش‌فرض DEFAULT_VISIBLE_TRADE_STATS */
  tradeVisibleStats: string[];
  /** کلیدِ «واقعیت»های نمایش‌داده‌شده (TradeFactKey)، حداکثر ۸. پیش‌فرض DEFAULT_VISIBLE_TRADE_FACTS */
  tradeVisibleFacts: string[];
  /** onboardingِ نوارِ بازار دیده شده؟ پیش‌فرض false */
  tradeMarketsOnboarded: boolean;
  /** هشدارِ خبرهای تقویمِ اقتصادی (NewsAlertPrefsِ lib/tradeNewsAlerts.ts) */
  tradeNewsAlerts: {
    enabled: boolean;
    minutesBefore: number;
    impacts: ("LOW" | "MEDIUM" | "HIGH")[];
    /** خالی = همه‌ی ارزها */
    currencies: string[];
    /** کلیدِ پایدارِ «currency|title» برای هشدارِ تک‌رویداد */
    watchedEventKeys: string[];
  };
  /** نمادِ نمودار (مثلا "EURUSD"). پیش‌فرض "EURUSD" */
  tradeChartSymbol: string;
  /** بازه‌ی نمودار (رشته‌ی TradingView مثلِ "60"، "D"). فعلا وب نمی‌نویسدش */
  tradeChartInterval: string;
};

/**
 * فیلدهای «بروکری»ِ معامله‌ای که از متاتریدر همگام شده (`externalId != null`).
 * این‌ها رو EA می‌نویسه و موبایل نمی‌تونه عوضشون کنه: در upsertِ چنین
 * معامله‌ای یا نفرستشون، یا دقیقا همون مقدارِ سرور رو بفرست — هر مقدارِ
 * دیگه‌ای کلِ تغییر رو با `code: "broker_field_locked"` رد می‌کنه.
 * بقیه‌ی فیلدها (احساسات، دلایل، یادداشت، برچسب، ستاپ، ریسک، …) آزادن.
 */
export const TRADE_ENTRY_BROKER_FIELDS = [
  "accountId",
  "symbol",
  "direction",
  "volume",
  "volumeUnit",
  "openedAt",
  "closedAt",
  "status",
  "result",
  "pnl",
  "entryPrice",
  "exitPrice",
  "stopLoss",
  "takeProfit",
  "commission",
  "swap",
] as const;
export type TradeEntryBrokerField = (typeof TRADE_ENTRY_BROKER_FIELDS)[number];

// ─── رکوردهای برگشتی (pull و serverRecord) ────────────────────────────────

/**
 * `editedAt`: زمانِ منطقیِ آخرین ویرایش — همونی که LWW باهاش مقایسه می‌کنه.
 * `updatedAt`: زمانِ سرور؛ فقط برای دیباگ.
 */
type SyncMeta = { editedAt: string; updatedAt: string };

export type TradeAccountRecord = SyncMeta & {
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
  /** «حذفِ حساب» = آرشیو؛ تاریخچه‌ی معاملاتش می‌مونه */
  archived: boolean;
  archivedAt: string | null;
  order: number;
  tagIds: string[];
  /** فقط‌خواندنی: اتصالِ فعالِ متاتریدر روی همین حساب */
  mtConnected: boolean;
  mtLastSyncAt: string | null;
  createdAt: string;
};

export type TradeTagRecord = SyncMeta & { id: string; name: string; color: string; createdAt: string };

export type TradeChecklistItemRecord = {
  id: string;
  text: string;
  order: number;
  /** وضعیتِ زنده‌ی «اجرای فعلیِ» چک‌لیست — نه اسنپ‌شاتِ معامله */
  checked: boolean;
};

export type TradeChecklistRecord = SyncMeta & {
  id: string;
  name: string;
  color: string;
  /** فقط هشدار — هیچ‌وقت جلوی ثبتِ معامله رو نمی‌گیره */
  required: boolean;
  archived: boolean;
  order: number;
  note: string | null;
  items: TradeChecklistItemRecord[];
  createdAt: string;
};

/** متنِ همون لحظه‌ی ثبت، نه متنِ امروزِ چک‌لیست */
export type TradeChecklistSnapshotItem = { text: string; checked: boolean };

export type TradeEntryRecord = SyncMeta & {
  id: string;
  accountId: string;
  symbol: string;
  direction: TradeDirection;
  timeframe: string | null;
  /** UTC */
  openedAt: string;
  closedAt: string | null;
  volume: number;
  volumeUnit: TradeVolumeUnit;
  result: TradeResult;
  /** خالص و علامت‌دار به ارزِ حساب */
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
  /** سمتِ سرور = pnl ÷ riskAmount (مقدارِ کلاینت نادیده گرفته می‌شه) */
  rMultiple: number | null;
  /** سمتِ سرور از openedAt با DSTِ واقعی (مقدارِ کلاینت نادیده گرفته می‌شه) */
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
  /** ارجاع برای فیلتر؛ با حذفِ چک‌لیست null می‌شه */
  checklistId: string | null;
  /** اسنپ‌شاتِ لحظه‌ی ثبت — بعد از ساخت هیچ‌وقت از موبایل عوض نمی‌شه */
  checklistName: string | null;
  checklistDone: number | null;
  checklistTotal: number | null;
  checklistSnapshot: TradeChecklistSnapshotItem[] | null;
  tagIds: string[];
  /** عکس‌ها همگام نمی‌شن؛ فقط تعدادشون */
  imageCount: number;
  /** پر یعنی از متاتریدر اومده ← TRADE_ENTRY_BROKER_FIELDS فقط‌خواندنی‌ان */
  externalId: string | null;
  /**
   * زمانِ LWWِ *فیلدهای دستی*. برای معامله‌ی دستی = editedAt. برای معامله‌ی
   * متاتریدری، sync‌های EA (که فقط فیلدهای بروکری رو می‌نویسن) این رو جلو
   * نمی‌برن — پس ویرایشِ آفلاینِ یادداشت/احساسات/… که قبل از آخرین syncِ EA
   * انجام شده هنوز برنده‌ست. کلاینت برای تصمیمِ push و ادغامِ فیلدهای دستی با
   * این مقایسه کنه، و فیلدهای بروکری رو همیشه از نسخه‌ی سرور بگیره.
   */
  manualEditedAt: string;
  externalSource: string | null;
  createdAt: string;
};

export type TradeNoteRecord = SyncMeta & {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  accountId: string | null;
  entryId: string | null;
  tagIds: string[];
  createdAt: string;
};

export type TradeSettingRecord = SyncMeta & {
  key: TradeSyncSettingKey;
  /** null یعنی حذف/بازنشانی */
  value: unknown;
};

/**
 * ردِ یک حذف (از وب، از موبایل، یا cascade — مثلا purgeِ حساب همه‌ی
 * معاملاتش رو هم tombstone می‌کنه). کلاینت باید رکوردِ محلی رو پاک کنه و
 * ارجاع‌های وابسته رو خودش تمیز کنه، چون سرور برای اون‌ها رکوردِ جدید
 * نمی‌فرسته:
 *   • tradeTag      → اون id رو از tagIdsِ همه‌ی حساب‌ها/معاملات/یادداشت‌ها بردار
 *   • tradeChecklist → checklistIdِ معاملات null (اسنپ‌شات‌شون می‌مونه)
 *   • tradeAccount  → معاملاتش هم tombstone دارن؛ accountIdِ یادداشت‌ها null
 *   • tradeEntry    → entryIdِ یادداشت‌ها null
 */
export type TradeTombstoneRecord = {
  entity: TradeDeletableEntity | "tradeAccount";
  id: string;
  deleted: true;
  /** زمانِ منطقیِ حذف (برای LWW) */
  editedAt: string;
  updatedAt: string;
};

/** GET /api/mobile/trade/pull?since=<cursor> — بدونِ since یعنی همه‌چیز */
export type TradeSyncPullResponse = {
  /** برای درخواستِ بعدی عینا به‌عنوان since بفرست. وقتی moduleLocked، همون since قبلی (یا null) */
  cursor: string | null;
  /** true یعنی هنوز صفحه‌ی بعدی هست (سقفِ ردیف یا حجمِ ~۴MBِ پاسخ پر شد) — فورا دوباره با cursor جدید pull کن */
  hasMore: boolean;
  serverTime: string;
  /** true: کاربر به ماژولِ ترید دسترسی نداره؛ همه‌ی آرایه‌ها خالی‌ان */
  moduleLocked: boolean;
  accounts: TradeAccountRecord[];
  tags: TradeTagRecord[];
  /** مثلِ بقیه صفحه‌بندی می‌شن — با زمانِ مؤثرِ چک‌لیست (خودش یا دیرترین آیتمش) */
  checklists: TradeChecklistRecord[];
  entries: TradeEntryRecord[];
  notes: TradeNoteRecord[];
  settings: TradeSettingRecord[];
  tombstones: TradeTombstoneRecord[];
};

// ─── داده‌ی push ──────────────────────────────────────────────────────────

export type TradeAccountData = {
  name: string;
  broker?: string | null;
  type?: TradeAccountType;
  currency?: string;
  initialBalance?: number | null;
  leverage?: number | null;
  color?: string;
  note?: string | null;
  goalType?: TradeGoalType;
  goalValue?: number | null;
  archived?: boolean;
  order?: number;
  tagIds?: string[];
};

export type TradeTagData = { name: string; color?: string };

export type TradeChecklistData = {
  name: string;
  color?: string;
  required?: boolean;
  archived?: boolean;
  order?: number;
  note?: string | null;
  /** لیستِ کامل و نهایی (جایگزینی، نه تفاضلی) — ۲ تا ۴۰ مورد؛ ترتیب = ترتیبِ آرایه */
  items: { id: string; text: string; checked?: boolean }[];
};

/**
 * جایگزینیِ کامل (مثلِ فرمِ وب). برای معامله‌ی متاتریدری LWW با manualEditedAt
 * (نه editedAt) تصمیم گرفته می‌شه و فقط فیلدهای دستی نوشته می‌شن. sessions و rMultiple اگه فرستاده بشن
 * نادیده گرفته می‌شن و سرور حسابشون می‌کنه. `checklistId` + `checklistState`
 * ({ [itemId]: تیک‌خورده }) فقط موقعِ *ساختِ* معامله خونده می‌شن و سرور از
 * روی چک‌لیستِ ذخیره‌شده اسنپ‌شات می‌سازه؛ در ویرایش‌های بعدی نادیده گرفته
 * می‌شن (اسنپ‌شات تغییرناپذیره). چک‌لیستِ ناقص هیچ‌وقت ثبت رو رد نمی‌کنه.
 */
export type TradeEntryData = {
  accountId: string;
  symbol: string;
  direction: TradeDirection;
  timeframe?: string | null;
  openedAt: string;
  closedAt?: string | null;
  volume: number;
  volumeUnit?: TradeVolumeUnit;
  result: TradeResult;
  pnl?: number | null;
  riskFree?: boolean;
  status: TradeStatus;
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  commission?: number | null;
  swap?: number | null;
  riskAmount?: number | null;
  setup?: string | null;
  entryReasons?: TradeEntryReason[];
  exitReasons?: TradeExitReason[];
  entryReasonNote?: string | null;
  exitReasonNote?: string | null;
  note?: string | null;
  emotionBefore?: TradeEmotionBefore | null;
  emotionAfter?: TradeEmotionAfter | null;
  confidence?: number | null;
  followedPlan?: boolean | null;
  tagIds?: string[];
  checklistId?: string | null;
  checklistState?: Record<string, boolean>;
};

export type TradeNoteData = {
  title: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  /** اگه مالِ کاربر نباشه (یا حذف شده باشه) بی‌صدا null می‌شه — مثلِ وب */
  accountId?: string | null;
  entryId?: string | null;
  tagIds?: string[];
};

/**
 * یک تغییرِ محلی. حساب `delete` نداره — برای «حذف» `archived: true` بفرست.
 * `delete` روی تنظیم یعنی value=null.
 */
export type TradeSyncChange =
  | { entity: "tradeAccount"; id: string; op: "upsert"; data: TradeAccountData; clientUpdatedAt: string }
  | { entity: "tradeTag"; id: string; op: "upsert"; data: TradeTagData; clientUpdatedAt: string }
  | { entity: "tradeChecklist"; id: string; op: "upsert"; data: TradeChecklistData; clientUpdatedAt: string }
  | { entity: "tradeEntry"; id: string; op: "upsert"; data: TradeEntryData; clientUpdatedAt: string }
  | { entity: "tradeNote"; id: string; op: "upsert"; data: TradeNoteData; clientUpdatedAt: string }
  | { entity: TradeDeletableEntity; id: string; op: "delete"; clientUpdatedAt: string }
  | { entity: "tradeSetting"; key: TradeSyncSettingKey; op: "upsert"; data: { value: unknown }; clientUpdatedAt: string }
  | { entity: "tradeSetting"; key: TradeSyncSettingKey; op: "delete"; clientUpdatedAt: string };

/** POST /api/mobile/trade/push — حداکثر TRADE_SYNC_MAX_BATCH تغییر، بدنه حداکثر ۱MB، ترتیبی اعمال می‌شن */
export type TradeSyncPushRequest = { changes: TradeSyncChange[] };

export const TRADE_SYNC_MAX_BATCH = 200;

export type TradeSyncServerRecord =
  | TradeAccountRecord
  | TradeTagRecord
  | TradeChecklistRecord
  | TradeEntryRecord
  | TradeNoteRecord
  | TradeSettingRecord
  | TradeTombstoneRecord;

/**
 * کدِ ماشین‌خوانِ رد — روی این منطق بساز، نه روی متنِ error:
 *   module_locked       اشتراکِ ماژولِ ترید فعال نیست (بعدا دوباره بفرست)
 *   invalid             ورودیِ نامعتبر، یا id مالِ کسِ دیگه — دوباره نفرست
 *   not_found           حسابِ معامله پیدا نشد (مالِ کاربر نیست یا purge شده)
 *   conflict            نامِ برچسبِ تکراری / سقفِ تعداد
 *   broker_field_locked ویرایشِ فیلدِ بروکریِ معامله‌ی متاتریدری
 *   busy                تغییرِ هم‌زمان — دوباره بفرست
 */
export type TradeSyncRejectCode = "module_locked" | "invalid" | "not_found" | "conflict" | "broker_field_locked" | "busy";

/**
 * applied: نوشته شد؛ serverRecord نسخه‌ی نهاییه.
 * stale:   نسخه‌ی سرور جدیدتر (یا هم‌زمان) بود؛ serverRecord رو جایگزینِ نسخه‌ی محلی کن.
 * rejected: code/error دلیلشه.
 */
export type TradeSyncChangeResult = {
  index: number;
  entity: TradeSyncEntity | null;
  id?: string;
  key?: string;
  status: "applied" | "stale" | "rejected";
  code?: TradeSyncRejectCode;
  error?: string;
  serverRecord: TradeSyncServerRecord | null;
};

export type TradeSyncPushResponse = { serverTime: string; moduleLocked: boolean; results: TradeSyncChangeResult[] };
