// ساختارِ رودمپ — نسخه‌ی «اسکلت + جزئیاتِ ریزِ هر مرحله».
//
// ساخت در دو فاز انجام می‌شود (lib/aiClient.ts):
//   ۱) اسکلت: عنوان، خلاصه، پیش‌نیازها، خروجی‌های نهایی، ابزارها، و
//      فهرستِ مرحله‌ها فقط با عنوان/هدف/محدوده.
//   ۲) موازی: متنِ کاملِ راهنما (guide) + جزئیاتِ ریزِ *هر* مرحله در یک
//      فراخوانیِ جدا (سرفصل‌ها با توضیح و نکته، کارهای عملی با خروجی،
//      پروژه، ابزار با کاربرد، منابع، اشتباه‌های رایج، معیارهای اتمام).
//
// چرا دو فاز: یک فراخوانیِ تکی که همه‌ی این جزئیات را برای ۱۰+ مرحله
// بنویسد از سقفِ زمانیِ ۶۰ ثانیه‌ی nginx رد می‌شود. تکه‌تکه و موازی، هر
// مرحله توجهِ کاملِ مدل را می‌گیرد و کلِ کار زیرِ همان سقف می‌ماند.
// مرحله‌ای که جزئیاتش نرسید `detailed:false` می‌ماند و کاربر از روی
// صفحه دوباره می‌سازدش — مسیر هیچ‌وقت به‌خاطرِ یک مرحله کلاً شکست نمی‌خورد.

export const PLAN_LIMITS = {
  maxStages: 16,
  minStages: 3,
  maxGuideChars: 24_000,
  minGuideChars: 600,
  // points یک سرفصل می‌تواند یک استانداردِ کامل باشد (مثلا ده موردِ OWASP)
  maxListItems: 16,
  maxTextLen: 1600,
  maxTitleLen: 140,
} as const;

// ── ورودی‌های کاربر ────────────────────────────────────────────────────
// سطح و وقتِ هفتگی مستقیم مدت‌زمان و عمقِ هر مرحله را عوض می‌کنند؛ برای
// همین enum‌اند نه متنِ آزاد، تا مدل همیشه یک عددِ قابلِ استدلال بگیرد.

export const LEVEL_OPTIONS = [
  { value: "zero", label: "صفرِ مطلق", prompt: "هیچ پیش‌زمینه‌ای ندارد؛ از پایه‌ای‌ترین مفهوم شروع کن." },
  { value: "basic", label: "یه چیزایی بلدم", prompt: "مفاهیمِ ابتدایی را پراکنده بلد است ولی منسجم نه؛ پایه‌ها را مرور سریع کن نه آموزش از صفر." },
  { value: "mid", label: "متوسطم", prompt: "پایه‌ها را بلد است و تجربه‌ی کارِ کوچک دارد؛ از مرورِ پایه‌ها بگذر و روی عمق و پروژه‌ی واقعی تمرکز کن." },
  { value: "pro", label: "حرفه‌ای‌ام، می‌خوام عمیق‌تر شم", prompt: "در این حوزه کار کرده؛ فقط مباحثِ پیشرفته، معماری، بهینه‌سازی و سطحِ ارشد." },
] as const;

export const HOURS_OPTIONS = [
  { value: "3", label: "کمتر از ۵ ساعت", hours: 3 },
  { value: "8", label: "۵ تا ۱۰ ساعت", hours: 8 },
  { value: "15", label: "۱۰ تا ۲۰ ساعت", hours: 15 },
  { value: "25", label: "بیشتر از ۲۰ ساعت", hours: 25 },
] as const;

export type LevelValue = (typeof LEVEL_OPTIONS)[number]["value"];
export type HoursValue = (typeof HOURS_OPTIONS)[number]["value"];

export function parseLevel(v: unknown): LevelValue | undefined {
  return LEVEL_OPTIONS.find((o) => o.value === v)?.value;
}
export function parseHours(v: unknown): HoursValue | undefined {
  return HOURS_OPTIONS.find((o) => o.value === v)?.value;
}
export function levelLabel(v?: string | null): string | undefined {
  return LEVEL_OPTIONS.find((o) => o.value === v)?.label;
}
export function hoursLabel(v?: string | null): string | undefined {
  return HOURS_OPTIONS.find((o) => o.value === v)?.label;
}

