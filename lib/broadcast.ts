import { tr } from "@/lib/i18n";
import { localizedRecord } from "@/lib/localizedRecord";
// پیام همگانی ادمین — منطق خالص و تست‌دار (بدون import سروری، امن برای کلاینت).
// ذخیره‌سازی در AppSetting با کلید `broadcasts` (لیست، تازه‌ترین اول).

export const BROADCAST_TITLE_MAX = 80;
export const BROADCAST_BODY_MAX = 500;
export const BROADCAST_KEEP = 100;
export const BROADCAST_SETTING_KEY = "broadcasts";

export const BROADCAST_CHANNELS = ["inapp", "push"] as const;
export type BroadcastChannel = (typeof BROADCAST_CHANNELS)[number];

export const BROADCAST_SEGMENTS = ["all", "paid", "trial", "inactive", "module", "admins"] as const;
export type BroadcastSegmentKind = (typeof BROADCAST_SEGMENTS)[number];

export const BROADCAST_MODULES = ["ROUTINE", "SLEEP", "TASKS", "EXERCISE", "CALORIE", "TRADE", "ROADMAP", "AI_INSIGHT"] as const;
export type BroadcastModule = (typeof BROADCAST_MODULES)[number];

export const BROADCAST_SEGMENT_LABEL: Record<BroadcastSegmentKind, string> = localizedRecord<BroadcastSegmentKind>({
  all: ["همه‌ی کاربران", "All users"],
  paid: ["کاربران پولی", "Paid users"],
  trial: ["کاربران آزمایشی", "Trial users"],
  inactive: ["غیرفعال 7 روز و بیشتر", "Inactive for 7+ days"],
  module: ["کاربران یک ماژول", "Users of one module"],
  admins: ["فقط ادمین‌ها (ارسال آزمایشی)", "Admins only (test send)"],
});

export const BROADCAST_MODULE_LABEL: Record<BroadcastModule, string> = localizedRecord<BroadcastModule>({
  ROUTINE: ["روتین", "Routine"], SLEEP: ["خواب", "Sleep"], TASKS: ["کارها", "Tasks"], EXERCISE: ["ورزش", "Workout"],
  CALORIE: ["کالری", "Calories"], TRADE: ["ترید", "Trading"], ROADMAP: ["رودمپ", "Roadmap"], AI_INSIGHT: ["AI Insight", "AI Insight"],
});

export type BroadcastSegment = { kind: BroadcastSegmentKind; module?: BroadcastModule };

export type BroadcastStatus = "scheduled" | "sending" | "sent" | "failed" | "canceled";
export const BROADCAST_STATUS_LABEL: Record<BroadcastStatus, string> = localizedRecord<BroadcastStatus>({
  scheduled: ["زمان‌بندی‌شده", "Scheduled"], sending: ["در حال ارسال", "Sending"], sent: ["ارسال‌شده", "Sent"], failed: ["ناموفق", "Failed"], canceled: ["لغوشده", "Canceled"],
});

export type BroadcastRecord = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  channels: BroadcastChannel[];
  segment: BroadcastSegment;
  status: BroadcastStatus;
  /** زمان ارسال (ISO). برای ارسال فوری = لحظه‌ی ساخت */
  sendAt: string;
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
  /** شمارنده‌ی اجراها — قفل ضدتکرار هر اجرا (lib/broadcastServer.ts) */
  runs: number;
  leaseUntil: string | null;
  /** مکان‌نمای صفحه‌بندی (آخرین userId پردازش‌شده) */
  cursor: string | null;
  recipients: number;
  delivered: number;
  pushSent: number;
  startedAt: string | null;
  sentAt: string | null;
  error: string | null;
};

export type BroadcastInput = {
  title: string;
  body: string;
  url: string | null;
  channels: BroadcastChannel[];
  segment: BroadcastSegment;
  sendAt: string | null; // null = همین الان
};

/** فقط مسیر داخل اپ: با «/» شروع شه، «//» و «/\» (پروتکل‌نسبی) و کاراکتر کنترلی نه */
export function isSafeBroadcastPath(raw: string): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 300) return false;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return false;
  return true;
}

export type ParseResult = { ok: true; value: BroadcastInput } | { ok: false; error: string };

