// جدولِ طبقه‌بندیِ همه‌ی `/api/*`هایی که کدِ وب (صفحه‌های روت‌شده + کامپوننت‌ها
// + lib) صدا می‌زنه — mobile/PORT_PLAN.md → «Endpoint classification».
//
//   LOCAL  ← هندلرِ محلی روی Dexie با *همون شکلِ پاسخِ* روتِ وب (تستِ parity)
//   CACHED ← فوروارد با Bearer + stale-while-revalidate در arion-http-cache
//   ONLINE ← فوروارد با Bearer؛ آفلاین ← 503 {error:"اتصال اینترنت برقرار نیست"}
//   NA     ← در اپ معنایی نداره (پیش‌بارگذاریِ وب، وب‌پوش) ← 404، هرگز فوروارد نمی‌شه
// `barrier` ← push ِ dirty قبل و pull بعد (localApi/barrier.ts).
// `todo` ← فعلا ONLINE، در فازِ نام‌برده LOCAL می‌شه (طبقِ PORT_PLAN).
//
// تستِ گارد (classification.test.ts) هر لیترالِ `/api/` در گرافِ importِ کدِ وبِ
// اپ رو اسکن می‌کنه و الزام می‌کنه این‌جا طبقه‌بندی شده باشه؛ و هر الگوی این
// جدول باید یک روتِ واقعی در app/api داشته باشه.
import type { GatedModule } from "@m/sync/SyncProvider";
import type { HttpMethod, LocalHandler } from "./types";
import { getDaily, getDailyKeys, getDailyRange, postDaily } from "./handlers/routine";
import { getSettingHandler, postSettingHandler } from "./handlers/settings";
import { getExerciseSchedule } from "./handlers/exercise";
import { start2fa } from "./handlers/auth";

export type EndpointClass = "LOCAL" | "CACHED" | "ONLINE" | "NA";

export type RouteDef = {
  /** "/api/friends/:id/favorite" — `:x` یک سگمنت */
  pattern: string;
  methods: HttpMethod[] | "*";
  cls: EndpointClass;
  /** LOCAL: هندلرِ محلی (بدونِ هندلر ← خطای پیکربندی، تست می‌گیره) */
  handler?: LocalHandler;
  /** LOCAL: گیتِ ماژولِ پولی (همون requireModuleِ روتِ وب) */
  module?: GatedModule;
  /** بدونِ نشست/Bearer (ثبت‌نام، بازیابی رمز، پیش‌ورود) */
  public?: boolean;
  /** سقفِ زمانِ ۹۰ ثانیه */
  ai?: boolean;
  barrier?: boolean;
  /** فعلا ONLINE؛ فازی که محلی/کش می‌شه */
  todo?: string;
};

const R = (pattern: string, methods: HttpMethod[] | "*", cls: EndpointClass, extra: Partial<RouteDef> = {}): RouteDef => ({
  pattern,
  methods,
  cls,
  ...extra,
});

