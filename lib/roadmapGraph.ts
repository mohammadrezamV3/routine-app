// گرافِ رودمپ — ساختار، اعتبارسنجی، و محاسبه‌ی پیشرفت.
//
// چرا گراف و نه فهرست: یک مسیرِ یادگیریِ واقعی ترتیبِ خطی ندارد، *وابستگی*
// دارد. «SQL Injection» تا وقتی «HTTP» و «SQL پایه» را نفهمیده‌ای بی‌معنی‌ست،
// ولی «XSS» و «IDOR» می‌توانند موازی باشند. این فایل همان وابستگی‌ها را
// به‌عنوان یک DAG نگه می‌دارد و — مهم‌تر — قبل از این‌که چیزی به کاربر نشان
// داده یا در دیتابیس ذخیره شود، اعتبارش را می‌سنجد.
//
// خروجیِ مدل هیچ‌وقت مستقیم اعتماد نمی‌شود: مدل می‌تواند نودِ تکراری بسازد،
// به نودی ارجاع دهد که وجود ندارد، یا یک حلقه‌ی وابستگی درست کند که UI را
// در یک لوپِ بی‌پایان بیندازد. همه‌ی این‌ها این‌جا گرفته می‌شوند و — به‌جای
// دورانداختنِ کلِ خروجی — به‌شکلِ فهرستِ خطا برمی‌گردند تا به خودِ مدل پس
// داده شود و همان را تعمیر کند (نگاه کن به repair در lib/aiClient.ts).

export type NodeStatus = "not_started" | "in_progress" | "completed";
export const NODE_STATUSES: NodeStatus[] = ["not_started", "in_progress", "completed"];

export type NodeLevel = "beginner" | "intermediate" | "advanced";
const NODE_LEVELS: NodeLevel[] = ["beginner", "intermediate", "advanced"];

export type ResourceType = "article" | "documentation" | "video" | "course" | "lab" | "book";
const RESOURCE_TYPES: ResourceType[] = ["article", "documentation", "video", "course", "lab", "book"];

export type RoadmapResource = {
  title: string;
  type: ResourceType;
  /** فقط وقتی پر است که از اعتبارسنجیِ دامنه رد شده باشد (نگاه کن به sanitizeUrl) */
  url?: string;
  source?: string;
};

export type RoadmapNode = {
  id: string;
  title: string;
  description: string;
  level: NodeLevel;
  estimatedHours: number;
  /** شناسه‌ی نودهایی که باید قبل از این بلد باشی */
  prerequisites: string[];
  topics: string[];
  resources: RoadmapResource[];
  tasks: string[];
};

export type RoadmapStage = {
  id: string;
  title: string;
  description: string;
  order: number;
  nodes: RoadmapNode[];
};

export type RoadmapConnection = { from: string; to: string };

export type RoadmapGraph = {
  title: string;
  description: string;
  goal: string;
  level: string;
  estimatedHours: number;
  estimatedWeeks: number;
  stages: RoadmapStage[];
  connections: RoadmapConnection[];
};

/** وضعیتِ هر نود، فقط سمتِ ما نگه داشته می‌شود — مدل هیچ‌وقت پیشرفت را تعیین نمی‌کند. */
export type NodeProgress = Record<string, NodeStatus>;

// ── سقف‌ها ───────────────────────────────────────────────────────────────
// هم برای هزینه (خروجیِ بزرگ‌تر یعنی توکنِ بیشتر) و هم برای اینکه یک
// رودمپِ ۲۰۰ نودی عملاً غیرقابل‌استفاده است.
export const LIMITS = {
  maxStages: 10,
  maxNodesPerStage: 12,
  maxNodes: 60,
  maxTopics: 12,
  maxTasks: 8,
  maxResources: 6,
  maxPrereqs: 6,
  maxTitle: 120,
  maxDescription: 600,
  maxHoursPerNode: 200,
  maxTotalHours: 5000,
  maxWeeks: 260,
} as const;

