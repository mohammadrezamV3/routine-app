"use client";

import "./mentor.css";
import Link from "next/link";
import type { MentorTone } from "./MentorUI";

type Action =
  | { label: string; href: string; onClick?: never; busy?: boolean; disabled?: boolean }
  | { label: string; onClick: () => void; href?: never; busy?: boolean; disabled?: boolean };

/**
 * کارت کار امروز: آیکون (المان آماده، مثلا lucide با aria-hidden)، یک جمله
 * (می‌تونه <b>نام</b> داشته باشه)، خط اختیاری meta و فقط *یک* دکمه‌ی اصلی.
 * کل کارت کلیک‌پذیر نیست (فقط دکمه) تا ناوبری کیبورد/صفحه‌خوان روشن بمونه؛
 * کارهای دیگه در kebab (اسلات، معمولا MentorKebabMenu).
 */
export function MentorTaskCard({
  icon, tone = "neutral", children, meta, action, kebab, className,
}: {
  icon: React.ReactNode;
  tone?: MentorTone;
  /** جمله‌ی اصلی */
  children: React.ReactNode;
  meta?: React.ReactNode;
  action: Action;
  kebab?: React.ReactNode;
  className?: string;
}) {
  const btn = "account-outline-btn mentor-btn is-sm mv2-task-action";
  return (
    <div className={`mv2-task mv2-tone-${tone}${className ? ` ${className}` : ""}`}>
      <span className="mv2-task-icon" aria-hidden>{icon}</span>
      <div className="mv2-task-body">
        <p className="mv2-task-text">{children}</p>
        {meta && <p className="mv2-task-meta">{meta}</p>}
      </div>
      <div className="mv2-task-end">
        {action.href !== undefined ? (
          <Link href={action.href} className={btn}>{action.label}</Link>
        ) : (
          <button type="button" className={btn} onClick={action.onClick} disabled={action.disabled || action.busy} aria-busy={action.busy || undefined}>
            {action.label}
          </button>
        )}
        {kebab}
      </div>
    </div>
  );
}
