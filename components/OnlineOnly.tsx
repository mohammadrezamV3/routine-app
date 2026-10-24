"use client";

// بخش‌هایی که بدون اینترنت کار نمی‌کنن (پرداخت، گفت‌وگوی مربی، هوش مصنوعی،
// امنیت حساب، آپلود، ...). به‌جای شکست بی‌صدا، آفلاین یک پیام جمع‌وجور نشون
// می‌دن. وضعیت از هسته‌ی آفلاین (lib/offline/status.ts) میاد و هیدریشن‌امنه:
// تا قبل از هیدریشن «آنلاین» فرض می‌شه تا خروجی سرور و کلاینت یکی باشه.
import type { ComponentType, ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { tr } from "@/lib/i18n";
import { reportLiveError } from "@/lib/liveSync";
import { useOfflineStatus } from "@/lib/offline/status";

/** متن ثابت پیام (تابع، نه ثابت سطح ماژول، تا زبان موقع رندر انتخاب بشه) */
export function onlineOnlyText(): string {
  return tr("برای این بخش اینترنت لازمه", "This needs an internet connection");
}

/** برای خروج از حساب (لایه‌ی lib/logout.ts دست‌نخورده می‌مونه) */
export function onlineOnlyLogoutText(): string {
  return tr("برای خروج اینترنت لازمه", "You need internet to log out");
}

/** پیام کوچک درون‌خطی؛ بدون بک‌گراند (فقط خط‌چین نازک و متن کم‌رنگ) */
export function OnlineOnlyNotice({ feature, text, className }: { feature?: string; text?: string; className?: string }) {
  return (
    <div className={`online-only-note${className ? ` ${className}` : ""}`} role="status" aria-live="polite" data-feature={feature}>
      <WifiOff size={15} aria-hidden="true" />
      <span>{text ?? onlineOnlyText()}</span>
    </div>
  );
}

/** آنلاین: فرزندها؛ آفلاین: پیام. `inline` یعنی به‌جای بلوک کامل فقط خط پیام. */
export function OnlineOnly({ feature, children, className, text }: { feature: string; children: ReactNode; className?: string; text?: string }) {
  const { online } = useOfflineStatus();
  if (online) return <>{children}</>;
  return <OnlineOnlyNotice feature={feature} className={className} text={text} />;
}

/**
 * برای دکمه‌ها: `offline` رو برای disabled و `title` استفاده کن، و `guard(fn)` کلیک رو
 * می‌پوشونه؛ آفلاین به‌جای اجرا پیام کوتاه نشون می‌ده (همون تُست ذخیره‌نشدن).
 */
export function useOnlineOnly() {
  const { online } = useOfflineStatus();
  const offline = !online;
  const guard = <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A): R | undefined => {
    if (offline) { reportLiveError(onlineOnlyText()); return undefined; }
    return fn(...args);
  };
  /** props آماده برای <button>: غیرفعال + راهنما وقتی آفلاینه */
  const buttonProps = offline
    ? ({ disabled: true, "aria-disabled": true as const, title: onlineOnlyText() })
    : ({} as { disabled?: boolean; "aria-disabled"?: true; title?: string });
  return { offline, guard, buttonProps, message: onlineOnlyText() };
}

/**
 * پوشش یک کامپوننت کلاینتی که کلا به سرور وابسته‌ست (ویزاردهای هوش مصنوعی، چت).
 * آفلاین به‌جای کامپوننت پیام میاد؛ اگه prop `onClose` داشت یک دکمه‌ی «بستن» هم هست
 * تا کاربر توی یک پنجره‌ی باز گیر نکنه.
 */
export function withOnlineOnly<P extends object>(Inner: ComponentType<P>, feature: string): ComponentType<P> {
  function Wrapped(props: P) {
    const { online } = useOfflineStatus();
    if (online) return <Inner {...props} />;
    const onClose = (props as { onClose?: () => void }).onClose;
    return (
      <div>
        <OnlineOnlyNotice feature={feature} />
        {typeof onClose === "function" && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{tr("بستن", "Close")}</button>
        )}
      </div>
    );
  }
  Wrapped.displayName = `OnlineOnly(${Inner.displayName || Inner.name || "Component"})`;
  return Wrapped;
}

/**
 * جایگزین کامپوننت lazy که چانکش آفلاین نیست (هیچ‌وقت آنلاین باز نشده): به‌جای افتادن به مرز خطای کل
 * اپ ("در حال به‌روزرسانی صفحه") همون پیام «اینترنت لازمه» نشون داده می‌شه.
 * استفاده: dynamic(() => import("./X").then((m) => m.X).catch(() => ChunkOffline), { ssr: false })
 */
export function ChunkOffline() {
  return <OnlineOnlyNotice feature="chunk" />;
}
