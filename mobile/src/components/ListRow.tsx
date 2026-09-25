import { ChevronLeft } from "lucide-react";
import { ReactNode } from "react";

interface ListRowProps {
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}

export default function ListRow({ icon, label, onClick, danger }: ListRowProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b px-4"
      style={{ borderColor: "var(--surface-line)", minHeight: 52 }}
    >
      {icon}
      <span
        className="flex-1 text-start font-vazir text-[14.5px]"
        style={{ color: danger ? "var(--pnl-loss)" : "var(--text)" }}
      >
        {label}
      </span>
      <ChevronLeft size={18} color="var(--muted)" />
    </button>
  );
}
