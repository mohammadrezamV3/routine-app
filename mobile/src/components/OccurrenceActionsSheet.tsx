import { Pencil, ArrowLeftRight, Trash2 } from "lucide-react";
import BottomSheet from "./BottomSheet";

// منویِ عملیاتِ یک برنامه — از long-press روی OccurrenceRow باز می‌شه.
export default function OccurrenceActionsSheet({
  open,
  name,
  onClose,
  onEdit,
  onMove,
  onDelete,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={name}>
      <div className="flex flex-col gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-3 rounded-xl px-3 font-vazir text-[14px]"
          style={{ minHeight: 52, background: "var(--surface-2)", color: "var(--text)" }}
        >
          <Pencil size={18} /> ویرایش
        </button>
        <button
          onClick={onMove}
          className="flex items-center gap-3 rounded-xl px-3 font-vazir text-[14px]"
          style={{ minHeight: 52, background: "var(--surface-2)", color: "var(--text)" }}
        >
          <ArrowLeftRight size={18} /> انتقال به روز دیگر
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-3 rounded-xl px-3 font-vazir text-[14px]"
          style={{ minHeight: 52, background: "var(--surface-2)", color: "var(--pnl-loss)" }}
        >
          <Trash2 size={18} /> حذف
        </button>
      </div>
    </BottomSheet>
  );
}
