// جدولِ مسیرهای اپ — مستقیما از صفحه‌های خودِ وب (app/**/page.tsx) ساخته
// می‌شه، نه صفحه‌های بازنویسی‌شده. قانون‌های App Router این‌جا بازسازی شده:
//   • `[x]` → `:x`، `[...x]` → `*`، `(group)` حذف
//   • layoutهای تو در تو (مثلا app/account/layout.tsx) به‌صورتِ routeِ والد
//     با Outlet — مثلِ Next، layout بینِ صفحه‌های زیرش مانت می‌مونه
//   • هر صفحه lazy (چانکِ جدا) و `params`/`searchParams` مثلِ Next تزریق می‌شه
//   • صفحه‌ی ناموجود → app/not-found.tsx
// هر page.tsxِ وب باید یا این‌جا روت بشه یا صریحا در EXCLUDED/REDIRECTS باشه
// (تستِ routes.test.ts).
import { ComponentType, lazy, ReactNode, Suspense, useMemo } from "react";
import { matchPath, Navigate, Outlet, RouteObject, useLocation, useParams } from "react-router-dom";

type PageModule = { default: ComponentType<any> };
type Loader = () => Promise<PageModule>;

// نسبت به همین فایل: mobile/src/shell → ریشه‌ی ریپو
const PAGE_LOADERS = import.meta.glob<PageModule>([
  "../../../app/**/page.tsx",
  "!../../../app/admin/**",
  "!../../../app/api/**",
  "!../../../app/offline/**",
  "!../../../app/daily-planner/**",
  "!../../../app/habit-tracker/**",
  "!../../../app/routine/**",
  "!../../../app/trading-journal/**",
  "!../../../app/report/**",
]);

const LAYOUT_LOADERS = import.meta.glob<PageModule>([
  "../../../app/*/**/layout.tsx",
  "!../../../app/admin/**",
  "!../../../app/api/**",
]);

const NOT_FOUND_LOADER = () => import("@/app/not-found");

/**
 * مسیرهای وبی که عمدا در اپ نیستن. پنل ادمین/API محیطِ سرورن؛ لندینگ‌های
 * سئو و /offline (صفحه‌ی سرویس‌ورکر) در اپ معنایی ندارن.
 * (هم‌گام با الگوهای منفیِ PAGE_LOADERS بالا.)
 */
export const EXCLUDED_ROUTE_PREFIXES = ["/admin", "/api", "/offline", "/daily-planner", "/habit-tracker", "/routine", "/trading-journal"];

/** ریدایرکت‌های سطحِ مسیر — همون next.config.js → redirects() + صفحه‌های ریدایرکتیِ وب */
export const REDIRECTS: { from: string; to: string }[] = [
  { from: "/report/weekly", to: "/analysis/weekly" },
  { from: "/report/weekly/*", to: "/analysis/weekly" },
  { from: "/account/notifications", to: "/account/general" },
  { from: "/account/sport-profile", to: "/account/profile" },
];

/** تب‌های اصلیِ اپ — چانکشون در زمانِ بیکاری از قبل لود می‌شه */
export const TAB_PREFETCH_PATHS = ["/weekly", "/exercise", "/trade", "/account"];

/** "../../../app/trade/accounts/[id]/page.tsx" → "/trade/accounts/:id" */
export function fileToRoutePath(file: string): string {
  const rel = file.replace(/^.*?\/app\//, "").replace(/\/?(page|layout)\.tsx$/, "");
  const segs = rel
    .split("/")
    .filter(Boolean)
    .filter((s) => !/^\(.*\)$/.test(s))
    .map((s) => {
      const catchAll = s.match(/^\[\[?\.\.\.(\w+)\]?\]$/);
      if (catchAll) return "*";
      const dyn = s.match(/^\[(\w+)\]$/);
      return dyn ? `:${dyn[1]}` : s;
    });
  return "/" + segs.join("/");
}

const lazyCache = new Map<Loader, ComponentType<any>>();
function lazyOf(loader: Loader): ComponentType<any> {
  let c = lazyCache.get(loader);
  if (!c) {
    c = lazy(loader);
    lazyCache.set(loader, c);
  }
  return c;
}

/** مثلِ Next: `params` (رشته‌های decode‌شده) و `searchParams` به صفحه */
function PageElement({ loader }: { loader: Loader }) {
  const Page = lazyOf(loader);
  const params = useParams();
  const { search } = useLocation();
  const searchParams = useMemo(() => Object.fromEntries(new URLSearchParams(search)), [search]);
  const { "*": splat, ...named } = params;
  const pageParams = splat !== undefined ? { ...named, slug: splat.split("/") } : named;
  return <Page params={pageParams} searchParams={searchParams} />;
}

function LayoutElement({ loader }: { loader: Loader }) {
  const Layout = lazyOf(loader);
  return (
    <Layout>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}

export function NotFoundPage() {
  const NotFound = lazyOf(NOT_FOUND_LOADER as Loader);
  return <NotFound />;
}

type Entry = { path: string; loader: Loader };

function entries(map: Record<string, Loader>): Entry[] {
  return Object.entries(map).map(([file, loader]) => ({ path: fileToRoutePath(file), loader }));
}

const PAGES = entries(PAGE_LOADERS);
const LAYOUTS = entries(LAYOUT_LOADERS).sort((a, b) => a.path.length - b.path.length);

function isUnder(path: string, base: string): boolean {
  return path === base || path.startsWith(base.endsWith("/") ? base : `${base}/`);
}

/** درختِ RouteObject: هر layout والدِ صفحه‌ها/layoutهای زیرِ خودش */
function buildTree(base: string | null, pages: Entry[], layouts: Entry[]): RouteObject[] {
  const out: RouteObject[] = [];
  const candidates = layouts.filter((l) => base === null || (l.path !== base && isUnder(l.path, base)));
  const direct = candidates.filter((l) => !candidates.some((o) => o.path !== l.path && isUnder(l.path, o.path)));
  const claimed = new Set<Entry>();
  for (const l of direct) {
    const inner = pages.filter((p) => isUnder(p.path, l.path));
    inner.forEach((p) => claimed.add(p));
    out.push({
      path: l.path,
      element: <LayoutElement loader={l.loader} />,
      children: buildTree(l.path, inner, layouts.filter((o) => o !== l && isUnder(o.path, l.path))).map((r) =>
        r.path === l.path ? { index: true, element: r.element } : r
      ),
    });
  }
  for (const p of pages) {
    if (claimed.has(p)) continue;
    out.push({ path: p.path, element: <PageElement loader={p.loader} /> });
  }
  return out;
}

export function buildRoutes(): RouteObject[] {
  return [
    ...REDIRECTS.map((r) => ({ path: r.from, element: <Navigate to={r.to} replace /> })),
    ...buildTree(null, PAGES, LAYOUTS),
    { path: "*", element: <NotFoundPage /> },
  ];
}

/** همه‌ی مسیرهای صفحه‌ای که روت شدن (برای تست/prefetch) */
export const ROUTED_PAGE_PATHS = PAGES.map((p) => p.path);

/** prefetchِ چانکِ صفحه (و layoutهای بالاسرش) برای یک href */
export function preloadPath(href: string): void {
  const pathname = href.split(/[?#]/)[0] || "/";
  for (const l of LAYOUTS) if (isUnder(pathname, l.path)) void l.loader().catch(() => undefined);
  const hit = PAGES.find((p) => matchPath({ path: p.path, end: true }, pathname));
  if (hit) void hit.loader().catch(() => undefined);
}

export function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
