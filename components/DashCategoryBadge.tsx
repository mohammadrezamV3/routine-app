import { CATEGORY_COLORS, CATEGORY_LABELS, DashCategory } from "@/lib/dashboardMockData";

export function DashCategoryBadge({ category }: { category: DashCategory }) {
  const c = CATEGORY_COLORS[category];
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px]"
      style={{ color: c.text, backgroundColor: c.bg, borderColor: c.border }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
