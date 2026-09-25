import { ReactNode } from "react";
import { WifiOff } from "lucide-react";
import clsx from "clsx";

// عناصرِ رابطِ کاربریِ مشترکِ همین feature — عمدا این‌جا نگه داشته شده
// (نه در components/ سراسریِ اپ) چون فقط داخلِ صفحاتِ ورزش/کالری استفاده
// می‌شن. طبقِ CLAUDE.md: به هیچ عنصرِ transparent/ghost خودسرانه بک‌گراند
// اضافه نمی‌شه.

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={clsx("block w-full rounded-card p-4 text-start", className)}
      style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
    >
      {children}
    </Comp>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="font-vazir text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
        {children}
      </h2>
      {action}
    </div>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      className="flex rounded-full p-1"
      style={{ background: "var(--surface-2)", border: "1px solid var(--surface-line)" }}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className="relative flex-1 rounded-full font-vazir text-[13.5px] font-medium transition-colors"
            style={{
              minHeight: 44,
              color: active ? "#fff" : "var(--muted)",
              background: active ? "var(--accent)" : "transparent",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressRing({
  pct,
  size = 132,
  stroke = 12,
  label,
  sub,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  label: string;
  sub?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--accent)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-vazir text-[20px] font-bold" style={{ color: "var(--text)" }}>
          {label}
        </span>
        {sub && (
          <span className="font-vazir text-[11px]" style={{ color: "var(--muted)" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target?: number | null; color: string }) {
  const pct = target ? Math.max(0, Math.min(100, Math.round((value / target) * 100))) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <span className="font-vazir text-[12px] font-medium" style={{ color: "var(--text)" }}>
          {value}
          {target ? ` / ${target}` : ""} گرم
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: target ? `${pct}%` : "0%", background: color, transition: "width 0.4s ease" }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="font-vazir text-[14.5px] font-medium" style={{ color: "var(--text)" }}>
        {title}
      </p>
      {note && (
        <p className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
          {note}
        </p>
      )}
      {action}
    </div>
  );
}

/**
 * دکمه‌ی فیچرهای نیازمند اینترنت (ویزارد AI پلن، اسکن عکسِ غذا). آفلاین
 * همیشه غیرفعال با پیامِ روشن؛ `onlineAction` قلابیه برای وقتی این فیچرها
 * بعدا وصل بشن (فعلا هیچ‌جا صدا زده نمی‌شه چون هیچ گیت‌وی AI آفلاین ندارد).
 */
export function OnlineFeatureButton({
  label,
  online,
  onlineAction,
}: {
  label: string;
  online: boolean;
  onlineAction?: () => void;
}) {
  return (
    <button
      onClick={online ? onlineAction : undefined}
      disabled={!online}
      className="flex w-full items-center justify-center gap-2 rounded-xl font-vazir text-[13.5px] font-medium"
      style={{
        minHeight: 48,
        background: "var(--surface-2)",
        color: online ? "var(--text)" : "var(--muted)",
        border: "1px dashed var(--surface-line)",
        opacity: online ? 1 : 0.7,
      }}
    >
      {!online && <WifiOff size={15} />}
      {online ? label : "نیاز به اینترنت"}
    </button>
  );
}
