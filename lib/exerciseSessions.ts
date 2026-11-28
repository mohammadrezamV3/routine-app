// منطق خالص «چند جلسه‌ی تمرین در یک روز» — مشترک بین سرور، کلاینت و reducerهای آفلاین.
// هر ردیف ExerciseLog یک جلسه‌ست (sessionNo از 1). قرارداد روز:
//   completed روز = حداقل یک جلسه «پایان تمرین» خورده باشه (استریک/حلقه‌ها همین رو می‌خونن)
//   completedItems روز = اجتماع حرکت‌های همه‌ی جلسه‌ها
// جلسه‌ی «کامل» (done) یعنی پایان خورده و همه‌ی حرکت‌های برنامه انجام شده؛ فقط اون دوباره
// شروع نمی‌شه. جلسه‌ی پایان‌خورده‌ی ناقص (resumable) قابل ادامه‌ست.

export const MAX_SESSIONS_PER_DAY = 10;
const MAX_ITEMS = 500;
const MAX_ITEM_LEN = 200;

export type SessionEntry = {
  no: number;
  completed: boolean;
  completedItems: string[];
  started: boolean;
  /** تعداد حرکت‌های برنامه هنگام پایان؛ null برای ثبت قدیمی */
  plannedCount: number | null;
};

export type DayEntry = {
  completed: boolean;
  completedItems: string[];
  started: boolean;
  sessions?: SessionEntry[];
};

export type SessionStatus = "new" | "active" | "resumable" | "done";

/** پایان‌خورده و همه‌ی حرکت‌های برنامه انجام‌شده (یا ثبت قدیمی بدون تعداد = کامل) */
export function isSessionFullyDone(s: Pick<SessionEntry, "completed" | "completedItems" | "plannedCount"> | null | undefined): boolean {
  if (!s || !s.completed) return false;
  if (s.plannedCount == null) return true;
  return s.plannedCount > 0 && new Set(s.completedItems).size >= s.plannedCount;
}

export function sessionStatus(s: SessionEntry | null | undefined): SessionStatus {
  if (!s) return "new";
  if (isSessionFullyDone(s)) return "done";
  if (s.completed) return "resumable";
  return s.started || s.completedItems.length > 0 ? "active" : "new";
}

export function cleanItems(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((x): x is string => typeof x === "string").slice(0, MAX_ITEMS).map((x) => x.slice(0, MAX_ITEM_LEN));
}

export function nextSessionNo(sessions: { no: number }[]): number {
  return sessions.reduce((mx, s) => Math.max(mx, s.no), 0) + 1;
}

/** جلسه‌ای که باید پیش‌فرض نشون داده بشه: آخرین ناقص/در جریان، وگرنه آخری */
export function defaultSessionNo(sessions: SessionEntry[]): number {
  if (!sessions.length) return 1;
  const open = [...sessions].reverse().find((s) => sessionStatus(s) !== "done");
  return (open ?? sessions[sessions.length - 1]).no;
}

/** اجتماع جلسه‌ها به‌شکل ورودی قدیمی روز (completed/started/completedItems) + فهرست جلسه‌ها */
export function foldSessions(sessions: SessionEntry[]): DayEntry {
  const sorted = [...sessions].sort((a, b) => a.no - b.no);
  const items: string[] = [];
  const seen = new Set<string>();
  for (const s of sorted) for (const it of s.completedItems) if (!seen.has(it)) { seen.add(it); items.push(it); }
  return {
    completed: sorted.some((s) => s.completed),
    completedItems: items,
    started: sorted.some((s) => s.started),
    sessions: sorted,
  };
}

export type SessionRow = { sessionNo: number; completed: boolean; completedItems: unknown; startedAt: Date | null; plannedCount: number | null };

export function rowToSession(r: SessionRow): SessionEntry {
  const items = Array.isArray(r.completedItems) ? (r.completedItems as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return { no: r.sessionNo, completed: r.completed, completedItems: items, started: !!r.startedAt || items.length > 0, plannedCount: r.plannedCount ?? null };
}

export type SessionWrite = {
  session: number;
  completed?: boolean;
  completedItems?: string[];
  started?: boolean;
  plannedCount?: number | null;
};

export type WriteCheck = { ok: true } | { ok: false; code: "SESSION_DONE" | "SESSION_GAP" | "SESSION_LIMIT" };

/**
 * قانون سرور: جلسه‌ی کامل دوباره شروع/باز نمی‌شه (نه started، نه completed:false)،
 * و جلسه‌ی تازه فقط می‌تونه بعد از آخرین جلسه‌ی موجود بیاد و تا سقف روزانه.
 * بازپخش یک پایان‌ثبت‌شده (completed:true) روی جلسه‌ی کامل بی‌خطره.
 */
export function checkSessionWrite(existing: SessionEntry[], w: SessionWrite): WriteCheck {
  if (w.session > MAX_SESSIONS_PER_DAY) return { ok: false, code: "SESSION_LIMIT" };
  const cur = existing.find((s) => s.no === w.session);
  if (!cur) {
    const max = existing.reduce((m, s) => Math.max(m, s.no), 0);
    return w.session <= max + 1 ? { ok: true } : { ok: false, code: "SESSION_GAP" };
  }
  if (isSessionFullyDone(cur)) {
    const onlyReplayOfFinish = w.completed === true && w.started !== true;
    if (!onlyReplayOfFinish) return { ok: false, code: "SESSION_DONE" };
  }
  return { ok: true };
}

/** نتیجه‌ی نوشتن روی ردیف (برای create/update پریزما و reducer آفلاین) */
export function nextSessionState(cur: SessionEntry | undefined, w: SessionWrite, no = w.session): SessionEntry {
  const base: SessionEntry = cur ?? { no, completed: false, completedItems: [], started: false, plannedCount: null };
  // «شروع»: ادامه‌ی جلسه‌ی ناقص پایان‌خورده = دوباره باز می‌شه
  if (w.started === true && w.completed === undefined) {
    return { ...base, started: true, completed: false };
  }
  const items = w.completedItems ?? base.completedItems;
  const completed = !!w.completed;
  return {
    ...base,
    completed,
    completedItems: items,
    started: base.started || completed || items.length > 0,
    plannedCount: completed ? (w.plannedCount ?? base.plannedCount) : base.plannedCount,
  };
}

/** اعمال یک نوشتن روی فهرست جلسه‌ها (مرتب‌شده با no) — reducer آفلاین */
export function applySessionWrite(sessions: SessionEntry[], w: SessionWrite): SessionEntry[] {
  const cur = sessions.find((s) => s.no === w.session);
  const nextS = nextSessionState(cur, w);
  const rest = sessions.filter((s) => s.no !== w.session);
  return [...rest, nextS].sort((a, b) => a.no - b.no);
}
