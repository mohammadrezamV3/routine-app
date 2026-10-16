"use client";

import { SmartLink as Link } from "@/components/SmartLink";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isEn } from "@/lib/i18n";
import { ToggleSwitch } from "@/components/ToggleSwitch";

// ردیف استاندارد پنل کاربری (ap-row) — یا لینک به یه زیرصفحه (شورون)، یا
// اکشن، یا یه سوییچ دودویی که خود همین ردیف عوض می‌کنه. همه‌ی حالت‌ها
// دقیقا یک هندسه دارن: ارتفاع حداقل 60، چیپ آیکون خط‌دار 36، عنوان/توضیح
// و کنترل سمت پایان. ورود مرحله‌ای با کلاس m-rise و --i (حرکت مشترک اپ).
function RowShell({
  index,
  icon,
  label,
  desc,
  end,
  as: As = "div",
  className,
  ...rest
}: {
  index?: number;
  icon?: React.ReactNode;
  label: string;
  desc?: string;
  end?: React.ReactNode;
  as?: any;
  className?: string;
  [k: string]: any;
}) {
  return (
    <div className={`ap-row-wrap m-rise${icon ? "" : " no-icon"}`} style={{ "--i": Math.min(index ?? 0, 8) } as React.CSSProperties}>
      <As className={`ap-row${className ? ` ${className}` : ""}`} {...rest}>
        {icon && <span className="ap-row-icon" aria-hidden="true">{icon}</span>}
        <span className="ap-row-body">
          <span className="ap-row-label">{label}</span>
          {desc && <span className="ap-row-desc">{desc}</span>}
        </span>
        {end}
      </As>
    </div>
  );
}

/** کارت یک گروه از ردیف‌ها (با برچسب اختیاری بالای کارت) */
export function AccountRows({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="ap-group">
      {label && <div className="ap-group-label">{label}</div>}
      <div className="account-card ap-card is-clip">{children}</div>
    </div>
  );
}

export function AccountRowLink({
  href, icon, label, desc, index,
}: { href: string; icon: React.ReactNode; label: string; desc?: string; index?: number }) {
  return (
    <RowShell
      as={Link}
      href={href}
      index={index}
      icon={icon}
      label={label}
      desc={desc}
      end={isEn()
        ? <ChevronRight size={16} className="ap-row-chevron" aria-hidden="true" />
        : <ChevronLeft size={16} className="ap-row-chevron" aria-hidden="true" />}
    />
  );
}

// ردیف اکشن (نه ناوبری) — برای «خروج از حساب» توی صفحه‌ی اول پنل.
export function AccountRowButton({
  icon, label, desc, onClick, index, danger,
}: { icon: React.ReactNode; label: string; desc?: string; onClick: () => void; index?: number; danger?: boolean }) {
  return (
    <RowShell
      as="button"
      type="button"
      onClick={onClick}
      index={index}
      icon={icon}
      label={label}
      desc={desc}
      className={`is-action${danger ? " is-danger" : ""}`}
    />
  );
}

export function AccountToggleRow({
  icon, label, desc, checked, onChange, index, disabled,
}: { icon: React.ReactNode; label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; index?: number; disabled?: boolean }) {
  return (
    <RowShell
      as="div"
      onClick={disabled ? undefined : () => onChange(!checked)}
      index={index}
      icon={icon}
      label={label}
      desc={desc}
      className={disabled ? undefined : "is-action"}
      end={
        <span className="ap-row-end" onClick={(e) => e.stopPropagation()}>
          <ToggleSwitch checked={checked} onChange={onChange} label={label} disabled={disabled} />
        </span>
      }
    />
  );
}

// ردیف با کنترل دلخواه سمت انتهایی (مثلا انتخاب زبان) — روی موبایل باریک
// کنترل زیر متن و تمام‌عرض می‌ره تا متن فشرده نشه.
export function AccountControlRow({
  icon, label, desc, control, index,
}: { icon: React.ReactNode; label: string; desc?: string; control: React.ReactNode; index?: number }) {
  return (
    <RowShell
      as="div"
      index={index}
      icon={icon}
      label={label}
      desc={desc}
      className="is-control"
      end={<span className="ap-row-control">{control}</span>}
    />
  );
}
