import { CATEGORY_COLORS, CATEGORY_LABELS, DashCategory } from "@/lib/dashboardMockData";

export function DashCategoryBadge({ category }: { category: DashCategory }) {
  const c = CATEGORY_COLORS[category];
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: c.text, backgroundColor: c.bg, borderColor: c.border }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
