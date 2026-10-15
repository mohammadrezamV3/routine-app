"use client";

// لینک با پیش‌واکشی «به‌قصد» (hover / لمس / فوکوس) به‌جای پیش‌واکشی خودکار همه‌ی لینک‌های صفحه.
//
// مسئله: `<Link prefetch>` (و prefetch پیش‌فرض لینک‌های داخل viewport) برای هر لینک، صفحه‌ی
// مقصد رو سمت سرور رندر می‌کنه و JS اون مسیر رو هم می‌گیره. داشبورد ~15 لینک داره، پس هر ورود
// به داشبورد ~15 رندر سرور + صدها کیلوبایت JS اضافه می‌کرد (اندازه‌گیری: 783KB / 123 درخواست روی
// موبایل کند). این کامپوننت پیش‌واکشی رو فقط وقتی می‌زنه که کاربر واقعا به لینک نزدیک می‌شه، و برای
// هر لینک فقط یک بار. ناوبری با کلیک بدون تغییره (خود Link).
//
// استفاده: به‌جای `import Link from "next/link"` برای لینک‌های داخلی که قبلا `prefetch` داشتن.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useRef } from "react";

type LinkProps = React.ComponentProps<typeof Link>;

function hrefToString(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  const { pathname = "", query, hash = "" } = href as { pathname?: string | null; query?: Record<string, unknown> | string | null; hash?: string | null };
  let q = "";
  if (typeof query === "string") q = query ? `?${query}` : "";
  else if (query && typeof query === "object") {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) sp.set(k, String(v));
    const s = sp.toString();
    q = s ? `?${s}` : "";
  }
  return `${pathname ?? ""}${q}${hash ?? ""}`;
}

export const SmartLink = forwardRef<HTMLAnchorElement, LinkProps>(function SmartLink(
  { href, prefetch: _ignored, onMouseEnter, onTouchStart, onFocus, ...rest },
  ref,
) {
  const router = useRouter();
  const warmed = useRef(false);
  const warm = useCallback(() => {
    if (warmed.current) return;
    const target = hrefToString(href);
    // فقط مسیر داخلی؛ لینک بیرونی/hash/mailto دست نمی‌خوره
    if (!target.startsWith("/") || target.startsWith("//")) return;
    warmed.current = true;
    try {
      router.prefetch(target);
    } catch {
      /* پیش‌واکشی بهینه‌سازیه، نه ضروری */
    }
  }, [router, href]);

  return (
    <Link
      ref={ref}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => { warm(); onMouseEnter?.(e); }}
      onTouchStart={(e) => { warm(); onTouchStart?.(e); }}
      onFocus={(e) => { warm(); onFocus?.(e); }}
      {...rest}
    />
  );
});
