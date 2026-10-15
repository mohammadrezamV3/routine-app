import { tr } from "@/lib/i18n";
// تایپ‌های سمت کلاینت اکوسیستم منتور — آینه‌ی دقیق شکل پاسخ‌های
// docs/mentors.md. هیچ import سروری/Prisma این‌جا نیست تا هر کامپوننت
// کلاینتی (سمت شاگرد و سمت منتور) بتواند مستقیم از همین فایل بخواند.
// تاریخ‌ها همه رشته‌ی ISO‌اند (JSON)؛ ستون‌های @db.Date هم به‌شکل
// "YYYY-MM-DDT00:00:00.000Z" می‌رسند — برای مقایسه‌ی روز از dayKey استفاده کن.

export type VerificationStatus = "NOT_PROVIDED" | "PENDING" | "VERIFIED" | "REJECTED";
export type MentorshipStatus = "PENDING" | "ACTIVE" | "REJECTED" | "BLOCKED" | "ENDED";
export type MentorshipInitiator = "STUDENT" | "MENTOR";
export type ProgramStatus = "DRAFT" | "PENDING" | "ACCEPTED" | "REJECTED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type ProgramType = "ROUTINE" | "WORKOUT";
export type ProgramRole = "MENTOR" | "STUDENT";
export type ProgramLogStatus = "COMPLETED" | "PARTIAL" | "MISSED";
export type ProgramTransitionAction = "send" | "accept" | "reject" | "request_changes" | "activate" | "complete" | "cancel";
export type MentorshipAction = "accept" | "reject" | "cancel" | "end" | "block" | "unblock";
export type ReportTargetType = "USER" | "REVIEW" | "MESSAGE" | "PROGRAM";
/** سابقه‌ی گفت‌وگو در پنل کاربری — GET /api/mentorships/chat-history */
export type ChatHistoryResponse = { conversations: import("@/lib/mentorChatHistory").ChatHistoryRow[] };

/** اطلاعات عمومی کاربر — هرگز ایمیل/شماره */
export type PublicUser = {
  id: string;
  name: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  /** نام طلایی — کسی که همه‌ی اچیومنت‌ها رو باز کرده */
  golden?: boolean;
  /** Owner/ادمین — نام بنفش سمی (lib/nameStyle.ts) */
  staff?: boolean;
};

export type Certification = { category: string; verified: boolean };

export type MentorCard = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  golden?: boolean;
  staff?: boolean;
  headline: string | null;
  categories: string[];
  /** نقش منتور در حوزه‌ی روتین (مثلا «استاد ریاضی») — null وقتی ROUTINE جزو categories نیست یا پر نشده */
  routineRole: string | null;
  identityVerified: boolean;
  certifications: Certification[];
  ratingAvg: number;
  ratingCount: number;
  activeStudents: number;
  totalStudents: number;
  acceptingStudents: boolean;
  /** OPEN | CLOSED (پذیرش خاموش) | FULL (ظرفیت تکمیل) | AWAY (در دسترس نیست و درخواست متوقف) */
  availability: AvailabilityState;
  /** YYYY-MM-DD روز بازگشت؛ فقط وقتی منتور در حال عدم حضور است */
  awayUntil: string | null;
  responseTimeHours: number | null;
  /** زمان ساخت پروفایل منتوری (ISO) */
  memberSince: string;
};

export type MentorDetail = MentorCard & {
  bio: string | null;
  specialties: string[];
  completedPrograms: number;
  lastActiveAt: string | null;
  /** پیام عدم حضور — فقط وقتی awayUntil پر است */
  awayMessage?: string | null;
  /** سؤال‌هایی که شاگرد هنگام درخواست جواب می‌دهد؛ POST /api/mentorships با { intakeAnswers: string[] } به همین ترتیب */
  intakeQuestions?: string[];
};

// ───────────── دسترس‌پذیری و مدیریت شاگرد (پنل منتور) ─────────────

export type AvailabilityState = "OPEN" | "CLOSED" | "FULL" | "AWAY";
export type IntakeAnswer = { question: string; answer: string };

/** GET/PUT /api/mentor/settings */
export type MentorSettings = {
  acceptingStudents: boolean;
  maxActiveStudents: number | null;
  awayUntil: string | null;
  awayMessage: string | null;
  awayPausesRequests: boolean;
  responseTimeHours: number | null;
  welcomeMessage: string | null;
  intakeQuestions: string[];
};
export type MentorSettingsResponse = {
  settings: MentorSettings;
  activeStudents: number;
  availability: { state: AvailabilityState; away: boolean; full: boolean; awayUntil: string | null };
};

