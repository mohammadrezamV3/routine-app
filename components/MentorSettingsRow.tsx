"use client";

import "./mentor.css";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * گروه ردیف‌های تنظیمات به سبک گوشی: یک ظرف گرد با خط مو بین ردیف‌ها.
 * title اختیاری (برچسب کوچک بالای گروه، مثل «پروفایل من»).
 */
export function MentorSettingsGroup({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mv2-group${className ? ` ${className}` : ""}`}>
      {title && <h2 className="mv2-group-title">{title}</h2>}
      <div className="mv2-group-list">{children}</div>
    </section>
  );
}

/**
 * یک ردیف: آیکون، عنوان، مقدار فعلی کوتاه (سمت چپ) و فلش. با href لینک می‌شه،
 * با onClick دکمه (مثلا بازکردن MentorSheet). حداقل 52px.
 */
export function MentorSettingsRow({
  icon, title, value, href, onClick, danger, disabled, ariaHasPopup,
}: {
  icon?: React.ReactNode;
  title: string;
  value?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** برای ردیفی که برگه باز می‌کنه */
  ariaHasPopup?: boolean;
}) {
  const inner = (
    <>
      {icon && <span className="mv2-srow-icon" aria-hidden>{icon}</span>}
      <span className="mv2-srow-title">{title}</span>
      {value != null && value !== "" && <span className="mv2-srow-value">{value}</span>}
      <ChevronLeft size={16} strokeWidth={1.75} className="mv2-srow-chev" aria-hidden />
    </>
  );
  const cls = `mv2-srow${danger ? " is-danger" : ""}`;
  if (href && !disabled) return <Link href={href} className={cls}>{inner}</Link>;
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-haspopup={ariaHasPopup ? "dialog" : undefined}>
      {inner}
    </button>
  );
}
