import { Pencil, Trash2 } from "lucide-react";
import BottomSheet from "./BottomSheet";

// منویِ عملیاتِ یک تسکِ آزاد — از long-press روی TaskRow باز می‌شه، دقیقا
// همون الگویِ OccurrenceActionsSheet (بدونِ گزینه‌ی «انتقال» چون تسکِ آزاد
// روزِ هفته‌ای نداره که بشه جابه‌جا کرد).
export default function TaskActionsSheet({
  open,
  title,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-3 rounded-xl px-3 font-vazir text-[14px]"
          style={{ minHeight: 52, background: "var(--surface-2)", color: "var(--text)" }}
        >
          <Pencil size={18} /> ویرایش
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