export type StudentLabel = { id: string; name: string };

/** GET /api/mentor/students — یک ردیف به‌ازای هر شاگرد فعال */
export type StudentIndexRow = {
  mentorshipId: string;
  student: PublicUser;
  startedAt: string | null;
  categories: string[];
  labelIds: string[];
  /** نرخ انجام ۷ روز اخیر (۰ تا ۱۰۰)؛ null وقتی ثبتی نیست */
  adherence: number | null;
  lastActivityAt: string | null;
  activePrograms: number;
  unread: number;
  pausedAt: string | null;
};
export type StudentIndexResponse = { students: StudentIndexRow[]; labels: StudentLabel[]; capacity: number | null };

export type StudentNote = { id: string; body: string; createdAt: string; updatedAt: string };

/** GET /api/mentor/students/[studentId]/manage — داده‌ی مدیریتی خصوصی منتور برای یک شاگرد */
export type StudentManageResponse = {
  mentorshipId: string;
  labels: StudentLabel[];
  labelIds: string[];
  notes: StudentNote[];
  intakeAnswers: IntakeAnswer[];
  pausedAt: string | null;
  pauseReason: string | null;
};

export type Review = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  student: { name: string | null; avatarUrl: string | null; golden?: boolean; staff?: boolean };
};

export type MyMentorship = { id: string; status: MentorshipStatus; initiatedBy: MentorshipInitiator };

export type MentorsListResponse = { mentors: MentorCard[]; hasMore: boolean };
/** GET /api/mentors/saved — ذخیره‌شده‌ها (تازه‌ترین اول)؛ max = سقف ذخیره */
export type SavedMentorsResponse = { mentors: MentorCard[]; max: number };
/** GET /api/mentors/popular — mentors: «منتورهای محبوب» (شایستگی)؛ newcomers: «منتورهای تازه» (جایگاه جدا) */
export type MentorsPopularResponse = { mentors: MentorCard[]; newcomers?: MentorCard[] };
export type MentorProfileResponse = {
  mentor: MentorDetail;
  reviews: Review[];
  myMentorship: MyMentorship | null;
  canReview: boolean;
  myReview: Review | null;
  /** این منتور در «ذخیره‌شده‌ها»ی بیننده است (PUT/DELETE /api/mentors/:id/saved) */
  saved?: boolean;
  /** وضعیت بیننده در صف انتظار این منتور (null = در صف نیست) */
  waitlist?: MyWaitlist | null;
  /** تعداد کل منتظرها */
  waitlistCount?: number;
};

// ───────────────────────── صف انتظار (lib/mentorWaitlist.ts) ─────────────────────────

/** GET/POST /api/mentors/:id/waitlist → { waitlist: MyWaitlist | null } */
export type MyWaitlist = {
  status: "WAITING" | "OFFERED" | "EXPIRED";
  /** فقط برای WAITING — «نفر N در صف» */
  position: number | null;
  waiting: number;
  offerExpiresAt: string | null;
};
export type MentorWaitlistRow = {
  id: string;
  user: PublicUser;
  status: "WAITING" | "OFFERED";
  position: number | null;
  joinedAt: string;
  offerExpiresAt: string | null;
};
/** GET /api/mentor/waitlist */
export type MentorWaitlistResponse = { entries: MentorWaitlistRow[]; capacity: number | null; reserved: number };