// ── اعتبارسنجیِ لینکِ منابع ───────────────────────────────────────────────
// طبقِ خواسته‌ی صریح: «لینکِ جعلی تولید نکن». مدل‌ها در ساختنِ URLهایی که
// *معتبر به‌نظر می‌رسند ولی وجود ندارند* بدنام‌اند، و ما نمی‌توانیم سرِ
// درخواستِ کاربر هر لینک را با یک HEAD چک کنیم (هم کند است هم از سرورِ ما
// ترافیکِ خروجی می‌سازد). راهِ میانه: فقط دامنه‌هایی که مرجعِ شناخته‌شده‌اند
// نگه داشته می‌شوند؛ بقیه دور ریخته می‌شوند و همان منبع بدونِ لینک (با
// عنوان و ناشر) نشان داده می‌شود تا کاربر خودش جست‌وجو کند.
const TRUSTED_RESOURCE_HOSTS = [
  "developer.mozilla.org", "owasp.org", "cheatsheetseries.owasp.org",
  "portswigger.net", "hackerone.com", "bugcrowd.com",
  "docs.python.org", "docs.oracle.com", "learn.microsoft.com", "docs.microsoft.com",
  "kubernetes.io", "docs.docker.com", "git-scm.com", "gnu.org", "kernel.org",
  "w3.org", "ietf.org", "rfc-editor.org", "nist.gov",
  "wikipedia.org", "archive.org",
  "github.com", "gitlab.com",
  "freecodecamp.org", "khanacademy.org", "coursera.org", "edx.org", "udemy.com",
  "youtube.com", "youtu.be",
  "tryhackme.com", "hackthebox.com", "overthewire.org", "root-me.org",
  "leetcode.com", "exercism.org", "roadmap.sh",
  "stackoverflow.com", "web.dev", "css-tricks.com", "smashingmagazine.com",
  "react.dev", "nextjs.org", "nodejs.org", "typescriptlang.org", "prisma.io",
] as const;

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return TRUSTED_RESOURCE_HOSTS.some((t) => h === t || h.endsWith(`.${t}`));
}

/** URL را فقط وقتی برمی‌گرداند که https باشد و دامنه‌اش مرجعِ شناخته‌شده باشد. */
export function sanitizeUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return undefined;
  }
  // فقط https — یک لینکِ http هم ناامن است هم امروز معمولاً ریدایرکت می‌شود
  if (u.protocol !== "https:") return undefined;
  if (!hostAllowed(u.hostname)) return undefined;
  return u.toString();
}

// ── نرمال‌سازی (تبدیلِ خروجیِ خامِ مدل به شکلِ داخلی) ──────────────────────

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function strArray(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = str(x, maxLen);
    if (s) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function posNumber(v: unknown, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n), max);
}

/**
 * شناسه‌ها از خودِ مدل می‌آیند و مستقیم در DOM (کلیدِ React، `id` المان) و
 * در کلیدِ JSONِ پیشرفت می‌نشینند — پس به یک شکلِ بسته محدود می‌شوند.
 */
