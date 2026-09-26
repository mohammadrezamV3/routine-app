// shimِ next/navigation روی react-router-dom (BrowserRouter).
import { useMemo } from "react";
import { useLocation, useNavigate, useParams as useRouterParams } from "react-router-dom";
import { emitRouteRefresh, isExternalHref, prefetchHref } from "./navRegistry";
import { NotFoundSignal, RedirectSignal } from "./routeSignals";

export type NavigateOptions = { scroll?: boolean };

export type AppRouterInstance = {
  push(href: string, options?: NavigateOptions): void;
  replace(href: string, options?: NavigateOptions): void;
  back(): void;
  forward(): void;
  refresh(): void;
  prefetch(href: string): void;
};

export type ReadonlyURLSearchParams = Omit<URLSearchParams, "append" | "delete" | "set" | "sort">;

export function useRouter(): AppRouterInstance {
  const navigate = useNavigate();
  return useMemo<AppRouterInstance>(() => {
    const go = (href: string, replace: boolean, options?: NavigateOptions) => {
      if (isExternalHref(href)) {
        if (replace) window.location.replace(href);
        else window.location.assign(href);
        return;
      }
      navigate(href, { replace, state: options?.scroll === false ? { noScroll: true } : undefined });
    };
    return {
      push: (href, options) => go(href, false, options),
      replace: (href, options) => go(href, true, options),
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => emitRouteRefresh(),
      prefetch: (href) => prefetchHref(href),
    };
  }, [navigate]);
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): ReadonlyURLSearchParams {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  return useRouterParams() as unknown as T;
}

export function notFound(): never {
  throw new NotFoundSignal();
}

export function redirect(url: string): never {
  throw new RedirectSignal(url, true);
}

export function permanentRedirect(url: string): never {
  throw new RedirectSignal(url, true);
}