export type MentorCredential = { category: string; status: VerificationStatus; rejectReason: string | null };
export type MentorDocumentMeta = {
  id: string;
  kind: "IDENTITY" | "CERTIFICATE";
  category: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type MentorSelf = {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  categories: string[];
  /** مقدار ذخیره‌شده؛ PUT /api/mentors/me با { routineRole: string | null } — سقف ۶۰ حرف، بدون ROUTINE پاک می‌شه */
  routineRole: string | null;
  published: boolean;
  acceptingStudents: boolean;
  identityStatus: VerificationStatus;
  identityRejectReason: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  ratingAvg: number;
  ratingCount: number;
  credentials: MentorCredential[];
  documents: MentorDocumentMeta[];
  // تنظیمات دسترس‌پذیری (همان MentorSettings)
  maxActiveStudents?: number | null;
  awayUntil?: string | null;
  awayMessage?: string | null;
  awayPausesRequests?: boolean;
  responseTimeHours?: number | null;
  welcomeMessage?: string | null;
  intakeQuestions?: string[];
  /** نسخه‌ی پذیرفته‌شده‌ی شرایط منتوری؛ اگر با MENTOR_TERMS_VERSION یکی نباشد، ذخیره‌ی بعدی acceptMentorTerms لازم دارد */
  mentorTermsVersion?: string | null;
  acceptedMentorTermsAt?: string | null;
};

export type MentorshipRow = {
  id: string;
  status: MentorshipStatus;
  initiatedBy: MentorshipInitiator;
  message: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  counterpart: PublicUser;
  unread: number;
  activePrograms: number;
  blockedByMe: boolean;
  categories: string[];
  /** جواب‌های شاگرد به سؤال‌های پذیرش */
  intakeAnswers?: IntakeAnswer[];
  /** توقف موقت از طرف منتور (فقط ACTIVE) */
  pausedAt?: string | null;
  pauseReason?: string | null;
  /** فقط ENDED */
  endReason?: string | null;
  endedBy?: MentorshipInitiator | null;
  /** منتور تا این روز در دسترس نیست */
  mentorAway?: { until: string; message: string | null } | null;
  /** پیام خوش‌آمد منتور — فقط برای شاگرد، دو هفته‌ی اول رابطه */
  welcomeMessage?: string | null;
};
export type MentorshipsResponse = { mentorships: MentorshipRow[] };

export type PrivacySettings = {
  shareAllPrograms: boolean;
  sharedPrograms: string[];
  showSchedule: boolean;
  showProgramName: boolean;
  showTaskName: boolean;
  showTaskDetails: boolean;
  showProgress: boolean;
};
export type PrivacyScope = { key: string; label: string; kind: "routine" | "module" };
export type PrivacyResponse = { privacy: PrivacySettings; scopes: PrivacyScope[] };

export type MentorRoutineSlot = {
  jsDay: number;
  time: string;
  program: string | null;
  title: string;
  details: { importance?: string } | null;
  done: Record<string, boolean> | null;
};

/** hidden = شاگرد «نمایش پیشرفت» را برای این منتور بسته؛ اعداد صفرند و نباید «۰٪» نمایش داده شوند */
export type ProgramProgress = { completed: number; partial: number; missed: number; rate: number; hidden?: boolean };

export type ProgramRow = {
  id: string;
  type: ProgramType;
  title: string;
  status: ProgramStatus;
  version: number;
  startDate: string | null;
  endDate: string | null;
  sentAt: string | null;
  updatedAt: string;
  mentorshipId: string;
  counterpart: PublicUser;
  progress: ProgramProgress;
  /** یادداشت منتور روی برنامه (فهرست‌ها؛ در جزئیات هم هست) */
  note?: string | null;
};
export type ProgramsResponse = { programs: ProgramRow[] };

/** GET /api/mentor-programs/[id] → program: همان ProgramRow به‌علاوه‌ی فیلدهای جزئیات */
export type Program = ProgramRow & {
  mentorId?: string;
  studentId?: string;
  description: string | null;
  /** یادداشت منتور روی برنامه (سقف ۱۰۰۰ حرف) — POST/PUT /api/mentor-programs با { note } */
  note: string | null;
  changeRequestNote: string | null;
  rejectReason: string | null;
  respondedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type Item = {
  id: string;
  order: number;
  title: string;
  details: string | null;
  repeat: "DAILY" | "WEEKLY";
  days: number[];
  startTime: string | null;
  durationMin: number | null;
  sets: number | null;
  reps: string | null;
  weightKg: number | null;
  restSec: number | null;
};

export type ItemInput = {
  title: string;
  details?: string;
  repeat: "DAILY" | "WEEKLY";
  days: number[];
  startTime?: string;
  durationMin?: number;
  sets?: number;
  reps?: string;
  weightKg?: number;
  restSec?: number;
};

export type Log = {
  id: string;
  itemId: string;
  date: string;
  status: ProgramLogStatus;
  setsDone: number | null;
  note: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** "AUTO" = از تیک‌های روتین شاگرد؛ "MANUAL" = ثبت دستی قدیمی */
  source?: "AUTO" | "MANUAL";
  doneOn?: string | null;
};

export type Feedback = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  itemId: string | null;
  logId: string | null;
  itemTitle: string | null;
};

export type ProgramDetailResponse = {
  program: Program;
  role: ProgramRole;
  items: Item[];
  logs: Log[];
  feedback: Feedback[];
  /** پیشرفت خودکار برای بازه‌ی from..to (پیش‌فرض هفته‌ی جاری)؛ null = برنامه هنوز فعال نشده */
  progressView?: ProgressView | null;
};

// ───────────── پیشرفت خودکار (lib/mentorProgress.ts) ─────────────
// شاگرد وضعیت را دستی ثبت نمی‌کند؛ هر آیتم/روز از تیک‌های روتین خودش خوانده می‌شود.

/** untracked = برنامه‌ی قدیمی پیش از پیشرفت خودکار که برای آن روز ثبتی ندارد */
export type ProgressState = "done" | "partial" | "missed" | "upcoming" | "untracked";
export type ProgressCell = {
  itemId: string;
  state: ProgressState;
  logId: string | null;
  /** روزی که واقعا تیک خورد، وقتی شاگرد آیتم را در همان هفته جابه‌جا کرده بود */
  doneOn: string | null;
  setsDone: number | null;
  note: string | null;
};
export type ProgressDay = { date: string; cells: ProgressCell[]; /** یادداشت شاگرد برای مربی روی این روز */ note: string | null };
export type ProgressView = {
  /** شاگرد «نمایش پیشرفت» را بسته؛ cells خالی‌اند ولی یادداشت‌های روز می‌مانند */
  hidden: boolean;
  from: string;
  to: string | null;
  /** «امروز» شاگرد (یا روز بسته‌شدن برنامه) */
  today: string;
  days: ProgressDay[];
};
/** POST /api/mentor-programs/:id/logs { date, note } → یادداشت روز (note خالی = حذف). ثبت status رد می‌شود (۴۱۰). */
export type DayNoteResponse = { note: { date: string; body: string } | null };

// گفت‌وگو رمزگذاری سرتاسری دارد (docs/mentor-e2ee.md): سرور فقط enc برمی‌گرداند؛
// legacyBody فقط برای پیام‌های پیش از رمزگذاری (تا بازرمزگذاری یا ۳۰ روز).
export type ChatMessage = {
  id: string;
  senderId: string;
  mine: boolean;
  createdAt: string;
  readAt: string | null;
  /** با «ارسال گروهی» منتور ساخته شده */
  broadcast?: boolean;
  legacyBody: string | null;
  enc: import("@/lib/e2ee/core").EncryptedMessage | null;
};
export type MessagesResponse = {
  messages: ChatMessage[];
  hasMore: boolean;
  canSend: boolean;
  mentorId: string;
  studentId: string;
  /** پیام خوش‌آمد از تنظیمات منتور (رمزگذاری سرتاسری ندارد و جدا نمایش داده می‌شود) */
  welcome: { body: string; at: string } | null;
  /** «پاک کردن سابقه» برای همین کاربر؛ پیام‌های تا این زمان برنمی‌گردند */
  clearedAt?: string | null;
};
export type UnreadResponse = { total: number; byMentorship: Record<string, number> };

export type InAppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};
export type NotificationsResponse = { notifications: InAppNotification[]; unread: number; hasMore: boolean };

