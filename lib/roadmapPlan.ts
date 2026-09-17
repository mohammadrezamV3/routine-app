// ساختارِ رودمپ — نسخه‌ی «راهنمای متنی + مرحله‌ها».
//
// از کاربر فقط دو چیز پرسیده می‌شود: چه چیزی می‌خواهد یاد بگیرد و هدفش
// چیست. بقیه‌اش کارِ مدل است: خودش تشخیص می‌دهد برای رسیدن به آن هدف چه
// باید خواند، با چه ابزارهایی، و آن را در دو قالبِ هم‌زمان می‌دهد:
//
//   • `guide` — متنِ کامل و پیوسته‌ی مسیر. همان چیزی که یک مربیِ واقعی
//     می‌نوشت: از کجا شروع کن، چرا، بعدش چی، با چه ابزاری، کجاها وقت
//     تلف نکن. این متن خودش به‌تنهایی باید کامل و قابلِ خواندن باشد.
//   • `stages` — همان مسیر، بریده‌شده به ۱ تا ۲۰ مرحله‌ی عملی، که کاربر
//     بتواند تیک بزند و پیشرفتش را ببیند.
//
// هیچ‌کدام جایگزینِ دیگری نیست: متن «چرا»ست، مرحله‌ها «چه‌کار کنم».

export const PLAN_LIMITS = {
  maxStages: 20,
  minStages: 1,
  maxGuideChars: 20_000,
  minGuideChars: 400,
  maxListItems: 12,
  maxTextLen: 600,
  maxTitleLen: 120,
} as const;

export type PlanResource = {
  title: string;
  type: string;
  source?: string;
  /** فقط لینکِ منابعِ شناخته‌شده نگه داشته می‌شود — نگاه کن به sanitizeUrl. */
  url?: string;
};

export type PlanStage = {
  /** شماره‌ی مرحله، همیشه ۱ تا n و پشتِ‌سرِ هم. */
  n: number;
  title: string;
  /** این مرحله قرار است به چه توانایی‌ای برساند. */
  goal: string;
  /** «۲ هفته» — رشته است نه عدد، چون واحدش را خودِ مدل انتخاب می‌کند. */
  duration: string;
  /** چه چیزهایی باید خوانده/فهمیده شود. */
  learn: string[];
  /** دقیقاً چه کاری باید انجام شود (تمرین/پروژه). */
  do: string[];
  /** ابزارهایی که در همین مرحله لازم می‌شوند. */
  tools: string[];
  resources: PlanResource[];
  /** معیارِ تمام‌شدن: از کجا بفهمم این مرحله تمام شده. */
  done: string;
};

export type RoadmapPlan = {
  title: string;
  /** یک پاراگراف: این مسیر چیست و آخرش کجاست. */
  summary: string;
  guide: string;
  /** برآوردِ کلِ مسیر، مثلاً «۶ ماه». */
  totalDuration: string;
  /** ابزارهای کلِ مسیر، یک‌جا. */
  tools: string[];
  stages: PlanStage[];
};

export type PlanIssue = { code: string; message: string };

// ── پاک‌سازیِ ورودیِ مدل ─────────────────────────────────────────────────
// خروجیِ مدل هیچ تضمینی ندارد: می‌تواند عدد به‌جای رشته بدهد، آرایه را
// رشته بدهد، یا فیلد را اصلاً نیاورد. normalize هر خروجی‌ای را به یک شکلِ
// قابلِ رندر تبدیل می‌کند تا UI هیچ‌وقت مجبور نباشد optional-chain بزند.

