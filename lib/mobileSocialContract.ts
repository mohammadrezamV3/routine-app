// قراردادِ API اجتماعیِ اپ اندروید — دوستان، چتِ نماد و گزارش هفتگی —
// /api/mobile/social/*
//
// این فایل عمدا هیچ import‌ای نداره تا عینا بشه کپی‌اش رو توی
// `mobile/src/lib/social-contract.ts` گذاشت. نسخه‌ی مرجع همین‌جاست؛ تستِ
// __tests__/mobileSocialContract.test.ts اگه دو نسخه از هم فاصله بگیرن (یا
// ثابت‌های تکراریِ این‌جا با lib/tradeChat.ts ناهماهنگ بشن) می‌شکنه.
//
// قراردادهای کلی:
//   • احرازِ هویت فقط با `Authorization: Bearer <accessToken>` (lib/mobileAuth.ts).
//   • فقط GET و POST — apiClientِ موبایل PATCH/DELETE نداره؛ پس «قبول/رد/حذف»
//     هرکدوم یک POSTِ جدا با بدنه‌ی JSON‌اند.
//   • منطقِ سرور دقیقا همون روت‌های وبه (هسته‌ی مشترک در lib/mobileSocial*.ts):
//     discoverable/بلاک در جست‌وجو و پروفایل، sharePhone روی شماره، IDOR
//     (هر friendshipId فقط برای دو طرفِ خودش)، سقف‌های نرخ، بن/غیرفعال‌سازی/
//     اخطارِ چت و گیتِ ماژول‌ها.
//   • ماژولِ قفل → 403 با `error: "module_locked"` (ثابت، نه فارسی).
//     چت پشتِ TRADE است، گزارش هفتگی پشتِ AI_INSIGHT؛ دوستان پایه‌ان (بدون گیت).
//   • بقیه‌ی خطاها `{ error: string }` فارسیِ قابلِ نمایش‌اند؛ کلاینت روی
//     status code تصمیم بگیره، نه روی متن.
//   • همه‌ی زمان‌ها ISO-8601 (UTC).

export const SOCIAL_CONTRACT_VERSION = 1;
export const SOCIAL_ERROR_MODULE_LOCKED = "module_locked";
/** ارسالِ پیام پیش از پذیرفتنِ قوانینِ اتاق (409) */
export const SOCIAL_ERROR_RULES_NOT_ACCEPTED = "rules_not_accepted";

export const SOCIAL_ENDPOINTS = {
  /** GET ?module=routine|exercise|calorie */
  friends: "/api/mobile/social/friends",
  /** GET — درخواست‌های دریافتیِ در انتظار */
  requests: "/api/mobile/social/friends/requests",
  /** GET ?q= */
  search: "/api/mobile/social/friends/search",
  /** POST SocialSendRequestBody */
  sendRequest: "/api/mobile/social/friends/request",
  /** POST SocialFriendshipActionBody — فقط گیرنده‌ی درخواست */
  accept: "/api/mobile/social/friends/accept",
  /** POST SocialFriendshipActionBody — ردِ درخواست، لغوِ درخواستِ ارسالی یا حذفِ دوست */
  remove: "/api/mobile/social/friends/remove",
  /** POST SocialFavoriteBody */
  favorite: "/api/mobile/social/friends/favorite",
  /** GET /api/mobile/social/users/:id/profile */
  profile: (userId: string) => `/api/mobile/social/users/${encodeURIComponent(userId)}/profile`,
  /** POST SocialStarBody */
  star: (userId: string) => `/api/mobile/social/users/${encodeURIComponent(userId)}/star`,
  /** POST SocialBlockBody */
  block: (userId: string) => `/api/mobile/social/users/${encodeURIComponent(userId)}/block`,
  /** GET — فهرستِ اتاق‌ها (نمادهای مجاز) + قوانین */
  chatRooms: "/api/mobile/social/chat/rooms",
  /** GET ?symbol=&since=&before=&limit= | POST SocialChatSendBody */
  chat: "/api/mobile/social/chat",
  /** POST SocialChatDeleteBody */
  chatDelete: "/api/mobile/social/chat/delete",
  /** POST SocialChatReportBody */
  chatReport: "/api/mobile/social/chat/report",
  /** POST (بدون بدنه) */
  chatAckWarning: "/api/mobile/social/chat/ack-warning",
  /** POST (بدون بدنه) — tradeChatRulesAccepted = true */
  chatAcceptRules: "/api/mobile/social/chat/rules",
  /** GET ?offset=0|-1|-2… */
  weeklyReport: "/api/mobile/social/weekly-report",
  /** POST { offset } — تولیدِ دوباره (سقفِ ۵ در روز، مشترک با وب) */
  weeklyReportRefresh: "/api/mobile/social/weekly-report/refresh",
} as const;

