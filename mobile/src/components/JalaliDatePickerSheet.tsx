import { useState } from "react";
import BottomSheet from "./BottomSheet";
import JalaliMonthGrid from "./JalaliMonthGrid";
import { isoLocal, toJalali } from "@/lib/jalali";

// شیتِ انتخابِ یک تاریخِ جلالی — معادلِ موبایلِ JalaliDatePicker.tsx وب،
// روی BottomSheet به‌جای پاپ‌آپِ وسط‌صفحه.
export default function JalaliDatePickerSheet({
  open,
  title,
  initialIso,
  onPick,
  onClose,
  disablePast,
  disableFuture,
}: {
  open: boolean;
  title: string;
  initialIso?: string | null;
  onPick: (iso: string) => void;
  onClose: () => void;
  disablePast?: boolean;
  disableFuture?: boolean;
}) {
  const now = new Date();
  const base = initialIso ? new Date(initialIso + "T00:00:00") : now;
  const jBase = toJalali(base.getFullYear(), base.getMonth() + 1, base.getDate());
  const [view, setView] = useState({ y: jBase[0], m: jBase[1] });

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <JalaliMonthGrid
        year={view.y}
        month={view.m}
        onNav={(y, m) => setView({ y, m })}
        onSelect={(iso) => onPick(iso)}
        selectedIso={initialIso}
        todayIso={isoLocal(now)}
        disablePast={disablePast}
        disableFuture={disableFuture}
      />
    </BottomSheet>
  );
}
