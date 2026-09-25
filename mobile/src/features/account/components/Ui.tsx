import type { ReactNode } from "react";

// تکه‌های کوچکِ مشترکِ صفحه‌های حساب — همون ظاهرِ RoadmapsList/MoreAccount
// (کارت‌ها فقط border، بدونِ بک‌گراندِ اضافه).

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-2 pt-4 font-vazir text-[12px] font-semibold" style={{ color: "var(--muted)", letterSpacing: 0.5 }}>
      {children}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="mx-4 mb-3 flex items-center gap-3 rounded-card border px-3 py-2 font-vazir text-[12.5px]"
      style={{ borderColor: "var(--surface-line)", color: "var(--pnl-loss)" }}
    >
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold" style={{ color: "var(--accent)", minHeight: 36 }}>
          تلاشِ دوباره
        </button>
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-10" aria-busy="true">
      <span className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
        در حال بارگذاری…
      </span>
    </div>
  );
}

export function Empty({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ minHeight: "50vh" }}>
      {icon}
      <p className="font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
        {text}
      </p>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, type = "button" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full px-5 font-vazir text-[14px] font-semibold transition-opacity"
      style={{ background: "var(--accent)", color: "white", height: 48, opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1 font-latin text-[10.5px] font-bold tabular-nums"
      style={{ background: "var(--pnl-loss)", color: "white", height: 18 }}
      aria-label={`${label} اطلاعیه‌ی نخوانده`}
    >
      {label}
    </span>
  );
}
