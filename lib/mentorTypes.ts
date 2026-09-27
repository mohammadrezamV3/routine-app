// تایپ‌های سمتِ کلاینتِ اکوسیستم منتور — آینه‌ی دقیقِ شکلِ پاسخ‌های
// docs/mentors.md. هیچ import سروری/Prisma این‌جا نیست تا هر کامپوننتِ
// کلاینتی (سمت شاگرد و سمت منتور) بتواند مستقیم از همین فایل بخواند.
// تاریخ‌ها همه رشته‌ی ISO‌اند (JSON)؛ ستون‌های @db.Date هم به‌شکلِ
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

/** اطلاعاتِ عمومیِ کاربر — هرگز ایمیل/شماره */
export type PublicUser = {
  id: string;
  name: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type Certification = { category: string; verified: boolean };

export type MentorCard = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  categories: string[];
  identityVerified: boolean;
  certifications: Certification[];
  ratingAvg: number;
  ratingCount: number;
  activeStudents: number;
  totalStudents: number;
  acceptingStudents: boolean;
};

export type MentorDetail = MentorCard & {
  bio: string | null;
  specialties: string[];
  completedPrograms: number;
  lastActiveAt: string | null;
  memberSince: string;
};

export type Review = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  student: { name: string | null; avatarUrl: string | null };
};

export type MyMentorship = { id: string; status: MentorshipStatus; initiatedBy: MentorshipInitiator };

export type MentorsListResponse = { mentors: MentorCard[]; hasMore: boolean };
export type MentorsPopularResponse = { mentors: MentorCard[] };
export type MentorProfileResponse = {
  mentor: MentorDetail;
  reviews: Review[];
  myMentorship: MyMentorship | null;
  canReview: boolean;
  myReview: Review | null;
};

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

export type ProgramProgress = { completed: number; partial: number; missed: number; rate: number };

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
};
export type ProgramsResponse = { programs: ProgramRow[] };

/** GET /api/mentor-programs/[id] → program: همان ProgramRow به‌علاوه‌ی فیلدهای جزئیات */
export type Program = ProgramRow & {
  mentorId?: string;
  studentId?: string;
  description: string | null;
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
};

export type ChatMessage = { id: string; body: string; createdAt: string; readAt: string | null; mine: boolean };
export type MessagesResponse = { messages: ChatMessage[]; hasMore: boolean; canSend: boolean };
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
  recentActivity: { type: "log" | "program" | "message"; at: string; studentName: string; text: string; url: string }[];
  completion: { studentId: string; name: string; avatarUrl: string | null; completed: number; partial: number; missed: number; rate: number }[];
  attention: { studentId: string; name: string; avatarUrl: string | null; reason: string }[];
};

export type ApiError = { error: string };

/** "YYYY-MM-DD" از یک رشته‌ی ISO یا تاریخِ @db.Date */
export function dayKey(iso: string | null | undefined): string | null {
  return iso ? iso.slice(0, 10) : null;
}

/** نامِ نمایشیِ یک کاربرِ عمومی */
export function publicUserName(u: Pick<PublicUser, "name" | "lastName" | "username"> | null | undefined): string {
  if (!u) return "کاربر";
  const full = [u.name, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.username || "کاربر";
}