function text(v: unknown, max: number = PLAN_LIMITS.maxTextLen): string {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

function list(v: unknown, max: number = PLAN_LIMITS.maxListItems): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const t = text(item);
    if (t) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * دامنه‌هایی که لینکشان قابلِ اعتماد است.
 *
 * چرا اصلاً فیلتر: مدل لینک‌های بسیار قانع‌کننده‌ای *می‌سازد* که وجود
 * ندارند. یک منبعِ واقعی با لینکِ ۴۰۴ بدتر از منبعِ بدونِ لینک است. پس
 * عنوانِ منبع می‌ماند، ولی لینک فقط وقتی که دامنه‌اش شناخته‌شده باشد.
 */
const TRUSTED_HOSTS = [
  "developer.mozilla.org", "owasp.org", "docs.python.org", "react.dev", "nodejs.org",
  "kubernetes.io", "docs.docker.com", "git-scm.com", "linux.die.net", "man7.org",
  "wikipedia.org", "github.com", "youtube.com", "youtu.be", "coursera.org", "edx.org",
  "freecodecamp.org", "w3schools.com", "stackoverflow.com", "cisco.com", "microsoft.com",
  "learn.microsoft.com", "aws.amazon.com", "cloud.google.com", "postgresql.org",
  "tryhackme.com", "hackthebox.com", "portswigger.net", "kernel.org", "rust-lang.org",
  "go.dev", "php.net", "figma.com", "adobe.com", "blender.org", "khanacademy.org",
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

function resources(v: unknown): PlanResource[] {
  if (!Array.isArray(v)) return [];
  const out: PlanResource[] = [];
  for (const r of v) {
    if (!r || typeof r !== "object") continue;
    const title = text((r as any).title, PLAN_LIMITS.maxTitleLen);
    if (!title) continue;
    const res: PlanResource = { title, type: text((r as any).type, 40) || "منبع" };
    const source = text((r as any).source, 80);
    if (source) res.source = source;
    const url = sanitizeUrl((r as any).url);
    if (url) res.url = url;
    out.push(res);
    if (out.length >= PLAN_LIMITS.maxListItems) break;
  }
  return out;
}

function normalizeStage(raw: any, index: number): PlanStage | null {
  if (!raw || typeof raw !== "object") return null;
  const title = text(raw.title, PLAN_LIMITS.maxTitleLen);
  if (!title) return null;
  return {
    // شماره‌ی مدل نادیده گرفته می‌شود و از ترتیبِ آرایه ساخته می‌شود:
    // مدل گاهی از ۰ شماره می‌دهد، گاهی می‌پرد، گاهی تکراری. ترتیبِ آرایه
    // تنها چیزی‌ست که همیشه درست است.
    n: index + 1,
    title,
    goal: text(raw.goal),
    duration: text(raw.duration, 60),
    learn: list(raw.learn),
    do: list(raw.do ?? raw.tasks),
    tools: list(raw.tools),
    resources: resources(raw.resources),
    done: text(raw.done ?? raw.checkpoint),
  };
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
    summary: text(raw?.summary, 1_000),
    // متنِ راهنما تنها چیزی‌ست که نباید تک‌خطی شود — شکستِ خط بخشی از
    // معنایش است (بندها و تیترها)، پس فقط trim و سقفِ طول.
    guide: typeof raw?.guide === "string" ? raw.guide.trim().slice(0, PLAN_LIMITS.maxGuideChars) : "",
    totalDuration: text(raw?.totalDuration ?? raw?.total_duration, 60),
    tools: list(raw?.tools, PLAN_LIMITS.maxListItems * 2),
    stages,
  };
}

// ── اعتبارسنجی ──────────────────────────────────────────────────────────
// چیزی که این‌جا رد شود دوباره به مدل پس داده می‌شود (حلقه‌ی تعمیر در
// lib/aiClient.ts)، پس پیامِ هر ایراد باید *برای مدل* قابلِ عمل باشد.

export function validatePlan(plan: RoadmapPlan): PlanIssue[] {
  const issues: PlanIssue[] = [];

  if (!plan.title) issues.push({ code: "no_title", message: "عنوانِ مسیر خالی است." });
  if (plan.stages.length < PLAN_LIMITS.minStages) {
    issues.push({ code: "no_stages", message: "هیچ مرحله‌ای ساخته نشده. مسیر باید حداقل یک مرحله داشته باشد." });
  }
  if (plan.stages.length > PLAN_LIMITS.maxStages) {
    issues.push({ code: "too_many_stages", message: `تعدادِ مرحله‌ها بیشتر از ${PLAN_LIMITS.maxStages} است.` });
  }
  if (plan.guide.length < PLAN_LIMITS.minGuideChars) {
    issues.push({
      code: "guide_too_short",
      message: `متنِ guide خیلی کوتاه است (${plan.guide.length} نویسه). باید یک راهنمای کاملِ چندبخشی باشد، نه چند جمله.`,
    });
  }

  const seen = new Set<string>();
  for (const st of plan.stages) {
    const key = st.title.replace(/\s+/g, "");
    if (seen.has(key)) {
      issues.push({ code: "duplicate_stage", message: `مرحله‌ی تکراری: «${st.title}».` });
    }
    seen.add(key);

    // یک مرحله بدونِ «چی بخوانم» و بدونِ «چه‌کار کنم» عملاً یک تیترِ خالی است.
    if (!st.learn.length && !st.do.length) {
      issues.push({
        code: "empty_stage",
        message: `مرحله‌ی «${st.title}» نه چیزی برای خواندن دارد نه کاری برای انجام‌دادن.`,
      });
    }
    if (!st.done) {
      issues.push({ code: "no_checkpoint", message: `مرحله‌ی «${st.title}» معیارِ تمام‌شدن (done) ندارد.` });
    }
  }

  return issues;
}

// ── پیشرفت ──────────────────────────────────────────────────────────────
// کلیدِ پیشرفت شماره‌ی مرحله است («۱»، «۲»…)، نه اندیسِ آرایه — چون شماره
// همان چیزی‌ست که به کاربر نشان داده می‌شود.

export type StepProgress = Record<string, boolean>;

/** فقط کلیدهایی که واقعاً مرحله‌ای به آن شماره هست — بقیه دور ریخته می‌شوند. */
export function sanitizeStepProgress(stages: PlanStage[], raw: unknown): StepProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const valid = new Set(stages.map((s) => String(s.n)));
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
 * چندتا» را می‌خواهند و نباید هرکدام تعریفِ خودشان را از پیشرفت داشته باشند.
 */
export function countRowProgress(steps: unknown, progress: unknown): { total: number; done: number } {
  const list = Array.isArray(steps) ? (steps as any[]) : [];
  const prog = progress && typeof progress === "object" && !Array.isArray(progress)
    ? (progress as Record<string, unknown>)
    : {};
  let done = 0;
  for (let i = 0; i < list.length; i++) {
    const n = typeof list[i]?.n === "number" ? list[i].n : i + 1;
    if (prog[String(n)] === true) done++;
  }
  return { total: list.length, done };
}
