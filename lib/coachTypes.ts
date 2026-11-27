// قرارداد مشترک بخش مربی نسخه‌ی 3 (بازسازی کامل UI، docs/coach-v3.md).
// بک‌اند، صفحه‌ها و تست‌ها فقط از همین شکل‌ها استفاده می‌کنن؛ بدون هماهنگی عوضش نکن.
// همه‌ی متن‌های نمایشی سمت کلاینت با tr() ساخته می‌شن، این فایل فقط داده‌ست.

import type { ProgramStatus, ProgramType, PublicUser } from "./mentorTypes";

// ── هدف (Goal) ─────────────────────────────────────────────
// هر همکاری حداکثر یک هدف ACTIVE داره. پیشرفت همیشه سمت سرور از داده‌ی واقعی
// (تیک‌های روتین / جلسه‌های تمرین) حساب می‌شه، هیچ‌وقت دستی ثبت نمی‌شه.
export type CoachGoalMetric =
  | "WORKOUT_SESSIONS" // تعداد جلسه‌ی تمرین در هفته (ExerciseLog.completed + برنامه‌ی WORKOUT مربی)
  | "ROUTINE_RATE"; // درصد انجام روتین در هفته (0..100)

export type CoachGoalStatus = "ACTIVE" | "DONE" | "ENDED";

export interface CoachGoalWeek {
  weekStart: string; // YYYY-MM-DD (شنبه، timezone شاگرد)
  value: number | null; // null = هفته هنوز داده نداره یا شاگرد پنهانش کرده
  met: boolean;
  current: boolean;
}

export interface CoachGoal {
  id: string;
  mentorshipId: string;
  title: string; // متن کوتاه انتخاب‌شده، مثلا «هفته‌ای 4 جلسه تمرین»
  metric: CoachGoalMetric;
  target: number; // در هفته: جلسه یا درصد
  weeks: number; // 1..52
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: CoachGoalStatus;
  weeksMet: number;
  weeksPassed: number;
  totalDone: number; // جمع مقدار هفته‌ها (برای کارت نتیجه، مثلا 48 جلسه)
  history: CoachGoalWeek[];
  createdAt: string;
  completedAt: string | null;
}

export interface CoachGoalInput {
  title: string;
  metric: CoachGoalMetric;
  target: number;
  weeks: number;
  startDate?: string; // پیش‌فرض: شنبه‌ی همین هفته
}

// POST /api/mentorships/[id]/goal  body CoachGoalInput  → { goal }   (فقط مربی، همکاری ACTIVE، هدف فعال قبلی ENDED می‌شه)
// PATCH /api/mentorships/[id]/goal body { action: "end" } → { goal }
// GET  /api/mentorships/[id]/goal  → { goal: CoachGoal | null, past: CoachGoal[] }  (هر دو طرف)

// ── گزارش هفته (خودکار) ────────────────────────────────────
// شاگرد هیچ‌چیزی پر نمی‌کنه؛ گزارش از داده‌ی واقعی خودش ساخته می‌شه و فقط چیزهایی
// که با این مربی به اشتراک گذاشته (lib/mentorPrivacy.ts + shareSleep) رو داره.
export interface CoachWeekDay {
  date: string; // YYYY-MM-DD
  routineRate: number | null; // 0..100
  workout: boolean | null; // null = بدون دسترسی / روز استراحت ناشناخته
  sleepMinutes: number | null;
}

export interface CoachWeekReport {
  mentorshipId: string;
  weekStart: string;
  weekEnd: string;
  weekIndex: number; // هفته‌ی چندم همکاری (از 1)
  complete: boolean; // هفته تموم شده یا هنوز در جریانه
  routineRate: number | null; // میانگین 0..100
  routineDelta: number | null; // تفاوت با هفته‌ی قبل (امتیاز درصد)
  workoutsDone: number | null;
  workoutsPlanned: number | null;
  sleepAvgMinutes: number | null; // فقط اگه shareSleep روشن باشه
  streak: number | null; // computeRoutineStreak، فقط با showProgress
  days: CoachWeekDay[]; // همیشه 7 روز
  grade: "great" | "good" | "low" | "none"; // great>=80 good>=50 low<50 none=بدون داده
  summary: string | null; // سه خط نومو (اگه ساخته شده)، فقط برای مربی
  seenAt: string | null; // مربی دیده؟
}

// GET /api/mentorships/[id]/weeks?week=YYYY-MM-DD → { report: CoachWeekReport }  (پیش‌فرض: هفته‌ی جاری)
// GET /api/mentorships/[id]/weeks?list=1         → { weeks: CoachWeekReport[] } (حداکثر 12 هفته‌ی اخیر، بدون days)
// POST /api/mentorships/[id]/weeks/seen body { weekStart } → { ok }  (فقط مربی)
// گزارش هفته‌ی تموم‌شده هر شنبه با زمان‌بند (lib/pushScheduler.ts) snapshot می‌شه و اعلان
// «گزارش هفته‌ی X آماده‌ست» برای مربی می‌ره (یک بار برای هر همکاری+هفته).

