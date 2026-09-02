"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";

// ردیف استاندارد پنل کاربری — یا لینک به یه زیرصفحه‌ست (chevron)، یا یه
// سوییچ دودویی این‌جا خود همین ردیف عوض می‌شه. هردو حالت دقیقا همون
// آیکون-در-دایره‌ی نرم + عنوان/توضیح رو دارن؛ فقط سمت کنترل فرق می‌کنه.
// stagger با delay بر پایه‌ی index — ورود مرحله‌ای وقتی چند ردیف کنار هم‌ان.
function RowShell({
  index,
  icon,
  label,
  desc,
  end,
  as: As = "div",
  ...rest
}: {
  index?: number;
  icon: React.ReactNode;
  label: string;
  desc?: string;
  end: React.ReactNode;
  as?: any;
  [k: string]: any;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: (index ?? 0) * 0.035, ease: [0.22, 1, 0.36, 1] }}
    >
      <As className="account-row2" {...rest}>
        <span className="account-row2-icon">{icon}</span>
        <span className="account-row2-body">
          <span className="account-row2-label">{label}</span>
          {desc && <span className="account-row2-desc">{desc}</span>}
        </span>
        {end}
      </As>
    </motion.div>
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
      end={<ChevronLeft size={15} className="account-row2-chevron" />}
    />
  );
}

export function AccountToggleRow({
  icon, label, desc, checked, onChange, index,
}: { icon: React.ReactNode; label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; index?: number }) {
  return (
    <RowShell
      as="div"
      onClick={() => onChange(!checked)}
      index={index}
      icon={icon}
      label={label}
      desc={desc}
      style={{ cursor: "pointer" }}
      end={
        <span onClick={(e) => e.stopPropagation()} style={{ display: "flex" }}>
          <ToggleSwitch checked={checked} onChange={onChange} label={label} />
        </span>
      }
    />
  );
}