// ─── دوستان ──────────────────────────────────────────────────────────────

export type SocialStatsModule = "routine" | "exercise" | "calorie";
export const SOCIAL_STATS_MODULES: SocialStatsModule[] = ["routine", "exercise", "calorie"];

export type SocialProgress = { completed: number; total: number; pct: number; streak: number };

export type SocialFriend = SocialProgress & {
  friendshipId: string;
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  /** فیوریتِ سمتِ خودِ بیننده (دوطرفه نیست) */
  favorite: boolean;
};

export type SocialFriendsResponse = { module: SocialStatsModule; friends: SocialFriend[] };

export type SocialFriendRequest = {
  friendshipId: string;
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

export type SocialRequestsResponse = { requests: SocialFriendRequest[] };

export type SocialRelation = "none" | "friends" | "pending_sent" | "pending_received";

export type SocialSearchUser = { id: string; name: string; username: string | null; status: SocialRelation };
export type SocialSearchResponse = { users: SocialSearchUser[] };

/** یکی از دو فیلد — userId برای نتیجه‌ی جست‌وجو، username برای ورودیِ مستقیم */
export type SocialSendRequestBody = { userId?: string; username?: string };
export type SocialSendRequestResponse = { ok: true; friendshipId: string };

export type SocialFriendshipActionBody = { friendshipId: string };
export type SocialFavoriteBody = { friendshipId: string; favorite: boolean };
export type SocialOkResponse = { ok: true };

export type SocialProfile = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  /** فقط وقتی خودِ کاربر sharePhone را روشن کرده — وگرنه همیشه null */
  phone: string | null;
  streak: number;
  bestStreak: number;
  starsCount: number;
  starredByMe: boolean;
  roadmapsCompleted: number;
  plansCompleted: number;
  planName: string | null;
};

export type SocialProfileResponse = { profile: SocialProfile };
export type SocialStarBody = { starred: boolean };
export type SocialStarResponse = { ok: true; starred: boolean; starsCount: number };
export type SocialBlockBody = { blocked: boolean };

// ─── چتِ نماد ────────────────────────────────────────────────────────────

/** آینه‌ی MAX_CHAT_BODY در lib/tradeChat.ts */
export const SOCIAL_CHAT_MAX_BODY = 500;
/** سقفِ صفحه‌ی موبایل؛ سرور بیش از ۲۰۰ (CHAT_PAGE_SIZE/نگه‌داریِ هر اتاق) نمی‌ده */
export const SOCIAL_CHAT_PAGE_SIZE = 50;
export const SOCIAL_CHAT_MAX_PAGE = 200;
/** پولینگ فقط وقتی صفحه دیده می‌شه (وب ۸ ثانیه، موبایل کمی سریع‌تر) */
export const SOCIAL_CHAT_POLL_MS = 5000;

export type SocialChatMessage = {
  id: string;
  symbol: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  mine: boolean;
  reported: boolean;
};

export type SocialChatModeration = {
  canSend: boolean;
  bannedUntil: string | null;
  disabled: boolean;
  warning: { note: string | null; at: string } | null;
};

export type SocialChatResponse = {
  symbol: string;
  /** صعودی بر حسبِ زمان (قدیمی → جدید) */
  messages: SocialChatMessage[];
  moderation: SocialChatModeration;
  rulesAccepted: boolean;
  /** فقط برای صفحه‌بندیِ رو به عقب (بدونِ since) معنا داره */
  hasMore: boolean;
};

export type SocialChatSendBody = { symbol: string; body: string };
export type SocialChatSendResponse = { message: SocialChatMessage };
export type SocialChatDeleteBody = { id: string };