// ── فضای همکاری (خط زمانی) ─────────────────────────────────
// پیام‌ها همچنان از /api/mentorships/[id]/messages (رمزگذاری سرتاسری) میان و کلاینت
// اون‌ها رو با این رویدادها بر اساس زمان قاطی می‌کنه. سرور هیچ متن پیامی اینجا نمی‌ده.
export type CoachTimelineEvent =
  | { kind: "program"; id: string; at: string; programId: string; title: string; type: ProgramType; status: ProgramStatus; itemCount: number; days: number[]; weeks: number | null; changeRequested: boolean; rate: number | null }
  | { kind: "week"; id: string; at: string; weekStart: string; grade: CoachWeekReport["grade"]; routineRate: number | null; workoutsDone: number | null; sleepAvgMinutes: number | null }
  | { kind: "goal"; id: string; at: string; goalId: string; title: string; status: CoachGoalStatus; weeksMet: number; weeks: number }
  | { kind: "feedback"; id: string; at: string; programId: string; programTitle: string; itemTitle: string | null; body: string }
  | { kind: "status"; id: string; at: string; status: "started" | "paused" | "resumed" | "ended" };

export interface CoachSpace {
  mentorshipId: string;
  role: "MENTOR" | "STUDENT";
  status: "PENDING" | "ACTIVE" | "ENDED" | "BLOCKED" | "REJECTED";
  paused: boolean;
  since: string | null;
  counterpart: PublicUser & { golden?: boolean; headline?: string | null; responseTimeHours?: number | null };
  goal: CoachGoal | null;
  thisWeek: CoachWeekReport | null; // گزارش هفته‌ی جاری (خلاصه، بدون summary برای شاگرد)
  pendingProgram: { id: string; title: string } | null; // برنامه‌ای که منتظر جواب شاگرده
  todayTasks: { id: string; title: string; meta: string | null; done: boolean }[] | null; // فقط شاگرد: کارهای امروز از برنامه‌های این مربی
  events: CoachTimelineEvent[]; // جدیدترین آخر، حداکثر 200
  unread: number;
  canSend: boolean;
  privacy: { shareSleep: boolean; showProgress: boolean; sharedCount: number } | null; // فقط شاگرد
}

// GET /api/mentorships/[id]/space → CoachSpace   (404 اگه کاربر طرف همکاری نباشه)
// PUT /api/mentorships/[id]/privacy حالا shareSleep: boolean هم می‌پذیره (پیش‌فرض false)

// ── امروز مربی ─────────────────────────────────────────────
export type CoachInboxReason =
  | { kind: "request"; mentorshipId: string; message: string | null; categories: string[] }
  | { kind: "unread"; mentorshipId: string; count: number }
  | { kind: "idle"; mentorshipId: string; days: number }
  | { kind: "change_request"; mentorshipId: string; programId: string; programTitle: string }
  | { kind: "week_ready"; mentorshipId: string; weekStart: string; routineRate: number | null }
  | { kind: "goal_done"; mentorshipId: string; goalId: string; title: string };

export interface CoachInboxItem {
  id: string;
  user: PublicUser;
  reason: CoachInboxReason;
  priority: number; // بیشتر = فوری‌تر
  at: string;
}

export interface CoachToday {
  profile: { published: boolean; accepting: boolean; availability: "OPEN" | "CLOSED" | "AWAY" | "FULL"; suspended: boolean; username: string | null } | null;
  counts: { students: number; doneToday: number; waiting: number };
  hint: string | null; // یک جمله‌ی قاعده‌محور (نه AI)، مثلا «علی 4 روزه تمرین نکرده. اول به اون سر بزن.» — با tr سمت سرور
  inbox: CoachInboxItem[];
  students: { mentorshipId: string; user: PublicUser; todayRate: number | null }[]; // ردیف آواتارها
}

// GET /api/mentor/today → CoachToday

// ── فهرست شاگردها ──────────────────────────────────────────
export interface CoachStudentRow {
  mentorshipId: string;
  user: PublicUser & { golden?: boolean };
  weekRate: number | null;
  idleDays: number;
  paused: boolean;
  unread: number;
  goal: { title: string; weeksMet: number; weeks: number; weeksLeft: number } | null;
  labels: string[];
  needsHelp: boolean; // weekRate<50 یا idleDays>=3
  nearGoal: boolean; // هدف فعال با weeksLeft<=3
}

// GET /api/mentor/students (موجود) حالا CoachStudentRow[] هم برمی‌گردونه: { students: CoachStudentRow[], ... }
// (فیلدهای قبلی برای سازگاری می‌مونن)

// ── نومو برای مربی ─────────────────────────────────────────
// فقط داده‌ای که شاگرد به اشتراک گذاشته؛ هرگز متن پیام‌ها (رمزگذاری سرتاسری).
// سهمیه: سوپریوزر نامحدود، وگرنه COACH_NOMO_DAILY_LIMIT در روز برای هر مربی (rateLimit + AiUsageRecord).
export interface CoachNomoProgramDraft {
  title: string;
  type: ProgramType;
  weeks: number;
  items: { title: string; details: string | null; days: number[]; sets: number | null; reps: number | null; durationMin: number | null; startTime: string | null }[];
}

// POST /api/mentor/nomo/program body { mentorshipId, prompt, type } → { draft: CoachNomoProgramDraft, quota }
// POST /api/mentor/nomo/week    body { mentorshipId, weekStart } → { summary: string, quota }   (روی snapshot ذخیره می‌شه)
// POST /api/mentor/nomo/nudge   body { mentorshipId } → { suggestions: string[], quota }      (2-3 پیام کوتاه تشویقی از روی گزارش هفته)
export interface CoachNomoQuota { unlimited: boolean; used: number; limit: number; remaining: number }

// ── صفحه‌ی عمومی مربی ──────────────────────────────────────
// /c/[username] صفحه‌ی عمومی (SSR، سئو) — همون MentorDetail موجود از روی User.username.
// GET /api/mentors/by-username/[username] → { mentorId } | 404
export interface CoachPublicStats { rating: number | null; reviews: number; goalSuccessRate: number | null; students: number; responseTimeHours: number | null }
