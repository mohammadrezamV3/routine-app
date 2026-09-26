// تکه‌های کوچکِ UI مشترکِ صفحه‌های اجتماعی.
import { ReactNode } from "react";
import { Lock, WifiOff } from "lucide-react";
import { MODULE_LOCKED_MESSAGE, NEED_INTERNET } from "../errors";

/** نوارِ «داده‌ی ذخیره‌شده» وقتی آفلاینیم یا داده از کشه */
export function StaleNotice({ online, staleSince }: { online: boolean; staleSince: string | null }) {
  if (online) return null;
  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-card border px-3 py-2 font-vazir text-[12px]"
      style={{ borderColor: "var(--surface-line)", color: "var(--muted)" }}
      role="status"
    >
      <WifiOff size={14} />
      <span>
        {staleSince ? "آخرین داده‌ی ذخیره‌شده — " : ""}
        {NEED_INTERNET}
      </span>
    </div>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="mb-3 rounded-card border px-3 py-2 font-vazir text-[12.5px]"
      style={{ borderColor: "var(--surface-line)", color: "var(--pnl-loss)" }}
      role="alert"
    >
      {message}
    </div>
  );
}

export function LockedState({ hint }: { hint?: string }) {
  return (
    <main className="flex flex-col items-center justify-center gap-4" style={{ minHeight: "60vh", padding: 20 }}>
      <div className="flex items-center justify-center rounded-full border" style={{ width: 64, height: 64, borderColor: "var(--surface-line)" }}>
        <Lock size={28} color="var(--muted)" />
      </div>
      <p className="font-vazir text-[14.5px] text-center" style={{ color: "var(--text)" }}>
        {MODULE_LOCKED_MESSAGE}
      </p>
      <p className="font-vazir text-[12.5px] text-center" style={{ color: "var(--muted)" }}>
        {hint ?? "برای فعال‌سازی، اشتراکِ خودت را از حساب کاربری بررسی کن."}
      </p>
    </main>
  );
}

export function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      {icon}
      <p className="font-vazir text-[13.5px] text-center" style={{ color: "var(--muted)" }}>
        {text}
      </p>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-10">
      <span className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
        در حال بارگذاری…
      </span>
    </div>
  );
}

/** آواتار: عکس اگه بود، وگرنه حرفِ اول */
export function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  if (url && /^https?:\/\//.test(url)) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border font-vazir font-semibold"
      style={{ width: size, height: size, borderColor: "var(--accent-soft)", color: "var(--accent-soft)", fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {(name.trim()[0] || "؟").toUpperCase()}
    </div>
  );
}

/** دکمه‌ی عملیاتی که آفلاین غیرفعال می‌شه و «نیاز به اینترنت» نشون می‌ده */
export function ActionButton({
  online,
  busy,
  onClick,
  children,
  tone = "accent",
  ariaLabel,
}: {
  online: boolean;
  busy?: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "accent" | "ghost" | "danger";
  ariaLabel?: string;
}) {
  const disabled = !online || !!busy;
  const color = tone === "danger" ? "var(--pnl-loss)" : tone === "ghost" ? "var(--text)" : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={!online ? NEED_INTERNET : undefined}
      className="rounded-full border px-3 py-1.5 font-vazir text-[12.5px] font-semibold disabled:opacity-50"
      style={{ borderColor: color, color }}
    >
      {!online ? NEED_INTERNET : busy ? "…" : children}
    </button>
  );
}