export function parseBroadcastInput(raw: unknown, now: Date = new Date()): ParseResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: tr("ورودی نامعتبر است", "Invalid input") };
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  const body = typeof r.body === "string" ? r.body.trim() : "";
  if (!title) return { ok: false, error: tr("عنوان را بنویس", "Write a title") };
  if (title.length > BROADCAST_TITLE_MAX) return { ok: false, error: tr(`عنوان حداکثر ${BROADCAST_TITLE_MAX} حرف`, `Title can be at most ${BROADCAST_TITLE_MAX} characters`) };
  if (!body) return { ok: false, error: tr("متن پیام را بنویس", "Write the message") };
  if (body.length > BROADCAST_BODY_MAX) return { ok: false, error: tr(`متن حداکثر ${BROADCAST_BODY_MAX} حرف`, `Message can be at most ${BROADCAST_BODY_MAX} characters`) };

  let url: string | null = null;
  if (typeof r.url === "string" && r.url.trim()) {
    url = r.url.trim();
    if (!isSafeBroadcastPath(url)) return { ok: false, error: tr("لینک باید مسیر داخل اپ باشد (با / شروع شود)", "The link must be a path inside the app (starting with /)") };
  }

  const channels = Array.isArray(r.channels)
    ? Array.from(new Set(r.channels.filter((c): c is BroadcastChannel => (BROADCAST_CHANNELS as readonly unknown[]).includes(c))))
    : [];
  if (channels.length === 0) return { ok: false, error: tr("حداقل یک کانال انتخاب کن", "Choose at least one channel") };

  const seg = parseSegment(r.segment);
  if (!seg) return { ok: false, error: tr("مخاطب نامعتبر است", "Invalid audience") };

  let sendAt: string | null = null;
  if (r.sendAt != null && r.sendAt !== "") {
    const t = typeof r.sendAt === "string" ? new Date(r.sendAt) : null;
    if (!t || Number.isNaN(t.getTime())) return { ok: false, error: tr("زمان ارسال نامعتبر است", "Invalid send time") };
    // کمی تلورانس برای تفاوت ساعت کلاینت/سرور
    if (t.getTime() > now.getTime() + 60_000) {
      if (t.getTime() > now.getTime() + 90 * 86_400_000) return { ok: false, error: tr("زمان ارسال بیش از 90 روز آینده نمی‌شود", "The send time can't be more than 90 days ahead") };
      sendAt = t.toISOString();
    }
  }
  return { ok: true, value: { title, body, url, channels, segment: seg, sendAt } };
}

export function parseSegment(raw: unknown): BroadcastSegment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!(BROADCAST_SEGMENTS as readonly unknown[]).includes(r.kind)) return null;
  const kind = r.kind as BroadcastSegmentKind;
  if (kind === "module") {
    if (!(BROADCAST_MODULES as readonly unknown[]).includes(r.module)) return null;
    return { kind, module: r.module as BroadcastModule };
  }
  return { kind };
}

/** برنامه‌ی ارسال: فقط زمان‌بندی‌شده‌هایی که موعدشان رسیده + «در حال ارسال»هایی که قفلشان منقضی شده (ادامه‌ی اجرای نیمه‌کاره) */
export function dueBroadcastIds(list: BroadcastRecord[], now: Date): string[] {
  const t = now.getTime();
  return list
    .filter((b) => {
      if (b.status === "scheduled") return new Date(b.sendAt).getTime() <= t;
      if (b.status === "sending") return !b.leaseUntil || new Date(b.leaseUntil).getTime() <= t;
      return false;
    })
    .map((b) => b.id);
}

export function trimBroadcasts(list: BroadcastRecord[]): BroadcastRecord[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, BROADCAST_KEEP);
}

export function normalizeBroadcasts(raw: unknown): BroadcastRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is BroadcastRecord => !!x && typeof x === "object" && typeof (x as any).id === "string" && typeof (x as any).title === "string");
}

export function canCancelBroadcast(b: Pick<BroadcastRecord, "status">): boolean {
  return b.status === "scheduled";
}

/** هر کانالی که پوش داره، اعلان درون‌برنامه‌ای جدا نمی‌سازه مگر inapp هم انتخاب شده باشه */
export function wantsInApp(channels: BroadcastChannel[]): boolean { return channels.includes("inapp"); }
export function wantsPush(channels: BroadcastChannel[]): boolean { return channels.includes("push"); }
