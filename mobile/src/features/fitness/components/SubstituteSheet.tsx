import { useEffect, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { tapHaptic } from "@/lib/haptics";
import { getCatalogSubstitutes } from "../lib/exerciseCatalogUtils";
import { stripSetSuffix } from "../lib/exerciseSets";
import { substituteItem } from "../lib/repo";

/** انتخابِ سه جایگزینِ آماده برای یک حرکت — کاملا آفلاین (کاتالوگِ محلی). */
export default function SubstituteSheet({
  open,
  onClose,
  planId,
  dayIndex,
  itemIndex,
  item,
  otherItemsToday,
}: {
  open: boolean;
  onClose: () => void;
  planId: string;
  dayIndex: number;
  itemIndex: number;
  item: string;
  otherItemsToday: string[];
}) {
  const [options, setOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCatalogSubstitutes(item, 3, otherItemsToday.map(stripSetSuffix)).then((res) => {
      if (!cancelled) setOptions(res);
    });
    return () => {
      cancelled = true;
    };
  }, [open, item, otherItemsToday]);

  async function pick(name: string) {
    await substituteItem(planId, dayIndex, itemIndex, name);
    void tapHaptic();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="جایگزینِ حرکت">
      <div className="flex flex-col gap-2">
        {options.length === 0 && (
          <p className="py-4 text-center font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
            جایگزینی برای این حرکت در کاتالوگ پیدا نشد.
          </p>
        )}
        {options.map((name) => (
          <button
            key={name}
            onClick={() => pick(name)}
            className="rounded-xl p-3 text-start font-vazir text-[13.5px]"
            style={{ minHeight: 48, background: "var(--surface-2)", color: "var(--text)" }}
          >
            {name}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