function slug(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  const cleaned = s.replace(/[^a-z0-9؀-ۿ_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 60);
}

function normStatus(v: unknown): NodeStatus | null {
  return typeof v === "string" && (NODE_STATUSES as string[]).includes(v) ? (v as NodeStatus) : null;
}

function normResource(raw: any): RoadmapResource | null {
  const title = str(raw?.title, LIMITS.maxTitle);
  if (!title) return null;
  const typeRaw = typeof raw?.type === "string" ? raw.type.trim().toLowerCase() : "";
  const type: ResourceType = (RESOURCE_TYPES as string[]).includes(typeRaw)
    ? (typeRaw as ResourceType)
    : "article";
  return {
    title,
    type,
    url: sanitizeUrl(raw?.url),
    source: str(raw?.source, 60) || undefined,
  };
}

function normNode(raw: any): RoadmapNode | null {
  const id = slug(raw?.id) || slug(raw?.title);
  const title = str(raw?.title, LIMITS.maxTitle);
  if (!id || !title) return null;

  const levelRaw = typeof raw?.level === "string" ? raw.level.trim().toLowerCase() : "";
  const level: NodeLevel = (NODE_LEVELS as string[]).includes(levelRaw) ? (levelRaw as NodeLevel) : "beginner";

  const resources = Array.isArray(raw?.resources)
    ? raw.resources.map(normResource).filter((x: RoadmapResource | null): x is RoadmapResource => !!x).slice(0, LIMITS.maxResources)
    : [];

  return {
    id,
    title,
    description: str(raw?.description, LIMITS.maxDescription),
    level,
    estimatedHours: posNumber(raw?.estimated_hours ?? raw?.estimatedHours, LIMITS.maxHoursPerNode),
    prerequisites: Array.from(new Set(
      (Array.isArray(raw?.prerequisites) ? raw.prerequisites : []).map(slug).filter(Boolean)
    )).slice(0, LIMITS.maxPrereqs) as string[],
    topics: strArray(raw?.topics, LIMITS.maxTopics, 160),
    resources,
    tasks: strArray(raw?.tasks, LIMITS.maxTasks, 240),
  };
}

function normStage(raw: any, fallbackOrder: number): RoadmapStage | null {
  const id = slug(raw?.id) || slug(raw?.title) || `stage-${fallbackOrder}`;
  const title = str(raw?.title, LIMITS.maxTitle);
  if (!title) return null;

  const nodes = (Array.isArray(raw?.nodes) ? raw.nodes : [])
    .map(normNode)
    .filter((x: RoadmapNode | null): x is RoadmapNode => !!x)
    .slice(0, LIMITS.maxNodesPerStage);

  return {
    id,
    title,
    description: str(raw?.description, LIMITS.maxDescription),
    order: posNumber(raw?.order, LIMITS.maxStages) || fallbackOrder,
    nodes,
  };
}

/**
 * خروجیِ خامِ مدل → گرافِ نرمال‌شده.
 *
 * نکته‌ی مهم: این تابع فقط *شکل* را درست می‌کند، درباره‌ی درستیِ گراف
 * قضاوت نمی‌کند. آن کارِ validateGraph است — چون خطاهایش باید به مدل پس
 * داده شود، نه بی‌صدا تعمیر.
 */
export function normalizeGraph(raw: any): RoadmapGraph {
  if (!raw || typeof raw !== "object") throw new Error("خروجی مدل ساختار معتبری نداشت");

  const stages: RoadmapStage[] = (Array.isArray(raw.stages) ? raw.stages : [])
    .map((s: any, i: number) => normStage(s, i + 1))
    .filter((x: RoadmapStage | null): x is RoadmapStage => !!x)
    .slice(0, LIMITS.maxStages)
    // ترتیب همیشه ۱..n و بدونِ حفره، هرچه مدل داده باشد
    .sort((a: RoadmapStage, b: RoadmapStage) => a.order - b.order)
    .map((s: RoadmapStage, i: number) => ({ ...s, order: i + 1 }));

  const nodeIds = new Set(stages.flatMap((s) => s.nodes.map((n) => n.id)));

  // یال‌ها: هم آن‌چه مدل صریح در connections داده، هم آن‌چه از prerequisites
  // درمی‌آید. این دو در خروجیِ مدل معمولاً هم‌پوشان (و گاهی متناقض)اند؛ اتحادِ
  // یکتاشده تنها چیزی‌ست که می‌شود به آن تکیه کرد.
  const edges = new Map<string, RoadmapConnection>();
  const addEdge = (from: string, to: string) => {
    if (!from || !to) return;
    edges.set(`${from}→${to}`, { from, to });
  };
  for (const c of Array.isArray(raw.connections) ? raw.connections : []) {
    addEdge(slug(c?.from), slug(c?.to));
  }
  for (const s of stages) {
    for (const n of s.nodes) {
      for (const p of n.prerequisites) addEdge(p, n.id);
    }
  }

  // prerequisites هم با همان یال‌ها هم‌خوان می‌شود تا UI و گراف دو روایتِ
  // متفاوت نداشته باشند.
  const incoming = new Map<string, Set<string>>();
  for (const e of Array.from(edges.values())) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue; // ارجاعِ نامعتبر را validateGraph گزارش می‌کند
    if (!incoming.has(e.to)) incoming.set(e.to, new Set());
    incoming.get(e.to)!.add(e.from);
  }
  for (const s of stages) {
    for (const n of s.nodes) {
      const fromEdges = incoming.get(n.id);
      if (fromEdges) n.prerequisites = Array.from(fromEdges).slice(0, LIMITS.maxPrereqs);
    }
  }

  const totalNodeHours = stages.reduce(
    (sum, s) => sum + s.nodes.reduce((a, n) => a + n.estimatedHours, 0), 0
  );

  return {
    title: str(raw.title, LIMITS.maxTitle) || "مسیر یادگیری",
    description: str(raw.description, LIMITS.maxDescription),
    goal: str(raw.goal, LIMITS.maxTitle),
    level: str(raw.level, 40),
    estimatedHours: posNumber(raw.estimated_hours ?? raw.estimatedHours, LIMITS.maxTotalHours) || totalNodeHours,
    estimatedWeeks: posNumber(raw.estimated_weeks ?? raw.estimatedWeeks, LIMITS.maxWeeks),
    stages,
    connections: Array.from(edges.values()),
  };
}