// ── شکلِ داده ──────────────────────────────────────────────────────────

export type PlanResource = {
  title: string;
  type: string;
  source?: string;
  /** فقط لینکِ منابعِ شناخته‌شده نگه داشته می‌شود — نگاه کن به sanitizeUrl. */
  url?: string;
  /** این منبع دقیقاً برای کدام بخشِ مرحله است. */
  why?: string;
};

export type PlanTool = { name: string; use: string };

/** یک سرفصلِ یادگرفتنی: عنوان + توضیحِ کامل + نکته‌های ریز. */
export type PlanTopic = { title: string; detail: string; points: string[] };

/** یک کارِ عملی: چه کنی، دقیقاً چطور، و چه چیزی باید تحویل بدهی. */
export type PlanTask = { title: string; detail: string; output: string };

export type PlanProject = { title: string; brief: string; deliverables: string[] };

export type PlanStage = {
  /** شماره‌ی مرحله، همیشه ۱ تا n و پشتِ‌سرِ هم. */
  n: number;
  title: string;
  /** بعد از این مرحله چه کاری می‌توانی بکنی. */
  goal: string;
  /** «۲ هفته» — رشته است نه عدد، چون واحدش را خودِ مدل انتخاب می‌کند. */
  duration: string;
  /** محدوده‌ی مرحله در اسکلت — به فازِ جزئیات می‌گوید چه چیزی مالِ این مرحله است. */
  focus: string;
  /** چرا این مرحله این‌جای مسیر است. */
  why: string;
  /** false یعنی فقط اسکلت ساخته شده و جزئیات هنوز نیامده. */
  detailed: boolean;
  prerequisites: string[];
  topics: PlanTopic[];
  tasks: PlanTask[];
  project: PlanProject | null;
  tools: PlanTool[];
  resources: PlanResource[];
  pitfalls: string[];
  /** معیارهای قابلِ سنجشِ تمام‌شدن. */
  done: string[];
};

export type PlanCert = { name: string; note: string };

export type PlanMeta = {
  level?: LevelValue;
  weeklyHours?: HoursValue;
  background?: string;
  /** این مسیر برای چه کسی طراحی شد (برداشتِ مدل از کاربر). */
  audience: string;
  prerequisites: string[];
  /** آخرِ مسیر دقیقاً چه کارهایی از دستت برمی‌آید. */
  outcomes: string[];
  certifications: PlanCert[];
};

export type RoadmapPlan = {
  title: string;
  summary: string;
  guide: string;
  totalDuration: string;
  tools: PlanTool[];
  meta: PlanMeta;
  stages: PlanStage[];
};

export type PlanIssue = { code: string; message: string };

// ── پاک‌سازیِ ورودیِ مدل ─────────────────────────────────────────────────
// خروجیِ مدل هیچ تضمینی ندارد: عدد به‌جای رشته، رشته به‌جای آرایه، فیلدِ
// غایب. normalize هر خروجی‌ای — و هر ردیفِ قدیمیِ دیتابیس — را به یک
// شکلِ قابلِ رندر تبدیل می‌کند تا UI هیچ‌وقت optional-chain نزند.

