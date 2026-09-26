// shimِ next/link روی react-router-dom. خروجیِ DOM همون `<a href>`ِ ساده‌ی
// Next ـه (بدونِ اتریبیوتِ اضافه)، پس CSSِ وب دست‌نخورده اعمال می‌شه.
import { AnchorHTMLAttributes, forwardRef, MouseEvent, ReactNode, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { isExternalHref, prefetchHref } from "./navRegistry";

type UrlObject = {
  pathname?: string | null;
  query?: Record<string, string | number | boolean | readonly (string | number | boolean)[] | null | undefined> | string | null;
  hash?: string | null;
  search?: string | null;
};

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | UrlObject;
  as?: string | UrlObject;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  prefetch?: boolean | null;
  legacyBehavior?: boolean;
  locale?: string | false;
  children?: ReactNode;
};

export function formatHref(href: string | UrlObject): string {
  if (typeof href === "string") return href;
  let out = href.pathname ?? "";
  if (href.search) out += href.search.startsWith("?") ? href.search : `?${href.search}`;
  else if (href.query && typeof href.query === "object") {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(href.query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
      else qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) out += `?${s}`;
  } else if (typeof href.query === "string" && href.query) out += `?${href.query}`;
  if (href.hash) out += href.hash.startsWith("#") ? href.hash : `#${href.hash}`;
  return out;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, as, replace, scroll, shallow: _shallow, passHref: _passHref, prefetch, legacyBehavior: _legacy, locale: _locale, children, onMouseEnter, onTouchStart, ...rest },
  ref
) {
  const to = formatHref(as ?? href);
  const external = isExternalHref(to);

  // prefetch صریح (مثلِ آیتم‌های منو) → چانکِ صفحه در زمانِ بیکاری
  useEffect(() => {
    if (external || prefetch !== true) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => prefetchHref(to));
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => prefetchHref(to), 200);
    return () => clearTimeout(t);
  }, [to, external, prefetch]);

  if (external) {
    return (
      <a ref={ref} href={to} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} {...rest}>
        {children}
      </a>
    );
  }

  const warm = (e: MouseEvent<HTMLAnchorElement>) => {
    if (prefetch !== false) prefetchHref(to);
    onMouseEnter?.(e);
  };

  return (
    <RouterLink
      ref={ref}
      to={to}
      replace={replace}
      state={scroll === false ? { noScroll: true } : undefined}
      onMouseEnter={warm}
      onTouchStart={(e) => {
        if (prefetch !== false) prefetchHref(to);
        onTouchStart?.(e);
      }}
      {...rest}
    >
      {children}
    </RouterLink>
  );
});

export default Link;