// ── اعتبارسنجیِ گراف ─────────────────────────────────────────────────────

export type GraphIssue = {
  code:
    | "empty_graph" | "empty_stage" | "too_many_nodes"
    | "duplicate_node" | "duplicate_stage"
    | "unknown_prerequisite" | "unknown_connection"
    | "self_dependency" | "cycle" | "orphan_node"
    | "stage_order" | "forward_prerequisite"
    | "invalid_hours";
  message: string;
};

/**
 * تشخیصِ حلقه با DFSِ رنگی. برخلافِ «آیا حلقه دارد؟»، *خودِ مسیرِ حلقه* را
 * برمی‌گرداند — چون همین رشته است که به مدل پس داده می‌شود و بدونِ آن،
 * تعمیر یک حدسِ کور است.
 */
export function findCycle(nodeIds: string[], edges: RoadmapConnection[]): string[] | null {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    if (adj.has(e.from) && adj.has(e.to)) adj.get(e.from)!.push(e.to);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodeIds.map((id) => [id, WHITE]));
  const parent = new Map<string, string>();

  for (const start of nodeIds) {
    if (color.get(start) !== WHITE) continue;

    // پیمایشِ غیربازگشتی — یک گرافِ عمیق نباید استک را بترکاند.
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }];
    color.set(start, GRAY);

    while (stack.length) {
      const top = stack[stack.length - 1];
      const neighbours = adj.get(top.id) || [];
      if (top.i >= neighbours.length) {
        color.set(top.id, BLACK);
        stack.pop();
        continue;
      }
      const next = neighbours[top.i++];
      const c = color.get(next);
      if (c === GRAY) {
        // حلقه پیدا شد — مسیر را از روی والدها بازسازی کن
        const path = [next];
        let cur = top.id;
        while (cur !== next && path.length < nodeIds.length + 1) {
          path.push(cur);
          const p = parent.get(cur);
          if (!p) break;
          cur = p;
        }
        if (cur === next) path.push(next);
        return path.reverse();
      }
      if (c === WHITE) {
        parent.set(next, top.id);
        color.set(next, GRAY);
        stack.push({ id: next, i: 0 });
      }
    }
  }
  return null;
}