function text(v: unknown, max: number = PLAN_LIMITS.maxTextLen): string {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

function list(v: unknown, max: number = PLAN_LIMITS.maxListItems): string[] {
  if (typeof v === "string") v = [v];
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const t = text(item);
    if (t) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function objects<T>(v: unknown, map: (o: any) => T | null, max: number = PLAN_LIMITS.maxListItems): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    const m = map(item);
    if (m) out.push(m);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * دامنه‌هایی که لینکشان قابلِ اعتماد است.
 *
 * مدل لینک‌های بسیار قانع‌کننده‌ای *می‌سازد* که وجود ندارند. یک منبعِ
 * واقعی با لینکِ ۴۰۴ بدتر از منبعِ بدونِ لینک است؛ پس عنوان می‌ماند و لینک
 * فقط وقتی دامنه‌اش شناخته‌شده باشد. بقیه در UI به جست‌وجوی همان نام می‌روند.
 */
const TRUSTED_HOSTS = [
  "developer.mozilla.org", "owasp.org", "docs.python.org", "react.dev", "nodejs.org",
  "kubernetes.io", "docs.docker.com", "git-scm.com", "linux.die.net", "man7.org",
  "wikipedia.org", "github.com", "youtube.com", "youtu.be", "coursera.org", "edx.org",
  "freecodecamp.org", "w3schools.com", "stackoverflow.com", "cisco.com", "microsoft.com",
  "learn.microsoft.com", "aws.amazon.com", "cloud.google.com", "postgresql.org",
  "tryhackme.com", "hackthebox.com", "portswigger.net", "kernel.org", "rust-lang.org",
  "go.dev", "php.net", "figma.com", "adobe.com", "blender.org", "khanacademy.org",
  "typescriptlang.org", "nextjs.org", "tailwindcss.com", "kotlinlang.org", "developer.android.com",
  "developer.apple.com", "swift.org", "docs.oracle.com", "cppreference.com", "exercism.org",
  "leetcode.com", "kaggle.com", "pytorch.org", "tensorflow.org", "scikit-learn.org",
  "huggingface.co", "fast.ai", "roadmap.sh", "udemy.com", "codecademy.com", "theodinproject.com",
];

export function sanitizeUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const ok = TRUSTED_HOSTS.some((h) => host === h || host.endsWith("." + h));
    return ok ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function resource(r: any): PlanResource | null {
  if (!r || typeof r !== "object") return null;
  const title = text(r.title, PLAN_LIMITS.maxTitleLen);
  if (!title) return null;
  const res: PlanResource = { title, type: text(r.type, 40) || "منبع" };
  const source = text(r.source, 80);
  if (source) res.source = source;
  const why = text(r.why, 240);
  if (why) res.why = why;
  const url = sanitizeUrl(r.url);
  if (url) res.url = url;
  return res;
}

/** ابزار هم شکلِ قدیمی (رشته) را می‌پذیرد هم شکلِ جدید ({name, use}). */
function tool(t: any): PlanTool | null {
  if (typeof t === "string" || typeof t === "number") {
    const name = text(t, 80);
    return name ? { name, use: "" } : null;
  }
  if (!t || typeof t !== "object") return null;
  const name = text(t.name ?? t.title, 80);
  return name ? { name, use: text(t.use ?? t.usage ?? t.why, 300) } : null;
}

function topic(t: any): PlanTopic | null {
  if (typeof t === "string") {
    const title = text(t, PLAN_LIMITS.maxTitleLen);
    return title ? { title, detail: "", points: [] } : null;
  }
  if (!t || typeof t !== "object") return null;
  const title = text(t.title, PLAN_LIMITS.maxTitleLen);
  return title ? { title, detail: text(t.detail ?? t.description), points: list(t.points ?? t.subtopics) } : null;
}

function task(t: any): PlanTask | null {
  if (typeof t === "string") {
    const title = text(t, 300);
    return title ? { title, detail: "", output: "" } : null;
  }
  if (!t || typeof t !== "object") return null;
  const title = text(t.title, 300);
  return title ? { title, detail: text(t.detail ?? t.how), output: text(t.output ?? t.deliverable, 400) } : null;
}

function project(p: any): PlanProject | null {
  if (!p || typeof p !== "object") return null;
  const title = text(p.title, PLAN_LIMITS.maxTitleLen);
  if (!title) return null;
  return { title, brief: text(p.brief ?? p.description, 1200), deliverables: list(p.deliverables) };
}

function cert(c: any): PlanCert | null {
  if (typeof c === "string") {
    const name = text(c, 100);
    return name ? { name, note: "" } : null;
  }
  if (!c || typeof c !== "object") return null;
  const name = text(c.name ?? c.title, 100);
  return name ? { name, note: text(c.note ?? c.when, 400) } : null;
}

export function normalizeStage(raw: any, index: number): PlanStage | null {
  if (!raw || typeof raw !== "object") return null;
  const title = text(raw.title, PLAN_LIMITS.maxTitleLen);
  if (!title) return null;
  // ردیف‌های نسخه‌ی قبل learn/do/done(رشته) داشتند — همان‌ها به شکلِ جدید
  // نگاشت می‌شوند تا مسیرهای قدیمیِ کاربر خراب نشوند.
  const topics = objects(raw.topics ?? raw.learn, topic);
  const tasks = objects(raw.tasks ?? raw.do, task);
  return {
    // شماره‌ی مدل نادیده گرفته می‌شود و از ترتیبِ آرایه ساخته می‌شود:
    // مدل گاهی از ۰ شماره می‌دهد، گاهی می‌پرد، گاهی تکراری.
    n: index + 1,
    title,
    goal: text(raw.goal),
    duration: text(raw.duration, 60),
    focus: text(raw.focus, 600),
    why: text(raw.why),
    detailed: raw.detailed === false ? false : topics.length > 0 || tasks.length > 0,
    prerequisites: list(raw.prerequisites, 6),
    topics,
    tasks,
    project: project(raw.project),
    tools: objects(raw.tools, tool),
    resources: objects(raw.resources, resource, 8),
    pitfalls: list(raw.pitfalls, 6),
    done: list(raw.done ?? raw.checkpoint, 6),
  };
}

export function normalizeMeta(raw: any): PlanMeta {
  const m = raw && typeof raw === "object" ? raw : {};
  const meta: PlanMeta = {
    audience: text(m.audience, 600),
    prerequisites: list(m.prerequisites, 8),
    outcomes: list(m.outcomes, 10),
    certifications: objects(m.certifications, cert, 6),
  };
  const level = parseLevel(m.level);
  if (level) meta.level = level;
  const hours = parseHours(m.weeklyHours);
  if (hours) meta.weeklyHours = hours;
  const bg = text(m.background, 300);
  if (bg) meta.background = bg;
  return meta;
}

export function normalizePlan(raw: any): RoadmapPlan {
  const stagesRaw = Array.isArray(raw?.stages) ? raw.stages : [];
  const stages: PlanStage[] = [];
  for (const s of stagesRaw.slice(0, PLAN_LIMITS.maxStages)) {
    const stage = normalizeStage(s, stages.length);
    if (stage) stages.push(stage);
  }

  return {
    title: text(raw?.title, PLAN_LIMITS.maxTitleLen),
    summary: text(raw?.summary, 1_200),
    // متنِ راهنما تنها چیزی‌ست که نباید تک‌خطی شود — شکستِ خط بخشی از
    // معنایش است (تیترها و فهرست‌ها)، پس فقط trim و سقفِ طول.
    guide: typeof raw?.guide === "string" ? raw.guide.trim().slice(0, PLAN_LIMITS.maxGuideChars) : "",
    totalDuration: text(raw?.totalDuration ?? raw?.total_duration, 60),
    tools: objects(raw?.tools, tool, PLAN_LIMITS.maxListItems * 2),
    meta: normalizeMeta(raw?.meta),
    stages,
  };
}

// ── اعتبارسنجی ──────────────────────────────────────────────────────────
// پیامِ هر ایراد به مدل پس داده می‌شود (حلقه‌ی تعمیر)، پس باید *برای مدل*
// قابلِ عمل باشد.

/** اسکلت: عنوان و مرحله‌بندیِ درست — جزئیات این‌جا چک نمی‌شود. */
export function validateOutline(plan: RoadmapPlan): PlanIssue[] {
  const issues: PlanIssue[] = [];
  if (!plan.title) issues.push({ code: "no_title", message: "عنوانِ مسیر (title) خالی است." });
  if (plan.stages.length < PLAN_LIMITS.minStages) {
    issues.push({
      code: "too_few_stages",
      message: `فقط ${plan.stages.length} مرحله ساخته شده؛ حداقل ${PLAN_LIMITS.minStages} مرحله لازم است.`,
    });
  }
  if (!plan.meta.outcomes.length) {
    issues.push({ code: "no_outcomes", message: "meta.outcomes خالی است — بگو آخرِ مسیر دقیقاً چه کارهایی از دستش برمی‌آید." });
  }
  const seen = new Set<string>();
  for (const st of plan.stages) {
    const key = st.title.replace(/\s+/g, "");
    if (seen.has(key)) issues.push({ code: "duplicate_stage", message: `مرحله‌ی تکراری: «${st.title}».` });
    seen.add(key);
    if (!st.goal) issues.push({ code: "no_goal", message: `مرحله‌ی «${st.title}» هدف (goal) ندارد.` });
    if (!st.focus) issues.push({ code: "no_focus", message: `مرحله‌ی «${st.title}» محدوده (focus) ندارد.` });
  }
  return issues;
}

/** جزئیاتِ یک مرحله: حداقلِ چیزی که یک مرحله را «قابلِ اجرا» می‌کند. */
export function validateStageDetail(st: PlanStage): PlanIssue[] {
  const issues: PlanIssue[] = [];
  if (st.topics.length < 2) issues.push({ code: "few_topics", message: "حداقل ۲ سرفصل (topics) لازم است." });
  if (st.topics.some((t) => !t.detail)) {
    issues.push({ code: "topic_no_detail", message: "هر سرفصل باید detail داشته باشد (توضیحِ کامل، نه فقط عنوان)." });
  }
  if (st.tasks.length < 2) issues.push({ code: "few_tasks", message: "حداقل ۲ کارِ عملی (tasks) لازم است." });
  if (!st.done.length) issues.push({ code: "no_checkpoint", message: "معیارِ اتمام (done) خالی است." });
  return issues;
}

export function validateGuide(guide: string): PlanIssue[] {
  if (guide.length >= PLAN_LIMITS.minGuideChars) return [];
  return [{
    code: "guide_too_short",
    message: `متنِ guide خیلی کوتاه است (${guide.length} نویسه). باید یک راهنمای کاملِ چندبخشی باشد، نه چند جمله.`,
  }];
}

// ── پیشرفت ──────────────────────────────────────────────────────────────
// دو نوع کلید: «۳» یعنی مرحله‌ی ۳ تمام شد، «۳.۲» یعنی کارِ دومِ مرحله‌ی ۳
// انجام شد. درصدِ کل فقط از مرحله‌ها حساب می‌شود؛ کارها پیشرفتِ داخلیِ هر
// مرحله‌اند. کلید شماره است نه اندیس، چون شماره همان چیزی‌ست که دیده می‌شود.

export type StepProgress = Record<string, boolean>;

export function taskKey(n: number, i: number): string {
  return `${n}.${i + 1}`;
}

/** فقط کلیدهایی که واقعاً مرحله/کاری به آن شماره هست — بقیه دور ریخته می‌شوند. */
export function sanitizeStepProgress(stages: PlanStage[], raw: unknown): StepProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const valid = new Set<string>();
  for (const s of stages) {
    valid.add(String(s.n));
    s.tasks.forEach((_, i) => valid.add(taskKey(s.n, i)));
  }
  const out: StepProgress = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (valid.has(k) && v === true) out[k] = true;
  }
  return out;
}

export type PlanProgress = { total: number; done: number; pct: number };

export function computePlanProgress(stages: PlanStage[], progress: StepProgress): PlanProgress {
  const total = stages.length;
  const done = stages.filter((s) => progress[String(s.n)]).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * شمارشِ مرحله‌های یک ردیفِ خامِ دیتابیس — برای جاهایی بیرونِ خودِ ماژولِ
 * رودمپ (آمارِ ادمین، گزارشِ هفتگی، پروفایلِ دوستان) که فقط «چندتا از
 * چندتا» را می‌خواهند. کلیدهای کار («۳.۲») عمداً شمرده نمی‌شوند.
 */
export function countRowProgress(steps: unknown, progress: unknown): { total: number; done: number } {
  const arr = Array.isArray(steps) ? (steps as any[]) : [];
  const prog = progress && typeof progress === "object" && !Array.isArray(progress)
    ? (progress as Record<string, unknown>)
    : {};
  let done = 0;
  for (let i = 0; i < arr.length; i++) {
    const n = typeof arr[i]?.n === "number" ? arr[i].n : i + 1;
    if (prog[String(n)] === true) done++;
  }
  return { total: arr.length, done };
}
