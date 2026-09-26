// پل بینِ shimهای next/* و شلِ اپ — بدونِ import ِ چرخشی (routes.tsx خودش
// صفحه‌هایی رو lazy می‌کنه که همین shimها رو import می‌کنن).
type Prefetcher = (href: string) => void;

let prefetcher: Prefetcher = () => {};
const refreshListeners = new Set<() => void>();

export function setPrefetcher(fn: Prefetcher): void {
  prefetcher = fn;
}

/** چانکِ صفحه‌ی مقصد رو از قبل لود می‌کنه (معادلِ prefetchِ Next) */
export function prefetchHref(href: string): void {
  try {
    prefetcher(href);
  } catch {
    /* noop */
  }
}

/** router.refresh() — شل روتِ فعلی رو remount می‌کنه */
export function onRouteRefresh(fn: () => void): () => void {
  refreshListeners.add(fn);
  return () => refreshListeners.delete(fn);
}

export function emitRouteRefresh(): void {
  refreshListeners.forEach((fn) => fn());
}

/** href های بیرونی (http/mailto/tel/…) — نه مسیرِ داخلیِ اپ */
export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}