/** ترتیبِ توپولوژیک (Kahn) — هم اثباتِ DAG بودن، هم پایه‌ی چیدمانِ لایه‌ایِ UI. */
export function topologicalLayers(nodeIds: string[], edges: RoadmapConnection[]): string[][] | null {
  const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }

  const layers: string[][] = [];
  let frontier = nodeIds.filter((id) => (indeg.get(id) || 0) === 0);
  let seen = 0;

  while (frontier.length) {
    layers.push(frontier);
    seen += frontier.length;
    const next: string[] = [];
    for (const id of frontier) {
      for (const to of adj.get(id) || []) {
        const d = (indeg.get(to) || 0) - 1;
        indeg.set(to, d);
        if (d === 0) next.push(to);
      }
    }
    frontier = next;
  }

  return seen === nodeIds.length ? layers : null; // ناقص یعنی حلقه دارد
}

/**
 * همه‌ی ایرادهای گراف را یک‌جا برمی‌گرداند (نه اولین ایراد) — چون قرار است
 * در یک درخواست به مدل پس داده شود تا همه را با هم تعمیر کند.
 */
export function validateGraph(graph: RoadmapGraph): GraphIssue[] {
  const issues: GraphIssue[] = [];

  if (!graph.stages.length) {
    issues.push({ code: "empty_graph", message: "رودمپ هیچ مرحله‌ای ندارد." });
    return issues;
  }

  // شناسه‌ها
  const stageIds = new Set<string>();
  const nodeStage = new Map<string, number>(); // nodeId → stage order
  const nodeTitle = new Map<string, string>();

  for (const s of graph.stages) {
    if (stageIds.has(s.id)) {
      issues.push({ code: "duplicate_stage", message: `شناسه‌ی مرحله تکراری است: ${s.id}` });
    }
    stageIds.add(s.id);

    if (!s.nodes.length) {
      issues.push({ code: "empty_stage", message: `مرحله‌ی «${s.title}» هیچ نودی ندارد.` });
    }

    for (const n of s.nodes) {
      if (nodeStage.has(n.id)) {
        issues.push({ code: "duplicate_node", message: `شناسه‌ی نود تکراری است: ${n.id}` });
      }
      nodeStage.set(n.id, s.order);
      nodeTitle.set(n.id, n.title);

      if (n.estimatedHours <= 0) {
        issues.push({ code: "invalid_hours", message: `نودِ «${n.title}» زمانِ تخمینیِ معتبر ندارد.` });
      }
    }
  }

  const allNodeIds = Array.from(nodeStage.keys());
  if (!allNodeIds.length) {
    issues.push({ code: "empty_graph", message: "رودمپ هیچ نودی ندارد." });
    return issues;
  }
  if (allNodeIds.length > LIMITS.maxNodes) {
    issues.push({ code: "too_many_nodes", message: `تعداد نودها از ${LIMITS.maxNodes} بیشتر است.` });
  }

  // ترتیبِ مرحله‌ها باید ۱..n و بدونِ حفره باشد
  const orders = graph.stages.map((s) => s.order).sort((a, b) => a - b);
  const orderOk = orders.every((o, i) => o === i + 1);
  if (!orderOk) {
    issues.push({ code: "stage_order", message: `ترتیبِ مرحله‌ها باید ۱ تا ${graph.stages.length} و پشتِ‌سرهم باشد.` });
  }

  // ارجاع‌ها
  for (const s of graph.stages) {
    for (const n of s.nodes) {
      for (const p of n.prerequisites) {
        if (p === n.id) {
          issues.push({ code: "self_dependency", message: `نودِ «${n.title}» پیش‌نیازِ خودش شده.` });
          continue;
        }
        if (!nodeStage.has(p)) {
          issues.push({ code: "unknown_prerequisite", message: `نودِ «${n.title}» به پیش‌نیازِ ناموجود ارجاع داده: ${p}` });
          continue;
        }
        // پیش‌نیازی که در مرحله‌ی *بعدی* است یعنی ترتیبِ یادگیری غلط چیده شده
        const pStage = nodeStage.get(p)!;
        if (pStage > s.order) {
          issues.push({
            code: "forward_prerequisite",
            message: `پیش‌نیازِ «${nodeTitle.get(p)}» در مرحله‌ی ${pStage} است ولی «${n.title}» در مرحله‌ی ${s.order} — پیش‌نیاز نمی‌تواند بعد از خودِ نود بیاید.`,
          });
        }
      }
    }
  }

  for (const c of graph.connections) {
    if (!nodeStage.has(c.from) || !nodeStage.has(c.to)) {
      issues.push({ code: "unknown_connection", message: `اتصالِ نامعتبر: ${c.from} → ${c.to}` });
    }
  }

  // حلقه
  const cycle = findCycle(allNodeIds, graph.connections);
  if (cycle) {
    issues.push({
      code: "cycle",
      message: `حلقه‌ی وابستگی: ${cycle.map((id) => nodeTitle.get(id) || id).join(" → ")}`,
    });
  }

  // نودِ یتیم — فقط وقتی گراف بیش از یک نود دارد. نودِ اولِ مسیر طبیعتاً
  // پیش‌نیاز ندارد، ولی نودی که *نه* پیش‌نیاز دارد *نه* پیش‌نیازِ کسی است
  // عملاً به مسیر وصل نیست.
  if (allNodeIds.length > 1) {
    const connected = new Set<string>();
    for (const c of graph.connections) {
      connected.add(c.from);
      connected.add(c.to);
    }
    for (const id of allNodeIds) {
      if (!connected.has(id)) {
        issues.push({ code: "orphan_node", message: `نودِ «${nodeTitle.get(id)}» به هیچ نودِ دیگری وصل نیست.` });
      }
    }
  }

  return issues;
}

