import { prisma } from "@/lib/prisma";
import {
  NodeProgress, RoadmapGraph, computeProgress, normalizeGraph, sanitizeProgress,
} from "@/lib/roadmapGraph";

// خواندن/نوشتنِ رودمپِ گراف‌محور روی دیتابیس.
//
// دو قانونِ ثابت این‌جا:
//   ۱) هر خواندن/نوشتن همیشه با `{ id, userId }` — نه فقط `{ id }`. بدونِ
//      این، کسی با عوض‌کردنِ id در URL رودمپِ یک کاربرِ دیگر را می‌بیند
//      (همان IDORی که در بقیه‌ی اپ هم صریح ممنوع شده).
//   ۲) هر تغییرِ ساختاری (ویرایشِ AI، بازتولید) نسخه‌ی قبلی را در history
//      می‌گذارد. یک ویرایشِ بدِ AI نباید کارِ کاربر را نابود کند.

/** چند نسخه‌ی قبلی نگه داشته شود — ستونِ Json نباید بی‌نهایت رشد کند. */
export const MAX_HISTORY = 5;

export type RoadmapVersion = {
  version: number;
  graph: RoadmapGraph;
  nodeProgress: NodeProgress;
  savedAt: string;
  reason: string;
};

export type OwnedRoadmap = {
  id: string;
  userId: string;
  topic: string;
  title: string;
  version: number;
  graph: RoadmapGraph | null;
  nodeProgress: NodeProgress;
  history: RoadmapVersion[];
  profile: {
    goal: string | null;
    level: string | null;
    deadlineMonths: number | null;
    resourceLang: string | null;
    budget: string | null;
    learnStyle: string | null;
    schedule: unknown;
    answers: unknown;
  };
};

/**
 * گرافِ ذخیره‌شده را از ستون‌های Json بازمی‌سازد.
 *
 * چرا دوباره normalize می‌شود: ردیفی که پیش از یک تغییرِ schema ذخیره شده
 * ممکن است فیلدی کم داشته باشد، و UI مستقیم روی این فیلدها map می‌زند.
 * normalize همان تضمینِ «هیچ‌وقت داده‌ی ناقص به UI نمی‌رسد» را این‌جا هم
 * تکرار می‌کند.
 */
export function graphFromRow(row: { stages: unknown; connections: unknown; title: string; note: string | null; goal: string | null; level: string | null; estimatedHours: number | null; totalWeeks: number | null }): RoadmapGraph | null {
  if (!Array.isArray(row.stages) || !row.stages.length) return null;
  try {
    const g = normalizeGraph({
      title: row.title,
      description: row.note ?? "",
      goal: row.goal ?? "",
      level: row.level ?? "",
      estimated_hours: row.estimatedHours ?? 0,
      estimated_weeks: row.totalWeeks ?? 0,
      stages: row.stages,
      connections: Array.isArray(row.connections) ? row.connections : [],
    });
    // ستونِ stages پر بوده ولی هیچ مرحله‌ای از نرمال‌سازی جان سالم نبرده
    // (ردیفِ خراب). یک گرافِ خالی یعنی یک کانواسِ سفید — به‌جایش null
    // برمی‌گردد تا صفحه سراغِ رندرِ قدیمی برود.
    if (!g.stages.length) return null;
    return g;
  } catch {
    return null;
  }
}

/** رودمپِ کاربر را با گرافِ بازسازی‌شده برمی‌گرداند — یا null اگر مالِ او نباشد. */
export async function loadOwnedRoadmap(id: string, userId: string): Promise<OwnedRoadmap | null> {
  const row = await prisma.roadmap.findFirst({
    where: { id, userId },
    select: {
      id: true, userId: true, topic: true, title: true, note: true, goal: true, level: true,
      estimatedHours: true, totalWeeks: true, stages: true, connections: true,
      nodeProgress: true, version: true, history: true,
      deadlineMonths: true, resourceLang: true, budget: true, learnStyle: true,
      schedule: true, answers: true,
    },
  });
  if (!row) return null;

  const graph = graphFromRow(row);

  return {
    id: row.id,
    userId: row.userId,
    topic: row.topic,
    title: row.title,
    version: row.version,
    graph,
    nodeProgress: graph ? sanitizeProgress(graph, row.nodeProgress) : {},
    history: Array.isArray(row.history) ? (row.history as unknown as RoadmapVersion[]) : [],
    profile: {
      goal: row.goal,
      level: row.level,
      deadlineMonths: row.deadlineMonths,
      resourceLang: row.resourceLang,
      budget: row.budget,
      learnStyle: row.learnStyle,
      schedule: row.schedule,
      answers: row.answers,
    },
  };
}

/** نسخه‌ی فعلی را ته history می‌گذارد و فهرستِ کوتاه‌شده را برمی‌گرداند. */
export function pushVersion(current: OwnedRoadmap, reason: string): RoadmapVersion[] {
  if (!current.graph) return current.history;
  const entry: RoadmapVersion = {
    version: current.version,
    graph: current.graph,
    nodeProgress: current.nodeProgress,
    savedAt: new Date().toISOString(),
    reason: reason.slice(0, 200),
  };
  return [...current.history, entry].slice(-MAX_HISTORY);
}

/**
 * گرافِ تازه را ذخیره می‌کند و نسخه را جلو می‌برد.
 *
 * پیشرفت عمداً *حفظ* می‌شود (نه پاک): اگر ویرایشِ AI نودی را نگه داشته
 * باشد، «تمام‌شده»بودنش هم باید بماند — همین است که ویرایش را بی‌خطر
 * می‌کند. sanitizeProgress خودش کلیدهای نودهای حذف‌شده را دور می‌ریزد.
 */
export async function saveNewVersion(
  current: OwnedRoadmap,
  nextGraph: RoadmapGraph,
  reason: string
): Promise<{ version: number; progress: NodeProgress }> {
  const history = pushVersion(current, reason);
  const progress = sanitizeProgress(nextGraph, current.nodeProgress);

  await prisma.roadmap.updateMany({
    where: { id: current.id, userId: current.userId },
    data: {
      title: nextGraph.title,
      note: nextGraph.description,
      level: nextGraph.level || null,
      estimatedHours: nextGraph.estimatedHours || null,
      totalWeeks: nextGraph.estimatedWeeks || null,
      stages: nextGraph.stages as any,
      connections: nextGraph.connections as any,
      nodeProgress: progress as any,
      history: history as any,
      version: current.version + 1,
    },
  });

  return { version: current.version + 1, progress };
}

/** خلاصه‌ی امنِ رودمپ برای کلاینت — همیشه با پیشرفتِ حساب‌شده‌ی سمتِ سرور. */
export function serializeRoadmap(r: OwnedRoadmap) {
  return {
    id: r.id,
    topic: r.topic,
    title: r.title,
    version: r.version,
    graph: r.graph,
    nodeProgress: r.nodeProgress,
    progress: r.graph ? computeProgress(r.graph, r.nodeProgress) : null,
    versions: r.history.map((h) => ({ version: h.version, savedAt: h.savedAt, reason: h.reason })),
  };
}