// ترتیب مهمه: اولین تطابق (متد + الگو) برنده است — خاص قبل از عام.
export const ROUTES: RouteDef[] = [
  // ─── LOCAL (فاز 1b) ────────────────────────────────────────────────
  R("/api/tasks/daily", ["GET"], "LOCAL", { handler: getDaily }),
  R("/api/tasks/daily", ["POST"], "LOCAL", { handler: postDaily }),
  R("/api/tasks/daily/range", ["GET"], "LOCAL", { handler: getDailyRange }),
  R("/api/tasks/daily/keys", ["GET"], "LOCAL", { handler: getDailyKeys }),
  R("/api/settings/:key", ["GET"], "LOCAL", { handler: getSettingHandler }),
  R("/api/settings/:key", ["POST"], "LOCAL", { handler: postSettingHandler }),
  R("/api/exercise/schedule", ["GET"], "LOCAL", { handler: getExerciseSchedule, module: "EXERCISE" }),
  // پیش‌ورودِ صفحه‌ی لاگینِ وب ← ورودِ موبایل (shims/authBridge)
  R("/api/auth/2fa/start", ["POST"], "LOCAL", { handler: start2fa, public: true }),

  // ─── CACHED ────────────────────────────────────────────────────────
  // /api/account منبعِ isSuperAdmin (shimِ نشست) و moduleAccess (گاردها)
  R("/api/account", ["GET"], "CACHED"),
  R("/api/account/avatar", ["GET"], "CACHED"),
  R("/api/plans", ["GET"], "CACHED"),
  R("/api/trade/economic-calendar", ["GET"], "CACHED"),
  R("/api/trade/metatrader", ["GET"], "CACHED"),
  R("/api/roadmaps", ["GET"], "CACHED", { todo: "phase4: seed from arion-roadmaps" }),
  R("/api/roadmaps/:id", ["GET"], "CACHED", { todo: "phase4: seed from arion-roadmaps" }),
  R("/api/reports/weekly", ["GET"], "CACHED", { barrier: true }),
  R("/api/reports/weekly/goals", ["GET"], "CACHED", { barrier: true }),
  R("/api/reports/weekly/:domain", ["GET"], "CACHED", { barrier: true }),

  // ─── ONLINE: روتین/وب‌سرور ─────────────────────────────────────────
  // POST سرور customOccurrences/removedOccurrences رو می‌نویسه ← سد
  R("/api/routine/assistant", ["POST"], "ONLINE", { barrier: true, ai: true }),
  // GET فقط سهمیه‌ست (دیتای روتین نمی‌خونه) — سد لازم نیست
  R("/api/routine/assistant", ["GET"], "ONLINE"),

  // ─── ONLINE: حساب/اجتماعی/پشتیبانی ─────────────────────────────────
  R("/api/account", ["PATCH"], "ONLINE"),
  R("/api/account/avatar", ["PATCH", "DELETE"], "ONLINE"),
  R("/api/account/banner", "*", "ONLINE"),
  R("/api/account/username", "*", "ONLINE"),
  R("/api/account/password", "*", "ONLINE"),
  R("/api/account/sessions", "*", "ONLINE"),
  R("/api/account/two-factor", "*", "ONLINE"),
  R("/api/account/login-events", "*", "ONLINE"),
  R("/api/account/email/request", "*", "ONLINE"),
  R("/api/account/email/verify", "*", "ONLINE"),
  R("/api/users/blocked", "*", "ONLINE"),
  R("/api/users/:id/profile", "*", "ONLINE"),
  R("/api/users/:id/block", "*", "ONLINE"),
  R("/api/users/:id/star", "*", "ONLINE"),
  R("/api/friends", "*", "ONLINE"),
  R("/api/friends/requests", "*", "ONLINE"),
  R("/api/friends/search", "*", "ONLINE"),
  R("/api/friends/:id", "*", "ONLINE"),
  R("/api/friends/:id/favorite", "*", "ONLINE"),
  R("/api/support/tickets", "*", "ONLINE"),
  R("/api/support/tickets/voice", "*", "ONLINE"),
  R("/api/support/tickets/:id", "*", "ONLINE"),
  R("/api/support/tickets/:id/messages", "*", "ONLINE"),
  R("/api/analytics/track", "*", "ONLINE"),
  R("/api/subscription/discount-preview", "*", "ONLINE"),
  R("/api/subscription/checkout", "*", "ONLINE", { todo: "phase4: mobile billing handoff (lib/platform/external.ts)" }),
  R("/api/market/prices", "*", "ONLINE"),
  R("/api/trade/chat", "*", "ONLINE"),
  R("/api/trade/chat/ack-warning", "*", "ONLINE"),
  R("/api/trade/chat/report", "*", "ONLINE"),
  R("/api/trade/metatrader", ["POST", "DELETE"], "ONLINE"),
  R("/api/calorie/scan", "*", "ONLINE", { ai: true }),
  R("/api/exercise/plan", ["POST"], "ONLINE", { ai: true, barrier: true }),
  R("/api/roadmaps", ["POST"], "ONLINE", { ai: true, barrier: true }),
  R("/api/roadmaps/:id/regenerate", "*", "ONLINE", { ai: true, barrier: true }),
  R("/api/roadmaps/:id", ["DELETE"], "ONLINE", { barrier: true }),
  R("/api/reports/weekly/refresh", "*", "ONLINE", { barrier: true }),
  R("/api/reports/weekly/goals", ["POST"], "ONLINE"),

  // ─── ONLINE عمومی (بدونِ Bearer) ────────────────────────────────────
  R("/api/auth/signup", "*", "ONLINE", { public: true }),
  R("/api/auth/signup/otp/request", "*", "ONLINE", { public: true }),
  R("/api/auth/signup/otp/verify", "*", "ONLINE", { public: true }),
  R("/api/auth/forgot-password/request", "*", "ONLINE", { public: true }),
  R("/api/auth/forgot-password/verify", "*", "ONLINE", { public: true }),

  // ─── TODO: فعلا ONLINE، در فازهای بعد LOCAL ────────────────────────
  R("/api/exercise/plan", ["GET"], "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/exercise/plan/manual", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/exercise/plan/substitute", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/exercise/log", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/exercise/log/range", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/exercise/media", "*", "ONLINE", { todo: "phase2 LOCAL (arion-catalog, CACHED fallback)" }),
  R("/api/calorie/foods", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/calorie/log", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/calorie/log/range", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/calorie/target", "*", "ONLINE", { todo: "phase2 LOCAL" }),
  R("/api/trade/accounts", "*", "ONLINE", { todo: "phase3 LOCAL" }),
  R("/api/trade/entries", "*", "ONLINE", { todo: "phase3 LOCAL" }),
  R("/api/trade/entries/:id", "*", "ONLINE", { todo: "phase3 LOCAL" }),
  R("/api/trade/checklists", "*", "ONLINE", { todo: "phase3 LOCAL" }),
  R("/api/trade/checklists/:id/items", "*", "ONLINE", { todo: "phase3 LOCAL" }),
  R("/api/trade/notes", "*", "ONLINE", { todo: "phase3 LOCAL" }),
  R("/api/trade/tags", "*", "ONLINE", { todo: "phase3 LOCAL" }),
  R("/api/roadmaps/:id/progress", "*", "ONLINE", { todo: "phase4 LOCAL" }),

  // ─── NA ────────────────────────────────────────────────────────────
  // پیش‌بارگذاریِ وب (PRELOAD_SCRIPT/InlineBootstrap) در اپ اجرا نمی‌شه
  R("/api/bootstrap", "*", "NA"),
  // اعلان‌ها با Capacitor LocalNotifications (shims/pushClient.ts)
  R("/api/push/subscribe", "*", "NA"),
  // next-auth ِ کوکی‌محور — shimِ next-auth/react جاش نشسته
  R("/api/auth/session", "*", "NA"),
];

export type RouteMatch = { route: RouteDef; params: Record<string, string> };

function splitPath(p: string): string[] {
  return p.split("/").filter(Boolean);
}

/** تطابقِ یک مسیر با یک الگو؛ پارامترها decodeشده (مثلِ params ِ Next) */
export function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const ps = splitPath(pattern);
  const xs = splitPath(pathname);
  if (ps.length !== xs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].startsWith(":")) {
      let v = xs[i];
      try {
        v = decodeURIComponent(v);
      } catch {
        /* سگمنتِ بدشکل همون‌طور */
      }
      params[ps[i].slice(1)] = v;
    } else if (ps[i] !== xs[i]) return null;
  }
  return params;
}

export function matchRoute(method: string, pathname: string): RouteMatch | null {
  const m = method.toUpperCase();
  for (const route of ROUTES) {
    if (route.methods !== "*" && !route.methods.includes(m as HttpMethod)) continue;
    const params = matchPattern(route.pattern, pathname);
    if (params) return { route, params };
  }
  return null;
}

/** برای تستِ گارد: آیا این مسیر (با هر متدی) طبقه‌بندی شده؟ */
export function isClassifiedPath(pathname: string): boolean {
  return ROUTES.some((r) => matchPattern(r.pattern, pathname) !== null);
}

/** شمارشِ طبقه‌ها (گزارش/تست) */
export function classificationCounts(): Record<EndpointClass | "TODO", number> {
  const out = { LOCAL: 0, CACHED: 0, ONLINE: 0, NA: 0, TODO: 0 };
  for (const r of ROUTES) {
    out[r.cls]++;
    if (r.todo) out.TODO++;
  }
  return out;
}