// ── پیشرفت ───────────────────────────────────────────────────────────────

export type ProgressSummary = {
  total: number;
  completed: number;
  inProgress: number;
  pct: number;
  hoursDone: number;
  hoursTotal: number;
};

/**
 * پیشرفت **همیشه** این‌جا حساب می‌شود، نه توسط مدل و نه در کلاینت — طبقِ
 * خواسته‌ی صریح: این عدد باید قطعی و قابلِ بازتولید باشد.
 */
export function computeProgress(graph: RoadmapGraph, progress: NodeProgress): ProgressSummary {
  let total = 0, completed = 0, inProgress = 0, hoursDone = 0, hoursTotal = 0;

  for (const s of graph.stages) {
    for (const n of s.nodes) {
      total++;
      hoursTotal += n.estimatedHours;
      const st = progress[n.id];
      if (st === "completed") { completed++; hoursDone += n.estimatedHours; }
      else if (st === "in_progress") inProgress++;
    }
  }

  return {
    total,
    completed,
    inProgress,
    pct: total ? Math.round((completed / total) * 100) : 0,
    hoursDone,
    hoursTotal,
  };
}

/** فقط کلیدهایی که واقعاً نودِ موجودند و وضعیتشان معتبر است — بقیه دور ریخته می‌شوند. */
export function sanitizeProgress(graph: RoadmapGraph, raw: unknown): NodeProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const ids = new Set(graph.stages.flatMap((s) => s.nodes.map((n) => n.id)));
  const out: NodeProgress = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ids.has(k)) continue;
    const st = normStatus(v);
    // not_started حالتِ پیش‌فرض است؛ ذخیره‌اش فقط ردیف را بزرگ می‌کند
    if (st && st !== "not_started") out[k] = st;
  }
  return out;
}

/** آیا همه‌ی پیش‌نیازهای این نود تمام شده‌اند؟ (برای نشان‌دادنِ «قفل» در UI) */
export function isNodeUnlocked(node: RoadmapNode, progress: NodeProgress): boolean {
  return node.prerequisites.every((p) => progress[p] === "completed");
}

/** همه‌ی نودهای گراف، به‌ترتیبِ مرحله. */
export function allNodes(graph: RoadmapGraph): RoadmapNode[] {
  return graph.stages.flatMap((s) => s.nodes);
}