export type MentorDashboard = {
  profile: { published: boolean; suspendedAt: string | null; identityStatus: VerificationStatus } | null;
  stats: { students: number; activeStudents: number; pendingRequests: number; pendingPrograms: number; activePrograms: number };
  requests: MentorshipRow[];
  pendingPrograms: ProgramRow[];
  recentActivity: { type: "log" | "program" | "message"; at: string; studentName: string; studentGolden?: boolean; studentStaff?: boolean; text: string; url: string; day?: string }[];
  completion: { studentId: string; name: string; avatarUrl: string | null; golden?: boolean; staff?: boolean; completed: number; partial: number; missed: number; rate: number }[];
  attention: { studentId: string; name: string; avatarUrl: string | null; golden?: boolean; staff?: boolean; reason: string }[];
};

export type ApiError = { error: string };

/** "YYYY-MM-DD" از یک رشته‌ی ISO یا تاریخ @db.Date */
export function dayKey(iso: string | null | undefined): string | null {
  return iso ? iso.slice(0, 10) : null;
}

/** نام نمایشی یک کاربر عمومی */
export function publicUserName(u: Pick<PublicUser, "name" | "lastName" | "username"> | null | undefined): string {
  if (!u) return tr("کاربر", "User");
  const full = [u.name, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || tr("کاربر", "User");
}