export type SocialChatReportReason = "SPAM" | "ABUSE" | "SCAM" | "OFFTOPIC" | "OTHER";
/** آینه‌ی CHAT_REPORT_REASONS در lib/tradeChat.ts */
export const SOCIAL_CHAT_REPORT_REASONS: { value: SocialChatReportReason; label: string }[] = [
  { value: "SPAM", label: "تبلیغ یا اسپم" },
  { value: "ABUSE", label: "توهین یا بی‌ادبی" },
  { value: "SCAM", label: "کلاهبرداری یا سیگنال‌فروشی" },
  { value: "OFFTOPIC", label: "بی‌ربط به این نماد" },
  { value: "OTHER", label: "دلیل دیگر" },
];
export type SocialChatReportBody = { messageId: string; reason: SocialChatReportReason; note?: string };

export type SocialChatRoom = { symbol: string; label: string };
export type SocialChatRoomsResponse = { rooms: SocialChatRoom[]; rules: string[]; rulesAccepted: boolean };

// ─── گزارش هفتگی ─────────────────────────────────────────────────────────

export type SocialWeeklyDomain = "routine" | "fitness" | "trading" | "learning" | "nutrition";
export const SOCIAL_WEEKLY_DOMAINS: SocialWeeklyDomain[] = ["routine", "fitness", "trading", "learning", "nutrition"];
export const SOCIAL_WEEKLY_DOMAIN_LABELS: Record<SocialWeeklyDomain, string> = {
  routine: "روتین",
  fitness: "بدنسازی",
  trading: "ترید",
  learning: "یادگیری",
  nutrition: "تغذیه",
};

export type SocialWeeklyConfidence = "low" | "medium" | "high";
export type SocialWeeklyStatus = "COLLECTING" | "READY" | "PARTIAL" | "FAILED";

export type SocialWeeklyDomainScore = { active: boolean; hasData: boolean; score: number | null; confidence: SocialWeeklyConfidence };
export type SocialWeeklyDay = { date: string; weekday: string; domains: Partial<Record<SocialWeeklyDomain, number | null>> };
export type SocialWeeklyComparison = { current: number | null; previousWeek: number | null; avg4Week: number | null };
export type SocialWeeklyRecommendation = { title: string; description: string; priority: "high" | "medium" | "low"; domain: string | null };
export type SocialWeeklyInsight = { title: string; description: string; evidence: string; confidence: SocialWeeklyConfidence };
export type SocialWeeklyTrend = { domain: SocialWeeklyDomain; direction: "up" | "down" | "flat" | "insufficient"; weeksConsidered: number };
export type SocialWeeklyStreak = { domain: SocialWeeklyDomain; currentStreakDays: number };
export type SocialWeeklyBaseline = { domain: SocialWeeklyDomain; average: number; weeksConsidered: number };
export type SocialWeeklyPrediction = { domain: SocialWeeklyDomain; message: string; confidence: "low" | "medium"; evidence: string } | null;

export type SocialWeeklyReport = {
  weekStart: string;
  weekEnd: string;
  status: SocialWeeklyStatus;
  algorithmVersion: number;
  overallScore: number | null;
  confidence: SocialWeeklyConfidence;
  domainScores: Record<SocialWeeklyDomain, SocialWeeklyDomainScore>;
  dailyBreakdown: SocialWeeklyDay[];
  wins: string[];
  problems: string[];
  comparison: Record<SocialWeeklyDomain, SocialWeeklyComparison>;
  aiModel: string | null;
  aiSummary: string | null;
  aiRecommendations: SocialWeeklyRecommendation[] | null;
  patterns: {
    trends: SocialWeeklyTrend[];
    streaks: SocialWeeklyStreak[];
    outliers: unknown[];
    correlations: unknown[];
  } | null;
  aiInsights: SocialWeeklyInsight[] | null;
  baselines: SocialWeeklyBaseline[];
  prediction: SocialWeeklyPrediction;
  isFromCache: boolean;
};

export type SocialWeeklyReportResponse = { offset: number; report: SocialWeeklyReport };
/** قدیمی‌ترین هفته‌ای که کلاینت پیشنهاد می‌ده (سرور هر offset ≤ 0 رو قبول می‌کنه) */
export const SOCIAL_WEEKLY_MIN_OFFSET = -12;
